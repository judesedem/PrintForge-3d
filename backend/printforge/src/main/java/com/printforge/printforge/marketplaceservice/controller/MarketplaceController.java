package com.printforge.printforge.marketplaceservice.controller;

import com.printforge.printforge.entity.User;
import com.printforge.printforge.estimateservice.model.Estimate;
import com.printforge.printforge.estimateservice.service.EstimateService;
import com.printforge.printforge.fileservice.storage.FileStorageService;
import com.printforge.printforge.marketplaceservice.dto.ReorderImagesRequest;
import com.printforge.printforge.marketplaceservice.exception.AlreadyFavoritedException;
import com.printforge.printforge.marketplaceservice.exception.FavoriteNotFoundException;
import com.printforge.printforge.marketplaceservice.exception.InvalidListingInputException;
import com.printforge.printforge.marketplaceservice.exception.ListingDeleteException;
import com.printforge.printforge.marketplaceservice.exception.ListingImageDeleteException;
import com.printforge.printforge.marketplaceservice.exception.ListingImageLimitExceededException;
import com.printforge.printforge.marketplaceservice.exception.ListingImageNotFoundException;
import com.printforge.printforge.marketplaceservice.exception.ListingNotFoundException;
import com.printforge.printforge.marketplaceservice.model.DesignListing;
import com.printforge.printforge.marketplaceservice.model.Favorite;
import com.printforge.printforge.marketplaceservice.model.ListingImage;
import com.printforge.printforge.marketplaceservice.repository.DesignListingRepository;
import com.printforge.printforge.marketplaceservice.repository.FavoriteRepository;
import com.printforge.printforge.marketplaceservice.repository.ListingImageRepository;
import com.printforge.printforge.moderationservice.model.ModerationActionType;
import com.printforge.printforge.moderationservice.model.ModerationTargetType;
import com.printforge.printforge.moderationservice.service.ModerationLogService;
import com.printforge.printforge.paymentservice.repository.PaymentRepository;
import com.printforge.printforge.repository.UserRepository;
import com.printforge.printforge.settingsservice.exception.FeatureDisabledException;
import com.printforge.printforge.settingsservice.model.FeatureToggleKeys;
import com.printforge.printforge.settingsservice.service.SettingsService;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

/**
 * Marketplace storefront — designers list models, customers browse and get quotes.
 *
 * GET  /api/marketplace              → public storefront (PUBLISHED listings only)
 * GET  /api/marketplace/my-listings  → designer's own listings (DESIGNER only)
 * GET  /api/marketplace/{id}         → single listing + auto-generated quote
 * POST /api/marketplace              → create listing as DRAFT (DESIGNER only)
 * PATCH /api/marketplace/{id}        → update title/description/price (DESIGNER only)
 * PATCH /api/marketplace/{id}/publish   → DRAFT → PUBLISHED (DESIGNER only)
 * PATCH /api/marketplace/{id}/unpublish → PUBLISHED → DRAFT (DESIGNER only)
 * DELETE /api/marketplace/{id}       → delete DRAFT listing (DESIGNER only)
 * POST /api/marketplace/{id}/images            → add a gallery photo (DESIGNER only)
 * DELETE /api/marketplace/{id}/images/{imageId} → remove a gallery photo (DESIGNER only)
 * PATCH /api/marketplace/{id}/images/reorder    → reorder the gallery (DESIGNER only)
 */
@RestController
@RequestMapping("/api/marketplace")
public class MarketplaceController {

    private final DesignListingRepository listingRepository;
    private final EstimateService estimateService;
    private final FileStorageService fileStorageService;
    private final UserRepository userRepository;
    private final FavoriteRepository favoriteRepository;
    private final ModerationLogService moderationLogService;
    private final PaymentRepository paymentRepository;
    private final ListingImageRepository listingImageRepository;
    private final SettingsService settingsService;

    public MarketplaceController(DesignListingRepository listingRepository,
                                  EstimateService estimateService,
                                  FileStorageService fileStorageService,
                                  UserRepository userRepository,
                                  FavoriteRepository favoriteRepository,
                                  ModerationLogService moderationLogService,
                                  PaymentRepository paymentRepository,
                                  ListingImageRepository listingImageRepository,
                                  SettingsService settingsService) {
        this.listingRepository = listingRepository;
        this.estimateService = estimateService;
        this.fileStorageService = fileStorageService;
        this.userRepository = userRepository;
        this.favoriteRepository = favoriteRepository;
        this.moderationLogService = moderationLogService;
        this.paymentRepository = paymentRepository;
        this.listingImageRepository = listingImageRepository;
        this.settingsService = settingsService;
    }

    /**
     * Gate for the marketplace's "front door" endpoints (browse, view,
     * create) — lets an admin pause new marketplace activity via
     * PATCH /api/admin/settings/features/marketplace without touching a
     * designer's ability to manage listings they already have (publish/
     * unpublish/delete/images/favorites are intentionally NOT gated: those
     * are management actions on existing data, not new marketplace
     * activity).
     */
    private void requireMarketplaceEnabled() {
        if (!settingsService.isFeatureEnabled(FeatureToggleKeys.MARKETPLACE)) {
            throw new FeatureDisabledException(FeatureToggleKeys.MARKETPLACE);
        }
    }

    // ── Public Storefront ────────────────────────────────────────────────────

    // Trending composite score: favorites (weight 2) signal stronger buyer
    // intent than downloads (weight 1) — a favorite is a deliberate,
    // repeatable action; a download can be idle browsing.
    private static final int TRENDING_DOWNLOAD_WEIGHT = 1;
    private static final int TRENDING_FAVORITE_WEIGHT = 2;
    private static final int DEFAULT_PAGE_SIZE = 20;
    private static final int MAX_PAGE_SIZE = 50;

    // FRONTEND: update fetchListings() in src/api/marketplace.ts to read
    // response.content instead of the root array, and handle totalPages for
    // pagination controls.
    @GetMapping
    public ResponseEntity<Page<DesignListing>> getStorefront(
            @RequestParam(required = false) String category,
            @RequestParam(required = false, defaultValue = "newest") String sort,
            @PageableDefault(size = DEFAULT_PAGE_SIZE) Pageable pageable,
            Authentication authentication) {

        requireMarketplaceEnabled();
        Pageable clamped = clampPageSize(pageable);

        Page<DesignListing> page = "trending".equalsIgnoreCase(sort)
                ? listingRepository.findPublishedTrending(
                        category, TRENDING_DOWNLOAD_WEIGHT, TRENDING_FAVORITE_WEIGHT, clamped)
                : listingRepository.findPublishedNewest(category, clamped);

        enrichWithDesigner(page.getContent());
        enrichWithFavoriteStatus(page.getContent(), safeCurrentUserId(authentication));
        return ResponseEntity.ok(page);
    }

    /**
     * No PageableHandlerMethodArgumentResolverCustomizer bean exists in this
     * app to cap page size globally, so it's clamped here. Also strips
     * whatever Sort Spring Data Web parsed from the request — the
     * PageableHandlerMethodArgumentResolver reads a "sort" query param by
     * the same default name this endpoint's own ?sort=newest|trending uses
     * for a completely different purpose, so pageable.getSort() here would
     * hold nonsense like Sort.by("trending"). Both findPublishedNewest/
     * Trending already have an explicit ORDER BY in their @Query — forwarding
     * that bogus Sort would make Spring Data JPA try to append "trending" as
     * a literal ORDER BY column and fail at query time. Building a fresh,
     * sort-less PageRequest avoids that entirely.
     */
    private Pageable clampPageSize(Pageable pageable) {
        int size = Math.min(pageable.getPageSize(), MAX_PAGE_SIZE);
        return PageRequest.of(pageable.getPageNumber(), size);
    }

    // ── Single Listing + Auto Quote ──────────────────────────────────────────

    @GetMapping("/{id}")
    public ResponseEntity<Map<String, Object>> getListing(
            @PathVariable Long id,
            Authentication authentication) {

        requireMarketplaceEnabled();
        DesignListing listing = listingRepository.findById(id)
                .orElseThrow(() -> new ListingNotFoundException(id));

        // Non-designers can only see published listings
        boolean isDesigner = authentication.getAuthorities().stream()
                .anyMatch(a -> a.getAuthority().equals("ROLE_DESIGNER"));
        boolean isOwner = isDesigner && listing.getDesignerId().equals(currentUser(authentication).getUserId());
        if (!"PUBLISHED".equals(listing.getStatus()) && !isOwner) {
            throw new ListingNotFoundException(id);
        }
        // #68 — a still-PUBLISHED listing owned by a since-suspended
        // designer shouldn't stay individually reachable by direct link
        // just because it's excluded from the storefront/search list.
        // adminUnpublished doesn't need a separate check here: an admin
        // takedown always flips status away from PUBLISHED, which the
        // check above already catches.
        if (!isOwner && isOwnerSuspended(listing)) {
            throw new ListingNotFoundException(id);
        }

        enrichWithDesigner(listing);
        enrichWithFavoriteStatus(listing, safeCurrentUserId(authentication));

        // Auto-generate a quote with default params (Standard, 20% infill, qty 1)
        Map<String, Object> response = new LinkedHashMap<>();
        response.put("listing", listing);
        // Never empty for a listing with a thumbnail: createListing() and
        // ListingImageBackfillRunner both guarantee a displayOrder=0 row
        // exists wherever thumbnailUrl does. Only a listing that was
        // created with no thumbnail at all (optional) has zero images here.
        response.put("images", listingImageRepository.findByListingIdOrderByDisplayOrderAsc(id));

        if (listing.getFileId() != null) {
            try {
                User caller = currentUser(authentication);
                Estimate quote = estimateService.calculateAndSaveEstimate(
                        listing.getFileId(),
                        "STANDARD",
                        20,
                        1,
                        "PLA",
                        caller.getUserId(),
                        true,  // file belongs to the designer, not the browsing customer
                        listing.getId()  // snapshots basePrice onto lockedBasePrice at quote time
                );
                // Add base_price on top of machine+material cost
                double totalWithBase = quote.getTotalCost()
                        + (listing.getBasePrice() != null ? listing.getBasePrice().doubleValue() : 0.0);
                quote.setTotalCost(totalWithBase);
                response.put("quote", quote);
            } catch (Exception e) {
                response.put("quote", null);
                response.put("quote_error", "Could not generate quote: " + e.getMessage());
            }
        }

        return ResponseEntity.ok(response);
    }

    // ── Favorites ─────────────────────────────────────────────────────────────

    @PostMapping("/{id}/favorite")
    public ResponseEntity<DesignListing> favoriteListing(
            @PathVariable Long id,
            Authentication authentication) {

        DesignListing listing = listingRepository.findById(id)
                .orElseThrow(() -> new ListingNotFoundException(id));
        User caller = currentUser(authentication);

        if (favoriteRepository.existsByUserIdAndListingId(caller.getUserId(), id)) {
            throw new AlreadyFavoritedException(id);
        }

        Favorite favorite = new Favorite();
        favorite.setUserId(caller.getUserId());
        favorite.setListingId(id);
        favoriteRepository.save(favorite);

        int currentCount = listing.getFavoriteCount() != null ? listing.getFavoriteCount() : 0;
        listing.setFavoriteCount(currentCount + 1);
        DesignListing saved = listingRepository.save(listing);

        enrichWithDesigner(saved);
        saved.setIsFavorited(true);
        return ResponseEntity.ok(saved);
    }

    @DeleteMapping("/{id}/favorite")
    public ResponseEntity<DesignListing> unfavoriteListing(
            @PathVariable Long id,
            Authentication authentication) {

        DesignListing listing = listingRepository.findById(id)
                .orElseThrow(() -> new ListingNotFoundException(id));
        User caller = currentUser(authentication);

        if (!favoriteRepository.existsByUserIdAndListingId(caller.getUserId(), id)) {
            throw new FavoriteNotFoundException(id);
        }

        favoriteRepository.deleteByUserIdAndListingId(caller.getUserId(), id);

        int currentCount = listing.getFavoriteCount() != null ? listing.getFavoriteCount() : 0;
        listing.setFavoriteCount(Math.max(0, currentCount - 1));
        DesignListing saved = listingRepository.save(listing);

        enrichWithDesigner(saved);
        saved.setIsFavorited(false);
        return ResponseEntity.ok(saved);
    }

    @GetMapping("/favorites")
    public ResponseEntity<List<DesignListing>> getFavorites(Authentication authentication) {
        User caller = currentUser(authentication);

        List<Long> listingIds = favoriteRepository.findByUserId(caller.getUserId()).stream()
                .map(Favorite::getListingId)
                .toList();
        List<DesignListing> listings = listingRepository.findAllById(listingIds);

        enrichWithDesigner(listings);
        listings.forEach(l -> l.setIsFavorited(true));
        return ResponseEntity.ok(listings);
    }

    @GetMapping("/{id}/favorite/status")
    public ResponseEntity<Map<String, Object>> getFavoriteStatus(
            @PathVariable Long id,
            Authentication authentication) {

        if (!listingRepository.existsById(id)) {
            throw new ListingNotFoundException(id);
        }
        User caller = currentUser(authentication);

        boolean isFavorited = favoriteRepository.existsByUserIdAndListingId(caller.getUserId(), id);
        long favoriteCount = favoriteRepository.countByListingId(id);

        Map<String, Object> response = new LinkedHashMap<>();
        response.put("isFavorited", isFavorited);
        response.put("favoriteCount", favoriteCount);
        return ResponseEntity.ok(response);
    }

    // ── Designer's Own Listings ──────────────────────────────────────────────

    @PreAuthorize("hasRole('DESIGNER')")
    @GetMapping("/my-listings")
    public ResponseEntity<List<DesignListing>> getMyListings(Authentication authentication) {
        User designer = currentUser(authentication);
        return ResponseEntity.ok(listingRepository.findByDesignerId(designer.getUserId()));
    }

    // ── Create Listing ───────────────────────────────────────────────────────

    @PreAuthorize("hasRole('DESIGNER')")
    @PostMapping(consumes = {"multipart/form-data", "application/json"})
    public ResponseEntity<DesignListing> createListing(
            @RequestParam("file_id") Long fileId,
            @RequestParam("title") String title,
            @RequestParam(value = "description", required = false) String description,
            @RequestParam("base_price") BigDecimal basePrice,
            @RequestParam(value = "thumbnail_file_id", required = false) String thumbnailFileId,
            @RequestParam(value = "category", required = false) String category,
            @RequestParam(value = "ownership_attested", required = false, defaultValue = "false") boolean ownershipAttested,
            @RequestParam(value = "file_format", required = false) String fileFormat,
            @RequestParam(value = "polygon_count", required = false) Integer polygonCount,
            @RequestParam(value = "estimated_print_time_minutes", required = false) Integer estimatedPrintTimeMinutes,
            @RequestParam(value = "layer_height_mm", required = false) BigDecimal layerHeightMm,
            @RequestPart(value = "thumbnail", required = false) MultipartFile thumbnail,
            Authentication authentication) {

        requireMarketplaceEnabled();

        // #67 — a design listed without confirmed rights is exactly the
        // "this design isn't theirs to sell" gap this attestation closes.
        // Same clean-400 pattern as validateCategory() below, not an
        // unhandled exception.
        if (!ownershipAttested) {
            throw new InvalidListingInputException("You must confirm you own the rights to this design");
        }

        User designer = currentUser(authentication);

        DesignListing listing = new DesignListing();
        listing.setFileId(fileId);
        listing.setDesignerId(designer.getUserId());
        listing.setTitle(title);
        listing.setDescription(validateDescription(description));
        listing.setBasePrice(basePrice);
        listing.setStatus("DRAFT");
        listing.setThumbnailFileId(thumbnailFileId);
        listing.setCategory(validateCategory(category));
        listing.setOwnershipAttested(true);
        // Manually designer-supplied spec fields — never auto-extracted
        // from the uploaded file. All optional; null when not provided,
        // same as before these fields existed.
        listing.setFileFormat(fileFormat);
        listing.setPolygonCount(polygonCount);
        listing.setEstimatedPrintTimeMinutes(estimatedPrintTimeMinutes);
        listing.setLayerHeightMm(layerHeightMm);

        // Upload thumbnail to Cloudinary if provided. A thumbnail is an
        // image, never an STL, so store()'s geometry result here is always
        // GeometryResult.failed() — irrelevant, discarded.
        if (thumbnail != null && !thumbnail.isEmpty()) {
            String thumbnailUrl = fileStorageService.store(thumbnail).url();
            listing.setThumbnailUrl(thumbnailUrl);
        }

        DesignListing saved = listingRepository.save(listing);

        // Mirror the thumbnail into the gallery as the displayOrder=0 image,
        // so thumbnailUrl is a real (if derived) member of the images list
        // from the moment a listing exists, same as every listing backfilled
        // by ListingImageBackfillRunner.
        if (saved.getThumbnailUrl() != null) {
            ListingImage thumbnailImage = new ListingImage();
            thumbnailImage.setListingId(saved.getId());
            thumbnailImage.setImageUrl(saved.getThumbnailUrl());
            thumbnailImage.setImageFileId(saved.getThumbnailFileId());
            thumbnailImage.setDisplayOrder(0);
            listingImageRepository.save(thumbnailImage);
        }

        saved.setDesignerName(designer.getFullName());
        saved.setDesignerAvatar(designer.getProfilePictureUrl());
        return ResponseEntity.ok(saved);
    }

    // ── Update Listing ───────────────────────────────────────────────────────

    @PreAuthorize("hasRole('DESIGNER')")
    @PatchMapping("/{id}")
    public ResponseEntity<DesignListing> updateListing(
            @PathVariable Long id,
            @RequestBody Map<String, Object> body,
            Authentication authentication) {

        DesignListing listing = getOwnedListing(id, authentication);

        if (body.containsKey("title")) listing.setTitle((String) body.get("title"));
        if (body.containsKey("description")) listing.setDescription(validateDescription((String) body.get("description")));
        if (body.containsKey("base_price")) {
            listing.setBasePrice(new BigDecimal(body.get("base_price").toString()));
        }

        DesignListing saved = listingRepository.save(listing);
        enrichWithDesigner(saved, currentUser(authentication));
        return ResponseEntity.ok(saved);
    }

    // ── Publish ──────────────────────────────────────────────────────────────

    @PreAuthorize("hasRole('DESIGNER')")
    @PatchMapping("/{id}/publish")
    public ResponseEntity<DesignListing> publishListing(
            @PathVariable Long id,
            Authentication authentication) {

        DesignListing listing = getOwnedListing(id, authentication);
        listing.setStatus("PUBLISHED");
        listing.setPublishedAt(LocalDateTime.now());
        DesignListing saved = listingRepository.save(listing);
        moderationLogService.log(currentUser(authentication), ModerationActionType.DESIGNER_PUBLISH,
                ModerationTargetType.LISTING, id, null);
        enrichWithDesigner(saved, currentUser(authentication));
        return ResponseEntity.ok(saved);
    }

    // ── Unpublish ────────────────────────────────────────────────────────────

    @PreAuthorize("hasRole('DESIGNER')")
    @PatchMapping("/{id}/unpublish")
    public ResponseEntity<DesignListing> unpublishListing(
            @PathVariable Long id,
            Authentication authentication) {

        DesignListing listing = getOwnedListing(id, authentication);
        listing.setStatus("DRAFT");
        listing.setPublishedAt(null);
        DesignListing saved = listingRepository.save(listing);
        moderationLogService.log(currentUser(authentication), ModerationActionType.DESIGNER_UNPUBLISH,
                ModerationTargetType.LISTING, id, null);
        enrichWithDesigner(saved, currentUser(authentication));
        return ResponseEntity.ok(saved);
    }

    // ── Delete ───────────────────────────────────────────────────────────────

    @PreAuthorize("hasRole('DESIGNER')")
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteListing(
            @PathVariable Long id,
            Authentication authentication) {

        DesignListing listing = getOwnedListing(id, authentication);
        if (!"DRAFT".equals(listing.getStatus())) {
            throw new IllegalStateException("Only DRAFT listings can be deleted. Unpublish first.");
        }
        if (listing.getTotalOrders() != null && listing.getTotalOrders() > 0) {
            throw new IllegalStateException("Cannot delete a listing that has existing orders.");
        }
        // A student can have Paystack's checkout sheet open (payment PENDING)
        // for this listing even though it's currently DRAFT/no orders yet —
        // deleting out from under that leaves handleWebhook()'s
        // resolveFileId() with no listing to read fileId from when the
        // payment completes, crashing the webhook after the payment is
        // already marked COMPLETED (money taken, no PrintJob created).
        if (paymentRepository.existsByListingIdAndStatus(id, "PENDING")) {
            throw new ListingDeleteException(
                    "Cannot delete this listing while a payment is in progress. " +
                            "Try again in a few minutes.");
        }

        listingImageRepository.deleteByListingId(id);
        listingRepository.delete(listing);
        return ResponseEntity.noContent().build();
    }

    // ── Gallery Images ───────────────────────────────────────────────────────

    private static final int MAX_IMAGES_PER_LISTING = 8;

    /**
     * Adds one photo to a listing's gallery — entirely optional and separate
     * from listing creation; a designer calls this whenever they want, as
     * many times as they want up to MAX_IMAGES_PER_LISTING. Reuses
     * FileStorageService.storeImage() (content-type-validated) rather than
     * the extension-based store() createListing() uses for the thumbnail,
     * since this path is images-only.
     */
    @PreAuthorize("hasRole('DESIGNER')")
    @PostMapping(value = "/{id}/images", consumes = "multipart/form-data")
    public ResponseEntity<ListingImage> addListingImage(
            @PathVariable Long id,
            @RequestPart("image") MultipartFile image,
            @RequestParam(value = "caption", required = false) String caption,
            Authentication authentication) {

        DesignListing listing = getOwnedListing(id, authentication);

        long currentCount = listingImageRepository.countByListingId(id);
        if (currentCount >= MAX_IMAGES_PER_LISTING) {
            throw new ListingImageLimitExceededException(
                    "A listing can have at most " + MAX_IMAGES_PER_LISTING + " images.");
        }

        FileStorageService.CloudinaryImageResult result = fileStorageService.storeImage(image);

        ListingImage listingImage = new ListingImage();
        listingImage.setListingId(id);
        listingImage.setImageUrl(result.url());
        listingImage.setImageFileId(result.publicId());
        listingImage.setDisplayOrder((int) currentCount);
        listingImage.setCaption(caption);
        ListingImage saved = listingImageRepository.save(listingImage);

        // A listing created with no thumbnail (optional at creation time)
        // gets its first-ever image promoted to the thumbnail here.
        if (currentCount == 0) {
            syncThumbnail(listing, saved);
        }

        return ResponseEntity.ok(saved);
    }

    /**
     * Removes one gallery photo, owner-only. Blocked when it's the
     * listing's last remaining image: a listing must always have at least
     * one (the thumbnail), and replacing that final image is the job of
     * the thumbnail-replacement flow, not this endpoint. Deleting a
     * non-last displayOrder=0 image is allowed — the next image is promoted
     * to displayOrder 0 and thumbnailUrl is re-derived from it.
     */
    @PreAuthorize("hasRole('DESIGNER')")
    @DeleteMapping("/{id}/images/{imageId}")
    public ResponseEntity<Void> deleteListingImage(
            @PathVariable Long id,
            @PathVariable Long imageId,
            Authentication authentication) {

        DesignListing listing = getOwnedListing(id, authentication);

        ListingImage image = listingImageRepository.findByIdAndListingId(imageId, id)
                .orElseThrow(() -> new ListingImageNotFoundException(imageId));

        List<ListingImage> current = listingImageRepository.findByListingIdOrderByDisplayOrderAsc(id);
        if (current.size() <= 1) {
            throw new ListingImageDeleteException(
                    "Cannot delete the last remaining image. Replace the thumbnail instead.");
        }

        listingImageRepository.delete(image);
        fileStorageService.deleteImage(image.getImageFileId());

        List<ListingImage> survivors = current.stream()
                .filter(i -> !i.getId().equals(imageId))
                .sorted(Comparator.comparingInt(ListingImage::getDisplayOrder))
                .toList();
        for (int i = 0; i < survivors.size(); i++) {
            survivors.get(i).setDisplayOrder(i);
        }
        listingImageRepository.saveAll(survivors);
        syncThumbnail(listing, survivors.get(0));

        return ResponseEntity.noContent().build();
    }

    /** Reorders a listing's gallery; the request must name exactly its current set of image ids. */
    @PreAuthorize("hasRole('DESIGNER')")
    @PatchMapping("/{id}/images/reorder")
    public ResponseEntity<List<ListingImage>> reorderImages(
            @PathVariable Long id,
            @RequestBody ReorderImagesRequest request,
            Authentication authentication) {

        DesignListing listing = getOwnedListing(id, authentication);

        List<Long> requestedIds = request.getImageIds();
        if (requestedIds == null || requestedIds.isEmpty()) {
            throw new InvalidListingInputException("imageIds is required");
        }

        List<ListingImage> existing = listingImageRepository.findByListingIdOrderByDisplayOrderAsc(id);
        Map<Long, ListingImage> byId = existing.stream()
                .collect(Collectors.toMap(ListingImage::getId, i -> i));

        if (requestedIds.size() != existing.size() || !byId.keySet().containsAll(requestedIds)
                || new java.util.HashSet<>(requestedIds).size() != requestedIds.size()) {
            throw new InvalidListingInputException(
                    "imageIds must contain exactly this listing's current image ids, each once");
        }

        for (int i = 0; i < requestedIds.size(); i++) {
            byId.get(requestedIds.get(i)).setDisplayOrder(i);
        }
        List<ListingImage> saved = listingImageRepository.saveAll(existing);
        saved.sort(Comparator.comparingInt(ListingImage::getDisplayOrder));
        syncThumbnail(listing, saved.get(0));

        return ResponseEntity.ok(saved);
    }

    /** Keeps thumbnailUrl/thumbnailFileId (the derived convenience copy) equal to the displayOrder=0 image. */
    private void syncThumbnail(DesignListing listing, ListingImage displayOrderZeroImage) {
        listing.setThumbnailUrl(displayOrderZeroImage.getImageUrl());
        listing.setThumbnailFileId(displayOrderZeroImage.getImageFileId());
        listingRepository.save(listing);
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private static final Set<String> VALID_CATEGORIES = Set.of(
            "GEARS", "DRONES", "ENCLOSURES", "MINIATURES", "ARTICULATED", "OTHER"
    );

    /** Normalizes + validates a category value; null/blank passes through as null (category is optional). */
    private String validateCategory(String category) {
        if (category == null || category.isBlank()) return null;
        String normalized = category.trim().toUpperCase();
        if (!VALID_CATEGORIES.contains(normalized)) {
            throw new InvalidListingInputException(
                    "Invalid category '" + category + "'. Must be one of: " + VALID_CATEGORIES);
        }
        return normalized;
    }

    /**
     * #71 length cap for the public-storefront description field. description
     * is optional (null/blank passes through), so this only rejects an
     * over-long value, same shape as validateCategory() above.
     *
     * Bound via @RequestParam (createListing) and a raw Map (updateListing)
     * rather than a single @Valid-checked DTO, so a manual check here —
     * not a Jakarta @Size — is what's actually reachable from both call
     * sites. The DB column stays TEXT (unbounded) rather than being
     * narrowed to @Column(length=2000): this app runs
     * spring.jpa.hibernate.ddl-auto=update, which doesn't reliably narrow
     * an existing live column's type, so this check is the sole
     * enforcement point.
     */
    private String validateDescription(String description) {
        if (description == null || description.isBlank()) return description;
        if (description.length() > 2000) {
            throw new InvalidListingInputException("Description must be 2000 characters or fewer");
        }
        return description;
    }

    /** Single-listing variant of the suspended-owner check, for GET /{id}. */
    private boolean isOwnerSuspended(DesignListing listing) {
        if (listing.getDesignerId() == null) return false;
        return userRepository.findById(listing.getDesignerId())
                .map(User::getSuspended)
                .map(Boolean.TRUE::equals)
                .orElse(false);
    }

    /** Batch designer lookup for list endpoints — avoids one query per listing. */
    private void enrichWithDesigner(List<DesignListing> listings) {
        if (listings.isEmpty()) return;
        List<Long> designerIds = listings.stream()
                .map(DesignListing::getDesignerId)
                .filter(java.util.Objects::nonNull)
                .distinct()
                .toList();
        Map<Long, User> designers = userRepository.findAllById(designerIds).stream()
                .collect(Collectors.toMap(User::getUserId, u -> u));
        for (DesignListing listing : listings) {
            User designer = designers.get(listing.getDesignerId());
            if (designer != null) {
                listing.setDesignerName(designer.getFullName());
                listing.setDesignerAvatar(designer.getProfilePictureUrl());
            }
        }
    }

    /** Single-listing variant — looks up the designer fresh. */
    private void enrichWithDesigner(DesignListing listing) {
        if (listing.getDesignerId() == null) return;
        userRepository.findById(listing.getDesignerId()).ifPresent(designer -> {
            listing.setDesignerName(designer.getFullName());
            listing.setDesignerAvatar(designer.getProfilePictureUrl());
        });
    }

    /** Single-listing variant when the designer (caller) is already on hand — no extra query. */
    private void enrichWithDesigner(DesignListing listing, User designer) {
        listing.setDesignerName(designer.getFullName());
        listing.setDesignerAvatar(designer.getProfilePictureUrl());
    }

    private DesignListing getOwnedListing(Long id, Authentication authentication) {
        DesignListing listing = listingRepository.findById(id)
                .orElseThrow(() -> new ListingNotFoundException(id));
        User caller = currentUser(authentication);
        if (!listing.getDesignerId().equals(caller.getUserId())) {
            throw new AccessDeniedException("You can only modify your own listings.");
        }
        return listing;
    }

    private User currentUser(Authentication authentication) {
        return userRepository.findByEmail(authentication.getName())
                .orElseThrow(() -> new UsernameNotFoundException("User not found"));
    }

    /**
     * Unlike currentUser(), never throws — returns null for an
     * unauthenticated/anonymous caller. GET /api/marketplace currently
     * requires auth (SecurityConfig has no permitAll entry for it), so this
     * is defensive rather than load-bearing today; it keeps isFavorited
     * correct (false) if the endpoint is ever made public later.
     */
    private Long safeCurrentUserId(Authentication authentication) {
        if (authentication == null || !authentication.isAuthenticated()
                || "anonymousUser".equals(authentication.getPrincipal())) {
            return null;
        }
        return userRepository.findByEmail(authentication.getName())
                .map(User::getUserId)
                .orElse(null);
    }

    private void enrichWithFavoriteStatus(DesignListing listing, Long callerId) {
        listing.setIsFavorited(callerId != null
                && favoriteRepository.existsByUserIdAndListingId(callerId, listing.getId()));
    }

    private void enrichWithFavoriteStatus(List<DesignListing> listings, Long callerId) {
        if (callerId == null) {
            listings.forEach(l -> l.setIsFavorited(false));
            return;
        }
        Set<Long> favoritedIds = favoriteRepository.findByUserId(callerId).stream()
                .map(Favorite::getListingId)
                .collect(Collectors.toSet());
        listings.forEach(l -> l.setIsFavorited(favoritedIds.contains(l.getId())));
    }
}

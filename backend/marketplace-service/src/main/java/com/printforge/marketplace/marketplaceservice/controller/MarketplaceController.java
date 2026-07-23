package com.printforge.marketplace.marketplaceservice.controller;

import com.printforge.marketplace.entity.User;
import com.printforge.marketplace.estimateservice.model.Estimate;
import com.printforge.marketplace.estimateservice.service.EstimateService;
import com.printforge.marketplace.fileservice.storage.FileStorageService;
import com.printforge.marketplace.marketplaceservice.exception.AlreadyFavoritedException;
import com.printforge.marketplace.marketplaceservice.exception.FavoriteNotFoundException;
import com.printforge.marketplace.marketplaceservice.exception.InvalidListingInputException;
import com.printforge.marketplace.marketplaceservice.exception.ListingDeleteException;
import com.printforge.marketplace.marketplaceservice.exception.ListingNotFoundException;
import com.printforge.marketplace.marketplaceservice.model.DesignListing;
import com.printforge.marketplace.marketplaceservice.model.Favorite;
import com.printforge.marketplace.marketplaceservice.repository.DesignListingRepository;
import com.printforge.marketplace.marketplaceservice.repository.FavoriteRepository;
import com.printforge.marketplace.moderationservice.model.ModerationActionType;
import com.printforge.marketplace.moderationservice.model.ModerationTargetType;
import com.printforge.marketplace.moderationservice.service.ModerationLogService;
import com.printforge.marketplace.paymentservice.repository.PaymentRepository;
import com.printforge.marketplace.repository.UserRepository;
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

    public MarketplaceController(DesignListingRepository listingRepository,
                                  EstimateService estimateService,
                                  FileStorageService fileStorageService,
                                  UserRepository userRepository,
                                  FavoriteRepository favoriteRepository,
                                  ModerationLogService moderationLogService,
                                  PaymentRepository paymentRepository) {
        this.listingRepository = listingRepository;
        this.estimateService = estimateService;
        this.fileStorageService = fileStorageService;
        this.userRepository = userRepository;
        this.favoriteRepository = favoriteRepository;
        this.moderationLogService = moderationLogService;
        this.paymentRepository = paymentRepository;
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

    @GetMapping("/{id}/quote")
    public ResponseEntity<Estimate> getCustomQuote(
            @PathVariable Long id,
            @RequestParam(defaultValue = "STANDARD") String quality,
            @RequestParam(defaultValue = "20") Integer infillPercent,
            @RequestParam(defaultValue = "1") Integer quantity,
            @RequestParam(defaultValue = "PLA") String materialType,
            Authentication authentication) {

        DesignListing listing = listingRepository.findById(id)
                .orElseThrow(() -> new ListingNotFoundException(id));

        boolean isDesigner = authentication != null && authentication.getAuthorities().stream()
                .anyMatch(a -> a.getAuthority().equals("ROLE_DESIGNER"));
        boolean isOwner = isDesigner && listing.getDesignerId().equals(safeCurrentUserId(authentication));
        if (!"PUBLISHED".equals(listing.getStatus()) && !isOwner) {
            throw new ListingNotFoundException(id);
        }
        if (!isOwner && isOwnerSuspended(listing)) {
            throw new ListingNotFoundException(id);
        }

        if (listing.getFileId() == null) {
            throw new InvalidListingInputException("This listing has no printable file attached");
        }

        User caller = currentUser(authentication);
        Estimate quote = estimateService.calculateAndSaveEstimate(
                listing.getFileId(),
                quality.toUpperCase(),
                infillPercent,
                quantity,
                materialType,
                caller.getUserId(),
                true,  // file belongs to the designer, not the browsing customer
                listing.getId()  // snapshots basePrice onto lockedBasePrice at quote time
        );

        // Add base_price on top of machine+material cost
        double totalWithBase = quote.getTotalCost()
                + (listing.getBasePrice() != null ? listing.getBasePrice().doubleValue() : 0.0);
        quote.setTotalCost(totalWithBase);

        return ResponseEntity.ok(quote);
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

        listingRepository.delete(listing);
        return ResponseEntity.noContent().build();
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
                listing.setIsPremiumDesigner(designer.isPremium());
            }
        }
    }

    /** Single-listing variant — looks up the designer fresh. */
    private void enrichWithDesigner(DesignListing listing) {
        if (listing.getDesignerId() == null) return;
        userRepository.findById(listing.getDesignerId()).ifPresent(designer -> {
            listing.setDesignerName(designer.getFullName());
            listing.setDesignerAvatar(designer.getProfilePictureUrl());
            listing.setIsPremiumDesigner(designer.isPremium());
        });
    }

    /** Single-listing variant when the designer (caller) is already on hand — no extra query. */
    private void enrichWithDesigner(DesignListing listing, User designer) {
        listing.setDesignerName(designer.getFullName());
        listing.setDesignerAvatar(designer.getProfilePictureUrl());
        listing.setIsPremiumDesigner(designer.isPremium());
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

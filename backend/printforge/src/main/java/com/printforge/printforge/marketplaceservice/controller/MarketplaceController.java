package com.printforge.printforge.marketplaceservice.controller;

import com.printforge.printforge.entity.User;
import com.printforge.printforge.estimateservice.model.Estimate;
import com.printforge.printforge.estimateservice.service.EstimateService;
import com.printforge.printforge.fileservice.storage.FileStorageService;
import com.printforge.printforge.marketplaceservice.exception.AlreadyFavoritedException;
import com.printforge.printforge.marketplaceservice.exception.FavoriteNotFoundException;
import com.printforge.printforge.marketplaceservice.exception.InvalidListingInputException;
import com.printforge.printforge.marketplaceservice.exception.ListingNotFoundException;
import com.printforge.printforge.marketplaceservice.model.DesignListing;
import com.printforge.printforge.marketplaceservice.model.Favorite;
import com.printforge.printforge.marketplaceservice.repository.DesignListingRepository;
import com.printforge.printforge.marketplaceservice.repository.FavoriteRepository;
import com.printforge.printforge.moderationservice.model.ModerationActionType;
import com.printforge.printforge.moderationservice.model.ModerationTargetType;
import com.printforge.printforge.moderationservice.service.ModerationLogService;
import com.printforge.printforge.repository.UserRepository;
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

    public MarketplaceController(DesignListingRepository listingRepository,
                                  EstimateService estimateService,
                                  FileStorageService fileStorageService,
                                  UserRepository userRepository,
                                  FavoriteRepository favoriteRepository,
                                  ModerationLogService moderationLogService) {
        this.listingRepository = listingRepository;
        this.estimateService = estimateService;
        this.fileStorageService = fileStorageService;
        this.userRepository = userRepository;
        this.favoriteRepository = favoriteRepository;
        this.moderationLogService = moderationLogService;
    }

    // ── Public Storefront ────────────────────────────────────────────────────

    @GetMapping
    public ResponseEntity<List<DesignListing>> getStorefront(
            @RequestParam(required = false) String category,
            Authentication authentication) {

        List<DesignListing> listings = listingRepository.findByStatus("PUBLISHED");
        if (category != null && !category.isBlank()) {
            listings = listings.stream()
                    .filter(l -> category.equalsIgnoreCase(l.getCategory()))
                    .toList();
        }
        listings = excludeModerated(listings);
        enrichWithDesigner(listings);
        enrichWithFavoriteStatus(listings, safeCurrentUserId(authentication));
        return ResponseEntity.ok(listings);
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
                        true  // file belongs to the designer, not the browsing customer
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
        listing.setDescription(description);
        listing.setBasePrice(basePrice);
        listing.setStatus("DRAFT");
        listing.setThumbnailFileId(thumbnailFileId);
        listing.setCategory(validateCategory(category));
        listing.setOwnershipAttested(true);

        // Upload thumbnail to Cloudinary if provided
        if (thumbnail != null && !thumbnail.isEmpty()) {
            String thumbnailUrl = fileStorageService.store(thumbnail);
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
        if (body.containsKey("description")) listing.setDescription((String) body.get("description"));
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
     * #68 moderation filter for list endpoints (the main storefront feed;
     * there's no separate search query in this codebase — the storefront's
     * optional `category` param is the only "search" surface). Excludes
     * listings an admin has force-unpublished and listings owned by a
     * since-suspended designer. Deliberately in-memory (matches the
     * existing `category` filter above, which already post-filters a
     * fetched list rather than pushing it into the query) rather than a
     * JPQL join — DesignListing.designerId is a plain FK, not a mapped
     * association, so there's no association path to join through.
     */
    private List<DesignListing> excludeModerated(List<DesignListing> listings) {
        if (listings.isEmpty()) return listings;
        Set<Long> suspendedDesignerIds = userRepository.findBySuspendedTrue().stream()
                .map(User::getUserId)
                .collect(Collectors.toSet());
        return listings.stream()
                .filter(l -> !Boolean.TRUE.equals(l.getAdminUnpublished()))
                .filter(l -> !suspendedDesignerIds.contains(l.getDesignerId()))
                .toList();
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

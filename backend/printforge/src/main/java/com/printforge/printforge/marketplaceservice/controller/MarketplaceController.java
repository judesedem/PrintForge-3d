package com.printforge.printforge.marketplaceservice.controller;

import com.printforge.printforge.entity.User;
import com.printforge.printforge.estimateservice.model.Estimate;
import com.printforge.printforge.estimateservice.service.EstimateService;
import com.printforge.printforge.fileservice.storage.FileStorageService;
import com.printforge.printforge.marketplaceservice.exception.ListingNotFoundException;
import com.printforge.printforge.marketplaceservice.model.DesignListing;
import com.printforge.printforge.marketplaceservice.repository.DesignListingRepository;
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

    public MarketplaceController(DesignListingRepository listingRepository,
                                  EstimateService estimateService,
                                  FileStorageService fileStorageService,
                                  UserRepository userRepository) {
        this.listingRepository = listingRepository;
        this.estimateService = estimateService;
        this.fileStorageService = fileStorageService;
        this.userRepository = userRepository;
    }

    // ── Public Storefront ────────────────────────────────────────────────────

    @GetMapping
    public ResponseEntity<List<DesignListing>> getStorefront() {
        return ResponseEntity.ok(listingRepository.findByStatus("PUBLISHED"));
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
            @RequestPart(value = "thumbnail", required = false) MultipartFile thumbnail,
            Authentication authentication) {

        User designer = currentUser(authentication);

        DesignListing listing = new DesignListing();
        listing.setFileId(fileId);
        listing.setDesignerId(designer.getUserId());
        listing.setTitle(title);
        listing.setDescription(description);
        listing.setBasePrice(basePrice);
        listing.setStatus("DRAFT");

        // Upload thumbnail to Cloudinary if provided
        if (thumbnail != null && !thumbnail.isEmpty()) {
            String thumbnailUrl = fileStorageService.store(thumbnail);
            listing.setThumbnailUrl(thumbnailUrl);
        }

        return ResponseEntity.ok(listingRepository.save(listing));
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

        return ResponseEntity.ok(listingRepository.save(listing));
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
        return ResponseEntity.ok(listingRepository.save(listing));
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
        return ResponseEntity.ok(listingRepository.save(listing));
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
}

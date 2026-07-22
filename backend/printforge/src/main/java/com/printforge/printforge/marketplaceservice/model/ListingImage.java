package com.printforge.printforge.marketplaceservice.model;

import jakarta.persistence.*;

/**
 * One photo in a DesignListing's gallery. The image at displayOrder 0 is
 * always the same one DesignListing.thumbnailUrl points at — thumbnailUrl
 * is a derived convenience copy of it, kept in sync by MarketplaceController
 * whenever the displayOrder-0 image changes (upload, delete, reorder).
 */
@Entity
@Table(name = "listing_images")
public class ListingImage {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // FK → design_listings.id — bare Long, not a JPA association, same
    // convention DesignListing itself uses for fileId/designerId.
    @Column(name = "listing_id", nullable = false)
    private Long listingId;

    @Column(name = "image_url", nullable = false)
    private String imageUrl;

    // Cloudinary public_id for this image (needed later by
    // FileStorageService.deleteImage()). Nullable — same pattern as
    // DesignListing.thumbnailFileId; a displayOrder=0 row backfilled from a
    // pre-existing thumbnail may not carry a reliable one.
    @Column(name = "image_file_id")
    private String imageFileId;

    @Column(name = "display_order", nullable = false)
    private int displayOrder;

    // Optional free-text label the designer can add, e.g. "Printed parts
    // before assembly" — never required.
    @Column(columnDefinition = "TEXT")
    private String caption;

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public Long getListingId() { return listingId; }
    public void setListingId(Long listingId) { this.listingId = listingId; }

    public String getImageUrl() { return imageUrl; }
    public void setImageUrl(String imageUrl) { this.imageUrl = imageUrl; }

    public String getImageFileId() { return imageFileId; }
    public void setImageFileId(String imageFileId) { this.imageFileId = imageFileId; }

    public int getDisplayOrder() { return displayOrder; }
    public void setDisplayOrder(int displayOrder) { this.displayOrder = displayOrder; }

    public String getCaption() { return caption; }
    public void setCaption(String caption) { this.caption = caption; }
}

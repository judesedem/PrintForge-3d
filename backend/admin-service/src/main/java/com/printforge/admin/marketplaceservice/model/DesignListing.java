package com.printforge.admin.marketplaceservice.model;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "design_listings")
public class DesignListing {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // FK → model_files.file_id
    private Long fileId;

    // FK → users.user_id
    private Long designerId;

    private String title;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Column(precision = 10, scale = 2)
    private BigDecimal basePrice;

    private String thumbnailUrl;

    // Links the thumbnail back to its ModelFile/image record (the id
    // returned by POST /api/files/upload/image). Nullable — older listings
    // and listings created with just a raw thumbnailUrl won't have this.
    private String thumbnailFileId;

    // One of GEARS, DRONES, ENCLOSURES, MINIATURES, ARTICULATED, OTHER —
    // validated in MarketplaceController. Nullable for listings created
    // before this field existed.
    private String category;

    // "DRAFT" or "PUBLISHED"
    private String status;

    private LocalDateTime createdAt;
    private LocalDateTime publishedAt;

    // Earnings tracking
    private Integer totalOrders = 0;

    @Column(precision = 10, scale = 2)
    private BigDecimal totalEarnings = BigDecimal.ZERO;

    private Integer favoriteCount = 0;

    // Trending-sort input (GET /api/marketplace?sort=trending). No existing
    // "download" concept exists anywhere in this codebase to back this —
    // added specifically so the trending composite score
    // (downloadCount*1 + favoriteCount*2) is real and seedable, rather than
    // silently dropping the download term from that formula. Nothing
    // currently increments this; it starts and stays at 0 until a download-
    // tracking call site is added elsewhere.
    private Integer downloadCount = 0;

    // Designer's attestation at creation time that they own the rights to
    // sell this design (#67). Not-null with a DB-level default so existing
    // rows backfill to false via ddl-auto=update instead of failing the
    // ALTER TABLE (see Estimate.java's fileId/userId comment for the
    // general version of this gotcha — this field avoids it by giving
    // Postgres an explicit DEFAULT alongside NOT NULL, rather than leaving
    // the column nullable). MarketplaceController.createListing() rejects
    // with 400 before save if the caller didn't set this true.
    @Column(columnDefinition = "boolean not null default false")
    private boolean ownershipAttested;

    // Set when an admin force-unpublishes a listing via
    // PATCH /api/admin/listings/{id}/unpublish (#68), as distinct from a
    // designer voluntarily unpublishing their own listing (both set status
    // back to DRAFT, but only this flag is checked by the marketplace-
    // visibility queries) — so the listing stays hidden from browsing even
    // if the designer's own unmodified /publish endpoint is called again.
    // Nullable/boxed: null means "never taken down", same as an unset flag.
    private Boolean adminUnpublished;

    // When the admin takedown above was applied — set alongside
    // adminUnpublished=true by AdminService.unpublishListing(), cleared
    // back to null alongside adminUnpublished=false by
    // AdminService.republishListing(). Added to let a future check compare
    // "when did the admin take this down" against some "when did the
    // designer last touch this listing" signal — but per the current
    // Handoff.md writeup, DesignListing has no such counterpart timestamp
    // today (publishedAt gets nulled out on every unpublish, admin's or
    // the designer's own, so it can't record when a *designer* unpublish
    // happened), so this field alone does not yet resolve the
    // republish-vs-designer-choice ambiguity documented there — it only
    // records the admin side of the comparison.
    private LocalDateTime adminUnpublishedAt;

    // Populated by the controller/service from the User referenced by
    // designerId, right before serialization — not persisted. Lets every
    // listing response include who made it without turning designerId into
    // a full JPA relationship.
    @Transient
    private String designerName;

    @Transient
    private String designerAvatar;

    // Per-caller: whether the currently authenticated user has favorited
    // this listing. Computed by the controller, not persisted — same
    // pattern as designerName/designerAvatar above.
    @Transient
    private Boolean isFavorited;

    // Set manually by the designer at listing creation/edit time — NOT
    // auto-extracted from the uploaded file (that's a separate concern
    // handled by StlGeometryParser/etc. against ModelFile, not this
    // entity). Nullable: listings created before these fields existed,
    // and any listing where the designer didn't fill them in, return
    // null rather than a fabricated default — the frontend already
    // handles null display (e.g. "—").
    @Column(name = "file_format")
    private String fileFormat;

    @Column(name = "polygon_count")
    private Integer polygonCount;

    @Column(name = "estimated_print_time_minutes")
    private Integer estimatedPrintTimeMinutes;

    @Column(name = "layer_height_mm", precision = 10, scale = 2)
    private BigDecimal layerHeightMm;

    @PrePersist
    protected void onCreate() {
        this.createdAt = LocalDateTime.now();
        if (this.status == null) this.status = "DRAFT";
        if (this.totalOrders == null) this.totalOrders = 0;
        if (this.totalEarnings == null) this.totalEarnings = BigDecimal.ZERO;
        if (this.favoriteCount == null) this.favoriteCount = 0;
        if (this.downloadCount == null) this.downloadCount = 0;
    }

    // Getters and setters
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public Long getFileId() { return fileId; }
    public void setFileId(Long fileId) { this.fileId = fileId; }

    public Long getDesignerId() { return designerId; }
    public void setDesignerId(Long designerId) { this.designerId = designerId; }

    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }

    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }

    public BigDecimal getBasePrice() { return basePrice; }
    public void setBasePrice(BigDecimal basePrice) { this.basePrice = basePrice; }

    public String getThumbnailUrl() { return thumbnailUrl; }
    public void setThumbnailUrl(String thumbnailUrl) { this.thumbnailUrl = thumbnailUrl; }

    public String getThumbnailFileId() { return thumbnailFileId; }
    public void setThumbnailFileId(String thumbnailFileId) { this.thumbnailFileId = thumbnailFileId; }

    public String getCategory() { return category; }
    public void setCategory(String category) { this.category = category; }

    public String getDesignerName() { return designerName; }
    public void setDesignerName(String designerName) { this.designerName = designerName; }

    public String getDesignerAvatar() { return designerAvatar; }
    public void setDesignerAvatar(String designerAvatar) { this.designerAvatar = designerAvatar; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }

    public LocalDateTime getPublishedAt() { return publishedAt; }
    public void setPublishedAt(LocalDateTime publishedAt) { this.publishedAt = publishedAt; }

    public Integer getTotalOrders() { return totalOrders; }
    public void setTotalOrders(Integer totalOrders) { this.totalOrders = totalOrders; }

    public BigDecimal getTotalEarnings() { return totalEarnings; }
    public void setTotalEarnings(BigDecimal totalEarnings) { this.totalEarnings = totalEarnings; }

    public Integer getFavoriteCount() { return favoriteCount; }
    public void setFavoriteCount(Integer favoriteCount) { this.favoriteCount = favoriteCount; }

    public Integer getDownloadCount() { return downloadCount; }
    public void setDownloadCount(Integer downloadCount) { this.downloadCount = downloadCount; }

    public Boolean getIsFavorited() { return isFavorited; }
    public void setIsFavorited(Boolean isFavorited) { this.isFavorited = isFavorited; }

    public boolean isOwnershipAttested() { return ownershipAttested; }
    public void setOwnershipAttested(boolean ownershipAttested) { this.ownershipAttested = ownershipAttested; }

    public Boolean getAdminUnpublished() { return adminUnpublished; }
    public void setAdminUnpublished(Boolean adminUnpublished) { this.adminUnpublished = adminUnpublished; }

    public LocalDateTime getAdminUnpublishedAt() { return adminUnpublishedAt; }
    public void setAdminUnpublishedAt(LocalDateTime adminUnpublishedAt) { this.adminUnpublishedAt = adminUnpublishedAt; }

    public String getFileFormat() { return fileFormat; }
    public void setFileFormat(String fileFormat) { this.fileFormat = fileFormat; }

    public Integer getPolygonCount() { return polygonCount; }
    public void setPolygonCount(Integer polygonCount) { this.polygonCount = polygonCount; }

    public Integer getEstimatedPrintTimeMinutes() { return estimatedPrintTimeMinutes; }
    public void setEstimatedPrintTimeMinutes(Integer estimatedPrintTimeMinutes) { this.estimatedPrintTimeMinutes = estimatedPrintTimeMinutes; }

    public BigDecimal getLayerHeightMm() { return layerHeightMm; }
    public void setLayerHeightMm(BigDecimal layerHeightMm) { this.layerHeightMm = layerHeightMm; }

    // Derived, read-only — no backing field/column, so it's never persisted
    // and there's no setter. "REMOVED" when an admin has taken the listing
    // down (adminUnpublished=true), otherwise the real status value
    // (DRAFT/PUBLISHED) unchanged. Gives the admin dashboard the three-state
    // view it expects without restructuring status itself or touching any
    // existing status-checking logic (getStatus() still returns exactly
    // what it always did). A plain getter with no matching field is
    // invisible to Hibernate (this entity uses field-access mode, so only
    // real @Id/@Column-backed fields are ever persisted/queried) but is
    // still picked up by Jackson's normal bean introspection, so it shows
    // up in every JSON response that serializes a DesignListing today —
    // including the unpublish/republish responses this service's
    // AdminController returns directly.
    public String getDisplayStatus() {
        return Boolean.TRUE.equals(adminUnpublished) ? "REMOVED" : status;
    }
}

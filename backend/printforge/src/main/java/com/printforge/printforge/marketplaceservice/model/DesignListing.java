package com.printforge.printforge.marketplaceservice.model;

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

    // "DRAFT" or "PUBLISHED"
    private String status;

    private LocalDateTime createdAt;
    private LocalDateTime publishedAt;

    // Earnings tracking
    private Integer totalOrders = 0;

    @Column(precision = 10, scale = 2)
    private BigDecimal totalEarnings = BigDecimal.ZERO;

    @PrePersist
    protected void onCreate() {
        this.createdAt = LocalDateTime.now();
        if (this.status == null) this.status = "DRAFT";
        if (this.totalOrders == null) this.totalOrders = 0;
        if (this.totalEarnings == null) this.totalEarnings = BigDecimal.ZERO;
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
}

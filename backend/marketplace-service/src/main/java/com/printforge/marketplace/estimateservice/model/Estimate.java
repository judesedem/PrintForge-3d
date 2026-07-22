package com.printforge.marketplace.estimateservice.model;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "estimates")
public class Estimate {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // Links this estimate to the actual uploaded file it was calculated
    // from, and the user who requested it. Nullable for now — same lesson
    // learned as ModelFile.fileUrl: ddl-auto=update won't retroactively
    // backfill a NOT NULL column on a table that may already have rows
    // from earlier testing. Drop+recreate the estimates table (see the
    // handoff doc) if you want these enforced NOT NULL going forward.
    private Long fileId;
    private Long userId;

    private Double fileSizeKb;
    private String quality;
    private Integer infillPercent;
    private Integer quantity;

    // NEW: The two new marketplace variables
    private String materialType;
    private Double totalCost;

    private Double estimatedGrams;
    private Double durationMinutes;

    // Snapshot of DesignListing.basePrice at quote time. Ensures the student
    // pays what they were shown even if the designer changes the price before
    // payment completes. Null for BYOF (non-marketplace) jobs.
    @Column(precision = 10, scale = 2)
    private BigDecimal lockedBasePrice;

    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        this.createdAt = LocalDateTime.now();
    }

    // --- Getters and Setters ---
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public Long getFileId() { return fileId; }
    public void setFileId(Long fileId) { this.fileId = fileId; }

    public Long getUserId() { return userId; }
    public void setUserId(Long userId) { this.userId = userId; }

    public Double getFileSizeKb() { return fileSizeKb; }
    public void setFileSizeKb(Double fileSizeKb) { this.fileSizeKb = fileSizeKb; }

    public String getQuality() { return quality; }
    public void setQuality(String quality) { this.quality = quality; }

    public Integer getInfillPercent() { return infillPercent; }
    public void setInfillPercent(Integer infillPercent) { this.infillPercent = infillPercent; }

    public Integer getQuantity() { return quantity; }
    public void setQuantity(Integer quantity) { this.quantity = quantity; }

    // NEW Getters and Setters
    public String getMaterialType() { return materialType; }
    public void setMaterialType(String materialType) { this.materialType = materialType; }

    public Double getTotalCost() { return totalCost; }
    public void setTotalCost(Double totalCost) { this.totalCost = totalCost; }

    public Double getEstimatedGrams() { return estimatedGrams; }
    public void setEstimatedGrams(Double estimatedGrams) { this.estimatedGrams = estimatedGrams; }

    public Double getDurationMinutes() { return durationMinutes; }
    public void setDurationMinutes(Double durationMinutes) { this.durationMinutes = durationMinutes; }

    public BigDecimal getLockedBasePrice() { return lockedBasePrice; }
    public void setLockedBasePrice(BigDecimal lockedBasePrice) { this.lockedBasePrice = lockedBasePrice; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
}
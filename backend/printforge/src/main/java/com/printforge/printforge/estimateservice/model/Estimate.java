package com.printforge.printforge.estimateservice.model;

import jakarta.persistence.*;

@Entity
@Table(name = "estimates")
public class Estimate {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private Double fileSizeKb;
    private String quality;
    private Integer infillPercent;
    private Integer quantity;

    // NEW: The two new marketplace variables
    private String materialType;
    private Double totalCost;

    private Double estimatedGrams;
    private Double durationMinutes;

    // --- Getters and Setters ---
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

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
}
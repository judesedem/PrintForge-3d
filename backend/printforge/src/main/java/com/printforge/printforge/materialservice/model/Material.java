package com.printforge.printforge.materialservice.model;

import jakarta.persistence.*;

import java.util.ArrayList;
import java.util.List;

/**
 * Single source of truth for material data — replaces the two independent
 * hardcoded copies that used to live in MaterialsController (name/price/
 * colors/availability/description) and EstimateService (name/price/
 * baseMinutesPerGram/density), which had already drifted out of sync with
 * each other (PETG and CARBON_FIBER had two different cost_per_gram values
 * depending which file you read). Both now read this same table.
 */
@Entity
@Table(name = "materials")
public class Material {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // The business key — "PLA", "RESIN", etc. Always stored/looked-up
    // uppercase (EstimateService normalizes with .trim().toUpperCase()
    // before every lookup, same as the Set<String> check it replaces).
    @Column(nullable = false, unique = true)
    private String name;

    @Column(name = "cost_per_gram", nullable = false)
    private double costPerGram;

    @ElementCollection
    @CollectionTable(name = "material_colors", joinColumns = @JoinColumn(name = "material_id"))
    @OrderColumn(name = "display_order")
    @Column(name = "color")
    private List<String> colors = new ArrayList<>();

    @Column(name = "availability_status")
    private String availabilityStatus;

    @Column(columnDefinition = "TEXT")
    private String description;

    // Feeds EstimateService's print-time formula (minutes of machine time
    // per gram of filament). Not part of PATCH /api/admin/materials/{name}'s
    // editable fields (cost_per_gram/colors/availability_status only) —
    // fixed at the seeded value.
    @Column(name = "base_minutes_per_gram", nullable = false)
    private double baseMinutesPerGram;

    // Feeds EstimateService's geometry-based weight formula (g/cm3). Same
    // "not admin-editable via PATCH" note as baseMinutesPerGram.
    @Column(name = "density_g_cm3", nullable = false)
    private double densityGCm3;

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public double getCostPerGram() { return costPerGram; }
    public void setCostPerGram(double costPerGram) { this.costPerGram = costPerGram; }

    public List<String> getColors() { return colors; }
    public void setColors(List<String> colors) { this.colors = colors; }

    public String getAvailabilityStatus() { return availabilityStatus; }
    public void setAvailabilityStatus(String availabilityStatus) { this.availabilityStatus = availabilityStatus; }

    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }

    public double getBaseMinutesPerGram() { return baseMinutesPerGram; }
    public void setBaseMinutesPerGram(double baseMinutesPerGram) { this.baseMinutesPerGram = baseMinutesPerGram; }

    public double getDensityGCm3() { return densityGCm3; }
    public void setDensityGCm3(double densityGCm3) { this.densityGCm3 = densityGCm3; }
}

package com.printforge.marketplace.materialservice.model;

import jakarta.persistence.*;

import java.util.ArrayList;
import java.util.List;

/**
 * Read-side copy of order-service's Material entity, pointing at the same
 * shared `materials` table (order-service owns MaterialSeeder — this
 * service never seeds it) — see order-service's Material.java javadoc for
 * the full single-source-of-truth history. This copy exists solely so
 * this service's own EstimateService (the storefront auto-quote path) can
 * read live cost_per_gram/baseMinutesPerGram/density instead of the
 * hardcoded ladder it used to carry independently.
 */
@Entity
@Table(name = "materials")
public class Material {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

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

    @Column(name = "base_minutes_per_gram", nullable = false)
    private double baseMinutesPerGram;

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

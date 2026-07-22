package com.printforge.order.settingsservice.model;

import jakarta.persistence.*;

/**
 * Read-side copy of admin-service's FeatureToggle entity, pointing at the
 * same shared `feature_toggles` table (admin-service owns
 * FeatureToggleSeeder and the PATCH endpoint — this service never writes
 * to this table).
 */
@Entity
@Table(name = "feature_toggles")
public class FeatureToggle {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "feature_name", nullable = false, unique = true)
    private String featureName;

    @Column(nullable = false)
    private boolean enabled;

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getFeatureName() { return featureName; }
    public void setFeatureName(String featureName) { this.featureName = featureName; }

    public boolean isEnabled() { return enabled; }
    public void setEnabled(boolean enabled) { this.enabled = enabled; }
}

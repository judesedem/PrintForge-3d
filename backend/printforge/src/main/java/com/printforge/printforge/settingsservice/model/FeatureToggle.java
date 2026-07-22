package com.printforge.printforge.settingsservice.model;

import jakarta.persistence.*;

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

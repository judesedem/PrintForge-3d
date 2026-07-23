package com.printforge.admin.settingsservice.repository;

import com.printforge.admin.settingsservice.model.FeatureToggle;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface FeatureToggleRepository extends JpaRepository<FeatureToggle, Long> {
    Optional<FeatureToggle> findByFeatureName(String featureName);
    boolean existsByFeatureName(String featureName);
}

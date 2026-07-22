package com.printforge.notification.settingsservice.repository;

import com.printforge.notification.settingsservice.model.FeatureToggle;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface FeatureToggleRepository extends JpaRepository<FeatureToggle, Long> {
    Optional<FeatureToggle> findByFeatureName(String featureName);
}

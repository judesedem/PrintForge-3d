package com.printforge.order.settingsservice.repository;

import com.printforge.order.settingsservice.model.FeatureToggle;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface FeatureToggleRepository extends JpaRepository<FeatureToggle, Long> {
    Optional<FeatureToggle> findByFeatureName(String featureName);
}

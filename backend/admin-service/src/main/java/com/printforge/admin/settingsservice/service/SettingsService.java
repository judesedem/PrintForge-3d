package com.printforge.admin.settingsservice.service;

import com.printforge.admin.settingsservice.dto.UpdateContactInfoRequest;
import com.printforge.admin.settingsservice.exception.FeatureToggleNotFoundException;
import com.printforge.admin.settingsservice.model.FeatureToggle;
import com.printforge.admin.settingsservice.model.LabContactInfo;
import com.printforge.admin.settingsservice.repository.FeatureToggleRepository;
import com.printforge.admin.settingsservice.repository.LabContactInfoRepository;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class SettingsService {

    // LabContactInfoSeeder always creates exactly this row on startup, so
    // every read can assume it exists rather than null-checking.
    private static final Long CONTACT_INFO_ID = 1L;

    private final LabContactInfoRepository labContactInfoRepository;
    private final FeatureToggleRepository featureToggleRepository;

    public SettingsService(LabContactInfoRepository labContactInfoRepository,
                            FeatureToggleRepository featureToggleRepository) {
        this.labContactInfoRepository = labContactInfoRepository;
        this.featureToggleRepository = featureToggleRepository;
    }

    public LabContactInfo getContactInfo() {
        return labContactInfoRepository.findById(CONTACT_INFO_ID)
                .orElseThrow(() -> new IllegalStateException(
                        "Lab contact info row is missing — LabContactInfoSeeder should have created it on startup"));
    }

    public LabContactInfo updateContactInfo(UpdateContactInfoRequest request) {
        LabContactInfo contactInfo = getContactInfo();
        if (request.getLabName() != null) contactInfo.setLabName(request.getLabName());
        if (request.getEmail() != null) contactInfo.setEmail(request.getEmail());
        if (request.getPhone() != null) contactInfo.setPhone(request.getPhone());
        return labContactInfoRepository.save(contactInfo);
    }

    public List<FeatureToggle> getFeatureToggles() {
        return featureToggleRepository.findAll();
    }

    public FeatureToggle updateFeatureToggle(String featureName, boolean enabled) {
        FeatureToggle toggle = featureToggleRepository.findByFeatureName(featureName)
                .orElseThrow(() -> new FeatureToggleNotFoundException(featureName));
        toggle.setEnabled(enabled);
        return featureToggleRepository.save(toggle);
    }

    /**
     * Read-side check used by this service's own NotificationService
     * (AdminService.suspendUser()'s notification call flows through it) —
     * every other service that needs this same check duplicates the
     * FeatureToggle table read directly rather than calling back here,
     * since there's no REST call between services. Fails OPEN — a
     * missing/unrecognized key is treated as enabled, never as disabled. A
     * seeding race or a typo'd key should never silently turn off a
     * feature that was working before this toggle existed; only an
     * explicit enabled=false row does that.
     */
    public boolean isFeatureEnabled(String featureName) {
        return featureToggleRepository.findByFeatureName(featureName)
                .map(FeatureToggle::isEnabled)
                .orElse(true);
    }
}

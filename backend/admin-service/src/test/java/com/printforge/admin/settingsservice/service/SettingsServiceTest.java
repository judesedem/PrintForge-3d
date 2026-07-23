package com.printforge.admin.settingsservice.service;

import com.printforge.admin.settingsservice.dto.UpdateContactInfoRequest;
import com.printforge.admin.settingsservice.exception.FeatureToggleNotFoundException;
import com.printforge.admin.settingsservice.model.FeatureToggle;
import com.printforge.admin.settingsservice.model.LabContactInfo;
import com.printforge.admin.settingsservice.repository.FeatureToggleRepository;
import com.printforge.admin.settingsservice.repository.LabContactInfoRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;

import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Pure unit test, no Spring context or DB. Ported from the monolith's
 * SettingsServiceTest.
 *
 * Run with: ./mvnw -pl admin-service test -Dtest=SettingsServiceTest
 */
class SettingsServiceTest {

    LabContactInfoRepository labContactInfoRepository;
    FeatureToggleRepository featureToggleRepository;
    SettingsService service;

    @BeforeEach
    void setUp() {
        labContactInfoRepository = Mockito.mock(LabContactInfoRepository.class);
        featureToggleRepository = Mockito.mock(FeatureToggleRepository.class);
        service = new SettingsService(labContactInfoRepository, featureToggleRepository);
    }

    // --- contact info ---

    private LabContactInfo existingContactInfo() {
        LabContactInfo info = new LabContactInfo();
        info.setId(1L);
        info.setLabName("KNUST 3D Printing Lab");
        info.setEmail("old@printforge.example");
        info.setPhone("+233000000000");
        return info;
    }

    @Test
    void getContactInfoReturnsTheSeededRow() {
        Mockito.when(labContactInfoRepository.findById(1L)).thenReturn(Optional.of(existingContactInfo()));

        LabContactInfo result = service.getContactInfo();

        assertEquals("KNUST 3D Printing Lab", result.getLabName());
    }

    @Test
    void getContactInfoThrowsIfTheRowIsSomehowMissing() {
        Mockito.when(labContactInfoRepository.findById(1L)).thenReturn(Optional.empty());

        assertThrows(IllegalStateException.class, () -> service.getContactInfo());
    }

    @Test
    void updateContactInfoOnlyChangesProvidedFields() {
        Mockito.when(labContactInfoRepository.findById(1L)).thenReturn(Optional.of(existingContactInfo()));
        Mockito.when(labContactInfoRepository.save(Mockito.any(LabContactInfo.class)))
                .thenAnswer(inv -> inv.getArgument(0));

        UpdateContactInfoRequest request = new UpdateContactInfoRequest();
        request.setEmail("new@printforge.example");
        // labName/phone left null — should stay unchanged

        LabContactInfo updated = service.updateContactInfo(request);

        assertEquals("new@printforge.example", updated.getEmail());
        assertEquals("KNUST 3D Printing Lab", updated.getLabName());
        assertEquals("+233000000000", updated.getPhone());
    }

    // --- feature toggles ---

    private FeatureToggle toggle(String name, boolean enabled) {
        FeatureToggle t = new FeatureToggle();
        t.setId(1L);
        t.setFeatureName(name);
        t.setEnabled(enabled);
        return t;
    }

    @Test
    void getFeatureTogglesReturnsAllRows() {
        Mockito.when(featureToggleRepository.findAll()).thenReturn(List.of(
                toggle("marketplace", true), toggle("guestSubmit", false)));

        List<FeatureToggle> toggles = service.getFeatureToggles();

        assertEquals(2, toggles.size());
    }

    @Test
    void updateFeatureToggleFlipsAnExistingKey() {
        FeatureToggle existing = toggle("marketplace", true);
        Mockito.when(featureToggleRepository.findByFeatureName("marketplace")).thenReturn(Optional.of(existing));
        Mockito.when(featureToggleRepository.save(Mockito.any(FeatureToggle.class)))
                .thenAnswer(inv -> inv.getArgument(0));

        FeatureToggle updated = service.updateFeatureToggle("marketplace", false);

        assertFalse(updated.isEnabled());
    }

    @Test
    void updateFeatureToggleRejectsAnUnknownKey() {
        Mockito.when(featureToggleRepository.findByFeatureName("not-a-real-key")).thenReturn(Optional.empty());

        assertThrows(FeatureToggleNotFoundException.class,
                () -> service.updateFeatureToggle("not-a-real-key", true));
    }

    @Test
    void isFeatureEnabledReflectsTheStoredValue() {
        Mockito.when(featureToggleRepository.findByFeatureName("guestSubmit"))
                .thenReturn(Optional.of(toggle("guestSubmit", false)));

        assertFalse(service.isFeatureEnabled("guestSubmit"));
    }

    @Test
    void isFeatureEnabledFailsOpenForAnUnknownKey() {
        // A missing/typo'd key should never silently disable a feature —
        // only an explicit enabled=false row does that.
        Mockito.when(featureToggleRepository.findByFeatureName("not-a-real-key")).thenReturn(Optional.empty());

        assertTrue(service.isFeatureEnabled("not-a-real-key"));
    }
}

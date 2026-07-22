package com.printforge.notification.notificationservice.service;

import com.printforge.notification.notificationservice.exception.NotificationNotFoundException;
import com.printforge.notification.notificationservice.model.Notification;
import com.printforge.notification.notificationservice.repository.NotificationRepository;
import com.printforge.notification.settingsservice.model.FeatureToggle;
import com.printforge.notification.settingsservice.repository.FeatureToggleRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;
import org.springframework.security.access.AccessDeniedException;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Pure unit test, no Spring context or DB — proves the ownership check in
 * markAsRead() actually does its job, and that createNotification() honors
 * the "notifications" feature toggle. Ported from the monolith's
 * NotificationServiceTest, adapted for this service's duplicated
 * FeatureToggleRepository read (no SettingsService here — that's
 * admin-service's, and there's no REST call between services for it).
 *
 * Run with: ./mvnw -pl notification-service test -Dtest=NotificationServiceTest
 */
class NotificationServiceTest {

    NotificationRepository repository;
    FeatureToggleRepository featureToggleRepository;
    NotificationService service;

    @BeforeEach
    void setUp() {
        repository = Mockito.mock(NotificationRepository.class);
        featureToggleRepository = Mockito.mock(FeatureToggleRepository.class);
        // Fail-open default: no row for a key means enabled, matching
        // admin-service's SettingsService.isFeatureEnabled() semantics.
        Mockito.lenient().when(featureToggleRepository.findByFeatureName(Mockito.anyString()))
                .thenReturn(Optional.empty());
        service = new NotificationService(repository, featureToggleRepository);
    }

    private Notification notificationOwnedBy(Long ownerId) {
        Notification n = new Notification();
        n.setId(42L);
        n.setUserId(ownerId);
        n.setRead(false);
        return n;
    }

    private FeatureToggle toggle(String name, boolean enabled) {
        FeatureToggle toggle = new FeatureToggle();
        toggle.setFeatureName(name);
        toggle.setEnabled(enabled);
        return toggle;
    }

    @Test
    void ownerCanMarkTheirOwnNotificationAsRead() {
        Notification notification = notificationOwnedBy(7L);
        Mockito.when(repository.findById(42L)).thenReturn(Optional.of(notification));
        Mockito.when(repository.save(Mockito.any())).thenAnswer(inv -> inv.getArgument(0));

        Notification result = service.markAsRead(42L, 7L, false);

        assertTrue(result.isRead());
    }

    @Test
    void nonOwnerCannotMarkSomeoneElsesNotificationAsRead() {
        Notification notification = notificationOwnedBy(7L);
        Mockito.when(repository.findById(42L)).thenReturn(Optional.of(notification));

        assertThrows(AccessDeniedException.class, () -> service.markAsRead(42L, 8L, false));
    }

    @Test
    void staffCanMarkAnyUsersNotificationAsRead() {
        Notification notification = notificationOwnedBy(7L);
        Mockito.when(repository.findById(42L)).thenReturn(Optional.of(notification));
        Mockito.when(repository.save(Mockito.any())).thenAnswer(inv -> inv.getArgument(0));

        Notification result = service.markAsRead(42L, 999L, true);

        assertTrue(result.isRead());
    }

    @Test
    void unknownNotificationIdThrowsNotFound() {
        Mockito.when(repository.findById(999L)).thenReturn(Optional.empty());

        assertThrows(NotificationNotFoundException.class, () -> service.markAsRead(999L, 1L, false));
    }

    // --- notifications feature toggle ---

    @Test
    void createNotificationPersistsWhenTheToggleIsEnabled() {
        Mockito.when(featureToggleRepository.findByFeatureName("notifications"))
                .thenReturn(Optional.of(toggle("notifications", true)));
        Mockito.when(repository.save(Mockito.any(Notification.class))).thenAnswer(inv -> inv.getArgument(0));

        Notification result = service.createNotification(7L, "Title", "Message", "info");

        assertNotNull(result);
        assertEquals("Title", result.getTitle());
        Mockito.verify(repository).save(Mockito.any(Notification.class));
    }

    @Test
    void createNotificationIsANoOpWhenTheToggleIsDisabled() {
        Mockito.when(featureToggleRepository.findByFeatureName("notifications"))
                .thenReturn(Optional.of(toggle("notifications", false)));

        Notification result = service.createNotification(7L, "Title", "Message", "info");

        assertNull(result);
        Mockito.verifyNoInteractions(repository);
    }

    @Test
    void createNotificationPersistsWhenNoToggleRowExistsYet() {
        // Fail-open: a missing row (e.g. before FeatureToggleSeeder has
        // run in admin-service) must never silently disable notifications.
        Mockito.when(repository.save(Mockito.any(Notification.class))).thenAnswer(inv -> inv.getArgument(0));

        Notification result = service.createNotification(7L, "Title", "Message", "info");

        assertNotNull(result);
    }
}

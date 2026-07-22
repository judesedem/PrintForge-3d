package com.printforge.printforge.notificationservice.service;

import com.printforge.printforge.notificationservice.exception.NotificationNotFoundException;
import com.printforge.printforge.notificationservice.model.Notification;
import com.printforge.printforge.notificationservice.repository.NotificationRepository;
import com.printforge.printforge.settingsservice.service.SettingsService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;
import org.springframework.security.access.AccessDeniedException;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Pure unit test, no Spring context or DB — proves the ownership check in
 * markAsRead() actually does its job. Before this fix, any authenticated
 * user could mark any other user's notification as read (IDOR); this test
 * fails on the old code and passes on the fixed code.
 *
 * Run with: ./mvnw test -Dtest=NotificationServiceTest
 */
class NotificationServiceTest {

    NotificationRepository repository;
    SettingsService settingsService;
    NotificationService service;

    @BeforeEach
    void setUp() {
        repository = Mockito.mock(NotificationRepository.class);
        settingsService = Mockito.mock(SettingsService.class);
        // Not exercised by any test in this file (none call createNotification),
        // but stubbed defensively so the "notifications" toggle's fail-open
        // default doesn't silently start mattering here later.
        Mockito.lenient().when(settingsService.isFeatureEnabled(Mockito.anyString())).thenReturn(true);
        service = new NotificationService(repository, settingsService);
    }

    private Notification notificationOwnedBy(Long ownerId) {
        Notification n = new Notification();
        n.setId(42L);
        n.setUserId(ownerId);
        n.setRead(false);
        return n;
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

        // requesterId 8L is NOT the owner (7L), and is not staff
        assertThrows(AccessDeniedException.class, () -> service.markAsRead(42L, 8L, false));
    }

    @Test
    void staffCanMarkAnyUsersNotificationAsRead() {
        Notification notification = notificationOwnedBy(7L);
        Mockito.when(repository.findById(42L)).thenReturn(Optional.of(notification));
        Mockito.when(repository.save(Mockito.any())).thenAnswer(inv -> inv.getArgument(0));

        // requesterId 999L is not the owner, but requesterIsStaff=true should override
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
        Mockito.when(settingsService.isFeatureEnabled("notifications")).thenReturn(true);
        Mockito.when(repository.save(Mockito.any(Notification.class))).thenAnswer(inv -> inv.getArgument(0));

        Notification result = service.createNotification(7L, "Title", "Message", "info");

        assertNotNull(result);
        assertEquals("Title", result.getTitle());
        Mockito.verify(repository).save(Mockito.any(Notification.class));
    }

    @Test
    void createNotificationIsANoOpWhenTheToggleIsDisabled() {
        Mockito.when(settingsService.isFeatureEnabled("notifications")).thenReturn(false);

        Notification result = service.createNotification(7L, "Title", "Message", "info");

        assertNull(result);
        Mockito.verifyNoInteractions(repository);
    }
}

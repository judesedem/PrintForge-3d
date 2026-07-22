package com.printforge.notification.notificationservice.controller;

import com.printforge.notification.entity.User;
import com.printforge.notification.notificationservice.exception.InvalidNotificationInputException;
import com.printforge.notification.notificationservice.model.Notification;
import com.printforge.notification.notificationservice.service.NotificationService;
import com.printforge.notification.repository.UserRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/notifications")
public class NotificationController {

    private final NotificationService notificationService;
    private final UserRepository userRepository;

    public NotificationController(NotificationService notificationService,
                                   UserRepository userRepository) {
        this.notificationService = notificationService;
        this.userRepository = userRepository;
    }

    // ── Internal/Staff endpoint — create notification ─────────────────────────
    // #71 — this is the only client-facing entry point for
    // Notification.message (every other createNotification() caller is
    // internal, server-constructed text), so it's the one place that
    // rejects an oversized message outright rather than falling back to
    // NotificationService's defensive truncation.
    @PreAuthorize("hasAnyRole('LAB_STAFF', 'ADMIN')")
    @PostMapping
    public ResponseEntity<Notification> createNotification(
            @RequestParam Long userId,
            @RequestParam String title,
            @RequestParam String message,
            @RequestParam String type) {
        if (message == null || message.isBlank()) {
            throw new InvalidNotificationInputException("message must not be blank");
        }
        if (message.length() > 500) {
            throw new InvalidNotificationInputException("message must be 500 characters or fewer");
        }
        return ResponseEntity.ok(notificationService.createNotification(userId, title, message, type));
    }

    // ── GET /api/notifications ────────────────────────────────────────────────
    // Frontend calls this without a userId in the path — resolves the
    // caller's identity from the JWT instead.
    @GetMapping
    public ResponseEntity<List<Notification>> getMyNotifications(Authentication authentication) {
        User caller = currentUser(authentication);
        return ResponseEntity.ok(notificationService.getAllUserNotifications(caller.getUserId()));
    }

    // ── GET /api/notifications/user/{userId} ──────────────────────────────────
    // Kept for backward compatibility with existing controller tests.
    @GetMapping("/user/{userId}")
    public ResponseEntity<List<Notification>> getAllUserNotifications(
            @PathVariable Long userId, Authentication authentication) {
        requireSelfOrStaff(userId, authentication);
        return ResponseEntity.ok(notificationService.getAllUserNotifications(userId));
    }

    // ── GET /api/notifications/user/{userId}/unread/count ─────────────────────
    @GetMapping("/user/{userId}/unread/count")
    public ResponseEntity<Map<String, Long>> getUnreadCount(
            @PathVariable Long userId, Authentication authentication) {
        requireSelfOrStaff(userId, authentication);
        return ResponseEntity.ok(Map.of("unreadCount", notificationService.getUnreadCount(userId)));
    }

    // ── PATCH /api/notifications/:id/read ────────────────────────────────────
    @PatchMapping("/{notificationId}/read")
    public ResponseEntity<Notification> markAsRead(
            @PathVariable Long notificationId, Authentication authentication) {
        User caller = currentUser(authentication);
        boolean isStaff = isStaff(authentication);
        return ResponseEntity.ok(notificationService.markAsRead(notificationId, caller.getUserId(), isStaff));
    }

    // ── PATCH /api/notifications/read-all ────────────────────────────────────
    // Frontend calls this without a userId in the path.
    @PatchMapping("/read-all")
    public ResponseEntity<Map<String, String>> markAllAsRead(Authentication authentication) {
        User caller = currentUser(authentication);
        notificationService.markAllAsRead(caller.getUserId());
        return ResponseEntity.ok(Map.of("status", "All notifications marked as read"));
    }

    // ── PATCH /api/notifications/user/{userId}/read-all ───────────────────────
    // Kept for backward compatibility.
    @PatchMapping("/user/{userId}/read-all")
    public ResponseEntity<Map<String, String>> markAllAsReadForUser(
            @PathVariable Long userId, Authentication authentication) {
        requireSelfOrStaff(userId, authentication);
        notificationService.markAllAsRead(userId);
        return ResponseEntity.ok(Map.of("status", "All notifications marked as read"));
    }

    // ── POST /api/notifications/push-token ───────────────────────────────────
    // Accepts the Expo push token from the mobile app. Currently just
    // acknowledges receipt — storing and using push tokens for real FCM/APNs
    // delivery is a post-CodeFest enhancement.
    @PostMapping("/push-token")
    public ResponseEntity<Map<String, String>> registerPushToken(
            @RequestBody Map<String, String> body,
            Authentication authentication) {
        // Token received — would store against the user for push delivery here
        return ResponseEntity.ok(Map.of("status", "Push token registered"));
    }

    // ── Authorization helpers ─────────────────────────────────────────────────

    private void requireSelfOrStaff(Long targetUserId, Authentication authentication) {
        if (isStaff(authentication)) return;
        User caller = currentUser(authentication);
        if (!caller.getUserId().equals(targetUserId)) {
            throw new AccessDeniedException("You can only access your own notifications");
        }
    }

    private boolean isStaff(Authentication authentication) {
        return authentication.getAuthorities().stream()
                .map(GrantedAuthority::getAuthority)
                .anyMatch(r -> r.equals("ROLE_LAB_STAFF") || r.equals("ROLE_ADMIN"));
    }

    private User currentUser(Authentication authentication) {
        return userRepository.findByEmail(authentication.getName())
                .orElseThrow(() -> new UsernameNotFoundException("User not found"));
    }
}

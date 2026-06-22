package com.printforge.printforge.notificationservice.controller;

import com.printforge.printforge.entity.User;
import com.printforge.printforge.notificationservice.model.Notification;
import com.printforge.printforge.notificationservice.service.NotificationService;
import com.printforge.printforge.repository.UserRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

/**
 * Previously every endpoint here trusted whatever {userId} the client put
 * in the URL, with no check that the caller actually was that user. Any
 * logged-in student could read, or mark as read, any other user's
 * notifications just by changing the number in the path (IDOR). This
 * version resolves the caller's real identity from the JWT and checks it
 * against the resource being accessed before doing anything.
 */
@RestController
@RequestMapping("/api/notifications")
public class NotificationController {

    private final NotificationService notificationService;
    private final UserRepository userRepository;

    public NotificationController(NotificationService notificationService, UserRepository userRepository) {
        this.notificationService = notificationService;
        this.userRepository = userRepository;
    }

    // --- Internal/Admin Endpoint (For generating alerts) ---
    // Was open to any authenticated user despite the "Admin" label in the
    // comment. Restricted to staff roles — once Queue/Estimate services
    // actually call this internally on status changes, they'll need to do
    // so as a LAB_STAFF/ADMIN-authenticated call (or, better, a direct Java
    // method call within the same app, which bypasses HTTP/security
    // entirely — worth revisiting once that integration happens).
    @PreAuthorize("hasAnyRole('LAB_STAFF', 'ADMIN')")
    @PostMapping
    public ResponseEntity<Notification> createNotification(
            @RequestParam Long userId,
            @RequestParam String title,
            @RequestParam String message,
            @RequestParam String type) {
        return ResponseEntity.ok(notificationService.createNotification(userId, title, message, type));
    }

    // --- Frontend User Endpoints ---

    // 1. Get ALL notifications
    @GetMapping("/user/{userId}")
    public ResponseEntity<List<Notification>> getAllUserNotifications(
            @PathVariable Long userId, Authentication authentication) {
        requireSelfOrStaff(userId, authentication);
        return ResponseEntity.ok(notificationService.getAllUserNotifications(userId));
    }

    // 2. Get the unread COUNT (Returns JSON like: { "unreadCount": 3 })
    @GetMapping("/user/{userId}/unread/count")
    public ResponseEntity<Map<String, Long>> getUnreadCount(
            @PathVariable Long userId, Authentication authentication) {
        requireSelfOrStaff(userId, authentication);
        long count = notificationService.getUnreadCount(userId);
        return ResponseEntity.ok(Map.of("unreadCount", count));
    }

    // 3. Mark ONE as read
    @PatchMapping("/{notificationId}/read")
    public ResponseEntity<Notification> markAsRead(
            @PathVariable Long notificationId, Authentication authentication) {
        User caller = currentUser(authentication);
        boolean isStaff = isStaff(authentication);
        Notification updated = notificationService.markAsRead(notificationId, caller.getUserId(), isStaff);
        return ResponseEntity.ok(updated);
    }

    // 4. Mark ALL as read
    @PatchMapping("/user/{userId}/read-all")
    public ResponseEntity<Map<String, String>> markAllAsRead(
            @PathVariable Long userId, Authentication authentication) {
        requireSelfOrStaff(userId, authentication);
        notificationService.markAllAsRead(userId);
        return ResponseEntity.ok(Map.of("status", "All notifications marked as read"));
    }

    // --- Authorization helpers ---

    /** Throws AccessDeniedException (-> 403, already handled by GlobalExceptionHandler) unless the caller owns this userId or is staff. */
    private void requireSelfOrStaff(Long targetUserId, Authentication authentication) {
        if (isStaff(authentication)) {
            return;
        }
        User caller = currentUser(authentication);
        if (!caller.getUserId().equals(targetUserId)) {
            throw new AccessDeniedException("You can only access your own notifications");
        }
    }

    private boolean isStaff(Authentication authentication) {
        return authentication.getAuthorities().stream()
                .map(GrantedAuthority::getAuthority)
                .anyMatch(role -> role.equals("ROLE_LAB_STAFF") || role.equals("ROLE_ADMIN"));
    }

    private User currentUser(Authentication authentication) {
        return userRepository.findByEmail(authentication.getName())
                .orElseThrow(() -> new UsernameNotFoundException("User not found"));
    }
}

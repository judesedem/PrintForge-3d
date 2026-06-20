package com.printforge.printforge.notificationservice.controller;

import com.printforge.printforge.notificationservice.model.Notification;
import com.printforge.printforge.notificationservice.service.NotificationService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/notifications")
public class NotificationController {

    private final NotificationService notificationService;

    public NotificationController(NotificationService notificationService) {
        this.notificationService = notificationService;
    }

    // --- Internal/Admin Endpoint (For generating alerts) ---
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
    public ResponseEntity<List<Notification>> getAllUserNotifications(@PathVariable Long userId) {
        return ResponseEntity.ok(notificationService.getAllUserNotifications(userId));
    }

    // 2. Get the unread COUNT (Returns JSON like: { "unreadCount": 3 })
    @GetMapping("/user/{userId}/unread/count")
    public ResponseEntity<Map<String, Long>> getUnreadCount(@PathVariable Long userId) {
        long count = notificationService.getUnreadCount(userId);
        return ResponseEntity.ok(Map.of("unreadCount", count));
    }

    // 3. Mark ONE as read
    @PatchMapping("/{notificationId}/read")
    public ResponseEntity<Notification> markAsRead(@PathVariable Long notificationId) {
        return ResponseEntity.ok(notificationService.markAsRead(notificationId));
    }

    // 4. Mark ALL as read
    @PatchMapping("/user/{userId}/read-all")
    public ResponseEntity<Map<String, String>> markAllAsRead(@PathVariable Long userId) {
        notificationService.markAllAsRead(userId);
        return ResponseEntity.ok(Map.of("status", "All notifications marked as read"));
    }
}
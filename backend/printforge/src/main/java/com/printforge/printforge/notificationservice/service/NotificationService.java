package com.printforge.printforge.notificationservice.service;

import com.printforge.printforge.notificationservice.exception.NotificationNotFoundException;
import com.printforge.printforge.notificationservice.model.Notification;
import com.printforge.printforge.notificationservice.repository.NotificationRepository;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class NotificationService {

    private final NotificationRepository notificationRepository;

    public NotificationService(NotificationRepository notificationRepository) {
        this.notificationRepository = notificationRepository;
    }

    // 1. Create a new notification (Triggered by the Queue Service later)
    public Notification createNotification(Long userId, String title, String message, String type) {
        Notification notification = new Notification();
        notification.setUserId(userId);
        notification.setTitle(title);
        notification.setMessage(message);
        notification.setType(type);
        return notificationRepository.save(notification);
    }

    // 2. Fetch unread notifications
    public List<Notification> getUnreadNotifications(Long userId) {
        return notificationRepository.findByUserIdAndIsReadFalseOrderByCreatedAtDesc(userId);
    }

    // 3. Fetch all notifications
    public List<Notification> getAllUserNotifications(Long userId) {
        return notificationRepository.findByUserIdOrderByCreatedAtDesc(userId);
    }

    // 4. Get the unread count for the UI badge
    public long getUnreadCount(Long userId) {
        return notificationRepository.countByUserIdAndIsReadFalse(userId);
    }

    /**
     * Mark a single notification as read.
     *
     * requesterId/requesterIsStaff come from the controller, which resolves
     * them from the JWT. Previously this method took only notificationId and
     * had no concept of "who's asking" — any authenticated user could mark
     * any other user's notification as read just by guessing/incrementing an
     * id. Now it checks the notification's actual owner (notification.userId)
     * against the caller, and lets the request through if they match or the
     * caller is LAB_STAFF/ADMIN.
     */
    public Notification markAsRead(Long notificationId, Long requesterId, boolean requesterIsStaff) {
        Notification notification = notificationRepository.findById(notificationId)
                .orElseThrow(() -> new NotificationNotFoundException(notificationId));

        if (!requesterIsStaff && !notification.getUserId().equals(requesterId)) {
            throw new AccessDeniedException("You can only mark your own notifications as read");
        }

        notification.setRead(true);
        return notificationRepository.save(notification);
    }

    // 6. Mark all as read (Bonus feature)
    public void markAllAsRead(Long userId) {
        List<Notification> unread = getUnreadNotifications(userId);
        unread.forEach(n -> n.setRead(true));
        notificationRepository.saveAll(unread);
    }
}

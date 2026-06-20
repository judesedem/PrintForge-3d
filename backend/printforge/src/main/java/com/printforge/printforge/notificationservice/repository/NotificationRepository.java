package com.printforge.printforge.notificationservice.repository;

import com.printforge.printforge.notificationservice.model.Notification;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface NotificationRepository extends JpaRepository<Notification, Long> {

    // Fetch all notifications for a specific user, newest first
    List<Notification> findByUserIdOrderByCreatedAtDesc(Long userId);

    // Fetch only unread notifications for a specific user
    List<Notification> findByUserIdAndIsReadFalseOrderByCreatedAtDesc(Long userId);

    // Count unread notifications (perfect for the UI notification badge!)
    long countByUserIdAndIsReadFalse(Long userId);
}
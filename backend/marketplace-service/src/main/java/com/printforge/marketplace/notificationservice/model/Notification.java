package com.printforge.marketplace.notificationservice.model;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "notifications")
public class Notification {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // Who is receiving this notification?
    private Long userId;

    // The actual alert content
    private String title;   // e.g., "Print Started!"

    // #71 — length cap made explicit (widens Hibernate's implicit
    // VARCHAR(255) default). See NotificationService.createNotification()
    // for how this is enforced above the DB layer.
    @Column(length = 500)
    private String message; // e.g., "Your print job for 'Benchy' has begun on Prusa-01."
    private String type;    // e.g., "ORDER_UPDATE", "SYSTEM_ALERT", "PROMO"

    // Reserved for Expo push token routing once FCM is wired — currently
    // used by the in-app notification card only.
    private String deepLink;

    // Has the user seen it yet?
    private boolean isRead;

    // When was it sent?
    private LocalDateTime createdAt;

    // --- Lifecycle Callbacks ---
    @PrePersist
    protected void onCreate() {
        this.createdAt = LocalDateTime.now();
        this.isRead = false; // All notifications start as unread
    }

    // --- Getters and Setters ---
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public Long getUserId() { return userId; }
    public void setUserId(Long userId) { this.userId = userId; }

    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }

    public String getMessage() { return message; }
    public void setMessage(String message) { this.message = message; }

    public String getType() { return type; }
    public void setType(String type) { this.type = type; }

    public String getDeepLink() { return deepLink; }
    public void setDeepLink(String deepLink) { this.deepLink = deepLink; }

    public boolean isRead() { return isRead; }
    public void setRead(boolean read) { isRead = read; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
}
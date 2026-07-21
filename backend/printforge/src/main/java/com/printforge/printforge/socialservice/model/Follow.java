package com.printforge.printforge.socialservice.model;

import jakarta.persistence.*;
import java.time.LocalDateTime;

/** A user opting to follow a designer — same shape of problem as Favorite (marketplaceservice), modeled the same way. */
@Entity
@Table(name = "follows", uniqueConstraints = @UniqueConstraint(columnNames = {"follower_id", "following_id"}))
public class Follow {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // FK -> users.user_id — the user doing the following
    @Column(name = "follower_id", nullable = false)
    private Long followerId;

    // FK -> users.user_id — the designer being followed
    @Column(name = "following_id", nullable = false)
    private Long followingId;

    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        this.createdAt = LocalDateTime.now();
    }

    // --- Getters and Setters ---
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public Long getFollowerId() { return followerId; }
    public void setFollowerId(Long followerId) { this.followerId = followerId; }

    public Long getFollowingId() { return followingId; }
    public void setFollowingId(Long followingId) { this.followingId = followingId; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
}

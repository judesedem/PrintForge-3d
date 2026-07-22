package com.printforge.admin.moderationservice.model;

import jakarta.persistence.*;
import java.time.LocalDateTime;

/**
 * Append-only audit trail for the moderation actions listed in
 * ModerationActionType — a narrowly-scoped slice of audit finding #66
 * ("no audit trail on sensitive actions"), not the full #66 workstream.
 *
 * Rows are never updated or deleted after being written; each one is a
 * point-in-time record of who did what to what. actorRole is captured at
 * write time rather than derived later from the actor's current role,
 * since roles can change after the fact (e.g. a STUDENT who upgrades to
 * DESIGNER shouldn't retroactively rewrite old log entries).
 */
@Entity
@Table(name = "moderation_log_entries")
public class ModerationLogEntry {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "actor_id", nullable = false)
    private Long actorId;

    @Column(name = "actor_role", nullable = false)
    private String actorRole;

    @Enumerated(EnumType.STRING)
    @Column(name = "action_type", nullable = false)
    private ModerationActionType actionType;

    @Enumerated(EnumType.STRING)
    @Column(name = "target_type", nullable = false)
    private ModerationTargetType targetType;

    @Column(name = "target_id", nullable = false)
    private Long targetId;

    @Column(length = 1000)
    private String metadata;

    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        this.createdAt = LocalDateTime.now();
    }

    // --- Getters and Setters ---
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public Long getActorId() { return actorId; }
    public void setActorId(Long actorId) { this.actorId = actorId; }

    public String getActorRole() { return actorRole; }
    public void setActorRole(String actorRole) { this.actorRole = actorRole; }

    public ModerationActionType getActionType() { return actionType; }
    public void setActionType(ModerationActionType actionType) { this.actionType = actionType; }

    public ModerationTargetType getTargetType() { return targetType; }
    public void setTargetType(ModerationTargetType targetType) { this.targetType = targetType; }

    public Long getTargetId() { return targetId; }
    public void setTargetId(Long targetId) { this.targetId = targetId; }

    public String getMetadata() { return metadata; }
    public void setMetadata(String metadata) { this.metadata = metadata; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
}

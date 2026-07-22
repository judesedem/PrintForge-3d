package com.printforge.auth.entity;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "users")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class User {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "user_id")
    private Long userId;

    @Column(name = "full_name", nullable = false)
    private String fullName;

    @Column(name = "email", nullable = false, unique = true)
    private String email;

    @Column(name = "password", nullable = false)
    private String password;

    @Enumerated(EnumType.STRING)
    @Column(name = "role", nullable = false)
    private Role role;

    // Cloudinary URL of the user's avatar/profile picture, set via
    // POST /api/users/profile-picture. Nullable — most users won't have
    // one, and existing rows predate this column.
    @Column(name = "profile_picture_url")
    private String profilePictureUrl;

    // Cloudinary public_id for the current profile picture asset — needed
    // to destroy() the old asset when a new one is uploaded, so orphaned
    // images don't pile up in the Cloudinary account.
    @Column(name = "profile_picture_public_id")
    private String profilePicturePublicId;

    // User's phone number — optional, used for pickup notifications.
    // Nullable: most users won't set this.
    @Column(name = "phone")
    private String phone;

    // Short bio displayed on the user's public profile.
    // Max 200 chars enforced at the service layer, not here.
    @Column(name = "bio", columnDefinition = "TEXT")
    private String bio;

    // Admin moderation takedown (#68). Nullable/boxed rather than a
    // not-null primitive — same reasoning as Estimate.java's fileId/userId
    // comment: ddl-auto=update won't retroactively backfill a NOT NULL
    // column on a table (users) that already has rows. null is treated as
    // "not suspended" everywhere this is read (Boolean.TRUE.equals checks),
    // so the missing default on old rows is harmless.
    @Column(name = "suspended")
    private Boolean suspended;

    // Whether this user has confirmed their email address via a
    // verification link. Not-null with a DB-level default so existing
    // rows backfill to false via ddl-auto=update instead of failing the
    // ALTER TABLE — same safe pattern as DesignListing.ownershipAttested
    // (a real NOT NULL column with a DEFAULT, rather than the
    // nullable-Boolean workaround used for fields with no natural
    // default, like `suspended` above).
    @Column(name = "email_verified", columnDefinition = "boolean not null default false")
    private boolean emailVerified;

    // Whether this user has opted in to receiving email. Defaults true —
    // this app currently sends transactional email only (password reset,
    // etc.), not marketing, so opting in by default doesn't yet mean
    // anything beyond "you'll get password-reset/notification email if
    // we build that." Exists now so a future marketing-email feature has
    // a real opt-in signal to check instead of retrofitting one.
    @Column(name = "email_opt_in", columnDefinition = "boolean not null default true")
    private boolean emailOptIn;
}
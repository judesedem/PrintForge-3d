package com.printforge.printforge.entity;

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
}
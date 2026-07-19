package com.printforge.printforge.fileservice.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.time.LocalDateTime;

@Entity
@Table(name = "model_files")
@Data
@NoArgsConstructor
@AllArgsConstructor

public class ModelFile {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long fileId;

    @Column(nullable = false)
    private String fileName;

    // Set after the entity is first saved (it embeds the generated fileId),
    // so it can't be NOT NULL at insert time the way it was before.
    @Column(name = "file_url")
    private String fileUrl;

    @Column(nullable = false)
    private String fileType;

    // The actual on-disk filename used by FileStorageService — distinct from
    // fileName (the original name the user uploaded) to avoid collisions.
    @Column(name = "stored_filename", nullable = false)
    private String storedFilename;

    @Column(name = "file_size_bytes", nullable = false)
    private Long fileSizeBytes;

    @Column(name = "uploaded_at", updatable = false)
    private LocalDateTime uploadedAt;

    // Who uploaded this file, tracked by userId like every other entity in
    // the app (PrintJob, Estimate, Notification all use userId). This used
    // to be the uploader's email instead — the only place in the codebase
    // that tracked ownership that way — which made ownership checks here
    // inconsistent with everywhere else. Nullable for the same reason as
    // fileUrl above: don't assume a fresh DB.
    @Column(name = "user_id")
    private Long userId;

    // Cloudinary's public_id for the uploaded asset — only populated for
    // images uploaded via POST /api/files/upload/image (saveImageMetadata).
    // Nullable: general model-file uploads via the older store()/saveFileMetadata
    // path don't capture this.
    @Column(name = "public_id")
    private String publicId;

    @PrePersist
    protected void onCreate() {
        this.uploadedAt = LocalDateTime.now();
    }
}

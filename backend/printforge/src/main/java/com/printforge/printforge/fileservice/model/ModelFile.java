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

    @Column(name = "uploaded_by")
    private String uploadedBy;

    @PrePersist
    protected void onCreate() {
        this.uploadedAt = LocalDateTime.now();
    }
}

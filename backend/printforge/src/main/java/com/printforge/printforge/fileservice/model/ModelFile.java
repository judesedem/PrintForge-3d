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

    @Column(nullable = false)
    private String fileUrl;

    @Column(nullable = false)
    private String fileType;

    @Column(name = "uploaded_at", updatable = false)
    private LocalDateTime uploadedAt;

    // NEW: Added to track which user uploaded the 3D model (links to JWT Auth)
    @Column(name = "uploaded_by")
    private String uploadedBy;

    // NOTE TO TEAM: If we aren't using Lombok @Data, here are the manual getters/setters
    public String getUploadedBy() {
        return uploadedBy;
    }

    public void setUploadedBy(String uploadedBy) {
        this.uploadedBy = uploadedBy;
    }

    @PrePersist
    protected void onCreate() {
        this.uploadedAt = LocalDateTime.now();
    }
}
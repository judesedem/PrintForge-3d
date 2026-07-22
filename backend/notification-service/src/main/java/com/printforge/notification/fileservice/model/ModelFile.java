package com.printforge.notification.fileservice.model;

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

    // Cloudinary's resource_type for the uploaded asset ("image" or "raw",
    // typically) — needed to correctly destroy() it later
    // (DELETE /api/files/{id}, see FileStorageService.deleteAsset()).
    // Cloudinary's destroy call defaults to "image" and silently no-ops
    // (returns "not found", doesn't delete) against any other actual type
    // if this isn't passed explicitly. Captured at upload time alongside
    // publicId. Nullable: rows saved before this field existed have no
    // value, and deleteAsset() falls back to "image" in that case.
    @Column(name = "cloudinary_resource_type")
    private String cloudinaryResourceType;

    // Real geometry parsed from the file at upload time — stl/obj/3mf/amf/
    // ply uploads only (see FileStorageService.store() and the parsers in
    // fileservice/geometry/). Nullable/false for step/stp (permanently
    // unsupported — parametric CAD, not a triangle mesh), gcode (uses the
    // preSliced* fields below instead), and any file that failed to parse
    // — those fall back to EstimateService's file-size heuristic instead.
    @Column(name = "volume_cm3")
    private Double volumeCm3;

    @Column(name = "surface_area_cm2")
    private Double surfaceAreaCm2;

    @Column(name = "geometry_parsed")
    private Boolean geometryParsed = false;

    // Already-sliced weight/duration extracted directly from slicer
    // comment lines in a gcode upload (GCodeWeightParser) — a gcode file
    // has no mesh left to measure, so this is a separate signal from
    // volumeCm3/surfaceAreaCm2 above, not a variant of it. Nullable/false
    // for every other extension and for a gcode file whose comments don't
    // match any known slicer pattern.
    @Column(name = "pre_sliced_weight_grams")
    private Double preSlicedWeightGrams;

    @Column(name = "pre_sliced_duration_minutes")
    private Double preSlicedDurationMinutes;

    @Column(name = "pre_sliced")
    private Boolean preSliced = false;

    @PrePersist
    protected void onCreate() {
        this.uploadedAt = LocalDateTime.now();
    }
}

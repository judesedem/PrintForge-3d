package com.printforge.printforge.fileservice.storage;


import com.cloudinary.Cloudinary;
import com.cloudinary.utils.ObjectUtils;
import com.printforge.printforge.fileservice.exception.CloudinaryUploadException;
import com.printforge.printforge.fileservice.exception.FileStorageException;
import com.printforge.printforge.fileservice.exception.InvalidFileException;
import org.springframework.core.io.Resource;
import org.springframework.core.io.UrlResource;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.net.MalformedURLException;
import java.util.List;
import java.util.Map;

@Service
public class FileStorageService {

    private static final List<String> ALLOWED_EXTENSIONS = List.of(
            "stl", "obj", "3mf", "step", "stp", "gcode", "amf", "ply",
            "pdf", "txt", "png", "jpg", "jpeg"
    );

    private static final long MAX_FILE_SIZE_BYTES = 100L * 1024 * 1024; // 100MB

    // Content-type allowlist for POST /api/files/upload/image — deliberately
    // stricter and separate from ALLOWED_EXTENSIONS above, which is for the
    // general model-file upload path (STL/OBJ/etc, matched by extension).
    private static final List<String> ALLOWED_IMAGE_CONTENT_TYPES = List.of(
            "image/jpeg", "image/png", "image/webp"
    );

    private final Cloudinary cloudinary;

    public FileStorageService(Cloudinary cloudinary) {
        this.cloudinary = cloudinary;
    }

    /** Result of an image-specific Cloudinary upload — url plus the public_id needed to manage/delete the asset later. */
    public record CloudinaryImageResult(String url, String publicId) {}

    /**
     * Uploads a profile picture / thumbnail image to Cloudinary under
     * printforge/images, separate from the general 3D-file folder used by
     * store(). Validates by Content-Type (image/jpeg, image/png, image/webp)
     * rather than by extension, since this path is images-only.
     */
    public CloudinaryImageResult storeImage(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new InvalidFileException("No file was attached to the request.");
        }
        if (file.getSize() > MAX_FILE_SIZE_BYTES) {
            throw new InvalidFileException("File exceeds the 100MB upload limit.");
        }

        String contentType = file.getContentType();
        if (contentType == null || !ALLOWED_IMAGE_CONTENT_TYPES.contains(contentType.toLowerCase())) {
            throw new InvalidFileException(
                    "Unsupported image type '" + contentType + "'. Allowed: " + ALLOWED_IMAGE_CONTENT_TYPES);
        }

        try {
            Map<?, ?> result = cloudinary.uploader().upload(
                    file.getBytes(),
                    ObjectUtils.asMap(
                            "resource_type", "image",
                            "folder",        "printforge/images"
                    )
            );
            return new CloudinaryImageResult(
                    (String) result.get("secure_url"),
                    (String) result.get("public_id")
            );
        } catch (Exception e) {
            throw new CloudinaryUploadException("Cloudinary image upload failed: " + e.getMessage(), e);
        }
    }

    /**
     * Best-effort cleanup of a previously-uploaded image (e.g. the old
     * profile picture before a new one replaces it). Swallows failures —
     * a delete failure shouldn't block the new upload that triggered it.
     */
    public void deleteImage(String publicId) {
        if (publicId == null || publicId.isBlank()) return;
        try {
            cloudinary.uploader().destroy(publicId, ObjectUtils.emptyMap());
        } catch (Exception e) {
            // best-effort — orphaned asset is an acceptable outcome, a
            // failed profile picture update is not.
        }
    }

    /**
     * Uploads the file to Cloudinary and returns the secure public URL.
     * This URL is what gets stored in model_files.file_url and
     * design_listings.thumbnail_url — it loads directly in the mobile app
     * without any backend download endpoint.
     */
    public String store(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new InvalidFileException("No file was attached to the request.");
        }
        if (file.getSize() > MAX_FILE_SIZE_BYTES) {
            throw new InvalidFileException("File exceeds the 100MB upload limit.");
        }

        String extension = extractExtension(
                file.getOriginalFilename() != null ? file.getOriginalFilename() : ""
        );

        if (extension.isEmpty() || !ALLOWED_EXTENSIONS.contains(extension.toLowerCase())) {
            throw new InvalidFileException(
                    "Unsupported file type '" + extension + "'. Allowed: " + ALLOWED_EXTENSIONS);
        }

        try {
            // resource_type "auto" handles both images and raw files (STL, OBJ etc.)
            Map<?, ?> result = cloudinary.uploader().upload(
                    file.getBytes(),
                    ObjectUtils.asMap(
                            "resource_type", "auto",
                            "folder",        "printforge"
                    )
            );
            return (String) result.get("secure_url");
        
      } catch (Exception e) {
    System.out.println("=== CLOUDINARY ERROR ===");
    System.out.println("Message: " + e.getMessage());
    System.out.println("Cause: " + e.getCause());
    e.printStackTrace();
    throw new CloudinaryUploadException("Cloudinary upload failed: " + e.getMessage(), e);
}
    }

    /**
     * For Cloudinary storage the URL is already public — just wrap it as a
     * Resource so the existing FileController download endpoint still compiles.
     * In practice the frontend should use the URL directly rather than going
     * through this endpoint for images/thumbnails.
     */
    public Resource load(String fileUrl) {
        try {
            return new UrlResource(fileUrl);
        } catch (MalformedURLException e) {
            throw new FileStorageException("Invalid Cloudinary URL: " + fileUrl, e);
        }
        
    }

    private String extractExtension(String filename) {
        int dot = filename.lastIndexOf('.');
        return (dot == -1 || dot == filename.length() - 1) ? "" : filename.substring(dot + 1);
    }
}

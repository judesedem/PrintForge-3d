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

    private final Cloudinary cloudinary;

    public FileStorageService(Cloudinary cloudinary) {
        this.cloudinary = cloudinary;
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

package com.printforge.printforge.fileservice.storage;

import com.printforge.printforge.fileservice.exception.FileStorageException;
import com.printforge.printforge.fileservice.exception.InvalidFileException;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.Resource;
import org.springframework.core.io.UrlResource;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.net.MalformedURLException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.util.List;
import java.util.UUID;

/**
 * Handles the actual bytes of an uploaded file: writing them to disk on
 * upload and reading them back for download.
 *
 * Previously, FileService only ever wrote rows into model_files with a
 * fileUrl string supplied by the client (@RequestParam String fileUrl) —
 * no file content was ever received or stored on the server, so nothing
 * was actually being "uploaded". This class is the piece that was missing.
 *
 * Storage is local disk under app.upload.dir. That's fine for the
 * CODEQUEST scope; if this ever needs to survive container restarts in a
 * real deployment, swap this class's internals for S3/GCS and nothing
 * outside it needs to change.
 */
@Service
public class FileStorageService {

    // Extensions we expect for 3D print job submissions: model files plus
    // a few common "supporting instructions" formats from the proposal doc.
    private static final List<String> ALLOWED_EXTENSIONS = List.of(
            "stl", "obj", "3mf", "step", "stp", "gcode", "amf", "ply",
            "pdf", "txt", "png", "jpg", "jpeg"
    );

    private static final long MAX_FILE_SIZE_BYTES = 100L * 1024 * 1024; // 100MB

    private final Path storageRoot;

    public FileStorageService(@Value("${app.upload.dir:uploads}") String uploadDir) {
        this.storageRoot = Paths.get(uploadDir).toAbsolutePath().normalize();
        try {
            Files.createDirectories(this.storageRoot);
        } catch (IOException e) {
            throw new FileStorageException("Could not create upload directory: " + this.storageRoot, e);
        }
    }

    /**
     * Writes the multipart file's bytes to disk and returns the generated
     * on-disk filename (NOT the original filename — see sanitizeFilename).
     */
    public String store(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new InvalidFileException("No file was attached to the request.");
        }
        if (file.getSize() > MAX_FILE_SIZE_BYTES) {
            throw new InvalidFileException("File exceeds the 100MB upload limit.");
        }

        String originalName = sanitizeFilename(file.getOriginalFilename());
        String extension = extractExtension(originalName);

        if (extension.isEmpty() || !ALLOWED_EXTENSIONS.contains(extension.toLowerCase())) {
            throw new InvalidFileException(
                    "Unsupported file type '" + extension + "'. Allowed types: " + ALLOWED_EXTENSIONS);
        }

        // UUID prefix avoids two students' "model.stl" overwriting each other on disk.
        String storedFilename = UUID.randomUUID() + "_" + originalName;
        Path target = storageRoot.resolve(storedFilename).normalize();

        if (!target.getParent().equals(storageRoot)) {
            // Defends against a crafted filename ("../../etc/passwd") slipping
            // past sanitizeFilename and escaping the upload directory.
            throw new InvalidFileException("Invalid file name.");
        }

        try (var inputStream = file.getInputStream()) {
            Files.copy(inputStream, target, StandardCopyOption.REPLACE_EXISTING);
        } catch (IOException e) {
            throw new FileStorageException("Failed to store file '" + originalName + "'", e);
        }

        return storedFilename;
    }

    /** Loads a previously stored file back off disk as a Resource for streaming in the response. */
    public Resource load(String storedFilename) {
        try {
            Path file = storageRoot.resolve(storedFilename).normalize();
            Resource resource = new UrlResource(file.toUri());
            if (!resource.exists() || !resource.isReadable()) {
                throw new FileStorageException("Could not read stored file: " + storedFilename);
            }
            return resource;
        } catch (MalformedURLException e) {
            throw new FileStorageException("Could not read stored file: " + storedFilename, e);
        }
    }

    private String sanitizeFilename(String original) {
        if (original == null || original.isBlank()) {
            return "unnamed";
        }
        // Keep only the leaf name in case a client sends a path instead of a bare filename.
        String name = Paths.get(original).getFileName().toString();
        return name.replaceAll("[^a-zA-Z0-9._-]", "_");
    }

    private String extractExtension(String filename) {
        int dot = filename.lastIndexOf('.');
        return (dot == -1 || dot == filename.length() - 1) ? "" : filename.substring(dot + 1);
    }
}

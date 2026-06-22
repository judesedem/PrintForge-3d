package com.printforge.printforge.fileservice.controller;

import com.printforge.printforge.fileservice.model.ModelFile;
import com.printforge.printforge.fileservice.service.FileService;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

/**
 * Previously GET /{id}, GET /{id}/download, and GET (list all) had no
 * ownership check whatsoever — any authenticated user could view or
 * download any other user's uploaded file just by guessing/incrementing an
 * id (IDOR), or list every file in the system. This version checks the
 * caller's email against ModelFile.uploadedBy (already recorded at upload
 * time) before returning anything, same pattern used in Notification/Queue/
 * Estimate Service.
 */
@RestController
@RequestMapping("/api/files")
public class FileController {

    private final FileService fileService;

    public FileController(FileService fileService) {
        this.fileService = fileService;
    }

    // POST /api/files/upload — multipart/form-data with a "file" part.
    @PostMapping("/upload")
    public ResponseEntity<ModelFile> uploadFile(
            @RequestParam("file") MultipartFile file,
            Authentication authentication) {

        String uploaderEmail = authentication.getName();
        ModelFile savedFile = fileService.saveFileMetadata(file, uploaderEmail);
        return ResponseEntity.ok(savedFile);
    }

    // GET /api/files/{id} — metadata only. Now requires the caller to be
    // the uploader, or staff.
    @GetMapping("/{id}")
    public ResponseEntity<ModelFile> getFileById(@PathVariable Long id, Authentication authentication) {
        ModelFile metadata = fileService.getFileById(id);
        requireOwnerOrStaff(metadata, authentication);
        return ResponseEntity.ok(metadata);
    }

    // GET /api/files/{id}/download — streams the actual file bytes back.
    // Same ownership check as metadata — knowing the id alone is no longer
    // enough to pull someone else's file off disk.
    @GetMapping("/{id}/download")
    public ResponseEntity<Resource> downloadFile(@PathVariable Long id, Authentication authentication) {
        ModelFile metadata = fileService.getFileById(id);
        requireOwnerOrStaff(metadata, authentication);

        Resource resource = fileService.loadFileContent(id);

        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType(metadata.getFileType()))
                .header(HttpHeaders.CONTENT_DISPOSITION,
                        "attachment; filename=\"" + metadata.getFileName() + "\"")
                .body(resource);
    }

    // GET /api/files — staff/admin get every file (ops/debugging view).
    // Everyone else only sees their own uploads. Previously this returned
    // every uploaded file's metadata to any authenticated user.
    @GetMapping
    public ResponseEntity<List<ModelFile>> getAllFiles(Authentication authentication) {
        if (isStaff(authentication)) {
            return ResponseEntity.ok(fileService.getAllFiles());
        }
        return ResponseEntity.ok(fileService.getFilesForUser(authentication.getName()));
    }

    // --- Authorization helpers ---

    private void requireOwnerOrStaff(ModelFile metadata, Authentication authentication) {
        if (isStaff(authentication)) {
            return;
        }
        String ownerEmail = metadata.getUploadedBy();
        if (ownerEmail == null || !ownerEmail.equals(authentication.getName())) {
            throw new AccessDeniedException("You can only access files you uploaded yourself");
        }
    }

    private boolean isStaff(Authentication authentication) {
        return authentication.getAuthorities().stream()
                .map(GrantedAuthority::getAuthority)
                .anyMatch(role -> role.equals("ROLE_LAB_STAFF") || role.equals("ROLE_ADMIN"));
    }
}

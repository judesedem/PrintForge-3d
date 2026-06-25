package com.printforge.printforge.fileservice.controller;

import com.printforge.printforge.entity.User;
import com.printforge.printforge.fileservice.model.ModelFile;
import com.printforge.printforge.fileservice.service.FileService;
import com.printforge.printforge.repository.UserRepository;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

/**
 * Previously GET /{id}, GET /{id}/download, and GET (list all) had no
 * ownership check whatsoever — any authenticated user could view or
 * download any other user's uploaded file just by guessing/incrementing an
 * id (IDOR), or list every file in the system. Ownership is tracked by
 * userId (ModelFile.userId), same convention as every other entity in the
 * app — this used to be tracked by email instead, the one inconsistent
 * corner of the codebase, normalized here.
 */
@RestController
@RequestMapping("/api/files")
public class FileController {

    private final FileService fileService;
    private final UserRepository userRepository;

    public FileController(FileService fileService, UserRepository userRepository) {
        this.fileService = fileService;
        this.userRepository = userRepository;
    }

    // POST /api/files/upload — multipart/form-data with a "file" part.
    @PostMapping("/upload")
    public ResponseEntity<ModelFile> uploadFile(
            @RequestParam("file") MultipartFile file,
            Authentication authentication) {

        Long uploaderId = currentUser(authentication).getUserId();
        ModelFile savedFile = fileService.saveFileMetadata(file, uploaderId);
        return ResponseEntity.ok(savedFile);
    }

    // GET /api/files/{id} — metadata only. Requires the caller to be the
    // uploader, or staff.
    @GetMapping("/{id}")
    public ResponseEntity<ModelFile> getFileById(@PathVariable Long id, Authentication authentication) {
        ModelFile metadata = fileService.getFileById(id);
        requireOwnerOrStaff(metadata, authentication);
        return ResponseEntity.ok(metadata);
    }

    // GET /api/files/{id}/download — streams the actual file bytes back.
    // Same ownership check as metadata.
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
    // Everyone else only sees their own uploads.
    @GetMapping
    public ResponseEntity<List<ModelFile>> getAllFiles(Authentication authentication) {
        if (isStaff(authentication)) {
            return ResponseEntity.ok(fileService.getAllFiles());
        }
        Long callerId = currentUser(authentication).getUserId();
        return ResponseEntity.ok(fileService.getFilesForUser(callerId));
    }

    // --- Authorization helpers (same pattern as every other controller) ---

    private void requireOwnerOrStaff(ModelFile metadata, Authentication authentication) {
        if (isStaff(authentication)) {
            return;
        }
        Long callerId = currentUser(authentication).getUserId();
        if (metadata.getUserId() == null || !metadata.getUserId().equals(callerId)) {
            throw new AccessDeniedException("You can only access files you uploaded yourself");
        }
    }

    private boolean isStaff(Authentication authentication) {
        return authentication.getAuthorities().stream()
                .map(GrantedAuthority::getAuthority)
                .anyMatch(role -> role.equals("ROLE_LAB_STAFF") || role.equals("ROLE_ADMIN"));
    }

    private User currentUser(Authentication authentication) {
        return userRepository.findByEmail(authentication.getName())
                .orElseThrow(() -> new UsernameNotFoundException("User not found"));
    }
}

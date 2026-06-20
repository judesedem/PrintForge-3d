package com.printforge.printforge.fileservice.controller;

import com.printforge.printforge.fileservice.model.ModelFile;
import com.printforge.printforge.fileservice.service.FileService;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

@RestController
@RequestMapping("/api/files")
public class FileController {

    private final FileService fileService;

    public FileController(FileService fileService) {
        this.fileService = fileService;
    }

    // POST /api/files/upload — multipart/form-data with a "file" part.
    // Previously this took fileName/fileUrl/fileType as plain @RequestParam
    // strings and never touched any actual file bytes, so nothing was ever
    // "uploaded" — it just recorded whatever URL the client claimed. Now it
    // takes the real file and writes its bytes to disk.
    @PostMapping("/upload")
    public ResponseEntity<ModelFile> uploadFile(
            @RequestParam("file") MultipartFile file,
            Authentication authentication) {

        String uploaderEmail = authentication.getName();
        ModelFile savedFile = fileService.saveFileMetadata(file, uploaderEmail);
        return ResponseEntity.ok(savedFile);
    }

    // GET /api/files/{id} — metadata only (unchanged contract).
    @GetMapping("/{id}")
    public ResponseEntity<ModelFile> getFileById(@PathVariable Long id) {
        return ResponseEntity.ok(fileService.getFileById(id));
    }

    // GET /api/files/{id}/download — streams the actual file bytes back.
    // This didn't exist before; metadata alone is useless without a way
    // to actually retrieve what was uploaded.
    @GetMapping("/{id}/download")
    public ResponseEntity<Resource> downloadFile(@PathVariable Long id) {
        ModelFile metadata = fileService.getFileById(id);
        Resource resource = fileService.loadFileContent(id);

        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType(metadata.getFileType()))
                .header(HttpHeaders.CONTENT_DISPOSITION,
                        "attachment; filename=\"" + metadata.getFileName() + "\"")
                .body(resource);
    }

    // GET /api/files — list all (handy for admin/debugging, not in the original API contract doc).
    @GetMapping
    public ResponseEntity<List<ModelFile>> getAllFiles() {
        return ResponseEntity.ok(fileService.getAllFiles());
    }
}

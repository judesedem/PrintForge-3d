package com.printforge.printforge.fileservice.controller;

import com.printforge.printforge.fileservice.model.ModelFile;
import com.printforge.printforge.fileservice.service.FileService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/files")
public class FileController {

    private final FileService fileService;

    // Injecting the service we just built
    public FileController(FileService fileService) {
        this.fileService = fileService;
    }

    // Maps to POST /api/files/upload
    @PostMapping("/upload")
    public ResponseEntity<ModelFile> uploadFile(
            @RequestParam String fileName,
            @RequestParam String fileUrl,
            @RequestParam String fileType) {

        ModelFile savedFile = fileService.saveFileMetadata(fileName, fileUrl, fileType);
        return ResponseEntity.ok(savedFile);
    }

    // Maps to GET /api/files/{id}
    @GetMapping("/{id}")
    public ResponseEntity<ModelFile> getFileById(@PathVariable Long id) {
        return fileService.getFileById(id)
                .map(ResponseEntity::ok) // Returns 200 OK if the file is found
                .orElse(ResponseEntity.notFound().build()); // Returns 404 if it doesn't exist
    }

    // Maps to GET /api/files
    @GetMapping
    public ResponseEntity<List<ModelFile>> getAllFiles() {
        return ResponseEntity.ok(fileService.getAllFiles());
    }
}
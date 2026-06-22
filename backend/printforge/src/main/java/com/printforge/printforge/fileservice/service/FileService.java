package com.printforge.printforge.fileservice.service;

import com.printforge.printforge.fileservice.exception.ModelFileNotFoundException;
import com.printforge.printforge.fileservice.model.ModelFile;
import com.printforge.printforge.fileservice.repository.ModelFileRepository;
import com.printforge.printforge.fileservice.storage.FileStorageService;
import org.springframework.core.io.Resource;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

@Service
public class FileService {

    private final ModelFileRepository fileRepository;
    private final FileStorageService fileStorageService;

    public FileService(ModelFileRepository fileRepository, FileStorageService fileStorageService) {
        this.fileRepository = fileRepository;
        this.fileStorageService = fileStorageService;
    }

    /**
     * Writes the uploaded file's bytes to disk via FileStorageService, then
     * persists the metadata row. fileUrl is filled in on a second save once
     * the row has a generated id, since the download URL embeds that id.
     */
    public ModelFile saveFileMetadata(MultipartFile file, String uploaderEmail) {
        String storedFilename = fileStorageService.store(file);

        ModelFile newFile = new ModelFile();
        newFile.setFileName(file.getOriginalFilename());
        newFile.setFileType(file.getContentType() != null ? file.getContentType() : "application/octet-stream");
        newFile.setStoredFilename(storedFilename);
        newFile.setFileSizeBytes(file.getSize());
        newFile.setUploadedBy(uploaderEmail);

        ModelFile saved = fileRepository.save(newFile);
        saved.setFileUrl("/api/files/" + saved.getFileId() + "/download");
        return fileRepository.save(saved);
    }

    public ModelFile getFileById(Long id) {
        return fileRepository.findById(id)
                .orElseThrow(() -> new ModelFileNotFoundException(id));
    }

    public List<ModelFile> getAllFiles() {
        return fileRepository.findAll();
    }

    /** Self-scoped view for non-staff callers: only files they uploaded. */
    public List<ModelFile> getFilesForUser(String uploaderEmail) {
        return fileRepository.findByUploadedBy(uploaderEmail);
    }

    /** Loads the actual file bytes off disk for a given metadata record, for the download endpoint. */
    public Resource loadFileContent(Long id) {
        ModelFile metadata = getFileById(id);
        return fileStorageService.load(metadata.getStoredFilename());
    }
}

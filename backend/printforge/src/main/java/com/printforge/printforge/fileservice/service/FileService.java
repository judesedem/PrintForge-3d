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
     * Uploads the file to Cloudinary via FileStorageService, then persists the
     * metadata row. store() now returns a Cloudinary HTTPS URL directly, so
     * both storedFilename and fileUrl are set to the same URL in one save.
     */
    public ModelFile saveFileMetadata(MultipartFile file, Long uploaderId) {
        // store() now returns a Cloudinary HTTPS URL, not a local filename
        String cloudinaryUrl = fileStorageService.store(file);

        ModelFile newFile = new ModelFile();
        newFile.setFileName(file.getOriginalFilename());
        newFile.setFileType(file.getContentType() != null ? file.getContentType() : "application/octet-stream");
        newFile.setStoredFilename(cloudinaryUrl);   // reuse field to store the URL
        newFile.setFileUrl(cloudinaryUrl);          // direct public URL for the frontend
        newFile.setFileSizeBytes(file.getSize());
        newFile.setUserId(uploaderId);

        return fileRepository.save(newFile);        // single save — no second pass needed
    }

    /**
     * Same idea as saveFileMetadata, but for images uploaded via
     * POST /api/files/upload/image — uses storeImage() (content-type
     * validated, printforge/images folder) and also captures Cloudinary's
     * public_id on the saved row.
     */
    public ModelFile saveImageMetadata(MultipartFile file, Long uploaderId) {
        FileStorageService.CloudinaryImageResult result = fileStorageService.storeImage(file);

        ModelFile newFile = new ModelFile();
        newFile.setFileName(file.getOriginalFilename());
        newFile.setFileType(file.getContentType() != null ? file.getContentType() : "image/jpeg");
        newFile.setStoredFilename(result.url());
        newFile.setFileUrl(result.url());
        newFile.setFileSizeBytes(file.getSize());
        newFile.setUserId(uploaderId);
        newFile.setPublicId(result.publicId());

        return fileRepository.save(newFile);
    }

    public ModelFile getFileById(Long id) {
        return fileRepository.findById(id)
                .orElseThrow(() -> new ModelFileNotFoundException(id));
    }

    public List<ModelFile> getAllFiles() {
        return fileRepository.findAll();
    }

    /** Self-scoped view for non-staff callers: only files they uploaded. */
    public List<ModelFile> getFilesForUser(Long userId) {
        return fileRepository.findByUserId(userId);
    }

    /** Loads the actual file via Cloudinary URL for the download endpoint. */
    public Resource loadFileContent(Long id) {
        ModelFile metadata = getFileById(id);
        return fileStorageService.load(metadata.getStoredFilename());
    }
}

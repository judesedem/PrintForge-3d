package com.printforge.printforge.fileservice.service;

import com.printforge.printforge.fileservice.model.ModelFile;
import com.printforge.printforge.fileservice.repository.ModelFileRepository;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;

@Service
public class FileService {

    private final ModelFileRepository fileRepository;

    // Constructor injection (Spring Boot handles this automatically)
    public FileService(ModelFileRepository fileRepository) {
        this.fileRepository = fileRepository;
    }

    // NEW: Added String uploaderEmail to the parameters
    public ModelFile saveFileMetadata(String fileName, String fileUrl, String fileType, String uploaderEmail) {
        ModelFile newFile = new ModelFile();
        newFile.setFileName(fileName);
        newFile.setFileUrl(fileUrl);
        newFile.setFileType(fileType);

        // NEW: Link the user's email to the file record!
        newFile.setUploadedBy(uploaderEmail);

        return fileRepository.save(newFile);
    }

    // Method to find a specific file by its ID
    public Optional<ModelFile> getFileById(Long id) {
        return fileRepository.findById(id);
    }

    // Method to list all uploaded files
    public List<ModelFile> getAllFiles() {
        return fileRepository.findAll();
    }
}
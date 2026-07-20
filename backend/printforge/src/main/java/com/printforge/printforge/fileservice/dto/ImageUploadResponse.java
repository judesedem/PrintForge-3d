package com.printforge.printforge.fileservice.dto;

import com.printforge.printforge.fileservice.model.ModelFile;
import lombok.AllArgsConstructor;
import lombok.Getter;

import java.time.LocalDateTime;

/**
 * Response shape for POST /api/files/upload/image — deliberately narrower
 * than returning the raw ModelFile (which also carries fileName/fileType/
 * fileSizeBytes/userId/storedFilename that this endpoint's contract doesn't
 * call for).
 */
@Getter
@AllArgsConstructor
public class ImageUploadResponse {

    private final Long id;
    private final String url;
    private final String publicId;
    private final LocalDateTime createdAt;

    public static ImageUploadResponse from(ModelFile file) {
        return new ImageUploadResponse(
                file.getFileId(),
                file.getFileUrl(),
                file.getPublicId(),
                file.getUploadedAt()
        );
    }
}

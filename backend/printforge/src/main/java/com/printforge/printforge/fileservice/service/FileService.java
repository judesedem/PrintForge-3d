package com.printforge.printforge.fileservice.service;

import com.printforge.printforge.fileservice.exception.FileDeleteException;
import com.printforge.printforge.fileservice.exception.ModelFileNotFoundException;
import com.printforge.printforge.fileservice.model.ModelFile;
import com.printforge.printforge.fileservice.repository.ModelFileRepository;
import com.printforge.printforge.fileservice.storage.FileStorageService;
import com.printforge.printforge.marketplaceservice.repository.DesignListingRepository;
import com.printforge.printforge.queueservice.repository.PrintJobRepository;
import org.springframework.core.io.Resource;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

@Service
public class FileService {

    private final ModelFileRepository fileRepository;
    private final FileStorageService fileStorageService;
    private final DesignListingRepository designListingRepository;
    private final PrintJobRepository printJobRepository;

    public FileService(ModelFileRepository fileRepository, FileStorageService fileStorageService,
                        DesignListingRepository designListingRepository, PrintJobRepository printJobRepository) {
        this.fileRepository = fileRepository;
        this.fileStorageService = fileStorageService;
        this.designListingRepository = designListingRepository;
        this.printJobRepository = printJobRepository;
    }

    /**
     * Uploads the file to Cloudinary via FileStorageService, then persists the
     * metadata row. store() now returns a Cloudinary HTTPS URL directly, so
     * both storedFilename and fileUrl are set to the same URL in one save.
     * For stl/obj/3mf/amf/ply uploads, store() also runs the matching
     * geometry parser against the same bytes — if that succeeded, the real
     * volume/surface area are saved alongside so EstimateService can use
     * them instead of the file-size heuristic. For gcode uploads, store()
     * instead extracts an already-sliced weight/duration from slicer
     * comments, saved onto the separate preSliced* fields.
     */
    public ModelFile saveFileMetadata(MultipartFile file, Long uploaderId) {
        FileStorageService.StoreResult storeResult = fileStorageService.store(file);
        String cloudinaryUrl = storeResult.url();

        ModelFile newFile = new ModelFile();
        newFile.setFileName(file.getOriginalFilename());
        newFile.setFileType(file.getContentType() != null ? file.getContentType() : "application/octet-stream");
        newFile.setStoredFilename(cloudinaryUrl);   // reuse field to store the URL
        newFile.setFileUrl(cloudinaryUrl);          // direct public URL for the frontend
        newFile.setFileSizeBytes(file.getSize());
        newFile.setUserId(uploaderId);
        newFile.setPublicId(storeResult.publicId());
        newFile.setCloudinaryResourceType(storeResult.resourceType());

        if (storeResult.geometryResult().parseSucceeded()) {
            newFile.setVolumeCm3(storeResult.geometryResult().volumeCm3());
            newFile.setSurfaceAreaCm2(storeResult.geometryResult().surfaceAreaCm2());
            newFile.setGeometryParsed(true);
        }

        if (storeResult.gcodeResult().parseSucceeded()) {
            newFile.setPreSlicedWeightGrams(storeResult.gcodeResult().weightGrams());
            newFile.setPreSlicedDurationMinutes(storeResult.gcodeResult().durationMinutes());
            newFile.setPreSliced(true);
        }

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

    /**
     * Batch lookup for list endpoints — one query for all ids instead of
     * one per id. Used by PrintJobFacadeController.getJobs()/
     * getQueueView() to avoid a per-job findById() (#61).
     */
    public List<ModelFile> getFilesByIds(List<Long> ids) {
        return fileRepository.findAllById(ids);
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

    /**
     * DELETE /api/files/{id}. Ownership/staff check already happened in
     * FileController (requireOwnerOrStaff) before this runs. Deletes the
     * ModelFile row first, then the Cloudinary asset — matching order, not
     * a transaction: a Cloudinary-side failure is swallowed by
     * deleteAsset() (best-effort, same as the existing deleteImage()), so
     * the row deletion is the only part that must succeed for this to
     * count as a success.
     */
    public void deleteFile(ModelFile file) {
        if (designListingRepository.existsByFileIdAndStatus(file.getFileId(), "PUBLISHED")) {
            throw new FileDeleteException(
                    "Cannot delete a file that is attached to a published listing. " +
                            "Unpublish or delete the listing first.");
        }
        if (printJobRepository.existsByFileId(file.getFileId())) {
            throw new FileDeleteException("Cannot delete a file that has been used in a print job.");
        }

        fileRepository.delete(file);
        fileStorageService.deleteAsset(file.getPublicId(), file.getCloudinaryResourceType());
    }
}

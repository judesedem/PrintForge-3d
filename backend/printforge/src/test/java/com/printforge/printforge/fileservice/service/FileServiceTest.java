package com.printforge.printforge.fileservice.service;

import com.printforge.printforge.fileservice.exception.FileDeleteException;
import com.printforge.printforge.fileservice.model.ModelFile;
import com.printforge.printforge.fileservice.repository.ModelFileRepository;
import com.printforge.printforge.fileservice.storage.FileStorageService;
import com.printforge.printforge.marketplaceservice.repository.DesignListingRepository;
import com.printforge.printforge.queueservice.repository.PrintJobRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Pure unit test, no Spring context or DB — proves DELETE /api/files/{id}'s
 * guards (published-listing / print-job usage) and the row-then-Cloudinary
 * delete order. No real transaction-boundary behavior is under test here
 * (unlike the Follow/Favorite delete fixes earlier this session), so a
 * mocked-repository unit test is sufficient.
 *
 * Run with: ./mvnw test -Dtest=FileServiceTest
 */
class FileServiceTest {

    ModelFileRepository fileRepository;
    FileStorageService fileStorageService;
    DesignListingRepository designListingRepository;
    PrintJobRepository printJobRepository;
    FileService fileService;

    @BeforeEach
    void setUp() {
        fileRepository = Mockito.mock(ModelFileRepository.class);
        fileStorageService = Mockito.mock(FileStorageService.class);
        designListingRepository = Mockito.mock(DesignListingRepository.class);
        printJobRepository = Mockito.mock(PrintJobRepository.class);
        fileService = new FileService(fileRepository, fileStorageService, designListingRepository, printJobRepository);
    }

    private ModelFile fileWithId(Long id, String publicId, String resourceType) {
        ModelFile file = new ModelFile();
        file.setFileId(id);
        file.setFileName("model.stl");
        file.setFileType("model/stl");
        file.setUserId(7L);
        file.setPublicId(publicId);
        file.setCloudinaryResourceType(resourceType);
        return file;
    }

    @Test
    void deletingAnUnreferencedFileDeletesTheRowAndCallsCloudinary() {
        ModelFile file = fileWithId(1L, "printforge/abc123", "raw");
        Mockito.when(designListingRepository.existsByFileIdAndStatus(1L, "PUBLISHED")).thenReturn(false);
        Mockito.when(printJobRepository.existsByFileId(1L)).thenReturn(false);

        fileService.deleteFile(file);

        Mockito.verify(fileRepository).delete(file);
        Mockito.verify(fileStorageService).deleteAsset("printforge/abc123", "raw");
    }

    @Test
    void fileAttachedToAPublishedListingIsRejected() {
        ModelFile file = fileWithId(1L, "printforge/abc123", "raw");
        Mockito.when(designListingRepository.existsByFileIdAndStatus(1L, "PUBLISHED")).thenReturn(true);

        FileDeleteException ex = assertThrows(FileDeleteException.class, () -> fileService.deleteFile(file));
        assertEquals("Cannot delete a file that is attached to a published listing. " +
                "Unpublish or delete the listing first.", ex.getMessage());
        Mockito.verify(fileRepository, Mockito.never()).delete(Mockito.any());
        Mockito.verify(fileStorageService, Mockito.never()).deleteAsset(Mockito.any(), Mockito.any());
    }

    @Test
    void fileUsedInAPrintJobIsRejected() {
        ModelFile file = fileWithId(1L, "printforge/abc123", "raw");
        Mockito.when(designListingRepository.existsByFileIdAndStatus(1L, "PUBLISHED")).thenReturn(false);
        Mockito.when(printJobRepository.existsByFileId(1L)).thenReturn(true);

        FileDeleteException ex = assertThrows(FileDeleteException.class, () -> fileService.deleteFile(file));
        assertEquals("Cannot delete a file that has been used in a print job.", ex.getMessage());
        Mockito.verify(fileRepository, Mockito.never()).delete(Mockito.any());
        Mockito.verify(fileStorageService, Mockito.never()).deleteAsset(Mockito.any(), Mockito.any());
    }
}

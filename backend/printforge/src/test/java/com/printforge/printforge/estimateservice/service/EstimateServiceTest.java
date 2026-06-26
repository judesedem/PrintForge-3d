package com.printforge.printforge.estimateservice.service;

import com.printforge.printforge.entity.Role;
import com.printforge.printforge.entity.User;
import com.printforge.printforge.estimateservice.exception.EstimateNotFoundException;
import com.printforge.printforge.estimateservice.exception.InvalidEstimateInputException;
import com.printforge.printforge.estimateservice.model.Estimate;
import com.printforge.printforge.estimateservice.repository.EstimateRepository;
import com.printforge.printforge.fileservice.exception.ModelFileNotFoundException;
import com.printforge.printforge.fileservice.model.ModelFile;
import com.printforge.printforge.fileservice.repository.ModelFileRepository;
import com.printforge.printforge.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Pure unit test, no Spring context or DB. Proves the size used in the cost
 * calculation comes from the actual stored file, not a number the client
 * made up, and that bad quality/materialType/fileId are rejected instead
 * of silently falling back to a default.
 *
 * Run with: ./mvnw test -Dtest=EstimateServiceTest
 */
class EstimateServiceTest {

    EstimateRepository estimateRepository;
    ModelFileRepository modelFileRepository;
    UserRepository userRepository;
    EstimateService service;

    @BeforeEach
    void setUp() {
        estimateRepository = Mockito.mock(EstimateRepository.class);
        modelFileRepository = Mockito.mock(ModelFileRepository.class);
        userRepository = Mockito.mock(UserRepository.class);
        service = new EstimateService(estimateRepository, modelFileRepository, userRepository);

        Mockito.when(estimateRepository.save(Mockito.any(Estimate.class)))
                .thenAnswer(inv -> inv.getArgument(0));

        // Default: requester is a STUDENT who owns file ID 1
        User student = new User();
        student.setUserId(7L);
        student.setRole(Role.STUDENT);
        Mockito.when(userRepository.findById(7L)).thenReturn(Optional.of(student));
    }

    private ModelFile fileOfSize(long bytes) {
        ModelFile file = new ModelFile();
        file.setFileId(1L);
        file.setUserId(7L); // same as requester — ownership check passes
        file.setFileSizeBytes(bytes);
        return file;
    }

    @Test
    void rejectsUnknownFileId() {
        Mockito.when(modelFileRepository.findById(99L)).thenReturn(Optional.empty());

        assertThrows(ModelFileNotFoundException.class,
                () -> service.calculateAndSaveEstimate(99L, "STANDARD", 20, 1, "PLA", 7L));
    }

    @Test
    void rejectsUnknownQuality() {
        Mockito.when(modelFileRepository.findById(1L)).thenReturn(Optional.of(fileOfSize(102400)));

        assertThrows(InvalidEstimateInputException.class,
                () -> service.calculateAndSaveEstimate(1L, "ultra-mega-quality", 20, 1, "PLA", 7L));
    }

    @Test
    void rejectsUnknownMaterial() {
        Mockito.when(modelFileRepository.findById(1L)).thenReturn(Optional.of(fileOfSize(102400)));

        assertThrows(InvalidEstimateInputException.class,
                () -> service.calculateAndSaveEstimate(1L, "STANDARD", 20, 1, "wood", 7L));
    }

    @Test
    void derivesFileSizeFromTheActualStoredFileNotAClientNumber() {
        // 102400 bytes == 100 KB exactly
        Mockito.when(modelFileRepository.findById(1L)).thenReturn(Optional.of(fileOfSize(102400)));

        Estimate result = service.calculateAndSaveEstimate(1L, "STANDARD", 20, 1, "PLA", 7L);

        assertEquals(100.0, result.getFileSizeKb(), 0.001);
        assertEquals(1L, result.getFileId());
        assertEquals(7L, result.getUserId());
        assertEquals("PLA", result.getMaterialType());
        assertEquals("STANDARD", result.getQuality());
        assertTrue(result.getTotalCost() > 0);
    }

    @Test
    void getEstimateByIdThrowsNotFoundForUnknownId() {
        Mockito.when(estimateRepository.findById(404L)).thenReturn(Optional.empty());

        assertThrows(EstimateNotFoundException.class, () -> service.getEstimateById(404L));
    }
}

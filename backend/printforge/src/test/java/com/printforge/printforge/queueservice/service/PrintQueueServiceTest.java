package com.printforge.printforge.queueservice.service;

import com.printforge.printforge.estimateservice.exception.EstimateNotFoundException;
import com.printforge.printforge.estimateservice.repository.EstimateRepository;
import com.printforge.printforge.fileservice.exception.ModelFileNotFoundException;
import com.printforge.printforge.fileservice.repository.ModelFileRepository;
import com.printforge.printforge.queueservice.exception.InvalidJobStatusException;
import com.printforge.printforge.queueservice.exception.PrintJobNotFoundException;
import com.printforge.printforge.queueservice.model.PrintJob;
import com.printforge.printforge.queueservice.repository.PrintJobRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Pure unit test, no Spring context or DB. Proves the validation that was
 * missing before this fix: a job can no longer reference a nonexistent
 * file/estimate, and a job's status can no longer be set to garbage.
 *
 * Run with: ./mvnw test -Dtest=PrintQueueServiceTest
 */
class PrintQueueServiceTest {

    PrintJobRepository printJobRepository;
    ModelFileRepository modelFileRepository;
    EstimateRepository estimateRepository;
    PrintQueueService service;

    @BeforeEach
    void setUp() {
        printJobRepository = Mockito.mock(PrintJobRepository.class);
        modelFileRepository = Mockito.mock(ModelFileRepository.class);
        estimateRepository = Mockito.mock(EstimateRepository.class);
        service = new PrintQueueService(printJobRepository, modelFileRepository, estimateRepository);

        Mockito.when(printJobRepository.save(Mockito.any(PrintJob.class)))
                .thenAnswer(inv -> inv.getArgument(0));
    }

    @Test
    void createPrintJobRejectsNonexistentFile() {
        Mockito.when(modelFileRepository.existsById(99L)).thenReturn(false);

        assertThrows(ModelFileNotFoundException.class,
                () -> service.createPrintJob(99L, 1L, 7L));
    }

    @Test
    void createPrintJobRejectsNonexistentEstimate() {
        Mockito.when(modelFileRepository.existsById(1L)).thenReturn(true);
        Mockito.when(estimateRepository.existsById(99L)).thenReturn(false);

        assertThrows(EstimateNotFoundException.class,
                () -> service.createPrintJob(1L, 99L, 7L));
    }

    @Test
    void createPrintJobSucceedsWhenBothReferencesExist() {
        Mockito.when(modelFileRepository.existsById(1L)).thenReturn(true);
        Mockito.when(estimateRepository.existsById(1L)).thenReturn(true);

        PrintJob job = service.createPrintJob(1L, 1L, 7L);

        assertEquals(1L, job.getFileId());
        assertEquals(1L, job.getEstimateId());
        assertEquals(7L, job.getUserId());
    }

    @Test
    void updateJobStatusRejectsUnrecognizedStatus() {
        PrintJob existing = new PrintJob();
        existing.setId(5L);
        Mockito.when(printJobRepository.findById(5L)).thenReturn(Optional.of(existing));

        assertThrows(InvalidJobStatusException.class,
                () -> service.updateJobStatus(5L, "definitely_not_a_status", null, null, null));
    }

    @Test
    void updateJobStatusThrowsNotFoundForUnknownJob() {
        Mockito.when(printJobRepository.findById(404L)).thenReturn(Optional.empty());

        assertThrows(PrintJobNotFoundException.class,
                () -> service.updateJobStatus(404L, "PRINTING", null, null, null));
    }

    @Test
    void updateJobStatusSucceedsForValidStatusCaseInsensitive() {
        PrintJob existing = new PrintJob();
        existing.setId(5L);
        Mockito.when(printJobRepository.findById(5L)).thenReturn(Optional.of(existing));

        PrintJob updated = service.updateJobStatus(5L, "printing", "Prusa-01", null, null);

        assertEquals("PRINTING", updated.getStatus());
        assertEquals("Prusa-01", updated.getAssignedPrinter());
        assertNotNull(updated.getStartedAt());
    }
}

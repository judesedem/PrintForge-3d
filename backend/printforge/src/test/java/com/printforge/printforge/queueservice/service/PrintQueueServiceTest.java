package com.printforge.printforge.queueservice.service;

import com.printforge.printforge.estimateservice.exception.EstimateNotFoundException;
import com.printforge.printforge.estimateservice.model.Estimate;
import com.printforge.printforge.estimateservice.repository.EstimateRepository;
import com.printforge.printforge.fileservice.exception.ModelFileNotFoundException;
import com.printforge.printforge.fileservice.model.ModelFile;
import com.printforge.printforge.fileservice.repository.ModelFileRepository;
import com.printforge.printforge.printerservice.exception.PrinterNotFoundException;
import com.printforge.printforge.printerservice.repository.PrinterRepository;
import com.printforge.printforge.queueservice.exception.InvalidJobStatusException;
import com.printforge.printforge.queueservice.exception.PrintJobNotFoundException;
import com.printforge.printforge.queueservice.model.PrintJob;
import com.printforge.printforge.queueservice.repository.PrintJobRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;
import org.springframework.security.access.AccessDeniedException;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Pure unit test, no Spring context or DB. Proves the validation that was
 * missing before this fix: a job can't be created against a nonexistent
 * file/estimate, can't be created using someone else's file/estimate, a
 * job's status can't be set to garbage, and a job can't be assigned to a
 * printer that doesn't actually exist.
 *
 * Run with: ./mvnw test -Dtest=PrintQueueServiceTest
 */
class PrintQueueServiceTest {

    PrintJobRepository printJobRepository;
    ModelFileRepository modelFileRepository;
    EstimateRepository estimateRepository;
    PrinterRepository printerRepository;
    PrintQueueService service;

    @BeforeEach
    void setUp() {
        printJobRepository = Mockito.mock(PrintJobRepository.class);
        modelFileRepository = Mockito.mock(ModelFileRepository.class);
        estimateRepository = Mockito.mock(EstimateRepository.class);
        printerRepository = Mockito.mock(PrinterRepository.class);
        service = new PrintQueueService(printJobRepository, modelFileRepository, estimateRepository, printerRepository);

        Mockito.when(printJobRepository.save(Mockito.any(PrintJob.class)))
                .thenAnswer(inv -> inv.getArgument(0));
    }

    private ModelFile fileOwnedBy(Long userId) {
        ModelFile file = new ModelFile();
        file.setFileId(1L);
        file.setUserId(userId);
        return file;
    }

    private Estimate estimateOwnedBy(Long userId) {
        Estimate estimate = new Estimate();
        estimate.setId(1L);
        estimate.setUserId(userId);
        return estimate;
    }

    @Test
    void createPrintJobRejectsNonexistentFile() {
        Mockito.when(modelFileRepository.findById(99L)).thenReturn(Optional.empty());

        assertThrows(ModelFileNotFoundException.class,
                () -> service.createPrintJob(99L, 1L, 7L));
    }

    @Test
    void createPrintJobRejectsNonexistentEstimate() {
        Mockito.when(modelFileRepository.findById(1L)).thenReturn(Optional.of(fileOwnedBy(7L)));
        Mockito.when(estimateRepository.findById(99L)).thenReturn(Optional.empty());

        assertThrows(EstimateNotFoundException.class,
                () -> service.createPrintJob(1L, 99L, 7L));
    }

    @Test
    void createPrintJobRejectsFileBelongingToSomeoneElse() {
        Mockito.when(modelFileRepository.findById(1L)).thenReturn(Optional.of(fileOwnedBy(999L)));

        assertThrows(AccessDeniedException.class,
                () -> service.createPrintJob(1L, 1L, 7L));
    }

    @Test
    void createPrintJobRejectsEstimateBelongingToSomeoneElse() {
        Mockito.when(modelFileRepository.findById(1L)).thenReturn(Optional.of(fileOwnedBy(7L)));
        Mockito.when(estimateRepository.findById(1L)).thenReturn(Optional.of(estimateOwnedBy(999L)));

        assertThrows(AccessDeniedException.class,
                () -> service.createPrintJob(1L, 1L, 7L));
    }

    @Test
    void createPrintJobSucceedsWhenCallerOwnsBothReferences() {
        Mockito.when(modelFileRepository.findById(1L)).thenReturn(Optional.of(fileOwnedBy(7L)));
        Mockito.when(estimateRepository.findById(1L)).thenReturn(Optional.of(estimateOwnedBy(7L)));

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
        Mockito.when(printerRepository.existsByPrinterName("Prusa-01")).thenReturn(true);

        PrintJob updated = service.updateJobStatus(5L, "printing", "Prusa-01", null, null);

        assertEquals("PRINTING", updated.getStatus());
        assertEquals("Prusa-01", updated.getAssignedPrinter());
        assertNotNull(updated.getStartedAt());
    }

    @Test
    void updateJobStatusRejectsUnregisteredPrinter() {
        PrintJob existing = new PrintJob();
        existing.setId(5L);
        Mockito.when(printJobRepository.findById(5L)).thenReturn(Optional.of(existing));
        Mockito.when(printerRepository.existsByPrinterName("Not-A-Real-Printer")).thenReturn(false);

        assertThrows(PrinterNotFoundException.class,
                () -> service.updateJobStatus(5L, "PRINTING", "Not-A-Real-Printer", null, null));
    }

    @Test
    void updateJobStatusWithNoPrinterIdSucceedsWithoutTouchingAssignedPrinter() {
        PrintJob existing = new PrintJob();
        existing.setId(5L);
        Mockito.when(printJobRepository.findById(5L)).thenReturn(Optional.of(existing));

        PrintJob updated = service.updateJobStatus(5L, "SLICING", null, null, null);

        assertEquals("SLICING", updated.getStatus());
        assertNull(updated.getAssignedPrinter());
        Mockito.verify(printerRepository, Mockito.never()).existsByPrinterName(Mockito.any());
    }
}

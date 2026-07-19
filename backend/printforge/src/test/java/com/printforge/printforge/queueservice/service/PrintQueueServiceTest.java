package com.printforge.printforge.queueservice.service;

import com.printforge.printforge.estimateservice.exception.EstimateNotFoundException;
import com.printforge.printforge.estimateservice.model.Estimate;
import com.printforge.printforge.estimateservice.repository.EstimateRepository;
import com.printforge.printforge.fileservice.exception.ModelFileNotFoundException;
import com.printforge.printforge.fileservice.model.ModelFile;
import com.printforge.printforge.fileservice.repository.ModelFileRepository;
import com.printforge.printforge.labservice.service.LabLocationService;
import com.printforge.printforge.notificationservice.service.NotificationService;
import com.printforge.printforge.printerservice.exception.PrinterBusyException;
import com.printforge.printforge.printerservice.exception.PrinterNotFoundException;
import com.printforge.printforge.printerservice.model.Printer;
import com.printforge.printforge.printerservice.repository.PrinterRepository;
import com.printforge.printforge.queueservice.exception.InvalidJobStatusException;
import com.printforge.printforge.queueservice.exception.PrintJobNotFoundException;
import com.printforge.printforge.queueservice.model.PrintJob;
import com.printforge.printforge.queueservice.repository.PrintJobRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.mockito.ArgumentCaptor;
import org.mockito.Mockito;
import org.springframework.security.access.AccessDeniedException;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Pure unit test, no Spring context or DB. Covers job creation ownership
 * checks, status validation, and printer-status cascading (assigning a
 * printer flips it to BUSY, completing/failing a job frees it).
 *
 * Rewritten to match the current implementation, which validates printers
 * via findByPrinterName(...) — a previous version of this test still
 * mocked the now-unused existsByPrinterName(...), which meant
 * findByPrinterName(...) was never stubbed and returned null, so
 * .orElseThrow() threw a raw NullPointerException instead of the exception
 * each test actually expected. Run this for yourself to confirm:
 *
 *   ./mvnw test -Dtest=PrintQueueServiceTest
 */
class PrintQueueServiceTest {

    PrintJobRepository printJobRepository;
    ModelFileRepository modelFileRepository;
    EstimateRepository estimateRepository;
    PrinterRepository printerRepository;
    NotificationService notificationService;
    LabLocationService labLocationService;
    PrintQueueService service;

    @BeforeEach
    void setUp() {
        printJobRepository = Mockito.mock(PrintJobRepository.class);
        modelFileRepository = Mockito.mock(ModelFileRepository.class);
        estimateRepository = Mockito.mock(EstimateRepository.class);
        printerRepository = Mockito.mock(PrinterRepository.class);
        notificationService = Mockito.mock(NotificationService.class);
        labLocationService = Mockito.mock(LabLocationService.class);
        service = new PrintQueueService(printJobRepository, modelFileRepository, estimateRepository, printerRepository, notificationService, labLocationService);

        Mockito.when(printJobRepository.save(Mockito.any(PrintJob.class)))
                .thenAnswer(inv -> inv.getArgument(0));
        Mockito.when(printerRepository.save(Mockito.any(Printer.class)))
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

    private Printer printerNamed(String name, String status) {
        Printer printer = new Printer();
        printer.setId(1L);
        printer.setPrinterName(name);
        printer.setStatus(status);
        return printer;
    }

    // --- createPrintJob ---

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

    // --- updateJobStatus: basic validation ---

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
    void updateJobStatusWithNoPrinterIdDoesNotTouchPrinterRepository() {
        PrintJob existing = new PrintJob();
        existing.setId(5L);
        Mockito.when(printJobRepository.findById(5L)).thenReturn(Optional.of(existing));

        PrintJob updated = service.updateJobStatus(5L, "QUEUED", null, null, null);

        assertEquals("QUEUED", updated.getStatus());
        assertNull(updated.getAssignedPrinter());
        Mockito.verify(printerRepository, Mockito.never()).findByPrinterName(Mockito.any());
    }

    // --- updateJobStatus: printer assignment cascading ---

    @Test
    void assigningAnAvailablePrinterFlipsItToBusy() {
        PrintJob existing = new PrintJob();
        existing.setId(5L);
        Mockito.when(printJobRepository.findById(5L)).thenReturn(Optional.of(existing));
        Mockito.when(printerRepository.findByPrinterName("Prusa-01"))
                .thenReturn(Optional.of(printerNamed("Prusa-01", "AVAILABLE")));

        PrintJob updated = service.updateJobStatus(5L, "PRINTING", "Prusa-01", null, null);

        assertEquals("Prusa-01", updated.getAssignedPrinter());
        ArgumentCaptor<Printer> savedPrinter = ArgumentCaptor.forClass(Printer.class);
        Mockito.verify(printerRepository).save(savedPrinter.capture());
        assertEquals("BUSY", savedPrinter.getValue().getStatus());
    }

    @Test
    void assigningAnUnregisteredPrinterThrowsNotFound() {
        PrintJob existing = new PrintJob();
        existing.setId(5L);
        Mockito.when(printJobRepository.findById(5L)).thenReturn(Optional.of(existing));
        Mockito.when(printerRepository.findByPrinterName("Not-A-Real-Printer")).thenReturn(Optional.empty());

        assertThrows(PrinterNotFoundException.class,
                () -> service.updateJobStatus(5L, "PRINTING", "Not-A-Real-Printer", null, null));
    }

    @Test
    void assigningAPrinterThatIsAlreadyBusyWithSomeoneElsesJobIsRejected() {
        PrintJob existing = new PrintJob();
        existing.setId(5L);
        Mockito.when(printJobRepository.findById(5L)).thenReturn(Optional.of(existing));
        Mockito.when(printerRepository.findByPrinterName("Prusa-01"))
                .thenReturn(Optional.of(printerNamed("Prusa-01", "BUSY")));

        assertThrows(PrinterBusyException.class,
                () -> service.updateJobStatus(5L, "PRINTING", "Prusa-01", null, null));
    }

    /**
     * This is the regression test for the bug found in this exact codebase:
     * the assignment check only rejected printers whose status was the
     * literal string "BUSY", which let OFFLINE and MAINTENANCE printers
     * slip through and get silently flipped to BUSY. Both must be rejected
     * the same way BUSY is.
     */
    @ParameterizedTest
    @ValueSource(strings = {"OFFLINE", "MAINTENANCE", "BUSY"})
    void assigningANonAvailablePrinterIsRejectedRegardlessOfWhichNonAvailableStatus(String status) {
        PrintJob existing = new PrintJob();
        existing.setId(5L);
        Mockito.when(printJobRepository.findById(5L)).thenReturn(Optional.of(existing));
        Mockito.when(printerRepository.findByPrinterName("Prusa-01"))
                .thenReturn(Optional.of(printerNamed("Prusa-01", status)));

        assertThrows(PrinterBusyException.class,
                () -> service.updateJobStatus(5L, "PRINTING", "Prusa-01", null, null));
    }

    @Test
    void reassigningTheSamePrinterAlreadyOnThisJobIsAllowedEvenThoughItsBusy() {
        // The printer is BUSY precisely because it's already working on
        // *this* job — re-saving other fields on the same job (e.g. adding
        // operator notes) without changing the printer shouldn't fail.
        PrintJob existing = new PrintJob();
        existing.setId(5L);
        existing.setAssignedPrinter("Prusa-01");
        Mockito.when(printJobRepository.findById(5L)).thenReturn(Optional.of(existing));
        Mockito.when(printerRepository.findByPrinterName("Prusa-01"))
                .thenReturn(Optional.of(printerNamed("Prusa-01", "BUSY")));

        PrintJob updated = service.updateJobStatus(5L, "PRINTING", "Prusa-01", "looking good", null);

        assertEquals("Prusa-01", updated.getAssignedPrinter());
        assertEquals("looking good", updated.getOperatorNotes());
    }

    @Test
    void reassigningToADifferentPrinterFreesTheOldOneAndBusiesTheNewOne() {
        PrintJob existing = new PrintJob();
        existing.setId(5L);
        existing.setAssignedPrinter("Prusa-01");
        Mockito.when(printJobRepository.findById(5L)).thenReturn(Optional.of(existing));
        Mockito.when(printerRepository.findByPrinterName("Prusa-01"))
                .thenReturn(Optional.of(printerNamed("Prusa-01", "BUSY")));
        Mockito.when(printerRepository.findByPrinterName("Prusa-02"))
                .thenReturn(Optional.of(printerNamed("Prusa-02", "AVAILABLE")));

        PrintJob updated = service.updateJobStatus(5L, "PRINTING", "Prusa-02", null, null);

        assertEquals("Prusa-02", updated.getAssignedPrinter());

        ArgumentCaptor<Printer> savedPrinters = ArgumentCaptor.forClass(Printer.class);
        Mockito.verify(printerRepository, Mockito.times(2)).save(savedPrinters.capture());
        boolean oldFreed = savedPrinters.getAllValues().stream()
                .anyMatch(p -> p.getPrinterName().equals("Prusa-01") && "AVAILABLE".equals(p.getStatus()));
        boolean newBusied = savedPrinters.getAllValues().stream()
                .anyMatch(p -> p.getPrinterName().equals("Prusa-02") && "BUSY".equals(p.getStatus()));
        assertTrue(oldFreed, "Old printer should have been freed back to AVAILABLE");
        assertTrue(newBusied, "New printer should have been set to BUSY");
    }

    // --- updateJobStatus: completing/failing frees the printer ---

    @Test
    void completingAJobFreesItsAssignedPrinter() {
        PrintJob existing = new PrintJob();
        existing.setId(5L);
        existing.setAssignedPrinter("Prusa-01");
        Mockito.when(printJobRepository.findById(5L)).thenReturn(Optional.of(existing));
        Mockito.when(printerRepository.findByPrinterName("Prusa-01"))
                .thenReturn(Optional.of(printerNamed("Prusa-01", "BUSY")));

        PrintJob updated = service.updateJobStatus(5L, "COMPLETED", null, null, null);

        assertEquals("COMPLETED", updated.getStatus());
        assertNotNull(updated.getCompletedAt());
        ArgumentCaptor<Printer> savedPrinter = ArgumentCaptor.forClass(Printer.class);
        Mockito.verify(printerRepository).save(savedPrinter.capture());
        assertEquals("AVAILABLE", savedPrinter.getValue().getStatus());
    }

    @Test
    void failingAJobAlsoFreesItsAssignedPrinter() {
        PrintJob existing = new PrintJob();
        existing.setId(5L);
        existing.setAssignedPrinter("Prusa-01");
        Mockito.when(printJobRepository.findById(5L)).thenReturn(Optional.of(existing));
        Mockito.when(printerRepository.findByPrinterName("Prusa-01"))
                .thenReturn(Optional.of(printerNamed("Prusa-01", "BUSY")));

        service.updateJobStatus(5L, "REJECTED", null, null, null);

        ArgumentCaptor<Printer> savedPrinter = ArgumentCaptor.forClass(Printer.class);
        Mockito.verify(printerRepository).save(savedPrinter.capture());
        assertEquals("AVAILABLE", savedPrinter.getValue().getStatus());
    }

    @Test
    void completingAJobWithNoAssignedPrinterDoesNotThrow() {
        PrintJob existing = new PrintJob();
        existing.setId(5L);
        Mockito.when(printJobRepository.findById(5L)).thenReturn(Optional.of(existing));

        PrintJob updated = service.updateJobStatus(5L, "COMPLETED", null, null, null);

        assertEquals("COMPLETED", updated.getStatus());
        Mockito.verify(printerRepository, Mockito.never()).save(Mockito.any());
    }
}

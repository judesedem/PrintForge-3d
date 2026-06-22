package com.printforge.printforge.adminservice.service;

import com.printforge.printforge.printerservice.model.Printer;
import com.printforge.printforge.printerservice.repository.PrinterRepository;
import com.printforge.printforge.queueservice.model.PrintJob;
import com.printforge.printforge.queueservice.repository.PrintJobRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;

import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Pure unit test, no Spring context or DB. Proves the dashboard summary
 * actually counts jobs/printers by status correctly.
 *
 * Run with: ./mvnw test -Dtest=AdminServiceTest
 */
class AdminServiceTest {

    PrintJobRepository printJobRepository;
    PrinterRepository printerRepository;
    AdminService service;

    @BeforeEach
    void setUp() {
        printJobRepository = Mockito.mock(PrintJobRepository.class);
        printerRepository = Mockito.mock(PrinterRepository.class);
        service = new AdminService(printJobRepository, printerRepository);
    }

    private PrintJob jobWithStatus(String status) {
        PrintJob job = new PrintJob();
        job.setStatus(status);
        return job;
    }

    private Printer printerWithStatus(String status) {
        Printer printer = new Printer();
        printer.setStatus(status);
        return printer;
    }

    @Test
    void summaryCountsJobsAndPrintersByStatus() {
        Mockito.when(printJobRepository.findAll()).thenReturn(List.of(
                jobWithStatus("PENDING"),
                jobWithStatus("PENDING"),
                jobWithStatus("PRINTING")
        ));
        Mockito.when(printerRepository.findAll()).thenReturn(List.of(
                printerWithStatus("AVAILABLE"),
                printerWithStatus("BUSY")
        ));

        Map<String, Object> summary = service.getDashboardSummary();

        assertEquals(3L, summary.get("totalJobs"));
        assertEquals(2L, summary.get("totalPrinters"));

        @SuppressWarnings("unchecked")
        Map<String, Long> jobsByStatus = (Map<String, Long>) summary.get("jobsByStatus");
        assertEquals(2L, jobsByStatus.get("PENDING"));
        assertEquals(1L, jobsByStatus.get("PRINTING"));

        @SuppressWarnings("unchecked")
        Map<String, Long> printersByStatus = (Map<String, Long>) summary.get("printersByStatus");
        assertEquals(1L, printersByStatus.get("AVAILABLE"));
        assertEquals(1L, printersByStatus.get("BUSY"));
    }
}

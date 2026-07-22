package com.printforge.printforge.adminservice.service;

import com.printforge.printforge.adminservice.dto.RevenueHistoryEntry;
import com.printforge.printforge.marketplaceservice.repository.DesignListingRepository;
import com.printforge.printforge.moderationservice.service.ModerationLogService;
import com.printforge.printforge.notificationservice.service.NotificationService;
import com.printforge.printforge.paymentservice.model.Payment;
import com.printforge.printforge.paymentservice.repository.PaymentRepository;
import com.printforge.printforge.printerservice.model.Printer;
import com.printforge.printforge.printerservice.repository.PrinterRepository;
import com.printforge.printforge.queueservice.model.PrintJob;
import com.printforge.printforge.queueservice.repository.PrintJobRepository;
import com.printforge.printforge.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
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
    DesignListingRepository designListingRepository;
    UserRepository userRepository;
    NotificationService notificationService;
    ModerationLogService moderationLogService;
    PaymentRepository paymentRepository;
    AdminService service;

    @BeforeEach
    void setUp() {
        printJobRepository = Mockito.mock(PrintJobRepository.class);
        printerRepository = Mockito.mock(PrinterRepository.class);
        designListingRepository = Mockito.mock(DesignListingRepository.class);
        userRepository = Mockito.mock(UserRepository.class);
        notificationService = Mockito.mock(NotificationService.class);
        moderationLogService = Mockito.mock(ModerationLogService.class);
        paymentRepository = Mockito.mock(PaymentRepository.class);
        // sumEarningsByDesigner returns empty list by default — no earnings to display
        Mockito.when(designListingRepository.sumEarningsByDesigner()).thenReturn(List.of());
        service = new AdminService(printJobRepository, printerRepository, designListingRepository,
                userRepository, notificationService, moderationLogService, paymentRepository);
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
                jobWithStatus("SUBMITTED"),
                jobWithStatus("SUBMITTED"),
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
        assertEquals(2L, jobsByStatus.get("SUBMITTED"));
        assertEquals(1L, jobsByStatus.get("PRINTING"));

        @SuppressWarnings("unchecked")
        Map<String, Long> printersByStatus = (Map<String, Long>) summary.get("printersByStatus");
        assertEquals(1L, printersByStatus.get("AVAILABLE"));
        assertEquals(1L, printersByStatus.get("BUSY"));
    }

    // --- getRevenueHistory ---

    private Payment completedPaymentOf(String amount, LocalDateTime completedAt) {
        Payment payment = new Payment();
        payment.setStatus("COMPLETED");
        payment.setAmount(new BigDecimal(amount));
        payment.setCompletedAt(completedAt);
        return payment;
    }

    @Test
    void revenueHistoryReturnsAContinuousZeroFilledSeriesSummedByCalendarDay() {
        LocalDate today = LocalDate.now();
        LocalDate twoDaysAgo = today.minusDays(2);

        Mockito.when(paymentRepository.findByStatusAndCompletedAtGreaterThanEqual(
                        Mockito.eq("COMPLETED"), Mockito.any(LocalDateTime.class)))
                .thenReturn(List.of(
                        completedPaymentOf("10.00", twoDaysAgo.atTime(9, 0)),
                        completedPaymentOf("5.50", twoDaysAgo.atTime(15, 0)),
                        completedPaymentOf("3.25", today.atTime(8, 0))
                ));

        List<RevenueHistoryEntry> history = service.getRevenueHistory(3);

        assertEquals(3, history.size());

        assertEquals(twoDaysAgo.toString(), history.get(0).date());
        assertEquals(0, new BigDecimal("15.50").compareTo(history.get(0).revenue()));

        assertEquals(today.minusDays(1).toString(), history.get(1).date());
        assertEquals(0, BigDecimal.ZERO.compareTo(history.get(1).revenue()));

        assertEquals(today.toString(), history.get(2).date());
        assertEquals(0, new BigDecimal("3.25").compareTo(history.get(2).revenue()));
    }

    @Test
    void revenueHistoryDaysIsClampedToTheMaximum() {
        Mockito.when(paymentRepository.findByStatusAndCompletedAtGreaterThanEqual(
                        Mockito.eq("COMPLETED"), Mockito.any(LocalDateTime.class)))
                .thenReturn(List.of());

        List<RevenueHistoryEntry> history = service.getRevenueHistory(9999);

        assertEquals(90, history.size());
    }

    @Test
    void revenueHistoryDaysIsFlooredToOne() {
        Mockito.when(paymentRepository.findByStatusAndCompletedAtGreaterThanEqual(
                        Mockito.eq("COMPLETED"), Mockito.any(LocalDateTime.class)))
                .thenReturn(List.of());

        List<RevenueHistoryEntry> history = service.getRevenueHistory(-5);

        assertEquals(1, history.size());
        assertEquals(LocalDate.now().toString(), history.get(0).date());
    }

    @Test
    void revenueHistoryUsesDefaultOfSevenDays() {
        Mockito.when(paymentRepository.findByStatusAndCompletedAtGreaterThanEqual(
                        Mockito.eq("COMPLETED"), Mockito.any(LocalDateTime.class)))
                .thenReturn(List.of());

        List<RevenueHistoryEntry> history = service.getRevenueHistory(7);

        assertEquals(7, history.size());
    }
}

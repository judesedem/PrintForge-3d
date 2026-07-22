package com.printforge.admin.adminservice.service;

import com.printforge.admin.adminservice.dto.RevenueHistoryEntry;
import com.printforge.admin.marketplaceservice.repository.DesignListingRepository;
import com.printforge.admin.moderationservice.service.ModerationLogService;
import com.printforge.admin.notificationservice.service.NotificationService;
import com.printforge.admin.paymentservice.model.Payment;
import com.printforge.admin.paymentservice.repository.PaymentRepository;
import com.printforge.admin.printerservice.repository.PrinterRepository;
import com.printforge.admin.queueservice.repository.PrintJobRepository;
import com.printforge.admin.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Pure unit test, no Spring context or DB. Ported from the monolith's
 * AdminServiceTest — only the getRevenueHistory() coverage, since the
 * monolith's own dashboardSummary test mocked printJobRepository.findAll()
 * while both the monolith's and this service's actual getDashboardSummary()
 * implementation use countGroupedByStatus()/countAllJobs() instead — that
 * test was already stale relative to its own production code before this
 * port, unrelated to Feature D (revenue history), so it wasn't carried over.
 *
 * Run with: ./mvnw -pl admin-service test -Dtest=AdminServiceTest
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
        service = new AdminService(printJobRepository, printerRepository, designListingRepository,
                userRepository, notificationService, moderationLogService, paymentRepository);
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

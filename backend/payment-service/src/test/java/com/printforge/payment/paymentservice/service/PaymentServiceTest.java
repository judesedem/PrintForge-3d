package com.printforge.payment.paymentservice.service;

import com.printforge.payment.estimateservice.model.Estimate;
import com.printforge.payment.estimateservice.repository.EstimateRepository;
import com.printforge.payment.marketplaceservice.model.DesignListing;
import com.printforge.payment.marketplaceservice.repository.DesignListingRepository;
import com.printforge.payment.notificationservice.model.NotificationType;
import com.printforge.payment.notificationservice.service.NotificationService;
import com.printforge.payment.paymentservice.model.Payment;
import com.printforge.payment.paymentservice.repository.PaymentRepository;
import com.printforge.payment.queueservice.model.PrintJob;
import com.printforge.payment.queueservice.repository.PrintJobRepository;
import com.printforge.payment.repository.UserRepository;
import com.printforge.payment.marketplaceservice.repository.DesignRequestRepository;
import com.printforge.payment.paymentservice.repository.WithdrawalRepository;
import com.printforge.payment.settingsservice.model.FeatureToggle;
import com.printforge.payment.settingsservice.model.FeatureToggleKeys;
import com.printforge.payment.settingsservice.repository.FeatureToggleRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.mockito.Mockito;

import java.math.BigDecimal;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Pure unit test, no Spring context or DB. Proves fulfillPayment() (the
 * core of handleWebhook() — see that method's javadoc) sends the specific
 * notification types (PAYMENT_CONFIRMED to the customer, LISTING_SALE to
 * the designer — the latter didn't exist as a notification at all before
 * this port), not just the generic "success" string it used before.
 *
 * fulfillPayment() is package-private specifically so this test can call
 * it directly, bypassing handleWebhook()'s HMAC signature verification and
 * getPaymentById()'s live Paystack HTTP call — neither of which
 * fulfillPayment() itself performs.
 *
 * Run with: ./mvnw -pl payment-service test -Dtest=PaymentServiceTest
 */
class PaymentServiceTest {

    PaymentRepository paymentRepository;
    EstimateRepository estimateRepository;
    DesignListingRepository listingRepository;
    DesignRequestRepository requestRepository;
    PrintJobRepository printJobRepository;
    NotificationService notificationService;
    UserRepository userRepository;
    WithdrawalRepository withdrawalRepository;
    FeatureToggleRepository featureToggleRepository;
    PaymentService service;

    @BeforeEach
    void setUp() {
        paymentRepository = Mockito.mock(PaymentRepository.class);
        estimateRepository = Mockito.mock(EstimateRepository.class);
        listingRepository = Mockito.mock(DesignListingRepository.class);
        requestRepository = Mockito.mock(DesignRequestRepository.class);
        printJobRepository = Mockito.mock(PrintJobRepository.class);
        notificationService = Mockito.mock(NotificationService.class);
        userRepository = Mockito.mock(UserRepository.class);
        withdrawalRepository = Mockito.mock(WithdrawalRepository.class);
        featureToggleRepository = Mockito.mock(FeatureToggleRepository.class);
        service = new PaymentService(paymentRepository, estimateRepository, listingRepository,
                requestRepository, printJobRepository, notificationService, userRepository,
                withdrawalRepository, featureToggleRepository);

        // Fail-open default: no row for a key means enabled, matching
        // SettingsService.isFeatureEnabled()'s semantics. Individual tests
        // override this to prove the toggle-off path.
        Mockito.lenient().when(featureToggleRepository.findByFeatureName(Mockito.anyString()))
                .thenReturn(Optional.empty());

        Mockito.when(paymentRepository.save(Mockito.any(Payment.class)))
                .thenAnswer(inv -> inv.getArgument(0));
        Mockito.when(printJobRepository.save(Mockito.any(PrintJob.class)))
                .thenAnswer(inv -> {
                    PrintJob job = inv.getArgument(0);
                    job.setId(99L);
                    return job;
                });
        Mockito.when(listingRepository.save(Mockito.any(DesignListing.class)))
                .thenAnswer(inv -> inv.getArgument(0));
    }

    private Estimate estimateFor(Long fileId) {
        Estimate estimate = new Estimate();
        estimate.setId(1L);
        estimate.setFileId(fileId);
        estimate.setMaterialType("PLA");
        estimate.setQuantity(1);
        estimate.setInfillPercent(20);
        estimate.setQuality("STANDARD");
        return estimate;
    }

    private Payment pendingPayment(Long userId, Long estimateId, Long listingId) {
        Payment payment = new Payment();
        payment.setId(10L);
        payment.setUserId(userId);
        payment.setEstimateId(estimateId);
        payment.setListingId(listingId);
        payment.setStatus("PENDING");
        payment.setAmount(BigDecimal.valueOf(12.50));
        return payment;
    }

    @Test
    void fulfillingABYOFPaymentSendsPaymentConfirmedNotificationType() {
        Mockito.when(estimateRepository.findById(1L)).thenReturn(Optional.of(estimateFor(5L)));
        Payment payment = pendingPayment(42L, 1L, null);

        service.fulfillPayment(payment);

        assertEquals("COMPLETED", payment.getStatus());
        assertNotNull(payment.getCompletedAt());
        Mockito.verify(notificationService).createNotification(
                Mockito.eq(42L), Mockito.anyString(), Mockito.anyString(),
                Mockito.eq(NotificationType.PAYMENT_CONFIRMED));
    }

    @Test
    void fulfillingAnAlreadyCompletedPaymentIsANoOpThatSendsNoNotification() {
        Payment payment = pendingPayment(42L, 1L, null);
        payment.setStatus("COMPLETED");

        Payment result = service.fulfillPayment(payment);

        assertSame(payment, result);
        Mockito.verifyNoInteractions(notificationService);
        Mockito.verify(printJobRepository, Mockito.never()).save(Mockito.any());
    }

    @Test
    void fulfillingAMarketplaceOrderSendsListingSaleNotificationTypeToTheDesigner() {
        Mockito.when(estimateRepository.findById(1L)).thenReturn(Optional.of(estimateFor(5L)));

        DesignListing listing = new DesignListing();
        listing.setId(7L);
        listing.setFileId(5L);
        listing.setDesignerId(77L);
        listing.setTitle("Articulated Dragon");
        listing.setBasePrice(BigDecimal.valueOf(8.00));
        listing.setTotalOrders(3);
        listing.setTotalEarnings(BigDecimal.valueOf(24.00));
        Mockito.when(listingRepository.findById(7L)).thenReturn(Optional.of(listing));

        Payment payment = pendingPayment(42L, 1L, 7L);

        service.fulfillPayment(payment);

        ArgumentCaptor<DesignListing> savedListing = ArgumentCaptor.forClass(DesignListing.class);
        Mockito.verify(listingRepository).save(savedListing.capture());
        assertEquals(4, savedListing.getValue().getTotalOrders());
        assertEquals(0, BigDecimal.valueOf(32.00).compareTo(savedListing.getValue().getTotalEarnings()));

        Mockito.verify(notificationService).createNotification(
                Mockito.eq(42L), Mockito.anyString(), Mockito.anyString(),
                Mockito.eq(NotificationType.PAYMENT_CONFIRMED));
        Mockito.verify(notificationService).createNotification(
                Mockito.eq(77L), Mockito.anyString(), Mockito.anyString(),
                Mockito.eq(NotificationType.LISTING_SALE));
    }

    @Test
    void fulfillingAMarketplaceOrderForAListingWithNoDesignerIdSendsNoListingSaleNotification() {
        Mockito.when(estimateRepository.findById(1L)).thenReturn(Optional.of(estimateFor(5L)));

        DesignListing listing = new DesignListing();
        listing.setId(7L);
        listing.setFileId(5L);
        listing.setDesignerId(null);
        listing.setTitle("Orphaned Listing");
        listing.setBasePrice(BigDecimal.valueOf(8.00));
        listing.setTotalOrders(0);
        Mockito.when(listingRepository.findById(7L)).thenReturn(Optional.of(listing));

        Payment payment = pendingPayment(42L, 1L, 7L);

        service.fulfillPayment(payment);

        Mockito.verify(notificationService, Mockito.never()).createNotification(
                Mockito.eq(null), Mockito.anyString(), Mockito.anyString(),
                Mockito.eq(NotificationType.LISTING_SALE));
        Mockito.verify(notificationService, Mockito.times(1)).createNotification(
                Mockito.anyLong(), Mockito.anyString(), Mockito.anyString(), Mockito.anyString());
    }

    @Test
    void designerEarningsToggleOffSkipsEarningsAndSaleNotificationButStillCountsTheOrder() {
        Mockito.when(estimateRepository.findById(1L)).thenReturn(Optional.of(estimateFor(5L)));
        Mockito.when(featureToggleRepository.findByFeatureName(FeatureToggleKeys.DESIGNER_EARNINGS))
                .thenReturn(Optional.of(toggle(FeatureToggleKeys.DESIGNER_EARNINGS, false)));

        DesignListing listing = new DesignListing();
        listing.setId(7L);
        listing.setFileId(5L);
        listing.setDesignerId(77L);
        listing.setTitle("Articulated Dragon");
        listing.setBasePrice(BigDecimal.valueOf(8.00));
        listing.setTotalOrders(3);
        listing.setTotalEarnings(BigDecimal.valueOf(24.00));
        Mockito.when(listingRepository.findById(7L)).thenReturn(Optional.of(listing));

        Payment payment = pendingPayment(42L, 1L, 7L);

        service.fulfillPayment(payment);

        ArgumentCaptor<DesignListing> savedListing = ArgumentCaptor.forClass(DesignListing.class);
        Mockito.verify(listingRepository).save(savedListing.capture());
        assertEquals(4, savedListing.getValue().getTotalOrders(),
                "Order count tracks fulfillment regardless of the designerEarnings toggle");
        assertEquals(0, BigDecimal.valueOf(24.00).compareTo(savedListing.getValue().getTotalEarnings()),
                "Earnings must stay unchanged while the toggle is off");

        Mockito.verify(notificationService).createNotification(
                Mockito.eq(42L), Mockito.anyString(), Mockito.anyString(),
                Mockito.eq(NotificationType.PAYMENT_CONFIRMED));
        Mockito.verify(notificationService, Mockito.never()).createNotification(
                Mockito.eq(77L), Mockito.anyString(), Mockito.anyString(),
                Mockito.eq(NotificationType.LISTING_SALE));
    }

    private FeatureToggle toggle(String name, boolean enabled) {
        FeatureToggle toggle = new FeatureToggle();
        toggle.setFeatureName(name);
        toggle.setEnabled(enabled);
        return toggle;
    }
}

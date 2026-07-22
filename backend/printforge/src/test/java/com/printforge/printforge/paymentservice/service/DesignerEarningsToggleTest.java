package com.printforge.printforge.paymentservice.service;

import com.printforge.printforge.entity.Role;
import com.printforge.printforge.entity.User;
import com.printforge.printforge.estimateservice.model.Estimate;
import com.printforge.printforge.estimateservice.repository.EstimateRepository;
import com.printforge.printforge.estimateservice.service.EstimateService;
import com.printforge.printforge.fileservice.model.ModelFile;
import com.printforge.printforge.fileservice.repository.ModelFileRepository;
import com.printforge.printforge.marketplaceservice.model.DesignListing;
import com.printforge.printforge.marketplaceservice.repository.DesignListingRepository;
import com.printforge.printforge.notificationservice.model.Notification;
import com.printforge.printforge.notificationservice.model.NotificationType;
import com.printforge.printforge.notificationservice.repository.NotificationRepository;
import com.printforge.printforge.paymentservice.model.Payment;
import com.printforge.printforge.paymentservice.repository.PaymentRepository;
import com.printforge.printforge.queueservice.repository.PrintJobRepository;
import com.printforge.printforge.repository.UserRepository;
import com.printforge.printforge.settingsservice.model.FeatureToggle;
import com.printforge.printforge.settingsservice.model.FeatureToggleKeys;
import com.printforge.printforge.settingsservice.repository.FeatureToggleRepository;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.test.context.SpringBootTest;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.math.BigDecimal;
import java.util.HexFormat;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Stage 6 — proves the "designerEarnings" toggle actually gates the
 * earnings-credit/LISTING_SALE-notification side effect in
 * PaymentService.handleWebhook(), while leaving totalOrders (fulfillment
 * count, unrelated to payout) and the order/payment itself untouched.
 *
 * Same real-Spring-context/real-DB/spied-verifyWithPaystack() pattern as
 * MarketplaceOrderColorNotesTest/MarketplaceOrderNotificationTypeTest.
 *
 * IMPORTANT: designerEarnings is a single global row shared by every test
 * in this suite run (SettingsService reads the real DB, not a mock) — the
 * @AfterEach here unconditionally restores it to enabled=true first, before
 * any other cleanup, so a failure partway through this test can't leave
 * every other marketplace/payment test in the run seeing it disabled.
 *
 * Run with: ./mvnw test -Dtest=DesignerEarningsToggleTest
 */
@SpringBootTest
class DesignerEarningsToggleTest {

    private static final BigDecimal BASE_PRICE = BigDecimal.valueOf(20.00);

    @Autowired PaymentService paymentService;
    @Autowired UserRepository userRepository;
    @Autowired ModelFileRepository modelFileRepository;
    @Autowired DesignListingRepository designListingRepository;
    @Autowired EstimateService estimateService;
    @Autowired EstimateRepository estimateRepository;
    @Autowired PaymentRepository paymentRepository;
    @Autowired PrintJobRepository printJobRepository;
    @Autowired NotificationRepository notificationRepository;
    @Autowired FeatureToggleRepository featureToggleRepository;
    @Autowired org.springframework.security.crypto.password.PasswordEncoder passwordEncoder;

    @Value("${paystack.secret-key}")
    private String paystackSecretKey;

    private Long studentId;
    private Long designerId;
    private Long fileId;
    private Long listingId;
    private Long estimateId;
    private Long paymentId;
    private Long printJobId;

    @AfterEach
    void cleanUp() {
        featureToggleRepository.findByFeatureName(FeatureToggleKeys.DESIGNER_EARNINGS)
                .ifPresent(toggle -> {
                    toggle.setEnabled(true);
                    featureToggleRepository.save(toggle);
                });

        if (studentId != null) {
            notificationRepository.deleteAll(notificationRepository.findByUserIdOrderByCreatedAtDesc(studentId));
        }
        if (designerId != null) {
            notificationRepository.deleteAll(notificationRepository.findByUserIdOrderByCreatedAtDesc(designerId));
        }
        if (printJobId != null) printJobRepository.deleteById(printJobId);
        if (paymentId != null) paymentRepository.deleteById(paymentId);
        if (estimateId != null) estimateRepository.deleteById(estimateId);
        if (listingId != null) designListingRepository.deleteById(listingId);
        if (fileId != null) modelFileRepository.deleteById(fileId);
        if (studentId != null) userRepository.deleteById(studentId);
        if (designerId != null) userRepository.deleteById(designerId);
    }

    @Test
    void disablingDesignerEarningsSkipsTheCreditAndNotificationButStillCountsTheOrder() throws Exception {
        FeatureToggle toggle = featureToggleRepository.findByFeatureName(FeatureToggleKeys.DESIGNER_EARNINGS)
                .orElseThrow(() -> new IllegalStateException("designerEarnings toggle row missing — seeder didn't run"));
        toggle.setEnabled(false);
        featureToggleRepository.save(toggle);

        User designer = User.builder()
                .fullName("Toggle Test Designer")
                .email("toggle-test-designer@printforge.test")
                .password(passwordEncoder.encode("throwaway"))
                .role(Role.DESIGNER)
                .build();
        designer = userRepository.save(designer);
        designerId = designer.getUserId();

        User student = User.builder()
                .fullName("Toggle Test Student")
                .email("toggle-test-student@example.com")
                .password(passwordEncoder.encode("throwaway"))
                .role(Role.STUDENT)
                .build();
        student = userRepository.save(student);
        studentId = student.getUserId();

        ModelFile file = new ModelFile();
        file.setFileName("toggle-test.stl");
        file.setFileType("model/stl");
        file.setStoredFilename("https://example.test/toggle-test.stl");
        file.setFileUrl("https://example.test/toggle-test.stl");
        file.setFileSizeBytes(500L * 1024L);
        file.setUserId(designerId);
        file = modelFileRepository.save(file);
        fileId = file.getFileId();

        DesignListing listing = new DesignListing();
        listing.setFileId(fileId);
        listing.setDesignerId(designerId);
        listing.setTitle("Toggle Test Listing");
        listing.setBasePrice(BASE_PRICE);
        listing.setStatus("PUBLISHED");
        listing.setOwnershipAttested(true);
        listing = designListingRepository.save(listing);
        listingId = listing.getId();

        Estimate estimate = estimateService.calculateAndSaveEstimate(
                fileId, "STANDARD", 20, 1, "PLA", studentId, true, listingId);
        estimateId = estimate.getId();

        Payment payment = paymentService.initiatePayment(
                estimateId, listingId, studentId, student.getEmail(), null, null);
        paymentId = payment.getId();

        String rawBody = "{\"event\":\"charge.success\",\"data\":{\"reference\":\""
                + payment.getPaystackReference() + "\"}}";
        String signature = computeHmacSha512(rawBody, paystackSecretKey);

        PaymentService spiedPaymentService = Mockito.spy(paymentService);
        Mockito.doNothing().when(spiedPaymentService).verifyWithPaystack(Mockito.anyString());

        spiedPaymentService.handleWebhook(rawBody, signature);

        Payment completedPayment = paymentRepository.findById(paymentId).orElseThrow();
        assertEquals("COMPLETED", completedPayment.getStatus(), "the order itself must still succeed");
        printJobId = completedPayment.getPrintJobId();
        assertNotNull(printJobId, "a PrintJob should still be created regardless of the earnings toggle");

        DesignListing updatedListing = designListingRepository.findById(listingId).orElseThrow();
        assertEquals(1, updatedListing.getTotalOrders(), "order count tracking is unrelated to the payout toggle");
        assertEquals(0, BigDecimal.ZERO.compareTo(updatedListing.getTotalEarnings()),
                "earnings must NOT be credited while the toggle is disabled");

        List<Notification> designerNotifications =
                notificationRepository.findByUserIdOrderByCreatedAtDesc(designerId);
        assertTrue(designerNotifications.stream().noneMatch(n -> NotificationType.LISTING_SALE.equals(n.getType())),
                "no LISTING_SALE notification should be sent while the toggle is disabled");
    }

    private static String computeHmacSha512(String body, String secretKey) throws Exception {
        Mac mac = Mac.getInstance("HmacSHA512");
        mac.init(new SecretKeySpec(secretKey.getBytes(), "HmacSHA512"));
        byte[] hash = mac.doFinal(body.getBytes());
        return HexFormat.of().formatHex(hash);
    }
}

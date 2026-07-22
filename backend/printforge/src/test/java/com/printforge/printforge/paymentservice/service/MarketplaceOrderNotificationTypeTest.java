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
 * Stage 2 — proves handleWebhook() actually sends the new specific
 * notification types (PAYMENT_CONFIRMED to the customer, LISTING_SALE to
 * the designer — the latter didn't exist as a notification at all before
 * this change), not just that the generic "success" string used to go out.
 *
 * Same real-Spring-context/real-DB/spied-verifyWithPaystack() pattern as
 * MarketplaceOrderColorNotesTest — see that test's class doc for why
 * verifyWithPaystack() specifically has to be stubbed.
 *
 * Run with: ./mvnw test -Dtest=MarketplaceOrderNotificationTypeTest
 */
@SpringBootTest
class MarketplaceOrderNotificationTypeTest {

    private static final BigDecimal BASE_PRICE = BigDecimal.valueOf(12.50);

    @Autowired PaymentService paymentService;
    @Autowired UserRepository userRepository;
    @Autowired ModelFileRepository modelFileRepository;
    @Autowired DesignListingRepository designListingRepository;
    @Autowired EstimateService estimateService;
    @Autowired EstimateRepository estimateRepository;
    @Autowired PaymentRepository paymentRepository;
    @Autowired PrintJobRepository printJobRepository;
    @Autowired NotificationRepository notificationRepository;
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
        if (studentId != null) notificationRepository.deleteAll(notificationRepository.findByUserIdOrderByCreatedAtDesc(studentId));
        if (designerId != null) notificationRepository.deleteAll(notificationRepository.findByUserIdOrderByCreatedAtDesc(designerId));
        if (printJobId != null) printJobRepository.deleteById(printJobId);
        if (paymentId != null) paymentRepository.deleteById(paymentId);
        if (estimateId != null) estimateRepository.deleteById(estimateId);
        if (listingId != null) designListingRepository.deleteById(listingId);
        if (fileId != null) modelFileRepository.deleteById(fileId);
        if (studentId != null) userRepository.deleteById(studentId);
        if (designerId != null) userRepository.deleteById(designerId);
    }

    @Test
    void completingAMarketplaceOrderNotifiesCustomerAndDesignerWithSpecificTypes() throws Exception {
        User designer = User.builder()
                .fullName("Notification Type Test Designer")
                .email("notif-type-designer@printforge.test")
                .password(passwordEncoder.encode("throwaway"))
                .role(Role.DESIGNER)
                .build();
        designer = userRepository.save(designer);
        designerId = designer.getUserId();

        User student = User.builder()
                .fullName("Notification Type Test Student")
                .email("notif-type-student@example.com")
                .password(passwordEncoder.encode("throwaway"))
                .role(Role.STUDENT)
                .build();
        student = userRepository.save(student);
        studentId = student.getUserId();

        ModelFile file = new ModelFile();
        file.setFileName("notif-type-test.stl");
        file.setFileType("model/stl");
        file.setStoredFilename("https://example.test/notif-type-test.stl");
        file.setFileUrl("https://example.test/notif-type-test.stl");
        file.setFileSizeBytes(500L * 1024L);
        file.setUserId(designerId);
        file = modelFileRepository.save(file);
        fileId = file.getFileId();

        DesignListing listing = new DesignListing();
        listing.setFileId(fileId);
        listing.setDesignerId(designerId);
        listing.setTitle("Notification Type Test Listing");
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
        printJobId = completedPayment.getPrintJobId();

        List<Notification> customerNotifications =
                notificationRepository.findByUserIdOrderByCreatedAtDesc(studentId);
        Notification paymentConfirmed = customerNotifications.stream()
                .filter(n -> NotificationType.PAYMENT_CONFIRMED.equals(n.getType()))
                .findFirst()
                .orElseThrow(() -> new AssertionError("No PAYMENT_CONFIRMED notification found for customer"));
        assertEquals("Payment Confirmed", paymentConfirmed.getTitle());

        List<Notification> designerNotifications =
                notificationRepository.findByUserIdOrderByCreatedAtDesc(designerId);
        Notification listingSale = designerNotifications.stream()
                .filter(n -> NotificationType.LISTING_SALE.equals(n.getType()))
                .findFirst()
                .orElseThrow(() -> new AssertionError("No LISTING_SALE notification found for designer"));
        assertEquals("Design Sold!", listingSale.getTitle());
        assertTrue(listingSale.getMessage().contains("Notification Type Test Listing"));
        assertTrue(listingSale.getMessage().contains("12.50"),
                "message should mention the designer's earning (basePrice): " + listingSale.getMessage());
    }

    private static String computeHmacSha512(String body, String secretKey) throws Exception {
        Mac mac = Mac.getInstance("HmacSHA512");
        mac.init(new SecretKeySpec(secretKey.getBytes(), "HmacSHA512"));
        byte[] hash = mac.doFinal(body.getBytes());
        return HexFormat.of().formatHex(hash);
    }
}

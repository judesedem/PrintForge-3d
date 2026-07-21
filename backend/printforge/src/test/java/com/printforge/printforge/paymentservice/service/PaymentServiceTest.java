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
import com.printforge.printforge.paymentservice.exception.DuplicatePaymentException;
import com.printforge.printforge.paymentservice.model.Payment;
import com.printforge.printforge.paymentservice.repository.PaymentRepository;
import com.printforge.printforge.repository.UserRepository;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Real Spring context + real DB + a real call to Paystack's test-mode
 * /transaction/initialize — same established pattern as
 * MarketplaceOrderColorNotesTest (initiatePayment() isn't spied/mocked
 * anywhere in this codebase; it always hits the real test-mode API, which
 * genuinely succeeds for a synthetic email/amount).
 *
 * Run with: ./mvnw test -Dtest=PaymentServiceTest
 */
@SpringBootTest
class PaymentServiceTest {

    @Autowired PaymentService paymentService;
    @Autowired EstimateService estimateService;
    @Autowired UserRepository userRepository;
    @Autowired EstimateRepository estimateRepository;
    @Autowired PaymentRepository paymentRepository;
    @Autowired ModelFileRepository modelFileRepository;
    @Autowired DesignListingRepository designListingRepository;
    @Autowired PasswordEncoder passwordEncoder;

    private Long studentId;
    private Long designerId;
    private Long fileId;
    private Long listingId;
    private Long estimateId;
    private final List<Long> paymentIds = new ArrayList<>();

    @AfterEach
    void cleanUp() {
        paymentIds.forEach(paymentRepository::deleteById);
        if (estimateId != null) estimateRepository.deleteById(estimateId);
        if (listingId != null) designListingRepository.deleteById(listingId);
        if (fileId != null) modelFileRepository.deleteById(fileId);
        if (studentId != null) userRepository.deleteById(studentId);
        if (designerId != null) userRepository.deleteById(designerId);
    }

    private void setUpStudentAndEstimate(String emailSuffix) {
        User student = User.builder()
                .fullName("Duplicate Payment Test Student")
                .email("duplicate-payment-test-" + emailSuffix + "@example.com")
                .password(passwordEncoder.encode("throwaway"))
                .role(Role.STUDENT)
                .build();
        student = userRepository.save(student);
        studentId = student.getUserId();

        Estimate estimate = new Estimate();
        estimate.setUserId(studentId);
        estimate.setQuality("STANDARD");
        estimate.setInfillPercent(20);
        estimate.setQuantity(1);
        estimate.setMaterialType("PLA");
        estimate.setEstimatedGrams(10.0);
        estimate.setDurationMinutes(30.0);
        estimate.setTotalCost(5.0);
        estimate = estimateRepository.save(estimate);
        estimateId = estimate.getId();
    }

    @Test
    void secondInitiatePaymentOnSameEstimateWhileFirstIsPendingIsRejected() {
        setUpStudentAndEstimate("pending-guard");
        User student = userRepository.findById(studentId).orElseThrow();

        Payment first = paymentService.initiatePayment(
                estimateId, null, studentId, student.getEmail(), null, null);
        paymentIds.add(first.getId());
        assertEquals("PENDING", first.getStatus());

        DuplicatePaymentException ex = assertThrows(DuplicatePaymentException.class,
                () -> paymentService.initiatePayment(
                        estimateId, null, studentId, student.getEmail(), null, null));
        assertTrue(ex.getMessage().contains("pending payment already exists"));
    }

    @Test
    void newInitiatePaymentSucceedsAfterThePriorOneIsCompleted() {
        setUpStudentAndEstimate("completed-retry");
        User student = userRepository.findById(studentId).orElseThrow();

        Payment first = paymentService.initiatePayment(
                estimateId, null, studentId, student.getEmail(), null, null);
        paymentIds.add(first.getId());

        // Simulate the webhook having already marked this one COMPLETED —
        // this test is only about initiatePayment()'s guard, not the full
        // webhook flow (covered separately by MarketplaceOrderColorNotesTest
        // and friends).
        first.setStatus("COMPLETED");
        paymentRepository.save(first);

        Payment second = assertDoesNotThrow(() -> paymentService.initiatePayment(
                estimateId, null, studentId, student.getEmail(), null, null));
        paymentIds.add(second.getId());

        assertEquals("PENDING", second.getStatus());
        assertNotEquals(first.getId(), second.getId());
    }

    @Test
    void initiatePaymentChargesTheLockedBasePriceNotTheLiveListingPrice() {
        User designer = User.builder()
                .fullName("Price Lock Test Designer")
                .email("price-lock-test-designer@example.com")
                .password(passwordEncoder.encode("throwaway"))
                .role(Role.DESIGNER)
                .build();
        designer = userRepository.save(designer);
        designerId = designer.getUserId();

        User student = User.builder()
                .fullName("Price Lock Test Student")
                .email("price-lock-test-student@example.com")
                .password(passwordEncoder.encode("throwaway"))
                .role(Role.STUDENT)
                .build();
        student = userRepository.save(student);
        studentId = student.getUserId();

        ModelFile file = new ModelFile();
        file.setFileName("price-lock-test.stl");
        file.setFileType("model/stl");
        file.setStoredFilename("https://example.test/price-lock-test.stl");
        file.setFileUrl("https://example.test/price-lock-test.stl");
        file.setFileSizeBytes(500L * 1024L);
        file.setUserId(designerId);
        file = modelFileRepository.save(file);
        fileId = file.getFileId();

        DesignListing listing = new DesignListing();
        listing.setFileId(fileId);
        listing.setDesignerId(designerId);
        listing.setTitle("Price Lock Test Listing");
        listing.setBasePrice(new BigDecimal("10.00"));
        listing.setStatus("PUBLISHED");
        listing.setOwnershipAttested(true);
        listing = designListingRepository.save(listing);
        listingId = listing.getId();

        // Quote generated (browsing the listing / submitting the order) —
        // snapshots basePrice=10.00 onto the estimate right now.
        Estimate estimate = estimateService.calculateAndSaveEstimate(
                fileId, "STANDARD", 20, 1, "PLA", studentId, true, listingId);
        estimateId = estimate.getId();
        assertEquals(0, new BigDecimal("10.00").compareTo(estimate.getLockedBasePrice()));

        // Designer changes the price after the quote was already shown.
        listing.setBasePrice(new BigDecimal("99.00"));
        designListingRepository.save(listing);

        Payment payment = paymentService.initiatePayment(
                estimateId, listingId, studentId, student.getEmail(), null, null);
        paymentIds.add(payment.getId());

        double expectedTotal = estimate.getTotalCost() + 10.00;
        assertEquals(0, BigDecimal.valueOf(expectedTotal).compareTo(payment.getAmount()),
                "payment should reflect the 10.00 quoted price, not the changed 99.00");
    }

    @Test
    void byofPaymentWithNoListingIsUnaffectedAndChargesOnlyTheEstimateTotal() {
        setUpStudentAndEstimate("byof-no-listing");
        User student = userRepository.findById(studentId).orElseThrow();
        Estimate estimate = estimateRepository.findById(estimateId).orElseThrow();
        assertNull(estimate.getLockedBasePrice());

        Payment payment = paymentService.initiatePayment(
                estimateId, null, studentId, student.getEmail(), null, null);
        paymentIds.add(payment.getId());

        assertEquals(0, BigDecimal.valueOf(estimate.getTotalCost()).compareTo(payment.getAmount()));
    }
}

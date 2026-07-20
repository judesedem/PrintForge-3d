package com.printforge.printforge;

import com.printforge.printforge.entity.Role;
import com.printforge.printforge.entity.User;
import com.printforge.printforge.estimateservice.model.Estimate;
import com.printforge.printforge.estimateservice.repository.EstimateRepository;
import com.printforge.printforge.facade.PrintJobFacadeController;
import com.printforge.printforge.facade.dto.OrderAwaitingPaymentResponse;
import com.printforge.printforge.fileservice.model.ModelFile;
import com.printforge.printforge.fileservice.repository.ModelFileRepository;
import com.printforge.printforge.marketplaceservice.model.DesignListing;
import com.printforge.printforge.marketplaceservice.repository.DesignListingRepository;
import com.printforge.printforge.paymentservice.model.Payment;
import com.printforge.printforge.paymentservice.repository.PaymentRepository;
import com.printforge.printforge.paymentservice.service.PaymentService;
import com.printforge.printforge.repository.UserRepository;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.math.BigDecimal;
import java.util.Map;
import java.util.Set;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Marketplace-order double-charge bug — real Spring context + real DB (+ a
 * real call to Paystack's test-mode API, since that's the only way to
 * actually observe the "Paystack initialize amount" stage the task asks to
 * trace, not just infer it from reading the code).
 *
 * Reproduces the exact live sequence a marketplace purchase is meant to
 * follow: POST /api/print-jobs (PrintJobFacadeController.submitMarketplaceOrder,
 * called directly here — same direct-invocation convention as
 * FileControllerTest) followed by POST /api/payments/initiate
 * (PaymentService.initiatePayment) using the estimateId/listingId the first
 * call returned — exactly what a client is expected to chain per
 * OrderAwaitingPaymentResponse's own javadoc.
 *
 * The expected lab cost is computed independently here, duplicating
 * EstimateService's formula against a file of a known, fixed size — not
 * read back from the Estimate row — so this test can't be fooled by the
 * bug it's checking for (an Estimate row that already has basePrice baked
 * into totalCost would make a "read the estimate, add basePrice, compare"
 * assertion pass even when doubled).
 *
 * Run with: ./mvnw test -Dtest=MarketplaceOrderChargeTest
 */
@SpringBootTest
class MarketplaceOrderChargeTest {

    // 500 KB file. estimatedGrams = (500*1024/1024)*0.8 = 400g.
    // STANDARD quality (x1.0), 20% infill (x0.7), qty 1, PLA (2.5 min/g, $0.05/g):
    // durationMinutes = 2.5 * 400 * 1.0 * 0.7 * 1 = 700
    // machineTimeCost = 700 * 0.02 = 14.00
    // physicalMaterialCost = 400 * 0.05 * 1 = 20.00
    // expected lab cost = 34.00
    private static final long TEST_FILE_SIZE_BYTES = 500L * 1024L;
    private static final double EXPECTED_LAB_COST = 34.00;
    private static final BigDecimal BASE_PRICE = BigDecimal.valueOf(15.00);

    @Autowired PrintJobFacadeController facadeController;
    @Autowired PaymentService paymentService;
    @Autowired UserRepository userRepository;
    @Autowired ModelFileRepository modelFileRepository;
    @Autowired DesignListingRepository designListingRepository;
    @Autowired EstimateRepository estimateRepository;
    @Autowired PaymentRepository paymentRepository;
    @Autowired PasswordEncoder passwordEncoder;

    private Long studentId;
    private Long designerId;
    private Long fileId;
    private Long listingId;
    private Long estimateId;
    private Long paymentId;

    @AfterEach
    void cleanUp() {
        if (paymentId != null) paymentRepository.deleteById(paymentId);
        if (estimateId != null) estimateRepository.deleteById(estimateId);
        if (listingId != null) designListingRepository.deleteById(listingId);
        if (fileId != null) modelFileRepository.deleteById(fileId);
        if (studentId != null) userRepository.deleteById(studentId);
        if (designerId != null) userRepository.deleteById(designerId);
    }

    @Test
    void marketplaceOrderChargesBasePriceExactlyOnce() {
        User designer = User.builder()
                .fullName("Double-Charge Test Designer")
                .email("double-charge-designer@printforge.test")
                .password(passwordEncoder.encode("throwaway"))
                .role(Role.DESIGNER)
                .build();
        designer = userRepository.save(designer);
        designerId = designer.getUserId();

        User student = User.builder()
                .fullName("Double-Charge Test Student")
                .email("double-charge-student@example.com")
                .password(passwordEncoder.encode("throwaway"))
                .role(Role.STUDENT)
                .build();
        student = userRepository.save(student);
        studentId = student.getUserId();

        ModelFile file = new ModelFile();
        file.setFileName("double-charge-test.stl");
        file.setFileType("model/stl");
        file.setStoredFilename("https://example.test/double-charge-test.stl");
        file.setFileUrl("https://example.test/double-charge-test.stl");
        file.setFileSizeBytes(TEST_FILE_SIZE_BYTES);
        file.setUserId(designerId);
        file = modelFileRepository.save(file);
        fileId = file.getFileId();

        DesignListing listing = new DesignListing();
        listing.setFileId(fileId);
        listing.setDesignerId(designerId);
        listing.setTitle("Double-Charge Test Listing");
        listing.setBasePrice(BASE_PRICE);
        listing.setStatus("PUBLISHED");
        listing.setOwnershipAttested(true);
        listing = designListingRepository.save(listing);
        listingId = listing.getId();

        Authentication studentAuth = new UsernamePasswordAuthenticationToken(
                student.getEmail(), null, Set.of(new SimpleGrantedAuthority("ROLE_STUDENT")));

        // Step 1: POST /api/print-jobs — creates/reuses the Estimate.
        ResponseEntity<OrderAwaitingPaymentResponse> orderResponse =
                facadeController.submitMarketplaceOrder(Map.of("listing_id", listingId), studentAuth);
        Estimate estimateAfterSubmit = orderResponse.getBody().getEstimate();
        estimateId = estimateAfterSubmit.getId();

        // Step 2: POST /api/payments/initiate — this is the real, live call
        // to Paystack's test-mode /transaction/initialize endpoint.
        // color/notes are irrelevant to this test's concern (charge
        // amount), passed null — see MarketplaceOrderColorNotesTest for
        // that coverage.
        Payment payment = paymentService.initiatePayment(
                estimateId, listingId, studentId, student.getEmail(), null, null);
        paymentId = payment.getId();

        double expectedTotal = EXPECTED_LAB_COST + BASE_PRICE.doubleValue();
        double doubledTotal = EXPECTED_LAB_COST + 2 * BASE_PRICE.doubleValue();

        assertEquals(expectedTotal, payment.getAmount().doubleValue(), 0.01,
                "Payment.amount should be labCost + basePrice exactly once (" + expectedTotal
                        + "), not " + doubledTotal + " (labCost + 2x basePrice). Got: " + payment.getAmount());

        // Independent check on the intermediate Estimate row: after the fix,
        // submitMarketplaceOrder() must not have mutated totalCost to
        // include basePrice — that's what causes initiatePayment() (which
        // separately adds basePrice) to double it.
        Estimate persistedEstimate = estimateRepository.findById(estimateId).orElseThrow();
        assertEquals(EXPECTED_LAB_COST, persistedEstimate.getTotalCost(), 0.01,
                "Estimate.totalCost should stay pure lab cost — basePrice must be added exactly once, "
                        + "at payment-initiation time, not baked into the Estimate row too.");
    }
}

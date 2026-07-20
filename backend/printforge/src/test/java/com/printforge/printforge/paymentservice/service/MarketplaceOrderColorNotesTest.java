package com.printforge.printforge.paymentservice.service;

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
import com.printforge.printforge.queueservice.model.PrintJob;
import com.printforge.printforge.queueservice.repository.PrintJobRepository;
import com.printforge.printforge.repository.UserRepository;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.crypto.password.PasswordEncoder;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.math.BigDecimal;
import java.util.HexFormat;
import java.util.Map;
import java.util.Set;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Gap 1 — proves color/notes survive the full order -> payment -> webhook
 * chain into the created PrintJob, not just that the setters exist.
 *
 * Real Spring context + real DB + a real call to Paystack's test-mode
 * /transaction/initialize (same as MarketplaceOrderChargeTest). The one
 * thing that can't be driven for real here: PaymentService.handleWebhook()
 * re-verifies with Paystack's /transaction/verify before creating the
 * PrintJob, and an initiated-but-never-actually-paid test reference
 * reports "abandoned" (confirmed empirically against the real API, not
 * assumed) — there is no way to make Paystack report "success" for a
 * transaction nobody completed without driving a full card/OTP charge
 * simulation, which is disproportionate for what this test needs to prove.
 * So this spies the real PaymentService bean and stubs out just that one
 * external call (now protected specifically to allow this — see its
 * javadoc) — everything else (HMAC signature verification, PrintJob
 * creation, the color/notes copy this test exists to check) runs for
 * real, unmocked.
 *
 * Run with: ./mvnw test -Dtest=MarketplaceOrderColorNotesTest
 */
@SpringBootTest
class MarketplaceOrderColorNotesTest {

    private static final long TEST_FILE_SIZE_BYTES = 500L * 1024L;
    private static final BigDecimal BASE_PRICE = BigDecimal.valueOf(15.00);
    private static final String COLOR = "Black";
    private static final String NOTES = "use a raft";

    @Autowired PrintJobFacadeController facadeController;
    @Autowired PaymentService paymentService;
    @Autowired UserRepository userRepository;
    @Autowired ModelFileRepository modelFileRepository;
    @Autowired DesignListingRepository designListingRepository;
    @Autowired EstimateRepository estimateRepository;
    @Autowired PaymentRepository paymentRepository;
    @Autowired PrintJobRepository printJobRepository;
    @Autowired PasswordEncoder passwordEncoder;

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
        if (printJobId != null) printJobRepository.deleteById(printJobId);
        if (paymentId != null) paymentRepository.deleteById(paymentId);
        if (estimateId != null) estimateRepository.deleteById(estimateId);
        if (listingId != null) designListingRepository.deleteById(listingId);
        if (fileId != null) modelFileRepository.deleteById(fileId);
        if (studentId != null) userRepository.deleteById(studentId);
        if (designerId != null) userRepository.deleteById(designerId);
    }

    @Test
    void colorAndNotesSurviveIntoTheCreatedPrintJob() throws Exception {
        User designer = User.builder()
                .fullName("Color-Notes Test Designer")
                .email("color-notes-designer@printforge.test")
                .password(passwordEncoder.encode("throwaway"))
                .role(Role.DESIGNER)
                .build();
        designer = userRepository.save(designer);
        designerId = designer.getUserId();

        User student = User.builder()
                .fullName("Color-Notes Test Student")
                .email("color-notes-student@example.com")
                .password(passwordEncoder.encode("throwaway"))
                .role(Role.STUDENT)
                .build();
        student = userRepository.save(student);
        studentId = student.getUserId();

        ModelFile file = new ModelFile();
        file.setFileName("color-notes-test.stl");
        file.setFileType("model/stl");
        file.setStoredFilename("https://example.test/color-notes-test.stl");
        file.setFileUrl("https://example.test/color-notes-test.stl");
        file.setFileSizeBytes(TEST_FILE_SIZE_BYTES);
        file.setUserId(designerId);
        file = modelFileRepository.save(file);
        fileId = file.getFileId();

        DesignListing listing = new DesignListing();
        listing.setFileId(fileId);
        listing.setDesignerId(designerId);
        listing.setTitle("Color-Notes Test Listing");
        listing.setBasePrice(BASE_PRICE);
        listing.setStatus("PUBLISHED");
        listing.setOwnershipAttested(true);
        listing = designListingRepository.save(listing);
        listingId = listing.getId();

        Authentication studentAuth = new UsernamePasswordAuthenticationToken(
                student.getEmail(), null, Set.of(new SimpleGrantedAuthority("ROLE_STUDENT")));

        // Step 1: POST /api/print-jobs with color + notes in the body.
        Map<String, Object> body = Map.of(
                "listing_id", listingId,
                "color", COLOR,
                "notes", NOTES
        );
        ResponseEntity<OrderAwaitingPaymentResponse> orderResponse =
                facadeController.submitMarketplaceOrder(body, studentAuth);
        OrderAwaitingPaymentResponse orderBody = orderResponse.getBody();
        assertEquals(COLOR, orderBody.getColor(), "submitMarketplaceOrder() should echo color back");
        assertEquals(NOTES, orderBody.getNotes(), "submitMarketplaceOrder() should echo notes back");
        Estimate estimateAfterSubmit = orderBody.getEstimate();
        estimateId = estimateAfterSubmit.getId();

        // Step 2: POST /api/payments/initiate, forwarding color/notes —
        // this is what actually lands them on the Payment row. Real call
        // to Paystack's test-mode /transaction/initialize.
        Payment payment = paymentService.initiatePayment(
                estimateId, listingId, studentId, student.getEmail(), COLOR, NOTES);
        paymentId = payment.getId();
        assertEquals(COLOR, payment.getColor());
        assertEquals(NOTES, payment.getNotes());

        // Step 3: simulate Paystack's webhook call with a genuinely
        // HMAC-signed "charge.success" payload for this payment's real
        // reference — same HMAC-SHA512 algorithm as
        // PaymentService.isValidSignature().
        String rawBody = "{\"event\":\"charge.success\",\"data\":{\"reference\":\""
                + payment.getPaystackReference() + "\"}}";
        String signature = computeHmacSha512(rawBody, paystackSecretKey);

        // verifyWithPaystack() (the real re-verification call inside
        // handleWebhook()) can't be driven to "success" for a reference
        // nobody actually paid — stub out just that one call on a spy of
        // the real, fully-wired PaymentService bean. Everything else
        // (signature check, PrintJob creation, the color/notes copy)
        // executes for real.
        PaymentService spiedPaymentService = Mockito.spy(paymentService);
        Mockito.doNothing().when(spiedPaymentService).verifyWithPaystack(Mockito.anyString());

        spiedPaymentService.handleWebhook(rawBody, signature);

        Payment completedPayment = paymentRepository.findById(paymentId).orElseThrow();
        assertEquals("COMPLETED", completedPayment.getStatus());
        assertNotNull(completedPayment.getPrintJobId(), "handleWebhook() should have created and linked a PrintJob");
        printJobId = completedPayment.getPrintJobId();

        PrintJob createdJob = printJobRepository.findById(printJobId).orElseThrow();
        assertEquals(COLOR, createdJob.getColor(), "PrintJob.color should match what was submitted");
        assertEquals(NOTES, createdJob.getNotes(), "PrintJob.notes should match what was submitted");
    }

    private static String computeHmacSha512(String body, String secretKey) throws Exception {
        Mac mac = Mac.getInstance("HmacSHA512");
        mac.init(new SecretKeySpec(secretKey.getBytes(), "HmacSHA512"));
        byte[] hash = mac.doFinal(body.getBytes());
        return HexFormat.of().formatHex(hash);
    }
}

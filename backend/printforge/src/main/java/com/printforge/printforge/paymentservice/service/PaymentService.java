package com.printforge.printforge.paymentservice.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.printforge.printforge.estimateservice.model.Estimate;
import com.printforge.printforge.estimateservice.repository.EstimateRepository;
import com.printforge.printforge.estimateservice.exception.EstimateNotFoundException;
import com.printforge.printforge.marketplaceservice.model.DesignListing;
import com.printforge.printforge.marketplaceservice.repository.DesignListingRepository;
import com.printforge.printforge.paymentservice.exception.PaymentFailedException;
import com.printforge.printforge.paymentservice.exception.PaymentNotFoundException;
import com.printforge.printforge.paymentservice.model.Payment;
import com.printforge.printforge.paymentservice.repository.PaymentRepository;
import com.printforge.printforge.notificationservice.service.NotificationService;
import com.printforge.printforge.queueservice.model.PrintJob;
import com.printforge.printforge.queueservice.repository.PrintJobRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.math.BigDecimal;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.LocalDateTime;
import java.util.HexFormat;
import java.util.List;
import java.util.UUID;

@Service
public class PaymentService {

    private static final String PAYSTACK_INITIALIZE_URL = "https://api.paystack.co/transaction/initialize";
    private static final String PAYSTACK_VERIFY_URL     = "https://api.paystack.co/transaction/verify/";

    private final PaymentRepository paymentRepository;
    private final EstimateRepository estimateRepository;
    private final DesignListingRepository listingRepository;
    private final PrintJobRepository printJobRepository;
    private final NotificationService notificationService;
    private final HttpClient httpClient;
    private final ObjectMapper objectMapper;

    @Value("${paystack.secret-key}")
    private String paystackSecretKey;

    public PaymentService(PaymentRepository paymentRepository,
                          EstimateRepository estimateRepository,
                          DesignListingRepository listingRepository,
                          PrintJobRepository printJobRepository,
                          NotificationService notificationService) {
        this.paymentRepository  = paymentRepository;
        this.estimateRepository = estimateRepository;
        this.listingRepository  = listingRepository;
        this.printJobRepository = printJobRepository;
        this.notificationService = notificationService;
        this.httpClient  = HttpClient.newHttpClient();
        this.objectMapper = new ObjectMapper();
    }

    /**
     * Step 1 — called by POST /api/payments/initiate.
     *
     * Looks up the estimate, adds the listing base_price if this is a marketplace
     * order, calls Paystack to get a hosted checkout URL, saves a PENDING Payment
     * record, and returns it. The frontend redirects the user to checkoutUrl.
     */
    public Payment initiatePayment(Long estimateId, Long listingId, Long userId, String userEmail) {

        Estimate estimate = estimateRepository.findById(estimateId)
                .orElseThrow(() -> new EstimateNotFoundException(estimateId));

        // Previously any authenticated user could pay for someone else's
        // estimate just by guessing/incrementing the id — nothing checked
        // that the estimate actually belonged to the caller.
        if (!estimate.getUserId().equals(userId)) {
            throw new AccessDeniedException("You can only pay for your own estimates");
        }

        // Total = machine+material cost from estimate + designer's base_price (if marketplace)
        double totalCost = estimate.getTotalCost();
        if (listingId != null) {
            DesignListing listing = listingRepository.findById(listingId)
                    .orElseThrow(() -> new IllegalArgumentException("Listing not found: " + listingId));
            if (listing.getBasePrice() != null) {
                totalCost += listing.getBasePrice().doubleValue();
            }
        }

        // Paystack expects amount in the smallest currency unit (pesewas for GHS)
        long amountInPesewas = Math.round(totalCost * 100);

        // Unique reference so we can match the webhook back to this Payment row
        String reference = "PF-" + UUID.randomUUID().toString().replace("-", "").substring(0, 16).toUpperCase();

        // Call Paystack /transaction/initialize
        String checkoutUrl = callPaystackInitialize(userEmail, amountInPesewas, reference);

        Payment payment = new Payment();
        payment.setUserId(userId);
        payment.setEstimateId(estimateId);
        payment.setListingId(listingId);
        payment.setAmount(BigDecimal.valueOf(totalCost));
        payment.setPaystackReference(reference);
        payment.setCheckoutUrl(checkoutUrl);
        // status defaults to PENDING via @PrePersist

        return paymentRepository.save(payment);
    }

    /**
     * Step 2 — called by POST /api/payments/webhook (Paystack pushes here).
     *
     * Verifies the HMAC signature so we know the request is genuinely from
     * Paystack, then calls /transaction/verify to confirm the status server-side
     * (never trust the webhook body alone — always re-verify). On success:
     *   - marks Payment COMPLETED
     *   - creates the PrintJob (the gate: no payment → no job)
     *   - links printJobId back on the Payment row
     *   - updates DesignListing.totalOrders / totalEarnings if marketplace order
     */
    public void handleWebhook(String rawBody, String paystackSignature) {

        // 1. Verify HMAC-SHA512 signature
        if (!isValidSignature(rawBody, paystackSignature)) {
            throw new PaymentFailedException("Invalid Paystack webhook signature");
        }

        // 2. Parse the event
        JsonNode event;
        try {
            event = objectMapper.readTree(rawBody);
        } catch (Exception e) {
            throw new PaymentFailedException("Could not parse webhook body: " + e.getMessage());
        }

        String eventType = event.path("event").asText();
        if ("charge.failed".equals(eventType)) {
            String reference = event.path("data").path("reference").asText();
            paymentRepository.findByPaystackReference(reference).ifPresent(payment -> {
                if (!"COMPLETED".equals(payment.getStatus())) {
                    payment.setStatus("FAILED");
                    paymentRepository.save(payment);
                }
            });
            return;
        }

        if (!"charge.success".equals(eventType)) {
            // All other event types are ignored
            return;
        }

        String reference = event.path("data").path("reference").asText();

        Payment payment = paymentRepository.findByPaystackReference(reference)
                .orElseThrow(() -> new PaymentNotFoundException(reference));

        // Idempotency guard — webhook can fire more than once
        if ("COMPLETED".equals(payment.getStatus())) return;

        // 3. Re-verify with Paystack API (don't trust the webhook body alone)
        verifyWithPaystack(reference);

        // 4. Mark payment complete
        payment.setStatus("COMPLETED");
        payment.setCompletedAt(LocalDateTime.now());

        // 5. Create the PrintJob — this is the gate.
        // Pull print parameters from the linked Estimate so that lab staff
        // see a fully-populated job in the queue view, not a row of nulls.
        // color and notes have no source here (they are captured at
        // submission time in the facade, never sent to EstimateService),
        // so they are left null — honest rather than fabricated.
        Estimate linkedEstimate = estimateRepository.findById(payment.getEstimateId())
                .orElseThrow(() -> new EstimateNotFoundException(payment.getEstimateId()));

        PrintJob job = new PrintJob();
        job.setFileId(resolveFileId(payment));
        job.setEstimateId(payment.getEstimateId());
        job.setUserId(payment.getUserId());
        job.setMaterial(linkedEstimate.getMaterialType());
        job.setQuantity(linkedEstimate.getQuantity());
        // infillPercent is stored as an integer (e.g. 20); normalise to the
        // "20%" string format the rest of the app uses on PrintJob.infill
        job.setInfill(linkedEstimate.getInfillPercent() != null
                ? linkedEstimate.getInfillPercent() + "%" : null);
        job.setQuality(linkedEstimate.getQuality());
        // status defaults to SUBMITTED via @PrePersist on PrintJob
        PrintJob savedJob = printJobRepository.save(job);

        // 6. Link the job back to the payment
        payment.setPrintJobId(savedJob.getId());
        paymentRepository.save(payment);

        // 7. Notify user — payment confirmed, job is in the queue
        notificationService.createNotification(
                payment.getUserId(),
                "Payment Confirmed",
                "Your payment was successful. Your print job has been submitted and is in the queue.",
                "success");

        // 8. Update marketplace listing stats if this was a marketplace order.
        // This is the single place earnings are recorded — the facade no longer
        // increments at submission time to avoid double-counting on payment
        // confirmation.
        // totalEarnings tracks what the designer earns, which is basePrice only
        // (not the full payment.getAmount(), which also includes the machine and
        // material cost that goes to the lab, not the designer).
        if (payment.getListingId() != null) {
            listingRepository.findById(payment.getListingId()).ifPresent(listing -> {
                listing.setTotalOrders(listing.getTotalOrders() + 1);
                BigDecimal designerEarning = listing.getBasePrice() != null
                        ? listing.getBasePrice() : BigDecimal.ZERO;
                BigDecimal prev = listing.getTotalEarnings() != null
                        ? listing.getTotalEarnings() : BigDecimal.ZERO;
                listing.setTotalEarnings(prev.add(designerEarning));
                listingRepository.save(listing);
            });
        }
    }

    public Payment retryPayment(Long paymentId, Long callerId, String userEmail) {

        Payment payment = paymentRepository.findById(paymentId)
                .orElseThrow(() -> new PaymentNotFoundException(paymentId));

        if (!payment.getUserId().equals(callerId)) {
            throw new PaymentFailedException("You can only retry your own payments");
        }

        if ("COMPLETED".equals(payment.getStatus())) {
            throw new PaymentFailedException("Payment is already completed — a print job was created");
        }

        // Fresh reference — Paystack rejects a reference it has seen before
        String newReference = "PF-" + java.util.UUID.randomUUID().toString().replace("-", "").substring(0, 16).toUpperCase();

        // Amount is already stored in pesewas-convertible form on the record
        long amountInPesewas = payment.getAmount().multiply(java.math.BigDecimal.valueOf(100)).longValue();

        String newCheckoutUrl = callPaystackInitialize(userEmail, amountInPesewas, newReference);

        payment.setPaystackReference(newReference);
        payment.setCheckoutUrl(newCheckoutUrl);
        payment.setStatus("PENDING");
        payment.setCompletedAt(null);

        return paymentRepository.save(payment);
    }

    public Payment getPaymentById(Long id) {
        return paymentRepository.findById(id)
                .orElseThrow(() -> new PaymentNotFoundException(id));
    }

    public List<Payment> getPaymentsForUser(Long userId) {
        return paymentRepository.findByUserId(userId);
    }

    // ── Private helpers ───────────────────────────────────────────────────────

    private String callPaystackInitialize(String email, long amountInPesewas, String reference) {
        try {
            String body = String.format(
                    "{\"email\":\"%s\",\"amount\":%d,\"reference\":\"%s\",\"currency\":\"GHS\"}",
                    email, amountInPesewas, reference
            );

            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(PAYSTACK_INITIALIZE_URL))
                    .header("Authorization", "Bearer " + paystackSecretKey)
                    .header("Content-Type", "application/json")
                    .POST(HttpRequest.BodyPublishers.ofString(body))
                    .build();

            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
            JsonNode json = objectMapper.readTree(response.body());

            if (!json.path("status").asBoolean()) {
                throw new PaymentFailedException("Paystack initialization failed: " + json.path("message").asText());
            }

            return json.path("data").path("authorization_url").asText();

        } catch (PaymentFailedException e) {
            throw e;
        } catch (Exception e) {
            throw new PaymentFailedException("Could not reach Paystack: " + e.getMessage());
        }
    }

    private void verifyWithPaystack(String reference) {
        try {
            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(PAYSTACK_VERIFY_URL + reference))
                    .header("Authorization", "Bearer " + paystackSecretKey)
                    .GET()
                    .build();

            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
            JsonNode json = objectMapper.readTree(response.body());

            String txStatus = json.path("data").path("status").asText();
            if (!"success".equals(txStatus)) {
                throw new PaymentFailedException("Paystack verification returned status: " + txStatus);
            }
        } catch (PaymentFailedException e) {
            throw e;
        } catch (Exception e) {
            throw new PaymentFailedException("Could not verify transaction with Paystack: " + e.getMessage());
        }
    }

    /**
     * Resolves the file ID to attach to the PrintJob.
     * For marketplace orders: pull fileId from the listing.
     * For direct (own-file) orders: pull fileId from the estimate.
     */
    private Long resolveFileId(Payment payment) {
        if (payment.getListingId() != null) {
            return listingRepository.findById(payment.getListingId())
                    .orElseThrow(() -> new IllegalStateException("Listing not found during job creation"))
                    .getFileId();
        }
        return estimateRepository.findById(payment.getEstimateId())
                .orElseThrow(() -> new EstimateNotFoundException(payment.getEstimateId()))
                .getFileId();
    }

    /**
     * Verifies the X-Paystack-Signature header using HMAC-SHA512.
     * Paystack signs the raw request body with your secret key.
     */
    private boolean isValidSignature(String rawBody, String signature) {
        if (signature == null) return false;
        try {
            Mac mac = Mac.getInstance("HmacSHA512");
            mac.init(new SecretKeySpec(paystackSecretKey.getBytes(), "HmacSHA512"));
            byte[] hash = mac.doFinal(rawBody.getBytes());
            String computedHmac = HexFormat.of().formatHex(hash);

            // MessageDigest.isEqual() instead of String.equals()/equalsIgnoreCase()
            // — those short-circuit on the first mismatched character, and the
            // time taken to reject a bad signature leaks how many leading bytes
            // were correct, letting an attacker forge a valid one byte-by-byte.
            // Lowercased first to keep the same case-insensitive behavior
            // equalsIgnoreCase() had.
            byte[] expected = computedHmac.toLowerCase().getBytes(StandardCharsets.UTF_8);
            byte[] actual = signature.toLowerCase().getBytes(StandardCharsets.UTF_8);
            return MessageDigest.isEqual(expected, actual);
        } catch (Exception e) {
            return false;
        }
    }
}

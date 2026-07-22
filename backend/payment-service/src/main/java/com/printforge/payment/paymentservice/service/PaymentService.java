package com.printforge.payment.paymentservice.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.printforge.payment.estimateservice.model.Estimate;
import com.printforge.payment.estimateservice.repository.EstimateRepository;
import com.printforge.payment.estimateservice.exception.EstimateNotFoundException;
import com.printforge.payment.marketplaceservice.repository.DesignListingRepository;
import com.printforge.payment.paymentservice.exception.DuplicatePaymentException;
import com.printforge.payment.paymentservice.exception.PaymentFailedException;
import com.printforge.payment.paymentservice.exception.PaymentNotFoundException;
import com.printforge.payment.paymentservice.model.Payment;
import com.printforge.payment.paymentservice.repository.PaymentRepository;
import com.printforge.payment.notificationservice.model.NotificationType;
import com.printforge.payment.notificationservice.service.NotificationService;
import com.printforge.payment.queueservice.model.PrintJob;
import com.printforge.payment.queueservice.repository.PrintJobRepository;
import com.printforge.payment.settingsservice.model.FeatureToggle;
import com.printforge.payment.settingsservice.model.FeatureToggleKeys;
import com.printforge.payment.settingsservice.repository.FeatureToggleRepository;
import lombok.extern.slf4j.Slf4j;
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
import java.net.http.HttpTimeoutException;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.Duration;
import java.time.LocalDateTime;
import java.util.HexFormat;
import java.util.List;
import java.util.UUID;

@Slf4j
@Service
public class PaymentService {

    private static final String PAYSTACK_INITIALIZE_URL = "https://api.paystack.co/transaction/initialize";
    private static final String PAYSTACK_VERIFY_URL     = "https://api.paystack.co/transaction/verify/";

    private final PaymentRepository paymentRepository;
    private final EstimateRepository estimateRepository;
    private final DesignListingRepository listingRepository;
    private final PrintJobRepository printJobRepository;
    private final NotificationService notificationService;
    private final FeatureToggleRepository featureToggleRepository;
    private final HttpClient httpClient;
    private final ObjectMapper objectMapper;

    @Value("${paystack.secret-key}")
    private String paystackSecretKey;

    public PaymentService(PaymentRepository paymentRepository,
                          EstimateRepository estimateRepository,
                          DesignListingRepository listingRepository,
                          PrintJobRepository printJobRepository,
                          NotificationService notificationService,
                          FeatureToggleRepository featureToggleRepository) {
        this.paymentRepository  = paymentRepository;
        this.estimateRepository = estimateRepository;
        this.listingRepository  = listingRepository;
        this.printJobRepository = printJobRepository;
        this.notificationService = notificationService;
        this.featureToggleRepository = featureToggleRepository;
        // Connect timeout only bounds establishing the TCP/TLS connection —
        // it does not bound waiting for a response once connected, which is
        // why each individual HttpRequest below also sets its own .timeout().
        // Without either, a slow/hung Paystack leaves the request thread
        // blocked on the OS-level TCP timeout (effectively unbounded from
        // this app's perspective) instead of failing in a controlled way.
        this.httpClient = HttpClient.newBuilder()
                .connectTimeout(Duration.ofSeconds(5))
                .build();
        this.objectMapper = new ObjectMapper();
    }

    /**
     * Step 1 — called by POST /api/payments/initiate.
     *
     * Looks up the estimate, adds the listing base_price if this is a marketplace
     * order, calls Paystack to get a hosted checkout URL, saves a PENDING Payment
     * record, and returns it. The frontend redirects the user to checkoutUrl.
     *
     * color/notes (both nullable) are captured at order-submission time
     * (PrintJobFacadeController.submitMarketplaceOrder()/submitJob()) and
     * carried here by the caller so they land on the Payment row —
     * handleWebhook() later copies them onto the PrintJob it creates. They
     * play no part in the charge amount.
     */
    public Payment initiatePayment(Long estimateId, Long listingId, Long userId, String userEmail,
                                    String color, String notes) {

        Estimate estimate = estimateRepository.findById(estimateId)
                .orElseThrow(() -> new EstimateNotFoundException(estimateId));

        // Tapping Pay Now twice quickly used to create two separate PENDING
        // Payment rows (each with its own Paystack reference) for the same
        // estimate — the webhook's idempotency guard above only protects
        // against Paystack retrying one already-known reference, not two
        // distinct PENDING rows. A COMPLETED payment doesn't block a new
        // one: that's a legitimate retry/re-order case, e.g. after a first
        // order's job is done and the user wants another.
        paymentRepository.findByEstimateIdAndStatus(estimateId, "PENDING")
                .ifPresent(existing -> {
                    throw new DuplicatePaymentException(
                            "A pending payment already exists for this estimate. " +
                                    "Complete or cancel it before initiating a new one.");
                });

        // Previously any authenticated user could pay for someone else's
        // estimate just by guessing/incrementing the id — nothing checked
        // that the estimate actually belonged to the caller.
        if (!estimate.getUserId().equals(userId)) {
            throw new AccessDeniedException("You can only pay for your own estimates");
        }

        // Total = machine+material cost from estimate + designer's base_price
        // (if marketplace). Uses the basePrice snapshotted onto the Estimate
        // at quote time (EstimateService.calculateAndSaveEstimate()'s
        // listingId overload) rather than re-reading DesignListing.basePrice
        // live here — a designer changing the price between quote and
        // payment must not change what the student is actually charged.
        double totalCost = estimate.getTotalCost();
        if (estimate.getLockedBasePrice() != null) {
            totalCost = totalCost + estimate.getLockedBasePrice().doubleValue();
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
        payment.setColor(color);
        payment.setNotes(notes);
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

        // 4. Mark payment complete and create the PrintJob
        fulfillPayment(payment);
    }

    // Package-private (not private) so PaymentServiceTest can call it
    // directly without going through handleWebhook()'s HMAC signature
    // verification or getPaymentById()'s live Paystack HTTP call — this
    // method itself talks to no external service.
    Payment fulfillPayment(Payment payment) {
        if ("COMPLETED".equals(payment.getStatus())) return payment;

        payment.setStatus("COMPLETED");
        payment.setCompletedAt(LocalDateTime.now());

        Estimate linkedEstimate = estimateRepository.findById(payment.getEstimateId())
                .orElseThrow(() -> new EstimateNotFoundException(payment.getEstimateId()));

        PrintJob job = new PrintJob();
        job.setFileId(resolveFileId(payment));
        job.setEstimateId(payment.getEstimateId());
        job.setUserId(payment.getUserId());
        job.setMaterial(linkedEstimate.getMaterialType());
        job.setColor(payment.getColor());
        job.setQuantity(linkedEstimate.getQuantity());
        job.setInfill(linkedEstimate.getInfillPercent() != null
                ? linkedEstimate.getInfillPercent() + "%" : null);
        job.setQuality(linkedEstimate.getQuality());
        job.setNotes(payment.getNotes());
        
        PrintJob savedJob = printJobRepository.save(job);

        payment.setPrintJobId(savedJob.getId());
        Payment savedPayment = paymentRepository.save(payment);

        notificationService.createNotification(
                payment.getUserId(),
                "Payment Confirmed",
                "Your payment was successful. Your print job has been submitted and is in the queue.",
                NotificationType.PAYMENT_CONFIRMED);

        if (payment.getListingId() != null) {
            listingRepository.findById(payment.getListingId()).ifPresent(listing -> {
                // totalOrders is fulfillment tracking (how many times this
                // sold), unrelated to whether the designer actually gets
                // paid for it — always increments regardless of the
                // designerEarnings toggle below.
                listing.setTotalOrders(listing.getTotalOrders() + 1);

                // designerEarnings toggle: lets an admin pause designer
                // payouts without pausing the marketplace itself (orders
                // still go through, jobs still get created — only the
                // earnings credit + sale notification are skipped).
                if (isFeatureEnabled(FeatureToggleKeys.DESIGNER_EARNINGS)) {
                    BigDecimal designerEarning = listing.getBasePrice() != null
                            ? listing.getBasePrice() : BigDecimal.ZERO;
                    BigDecimal prev = listing.getTotalEarnings() != null
                            ? listing.getTotalEarnings() : BigDecimal.ZERO;
                    listing.setTotalEarnings(prev.add(designerEarning));

                    // Tell the designer their design sold — there was previously
                    // no notification at all for this event; the customer-facing
                    // "Payment Confirmed" above doesn't reach the designer, who
                    // is a different user.
                    if (listing.getDesignerId() != null) {
                        notificationService.createNotification(
                                listing.getDesignerId(),
                                "Design Sold!",
                                String.format("Your design '%s' just sold for GH₵%.2f.",
                                        listing.getTitle(), designerEarning),
                                NotificationType.LISTING_SALE);
                    }
                }

                listingRepository.save(listing);
            });
        }
        return savedPayment;
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
        Payment payment = paymentRepository.findById(id)
                .orElseThrow(() -> new PaymentNotFoundException(id));
        
        if ("PENDING".equals(payment.getStatus())) {
            try {
                verifyWithPaystack(payment.getPaystackReference());
                return fulfillPayment(payment);
            } catch (Exception e) {
                log.info("Auto-verify found payment {} is not yet successful: {}", id, e.getMessage());
            }
        }
        
        return payment;
    }

    public List<Payment> getPaymentsForUser(Long userId) {
        return paymentRepository.findByUserId(userId);
    }

    // ── Private helpers ───────────────────────────────────────────────────────

    private String callPaystackInitialize(String email, long amountInPesewas, String reference) {
        try {
            String body = String.format(
                    "{\"email\":\"%s\",\"amount\":%d,\"reference\":\"%s\",\"currency\":\"GHS\",\"callback_url\":\"printforge://payment-callback\"}",
                    email, amountInPesewas, reference
            );

            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(PAYSTACK_INITIALIZE_URL))
                    .header("Authorization", "Bearer " + paystackSecretKey)
                    .header("Content-Type", "application/json")
                    .timeout(Duration.ofSeconds(10))
                    .POST(HttpRequest.BodyPublishers.ofString(body))
                    .build();

            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
            JsonNode json = objectMapper.readTree(response.body());

            if (!json.path("status").asBoolean()) {
                throw new PaymentFailedException("Paystack initialization failed: " + json.path("message").asText());
            }

            return json.path("data").path("authorization_url").asText();

        } catch (HttpTimeoutException e) {
            // Caller-facing message, deliberately not the raw exception text —
            // this surfaces straight to the frontend via
            // GlobalExceptionHandler's PaymentFailedException -> 502 mapping.
            log.warn("Paystack initialize request timed out for reference {}: {}", reference, e.getMessage());
            throw new PaymentFailedException("Payment service is temporarily unavailable, please try again");
        } catch (PaymentFailedException e) {
            throw e;
        } catch (Exception e) {
            throw new PaymentFailedException("Could not reach Paystack: " + e.getMessage());
        }
    }

    // protected rather than private solely so a test can Mockito.spy() this
    // bean and stub out just this one external re-verification call —
    // there's no way to drive it to "success" for a synthetic webhook
    // payload without an actual completed Paystack transaction (an
    // initiated-but-never-paid test-mode reference reports "abandoned",
    // confirmed empirically against the real API). Production behavior is
    // unchanged: every real webhook call still goes through this
    // unconditionally, nothing here weakens the check itself.
    protected void verifyWithPaystack(String reference) {
        try {
            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(PAYSTACK_VERIFY_URL + reference))
                    .header("Authorization", "Bearer " + paystackSecretKey)
                    .timeout(Duration.ofSeconds(10))
                    .GET()
                    .build();

            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
            JsonNode json = objectMapper.readTree(response.body());

            String txStatus = json.path("data").path("status").asText();
            if (!"success".equals(txStatus)) {
                throw new PaymentFailedException("Paystack verification returned status: " + txStatus);
            }
        } catch (HttpTimeoutException e) {
            // This runs inside handleWebhook(), BEFORE payment.setStatus
            // ("COMPLETED") — so throwing here (same as any other failure
            // path already did) leaves the Payment row untouched at
            // PENDING, not FAILED. The PaymentFailedException below still
            // makes PaymentController.webhook() return non-2xx, which is
            // exactly what should happen: Paystack sees delivery as failed
            // and retries the webhook later, rather than this app silently
            // swallowing the timeout and never confirming the payment.
            log.warn("Paystack verify request timed out for reference {} — payment left PENDING, " +
                    "expecting Paystack's webhook retry: {}", reference, e.getMessage());
            throw new PaymentFailedException("Could not verify transaction with Paystack: request timed out");
        } catch (PaymentFailedException e) {
            throw e;
        } catch (Exception e) {
            throw new PaymentFailedException("Could not verify transaction with Paystack: " + e.getMessage());
        }
    }

    /**
     * Read-side check duplicated from admin-service's SettingsService.
     * isFeatureEnabled() — same fail-open semantics: a missing/unrecognized
     * key is treated as enabled, never as disabled, since there's no REST
     * call between services to ask admin-service directly.
     */
    private boolean isFeatureEnabled(String featureName) {
        return featureToggleRepository.findByFeatureName(featureName)
                .map(FeatureToggle::isEnabled)
                .orElse(true);
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

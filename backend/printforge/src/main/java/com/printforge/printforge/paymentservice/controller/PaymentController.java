package com.printforge.printforge.paymentservice.controller;

import com.printforge.printforge.entity.User;
import com.printforge.printforge.paymentservice.dto.InitiatePaymentRequest;
import com.printforge.printforge.paymentservice.model.Payment;
import com.printforge.printforge.paymentservice.service.PaymentService;
import com.printforge.printforge.repository.UserRepository;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * Payment endpoints.
 *
 * POST /api/payments/initiate      → create a PENDING payment + get Paystack checkout URL
 * POST /api/payments/webhook       → Paystack webhook (no JWT — permit-all in SecurityConfig)
 * GET  /api/payments/{id}          → get a single payment (owner only)
 * GET  /api/payments/my-payments   → all payments for the authenticated user
 */
@RestController
@RequestMapping("/api/payments")
public class PaymentController {

    private final PaymentService paymentService;
    private final UserRepository userRepository;

    public PaymentController(PaymentService paymentService, UserRepository userRepository) {
        this.paymentService = paymentService;
        this.userRepository = userRepository;
    }

    // ── Initiate Payment ─────────────────────────────────────────────────────

    @PostMapping("/initiate")
    public ResponseEntity<Payment> initiatePayment(
            @Valid @RequestBody InitiatePaymentRequest request,
            Authentication authentication) {

        User caller = currentUser(authentication);
        Payment payment = paymentService.initiatePayment(
                request.getEstimateId(),
                request.getListingId(),
                caller.getUserId(),
                caller.getEmail()
        );
        return ResponseEntity.ok(payment);
    }

    // ── Paystack Webhook ─────────────────────────────────────────────────────
    // Permit-all in SecurityConfig — Paystack calls this without a JWT.
    // The signature header is verified inside PaymentService.handleWebhook().

    @PostMapping("/webhook")
    public ResponseEntity<Void> webhook(
            @RequestBody String rawBody,
            @RequestHeader("x-paystack-signature") String signature) {

        paymentService.handleWebhook(rawBody, signature);
        return ResponseEntity.ok().build();
    }

    // ── Retry Payment ────────────────────────────────────────────────────────

    @PostMapping("/{id}/retry")
    public ResponseEntity<Payment> retryPayment(
            @PathVariable Long id,
            Authentication authentication) {

        User caller = currentUser(authentication);
        Payment payment = paymentService.retryPayment(id, caller.getUserId(), caller.getEmail());
        return ResponseEntity.ok(payment);
    }

    // ── Get Single Payment ───────────────────────────────────────────────────

    @GetMapping("/{id}")
    public ResponseEntity<Payment> getPayment(
            @PathVariable Long id,
            Authentication authentication) {

        Payment payment = paymentService.getPaymentById(id);
        User caller = currentUser(authentication);

        if (!payment.getUserId().equals(caller.getUserId())) {
            return ResponseEntity.status(403).build();
        }

        return ResponseEntity.ok(payment);
    }

    // ── My Payments ──────────────────────────────────────────────────────────

    @GetMapping("/my-payments")
    public ResponseEntity<List<Payment>> getMyPayments(Authentication authentication) {
        User caller = currentUser(authentication);
        return ResponseEntity.ok(paymentService.getPaymentsForUser(caller.getUserId()));
    }

    // ── Helper ───────────────────────────────────────────────────────────────

    private User currentUser(Authentication authentication) {
        return userRepository.findByEmail(authentication.getName())
                .orElseThrow(() -> new UsernameNotFoundException("User not found"));
    }
}

package com.printforge.payment.paymentservice.controller;

import com.printforge.payment.entity.User;
import com.printforge.payment.paymentservice.dto.InitiatePaymentRequest;
import com.printforge.payment.paymentservice.dto.WithdrawalRequestDTO;
import com.printforge.payment.paymentservice.model.Payment;
import com.printforge.payment.paymentservice.model.Withdrawal;
import com.printforge.payment.paymentservice.service.PaymentService;
import com.printforge.payment.repository.UserRepository;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

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
                request.getRequestId(),
                caller.getUserId(),
                caller.getEmail(),
                request.getColor(),
                request.getNotes(),
                request.getIsPremiumUpgrade()
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

    // ── Wallet & Withdrawals ─────────────────────────────────────────────────

    @GetMapping("/wallet")
    public ResponseEntity<Map<String, Object>> getWalletInfo(Authentication authentication) {
        User caller = currentUser(authentication);
        
        List<Withdrawal> withdrawals = paymentService.getWithdrawalsForUser(caller.getUserId());
        
        Map<String, Object> response = new HashMap<>();
        response.put("walletBalance", caller.getWalletBalance());
        response.put("totalEarnings", caller.getTotalEarnings());
        response.put("withdrawals", withdrawals);
        
        return ResponseEntity.ok(response);
    }

    @PostMapping("/withdraw")
    public ResponseEntity<Withdrawal> withdrawFunds(
            @Valid @RequestBody WithdrawalRequestDTO request,
            Authentication authentication) {
        
        User caller = currentUser(authentication);
        Withdrawal withdrawal = paymentService.requestWithdrawal(
                caller.getUserId(),
                request.getAmount(),
                request.getBankCode(),
                request.getAccountNumber()
        );
        
        return ResponseEntity.ok(withdrawal);
    }

    // ── Helper ───────────────────────────────────────────────────────────────

    private User currentUser(Authentication authentication) {
        return userRepository.findByEmail(authentication.getName())
                .orElseThrow(() -> new UsernameNotFoundException("User not found"));
    }

    @ExceptionHandler({
        com.printforge.payment.paymentservice.exception.PaymentFailedException.class, 
        IllegalArgumentException.class,
        org.springframework.web.bind.MethodArgumentNotValidException.class
    })
    public ResponseEntity<Map<String, String>> handlePaymentException(Exception ex) {
        Map<String, String> response = new HashMap<>();
        if (ex instanceof org.springframework.web.bind.MethodArgumentNotValidException) {
            org.springframework.web.bind.MethodArgumentNotValidException validationEx = (org.springframework.web.bind.MethodArgumentNotValidException) ex;
            String defaultMessage = validationEx.getBindingResult().getAllErrors().get(0).getDefaultMessage();
            response.put("message", defaultMessage);
        } else {
            response.put("message", ex.getMessage());
        }
        return ResponseEntity.badRequest().body(response);
    }
}

package com.printforge.notification.emailservice.controller;

import com.printforge.notification.emailservice.service.EmailService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.LinkedHashMap;
import java.util.Map;

/**
 * ADMIN-only manual verification for the email infrastructure itself —
 * NOT part of any real flow (forgot-password isn't wired up yet). Sends
 * the password-reset template with placeholder values to whatever
 * address is provided, so real SMTP delivery can be checked end-to-end
 * once MAIL_* env vars are configured, without anything real depending
 * on it yet.
 */
@RestController
@RequestMapping("/api/admin/email")
@PreAuthorize("hasRole('ADMIN')")
public class EmailTestController {

    private final EmailService emailService;

    public EmailTestController(EmailService emailService) {
        this.emailService = emailService;
    }

    @PostMapping("/test")
    public ResponseEntity<Map<String, String>> sendTestEmail(@RequestParam String to) {
        Map<String, String> vars = new LinkedHashMap<>();
        vars.put("fullName", "Test User");
        vars.put("resetLink", "https://example.com/reset?token=test-token-1234");
        vars.put("expiryMinutes", "30");

        emailService.sendTemplatedEmail(to, "PrintForge — Test Email", "password-reset", vars);

        Map<String, String> response = new LinkedHashMap<>();
        response.put("status", "sent");
        response.put("to", to);
        response.put("template", "password-reset");
        return ResponseEntity.ok(response);
    }
}

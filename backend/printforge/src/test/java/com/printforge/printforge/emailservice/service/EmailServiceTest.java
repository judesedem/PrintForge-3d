package com.printforge.printforge.emailservice.service;

import com.printforge.printforge.emailservice.exception.EmailTemplateNotFoundException;
import jakarta.mail.Session;
import jakarta.mail.internet.MimeMessage;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.mockito.Mockito;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Unit test for EmailService. JavaMailSender is mocked entirely — no real
 * SMTP connection is made, so this runs without any MAIL_* env vars set.
 *
 * Run with: ./mvnw test -Dtest=EmailServiceTest
 */
class EmailServiceTest {

    JavaMailSender mailSender;
    EmailService emailService;

    @BeforeEach
    void setUp() {
        mailSender = Mockito.mock(JavaMailSender.class);
        Mockito.when(mailSender.createMimeMessage())
                .thenAnswer(invocation -> new MimeMessage((Session) null));

        emailService = new EmailService(mailSender);
        ReflectionTestUtils.setField(emailService, "fromAddress", "no-reply@printforge.example");
        ReflectionTestUtils.setField(emailService, "fromName", "PrintForge");
    }

    @Test
    void sendsPasswordResetEmailWithSubstitutedVariables() throws Exception {
        emailService.sendTemplatedEmail(
                "student@example.com",
                "Reset your password",
                "password-reset",
                Map.of(
                        "fullName", "Ama Boateng",
                        "resetLink", "https://printforge.app/reset?token=abc123",
                        "expiryMinutes", "30"
                )
        );

        ArgumentCaptor<MimeMessage> captor = ArgumentCaptor.forClass(MimeMessage.class);
        Mockito.verify(mailSender).send(captor.capture());

        MimeMessage sent = captor.getValue();
        assertEquals("Reset your password", sent.getSubject());
        assertEquals("student@example.com", sent.getAllRecipients()[0].toString());

        String body = (String) sent.getContent();
        assertTrue(body.contains("Ama Boateng"));
        assertTrue(body.contains("https://printforge.app/reset?token=abc123"));
        assertTrue(body.contains("30"));
        assertFalse(body.contains("{{"), "no unsubstituted {{token}} placeholders should remain");
    }

    @Test
    void throwsForUnknownTemplate() {
        assertThrows(EmailTemplateNotFoundException.class, () ->
                emailService.sendTemplatedEmail("a@b.com", "Subject", "does-not-exist", Map.of()));
    }
}

package com.printforge.auth.emailservice.service;

import com.printforge.auth.emailservice.exception.EmailSendException;
import com.printforge.auth.emailservice.exception.EmailTemplateNotFoundException;
import jakarta.mail.MessagingException;
import jakarta.mail.internet.MimeMessage;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.ClassPathResource;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.io.InputStream;
import java.io.UnsupportedEncodingException;
import java.nio.charset.StandardCharsets;
import java.util.Map;

/**
 * General-purpose templated email sender — built as standalone
 * infrastructure, not yet wired into any real flow (forgot-password
 * doesn't call this; see Handoff.md). Templates are plain HTML files
 * under classpath:email-templates/{name}.html with `{{token}}`
 * placeholders, substituted via simple string replacement — no template
 * engine dependency, since the substitution need here is flat key/value,
 * not conditionals/loops.
 */
@Service
public class EmailService {

    private static final String TEMPLATE_PATH_PREFIX = "email-templates/";
    private static final String TEMPLATE_PATH_SUFFIX = ".html";

    private final JavaMailSender mailSender;

    @Value("${mail.from}")
    private String fromAddress;

    @Value("${mail.from-name}")
    private String fromName;

    public EmailService(JavaMailSender mailSender) {
        this.mailSender = mailSender;
    }

    /**
     * Loads classpath:email-templates/{templateName}.html, replaces every
     * {{key}} in templateVars, and sends the result as an HTML email.
     */
    public void sendTemplatedEmail(String to, String subject, String templateName,
                                    Map<String, String> templateVars) {
        String html = renderTemplate(templateName, templateVars);
        sendHtml(to, subject, html);
    }

    private String renderTemplate(String templateName, Map<String, String> templateVars) {
        String rendered = loadTemplateResource(templateName);
        for (Map.Entry<String, String> entry : templateVars.entrySet()) {
            rendered = rendered.replace("{{" + entry.getKey() + "}}", entry.getValue());
        }
        return rendered;
    }

    private String loadTemplateResource(String templateName) {
        ClassPathResource resource = new ClassPathResource(TEMPLATE_PATH_PREFIX + templateName + TEMPLATE_PATH_SUFFIX);
        try (InputStream in = resource.getInputStream()) {
            return new String(in.readAllBytes(), StandardCharsets.UTF_8);
        } catch (IOException e) {
            throw new EmailTemplateNotFoundException(templateName);
        }
    }

    private void sendHtml(String to, String subject, String html) {
        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, false, "UTF-8");
            helper.setFrom(fromAddress, fromName);
            helper.setTo(to);
            helper.setSubject(subject);
            helper.setText(html, true);
            mailSender.send(message);
        } catch (MessagingException | UnsupportedEncodingException e) {
            throw new EmailSendException("Failed to send email to " + to + ": " + e.getMessage(), e);
        }
    }
}

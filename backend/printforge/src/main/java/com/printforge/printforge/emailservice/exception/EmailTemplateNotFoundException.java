package com.printforge.printforge.emailservice.exception;

/** Thrown when EmailService is asked to render a template name with no matching resource file. */
public class EmailTemplateNotFoundException extends RuntimeException {

    public EmailTemplateNotFoundException(String templateName) {
        super("Email template not found: " + templateName);
    }
}

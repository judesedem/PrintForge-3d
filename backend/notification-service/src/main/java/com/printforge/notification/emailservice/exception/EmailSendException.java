package com.printforge.notification.emailservice.exception;

/** Thrown when the mail server rejects or can't be reached to send a message. */
public class EmailSendException extends RuntimeException {

    public EmailSendException(String message, Throwable cause) {
        super(message, cause);
    }
}

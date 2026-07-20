package com.printforge.printforge.exception;

/** Thrown by POST /api/auth/reset-password when the token is unknown, already used, or expired. */
public class InvalidPasswordResetTokenException extends RuntimeException {

    public InvalidPasswordResetTokenException(String message) {
        super(message);
    }
}

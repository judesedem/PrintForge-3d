package com.printforge.printforge.exception;

/**
 * Thrown when RegisterRequest.role is set but isn't one of STUDENT,
 * LAB_STAFF, or ADMIN (case-insensitive).
 */
public class InvalidRoleException extends RuntimeException {

    public InvalidRoleException(String message) {
        super(message);
    }
}

package com.printforge.printforge.dto;

/**
 * Single source of truth for the password-length rule, so
 * RegisterRequest.password and ResetPasswordRequest.newPassword can't
 * silently drift apart (e.g. a reset accepting a weaker password than
 * registration would).
 */
public final class PasswordPolicy {

    public static final int MIN_LENGTH = 6;
    public static final String MESSAGE = "Password must be at least 6 characters";

    private PasswordPolicy() {}
}

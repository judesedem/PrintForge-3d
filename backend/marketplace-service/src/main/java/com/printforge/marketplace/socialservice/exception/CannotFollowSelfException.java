package com.printforge.marketplace.socialservice.exception;

public class CannotFollowSelfException extends RuntimeException {
    public CannotFollowSelfException() {
        super("You cannot follow yourself");
    }
}

package com.printforge.printforge.socialservice.exception;

public class CannotFollowSelfException extends RuntimeException {
    public CannotFollowSelfException() {
        super("You cannot follow yourself");
    }
}

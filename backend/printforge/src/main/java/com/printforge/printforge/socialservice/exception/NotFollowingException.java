package com.printforge.printforge.socialservice.exception;

public class NotFollowingException extends RuntimeException {
    public NotFollowingException(Long followingId) {
        super("Not following user: " + followingId);
    }
}

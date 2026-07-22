package com.printforge.marketplace.socialservice.exception;

public class AlreadyFollowingException extends RuntimeException {
    public AlreadyFollowingException(Long followingId) {
        super("Already following user: " + followingId);
    }
}

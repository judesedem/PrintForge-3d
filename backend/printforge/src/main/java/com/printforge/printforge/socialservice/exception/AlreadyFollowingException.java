package com.printforge.printforge.socialservice.exception;

public class AlreadyFollowingException extends RuntimeException {
    public AlreadyFollowingException(Long followingId) {
        super("Already following user: " + followingId);
    }
}

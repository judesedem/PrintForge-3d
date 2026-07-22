package com.printforge.order.fileservice.exception;

/**
 * Thrown when the server fails to write an uploaded file to disk,
 * or fails to read a previously stored file back off disk.
 * This is a server-side problem (full disk, permissions, missing
 * upload directory), not something the client did wrong.
 */
public class FileStorageException extends RuntimeException {

    public FileStorageException(String message) {
        super(message);
    }

    public FileStorageException(String message, Throwable cause) {
        super(message, cause);
    }
}

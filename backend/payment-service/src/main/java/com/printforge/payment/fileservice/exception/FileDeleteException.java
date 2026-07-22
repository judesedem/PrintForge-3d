package com.printforge.payment.fileservice.exception;

/**
 * Thrown when DELETE /api/files/{id} is blocked: the file is still
 * attached to a published listing, or has been used in a print job.
 */
public class FileDeleteException extends RuntimeException {

    public FileDeleteException(String message) {
        super(message);
    }
}

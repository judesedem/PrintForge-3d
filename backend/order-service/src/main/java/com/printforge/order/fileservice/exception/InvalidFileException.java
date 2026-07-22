package com.printforge.order.fileservice.exception;

/**
 * Thrown when an uploaded file fails validation: missing, empty,
 * over the size limit, or an extension we don't accept for 3D print jobs.
 */
public class InvalidFileException extends RuntimeException {

    public InvalidFileException(String message) {
        super(message);
    }
}

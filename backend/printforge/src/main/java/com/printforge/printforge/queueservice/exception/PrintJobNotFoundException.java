package com.printforge.printforge.queueservice.exception;

/**
 * Thrown when a PrintJob record can't be found for the given id.
 * Replaces the generic RuntimeException that PrintQueueService used to
 * throw, which the GlobalExceptionHandler's catch-all turned into a 500
 * "An unexpected error occurred" instead of a proper 404.
 */
public class PrintJobNotFoundException extends RuntimeException {

    public PrintJobNotFoundException(Long id) {
        super("No print job found with id " + id);
    }
}

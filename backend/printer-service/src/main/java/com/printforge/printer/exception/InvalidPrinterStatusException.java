package com.printforge.printer.exception;

/** Thrown when a printer's status is set to something other than AVAILABLE, BUSY, OFFLINE, or MAINTENANCE. */
public class InvalidPrinterStatusException extends RuntimeException {

    public InvalidPrinterStatusException(String message) {
        super(message);
    }
}

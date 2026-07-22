package com.printforge.printer.exception;

/** Thrown when registering a printer whose name is already taken. */
public class DuplicatePrinterException extends RuntimeException {

    public DuplicatePrinterException(String message) {
        super(message);
    }
}

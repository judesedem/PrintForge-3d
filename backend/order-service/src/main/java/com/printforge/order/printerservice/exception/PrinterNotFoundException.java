package com.printforge.order.printerservice.exception;

/** Thrown when a Printer can't be found, by either id (admin lookups) or name (Queue Service validation). */
public class PrinterNotFoundException extends RuntimeException {

    public PrinterNotFoundException(Long id) {
        super("No printer found with id " + id);
    }

    public PrinterNotFoundException(String printerName) {
        super("No printer found named '" + printerName + "'");
    }
}

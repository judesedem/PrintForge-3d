package com.printforge.payment.printerservice.exception;

/**
 * Thrown when a job is assigned to a printer that isn't currently
 * AVAILABLE — could be BUSY with another job, OFFLINE, or in MAINTENANCE.
 * Takes the actual status so the message is accurate regardless of which
 * one it is, rather than assuming it's always "BUSY".
 */
public class PrinterBusyException extends RuntimeException {

    public PrinterBusyException(String printerName, String currentStatus) {
        super("Printer '" + printerName + "' is not available right now (current status: " + currentStatus + ")");
    }
}
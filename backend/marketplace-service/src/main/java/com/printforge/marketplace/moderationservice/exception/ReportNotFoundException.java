package com.printforge.marketplace.moderationservice.exception;

public class ReportNotFoundException extends RuntimeException {

    public ReportNotFoundException(Long id) {
        super("Report not found: " + id);
    }
}

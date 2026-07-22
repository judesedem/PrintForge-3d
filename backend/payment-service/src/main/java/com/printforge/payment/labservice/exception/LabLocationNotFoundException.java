package com.printforge.payment.labservice.exception;

public class LabLocationNotFoundException extends RuntimeException {

    public LabLocationNotFoundException(Long id) {
        super("Lab location not found with id: " + id);
    }
}

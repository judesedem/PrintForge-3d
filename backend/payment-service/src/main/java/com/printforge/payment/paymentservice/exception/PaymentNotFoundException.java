package com.printforge.payment.paymentservice.exception;

public class PaymentNotFoundException extends RuntimeException {
    public PaymentNotFoundException(Long id) {
        super("Payment not found with id: " + id);
    }
    public PaymentNotFoundException(String reference) {
        super("Payment not found with reference: " + reference);
    }
}

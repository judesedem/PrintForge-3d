package com.printforge.printer.exception;

import com.printforge.printer.dto.ErrorResponse;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.time.LocalDateTime;

@RestControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(DuplicatePrinterException.class)
    public ResponseEntity<ErrorResponse> handleDuplicatePrinter(DuplicatePrinterException ex) {
        return buildError(HttpStatus.CONFLICT, ex.getMessage());
    }

    @ExceptionHandler(PrinterNotFoundException.class)
    public ResponseEntity<ErrorResponse> handlePrinterNotFound(PrinterNotFoundException ex) {
        return buildError(HttpStatus.NOT_FOUND, ex.getMessage());
    }

    @ExceptionHandler(PrinterBusyException.class)
    public ResponseEntity<ErrorResponse> handlePrinterBusy(PrinterBusyException ex) {
        return buildError(HttpStatus.CONFLICT, ex.getMessage());
    }

    @ExceptionHandler(InvalidPrinterStatusException.class)
    public ResponseEntity<ErrorResponse> handleInvalidPrinterStatus(InvalidPrinterStatusException ex) {
        return buildError(HttpStatus.BAD_REQUEST, ex.getMessage());
    }

    private ResponseEntity<ErrorResponse> buildError(HttpStatus status, String message) {
        ErrorResponse error = ErrorResponse.builder()
                .status(status.value())
                .message(message)
                .timestamp(LocalDateTime.now())
                .build();

        return ResponseEntity.status(status).body(error);
    }
}

package com.printforge.order.exception;

import com.printforge.order.dto.ErrorResponse;
import com.printforge.order.estimateservice.exception.EstimateNotFoundException;
import com.printforge.order.estimateservice.exception.InvalidEstimateInputException;
import com.printforge.order.fileservice.exception.ModelFileNotFoundException;
import com.printforge.order.marketplaceservice.exception.ListingNotFoundException;
import com.printforge.order.marketplaceservice.exception.ListingNotPublishedException;
import com.printforge.order.printerservice.exception.DuplicatePrinterException;
import com.printforge.order.printerservice.exception.InvalidPrinterStatusException;
import com.printforge.order.printerservice.exception.PrinterBusyException;
import com.printforge.order.printerservice.exception.PrinterNotFoundException;
import com.printforge.order.queueservice.exception.InvalidJobStatusException;
import com.printforge.order.queueservice.exception.PrintJobNotFoundException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.time.LocalDateTime;

/**
 * Mirrors printer-service's GlobalExceptionHandler (see that service's
 * README note on why: without one, a domain exception falls through to
 * Spring's default handler and comes back as a raw 500 with a stack trace
 * instead of a proper 4xx). order-service has its own duplicate copies of
 * printer-service's exception classes (com.printforge.order.printerservice.*)
 * plus its own queue/estimate/marketplace/file exceptions, none of which had
 * any handler at all before this — e.g. PATCH /api/print-jobs/{id}/approve
 * with a busy/offline printer threw PrinterBusyException straight into a
 * 500 rather than the 409 a staff member approving a job should see.
 *
 * Deliberately no catch-all Exception handler — same reasoning as
 * printer-service's: that would also catch Spring Security's
 * AccessDeniedException and turn @PreAuthorize 403s into 500s.
 */
@RestControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(PrinterBusyException.class)
    public ResponseEntity<ErrorResponse> handlePrinterBusy(PrinterBusyException ex) {
        return buildError(HttpStatus.CONFLICT, ex.getMessage());
    }

    @ExceptionHandler(PrinterNotFoundException.class)
    public ResponseEntity<ErrorResponse> handlePrinterNotFound(PrinterNotFoundException ex) {
        return buildError(HttpStatus.NOT_FOUND, ex.getMessage());
    }

    @ExceptionHandler(DuplicatePrinterException.class)
    public ResponseEntity<ErrorResponse> handleDuplicatePrinter(DuplicatePrinterException ex) {
        return buildError(HttpStatus.CONFLICT, ex.getMessage());
    }

    @ExceptionHandler(InvalidPrinterStatusException.class)
    public ResponseEntity<ErrorResponse> handleInvalidPrinterStatus(InvalidPrinterStatusException ex) {
        return buildError(HttpStatus.BAD_REQUEST, ex.getMessage());
    }

    @ExceptionHandler(PrintJobNotFoundException.class)
    public ResponseEntity<ErrorResponse> handlePrintJobNotFound(PrintJobNotFoundException ex) {
        return buildError(HttpStatus.NOT_FOUND, ex.getMessage());
    }

    @ExceptionHandler(InvalidJobStatusException.class)
    public ResponseEntity<ErrorResponse> handleInvalidJobStatus(InvalidJobStatusException ex) {
        return buildError(HttpStatus.BAD_REQUEST, ex.getMessage());
    }

    @ExceptionHandler(EstimateNotFoundException.class)
    public ResponseEntity<ErrorResponse> handleEstimateNotFound(EstimateNotFoundException ex) {
        return buildError(HttpStatus.NOT_FOUND, ex.getMessage());
    }

    @ExceptionHandler(InvalidEstimateInputException.class)
    public ResponseEntity<ErrorResponse> handleInvalidEstimateInput(InvalidEstimateInputException ex) {
        return buildError(HttpStatus.BAD_REQUEST, ex.getMessage());
    }

    @ExceptionHandler(ModelFileNotFoundException.class)
    public ResponseEntity<ErrorResponse> handleModelFileNotFound(ModelFileNotFoundException ex) {
        return buildError(HttpStatus.NOT_FOUND, ex.getMessage());
    }

    @ExceptionHandler(ListingNotFoundException.class)
    public ResponseEntity<ErrorResponse> handleListingNotFound(ListingNotFoundException ex) {
        return buildError(HttpStatus.NOT_FOUND, ex.getMessage());
    }

    @ExceptionHandler(ListingNotPublishedException.class)
    public ResponseEntity<ErrorResponse> handleListingNotPublished(ListingNotPublishedException ex) {
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

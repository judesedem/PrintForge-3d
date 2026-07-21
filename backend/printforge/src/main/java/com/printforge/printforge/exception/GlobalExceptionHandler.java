package com.printforge.printforge.exception;


import com.printforge.printforge.dto.ErrorResponse;
import com.printforge.printforge.fileservice.exception.CloudinaryUploadException;
import com.printforge.printforge.fileservice.exception.FileDeleteException;
import com.printforge.printforge.fileservice.exception.FileStorageException;
import com.printforge.printforge.fileservice.exception.InvalidFileException;
import com.printforge.printforge.fileservice.exception.ModelFileNotFoundException;
import com.printforge.printforge.emailservice.exception.EmailSendException;
import com.printforge.printforge.emailservice.exception.EmailTemplateNotFoundException;
import com.printforge.printforge.notificationservice.exception.InvalidNotificationInputException;
import com.printforge.printforge.notificationservice.exception.NotificationNotFoundException;
import com.printforge.printforge.queueservice.exception.InvalidJobStatusException;
import com.printforge.printforge.queueservice.exception.PrintJobNotFoundException;
import com.printforge.printforge.estimateservice.exception.EstimateNotFoundException;
import com.printforge.printforge.estimateservice.exception.InvalidEstimateInputException;
import com.printforge.printforge.printerservice.exception.DuplicatePrinterException;
import com.printforge.printforge.printerservice.exception.InvalidPrinterStatusException;
import com.printforge.printforge.printerservice.exception.PrinterBusyException;
import com.printforge.printforge.marketplaceservice.exception.AlreadyFavoritedException;
import com.printforge.printforge.marketplaceservice.exception.FavoriteNotFoundException;
import com.printforge.printforge.marketplaceservice.exception.InvalidListingInputException;
import com.printforge.printforge.marketplaceservice.exception.ListingDeleteException;
import com.printforge.printforge.marketplaceservice.exception.ListingNotFoundException;
import com.printforge.printforge.marketplaceservice.exception.ListingNotPublishedException;
import com.printforge.printforge.labservice.exception.LabLocationNotFoundException;
import com.printforge.printforge.moderationservice.exception.InvalidModerationLogQueryException;
import com.printforge.printforge.moderationservice.exception.InvalidReportInputException;
import com.printforge.printforge.moderationservice.exception.ReportNotFoundException;
import com.printforge.printforge.paymentservice.exception.PaymentNotFoundException;
import com.printforge.printforge.paymentservice.exception.PaymentFailedException;
import com.printforge.printforge.paymentservice.exception.DuplicatePaymentException;
import com.printforge.printforge.printerservice.exception.PrinterNotFoundException;
import com.printforge.printforge.socialservice.exception.AlreadyFollowingException;
import com.printforge.printforge.socialservice.exception.CannotFollowSelfException;
import com.printforge.printforge.socialservice.exception.NotFollowingException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;

@RestControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(EmailAlreadyExistsException.class)
    public ResponseEntity<ErrorResponse> handleEmailAlreadyExists(
            EmailAlreadyExistsException ex) {

        return buildError(HttpStatus.CONFLICT, ex.getMessage());
    }

    @ExceptionHandler(InvalidCredentialsException.class)
    public ResponseEntity<ErrorResponse> handleInvalidCredentials(
            InvalidCredentialsException ex) {

        return buildError(HttpStatus.UNAUTHORIZED, ex.getMessage());
    }

    @ExceptionHandler(InvalidPasswordResetTokenException.class)
    public ResponseEntity<ErrorResponse> handleInvalidPasswordResetToken(
            InvalidPasswordResetTokenException ex) {

        return buildError(HttpStatus.BAD_REQUEST, ex.getMessage());
    }

    @ExceptionHandler(UsernameNotFoundException.class)
    public ResponseEntity<ErrorResponse> handleUsernameNotFound(
            UsernameNotFoundException ex) {

        return buildError(HttpStatus.NOT_FOUND, ex.getMessage());
    }

    @ExceptionHandler(AccessDeniedException.class)
    public ResponseEntity<ErrorResponse> handleAccessDenied(
            AccessDeniedException ex) {

        return buildError(HttpStatus.FORBIDDEN, "Access denied");
    }

    @ExceptionHandler(InvalidRoleException.class)
    public ResponseEntity<ErrorResponse> handleInvalidRole(InvalidRoleException ex) {
        return buildError(HttpStatus.BAD_REQUEST, ex.getMessage());
    }

    @ExceptionHandler(InvalidFileException.class)
    public ResponseEntity<ErrorResponse> handleInvalidFile(InvalidFileException ex) {
        return buildError(HttpStatus.BAD_REQUEST, ex.getMessage());
    }

    @ExceptionHandler(ModelFileNotFoundException.class)
    public ResponseEntity<ErrorResponse> handleModelFileNotFound(ModelFileNotFoundException ex) {
        return buildError(HttpStatus.NOT_FOUND, ex.getMessage());
    }

    @ExceptionHandler(FileDeleteException.class)
    public ResponseEntity<ErrorResponse> handleFileDelete(FileDeleteException ex) {
        return buildError(HttpStatus.BAD_REQUEST, ex.getMessage());
    }

    @ExceptionHandler(NotificationNotFoundException.class)
    public ResponseEntity<ErrorResponse> handleNotificationNotFound(NotificationNotFoundException ex) {
        return buildError(HttpStatus.NOT_FOUND, ex.getMessage());
    }

    @ExceptionHandler(InvalidNotificationInputException.class)
    public ResponseEntity<ErrorResponse> handleInvalidNotificationInput(InvalidNotificationInputException ex) {
        return buildError(HttpStatus.BAD_REQUEST, ex.getMessage());
    }

    @ExceptionHandler(PrintJobNotFoundException.class)
    public ResponseEntity<ErrorResponse> handlePrintJobNotFound(PrintJobNotFoundException ex) {
        return buildError(HttpStatus.NOT_FOUND, ex.getMessage());
    }

    @ExceptionHandler(EstimateNotFoundException.class)
    public ResponseEntity<ErrorResponse> handleEstimateNotFound(EstimateNotFoundException ex) {
        return buildError(HttpStatus.NOT_FOUND, ex.getMessage());
    }

    @ExceptionHandler(InvalidEstimateInputException.class)
    public ResponseEntity<ErrorResponse> handleInvalidEstimateInput(InvalidEstimateInputException ex) {
        return buildError(HttpStatus.BAD_REQUEST, ex.getMessage());
    }

    @ExceptionHandler(InvalidJobStatusException.class)
    public ResponseEntity<ErrorResponse> handleInvalidJobStatus(InvalidJobStatusException ex) {
        return buildError(HttpStatus.BAD_REQUEST, ex.getMessage());
    }

    @ExceptionHandler(FileStorageException.class)
    public ResponseEntity<ErrorResponse> handleFileStorage(FileStorageException ex) {
        return buildError(HttpStatus.INTERNAL_SERVER_ERROR, ex.getMessage());
    }

    @ExceptionHandler(PrinterNotFoundException.class)
    public ResponseEntity<ErrorResponse> handlePrinterNotFound(PrinterNotFoundException ex) {
        return buildError(HttpStatus.NOT_FOUND, ex.getMessage());
    }

    @ExceptionHandler(InvalidPrinterStatusException.class)
    public ResponseEntity<ErrorResponse> handleInvalidPrinterStatus(InvalidPrinterStatusException ex) {
        return buildError(HttpStatus.BAD_REQUEST, ex.getMessage());
    }

    @ExceptionHandler(DuplicatePrinterException.class)
    public ResponseEntity<ErrorResponse> handleDuplicatePrinter(DuplicatePrinterException ex) {
        return buildError(HttpStatus.CONFLICT, ex.getMessage());
    }

    @ExceptionHandler(ListingNotFoundException.class)
    public ResponseEntity<ErrorResponse> handleListingNotFound(ListingNotFoundException ex) {
        return buildError(HttpStatus.NOT_FOUND, ex.getMessage());
    }

    @ExceptionHandler(ListingNotPublishedException.class)
    public ResponseEntity<ErrorResponse> handleListingNotPublished(ListingNotPublishedException ex) {
        return buildError(HttpStatus.FORBIDDEN, ex.getMessage());
    }

    @ExceptionHandler(InvalidListingInputException.class)
    public ResponseEntity<ErrorResponse> handleInvalidListingInput(InvalidListingInputException ex) {
        return buildError(HttpStatus.BAD_REQUEST, ex.getMessage());
    }

    @ExceptionHandler(ListingDeleteException.class)
    public ResponseEntity<ErrorResponse> handleListingDelete(ListingDeleteException ex) {
        return buildError(HttpStatus.CONFLICT, ex.getMessage());
    }

    @ExceptionHandler(AlreadyFavoritedException.class)
    public ResponseEntity<ErrorResponse> handleAlreadyFavorited(AlreadyFavoritedException ex) {
        return buildError(HttpStatus.CONFLICT, ex.getMessage());
    }

    @ExceptionHandler(FavoriteNotFoundException.class)
    public ResponseEntity<ErrorResponse> handleFavoriteNotFound(FavoriteNotFoundException ex) {
        return buildError(HttpStatus.NOT_FOUND, ex.getMessage());
    }

    @ExceptionHandler(AlreadyFollowingException.class)
    public ResponseEntity<ErrorResponse> handleAlreadyFollowing(AlreadyFollowingException ex) {
        return buildError(HttpStatus.BAD_REQUEST, ex.getMessage());
    }

    @ExceptionHandler(NotFollowingException.class)
    public ResponseEntity<ErrorResponse> handleNotFollowing(NotFollowingException ex) {
        return buildError(HttpStatus.BAD_REQUEST, ex.getMessage());
    }

    @ExceptionHandler(CannotFollowSelfException.class)
    public ResponseEntity<ErrorResponse> handleCannotFollowSelf(CannotFollowSelfException ex) {
        return buildError(HttpStatus.BAD_REQUEST, ex.getMessage());
    }

    @ExceptionHandler(LabLocationNotFoundException.class)
    public ResponseEntity<ErrorResponse> handleLabLocationNotFound(LabLocationNotFoundException ex) {
        return buildError(HttpStatus.NOT_FOUND, ex.getMessage());
    }

    @ExceptionHandler(InvalidProfileInputException.class)
    public ResponseEntity<ErrorResponse> handleInvalidProfileInput(InvalidProfileInputException ex) {
        return buildError(HttpStatus.BAD_REQUEST, ex.getMessage());
    }

    @ExceptionHandler(InvalidReportInputException.class)
    public ResponseEntity<ErrorResponse> handleInvalidReportInput(InvalidReportInputException ex) {
        return buildError(HttpStatus.BAD_REQUEST, ex.getMessage());
    }

    @ExceptionHandler(ReportNotFoundException.class)
    public ResponseEntity<ErrorResponse> handleReportNotFound(ReportNotFoundException ex) {
        return buildError(HttpStatus.NOT_FOUND, ex.getMessage());
    }

    @ExceptionHandler(InvalidModerationLogQueryException.class)
    public ResponseEntity<ErrorResponse> handleInvalidModerationLogQuery(InvalidModerationLogQueryException ex) {
        return buildError(HttpStatus.BAD_REQUEST, ex.getMessage());
    }

    @ExceptionHandler(PaymentNotFoundException.class)
    public ResponseEntity<ErrorResponse> handlePaymentNotFound(PaymentNotFoundException ex) {
        return buildError(HttpStatus.NOT_FOUND, ex.getMessage());
    }

    @ExceptionHandler(PaymentFailedException.class)
    public ResponseEntity<ErrorResponse> handlePaymentFailed(PaymentFailedException ex) {
        return buildError(HttpStatus.BAD_GATEWAY, ex.getMessage());
    }

    @ExceptionHandler(DuplicatePaymentException.class)
    public ResponseEntity<ErrorResponse> handleDuplicatePayment(DuplicatePaymentException ex) {
        return buildError(HttpStatus.BAD_REQUEST, ex.getMessage());
    }

    @ExceptionHandler(IllegalStateException.class)
    public ResponseEntity<ErrorResponse> handleIllegalState(IllegalStateException ex) {
        return buildError(HttpStatus.BAD_REQUEST, ex.getMessage());
    }

    @ExceptionHandler(PrinterBusyException.class)
    public ResponseEntity<ErrorResponse> handlePrinterBusy(PrinterBusyException ex) {
        return buildError(HttpStatus.CONFLICT, ex.getMessage());
    }
    @ExceptionHandler(CloudinaryUploadException.class)
    public ResponseEntity<ErrorResponse> handleCloudinaryUpload(CloudinaryUploadException ex) {
        return buildError(HttpStatus.BAD_GATEWAY, ex.getMessage());
    }

    @ExceptionHandler(EmailSendException.class)
    public ResponseEntity<ErrorResponse> handleEmailSend(EmailSendException ex) {
        return buildError(HttpStatus.BAD_GATEWAY, ex.getMessage());
    }

    @ExceptionHandler(EmailTemplateNotFoundException.class)
    public ResponseEntity<ErrorResponse> handleEmailTemplateNotFound(EmailTemplateNotFoundException ex) {
        return buildError(HttpStatus.INTERNAL_SERVER_ERROR, ex.getMessage());
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<Map<String, String>> handleValidationErrors(
            MethodArgumentNotValidException ex) {

        Map<String, String> errors = new HashMap<>();

        ex.getBindingResult().getAllErrors().forEach(error -> {
            String fieldName = ((FieldError) error).getField();
            String errorMessage = error.getDefaultMessage();
            errors.put(fieldName, errorMessage);
        });

        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(errors);
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<ErrorResponse> handleGenericException(Exception ex) {
        return buildError(HttpStatus.INTERNAL_SERVER_ERROR,
                "An unexpected error occurred");
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
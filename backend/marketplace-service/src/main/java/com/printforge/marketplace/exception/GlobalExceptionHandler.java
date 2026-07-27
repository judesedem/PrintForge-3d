package com.printforge.marketplace.exception;

import com.printforge.marketplace.dto.ErrorResponse;
import com.printforge.marketplace.estimateservice.exception.EstimateNotFoundException;
import com.printforge.marketplace.estimateservice.exception.InvalidEstimateInputException;
import com.printforge.marketplace.fileservice.exception.CloudinaryUploadException;
import com.printforge.marketplace.fileservice.exception.FileDeleteException;
import com.printforge.marketplace.fileservice.exception.FileStorageException;
import com.printforge.marketplace.fileservice.exception.InvalidFileException;
import com.printforge.marketplace.fileservice.exception.ModelFileNotFoundException;
import com.printforge.marketplace.marketplaceservice.exception.AlreadyFavoritedException;
import com.printforge.marketplace.marketplaceservice.exception.FavoriteNotFoundException;
import com.printforge.marketplace.marketplaceservice.exception.InvalidListingInputException;
import com.printforge.marketplace.marketplaceservice.exception.ListingDeleteException;
import com.printforge.marketplace.marketplaceservice.exception.ListingNotFoundException;
import com.printforge.marketplace.marketplaceservice.exception.ListingNotPublishedException;
import com.printforge.marketplace.moderationservice.exception.InvalidModerationLogQueryException;
import com.printforge.marketplace.moderationservice.exception.InvalidReportInputException;
import com.printforge.marketplace.moderationservice.exception.ReportNotFoundException;
import com.printforge.marketplace.notificationservice.exception.InvalidNotificationInputException;
import com.printforge.marketplace.notificationservice.exception.NotificationNotFoundException;
import com.printforge.marketplace.socialservice.exception.AlreadyFollowingException;
import com.printforge.marketplace.socialservice.exception.CannotFollowSelfException;
import com.printforge.marketplace.socialservice.exception.NotFollowingException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;

/**
 * Maps this service's domain exceptions onto real HTTP status codes.
 *
 * Without this every one of them reached Spring's default handler and came
 * back as a 500 whose body has no "message" field — which the app's
 * apiFetch() renders to the user as the unhelpful "Request failed (500)".
 *
 * Deliberately has no catch-all @ExceptionHandler(Exception.class): this
 * service has 12 @PreAuthorize'd endpoints, and a catch-all would swallow
 * Spring Security's AccessDeniedException and turn those 403s into 500s.
 */
@RestControllerAdvice
public class GlobalExceptionHandler {

    // ── 404: the addressed resource genuinely isn't there ────────────────────

    @ExceptionHandler({
            EstimateNotFoundException.class,
            FavoriteNotFoundException.class,
            ListingNotFoundException.class,
            ModelFileNotFoundException.class,
            NotificationNotFoundException.class,
            NotFollowingException.class,
            ReportNotFoundException.class,
    })
    public ResponseEntity<ErrorResponse> handleNotFound(RuntimeException ex) {
        return buildError(HttpStatus.NOT_FOUND, ex.getMessage());
    }

    // ── 409: the resource exists, but its current state blocks the action ───

    @ExceptionHandler({
            AlreadyFavoritedException.class,
            AlreadyFollowingException.class,
            ListingNotPublishedException.class,
            // Both of these are "blocked because something still references
            // it" (a published listing, a print job, a PENDING payment) —
            // a conflict with current state, not a server fault.
            FileDeleteException.class,
            ListingDeleteException.class,
    })
    public ResponseEntity<ErrorResponse> handleConflict(RuntimeException ex) {
        return buildError(HttpStatus.CONFLICT, ex.getMessage());
    }

    // ── 400: the client sent something invalid ──────────────────────────────

    @ExceptionHandler({
            CannotFollowSelfException.class,
            InvalidEstimateInputException.class,
            InvalidFileException.class,
            InvalidListingInputException.class,
            InvalidModerationLogQueryException.class,
            InvalidNotificationInputException.class,
            InvalidProfileInputException.class,
            InvalidReportInputException.class,
    })
    public ResponseEntity<ErrorResponse> handleBadRequest(RuntimeException ex) {
        return buildError(HttpStatus.BAD_REQUEST, ex.getMessage());
    }

    // ── 5xx: genuinely our side ─────────────────────────────────────────────

    /** Cloudinary rejected or failed the upload — an upstream dependency. */
    @ExceptionHandler(CloudinaryUploadException.class)
    public ResponseEntity<ErrorResponse> handleCloudinaryUpload(CloudinaryUploadException ex) {
        return buildError(HttpStatus.BAD_GATEWAY, ex.getMessage());
    }

    /** Full disk, bad permissions, missing upload dir — nothing the client did. */
    @ExceptionHandler(FileStorageException.class)
    public ResponseEntity<ErrorResponse> handleFileStorage(FileStorageException ex) {
        return buildError(HttpStatus.INTERNAL_SERVER_ERROR, ex.getMessage());
    }

    // ── @Valid failures ─────────────────────────────────────────────────────

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

    private ResponseEntity<ErrorResponse> buildError(HttpStatus status, String message) {
        ErrorResponse error = ErrorResponse.builder()
                .status(status.value())
                .message(message)
                .timestamp(LocalDateTime.now())
                .build();

        return ResponseEntity.status(status).body(error);
    }
}

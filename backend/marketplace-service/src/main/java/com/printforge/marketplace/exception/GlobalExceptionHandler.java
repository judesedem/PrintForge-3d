package com.printforge.marketplace.exception;

import com.printforge.marketplace.dto.ErrorResponse;
import com.printforge.marketplace.marketplaceservice.exception.AlreadyFavoritedException;
import com.printforge.marketplace.marketplaceservice.exception.FavoriteNotFoundException;
import com.printforge.marketplace.marketplaceservice.exception.InvalidListingInputException;
import com.printforge.marketplace.marketplaceservice.exception.ListingDeleteException;
import com.printforge.marketplace.marketplaceservice.exception.ListingNotFoundException;
import com.printforge.marketplace.marketplaceservice.exception.ListingNotPublishedException;
import com.printforge.marketplace.settingsservice.exception.FeatureDisabledException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.time.LocalDateTime;

@RestControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(ListingNotFoundException.class)
    public ResponseEntity<ErrorResponse> handleListingNotFound(ListingNotFoundException ex) {
        return buildError(HttpStatus.NOT_FOUND, ex.getMessage());
    }

    @ExceptionHandler(ListingNotPublishedException.class)
    public ResponseEntity<ErrorResponse> handleListingNotPublished(ListingNotPublishedException ex) {
        return buildError(HttpStatus.NOT_FOUND, ex.getMessage());
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

    @ExceptionHandler(FeatureDisabledException.class)
    public ResponseEntity<ErrorResponse> handleFeatureDisabled(FeatureDisabledException ex) {
        return buildError(HttpStatus.SERVICE_UNAVAILABLE, ex.getMessage());
    }

    @ExceptionHandler(UsernameNotFoundException.class)
    public ResponseEntity<ErrorResponse> handleUsernameNotFound(UsernameNotFoundException ex) {
        return buildError(HttpStatus.NOT_FOUND, ex.getMessage());
    }

    @ExceptionHandler(AccessDeniedException.class)
    public ResponseEntity<ErrorResponse> handleAccessDenied(AccessDeniedException ex) {
        return buildError(HttpStatus.FORBIDDEN, "Access denied");
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<ErrorResponse> handleGenericException(Exception ex) {
        return buildError(HttpStatus.INTERNAL_SERVER_ERROR, "An unexpected error occurred");
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

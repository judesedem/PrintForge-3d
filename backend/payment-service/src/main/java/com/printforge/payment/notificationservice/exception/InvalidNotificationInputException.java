package com.printforge.payment.notificationservice.exception;

/**
 * Thrown when notification input fails validation — currently just the
 * #71 message-length cap. Only reachable from POST /api/notifications
 * (the one client-facing entry point); createNotification()'s many
 * internal fire-and-forget callers are defensively truncated instead of
 * rejected, see NotificationService.createNotification()'s javadoc.
 */
public class InvalidNotificationInputException extends RuntimeException {

    public InvalidNotificationInputException(String message) {
        super(message);
    }
}

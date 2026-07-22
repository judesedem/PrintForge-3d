package com.printforge.notification.notificationservice.model;

/**
 * Known values for Notification.type. type itself stays a plain String on
 * the entity (not @Enumerated) — every createNotification() call site
 * already passed a raw String before this class existed, and the frontend's
 * own NotificationApiResponse.type is documented as "not a closed enum, so
 * treat unknown values as expected" — so this is a call-site convenience to
 * avoid literal-string drift/typos across files, not a DB or JSON-level
 * enforced set.
 *
 * INFO/SUCCESS/ERROR are the original generic UI-severity values every
 * trigger point used before specific categories existed. They're kept
 * (never removed) for every trigger point that doesn't map cleanly to one
 * of the specific categories below — order/job submission-before-payment,
 * account suspend/reactivate, and the strict job lifecycle's READY/COLLECTED
 * steps all still use them.
 *
 * Duplicated identically into every service whose own createNotification()
 * call sites need it (order-service, payment-service) — this service owns
 * the canonical copy since it owns the Notification entity/table itself.
 */
public final class NotificationType {

    private NotificationType() {}

    public static final String INFO = "info";
    public static final String SUCCESS = "success";
    public static final String ERROR = "error";

    public static final String PAYMENT_CONFIRMED = "PAYMENT_CONFIRMED";
    public static final String JOB_STARTED = "JOB_STARTED";
    public static final String JOB_APPROVED = "JOB_APPROVED";
    public static final String JOB_COMPLETED = "JOB_COMPLETED";
    public static final String JOB_FAILED = "JOB_FAILED";
    public static final String JOB_REJECTED = "JOB_REJECTED";
    public static final String LISTING_SALE = "LISTING_SALE";
}

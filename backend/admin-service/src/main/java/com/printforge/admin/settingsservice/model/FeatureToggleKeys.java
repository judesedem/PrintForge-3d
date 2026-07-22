package com.printforge.admin.settingsservice.model;

/**
 * The fixed set of keys FeatureToggleSeeder creates on startup — call-site
 * constants to keep the seeder, the gating checks, and any future callers
 * from drifting on the exact string.
 *
 * This is the canonical copy (admin-service owns the FeatureToggle table's
 * seeding and PATCH endpoint) — duplicated identically into
 * marketplace-service, order-service, payment-service, and
 * notification-service, whose own gating checks need it too and have no
 * REST call back to this service for it.
 */
public final class FeatureToggleKeys {

    private FeatureToggleKeys() {}

    public static final String MARKETPLACE = "marketplace";
    public static final String DESIGNER_EARNINGS = "designerEarnings";
    public static final String NOTIFICATIONS = "notifications";
    public static final String GUEST_SUBMIT = "guestSubmit";
}

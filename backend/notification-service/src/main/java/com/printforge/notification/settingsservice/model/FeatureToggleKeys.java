package com.printforge.notification.settingsservice.model;

/**
 * The fixed set of keys FeatureToggleSeeder (admin-service) creates on
 * startup — call-site constants to keep the gating checks here from
 * drifting on the exact string. Duplicated identically from admin-service,
 * the canonical owner of this table's seeding and PATCH endpoint.
 */
public final class FeatureToggleKeys {

    private FeatureToggleKeys() {}

    public static final String MARKETPLACE = "marketplace";
    public static final String DESIGNER_EARNINGS = "designerEarnings";
    public static final String NOTIFICATIONS = "notifications";
    public static final String GUEST_SUBMIT = "guestSubmit";
}

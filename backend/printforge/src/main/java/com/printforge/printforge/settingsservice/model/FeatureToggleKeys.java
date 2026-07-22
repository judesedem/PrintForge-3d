package com.printforge.printforge.settingsservice.model;

/**
 * The fixed set of keys FeatureToggleSeeder creates on startup — call-site
 * constants to keep the seeder, the gating checks, and any future callers
 * from drifting on the exact string.
 */
public final class FeatureToggleKeys {

    private FeatureToggleKeys() {}

    public static final String MARKETPLACE = "marketplace";
    public static final String DESIGNER_EARNINGS = "designerEarnings";
    public static final String NOTIFICATIONS = "notifications";
    public static final String GUEST_SUBMIT = "guestSubmit";
}

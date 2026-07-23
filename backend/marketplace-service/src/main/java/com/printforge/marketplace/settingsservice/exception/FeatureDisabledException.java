package com.printforge.marketplace.settingsservice.exception;

/**
 * Thrown when a request hits a feature an admin has toggled off (e.g.
 * marketplace=false). Mapped to 503 — the feature isn't broken, it's
 * deliberately, temporarily unavailable.
 */
public class FeatureDisabledException extends RuntimeException {
    public FeatureDisabledException(String featureName) {
        super("The '" + featureName + "' feature is currently disabled by an administrator.");
    }
}

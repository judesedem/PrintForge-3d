package com.printforge.printforge.settingsservice.exception;

public class FeatureToggleNotFoundException extends RuntimeException {
    public FeatureToggleNotFoundException(String featureName) {
        super("Unknown feature toggle: " + featureName);
    }
}

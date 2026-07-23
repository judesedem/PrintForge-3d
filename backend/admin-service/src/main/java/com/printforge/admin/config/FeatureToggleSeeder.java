package com.printforge.admin.config;

import com.printforge.admin.settingsservice.model.FeatureToggle;
import com.printforge.admin.settingsservice.model.FeatureToggleKeys;
import com.printforge.admin.settingsservice.repository.FeatureToggleRepository;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;

import java.util.LinkedHashMap;
import java.util.Map;

/**
 * Seeds the fixed set of platform feature toggles on startup. Defaults
 * reflect actual current behavior: marketplace/designerEarnings/
 * notifications are already-working features being *exposed* as toggles
 * (default true — flipping any of them off is what changes behavior, not
 * turning them on). guestSubmit is a toggle for a feature that doesn't
 * exist yet (default false) — flipping it on does NOT enable real guest
 * submission, that's a separate, much larger architectural change
 * (identifying/rate-limiting anonymous requests, payment without an
 * account) that's explicitly out of scope here. This toggle only exists
 * so the admin dashboard has something to read/flip; nothing in the app
 * currently checks it to change auth behavior.
 *
 * Runs only in admin-service (the owner of the FeatureToggle table's
 * seeding and PATCH endpoint) — marketplace-service, order-service,
 * payment-service, and notification-service each get their own read-only
 * FeatureToggleRepository copy against this same table, but no seeder of
 * their own, so there's only ever one writer racing to create the initial
 * rows.
 *
 * Idempotent per-key: only inserts whichever of the four keys are
 * missing, so adding a fifth toggle later doesn't require re-seeding or a
 * fresh database.
 */
@Slf4j
@Component
public class FeatureToggleSeeder implements CommandLineRunner {

    private final FeatureToggleRepository featureToggleRepository;

    public FeatureToggleSeeder(FeatureToggleRepository featureToggleRepository) {
        this.featureToggleRepository = featureToggleRepository;
    }

    @Override
    public void run(String... args) {
        Map<String, Boolean> defaults = new LinkedHashMap<>();
        defaults.put(FeatureToggleKeys.MARKETPLACE, true);
        defaults.put(FeatureToggleKeys.DESIGNER_EARNINGS, true);
        defaults.put(FeatureToggleKeys.NOTIFICATIONS, true);
        defaults.put(FeatureToggleKeys.GUEST_SUBMIT, false);

        int seeded = 0;
        for (Map.Entry<String, Boolean> entry : defaults.entrySet()) {
            if (featureToggleRepository.existsByFeatureName(entry.getKey())) continue;

            FeatureToggle toggle = new FeatureToggle();
            toggle.setFeatureName(entry.getKey());
            toggle.setEnabled(entry.getValue());
            featureToggleRepository.save(toggle);
            seeded++;
        }
        if (seeded > 0) {
            log.info("Seeded {} feature toggle(s)", seeded);
        }
    }
}

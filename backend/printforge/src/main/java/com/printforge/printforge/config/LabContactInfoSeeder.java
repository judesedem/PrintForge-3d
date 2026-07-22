package com.printforge.printforge.config;

import com.printforge.printforge.settingsservice.model.LabContactInfo;
import com.printforge.printforge.settingsservice.repository.LabContactInfoRepository;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;

/**
 * Bootstraps the single lab-contact-info row (fixed id=1) on startup, so
 * GET /api/admin/settings/contact — and any other service reading
 * SettingsService.getContactInfo() — never has to null-check for a missing
 * row. Idempotent: skips once the row exists, safe to leave running
 * indefinitely.
 */
@Slf4j
@Component
public class LabContactInfoSeeder implements CommandLineRunner {

    private static final Long CONTACT_INFO_ID = 1L;

    private final LabContactInfoRepository labContactInfoRepository;

    // Reuses the same lab.name property LabLocationSeeder defaults to —
    // one lab, same display name in both places.
    @Value("${lab.name:KNUST 3D Printing Lab}")
    private String labName;

    @Value("${lab.contact-email:contact@printforge.example}")
    private String contactEmail;

    @Value("${lab.contact-phone:+233000000000}")
    private String contactPhone;

    public LabContactInfoSeeder(LabContactInfoRepository labContactInfoRepository) {
        this.labContactInfoRepository = labContactInfoRepository;
    }

    @Override
    public void run(String... args) {
        if (labContactInfoRepository.existsById(CONTACT_INFO_ID)) {
            log.info("Lab contact info already exists, skipping seed");
            return;
        }

        LabContactInfo contactInfo = new LabContactInfo();
        contactInfo.setId(CONTACT_INFO_ID);
        contactInfo.setLabName(labName);
        contactInfo.setEmail(contactEmail);
        contactInfo.setPhone(contactPhone);

        labContactInfoRepository.save(contactInfo);
        log.info("Default lab contact info seeded");
    }
}

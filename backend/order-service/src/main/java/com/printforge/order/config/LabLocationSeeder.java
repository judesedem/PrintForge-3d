package com.printforge.order.config;

import com.printforge.order.labservice.model.LabLocation;
import com.printforge.order.labservice.repository.LabLocationRepository;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;

/**
 * Bootstraps a default lab location on startup so PrintJobFacadeController
 * has somewhere to point newly-approved jobs at. Idempotent: skips entirely
 * once any LabLocation row exists, so it's safe to leave in place
 * indefinitely and won't fight with labs created/edited via /api/labs.
 */
@Slf4j
@Component
public class LabLocationSeeder implements CommandLineRunner {

    private final LabLocationRepository labLocationRepository;

    @Value("${lab.name:KNUST 3D Printing Lab}")
    private String labName;

    @Value("${lab.address:Engineering Block, KNUST, Kumasi}")
    private String labAddress;

    @Value("${lab.latitude:6.6745}")
    private Double labLatitude;

    @Value("${lab.longitude:-1.5716}")
    private Double labLongitude;

    public LabLocationSeeder(LabLocationRepository labLocationRepository) {
        this.labLocationRepository = labLocationRepository;
    }

    @Override
    public void run(String... args) {
        if (labLocationRepository.count() > 0) {
            log.info("Lab location already exists, skipping seed");
            return;
        }

        LabLocation lab = new LabLocation();
        lab.setName(labName);
        lab.setAddress(labAddress);
        lab.setLatitude(labLatitude);
        lab.setLongitude(labLongitude);
        lab.setIsActive(true);

        labLocationRepository.save(lab);
        log.info("Default lab location seeded: {}", labName);
    }
}

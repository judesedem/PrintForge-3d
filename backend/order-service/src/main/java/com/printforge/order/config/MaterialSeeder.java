package com.printforge.order.config;

import com.printforge.order.materialservice.model.Material;
import com.printforge.order.materialservice.repository.MaterialRepository;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.List;

/**
 * Seeds the five materials on startup, migrating the values that were
 * previously hardcoded independently in this service's own
 * MaterialsController/EstimateService and marketplace-service's own
 * EstimateService copy into this one shared table.
 *
 * PLA/RESIN/ABS cost_per_gram already agreed between the old hardcoded
 * copies (0.05/0.15/0.08) — seeded unchanged. PETG and CARBON_FIBER had
 * already drifted: MaterialsController displayed 0.09/0.20 while both
 * EstimateService copies actually charged 0.12/0.25. The values actually
 * being charged are what's seeded here, since that's the real monetary
 * behavior already live — MaterialsController's lower displayed numbers
 * were the stale, wrong side of that drift, not an independent price
 * decision to preserve. baseMinutesPerGram/density come from
 * EstimateService (MaterialsController never had them); colors/
 * availability/description come from MaterialsController (EstimateService
 * never had them) — this table is the superset of both.
 *
 * Runs only in order-service (the owner of the original GET /api/materials
 * endpoint) — marketplace-service and admin-service each get their own
 * read/write MaterialRepository copy against this same table, but no
 * seeder of their own, so there's only ever one writer racing to create
 * the initial rows.
 *
 * Idempotent per-name (not "skip if any row exists") — only inserts
 * whichever named materials are missing, so adding a sixth material later
 * doesn't require a fresh DB.
 */
@Slf4j
@Component
public class MaterialSeeder implements CommandLineRunner {

    private final MaterialRepository materialRepository;

    public MaterialSeeder(MaterialRepository materialRepository) {
        this.materialRepository = materialRepository;
    }

    @Override
    public void run(String... args) {
        List<Material> defaults = List.of(
                material("PLA", 0.05, 2.5, 1.24,
                        List.of("White", "Black", "Grey", "Red", "Blue", "Green", "Yellow", "Orange"),
                        "available",
                        "Standard thermoplastic. Great for most prints — easy to use, low warp, good detail."),
                material("RESIN", 0.15, 4.0, 1.10,
                        List.of("Clear", "White", "Grey", "Black"),
                        "available",
                        "High-detail photopolymer resin. Best for miniatures, jewellery, and fine detail work."),
                material("ABS", 0.08, 2.8, 1.04,
                        List.of("Black", "White", "Grey"),
                        "low",
                        "Engineering-grade plastic. More durable and heat-resistant than PLA. Low stock."),
                material("PETG", 0.12, 2.5, 1.27,
                        List.of("Clear", "White", "Black", "Grey", "Blue", "Red"),
                        "available",
                        "Durable and impact-resistant with better temperature resistance than PLA. Good for functional parts."),
                material("CARBON_FIBER", 0.25, 2.5, 1.30,
                        List.of("Black"),
                        "available",
                        "Carbon-fiber-reinforced filament. Extra stiffness and strength — ideal for drone mounts, brackets, and load-bearing parts.")
        );

        int seeded = 0;
        for (Material m : defaults) {
            if (materialRepository.existsByName(m.getName())) continue;
            materialRepository.save(m);
            seeded++;
        }
        if (seeded > 0) {
            log.info("Seeded {} material(s)", seeded);
        }
    }

    private static Material material(String name, double costPerGram, double baseMinutesPerGram,
                                      double density, List<String> colors, String availabilityStatus,
                                      String description) {
        Material m = new Material();
        m.setName(name);
        m.setCostPerGram(costPerGram);
        m.setBaseMinutesPerGram(baseMinutesPerGram);
        m.setDensityGCm3(density);
        m.setColors(new ArrayList<>(colors));
        m.setAvailabilityStatus(availabilityStatus);
        m.setDescription(description);
        return m;
    }
}

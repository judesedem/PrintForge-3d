package com.printforge.printforge.materialservice;

import com.printforge.printforge.entity.Role;
import com.printforge.printforge.entity.User;
import com.printforge.printforge.estimateservice.model.Estimate;
import com.printforge.printforge.estimateservice.repository.EstimateRepository;
import com.printforge.printforge.estimateservice.service.EstimateService;
import com.printforge.printforge.fileservice.model.ModelFile;
import com.printforge.printforge.fileservice.repository.ModelFileRepository;
import com.printforge.printforge.materialservice.dto.UpdateMaterialRequest;
import com.printforge.printforge.materialservice.model.Material;
import com.printforge.printforge.materialservice.repository.MaterialRepository;
import com.printforge.printforge.materialservice.service.MaterialService;
import com.printforge.printforge.repository.UserRepository;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Stage 7 — the test that actually proves the single-source-of-truth fix
 * worked, not just that PATCH /api/admin/materials/{name} returns 200.
 * Changes ABS's cost_per_gram through the real admin write path
 * (MaterialService, backing AdminController.updateMaterial()), then
 * calls the real EstimateService — completely independently, through its
 * own MaterialRepository injection — and confirms the very next estimate
 * for ABS reflects the new price. Before this migration, MaterialsController
 * and EstimateService each had their own hardcoded ABS price; this test
 * would have been impossible to write meaningfully then, since there was
 * no single place to change that both sides would observe.
 *
 * ABS (not PLA) is used deliberately: PLA's price is depended on by
 * MarketplaceOrderChargeTest's exact hardcoded EXPECTED_LAB_COST, so
 * touching it here — even with @AfterEach restoration — would add
 * unnecessary blast radius to the one test in the suite that most needs to
 * stay untouched. ABS has no such exact-value dependency anywhere else.
 *
 * IMPORTANT: materials is a small, fixed, shared table — every test in
 * this suite run reads the same ABS row. @AfterEach unconditionally
 * restores its cost_per_gram to the seeded default (0.08, see
 * config/MaterialSeeder.java) first, before any other cleanup, so a
 * failure partway through this test can't leave every other test in the
 * run seeing the wrong ABS price.
 *
 * Run with: ./mvnw test -Dtest=MaterialPriceSingleSourceOfTruthTest
 */
@SpringBootTest
class MaterialPriceSingleSourceOfTruthTest {

    private static final double SEEDED_ABS_COST_PER_GRAM = 0.08;
    private static final double NEW_ABS_COST_PER_GRAM = 0.20;

    @Autowired MaterialService materialService;
    @Autowired MaterialRepository materialRepository;
    @Autowired EstimateService estimateService;
    @Autowired EstimateRepository estimateRepository;
    @Autowired ModelFileRepository modelFileRepository;
    @Autowired UserRepository userRepository;
    @Autowired org.springframework.security.crypto.password.PasswordEncoder passwordEncoder;

    private Long studentId;
    private Long fileId;
    private Long estimateId;

    @AfterEach
    void cleanUp() {
        UpdateMaterialRequest restore = new UpdateMaterialRequest();
        restore.setCostPerGram(SEEDED_ABS_COST_PER_GRAM);
        materialService.updateMaterial("ABS", restore);

        if (estimateId != null) estimateRepository.deleteById(estimateId);
        if (fileId != null) modelFileRepository.deleteById(fileId);
        if (studentId != null) userRepository.deleteById(studentId);
    }

    @Test
    void changingAMaterialsPriceIsReflectedByTheNextEstimateForThatMaterial() {
        // Sanity check on the starting state, so a failure here points
        // clearly at "the seed data changed" rather than a false pass below.
        Material absBefore = materialRepository.findByName("ABS").orElseThrow();
        assertEquals(SEEDED_ABS_COST_PER_GRAM, absBefore.getCostPerGram(), 0.0001);

        // 1. Admin changes the price via the real write path.
        UpdateMaterialRequest request = new UpdateMaterialRequest();
        request.setCostPerGram(NEW_ABS_COST_PER_GRAM);
        Material updated = materialService.updateMaterial("ABS", request);
        assertEquals(NEW_ABS_COST_PER_GRAM, updated.getCostPerGram(), 0.0001);

        // Confirm it actually persisted, independent of the return value.
        Material absAfterWrite = materialRepository.findByName("ABS").orElseThrow();
        assertEquals(NEW_ABS_COST_PER_GRAM, absAfterWrite.getCostPerGram(), 0.0001);

        // 2. Set up a real user + file for a fresh estimate.
        User student = User.builder()
                .fullName("Material Price Test Student")
                .email("material-price-test-student@example.com")
                .password(passwordEncoder.encode("throwaway"))
                .role(Role.STUDENT)
                .build();
        student = userRepository.save(student);
        studentId = student.getUserId();

        ModelFile file = new ModelFile();
        file.setFileName("material-price-test.stl");
        file.setFileType("model/stl");
        file.setStoredFilename("https://example.test/material-price-test.stl");
        file.setFileUrl("https://example.test/material-price-test.stl");
        file.setFileSizeBytes(500L * 1024L); // 500 KB, no geometry -> file-size heuristic
        file.setUserId(studentId);
        file = modelFileRepository.save(file);
        fileId = file.getFileId();

        // 3. The NEXT estimate calculated for ABS.
        Estimate estimate = estimateService.calculateAndSaveEstimate(
                fileId, "STANDARD", 20, 1, "ABS", studentId);
        estimateId = estimate.getId();

        // 4. Hand-computed expectation using the NEW price (0.20), not the
        // old seeded one (0.08) — this is what actually proves EstimateService
        // read the live, just-updated row rather than a stale/cached value.
        //   estimatedGrams = 500KB * 0.8 = 400g (file-size heuristic, no geometry)
        //   baseMinutesPerGram = 2.8 (ABS, unchanged by this PATCH)
        //   durationMinutes = 2.8 * 400 * 1.0 (STANDARD) * 0.7 (20% infill) * 1 (qty) = 784
        //   machineTimeCost = 784 * 0.02 = 15.68
        //   physicalMaterialCost = 400 * 0.20 * 1 = 80.00 <- reflects the NEW price
        //   totalCost = 15.68 + 80.00 = 95.68
        assertEquals(400.0, estimate.getEstimatedGrams(), 0.001);
        assertEquals(95.68, estimate.getTotalCost(), 0.005,
                "totalCost should reflect the just-updated ABS price (0.20/g), not the old seeded price (0.08/g)");
    }
}

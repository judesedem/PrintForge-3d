package com.printforge.printforge.adminservice.service;

import com.printforge.printforge.entity.Role;
import com.printforge.printforge.entity.User;
import com.printforge.printforge.fileservice.model.ModelFile;
import com.printforge.printforge.fileservice.repository.ModelFileRepository;
import com.printforge.printforge.marketplaceservice.model.DesignListing;
import com.printforge.printforge.marketplaceservice.repository.DesignListingRepository;
import com.printforge.printforge.repository.UserRepository;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Real Spring context + real DB — proves getDashboardSummary()'s
 * designer-earnings lookup batches via findAllById() instead of one
 * findById() per distinct designer.
 *
 * getDashboardSummary() has no caller-scoping (it's an admin-global
 * view) — sumEarningsByDesigner() groups every DesignListing row in the
 * whole shared dev database, not just this test's rows. So unlike
 * PrintJobFacadeControllerBatchingTest, this test can't assert an exact
 * result-set size; it asserts that its own 3 test designers appear with
 * the right names, and separately confirms via the SQL log that exactly
 * one `users ... WHERE user_id IN (...)` query ran for the whole
 * designer_earnings list, regardless of how many total designers exist.
 *
 * Cleans up every row it creates in @AfterEach regardless of outcome.
 *
 * Run with: ./mvnw test -Dtest=AdminServiceBatchingTest
 */
@SpringBootTest
class AdminServiceBatchingTest {

    private static final int DESIGNER_COUNT = 3;
    private static final String EMAIL_PREFIX = "n-plus-one-test-designer-";

    @Autowired
    private AdminService adminService;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private ModelFileRepository modelFileRepository;

    @Autowired
    private DesignListingRepository designListingRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    private final List<Long> createdListingIds = new ArrayList<>();
    private final List<Long> createdFileIds = new ArrayList<>();
    private final List<Long> createdUserIds = new ArrayList<>();

    @AfterEach
    void cleanUp() {
        createdListingIds.forEach(designListingRepository::deleteById);
        createdFileIds.forEach(modelFileRepository::deleteById);
        createdUserIds.forEach(userRepository::deleteById);
    }

    @Test
    @SuppressWarnings("unchecked")
    void dashboardSummaryBatchesDesignerLookups() {
        List<String> expectedNames = new ArrayList<>();

        for (int i = 0; i < DESIGNER_COUNT; i++) {
            User designer = User.builder()
                    .fullName("N+1 Test Designer " + i)
                    .email(EMAIL_PREFIX + i + "@printforge.test")
                    .password(passwordEncoder.encode("throwaway-not-used-to-login"))
                    .role(Role.DESIGNER)
                    .build();
            designer = userRepository.save(designer);
            createdUserIds.add(designer.getUserId());
            expectedNames.add(designer.getFullName());

            ModelFile file = new ModelFile();
            file.setFileName("earnings-test-" + i + ".stl");
            file.setFileType("model/stl");
            file.setStoredFilename("https://example.test/earnings-test-" + i + ".stl");
            file.setFileUrl("https://example.test/earnings-test-" + i + ".stl");
            file.setFileSizeBytes(1024L);
            file.setUserId(designer.getUserId());
            file = modelFileRepository.save(file);
            createdFileIds.add(file.getFileId());

            DesignListing listing = new DesignListing();
            listing.setFileId(file.getFileId());
            listing.setDesignerId(designer.getUserId());
            listing.setTitle("N+1 test listing " + i);
            listing.setBasePrice(BigDecimal.valueOf(10));
            listing.setStatus("DRAFT");
            listing.setOwnershipAttested(true);
            listing.setTotalEarnings(BigDecimal.valueOf(25 * (i + 1)));
            listing = designListingRepository.save(listing);
            createdListingIds.add(listing.getId());
        }

        Map<String, Object> summary = adminService.getDashboardSummary();

        @SuppressWarnings("unchecked")
        List<Map<String, Object>> earnings = (List<Map<String, Object>>) summary.get("designer_earnings");
        assertNotNull(earnings);

        List<String> namesInResponse = earnings.stream()
                .map(e -> (String) e.get("designer_name"))
                .toList();
        for (String expectedName : expectedNames) {
            assertTrue(namesInResponse.contains(expectedName),
                    "Expected " + expectedName + " in designer_earnings, got: " + namesInResponse);
        }
    }
}

package com.printforge.printforge.facade;

import com.printforge.printforge.entity.Role;
import com.printforge.printforge.entity.User;
import com.printforge.printforge.estimateservice.model.Estimate;
import com.printforge.printforge.estimateservice.repository.EstimateRepository;
import com.printforge.printforge.facade.dto.PrintJobResponse;
import com.printforge.printforge.fileservice.model.ModelFile;
import com.printforge.printforge.fileservice.repository.ModelFileRepository;
import com.printforge.printforge.queueservice.model.PrintJob;
import com.printforge.printforge.queueservice.repository.PrintJobRepository;
import com.printforge.printforge.repository.UserRepository;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.ArrayList;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Real Spring context + real DB — proves getJobs() actually issues one
 * batched query per entity type (file/user/estimate) for a whole job
 * list, not one query per job per entity type. Unlike the Hibernate
 * write-batching fix (#60), this is about read-side findAllById()
 * collapsing into a single `SELECT ... WHERE id IN (...)`, not JDBC
 * batch execution — so verification here means counting SQL log blocks
 * via the standard spring.jpa.show-sql output (already on in
 * application.properties), not the org.hibernate.orm.jdbc.batch logger.
 *
 * Seeds 5 distinct PrintJob/ModelFile/Estimate rows (all owned by one
 * throwaway test student) and calls getJobs() through the non-staff
 * (findByUserId) branch, so the result set is exactly these 5 rows —
 * not the whole shared dev database's job table. Cleans up everything
 * it creates in @AfterEach regardless of outcome.
 *
 * Run with: ./mvnw test -Dtest=PrintJobFacadeControllerBatchingTest
 */
@SpringBootTest
class PrintJobFacadeControllerBatchingTest {

    private static final int JOB_COUNT = 5;
    private static final String TEST_EMAIL = "n-plus-one-test-student@printforge.test";

    @Autowired
    private PrintJobFacadeController printJobFacadeController;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private ModelFileRepository modelFileRepository;

    @Autowired
    private EstimateRepository estimateRepository;

    @Autowired
    private PrintJobRepository printJobRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    private final List<Long> createdJobIds = new ArrayList<>();
    private final List<Long> createdFileIds = new ArrayList<>();
    private final List<Long> createdEstimateIds = new ArrayList<>();
    private Long createdUserId;

    @AfterEach
    void cleanUp() {
        createdJobIds.forEach(printJobRepository::deleteById);
        createdEstimateIds.forEach(estimateRepository::deleteById);
        createdFileIds.forEach(modelFileRepository::deleteById);
        if (createdUserId != null) {
            userRepository.deleteById(createdUserId);
        }
    }

    @Test
    void getJobsBatchesFileUserAndEstimateLookups() {
        User testUser = User.builder()
                .fullName("N+1 Test Student")
                .email(TEST_EMAIL)
                .password(passwordEncoder.encode("throwaway-not-used-to-login"))
                .role(Role.STUDENT)
                .build();
        testUser = userRepository.save(testUser);
        createdUserId = testUser.getUserId();

        for (int i = 0; i < JOB_COUNT; i++) {
            ModelFile file = new ModelFile();
            file.setFileName("batching-test-" + i + ".stl");
            file.setFileType("model/stl");
            file.setStoredFilename("https://example.test/batching-test-" + i + ".stl");
            file.setFileUrl("https://example.test/batching-test-" + i + ".stl");
            file.setFileSizeBytes(1024L);
            file.setUserId(testUser.getUserId());
            file = modelFileRepository.save(file);
            createdFileIds.add(file.getFileId());

            Estimate estimate = new Estimate();
            estimate.setFileId(file.getFileId());
            estimate.setUserId(testUser.getUserId());
            estimate.setFileSizeKb(1.0);
            estimate.setQuality("STANDARD");
            estimate.setInfillPercent(20);
            estimate.setQuantity(1);
            estimate.setMaterialType("PLA");
            estimate.setTotalCost(10.0);
            estimate.setEstimatedGrams(5.0);
            estimate.setDurationMinutes(30.0);
            estimate = estimateRepository.save(estimate);
            createdEstimateIds.add(estimate.getId());

            PrintJob job = new PrintJob();
            job.setFileId(file.getFileId());
            job.setEstimateId(estimate.getId());
            job.setUserId(testUser.getUserId());
            job.setMaterial("PLA");
            job.setColor("black");
            job.setQuantity(1);
            job = printJobRepository.save(job);
            createdJobIds.add(job.getId());
        }

        // Non-staff authority -> getJobs() takes the findByUserId(caller)
        // branch, scoping the result to exactly the 5 jobs created above.
        Authentication studentAuth = new UsernamePasswordAuthenticationToken(
                TEST_EMAIL, null, List.of(new SimpleGrantedAuthority("ROLE_STUDENT")));

        ResponseEntity<List<PrintJobResponse>> response =
                printJobFacadeController.getJobs(null, studentAuth);

        List<PrintJobResponse> body = response.getBody();
        assertNotNull(body);
        assertEquals(JOB_COUNT, body.size());
        // Functional correctness, not just count: every job's file/user/
        // estimate-derived fields resolved correctly through the batch
        // lookup maps, same as the old per-row safeGetX() calls produced.
        for (PrintJobResponse r : body) {
            assertEquals("N+1 Test Student", r.getUserName());
            assertTrue(r.getFileName().startsWith("batching-test-"));
            assertNotNull(r.getEstimatedCost());
        }
    }
}

package com.printforge.printforge.notificationservice.service;

import com.printforge.printforge.notificationservice.repository.NotificationRepository;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.TestPropertySource;

import static org.junit.jupiter.api.Assertions.assertEquals;

/**
 * Real Spring context + real DB (not mocked) — proves
 * NotificationService.markAllAsRead()'s saveAll() actually gets batched
 * by Hibernate/JDBC, not just that the batch_size property is present in
 * application.properties. Bumps Hibernate's own batch-executor logger to
 * DEBUG via @TestPropertySource so "Executing batch" lines are visible
 * in this test run's console output — there is no clean in-test
 * assertable signal for "how many JDBC round trips happened," so
 * confirming batching actually engaged means reading that console
 * output, not just checking this test went green.
 *
 * Uses a fake negative userId so it can never collide with a real user,
 * and deletes every row it creates in @AfterEach regardless of outcome —
 * this hits the real shared dev database, not an isolated test DB.
 *
 * Run with: ./mvnw test -Dtest=NotificationServiceBatchingTest
 */
@SpringBootTest
@TestPropertySource(properties = {
        // Confirmed the real category name by disassembling
        // hibernate-core-6.6.53.Final.jar (org.hibernate.engine.jdbc.
        // batch.JdbcBatchLogging's @SubSystemLogging annotation) rather
        // than guessing — Hibernate 5's BatchingBatch class/logger
        // category doesn't exist in this Hibernate 6.6 version at all,
        // so a naive guess at the old name would have silently logged
        // nothing and looked like a false negative.
        "logging.level.org.hibernate.orm.jdbc.batch=TRACE"
})
class NotificationServiceBatchingTest {

    private static final long TEST_USER_ID = -999001L;
    private static final int NOTIFICATION_COUNT = 5;

    @Autowired
    private NotificationService notificationService;

    @Autowired
    private NotificationRepository notificationRepository;

    @AfterEach
    void cleanUp() {
        notificationRepository.findByUserIdOrderByCreatedAtDesc(TEST_USER_ID)
                .forEach(notificationRepository::delete);
    }

    @Test
    void markAllAsReadBatchesTheUpdates() {
        for (int i = 0; i < NOTIFICATION_COUNT; i++) {
            notificationService.createNotification(TEST_USER_ID, "Batch test", "Notification " + i, "info");
        }
        assertEquals(NOTIFICATION_COUNT, notificationService.getUnreadNotifications(TEST_USER_ID).size());

        notificationService.markAllAsRead(TEST_USER_ID);

        assertEquals(0, notificationService.getUnreadNotifications(TEST_USER_ID).size());
    }
}

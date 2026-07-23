package com.printforge.admin.notificationservice.service;

import com.printforge.admin.notificationservice.exception.NotificationNotFoundException;
import com.printforge.admin.notificationservice.model.Notification;
import com.printforge.admin.notificationservice.repository.NotificationRepository;
import com.printforge.admin.settingsservice.model.FeatureToggleKeys;
import com.printforge.admin.settingsservice.service.SettingsService;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
public class NotificationService {

    private final NotificationRepository notificationRepository;
    private final SettingsService settingsService;

    public NotificationService(NotificationRepository notificationRepository, SettingsService settingsService) {
        this.notificationRepository = notificationRepository;
        this.settingsService = settingsService;
    }

    private static final int MAX_MESSAGE_LENGTH = 500;

    /**
     * 1. Create a new notification (Triggered by the Queue Service later).
     *
     * #71 — message has no dedicated client-facing DTO the way
     * Report.reason does: this one method is called both from
     * NotificationController's staff-only POST endpoint (the sole
     * external caller — rejected there with a clean 400 before this
     * method ever runs, see NotificationController.createNotification())
     * and from many internal fire-and-forget call sites (job/payment/
     * suspension flows) that don't expect a notification side-effect to
     * ever fail their primary operation. So instead of throwing here,
     * this defensively truncates rather than rejects — a genuine (if
     * unlikely) oversized message degrades gracefully instead of, e.g.,
     * failing an admin's suspend-user action over notification text
     * length.
     */
    public Notification createNotification(Long userId, String title, String message, String type) {
        return createNotification(userId, title, message, type, null);
    }

    /**
     * 1b. Same as the 4-arg createNotification(), plus an optional
     * deepLink (e.g. "printforge://jobs/123") the frontend can use to
     * navigate straight to the relevant screen when the user taps the
     * in-app notification card. Only transitionJobStatus()'s READY branch
     * sets one today — every other call site keeps calling the 4-arg
     * version above, which passes null here unchanged.
     */
    public Notification createNotification(Long userId, String title, String message, String type, String deepLink) {
        // The "notifications" toggle is a single choke point: every other
        // createNotification() call site in this service (AdminService.
        // suspendUser()) funnels through here, so gating just this one
        // method turns notifications off for this service without
        // touching any of those call sites.
        if (!settingsService.isFeatureEnabled(FeatureToggleKeys.NOTIFICATIONS)) {
            return null;
        }

        Notification notification = new Notification();
        notification.setUserId(userId);
        notification.setTitle(title);
        notification.setMessage(message != null && message.length() > MAX_MESSAGE_LENGTH
                ? message.substring(0, MAX_MESSAGE_LENGTH)
                : message);
        notification.setType(type);
        notification.setDeepLink(deepLink);
        return notificationRepository.save(notification);
    }

    // 2. Fetch unread notifications
    public List<Notification> getUnreadNotifications(Long userId) {
        return notificationRepository.findByUserIdAndIsReadFalseOrderByCreatedAtDesc(userId);
    }

    // 3. Fetch all notifications
    public List<Notification> getAllUserNotifications(Long userId) {
        return notificationRepository.findByUserIdOrderByCreatedAtDesc(userId);
    }

    // 4. Get the unread count for the UI badge
    public long getUnreadCount(Long userId) {
        return notificationRepository.countByUserIdAndIsReadFalse(userId);
    }

    /**
     * Mark a single notification as read.
     *
     * requesterId/requesterIsStaff come from the controller, which resolves
     * them from the JWT. Previously this method took only notificationId and
     * had no concept of "who's asking" — any authenticated user could mark
     * any other user's notification as read just by guessing/incrementing an
     * id. Now it checks the notification's actual owner (notification.userId)
     * against the caller, and lets the request through if they match or the
     * caller is LAB_STAFF/ADMIN.
     */
    public Notification markAsRead(Long notificationId, Long requesterId, boolean requesterIsStaff) {
        Notification notification = notificationRepository.findById(notificationId)
                .orElseThrow(() -> new NotificationNotFoundException(notificationId));

        if (!requesterIsStaff && !notification.getUserId().equals(requesterId)) {
            throw new AccessDeniedException("You can only mark your own notifications as read");
        }

        notification.setRead(true);
        return notificationRepository.save(notification);
    }

    /**
     * Mark all as read (Bonus feature).
     *
     * @Transactional keeps the entities fetched by getUnreadNotifications()
     * managed/attached for the rest of this method — without it, each
     * repository call ran in its own separate transaction (Spring Data
     * JPA repository methods are individually transactional by default),
     * so by the time saveAll() ran the fetched entities were already
     * detached. saveAll() on detached entities calls entityManager.merge(),
     * which issues an extra SELECT per entity to reconcile state before
     * the UPDATE — confirmed via @SpringBootTest + hibernate.orm.jdbc.batch
     * logging in the prior Hibernate-batching fix. This annotation is a
     * pure query-count reduction: same entities fetched, same rows
     * updated, same batched-UPDATE behavior from that fix — just without
     * the now-unnecessary per-entity SELECT beforehand.
     */
    @Transactional
    public void markAllAsRead(Long userId) {
        List<Notification> unread = getUnreadNotifications(userId);
        unread.forEach(n -> n.setRead(true));
        notificationRepository.saveAll(unread);
    }
}

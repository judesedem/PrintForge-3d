# PrintForge 3D — Notification Service Authorization Fix

Scope: **Notification Service only**, fixing the IDOR/authorization gaps flagged in the audit.
Auth and File Service untouched (Auth still has its own outstanding issues — role field ignored,
wrong status codes — not addressed here). Estimate and Queue Service also untouched; they have
the same root problem (no ownership/role checks) and are next in line.

## The bugs

1. **IDOR on every user-scoped endpoint.** `GET /api/notifications/user/{userId}`, the unread-count
   endpoint, and "mark all as read" all took `{userId}` straight from the URL with no check that
   the caller *was* that user. Any logged-in student could read or bulk-mark-read any other user's
   notifications by changing a number in the path.
2. **IDOR on mark-single-as-read.** `PATCH /{notificationId}/read` had the same problem — no check
   that the notification being marked actually belonged to the caller.
3. **Unrestricted notification creation.** `POST /api/notifications` was commented "Internal/Admin
   Endpoint" but had zero enforcement — any authenticated student could fire a notification at any
   other user with arbitrary title/message/type (spoofing risk).
4. **Not-found returned 500, not 404.** `markAsRead` threw a plain `RuntimeException`, which the
   global catch-all turns into `"An unexpected error occurred"` — same pattern fixed earlier in
   File Service.

## What changed

| # | Fix | Files |
|---|-----|-------|
| 1 | `@EnableMethodSecurity` added so `@PreAuthorize` works. | `config/SecurityConfig.java` |
| 2 | `POST /api/notifications` now requires `LAB_STAFF` or `ADMIN`. | `notificationservice/controller/NotificationController.java` |
| 3 | Every `{userId}`-scoped endpoint (`GET /user/{userId}`, `GET /user/{userId}/unread/count`, `PATCH /user/{userId}/read-all`) now calls `requireSelfOrStaff(userId, authentication)` first — resolves the caller's real identity from the JWT via `UserRepository.findByEmail(authentication.getName())`, and throws `AccessDeniedException` (→ 403, already wired in `GlobalExceptionHandler`) unless the caller's own id matches, or the caller is staff. | same file |
| 4 | `PATCH /{notificationId}/read` now resolves the caller's id/role in the controller and passes it into `NotificationService.markAsRead(id, requesterId, requesterIsStaff)`, which checks it against the **notification's actual owner** (not a client-supplied id) before allowing the update. | `notificationservice/service/NotificationService.java`, controller |
| 5 | New `NotificationNotFoundException` (404), wired into `GlobalExceptionHandler`. | `notificationservice/exception/NotificationNotFoundException.java` (new), `exception/GlobalExceptionHandler.java` |
| 6 | New unit test (Mockito, no Spring context/DB) proving: owner can mark their own notification read, non-owner gets blocked, staff can override, unknown id throws the new 404 exception. | `notificationservice/service/NotificationServiceTest.java` (new) |

### Design call made, flag if you disagree

LAB_STAFF and ADMIN can view/mark-read **any** user's notifications (not just their own). That
felt right for a support/debugging use case (staff looking into "why didn't this student get
notified"), but it's a judgment call — easy to tighten to "self only, even for staff" if you'd
rather not allow that.

## ⚠️ Still not run/tested by me

Same sandbox limitation as before — no network access to Maven Central, so I can't run `./mvnw`.
Manual read-through only. Please run:

```bash
cd backend/printforge
./mvnw compile
./mvnw test -Dtest=NotificationServiceTest
```

Expect `BUILD SUCCESS` and `Tests run: 4, Failures: 0, Errors: 0`.

### Manual Postman check once the app is running

1. Register **two** users (User A, User B) and log in as each to get two separate tokens.
2. As an ADMIN/LAB_STAFF account, `POST /api/notifications` with `userId` = User A's id → should
   succeed (200). Try the same call as User A or User B (STUDENT role) → should now get **403**.
3. As User A, `GET /api/notifications/user/{User A's id}` → 200, your notification shows up.
4. As User A, `GET /api/notifications/user/{User B's id}` → should now get **403** (this is the
   exact request that used to leak User B's notifications — this is the one to double check).
5. As User A, `PATCH /api/notifications/{a notification belonging to User B}/read` → should now
   get **403**.
6. As ADMIN/LAB_STAFF, repeat steps 4–5 against User A's or User B's data → should succeed, since
   staff are allowed to override (see the design call above).

## Known gaps, deliberately not touched this pass

- **Estimate Service and Queue Service have the identical root problem** (no role checks, no
  ownership checks — Queue Service in particular lets anyone create a job as anyone else, and
  anyone update any job's status). Next in line per the agreed order.
- **Auth Service's role-field bug is still live.** Since LAB_STAFF/ADMIN accounts can't currently
  be created through `/api/auth/register` (it hardcodes STUDENT), you'll need to either fix that
  first or manually flip a row's `role` column in Postgres to `LAB_STAFF`/`ADMIN` to test step 2
  above. Worth fixing Auth's role bug before doing much more Postman testing here, since most of
  these checks need a real staff account to exercise the "staff override" path.

# PrintForge 3D — Queue Service Authorization Fix

Scope: **Queue Service only**. Same root problem as Notification Service — endpoints trusted
whatever the client sent instead of checking who's actually asking. Auth, File, and Notification
Service fixes from earlier passes are untouched. Estimate Service's own gaps (no GET endpoint,
not linked to a job) are still outstanding — Queue Service now validates an estimate *exists*
before attaching it to a job, but can't yet ask Estimate Service to confirm the estimate actually
belongs to this user, since Estimate Service has no ownership concept either yet.

## The bugs

1. **Anyone could create a job as anyone else.** `createPrintJob` took `userId` as a raw
   `@RequestParam` — a student could submit `POST /api/queue?userId=<someone else's id>&...` and
   the job would be attributed to that other person.
2. **Anyone could update any job's status.** `PATCH /{jobId}/status` had no role check — a
   STUDENT could mark any job COMPLETED, assign a fake printer, write operator notes, or set a
   tracking number, the same actions meant for lab staff/admin.
3. **Anyone could list every job in the system.** `GET /api/queue` had no scoping — any logged-in
   user saw every print job belonging to every other user.
4. **No validation that `fileId`/`estimateId` actually exist.** A job could be created referencing
   ids that don't exist anywhere — silent orphaned data.
5. **No validation on the `status` string.** Any text was accepted, uppercased, and saved —
   typo a status and the job is stuck in a permanently broken state with no error.
6. **Not-found errors returned 500, not 404** — the same generic `RuntimeException` pattern fixed
   in File/Notification Service.

## What changed

| # | Fix | Files |
|---|-----|-------|
| 1 | `createPrintJob` no longer takes `userId` from the client — the controller resolves the caller's real id from the JWT (`UserRepository.findByEmail(authentication.getName())`) and passes that in. | `queueservice/controller/PrintQueueController.java` |
| 2 | `PATCH /{jobId}/status` now requires `@PreAuthorize("hasAnyRole('LAB_STAFF', 'ADMIN')")`. | same file |
| 3 | `GET /api/queue` now branches: staff/admin get the full list (optionally filtered by status, same as before); everyone else gets a new `getJobsForUser(callerId, status)` that only returns their own jobs. | controller + `queueservice/service/PrintQueueService.java` |
| 4 | `createPrintJob` now checks `modelFileRepository.existsById(fileId)` and `estimateRepository.existsById(estimateId)` before saving, throwing `ModelFileNotFoundException` (reused from File Service) or the new `EstimateNotFoundException` if either is missing. | `PrintQueueService.java` |
| 5 | `updateJobStatus` now validates the status against a fixed set (`PENDING, SLICING, PRINTING, COMPLETED, FAILED`) and throws the new `InvalidJobStatusException` (400) for anything else. | same file |
| 6 | New `PrintJobNotFoundException` (404), wired into `GlobalExceptionHandler`, replacing the generic `RuntimeException`. | `queueservice/exception/PrintJobNotFoundException.java` (new), `exception/GlobalExceptionHandler.java` |
| 7 | **New endpoint**: `GET /api/queue/{jobId}` — fetch a single job by id, with the same self-or-staff ownership check as Notification Service. Didn't exist before at all (only list endpoints existed), and the API contract doc calls for `GET /api/print-jobs/{id}`. | controller + service |
| 8 | New unit test (`PrintQueueServiceTest`, Mockito, no DB) — proves a job can't be created against a missing file/estimate, status updates reject garbage strings and unknown job ids, and a valid status update still sets timestamps correctly. | `queueservice/service/PrintQueueServiceTest.java` (new) |

### Design call made, flag if you disagree

Staff/admin can view *any* job through `GET /api/queue/{jobId}` and `GET /api/queue` (unscoped) —
same "staff can see everything" choice made for Notification Service, for the same support/ops
reason. Students are scoped to their own jobs only, everywhere.

## ⚠️ Still not run/tested by me

```bash
cd backend/printforge
./mvnw compile
./mvnw test -Dtest=PrintQueueServiceTest
```
Expect `BUILD SUCCESS` and `Tests run: 6, Failures: 0, Errors: 0`.

### Postman: confirm the fixes

You'll need a STUDENT token, a LAB_STAFF or ADMIN token, and at least one uploaded file (File
Service) and one estimate (Estimate Service, via `POST /api/estimates`) to get ids to reference.

1. As STUDENT A, `POST /api/queue?fileId=<real id>&estimateId=<real id>` → 200, job created with
   `userId` = A's own id (check the response — there's no `userId` param to even try spoofing now).
2. As STUDENT A, `POST /api/queue?fileId=99999&estimateId=<real id>` → should now be **404**
   ("No file found with id 99999"), not a silently-created broken job.
3. As STUDENT A, `GET /api/queue` → only A's own job(s) show up.
4. As STUDENT B, `GET /api/queue` → B sees their own jobs, not A's.
5. As STUDENT A, `PATCH /api/queue/{A's job id}/status?status=COMPLETED` → should now be **403**
   (this is the one that used to let students fake-complete their own jobs).
6. As LAB_STAFF, same PATCH call → should succeed, 200.
7. As LAB_STAFF, `PATCH /api/queue/{A's job id}/status?status=not_a_real_status` → should be
   **400** ("Invalid status...").
8. As STUDENT A, `GET /api/queue/{B's job id}` → should be **403**.

## Known gaps, still not touched

- **Estimate Service still has no GET endpoint and isn't linked to a job/file.** Queue Service can
  now confirm an estimate *exists*, but can't confirm it *belongs to the user creating the job* —
  that needs Estimate Service to track ownership first.
- The Queue Service route is `/api/queue`, not `/api/print-jobs` per the original contract doc —
  still flagging this in case it's intentional drift or worth reconciling later.
- Auth Service's self-elevation-to-ADMIN tradeoff is still open (intentionally, per the earlier
  handoff) — worth revisiting once you're done bootstrapping test accounts.

## Suggested next step

**Estimate Service** is the natural next stop — it's the one piece every other service depends on
(`createPrintJob` here, the cost shown to a student before checkout) and it currently can't even
be read back after creation.

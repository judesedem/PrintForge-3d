# PrintForge 3D — File Service Ownership Fix + Queue Service Reference Ownership

Scope: two related fixes, done together since #2 depends on #1's pattern.

1. **File Service**: `GET /{id}`, `GET /{id}/download`, and `GET` (list all) had no ownership
   check — any authenticated user could view/download any file, or list everyone's uploads.
2. **Queue Service**: `createPrintJob` checked that `fileId`/`estimateId` *existed*, but never
   checked they *belonged to the caller*. A student who knew/guessed another student's id could
   create a job using someone else's uploaded file or cost estimate.

## What changed — File Service

| # | Fix | Files |
|---|-----|-------|
| 1 | `GET /api/files/{id}` and `GET /api/files/{id}/download` now check `ModelFile.uploadedBy` (already recorded at upload time) against the caller's email, via the same `requireOwnerOrStaff` pattern used elsewhere. Staff/admin can still access anything. | `fileservice/controller/FileController.java` |
| 2 | `GET /api/files` (list) now branches: staff/admin get everything, everyone else gets only their own uploads via a new `findByUploadedBy` query. | `FileController.java`, `fileservice/repository/ModelFileRepository.java`, `fileservice/service/FileService.java` |
| 3 | New unit test (`FileControllerTest`, Mockito, no DB) — proves owner can view their file, non-owner is blocked, staff can view anyone's, and the list endpoint scopes correctly for both staff and non-staff. | `fileservice/controller/FileControllerTest.java` (new) |

Note: File Service tracks ownership by **email** (`uploadedBy`), not `userId` like every other
service. `authentication.getName()` *is* the email already (that's what the JWT subject is), so
this didn't need a `UserRepository` lookup at all — simpler than the other services, just
inconsistent with them. Worth normalizing to `userId` everywhere at some point, not urgent.

## What changed — Queue Service

| # | Fix | Files |
|---|-----|-------|
| 1 | `createPrintJob` switched from `existsById()` checks to `findById()`, then compares the **file's** `uploadedBy` (email) against the caller's email, and the **estimate's** `userId` against the caller's id. Throws `AccessDeniedException` (→ 403) if either doesn't match. | `queueservice/service/PrintQueueService.java` |
| 2 | Controller now resolves the caller's full `User` (id + email) and passes both into `createPrintJob`. | `queueservice/controller/PrintQueueController.java` |
| 3 | Updated `PrintQueueServiceTest` for the new signature — added two new cases (file belongs to someone else, estimate belongs to someone else) on top of the existing not-found/status tests. | `queueservice/service/PrintQueueServiceTest.java` |

### Design call: no staff override on job creation

Unlike every other "self-or-staff" check in this codebase, there's **no staff override** here.
Creating a job is "use my own file and my own estimate," not a lookup — there's no obvious reason
staff would need to create a job using a student's resources while it's attributed to themselves.
If you later want a "create a job on behalf of a student" staff workflow, that needs its own design
(probably: staff specifies which student the job is *for*, not just which file/estimate to borrow),
not a bypass of this check.

## ⚠️ Still not run/tested by me

```bash
cd backend/printforge
./mvnw compile
./mvnw test -Dtest=FileControllerTest
./mvnw test -Dtest=PrintQueueServiceTest
```
Expect `BUILD SUCCESS`, `Tests run: 5` for FileControllerTest, `Tests run: 8` for
PrintQueueServiceTest, all `Failures: 0, Errors: 0`.

### Postman: confirm the fixes

1. As STUDENT A, upload a file → note the `fileId`.
2. As STUDENT B, `GET /api/files/{A's fileId}` → should now be **403** (was 200 before).
3. As STUDENT B, `GET /api/files/{A's fileId}/download` → **403**.
4. As STUDENT B, `GET /api/files` → only B's own files, not A's.
5. As LAB_STAFF, repeat steps 2–4 → should all succeed (staff override).
6. As STUDENT A, create an estimate for their own file → note the `estimateId`.
7. As STUDENT B, `POST /api/queue?fileId={A's fileId}&estimateId={A's estimateId}` → should now be
   **403** ("You can only create a print job using a file you uploaded yourself") — this is the
   exact request that used to silently succeed and create a job using A's resources under B's name.
8. As STUDENT A, same call with their own ids → 200, succeeds as before.

## Known gaps, still open

- **Ownership field inconsistency** (email vs userId across services) — flagged above, not urgent
  but worth normalizing eventually.
- Auth Service's self-elevation-to-ADMIN tradeoff — still intentionally open.
- JWT secret hardcoded in `application.properties` — still just a hygiene note.
- No CORS configuration exists anywhere — not a vulnerability, but will need addressing once the
  frontend actually starts calling this backend over HTTP from a browser.

This closes out everything identified in the original audit plus everything found along the way.
The backend's authorization story across all 5 services is now consistent: every endpoint either
checks the caller owns the resource, or requires a specific staff role — nothing trusts a
client-supplied id without verifying it first.

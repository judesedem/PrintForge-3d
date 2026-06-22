# PrintForge 3D — Estimate Service Fix

Scope: **Estimate Service only**. Auth, File, Notification, and Queue Service fixes from earlier
passes are untouched.

## The bugs

1. **No way to retrieve an estimate after creating it.** Only `POST /api/estimates` existed —
   no `GET`. The contract doc calls for `GET /api/estimates/{jobId}`, and the old service's own
   code comment admitted Queue Service couldn't actually pull estimate data from anywhere.
2. **The cost-driving number was whatever the client said it was.** `fileSizeKb` was a plain
   `@RequestParam Double` — nothing connected it to an actual uploaded file. A student could send
   `fileSizeKb=1` and get a near-free estimate for a 500MB model, or inflate it for some other
   reason. This is the same trust-the-client problem as Queue Service's old `userId` param, just
   showing up as a pricing/integrity issue instead of an identity one.
3. **Unrecognized `quality`/`materialType` silently fell back to a default** instead of erroring.
   Typo "stadnard" or "plastic" and you'd get a price based on the wrong assumption with no
   indication anything was off.
4. **No ownership at all.** Nothing recorded who requested an estimate, so there was no way to
   later answer "is this your estimate" — which the new GET endpoint needs.

## What changed

| # | Fix | Files |
|---|-----|-------|
| 1 | **`fileSizeKb` request param removed, replaced with `fileId`.** The service now looks up the real `ModelFile` via `ModelFileRepository`, derives `fileSizeKb` from its actual `fileSizeBytes` (`/ 1024.0`), and uses that for every downstream calculation. Throws `ModelFileNotFoundException` (reused from File Service) if the fileId doesn't exist. **This is a breaking API change** — see Postman section below. | `estimateservice/service/EstimateService.java`, `estimateservice/controller/EstimateController.java` |
| 2 | `quality` and `materialType` are now validated against fixed sets (`DRAFT/STANDARD/HIGH`, `PLA/RESIN/ABS`) — anything else throws the new `InvalidEstimateInputException` (400) instead of silently defaulting. | `EstimateService.java`, new `estimateservice/exception/InvalidEstimateInputException.java` |
| 3 | `Estimate` entity gained `fileId`, `userId`, and `createdAt`. The estimate now records which file it was calculated from and who requested it. | `estimateservice/model/Estimate.java` |
| 4 | **New `GET /api/estimates/{id}`** — fetch a single estimate, with the same self-or-staff ownership check used in File/Notification/Queue Service. | `EstimateController.java`, `EstimateService.getEstimateById()` |
| 5 | New unit test (`EstimateServiceTest`, Mockito, no DB) — proves the calculated size matches the real file's stored size (not a client-supplied number), unknown `fileId`/`quality`/`materialType` are all rejected, and `getEstimateById` throws 404 for an unknown id. | `estimateservice/service/EstimateServiceTest.java` (new) |

`EstimateNotFoundException` and the `existsById(estimateId)` check in Queue Service were already
added in the previous pass — this fix is what actually makes that exception reachable via a real
endpoint (`GET /api/estimates/{id}`) rather than only internally.

## ⚠️ Breaking API change — read before testing in Postman

The old request:
```
POST /api/estimates?fileSizeKb=500&quality=STANDARD&infillPercent=20&quantity=1&materialType=PLA
```
is now:
```
POST /api/estimates?fileId=<a real id from File Service>&quality=STANDARD&infillPercent=20&quantity=1&materialType=PLA
```
You need a file already uploaded (File Service) before you can generate an estimate for it now.
This was a deliberate tradeoff: the alternative (keep trusting a client-supplied size) leaves the
whole pricing model open to manipulation, and there isn't a way to validate a client-supplied
number against anything without tying it to a real file anyway.

## ⚠️ Database: same lesson as before, drop+recreate is the easy path

`fileId` and `userId` are nullable (deliberately — see the comment in `Estimate.java`), but if you
want them enforced going forward, or just want a clean slate:
```sql
DROP TABLE estimates;
```
then restart the app — Hibernate will recreate it from the current entity. Don't bother trying to
`ALTER TABLE ... ADD COLUMN ... NOT NULL` by hand if you've already got estimate rows from earlier
testing; Postgres will reject it without a default value.

## ⚠️ Still not run/tested by me

```bash
cd backend/printforge
./mvnw compile
./mvnw test -Dtest=EstimateServiceTest
```
Expect `BUILD SUCCESS` and `Tests run: 5, Failures: 0, Errors: 0`.

### Postman: confirm the fixes

1. Upload a file via File Service first if you haven't, note its `fileId`.
2. As STUDENT A: `POST /api/estimates?fileId=<that id>&quality=STANDARD&infillPercent=20&quantity=1&materialType=PLA`
   → 200, check `fileSizeKb` in the response matches the file's actual size (compare against what
   File Service reported on upload), not some arbitrary number.
3. Same call with `fileId=99999` (nonexistent) → **404**.
4. Same call with `materialType=wood` → **400** ("Invalid materialType...").
5. As STUDENT A: `GET /api/estimates/{the id from step 2}` → 200, your estimate.
6. As STUDENT B: `GET /api/estimates/{STUDENT A's estimate id}` → **403**.
7. As LAB_STAFF/ADMIN: same call as step 6 → 200 (staff override, same pattern as other services).

## Known gaps, still not touched

- **Estimate Service route doesn't match the contract** (`/api/estimates` + `/{id}`, not
  `/api/estimates/{jobId}` as written in `docs/API_CONTRACT.MD`) — same kind of drift flagged for
  Queue Service. Worth reconciling the doc once all services are stable, rather than chasing it now.
- Auth Service's self-elevation-to-ADMIN tradeoff is still open.
- The original audit's full list (Auth/File/Notification/Queue/Estimate) is now fully addressed —
  worth a fresh end-to-end pass once all 5 are wired together with the frontend, since some of
  these fixes change request shapes the frontend doesn't call yet (e.g. `apiSubmitJob` still
  doesn't know about `fileId`-based estimates or job creation at all — that integration is still
  outstanding, flagged back when we first looked at File Service).

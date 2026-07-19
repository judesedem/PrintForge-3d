
# PrintForge 3D — Review of Your Edits to Printer Cascading + Route Renames

Scope: you uploaded a backend with your own edits layered on top of an earlier delivery (before
my final printer-cascading handoff). I diffed it against everything I'd previously sent to see
exactly what changed, found two real problems, and fixed both.

## 1. Regression: OFFLINE/MAINTENANCE printers could be assigned a job (real bug)

Your printer-assignment check was:
```java
if ("BUSY".equals(newPrinter.getStatus()) && !printerId.equals(job.getAssignedPrinter())) {
    throw new PrinterBusyException(printerId);
}
```
This only rejects a printer whose status is the **literal string `"BUSY"`**. A printer marked
`OFFLINE` (unplugged, broken) or `MAINTENANCE` (being serviced) would sail right through this
check, get silently flipped to `BUSY`, and have a job assigned to it — exactly the scenario the
whole point of having those statuses was supposed to prevent.

**Fix:** changed the condition to check for "not AVAILABLE" instead of "is BUSY":
```java
boolean reassigningSamePrinter = printerId.equals(job.getAssignedPrinter());
if (!reassigningSamePrinter && !"AVAILABLE".equals(newPrinter.getStatus())) {
    throw new PrinterBusyException(printerId, newPrinter.getStatus());
}
```
Also updated `PrinterBusyException` to take the actual status and reflect it in the message,
since it's no longer accurate to assume the blocking reason is always literally "BUSY."

**File:** `queueservice/service/PrintQueueService.java`, `printerservice/exception/PrinterBusyException.java`.

## 2. Your test suite was out of sync with your implementation and would fail/error if run

`PrintQueueServiceTest.java` still mocked `printerRepository.existsByPrinterName(...)` — but the
current implementation doesn't call that method at all anymore, it calls `findByPrinterName(...)`
exclusively. Since `findByPrinterName` was never stubbed in those tests, Mockito returns `null`
(its default for unstubbed object-returning methods), and `.orElseThrow()` on a `null` reference
throws a **`NullPointerException`** — not the exception each test was actually asserting:

- `updateJobStatusSucceedsForValidStatusCaseInsensitive` → would NPE instead of succeeding.
- `updateJobStatusRejectsUnregisteredPrinter` → would NPE instead of throwing
  `PrinterNotFoundException`, so the test fails (wrong exception type thrown).

Worth noting: even if these had been passing, **there was zero test coverage for the new BUSY-
rejection logic, the cascading itself, or the OFFLINE/MAINTENANCE bug above** — which is exactly
why that regression could ship without anything catching it.

**Fix:** rewrote the test file to match the current `findByPrinterName`-based implementation, and
added explicit coverage:
- Assigning an AVAILABLE printer flips it to BUSY.
- Assigning an unregistered printer still throws `PrinterNotFoundException`.
- **A parameterized regression test** — `assigningANonAvailablePrinterIsRejectedRegardlessOfWhichNonAvailableStatus`,
  run against `OFFLINE`, `MAINTENANCE`, and `BUSY` — so this exact bug can't silently come back
  without a test failing.
- Reassigning the same printer already on a job is allowed even though it's BUSY.
- Reassigning to a different printer frees the old one and busies the new one.
- Completing/failing a job frees its assigned printer; completing a job with no printer at all
  doesn't throw.

**File:** `src/test/java/.../queueservice/service/PrintQueueServiceTest.java`.

## 3. Misleading rename, not a bug — but a landmine I fixed anyway

`EstimateController`'s `GET /api/estimates/{id}` had its path variable renamed to `{jobId}` —
presumably to look like it matches the contract doc. **The lookup underneath was never changed —
it still queries by the estimate's own id, not a print job's id.** The comment sitting directly
above the method even still correctly explained "this is by estimate id, since an estimate is
created before a job exists" — directly contradicting the parameter name right below it.

Calling it `{jobId}` while it actually requires an estimate id is a real trap: anyone reading the
route (you, in a few weeks, or whoever builds the frontend call) would reasonably pass a print
job's id and get a 404 — or worse, an unrelated estimate that happens to share that numeric id with
the job they meant to look up.

**Fix:** reverted the path variable back to `{id}`, kept the existing correct comment, and added a
note explaining why the rename was reverted. If you want this endpoint to actually accept a job's
id (look up the job, then return its estimate), that's a real, different feature — it'd need
Estimate Service to depend on Queue Service's `PrintJobRepository`, and it would only work *after*
a job exists, which breaks the "check your quote before submitting" flow that currently works
right after creating an estimate. Flagging this as a design choice you can revisit, not something
I changed unilaterally beyond the naming.

**File:** `estimateservice/controller/EstimateController.java`.

## Good change, no issue: `/api/queue` → `/api/print-jobs`

You renamed `PrintQueueController`'s route to `/api/print-jobs`, matching `docs/API_CONTRACT.MD`
properly. Checked for route conflicts across every controller — none. No bug here, just noting it
since it's a real, deliberate improvement I didn't make myself (I didn't have that doc in my
working copy at the time).

## ⚠️ Still not run/tested by me

```bash
cd backend/printforge
./mvnw compile
./mvnw test -Dtest=PrintQueueServiceTest
```
Expect `BUILD SUCCESS`, `Tests run: 17, Failures: 0, Errors: 0` (the parameterized test counts as
3 of those 17, one per status value).

### Postman: confirm both fixes

1. Register a printer, manually set its status to `OFFLINE` via
   `PUT /api/admin/printers/{id}/status?status=OFFLINE`.
2. Try `PATCH /api/print-jobs/{jobId}/status?status=PRINTING&printerId={that printer}` →
   should now be **409** ("...is not available right now (current status: OFFLINE)") — this used
   to silently succeed and flip it to BUSY before the fix.
3. `GET /api/estimates/{a real estimate id}` → 200, as before (this still works the same way, the
   route name change reverted but behavior was never broken — just the naming was confusing).

## Everything else checked, no other differences found

Diffed your entire upload against my last delivery file-by-file. Every other service (Auth, File,
Estimate's POST/calculation logic, Notification, Admin, the rest of Printer/Queue) was byte-for-
byte identical to what I'd already sent — so nothing else regressed.

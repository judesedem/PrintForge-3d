# PrintForge 3D — Admin Service + Printer Management (new feature)

Scope: **new functionality**, not a vulnerability fix. Builds out the Admin Service from the
original proposal, which didn't exist at all: no `Printer` entity, no printer list, no dashboard,
and Queue Service let staff type any free-text string into a job's assigned printer with zero
validation.

## What was built

| Package | What's in it |
|---------|---------------|
| `printerservice` | `Printer` entity (`printerName`, `status`, `labLocation`, `createdAt`), `PrinterRepository`, `PrinterService` (register/list/update-status), 3 exceptions, and `PrinterController` (the public-facing piece). |
| `adminservice` | `AdminService` (dashboard aggregation) and `AdminController` (the staff-only management endpoints). |

### Endpoints

| Endpoint | Who can call it | What it does |
|----------|------------------|---------------|
| `GET /api/printers/available` | **Any authenticated user** | Returns only printers currently `AVAILABLE`. This is the "list of available printers" you asked for — deliberately open to students too, not staff-only, since anyone tracking or about to submit a job benefits from knowing what's free. |
| `GET /api/admin/printers` | LAB_STAFF / ADMIN | Every printer, any status — the full management view. |
| `POST /api/admin/printers` | LAB_STAFF / ADMIN | Registers a new printer. **Not in the original contract doc** — the proposal lists endpoints for reading/updating printers but never creating one, which would leave the list permanently empty. Added because the feature is useless without it. |
| `PUT /api/admin/printers/{id}/status` | LAB_STAFF / ADMIN | Updates a printer's status. Validated against `AVAILABLE/BUSY/OFFLINE/MAINTENANCE` — same pattern as job status validation. |
| `GET /api/admin/dashboard` | LAB_STAFF / ADMIN | Summary: total jobs + a breakdown by status, total printers + a breakdown by status. Matches the proposal's "provide a dashboard for print queue monitoring and service oversight" requirement. |

### The integration: Queue Service now validates printers for real

`PrintQueueService.updateJobStatus`'s `printerId` parameter used to be pure free text — staff
could type `"Definitely-A-Printer"` and it'd save with no error. Now it checks
`PrinterRepository.existsByPrinterName(printerId)` before assigning, and throws the new
`PrinterNotFoundException` (404) if it doesn't match a real registered printer. This is the direct
fix for the gap flagged a few turns back ("no actual list of printers, no way to know which ones
exist").

**Deliberately not done:** automatic status cascading (e.g. assigning a job to a printer doesn't
flip that printer to `BUSY`, completing a job doesn't flip it back to `AVAILABLE`). That's a real
feature with real design questions (what if staff reassigns mid-print? what if a job fails?) —
flagging it as the natural next step rather than guessing at the right behavior.

### New unit tests

- `PrinterServiceTest` — registration defaults to AVAILABLE, duplicate names rejected, status
  validated and case-insensitive, unknown printer id throws 404.
- `AdminServiceTest` — dashboard correctly counts jobs/printers grouped by status.
- `PrintQueueServiceTest` — updated with two new cases: assigning a registered printer succeeds,
  assigning an unregistered one throws `PrinterNotFoundException`; plus a case confirming that
  *not* passing a printerId doesn't touch `assignedPrinter` at all (so partial status updates
  without reassigning a printer still work).

## ⚠️ Database: new table, you'll want to seed it

`printers` is a brand new table — nothing to migrate, just `DROP TABLE IF EXISTS printers;` if you
ever need to reset it specifically, otherwise it'll just be created fresh on first run via
`ddl-auto=update`. **It starts empty.** You'll need to register at least one printer via
`POST /api/admin/printers` before Queue Service will accept any `printerId` on a status update —
otherwise every `PATCH /api/queue/{jobId}/status?printerId=...` call will now correctly 404.

## ⚠️ Still not run/tested by me

```bash
cd backend/printforge
./mvnw compile
./mvnw test -Dtest=PrinterServiceTest
./mvnw test -Dtest=AdminServiceTest
./mvnw test -Dtest=PrintQueueServiceTest
```
Expect `BUILD SUCCESS` and all green (5, 1, and 9 tests respectively).

### Postman: try it end to end

1. As LAB_STAFF/ADMIN: `POST /api/admin/printers?printerName=Prusa-01&labLocation=Lab A` → 200,
   printer created with `status: "AVAILABLE"`.
2. As STUDENT: `POST /api/admin/printers?printerName=...` → should be **403** (staff-only).
3. As STUDENT: `GET /api/printers/available` → 200, shows Prusa-01 — this works for students now.
4. As LAB_STAFF: `GET /api/admin/printers` → 200, full list (works even if some are OFFLINE).
5. As LAB_STAFF: `PUT /api/admin/printers/{id}/status?status=busy` → 200, status updates,
   case-insensitive.
6. As LAB_STAFF: `PUT /api/admin/printers/{id}/status?status=on_fire` → **400** (invalid status).
7. As LAB_STAFF: `PATCH /api/queue/{a real jobId}/status?status=PRINTING&printerId=Prusa-01` →
   200, succeeds — this is the printer-validation integration working correctly.
8. Same call with `printerId=Totally-Fake-Printer` → **404** ("No printer found named...") — this
   is the bug this whole feature was built to close.
9. As LAB_STAFF: `GET /api/admin/dashboard` → 200, shows job/printer counts by status.
10. As STUDENT: `GET /api/admin/dashboard` → **403**.

## Known gaps / natural next steps

- **No automatic printer status cascading** on job status changes — flagged above, a deliberate
  scope boundary, not an oversight.
- **No `DELETE /api/admin/printers/{id}`** — if you register a printer with a typo, your only fix
  right now is updating its status, not removing it. Easy to add if it comes up.
- **Auth's self-elevation-to-ADMIN tradeoff** — still the one thing you said is last on the list.
- CORS / hardcoded JWT secret — unchanged, still just hygiene notes from before.

# PrintForge seeder

Populates the local stack with real open-source 3D models, accounts and lab
printers. Replaces an earlier faker-based seeder whose listings had random
product names ("Handcrafted Rubber Shirt 3D Model"), mismatched categories
(a bicycle filed under `DRONES`), and stock photos that had nothing to do
with the STL behind them.

## What it does

- **92-93 curated open-source models** (`catalog.js`) — Prusa printable parts
  (GPL-3.0), the `common-3d-test-models` research set, three.js example
  meshes, and an FPV drone frame. Every entry has a hand-written title,
  category, description and print scale that actually describe the mesh.
- **Renders each thumbnail from the downloaded geometry** (`lib/render.js`)
  — a dependency-free software rasteriser (z-buffer, flat shading off
  recomputed face normals, supersampled). The thumbnail is the model, so
  the image cannot disagree with the file.
- **Writes through the REST API**, not straight into Postgres — so seeded
  accounts have properly hashed passwords and genuinely log in, listing
  validation runs, and the RabbitMQ events fire as they would for a human.
- **20 accounts**: 10 `DESIGNER` (uneven portfolio sizes — `PORTFOLIO_SIZES`
  in `seed.js`, currently `[4,2,3,1,5,2,1,2,1,1]` = 22 designs total, not
  everyone equally active) and 10 `STUDENT`. Students are login-only by
  design — the backend's `@PreAuthorize("hasRole('DESIGNER')")` on listing
  creation means a student cannot own a design.
- **~14% of designs left unpublished (DRAFT)** — every `UNPUBLISHED_EVERY`th
  design (default 6) skips the publish call, so that state is exercised too.
- **Designer profile pictures** — a solid-colour circle with the person's
  initials (`lib/avatar.js`, embedded 5x7 bitmap font, no external images of
  real people attached to fictional accounts), uploaded through the real
  `POST /api/files/upload/image` → Cloudinary pipeline exactly like a
  genuine avatar upload. ~70% of designers get one; the rest deliberately
  don't (a few empty profiles is realistic).
- **10 lab printers** across four locations, with a spread of
  `AVAILABLE` / `BUSY` / `MAINTENANCE` / `OFFLINE`.
- **Follows** — each student follows 1-3 designers via the real
  `POST /api/users/{id}/follow` (this feature already existed in
  marketplace-service; a stale frontend comment claiming it didn't do not
  trust it without checking the backend).
- **~18-29 print jobs spanning every real job status** — `SUBMITTED`,
  `APPROVED`, `QUEUED`, `PRINTING`, `READY`, `COLLECTED`, `REJECTED`,
  `COMPLETED` (not `PENDING`/`PAID`/`FAILED` — those don't exist on
  `PrintJob`; this list was confirmed by reading
  `PrintQueueService`/`PrintJobFacadeController`, not assumed). Job
  *creation* goes through the ADMIN-only raw endpoint
  (`POST /api/job-service/print-jobs`) rather than the customer-facing
  payment-gated flow — see `lib/api.js`'s `createRawPrintJob` comment for
  why (short version: that flow only creates a job from inside a Paystack
  webhook handler that re-verifies against Paystack's real API, which has
  no matching transaction for a seeded reference). Every status change
  *after* creation goes through the exact staff-facing endpoints a human
  uses (approve/reject/status/transition), which is where the real
  notification-firing logic lives.
- **Favourites** from student accounts, so the marketplace's trending sort
  (`favorites*2 + downloads`) has real signal instead of an all-zero tie.
- **Backdated timestamps** (direct SQL — see "Traps" below for *which*
  database) — listing `created_at`/`published_at` spread over ~5 months,
  `download_count` varied (skewed toward 0, a few popular), print job
  `submitted_at`/`started_at`/`completed_at` spread over ~4 months and kept
  consistent with each job's actual status. There is no signup-date column
  on `users` at all — nothing to backdate there; listing `created_at` is
  the closest real proxy for "how long this designer has been active".

## Running it

Creating printers requires a `LAB_STAFF` or `ADMIN` account. Pass the
password at runtime — it is deliberately not stored in this repo:

```bash
STAFF_PASSWORD='...' npm run seed
```

Rehearse without writing anything (downloads, parses and renders every
design, reports triangle counts and volumes):

```bash
npm run seed:dry
```

`POST /api/job-service/print-jobs` (used to create every print job) needs
`hasRole('ADMIN')` specifically — `LAB_STAFF` isn't enough, unlike printer
creation. This stack's auth-service auto-seeds a real admin account at
startup (`auth-service`'s `DataSeeder`) if `ADMIN_PASSWORD` isn't set in the
environment: `admin@printforge.com` / `secure_admin_password` (the
`@Value` fallback default). Use that account rather than the plain
`staff@printforge.com` (`LAB_STAFF`) one unless you've set a real
`ADMIN_PASSWORD` for a different admin account:

```bash
STAFF_EMAIL='admin@printforge.com' STAFF_PASSWORD='secure_admin_password' npm run seed
```

Two supplementary modes, both reusing `seeded-manifest.json` from a prior
full run rather than re-registering accounts or re-creating listings
(neither of which are deduplicated, so a second full run would double up):

```bash
node seed.js --orders-only    # re-run just the print-job section
node seed.js --backdate-only  # re-run just the direct-SQL timestamp pass
```

| Variable | Default | Purpose |
| --- | --- | --- |
| `STAFF_PASSWORD` | — | Required. Needs `ADMIN` for print-job creation (see above); `LAB_STAFF` is enough for printers only. |
| `STAFF_EMAIL` | `staff@printforge.com` | Account used for printers/print-jobs. |
| `SEED_PASSWORD` | `ForgeSeed2026!` | Password every seeded account gets. |
| `API_BASE` | `http://localhost:8080` | API gateway. |

Downloaded models are cached in `.cache/`, so re-runs don't re-fetch ~40MB.

### Resumability and rate limits

`/api/auth/register` is capped at **10 attempts per 4 minutes per IP**
(`RateLimitFilter`), and a full run creates 20 accounts — so hitting a 429
partway through is expected. The seeder waits out the window and retries,
and if an account already exists it logs in instead of registering. Re-running
after a failure is safe.

## Cleaning up

**This database has real hand-made accounts and listings interleaved with
seed data**, so nothing deletes by "everything above id N".

```bash
npm run clean          # remove only what seed.js created (via manifest)
npm run clean:dry      # show what would be deleted, change nothing
node clean.js --legacy # also sweep the earlier faker-generated seed (ids 20–39)
```

Every id the seeder creates is recorded in `seeded-manifest.json`, and
`clean.js` deletes exactly those.

### Traps worth knowing about

1. **Postgres is not published on the host.** The compose stack exposes no
   port for it, and this machine has a *different* Postgres on
   `localhost:5432` — connecting there succeeds and reports a database with
   5 users and no listings. `clean.js` therefore pipes all SQL through
   `docker exec <postgres container> psql`, and refuses to run unless it
   can see the PrintForge schema.

1a. **This stack was later switched to a real Neon database mid-project**
   (root `.env`'s `DATASOURCE_URL`/`USERNAME`/`PASSWORD`, which
   `docker-compose.yml`'s `${DATASOURCE_*:-local-fallback}` substitution
   picks up for every service). The local Docker Postgres container is
   still running but unused — and its schema still exists from before the
   switch (ddl-auto=update created it), so a schema-shape check alone
   (matching clean.js's — confirm 'users'/'design_listings'/'print_jobs'
   exist) is **not enough** to confirm you're touching the database the
   live services actually read from. This bit `backdateTimestamps()`
   directly: an early run "succeeded" against the local container's own
   stale 8-row copy while every real service was reading Neon — caught only
   by spot-checking a real API response's row id against a raw SQL count,
   not by the schema check. `backdateTimestamps()` now reads root `.env`'s
   `DATASOURCE_URL` first and connects there (via a throwaway
   `docker run --rm postgres:15 psql "<neon-uri>"`, not `docker exec` into
   a container — Neon isn't a local container), falling back to local
   Docker Postgres only if no `DATASOURCE_URL` is configured. If you ever
   add another direct-SQL step here, verify the same way: a real API
   response's id, not just a table-name check.

2. **Two models in the upstream research set are flat.** `alligator.obj`
   and `woody.obj` are 2D triangulations used for surface-parameterisation
   work — zero depth on one axis, 0 cm³ volume. They are excluded from the
   catalog, and `seed.js` fails any mesh with a degenerate bounding box
   rather than publishing a listing advertising a 12-minute print.

3. **Cloudinary caps uploads at 10 MB.** `xyzrgb_dragon.obj` is 11.8 MB and
   `/api/files/upload` fails on it every time, so it is excluded from the
   catalog. Anything else added to `catalog.js` needs to stay under that cap.

### A backend bug this surfaced

Re-running the seeder made `POST /api/printers` return **500 with a stack
trace** for every printer that already existed. The cause was that
printer-service had no `@RestControllerAdvice` at all, so its four domain
exceptions fell through to Spring's default handler. Fixed by adding
`exception/GlobalExceptionHandler.java` mirroring the one in auth-service:

| Exception | Was | Now |
|---|---|---|
| `DuplicatePrinterException` | 500 | 409 Conflict |
| `PrinterNotFoundException` | 500 | 404 Not Found |
| `PrinterBusyException` | 500 | 409 Conflict |
| `InvalidPrinterStatusException` | 500 | 400 Bad Request |

The advice deliberately has **no** catch-all `Exception` handler — adding one
would have caught Spring Security's `AccessDeniedException` and turned the
`@PreAuthorize` 403s into 500s. Verified after the change: duplicate name
→ 409, unknown id → 404, student posting a printer → still 403.

### A second backend bug this surfaced (order-service)

Seeding print jobs across every status means occasionally approving a job
onto a printer that isn't `AVAILABLE`. `PrintQueueService.updateJobStatus()`
throws `PrinterBusyException` for that — a class order-service *duplicates*
in its own package (`com.printforge.order.printerservice.exception.*`,
distinct from printer-service's copy) — and order-service had **no**
`@RestControllerAdvice` handling any of its own domain exceptions at all
(the one existing `EstimateExceptionHandler` only catches
`ConstraintViolationException`). Every one of these fell through to
Spring's default handler as a raw 500 with a stack trace, exactly the same
failure mode the printer-service fix above already addressed once — just
in a different service, because the exception classes are duplicated
per-service rather than shared.

Fixed with `order-service/.../exception/GlobalExceptionHandler.java`,
mirroring printer-service's pattern (reusing the existing
`com.printforge.order.dto.ErrorResponse`), covering every exception
actually reachable from the print-job/estimate/printer flows:
`PrinterBusyException`/`DuplicatePrinterException` → 409,
`PrinterNotFoundException`/`PrintJobNotFoundException`/
`EstimateNotFoundException`/`ModelFileNotFoundException`/
`ListingNotFoundException` → 404,
`InvalidPrinterStatusException`/`InvalidJobStatusException`/
`InvalidEstimateInputException`/`ListingNotPublishedException` → 400.
Same no-catch-all-`Exception` reasoning as printer-service's.

The seeder itself also now fetches live printer availability
(`GET /api/printers/available`) right before each approval instead of
picking from a static list, since a printer goes `BUSY` the moment it's
assigned — both fixes matter (the seeder fix reduces how often the busy
case comes up at all; the backend fix means it's a clean 409 instead of a
crash on the occasions it still does).

## Licensing note

The FPV drone parts (`MemoryDrones/Memory-Halo-4`) are **CC BY-NC 4.0 —
NonCommercial**. Every listing sourced from them is seeded at `0.00` with
the attribution in its description, because the rest of the catalog is
permissively licensed and a paid listing would contradict those terms.
Re-check that licence before using them for anything beyond local demo data.

## Layout

```
catalog.js    92-93 open-source models with curated metadata
people.js     seed identities (KNUST-style) and lab printers
seed.js       orchestrator (--dry-run / --orders-only / --backdate-only)
clean.js      targeted teardown
lib/mesh.js   STL (binary + ASCII) and OBJ parsers, volume/area measurement
lib/render.js software rasteriser (design thumbnails)
lib/avatar.js solid-colour + initials generator (designer profile pictures)
lib/png.js    minimal PNG encoder (zlib + CRC32), shared by render.js/avatar.js
lib/api.js    API gateway client
```

No runtime dependencies — native `fetch`/`FormData` and Node's `zlib`.

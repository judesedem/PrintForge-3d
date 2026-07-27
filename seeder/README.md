# PrintForge seeder

Populates the local stack with real open-source 3D models, accounts and lab
printers. Replaces an earlier faker-based seeder whose listings had random
product names ("Handcrafted Rubber Shirt 3D Model"), mismatched categories
(a bicycle filed under `DRONES`), and stock photos that had nothing to do
with the STL behind them.

## What it does

- **93 curated open-source models** (`catalog.js`) — Prusa printable parts
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
- **20 accounts**: 10 `DESIGNER` (10 designs each = 100 published listings)
  and 10 `STUDENT`. Students are login-only by design — the backend's
  `@PreAuthorize("hasRole('DESIGNER')")` on listing creation means a
  student cannot own a design.
- **10 lab printers** across four locations, with a spread of
  `AVAILABLE` / `BUSY` / `MAINTENANCE` / `OFFLINE`.
- **Favourites** from student accounts, so the marketplace's trending sort
  (`favorites*2 + downloads`) has real signal instead of an all-zero tie.

## Running it

Creating printers requires a `LAB_STAFF` or `ADMIN` account. Pass the
password at runtime — it is deliberately not stored in this repo:

```bash
STAFF_PASSWORD='...' npm run seed
```

Rehearse without writing anything (downloads, parses and renders all 100,
reports triangle counts and volumes):

```bash
npm run seed:dry
```

| Variable | Default | Purpose |
| --- | --- | --- |
| `STAFF_PASSWORD` | — | Required. Lab-staff/admin login, for printer creation. |
| `STAFF_EMAIL` | `staff@printforge.com` | Account used for printers. |
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

## Licensing note

The FPV drone parts (`MemoryDrones/Memory-Halo-4`) are **CC BY-NC 4.0 —
NonCommercial**. Every listing sourced from them is seeded at `0.00` with
the attribution in its description, because the rest of the catalog is
permissively licensed and a paid listing would contradict those terms.
Re-check that licence before using them for anything beyond local demo data.

## Layout

```
catalog.js   93 open-source models with curated metadata
people.js    seed identities (KNUST-style) and lab printers
seed.js      orchestrator
clean.js     targeted teardown
lib/mesh.js  STL (binary + ASCII) and OBJ parsers, volume/area measurement
lib/render.js software rasteriser
lib/png.js   minimal PNG encoder (zlib + CRC32)
lib/api.js   API gateway client
```

No runtime dependencies — native `fetch`/`FormData` and Node's `zlib`.

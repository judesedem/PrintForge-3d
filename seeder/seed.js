'use strict';

// PrintForge seed script.
//
//   node seed.js            — seed everything
//   node seed.js --dry-run  — download, parse and render, but write nothing
//
// Writes through the API gateway (see lib/api.js for why), and records
// every id it creates in seeded-manifest.json so clean.js can remove
// exactly what this script made and nothing else — this database has real
// hand-made accounts and listings interleaved with seed data.

const fs = require('fs');
const path = require('path');

const { execFileSync } = require('child_process');

const api = require('./lib/api');
const { parseMesh, bounds, measure } = require('./lib/mesh');
const { renderMesh } = require('./lib/render');
const { renderAvatar } = require('./lib/avatar');
const { CATALOG, FILAMENTS } = require('./catalog');
const { DESIGNERS, STUDENTS, PRINTERS } = require('./people');

const DRY_RUN = process.argv.includes('--dry-run');
// Re-run just the orders section against data a previous full run already
// created (reads seeded-manifest.json rather than re-registering accounts
// or re-creating listings, which have no dedupe check and would double up
// on a full re-run).
const ORDERS_ONLY = process.argv.includes('--orders-only');
// Re-runs just the direct-SQL backdating pass against an existing manifest
// — useful on its own if e.g. the DB target changed (local Postgres vs.
// Neon) after a run already completed.
const BACKDATE_ONLY = process.argv.includes('--backdate-only');
const CACHE_DIR = path.join(__dirname, '.cache');
const MANIFEST = path.join(__dirname, 'seeded-manifest.json');
const THUMB_SIZE = 640;

// Shared across every seeded account so the whole cohort is loggable while
// testing. Overridable, and deliberately not a secret — these are demo
// accounts on a local stack.
const SEED_PASSWORD = process.env.SEED_PASSWORD || 'ForgeSeed2026!';

const STAFF_EMAIL = process.env.STAFF_EMAIL || 'staff@printforge.com';
const STAFF_PASSWORD = process.env.STAFF_PASSWORD;

// Uneven per-designer portfolio sizes (index-matched to people.js's
// DESIGNERS array) — a real marketplace has a few prolific designers and
// several who've only posted once or twice, not everyone equally active.
// Sums to 22, inside the ~20-25 total design target.
const PORTFOLIO_SIZES = [4, 2, 3, 1, 5, 2, 1, 2, 1, 1];

// Every Nth design (0-indexed) across the whole run is left unpublished
// (DRAFT) instead of published, so that state is exercised too — a real
// designer always has a few drafts sitting around.
const UNPUBLISHED_EVERY = 6;

const ORDER_COUNT = 18;
// The real backend statuses (there is no PENDING/PAID/FAILED — those don't
// exist on PrintJob; see README for how this list was confirmed against
// PrintQueueService/PrintJobFacadeController rather than assumed).
const ORDER_STATUSES = ['SUBMITTED', 'APPROVED', 'QUEUED', 'PRINTING', 'READY', 'COLLECTED', 'REJECTED', 'COMPLETED'];

const MATERIALS = ['PLA', 'ABS', 'PETG', 'RESIN'];
const COLORS = ['Black', 'White', 'Red', 'Blue', 'Grey', 'Orange', 'Green'];
const QUALITIES = ['DRAFT', 'STANDARD', 'HIGH'];
const INFILLS = ['10', '15', '20', '25', '30', '40'];
const ORDER_NOTES = [
  null, null, null, // most orders have no special notes — matches real usage
  'Please use minimal supports if possible.',
  'Needed before end of the week if possible.',
  'First time ordering — happy to take guidance on infill.',
  'Please double-check bed adhesion, had a failed print last time.',
];

// Deterministic PRNG so re-running produces the same marketplace rather
// than a different random one each time — makes the seeded state something
// you can actually reason about while debugging.
let _seed = 0x5eed1234;
function rnd() {
  _seed ^= _seed << 13; _seed >>>= 0;
  _seed ^= _seed >> 17;
  _seed ^= _seed << 5; _seed >>>= 0;
  return _seed / 0x100000000;
}
const pick = (arr) => arr[Math.floor(rnd() * arr.length)];
function shuffled(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

const log = (...m) => console.log(...m);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/**
 * Registration is rate-limited to 10 attempts per 4 minutes per IP
 * (RateLimitFilter), and this script wants to create 20 accounts in one
 * go — so a 429 is an expected part of a full run, not an error. Wait out
 * the window and carry on.
 *
 * If the account already exists (a re-run, or a run that died half-way),
 * log in instead. That makes the whole script resumable without burning
 * registration attempts on accounts that are already there.
 */
async function registerOrLogin(name, email, role) {
  for (let attempt = 0; ; attempt++) {
    try {
      const res = await api.register(name, email, SEED_PASSWORD, role);
      return { ...res, created: true };
    } catch (err) {
      const message = String(err.body?.message || err.body?.error || err.message || '');

      if (err.status === 429) {
        if (attempt >= 6) throw err;
        // The bucket refills 10 tokens every 4 minutes, all at once —
        // polling more often than that just burns attempts, so wait a
        // full window plus slack on the first retry.
        const waitMs = attempt === 0 ? 250_000 : 130_000;
        log(`      rate-limited — waiting ${Math.round(waitMs / 1000)}s for the register window to refill…`);
        await sleep(waitMs);
        continue;
      }

      if (err.status === 409 || /already registered|already exists/i.test(message)) {
        const res = await api.login(email, SEED_PASSWORD);
        return { ...res, created: false };
      }

      throw err;
    }
  }
}

async function download(entry) {
  fs.mkdirSync(CACHE_DIR, { recursive: true });
  // Key the cache on the full URL — several catalog entries share a
  // filename across Prusa branches (x-carriage.stl exists in both MK3 and
  // MK2.5) but are different geometry.
  const key = entry.url.replace(/[^a-z0-9.]+/gi, '_').slice(-120);
  const cached = path.join(CACHE_DIR, key);
  if (fs.existsSync(cached) && fs.statSync(cached).size > 0) {
    return fs.readFileSync(cached);
  }
  const res = await fetch(entry.url);
  if (!res.ok) throw new Error(`download failed ${res.status} for ${entry.url}`);
  const buf = Buffer.from(await res.arrayBuffer());
  fs.writeFileSync(cached, buf);
  return buf;
}

/**
 * Scale art models (authored at unit or metre scale) up to a real print
 * size so the volume/print-time figures on the listing mean something.
 * Printable STLs are already in millimetres and pass through untouched.
 */
function toPrintScale(mesh, entry) {
  if (!entry.scaleToMm) return mesh;
  const b = bounds(mesh.positions);
  const longest = Math.max(b.maxX - b.minX, b.maxY - b.minY, b.maxZ - b.minZ);
  if (!longest || !isFinite(longest)) return mesh;
  const k = entry.scaleToMm / longest;
  const positions = new Float32Array(mesh.positions.length);
  for (let i = 0; i < mesh.positions.length; i++) positions[i] = mesh.positions[i] * k;
  return { positions, triangleCount: mesh.triangleCount };
}

/**
 * The signed-tetrahedron volume in mesh.measure() is only meaningful for a
 * closed surface. Several catalog meshes are open shells or have flipped
 * winding (alligator.obj and woody.obj both sum to ~0), which would
 * otherwise publish a listing advertising 0.0 cm³ and a 12-minute print.
 * When the result is implausible against the bounding box, fall back to a
 * solidity estimate instead — still derived from this model's real
 * dimensions, just less precise.
 */
const SOLIDITY = 0.15;

function solidVolume(volumeMm3, dims) {
  const bbox = dims[0] * dims[1] * dims[2];
  // A zero-thickness bounding box means the mesh is a flat 2D
  // triangulation, not a solid — there is nothing sensible to estimate
  // from, so the caller skips it rather than publishing 0 cm³.
  if (!isFinite(bbox) || bbox <= 0) return { volumeMm3: 0, exact: false, degenerate: true };
  const ratio = volumeMm3 / bbox;
  // A real solid sits somewhere between a few percent and ~90% of its
  // bounding box. Outside that, the number came from a broken surface.
  if (ratio >= 0.01 && ratio <= 0.95) return { volumeMm3, exact: true };
  return { volumeMm3: bbox * SOLIDITY, exact: false };
}

/**
 * Print time from extruded volume: assume ~40% infill on a 0.4mm nozzle
 * laying down roughly 8 mm³/s sustained. Crude, but it scales with the
 * actual geometry, which is the point — a 6cm bunny and a 20cm dragon get
 * visibly different numbers instead of a random integer.
 */
function estimateMinutes(volumeMm3) {
  const effective = volumeMm3 * 0.42;
  return Math.max(12, Math.round(effective / 8 / 60));
}

function priceFor(entry, volumeMm3) {
  if (entry.free) return '0.00';
  // Roughly: a floor by category, plus a size component. Ends on tidy
  // .00/.50 values like a human would set.
  const floors = {
    MINIATURES: 8, ARTICULATED: 10, GEARS: 6, ENCLOSURES: 7, DRONES: 9, OTHER: 4,
  };
  const base = floors[entry.category] ?? 5;
  const bySize = Math.min(22, (volumeMm3 / 1000) * 0.12);
  const raw = base + bySize + rnd() * 4;
  // One listing in seven is free — real marketplaces have a free tier and
  // the UI should be exercised with GHS 0.00 present.
  if (rnd() < 0.14) return '0.00';
  return (Math.round(raw * 2) / 2).toFixed(2);
}

function describe(entry, tri, dims, volumeCm3, minutes) {
  const d = dims.map((n) => n.toFixed(0)).join(' × ');
  const lines = [
    entry.description,
    '',
    `Bounding box ${d} mm · ${volumeCm3.toFixed(1)} cm³ of material · ${tri.toLocaleString('en-GB')} triangles.`,
    `Roughly ${Math.floor(minutes / 60)}h ${minutes % 60}m on a 0.4mm nozzle at 0.2mm layers.`,
  ];
  if (entry.attribution) lines.push('', entry.attribution);
  return lines.join('\n');
}

/** Deal each designer their own (uneven) count of distinct models. */
function assignPortfolios(sizes) {
  const need = sizes.reduce((a, b) => a + b, 0);
  let pool = shuffled(CATALOG);
  while (pool.length < need) pool = pool.concat(shuffled(CATALOG));
  pool = pool.slice(0, need);

  const folios = [];
  let cursor = 0;
  for (let d = 0; d < sizes.length; d++) {
    const mine = [];
    const seen = new Set();
    while (mine.length < sizes[d]) {
      let idx = cursor;
      // Skip past anything this designer already has, so no one lists the
      // same model twice.
      while (idx < pool.length && seen.has(pool[idx].url)) idx++;
      if (idx >= pool.length) {
        const spare = CATALOG.find((c) => !seen.has(c.url));
        mine.push(spare);
        seen.add(spare.url);
        continue;
      }
      if (idx !== cursor) [pool[cursor], pool[idx]] = [pool[idx], pool[cursor]];
      const entry = pool[cursor];
      mine.push(entry);
      seen.add(entry.url);
      cursor++;
    }
    folios.push(mine);
  }
  return folios;
}

/**
 * Drives a freshly-created (SUBMITTED) job through the real staff-facing
 * endpoints until it reaches targetStatus, so every job's history is a
 * genuine sequence of API calls (and real notifications fired along the
 * way) rather than a status value written directly.
 *
 * Fetches live printer availability (GET /api/printers/available) right
 * before each approval rather than picking from a static list — a printer
 * assigned to one job goes BUSY server-side, so a stale/random pick would
 * routinely hit an already-busy printer for the next job. This used to 500
 * (order-service had no handler for PrinterBusyException at all — now
 * fixed, see GlobalExceptionHandler.java — a real bug this seeder run
 * surfaced), but picking a genuinely-available printer is both more
 * realistic (staff wouldn't deliberately assign a busy one) and avoids
 * relying on that fix alone.
 */
async function advanceJobToStatus(staff, jobId, targetStatus) {
  if (targetStatus === 'SUBMITTED') return;

  if (targetStatus === 'REJECTED') {
    await api.rejectJob(staff.token, jobId, pick([
      'Model has non-manifold geometry — please fix and resubmit.',
      'File failed to slice cleanly at the requested settings.',
      'Requested material currently out of stock.',
    ]));
    return;
  }

  if (targetStatus === 'QUEUED') {
    await api.setJobStatus(staff.token, jobId, 'QUEUED');
    return;
  }

  const available = await api.getAvailablePrinters(staff.token).catch(() => []);
  const printerName = available.length ? pick(available).printerName ?? pick(available).name : undefined;

  // Everything else starts with approval.
  await api.approveJob(staff.token, jobId, {
    printerId: printerName,
    estimatedCost: Math.round((5 + rnd() * 40) * 100) / 100,
    estimatedTime: 30 + Math.floor(rnd() * 300),
  });
  if (targetStatus === 'APPROVED') return;

  if (targetStatus === 'COMPLETED') {
    await api.setJobStatus(staff.token, jobId, 'COMPLETED');
    return;
  }

  // PRINTING / READY / COLLECTED — strict one-step-at-a-time transitions.
  await api.transitionJob(staff.token, jobId, 'PRINTING');
  if (targetStatus === 'PRINTING') return;
  await api.transitionJob(staff.token, jobId, 'READY');
  if (targetStatus === 'READY') return;
  await api.transitionJob(staff.token, jobId, 'COLLECTED');
}

/**
 * Creates ORDER_COUNT print jobs spread across every real job status.
 *
 * Job *creation* uses the ADMIN-only raw endpoint
 * (POST /api/job-service/print-jobs) instead of the customer-facing order
 * flow, because that flow only ever creates a PrintJob from inside
 * PaymentService.handleWebhook() — gated on a real Paystack webhook whose
 * HMAC signature we could forge (we have the secret) but whose payload the
 * backend re-verifies against Paystack's own /transaction/verify API, which
 * has no matching real transaction behind a seeded reference. The Estimate
 * behind each job IS created the real way (submitMarketplaceOrder, i.e.
 * POST /api/print-jobs as the student) rather than the plain /api/estimates
 * endpoint, which enforces file ownership and would reject a student
 * estimating against a design they don't own. Every transition AFTER
 * creation — approve/reject/status/transition — goes through the exact
 * staff-facing endpoints a human would use, which is where the real
 * notification-firing logic lives; the raw-create bypass only replaces the
 * unreachable payment gate, not the state machine.
 *
 * Mutates manifest.printJobs (creates it if absent) and returns the number
 * of jobs successfully created.
 */
async function createOrders(manifest, staff) {
  log(`\nCreating ${ORDER_COUNT} print jobs across every real job status…`);
  const students = manifest.users.filter((u) => u.role === 'STUDENT' && u.token);
  const published = manifest.listings.filter((l) => l.published);
  if (!students.length || !published.length) {
    log('  Skipped — no students with live tokens or no published listings.');
    return 0;
  }

  let orders = 0, orderFailed = 0, adminForbidden = false;
  if (!manifest.printJobs) manifest.printJobs = [];

  for (let i = 0; i < ORDER_COUNT && !adminForbidden; i++) {
    const student = pick(students);
    const listing = pick(published);
    const targetStatus = ORDER_STATUSES[i % ORDER_STATUSES.length];
    const material = pick(MATERIALS);
    const infill = pick(INFILLS);
    const quality = pick(QUALITIES);
    try {
      const order = await api.submitMarketplaceOrder(student.token, {
        listingId: listing.id,
        material,
        quantity: 1 + Math.floor(rnd() * 3),
        infill,
        quality,
        color: pick(COLORS),
        notes: pick(ORDER_NOTES),
      });
      const estimate = order.estimate;

      const job = await api.createRawPrintJob(staff.token, {
        fileId: listing.fileId,
        estimateId: estimate.id,
        userId: student.id,
        material,
        color: pick(COLORS),
        quantity: estimate.quantity ?? 1,
        infill,
        quality,
        notes: pick(ORDER_NOTES),
      });

      await advanceJobToStatus(staff, job.id, targetStatus);
      manifest.printJobs.push({ id: job.id, userId: student.id, listingId: listing.id, status: targetStatus });
      orders++;
      log(`  ✓ job ${String(job.id).padStart(4)}  ${targetStatus.padEnd(10)} ${material.padEnd(6)} student #${student.id}`);
    } catch (err) {
      if (err.status === 403 && /job-service\/print-jobs/.test(err.message)) {
        adminForbidden = true;
        log(`  ✗ STAFF_EMAIL account is not ADMIN — raw job creation needs hasRole('ADMIN'), `
          + `LAB_STAFF isn't enough. Skipping remaining orders (${err.message}).`);
      } else {
        orderFailed++;
        log(`  ✗ order ${i + 1} failed: ${err.message}`);
      }
    }
  }
  log(`  ${orders} print jobs created${orderFailed ? `, ${orderFailed} failed` : ''}.`);
  return orders;
}

/**
 * --orders-only: re-runs just the orders section against a manifest a
 * previous full run already produced, instead of re-registering accounts or
 * re-creating listings (which have no dedupe check and would double up).
 * Logs students and staff back in fresh (tokens aren't persisted to disk)
 * and reuses the existing listings/printers from disk.
 */
async function runOrdersOnly() {
  if (!fs.existsSync(MANIFEST)) {
    throw new Error(`--orders-only needs an existing ${path.basename(MANIFEST)} from a prior full run.`);
  }
  if (!STAFF_PASSWORD) {
    throw new Error('STAFF_PASSWORD is not set — needed for an ADMIN token to create/advance jobs.');
  }
  const manifest = JSON.parse(fs.readFileSync(MANIFEST, 'utf8'));
  log(`Loaded manifest from ${new Date(manifest.seededAt).toLocaleString()}: `
    + `${manifest.users.length} users, ${manifest.listings.length} listings, ${manifest.printers.length} printers.`);

  const staff = await api.login(STAFF_EMAIL, STAFF_PASSWORD);

  for (const u of manifest.users) {
    if (u.role !== 'STUDENT') continue;
    try {
      const res = await api.login(u.email, SEED_PASSWORD);
      u.token = res.token;
    } catch (err) {
      log(`  · could not log in ${u.email} (${err.message}) — excluded from this run`);
    }
  }

  const createdCount = await createOrders(manifest, staff);
  if (createdCount) {
    manifest.users = manifest.users.map(({ token, ...rest }) => rest);
    fs.writeFileSync(MANIFEST, JSON.stringify(manifest, null, 2));
    log(`\nManifest updated → ${path.relative(process.cwd(), MANIFEST)}`);
    await backdateTimestamps(manifest);
  }
}

async function main() {
  log(`PrintForge seeder → ${api.BASE}${DRY_RUN ? '  [DRY RUN — nothing will be written]' : ''}`);
  log(`Catalog: ${CATALOG.length} open-source models\n`);

  const manifest = {
    seededAt: new Date().toISOString(),
    password: SEED_PASSWORD,
    users: [], listings: [], printers: [], fileIds: [],
  };

  // Hoisted so the orders section below can reuse the same session — job
  // creation needs ADMIN specifically (not just LAB_STAFF); approve/reject/
  // status/transition accept either.
  let staff = null;

  // ── Printers ───────────────────────────────────────────────────────────
  if (!DRY_RUN) {
    if (!STAFF_PASSWORD) {
      throw new Error('STAFF_PASSWORD is not set — needed to create printers (LAB_STAFF/ADMIN only).');
    }
    log('Creating printers…');
    staff = await api.login(STAFF_EMAIL, STAFF_PASSWORD);
    for (const p of PRINTERS) {
      try {
        const created = await api.createPrinter(staff.token, p.name, p.location);
        manifest.printers.push({ id: created.id, name: p.name });
        if (p.status !== 'AVAILABLE') {
          await api.setPrinterStatus(staff.token, created.id, p.status);
        }
        log(`  ✓ ${p.name.padEnd(16)} ${p.status.padEnd(12)} ${p.location}`);
      } catch (err) {
        // A re-run hits the unique constraint on printer_name; that's fine.
        log(`  · ${p.name} skipped (${err.status || ''} ${err.body?.message || err.message})`.trim());
      }
    }
    log('');
  }

  // ── Accounts ───────────────────────────────────────────────────────────
  log('Registering accounts…');
  const designers = [];
  const userId = (u) => u.user_id ?? u.userId ?? u.id;

  for (const d of DESIGNERS) {
    if (DRY_RUN) { designers.push({ ...d, token: null, id: null }); continue; }
    const res = await registerOrLogin(d.name, d.email, 'DESIGNER');
    const id = userId(res.user);
    designers.push({ ...d, token: res.token, id });
    manifest.users.push({ id, email: d.email, role: 'DESIGNER' });
    log(`  ${res.created ? '✓' : '·'} DESIGNER  ${d.name.padEnd(22)} ${d.email}${res.created ? '' : '  (existing)'}`);
  }
  for (const s of STUDENTS) {
    if (DRY_RUN) continue;
    const res = await registerOrLogin(s.name, s.email, 'STUDENT');
    const id = userId(res.user);
    manifest.users.push({ id, email: s.email, role: 'STUDENT', token: res.token });
    log(`  ${res.created ? '✓' : '·'} STUDENT   ${s.name.padEnd(22)} ${s.email}${res.created ? '' : '  (existing)'}`);
  }
  log('');

  // ── Designs ────────────────────────────────────────────────────────────
  const folios = assignPortfolios(PORTFOLIO_SIZES);
  const totalDesigns = PORTFOLIO_SIZES.reduce((a, b) => a + b, 0);
  log(`Creating ${totalDesigns} designs (uneven portfolio sizes: ${PORTFOLIO_SIZES.join(', ')})…`);

  let done = 0, failed = 0, approximated = 0, unpublishedCount = 0, globalDesignIndex = 0;
  for (let d = 0; d < designers.length; d++) {
    const designer = designers[d];
    log(`\n  ${designer.name} — ${designer.bio}`);

    for (const entry of folios[d]) {
      const label = entry.title.slice(0, 34).padEnd(34);
      try {
        const raw = await download(entry);
        const parsed = parseMesh(raw, entry.format);
        const mesh = toPrintScale(parsed, entry);

        const b = bounds(mesh.positions);
        const dims = [b.maxX - b.minX, b.maxY - b.minY, b.maxZ - b.minZ];
        const measured = measure(mesh.positions, mesh.triangleCount);
        const { volumeMm3, exact, degenerate } = solidVolume(measured.volumeMm3, dims);
        if (degenerate) {
          throw new Error(`flat/degenerate mesh (${dims.map((n) => n.toFixed(1)).join('×')} mm) — not a printable solid`);
        }
        const volumeCm3 = volumeMm3 / 1000;
        const minutes = estimateMinutes(volumeMm3);
        if (!exact) approximated++;

        // Vary the camera slightly per listing so a grid of related parts
        // doesn't look like ten renders of the same object.
        const png = renderMesh(mesh, {
          size: THUMB_SIZE,
          upAxis: entry.upAxis,
          yaw: Math.PI * (0.14 + rnd() * 0.24),
          pitch: Math.PI * (0.20 + rnd() * 0.12),
          colour: pick(FILAMENTS[entry.category] || FILAMENTS.OTHER),
        });

        if (DRY_RUN) {
          log(`    ✓ ${label} ${String(mesh.triangleCount).padStart(7)} tris  ${volumeCm3.toFixed(1).padStart(7)} cm³${exact ? ' ' : '~'} ${(png.length / 1024).toFixed(0).padStart(4)} KB`);
          done++;
          continue;
        }

        const ext = entry.format === 'obj' ? 'obj' : 'stl';
        const filename = entry.title.toLowerCase().replace(/[^a-z0-9]+/g, '-') + '.' + ext;
        const uploaded = await api.uploadModelFile(
          designer.token, raw, filename,
          ext === 'obj' ? 'model/obj' : 'model/stl',
        );
        const fileId = uploaded.fileId ?? uploaded.file_id;
        manifest.fileIds.push(fileId);

        const listing = await api.createListing(designer.token, {
          file_id: fileId,
          title: entry.title,
          description: describe(entry, mesh.triangleCount, dims, volumeCm3, minutes),
          base_price: priceFor(entry, volumeMm3),
          category: entry.category,
          ownership_attested: true,
          file_format: ext.toUpperCase(),
          polygon_count: mesh.triangleCount,
          estimated_print_time_minutes: minutes,
          layer_height_mm: pick(['0.10', '0.15', '0.20', '0.20', '0.25']),
        }, png);

        // Every Nth design stays DRAFT — a real designer always has a few
        // unpublished, and the marketplace's unpublished state needs
        // exercising too.
        const publish = globalDesignIndex % UNPUBLISHED_EVERY !== UNPUBLISHED_EVERY - 1;
        globalDesignIndex++;
        if (publish) {
          await api.publishListing(designer.token, listing.id);
        } else {
          unpublishedCount++;
        }
        manifest.listings.push({
          id: listing.id, title: entry.title, designerId: designer.id,
          fileId, published: publish,
        });
        done++;
        log(`    ✓ ${label} ${entry.category.padEnd(12)} GHS ${String(listing.basePrice).padStart(6)}${publish ? '' : '  [DRAFT]'}`);
      } catch (err) {
        failed++;
        log(`    ✗ ${label} ${err.message}`);
      }
    }
  }
  if (unpublishedCount) log(`\n  ${unpublishedCount} of ${done} designs left unpublished (DRAFT).`);

  // ── Designer profile pictures ───────────────────────────────────────────
  // Most designers get a photo, a few deliberately don't (realistic — not
  // everyone fills out their profile). Generated locally (lib/avatar.js)
  // rather than sourcing stock photos of real people for a fictional named
  // account — see README. Still a real upload through
  // POST /api/files/upload/image -> Cloudinary, same as a genuine user's.
  if (!DRY_RUN && designers.length) {
    log('\nSetting designer profile pictures…');
    let withPhoto = 0;
    for (const designer of designers) {
      // ~30% skip a photo entirely — matches the addendum's "a few with no
      // photo is realistic", not every seeded account should look complete.
      if (rnd() < 0.3) continue;
      try {
        const png = renderAvatar(designer.name, 256);
        const uploaded = await api.uploadImageFile(designer.token, png, 'avatar.png', 'image/png');
        const url = uploaded.fileUrl ?? uploaded.file_url ?? uploaded.url;
        await api.updateProfile(designer.token, { profilePictureUrl: url });
        withPhoto++;
      } catch (err) {
        log(`  · ${designer.name} photo skipped (${err.status || ''} ${err.body?.message || err.message})`.trim());
      }
    }
    log(`  ✓ ${withPhoto} of ${designers.length} designers now have a profile picture`);
  }

  // ── Follows ──────────────────────────────────────────────────────────────
  // The Follow feature already exists in marketplace-service (POST/DELETE
  // /api/users/{id}/follow) despite a stale frontend comment claiming
  // otherwise — see README. Without these every designer's follower count
  // is 0 and a student's profile has nothing populated to browse.
  if (!DRY_RUN && designers.length) {
    log('\nAdding follows…');
    const students = manifest.users.filter((u) => u.role === 'STUDENT' && u.token);
    let follows = 0;
    for (const student of students) {
      const howMany = 1 + Math.floor(rnd() * 3); // 1-3 designers per student
      for (const designer of shuffled(designers).slice(0, howMany)) {
        try { await api.followUser(student.token, designer.id); follows++; } catch { /* already following */ }
      }
    }
    log(`  ✓ ${follows} follows across ${students.length} students`);
  }

  // ── Orders / print jobs ──────────────────────────────────────────────────
  if (!DRY_RUN && staff && manifest.listings.length) {
    await createOrders(manifest, staff);
  }

  // ── Favourites ─────────────────────────────────────────────────────────
  // Without these every listing has favoriteCount 0 and the marketplace's
  // trending sort (favorites*2 + downloads) degenerates to an arbitrary
  // order, so the sort control looks broken rather than empty.
  if (!DRY_RUN && manifest.listings.length) {
    log('\nAdding favourites so the trending sort has real signal…');
    const students = manifest.users.filter((u) => u.role === 'STUDENT' && u.token);
    let favs = 0;
    for (const student of students) {
      const howMany = 4 + Math.floor(rnd() * 8);
      for (const listing of shuffled(manifest.listings).slice(0, howMany)) {
        try { await api.favoriteListing(student.token, listing.id); favs++; } catch { /* already favourited */ }
      }
    }
    log(`  ✓ ${favs} favourites across ${students.length} students`);
  }

  if (!DRY_RUN) {
    // Tokens are per-run and useless later — drop them before writing.
    manifest.users = manifest.users.map(({ token, ...rest }) => rest);
    fs.writeFileSync(MANIFEST, JSON.stringify(manifest, null, 2));
    log(`\nManifest → ${path.relative(process.cwd(), MANIFEST)}`);

    await backdateTimestamps(manifest);
  }

  log(`\nDone. ${done} designs published, ${failed} failed.`);
  if (approximated) {
    log(`${approximated} model(s) had a non-closed surface — volume estimated from the bounding box.`);
  }
  if (!DRY_RUN) {
    log(`Accounts: ${manifest.users.length}  ·  Printers: ${manifest.printers.length}`);
    log(`Every seeded account logs in with: ${SEED_PASSWORD}`);
  }
}

// ── Direct-SQL backdating pass ──────────────────────────────────────────────
// Everything above goes through the real REST API. These specific fields
// have no API path at all to set them (confirmed by reading the backend,
// not assumed — see README):
//   - design_listings.created_at / published_at / download_count — no
//     endpoint accepts a caller-supplied value for any of the three;
//     created_at/published_at are set server-side to "now" and
//     download_count has nothing in the codebase that increments it.
//   - print_jobs.submitted_at/started_at/completed_at — PrintJob's
//     @PrePersist unconditionally overwrites submittedAt to now() and the
//     status transition endpoints set started_at/completed_at to now()
//     the moment they're called; there's no way to ask for a past date.
//   - users has NO signup-timestamp column at all (verified against
//     auth-service's User.java) — there is nothing to backdate for
//     "signup date". design_listings.created_at is the closest real proxy
//     for "how long this person has been active", so that's what's spread
//     instead; this is a genuine backend limitation, not something this
//     script works around.
// Connects to whichever Postgres the backend is actually configured to use
// — read from the project root .env's DATASOURCE_URL/USERNAME/PASSWORD if
// present (this stack was switched from local Docker Postgres to a real
// Neon database mid-project; the services all follow docker-compose.yml's
// ${DATASOURCE_*:-local-fallback} substitution, and this needs to follow
// the same real config rather than always assuming local). Falls back to
// `docker exec <postgres container> psql` (like clean.js) only if no
// DATASOURCE_URL is configured, i.e. actually running on local Postgres.
//
// This distinction matters: an earlier run of this exact function silently
// "succeeded" against the local Docker Postgres container's schema (which
// still exists — ddl-auto=update created it before the Neon switch) while
// every real service was actually reading/writing Neon. The safety check
// below (matching clean.js's) verifies table *names* exist, which passed
// on both — it does NOT verify it's the same data the API serves, so a
// row-count spot check against a real API response is what actually caught
// this. Worth remembering for any future direct-SQL step here.
function loadRootEnv() {
  const envPath = path.join(__dirname, '..', '.env');
  if (!fs.existsSync(envPath)) return {};
  const out = {};
  for (const line of fs.readFileSync(envPath, 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.*)\s*$/);
    if (m) out[m[1]] = m[2];
  }
  return out;
}

async function backdateTimestamps(manifest) {
  if (!manifest.listings.length && !manifest.users.length) return;

  const rootEnv = loadRootEnv();
  const jdbcUrl = process.env.DATASOURCE_URL || rootEnv.DATASOURCE_URL;
  const dbUser = process.env.DATASOURCE_USERNAME || rootEnv.DATASOURCE_USERNAME;
  const dbPass = process.env.DATASOURCE_PASSWORD || rootEnv.DATASOURCE_PASSWORD;

  let psql;
  if (jdbcUrl && dbUser && dbPass) {
    // jdbc:postgresql://host/db?sslmode=require -> postgresql://user:pass@host/db?sslmode=require
    const conn = jdbcUrl.replace(/^jdbc:postgresql:\/\//, `postgresql://${encodeURIComponent(dbUser)}:${encodeURIComponent(dbPass)}@`);
    log('\nBackdating target: remote database from DATASOURCE_URL (matches what the running services use).');
    psql = (sql) => execFileSync(
      'docker', ['run', '--rm', '-i', 'postgres:15', 'psql', conn, '-tA', '-v', 'ON_ERROR_STOP=1', '-c', sql],
      { encoding: 'utf8' },
    ).trim();
  } else {
    let cid;
    try {
      cid = (process.env.PG_CONTAINER
        || execFileSync('docker', ['ps', '-qf', 'name=postgres'], { encoding: 'utf8' }).trim().split('\n')[0]);
      if (!cid) throw new Error('no running postgres container found');
    } catch (err) {
      log(`\nSkipping timestamp backdating — could not find the postgres container (${err.message}).`);
      return;
    }
    log('\nBackdating target: local Docker postgres container (no DATASOURCE_URL found).');
    psql = (sql) => execFileSync(
      'docker', ['exec', '-i', cid, 'psql', '-U', 'postgres', '-d', 'printforge_db', '-tA', '-v', 'ON_ERROR_STOP=1', '-c', sql],
      { encoding: 'utf8' },
    ).trim();
  }

  const tables = psql(
    "SELECT count(*) FROM information_schema.tables WHERE table_schema='public' "
    + "AND table_name IN ('users','design_listings','print_jobs')",
  );
  if (Number(tables) !== 3) {
    log(`\nSkipping timestamp backdating — connected database doesn't look like PrintForge (matched ${tables}/3 core tables).`);
    return;
  }

  log('\nBackdating timestamps so the platform looks organically aged…');

  // Spread each listing's created_at somewhere in the last ~5 months, with
  // published_at a few days to a few weeks after (a designer doesn't
  // usually publish the instant they upload). Unpublished (DRAFT) listings
  // keep published_at NULL.
  let touched = 0;
  for (const listing of manifest.listings) {
    const daysAgoCreated = 5 + Math.floor(rnd() * 150);
    const publishLagDays = 2 + Math.floor(rnd() * 18);
    const downloadCount = rnd() < 0.55 ? Math.floor(rnd() * rnd() * 400) : 0; // skewed — a few popular, most modest/zero

    const createdExpr = `NOW() - INTERVAL '${daysAgoCreated} days'`;
    const publishedExpr = listing.published
      ? `LEAST(NOW(), (NOW() - INTERVAL '${daysAgoCreated} days') + INTERVAL '${publishLagDays} days')`
      : 'NULL';

    psql(
      `UPDATE design_listings SET created_at = ${createdExpr}, published_at = ${publishedExpr}, `
      + `download_count = ${downloadCount} WHERE id = ${Number(listing.id)}`,
    );
    touched++;
  }
  log(`  ✓ ${touched} listings backdated (created_at/published_at spread over ~5 months, download_count varied)`);

  // print_jobs: submitted_at somewhere in the last ~4 months; started_at/
  // completed_at only make sense (and are only set) once the job's real
  // status implies that step happened — kept consistent with each job's
  // actual final status rather than backdating fields a job never reached.
  if (manifest.printJobs && manifest.printJobs.length) {
    let jobsTouched = 0;
    for (const job of manifest.printJobs) {
      const daysAgoSubmitted = 1 + Math.floor(rnd() * 120);
      const reachedPrinting = ['PRINTING', 'READY', 'COLLECTED', 'COMPLETED'].includes(job.status);
      const reachedCompletion = ['COLLECTED', 'COMPLETED'].includes(job.status);

      const submittedExpr = `NOW() - INTERVAL '${daysAgoSubmitted} days'`;
      const startedExpr = reachedPrinting
        ? `LEAST(NOW(), (NOW() - INTERVAL '${daysAgoSubmitted} days') + INTERVAL '1 days')`
        : null;
      const completedExpr = reachedCompletion
        ? `LEAST(NOW(), (NOW() - INTERVAL '${daysAgoSubmitted} days') + INTERVAL '3 days')`
        : null;

      const sets = [`submitted_at = ${submittedExpr}`];
      if (startedExpr) sets.push(`started_at = ${startedExpr}`);
      if (completedExpr) sets.push(`completed_at = ${completedExpr}`);

      psql(`UPDATE print_jobs SET ${sets.join(', ')} WHERE id = ${Number(job.id)}`);
      jobsTouched++;
    }
    log(`  ✓ ${jobsTouched} print jobs backdated (submitted/started/completed spread over ~4 months, consistent with each job's status)`);
  }
}

async function runBackdateOnly() {
  if (!fs.existsSync(MANIFEST)) {
    throw new Error(`--backdate-only needs an existing ${path.basename(MANIFEST)} from a prior run.`);
  }
  const manifest = JSON.parse(fs.readFileSync(MANIFEST, 'utf8'));
  await backdateTimestamps(manifest);
}

(BACKDATE_ONLY ? runBackdateOnly() : ORDERS_ONLY ? runOrdersOnly() : main()).catch((err) => {
  console.error('\nSeeding aborted:', err.message);
  process.exit(1);
});

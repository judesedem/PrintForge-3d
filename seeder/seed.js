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

const api = require('./lib/api');
const { parseMesh, bounds, measure } = require('./lib/mesh');
const { renderMesh } = require('./lib/render');
const { CATALOG, FILAMENTS } = require('./catalog');
const { DESIGNERS, STUDENTS, PRINTERS } = require('./people');

const DRY_RUN = process.argv.includes('--dry-run');
const CACHE_DIR = path.join(__dirname, '.cache');
const MANIFEST = path.join(__dirname, 'seeded-manifest.json');
const THUMB_SIZE = 640;

// Shared across every seeded account so the whole cohort is loggable while
// testing. Overridable, and deliberately not a secret — these are demo
// accounts on a local stack.
const SEED_PASSWORD = process.env.SEED_PASSWORD || 'ForgeSeed2026!';

const STAFF_EMAIL = process.env.STAFF_EMAIL || 'staff@printforge.com';
const STAFF_PASSWORD = process.env.STAFF_PASSWORD;

const DESIGNS_PER_DESIGNER = 10;

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

/** Deal each designer 10 distinct models, reusing as few as possible globally. */
function assignPortfolios(designerCount) {
  const need = designerCount * DESIGNS_PER_DESIGNER;
  let pool = shuffled(CATALOG);
  while (pool.length < need) pool = pool.concat(shuffled(CATALOG));
  pool = pool.slice(0, need);

  const folios = [];
  let cursor = 0;
  for (let d = 0; d < designerCount; d++) {
    const mine = [];
    const seen = new Set();
    while (mine.length < DESIGNS_PER_DESIGNER) {
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

async function main() {
  log(`PrintForge seeder → ${api.BASE}${DRY_RUN ? '  [DRY RUN — nothing will be written]' : ''}`);
  log(`Catalog: ${CATALOG.length} open-source models\n`);

  const manifest = {
    seededAt: new Date().toISOString(),
    password: SEED_PASSWORD,
    users: [], listings: [], printers: [], fileIds: [],
  };

  // ── Printers ───────────────────────────────────────────────────────────
  if (!DRY_RUN) {
    if (!STAFF_PASSWORD) {
      throw new Error('STAFF_PASSWORD is not set — needed to create printers (LAB_STAFF/ADMIN only).');
    }
    log('Creating printers…');
    const staff = await api.login(STAFF_EMAIL, STAFF_PASSWORD);
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
  const folios = assignPortfolios(DESIGNERS.length);
  log(`Publishing ${DESIGNERS.length * DESIGNS_PER_DESIGNER} designs (${DESIGNS_PER_DESIGNER} each)…`);

  let done = 0, failed = 0, approximated = 0;
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

        await api.publishListing(designer.token, listing.id);
        manifest.listings.push({ id: listing.id, title: entry.title, designerId: designer.id });
        done++;
        log(`    ✓ ${label} ${entry.category.padEnd(12)} GHS ${String(listing.basePrice).padStart(6)}`);
      } catch (err) {
        failed++;
        log(`    ✗ ${label} ${err.message}`);
      }
    }
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

main().catch((err) => {
  console.error('\nSeeding aborted:', err.message);
  process.exit(1);
});

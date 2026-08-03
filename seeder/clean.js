'use strict';

// Removes seeded data — and only seeded data.
//
//   node clean.js               — remove what seed.js created (via manifest)
//   node clean.js --legacy      — also remove the earlier faker-generated seed
//   node clean.js --legacy-only — remove ONLY the earlier faker-generated seed,
//                                 leaving the current manifest's data alone
//   node clean.js --dry-run     — report what would be deleted, delete nothing
//
// Two things make this script more careful than it might look:
//
// 1. This database has real hand-made accounts (the admin, lab staff, and
//    the team's own logins) interleaved with seed rows, so nothing here
//    deletes by "everything above id N". The current seeder's output is
//    tracked in seeded-manifest.json; the earlier faker run is identified
//    by an explicit, verified id range.
//
// 2. This stack was switched from local Docker Postgres to a real Neon
//    database mid-project (see docker-compose.yml's ${DATASOURCE_*:-local}
//    substitution), and the local Postgres container is still running with
//    its own old, disconnected schema — a connection string pointing there
//    succeeds and reports a *different* database. So this script prefers
//    connecting to Neon directly via the project root .env's DATASOURCE_URL
//    (same as seed.js's backdateTimestamps()), falling back to
//    `docker exec <postgres container> psql` only if that's not configured.
//    assertUsingAppDatabase() below additionally refuses to run against
//    anything that doesn't look like the PrintForge schema.

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const DRY_RUN = process.argv.includes('--dry-run');
const LEGACY_ONLY = process.argv.includes('--legacy-only');
const LEGACY = process.argv.includes('--legacy') || LEGACY_ONLY;
const MANIFEST = path.join(__dirname, 'seeded-manifest.json');

// The 20 faker-generated users the previous seeder created, verified
// directly against the users table on the live Neon database (2026-08-03):
// ids 416–435 inclusive, ending at "Arthur Lubowitz". Everything outside
// this range is a real account or part of the current seeder's own output.
// (An earlier hardcoded guess of [20, 39] was calibrated against the old,
// now-disconnected local Postgres container and is stale — do not reuse it.)
const LEGACY_USER_RANGE = [416, 435];

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

function makePsql() {
  const rootEnv = loadRootEnv();
  const jdbcUrl = process.env.DATASOURCE_URL || rootEnv.DATASOURCE_URL;
  const dbUser = process.env.DATASOURCE_USERNAME || rootEnv.DATASOURCE_USERNAME;
  const dbPass = process.env.DATASOURCE_PASSWORD || rootEnv.DATASOURCE_PASSWORD;

  if (jdbcUrl && dbUser && dbPass) {
    const conn = jdbcUrl.replace(/^jdbc:postgresql:\/\//, `postgresql://${encodeURIComponent(dbUser)}:${encodeURIComponent(dbPass)}@`);
    console.log('Target: remote database from DATASOURCE_URL (matches what the running services use).');
    return {
      run: (sql) => execFileSync(
        'docker', ['run', '--rm', '-i', 'postgres:15', 'psql', conn, '-tA', '-c', sql],
        { encoding: 'utf8' },
      ).trim(),
      runScript: (script) => execFileSync(
        'docker', ['run', '--rm', '-i', 'postgres:15', 'psql', conn, '-v', 'ON_ERROR_STOP=1'],
        { encoding: 'utf8', input: script },
      ),
      label: 'Neon (remote)',
    };
  }

  if (process.env.PG_CONTAINER === undefined) {
    console.log('Target: local Docker postgres container (no DATASOURCE_URL found).');
  }
  const out = execFileSync('docker', ['ps', '-qf', 'name=postgres'], { encoding: 'utf8' }).trim();
  const cid = process.env.PG_CONTAINER || out.split('\n')[0];
  if (!cid) throw new Error('no running postgres container found (set PG_CONTAINER to override)');
  return {
    run: (sql) => execFileSync(
      'docker', ['exec', '-i', cid, 'psql', '-U', 'postgres', '-d', 'printforge_db', '-tA', '-c', sql],
      { encoding: 'utf8' },
    ).trim(),
    runScript: (script) => execFileSync(
      'docker', ['exec', '-i', cid, 'psql', '-U', 'postgres', '-d', 'printforge_db', '-v', 'ON_ERROR_STOP=1'],
      { encoding: 'utf8', input: script },
    ),
    label: `local container ${cid.slice(0, 12)}`,
  };
}

const DB = makePsql();
function psql(sql) {
  return DB.run(sql);
}

/** Refuse to touch a database that isn't the app's. */
function assertUsingAppDatabase() {
  const tables = psql(
    "SELECT count(*) FROM information_schema.tables WHERE table_schema='public' "
    + "AND table_name IN ('users','design_listings','model_files','printers','favorites')",
  );
  if (Number(tables) !== 5) {
    throw new Error(`connected database does not look like PrintForge (matched ${tables}/5 core tables)`);
  }
}

/** Only ever interpolate values we've proven are integers. */
function intList(ids) {
  const clean = ids.map(Number).filter((n) => Number.isInteger(n) && n > 0);
  return clean.length ? clean.join(',') : null;
}

function main() {
  assertUsingAppDatabase();
  console.log(`Connected to ${DB.label} — schema verified.`);

  const userIds = [];
  const printerIds = [];

  if (LEGACY_ONLY) {
    console.log('--legacy-only: skipping the current manifest, sweeping only the historical faker batch.');
  } else if (fs.existsSync(MANIFEST)) {
    const m = JSON.parse(fs.readFileSync(MANIFEST, 'utf8'));
    userIds.push(...m.users.map((u) => u.id).filter(Boolean));
    printerIds.push(...m.printers.map((p) => p.id).filter(Boolean));
    console.log(`Manifest: ${m.users.length} users, ${m.listings.length} listings, ${m.printers.length} printers (seeded ${m.seededAt})`);
  } else {
    console.log('No manifest found — nothing from the current seeder to remove.');
  }

  if (LEGACY) {
    const [lo, hi] = LEGACY_USER_RANGE;
    const rows = psql(`SELECT user_id FROM users WHERE user_id BETWEEN ${lo} AND ${hi}`);
    const ids = rows ? rows.split('\n').map(Number) : [];
    console.log(`Legacy sweep: ${ids.length} faker accounts in ids ${lo}–${hi}`);
    userIds.push(...ids);
    // The old seeder's printers used a "PRN-###" name that nothing else in
    // this project generates. print_jobs.assigned_printer stores the printer
    // *name* as a plain string (no FK), so a job created against one of these
    // after they briefly showed up as "available" would go dangling if we
    // deleted the printer out from under it — exclude anything still
    // referenced by a live job.
    const totalMatch = Number(psql("SELECT count(*) FROM printers WHERE printer_name ~ '^PRN-[0-9]+$'"));
    const p = psql(
      "SELECT id FROM printers WHERE printer_name ~ '^PRN-[0-9]+$' "
      + "AND printer_name NOT IN (SELECT DISTINCT assigned_printer FROM print_jobs WHERE assigned_printer IS NOT NULL)",
    );
    const pids = p ? p.split('\n').map(Number) : [];
    const skipped = totalMatch - pids.length;
    console.log(`Legacy sweep: ${pids.length} PRN-### printers (${skipped > 0 ? `${skipped} skipped — still referenced by a live print job` : 'none skipped'})`);
    printerIds.push(...pids);
  }

  const users = intList(userIds);
  const printers = intList(printerIds);

  if (!users && !printers) {
    console.log('Nothing to do.');
    return;
  }

  // Child rows first — these tables reference users/listings by plain id
  // columns rather than declared foreign keys, so ordering is on us.
  const steps = [];
  if (users) {
    steps.push(
      ['favorites (on seeded listings)', `DELETE FROM favorites WHERE listing_id IN (SELECT id FROM design_listings WHERE designer_id IN (${users}))`],
      ['favorites (by seeded users)', `DELETE FROM favorites WHERE user_id IN (${users})`],
      ['follows', `DELETE FROM follows WHERE follower_id IN (${users}) OR following_id IN (${users})`],
      ['notifications', `DELETE FROM notifications WHERE user_id IN (${users})`],
      ['estimates', `DELETE FROM estimates WHERE user_id IN (${users})`],
      ['print_jobs', `DELETE FROM print_jobs WHERE user_id IN (${users})`],
      ['payments', `DELETE FROM payments WHERE user_id IN (${users})`],
      ['design_listings', `DELETE FROM design_listings WHERE designer_id IN (${users})`],
      ['model_files', `DELETE FROM model_files WHERE user_id IN (${users})`],
      ['users', `DELETE FROM users WHERE user_id IN (${users})`],
    );
  }
  if (printers) {
    steps.push(['printers', `DELETE FROM printers WHERE id IN (${printers})`]);
  }

  // One transaction, so a failure part-way leaves nothing half-deleted.
  // In dry-run the deletes still execute (to get real counts) and the
  // whole transaction is rolled back.
  const script = [
    'BEGIN;',
    ...steps.map(([label, sql]) => `\\echo '${label}'\n${sql};`),
    DRY_RUN ? 'ROLLBACK;' : 'COMMIT;',
  ].join('\n');

  const out = DB.runScript(script);
  console.log(out.trim());
  console.log(DRY_RUN ? '\nRolled back — nothing was changed.' : '\nCommitted.');

  if (!DRY_RUN && !LEGACY_ONLY && fs.existsSync(MANIFEST)) {
    fs.unlinkSync(MANIFEST);
    console.log('Manifest removed.');
  }
}

try {
  main();
} catch (err) {
  console.error('Cleanup failed:', err.message);
  process.exit(1);
}

'use strict';

// Removes seeded data — and only seeded data.
//
//   node clean.js            — remove what seed.js created (via manifest)
//   node clean.js --legacy   — also remove the earlier faker-generated seed
//   node clean.js --dry-run  — report what would be deleted, delete nothing
//
// Two things make this script more careful than it might look:
//
// 1. This database has real hand-made accounts (the admin, lab staff, and
//    the team's own logins) interleaved with seed rows, so nothing here
//    deletes by "everything above id N". The current seeder's output is
//    tracked in seeded-manifest.json; the earlier faker run is identified
//    by an explicit, verified id range.
//
// 2. The compose stack does NOT publish Postgres on the host, and this
//    machine has a *different* Postgres listening on localhost:5432 — a
//    connection string pointing there succeeds and reports a database with
//    5 users and no listings. So all SQL is piped through
//    `docker exec <postgres container> psql`, and assertUsingAppDatabase()
//    below refuses to run against anything that doesn't look like the
//    PrintForge schema.

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const DRY_RUN = process.argv.includes('--dry-run');
const LEGACY = process.argv.includes('--legacy');
const MANIFEST = path.join(__dirname, 'seeded-manifest.json');

// The 20 faker-generated users the previous seeder created, verified
// against the users table before this range was written down: ids 20–39
// inclusive. Everything outside it is a real account.
const LEGACY_USER_RANGE = [20, 39];

function containerId() {
  if (process.env.PG_CONTAINER) return process.env.PG_CONTAINER;
  const out = execFileSync('docker', ['ps', '-qf', 'name=postgres'], { encoding: 'utf8' }).trim();
  const id = out.split('\n')[0];
  if (!id) throw new Error('no running postgres container found (set PG_CONTAINER to override)');
  return id;
}

const CID = containerId();

function psql(sql) {
  return execFileSync(
    'docker',
    ['exec', '-i', CID, 'psql', '-U', 'postgres', '-d', 'printforge_db', '-tA', '-c', sql],
    { encoding: 'utf8' },
  ).trim();
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
  console.log(`Postgres container ${CID.slice(0, 12)} — schema verified.`);

  const userIds = [];
  const printerIds = [];

  if (fs.existsSync(MANIFEST)) {
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
    // this project generates.
    const p = psql("SELECT id FROM printers WHERE printer_name ~ '^PRN-[0-9]+$'");
    const pids = p ? p.split('\n').map(Number) : [];
    console.log(`Legacy sweep: ${pids.length} PRN-### printers`);
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

  const out = execFileSync(
    'docker',
    ['exec', '-i', CID, 'psql', '-U', 'postgres', '-d', 'printforge_db', '-v', 'ON_ERROR_STOP=1'],
    { encoding: 'utf8', input: script },
  );
  console.log(out.trim());
  console.log(DRY_RUN ? '\nRolled back — nothing was changed.' : '\nCommitted.');

  if (!DRY_RUN && fs.existsSync(MANIFEST)) {
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

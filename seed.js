#!/usr/bin/env node
/**
 * PrintForge Extra Seeder — Chess, Phone Cases, Sunglasses
 * Designer: Gareth Martey
 * Usage: node seed_extras.js   (Node 18+ required)
 */

const BASE_URL = 'https://printforge-backend-production.up.railway.app';

const DESIGNERS = [
  { full_name: 'Gareth Martey', email: 'gareth.martey@printforge.dev', password: 'Designer@2024!' },
];

const DESIGNS = [
  // ── Chess (MINIATURES) ────────────────────────────────────────────────────
  {
    designer: 'gareth.martey@printforge.dev',
    title: 'Classic Chess Board',
    description: 'Full-size 400mm chess board with alternating square inlays and a raised border. Prints in two colours using filament swap at layer change. Fits standard 45mm pieces.',
    base_price: 48.00, category: 'MINIATURES', file_format: 'STL',
    estimated_print_time_minutes: 420, layer_height_mm: 0.2,
    thumbnail_url: 'https://images.unsplash.com/photo-1529699211952-734e80c4d42b?w=400&h=400&fit=crop&auto=format',
  },
  {
    designer: 'gareth.martey@printforge.dev',
    title: 'Staunton Chess Piece Set',
    description: 'Full 32-piece Staunton chess set — king, queen, rooks, bishops, knights, and pawns. Weighted base holes for coins or steel balls. King height 90mm.',
    base_price: 75.00, category: 'MINIATURES', file_format: 'STL',
    estimated_print_time_minutes: 680, layer_height_mm: 0.1,
    thumbnail_url: 'https://images.unsplash.com/photo-1586165368502-1bad197a6461?w=400&h=400&fit=crop&auto=format',
  },
  {
    designer: 'gareth.martey@printforge.dev',
    title: 'Travel Chess Set with Case',
    description: 'Compact travel chess set with magnetic pieces and a folding board that doubles as a storage case. All pieces store inside. 150mm board size.',
    base_price: 55.00, category: 'MINIATURES', file_format: 'STL',
    estimated_print_time_minutes: 510, layer_height_mm: 0.15,
    thumbnail_url: 'https://images.unsplash.com/photo-1529699211952-734e80c4d42b?w=400&h=400&fit=crop&auto=format',
  },
  {
    designer: 'gareth.martey@printforge.dev',
    title: 'Medieval Chess Piece Set',
    description: 'Fantasy medieval chess set with knights as mounted horses, rooks as castle towers, and bishops as monks. Highly detailed, print at 0.1mm for best results.',
    base_price: 90.00, category: 'MINIATURES', file_format: 'STL',
    estimated_print_time_minutes: 820, layer_height_mm: 0.1,
    thumbnail_url: 'https://images.unsplash.com/photo-1586165368502-1bad197a6461?w=400&h=400&fit=crop&auto=format',
  },
  {
    designer: 'gareth.martey@printforge.dev',
    title: 'Minimalist Chess Piece Set',
    description: 'Abstract minimalist chess pieces — geometric forms that are instantly recognisable but strikingly modern. Perfect for design-forward desks. King 70mm.',
    base_price: 60.00, category: 'MINIATURES', file_format: 'STL',
    estimated_print_time_minutes: 560, layer_height_mm: 0.15,
    thumbnail_url: 'https://images.unsplash.com/photo-1529699211952-734e80c4d42b?w=400&h=400&fit=crop&auto=format',
  },

  // ── Phone Cases (ENCLOSURES) ───────────────────────────────────────────────
  {
    designer: 'gareth.martey@printforge.dev',
    title: 'iPhone 15 Pro Slim Case',
    description: 'Slim-fit protective case for iPhone 15 Pro. Precise cutouts for all ports, buttons, and camera. Print in flexible TPU for best fit and drop protection.',
    base_price: 15.00, category: 'ENCLOSURES', file_format: 'STL',
    estimated_print_time_minutes: 90, layer_height_mm: 0.2,
    thumbnail_url: 'https://images.unsplash.com/photo-1601784551446-20c9e07cdbdb?w=400&h=400&fit=crop&auto=format',
  },
  {
    designer: 'gareth.martey@printforge.dev',
    title: 'Samsung Galaxy S24 Rugged Case',
    description: 'Heavy-duty rugged case for Samsung Galaxy S24 with raised bezel for screen protection and reinforced corners. TPU recommended for shock absorption.',
    base_price: 17.00, category: 'ENCLOSURES', file_format: 'STL',
    estimated_print_time_minutes: 110, layer_height_mm: 0.2,
    thumbnail_url: 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=400&h=400&fit=crop&auto=format',
  },
  {
    designer: 'gareth.martey@printforge.dev',
    title: 'Universal Wallet Phone Case',
    description: 'Universal phone case with 3 card slots and a cash pocket on the back. Adjustable inner frame fits phones from 68mm to 80mm wide. Print in PLA or TPU.',
    base_price: 20.00, category: 'ENCLOSURES', file_format: 'STL',
    estimated_print_time_minutes: 130, layer_height_mm: 0.2,
    thumbnail_url: 'https://images.unsplash.com/photo-1601784551446-20c9e07cdbdb?w=400&h=400&fit=crop&auto=format',
  },
  {
    designer: 'gareth.martey@printforge.dev',
    title: 'Pixel 8 Carbon Fibre Case',
    description: 'Textured carbon-fibre-look case for Google Pixel 8. Thin profile, grippy matte surface. Precise camera cutout with lens guard lip.',
    base_price: 14.00, category: 'ENCLOSURES', file_format: 'STL',
    estimated_print_time_minutes: 85, layer_height_mm: 0.15,
    thumbnail_url: 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=400&h=400&fit=crop&auto=format',
  },
  {
    designer: 'gareth.martey@printforge.dev',
    title: 'MagSafe Battery Pack Case',
    description: 'iPhone 15 case with integrated MagSafe alignment ring and a slot for an external battery pack. Keeps everything together without a bulky grip.',
    base_price: 22.00, category: 'ENCLOSURES', file_format: 'STL',
    estimated_print_time_minutes: 145, layer_height_mm: 0.2,
    thumbnail_url: 'https://images.unsplash.com/photo-1601784551446-20c9e07cdbdb?w=400&h=400&fit=crop&auto=format',
  },

  // ── Sunglasses (OTHER) ────────────────────────────────────────────────────
  {
    designer: 'gareth.martey@printforge.dev',
    title: 'Wayfarer Sunglasses Frame',
    description: 'Classic Wayfarer-style sunglass frame. Fits standard CR39 lenses cut to 50x35mm. Hinge pins use M1.4 screws. Print in matte black PETG.',
    base_price: 25.00, category: 'OTHER', file_format: 'STL',
    estimated_print_time_minutes: 180, layer_height_mm: 0.1,
    thumbnail_url: 'https://images.unsplash.com/photo-1511499767150-a48a237f0083?w=400&h=400&fit=crop&auto=format',
  },
  {
    designer: 'gareth.martey@printforge.dev',
    title: 'Aviator Sunglasses Frame',
    description: 'Slim aviator frame with teardrop lens profile. Fits 58x46mm lenses. Spring-loaded hinge system for comfortable all-day wear. Print in bronze PLA.',
    base_price: 28.00, category: 'OTHER', file_format: 'STL',
    estimated_print_time_minutes: 195, layer_height_mm: 0.1,
    thumbnail_url: 'https://images.unsplash.com/photo-1508296695146-257a814070b4?w=400&h=400&fit=crop&auto=format',
  },
  {
    designer: 'gareth.martey@printforge.dev',
    title: 'Round Retro Sunglasses Frame',
    description: 'Round retro sunglass frame inspired by 1970s style. 48mm round lens opening. Thin temples, keyhole nose bridge. Print in tortoiseshell-look filament.',
    base_price: 23.00, category: 'OTHER', file_format: 'STL',
    estimated_print_time_minutes: 165, layer_height_mm: 0.1,
    thumbnail_url: 'https://images.unsplash.com/photo-1511499767150-a48a237f0083?w=400&h=400&fit=crop&auto=format',
  },
  {
    designer: 'gareth.martey@printforge.dev',
    title: 'Cat Eye Sunglasses Frame',
    description: 'Dramatic cat-eye frame with an upswept outer corner. Fits 55x40mm lenses. Lightweight at under 20g printed. Best in glossy PLA for authentic look.',
    base_price: 26.00, category: 'OTHER', file_format: 'STL',
    estimated_print_time_minutes: 175, layer_height_mm: 0.1,
    thumbnail_url: 'https://images.unsplash.com/photo-1508296695146-257a814070b4?w=400&h=400&fit=crop&auto=format',
  },
  {
    designer: 'gareth.martey@printforge.dev',
    title: 'Sport Wraparound Sunglasses',
    description: 'Wraparound sport frame with ventilation channels and a non-slip nose pad groove. Fits 65x38mm curved lenses. Print in flexible PETG for comfort.',
    base_price: 30.00, category: 'OTHER', file_format: 'STL',
    estimated_print_time_minutes: 200, layer_height_mm: 0.15,
    thumbnail_url: 'https://images.unsplash.com/photo-1511499767150-a48a237f0083?w=400&h=400&fit=crop&auto=format',
  },
  {
    designer: 'gareth.martey@printforge.dev',
    title: 'Oversized Square Sunglasses',
    description: 'Bold oversized square frame — a statement accessory. 60x50mm lens opening. Thick temples with subtle taper. Print in solid white or cream PLA.',
    base_price: 27.00, category: 'OTHER', file_format: 'STL',
    estimated_print_time_minutes: 190, layer_height_mm: 0.1,
    thumbnail_url: 'https://images.unsplash.com/photo-1508296695146-257a814070b4?w=400&h=400&fit=crop&auto=format',
  },
];

// ── Generate a valid binary STL (tetrahedron) ────────────────────────────────
function makeBinarySTL() {
  const triangles = [
    [[0,-1,0],[0,0,0],[1,0,0],[0,0,1]],
    [[0,0,-1],[0,0,0],[0,1,0],[1,0,0]],
    [[-1,0,0],[0,0,0],[0,0,1],[0,1,0]],
    [[1,1,1], [1,0,0],[0,1,0],[0,0,1]],
  ];
  const buf = Buffer.alloc(80 + 4 + triangles.length * 50);
  buf.write('PrintForge seed STL', 0, 'ascii');
  buf.writeUInt32LE(triangles.length, 80);
  let offset = 84;
  for (const [normal, v1, v2, v3] of triangles) {
    for (const val of [...normal, ...v1, ...v2, ...v3]) {
      buf.writeFloatLE(val, offset); offset += 4;
    }
    buf.writeUInt16LE(0, offset); offset += 2;
  }
  return buf;
}

// ── Helpers ──────────────────────────────────────────────────────────────────
function log(msg)  { console.log(`  ✓  ${msg}`); }
function warn(msg) { console.warn(`  ⚠  ${msg}`); }
function fail(msg) { console.error(`  ✗  ${msg}`); }

async function api(method, path, body, token) {
  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) { const t = await res.text(); throw new Error(`${method} ${path} → ${res.status}: ${t}`); }
  return res.json();
}

function buildMultipart(boundary, fields, fileField) {
  const parts = [];
  const enc = s => Buffer.from(s, 'utf8');
  for (const [k, v] of Object.entries(fields)) {
    parts.push(enc(`--${boundary}\r\nContent-Disposition: form-data; name="${k}"\r\n\r\n${v}\r\n`));
  }
  if (fileField) {
    parts.push(enc(`--${boundary}\r\nContent-Disposition: form-data; name="${fileField.name}"; filename="${fileField.filename}"\r\nContent-Type: ${fileField.mime}\r\n\r\n`));
    parts.push(fileField.data);
    parts.push(enc('\r\n'));
  }
  parts.push(enc(`--${boundary}--\r\n`));
  return Buffer.concat(parts);
}

async function uploadSTL(filename, token) {
  const boundary = `----PFB${Math.random().toString(36).slice(2)}`;
  const body = buildMultipart(boundary, {}, { name: 'file', filename, mime: 'model/stl', data: makeBinarySTL() });
  const res = await fetch(`${BASE_URL}/api/files/upload`, {
    method: 'POST',
    headers: { 'Content-Type': `multipart/form-data; boundary=${boundary}`, Authorization: `Bearer ${token}` },
    body,
  });
  if (!res.ok) { const t = await res.text(); throw new Error(`${res.status}: ${t}`); }
  return res.json();
}

async function uploadThumbnail(imageUrl, filename, token) {
  const download = await fetch(imageUrl);
  if (!download.ok) throw new Error(`Thumbnail fetch ${download.status}`);
  const imgData = Buffer.from(await download.arrayBuffer());
  const boundary = `----PFB${Math.random().toString(36).slice(2)}`;
  const body = buildMultipart(boundary, {}, { name: 'file', filename, mime: 'image/jpeg', data: imgData });
  const res = await fetch(`${BASE_URL}/api/files/upload/image`, {
    method: 'POST',
    headers: { 'Content-Type': `multipart/form-data; boundary=${boundary}`, Authorization: `Bearer ${token}` },
    body,
  });
  if (!res.ok) { const t = await res.text(); throw new Error(`${res.status}: ${t}`); }
  return res.json();
}

async function createListing(design, fileId, thumbnailFileId, token) {
  const boundary = `----PFB${Math.random().toString(36).slice(2)}`;
  const fields = {
    file_id: String(fileId), title: design.title, description: design.description,
    base_price: String(design.base_price), category: design.category,
    ownership_attested: 'true', file_format: design.file_format,
    estimated_print_time_minutes: String(design.estimated_print_time_minutes),
    layer_height_mm: String(design.layer_height_mm),
    ...(thumbnailFileId ? { thumbnail_file_id: String(thumbnailFileId) } : {}),
  };
  const body = buildMultipart(boundary, fields, null);
  const res = await fetch(`${BASE_URL}/api/marketplace`, {
    method: 'POST',
    headers: { 'Content-Type': `multipart/form-data; boundary=${boundary}`, Authorization: `Bearer ${token}` },
    body,
  });
  if (!res.ok) { const t = await res.text(); throw new Error(`${res.status}: ${t}`); }
  return res.json();
}

// ── Main ─────────────────────────────────────────────────────────────────────
async function seed() {
  const total = DESIGNS.length;
  console.log(`\n🌱  PrintForge Extra Seeder — ${total} designs\n`);
  console.log(`    Target: ${BASE_URL}\n`);

  console.log('── Step 1: Registering Gareth Martey ──────────────────────────');
  const tokens = {};
  for (const d of DESIGNERS) {
    try {
      const res = await api('POST', '/api/auth/register', {
        full_name: d.full_name, email: d.email,
        password: d.password, confirm_password: d.password, role: 'DESIGNER',
      });
      tokens[d.email] = res.token;
      log(`Registered ${d.full_name}`);
    } catch (e) {
      warn(`${d.email} exists — logging in`);
      try {
        const res = await api('POST', '/api/auth/login', { email: d.email, password: d.password });
        tokens[d.email] = res.token;
        log(`Logged in as ${d.email}`);
      } catch (le) { fail(`Cannot log in: ${le.message}`); process.exit(1); }
    }
  }

  console.log('\n── Step 2: Upgrading to DESIGNER role ─────────────────────────');
  for (const d of DESIGNERS) {
    try {
      await api('POST', '/api/auth/upgrade-to-designer', null, tokens[d.email]);
      log(`Upgraded ${d.email}`);
    } catch (e) { warn(`${e.message}`); }
  }

  console.log(`\n── Step 3: Creating ${total} listings ──────────────────────────────`);
  let created = 0, skipped = 0;

  for (const design of DESIGNS) {
    const token = tokens[design.designer];
    if (!token) { fail(`No token for ${design.designer}`); skipped++; continue; }

    console.log(`\n  [${created + skipped + 1}/${total}] ${design.title}`);
    const slug = design.title.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();

    let fileId;
    try {
      const r = await uploadSTL(`${slug}.stl`, token);
      fileId = r.fileId;
      log(`STL → fileId ${fileId}`);
    } catch (e) { fail(`STL: ${e.message}`); skipped++; continue; }

    let thumbnailFileId;
    try {
      const r = await uploadThumbnail(design.thumbnail_url, `${slug}_thumb.jpg`, token);
      thumbnailFileId = r.fileId ?? r.id;
      log(`Thumbnail → fileId ${thumbnailFileId}`);
    } catch (e) { warn(`Thumbnail skipped: ${e.message}`); }

    let listingId;
    try {
      const r = await createListing(design, fileId, thumbnailFileId, token);
      listingId = r.id;
      log(`Listing created → id ${listingId}`);
    } catch (e) { fail(`createListing: ${e.message}`); skipped++; continue; }

    try {
      await api('PATCH', `/api/marketplace/${listingId}/publish`, null, token);
      log(`Published ✓`);
      created++;
    } catch (e) { fail(`publish: ${e.message}`); skipped++; }
  }

  console.log('\n────────────────────────────────────────────────────────────────');
  console.log(`✅  Done. ${created} published, ${skipped} skipped.\n`);
  console.log('    Gareth\'s login:');
  console.log(`      gareth.martey@printforge.dev  /  Designer@2024!\n`);
}

seed().catch(e => { console.error('\n💥  Error:', e.message); process.exit(1); });
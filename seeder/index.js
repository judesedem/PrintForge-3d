const { Client } = require('pg');
const bcrypt = require('bcryptjs');
const { faker } = require('@faker-js/faker');

const dbUrl = 'postgres://postgres:admin@postgres:5432/printforge_db';

const sampleStls = [
  'https://raw.githubusercontent.com/mrdoob/three.js/master/examples/models/stl/ascii/slotted_disk.stl',
  'https://raw.githubusercontent.com/mrdoob/three.js/master/examples/models/stl/ascii/pr2_head_pan.stl',
  'https://raw.githubusercontent.com/mrdoob/three.js/master/examples/models/stl/binary/pr2_head_tilt.stl',
  'https://raw.githubusercontent.com/mrdoob/three.js/master/examples/models/stl/binary/colored.stl',
  'https://raw.githubusercontent.com/mrdoob/three.js/master/examples/models/obj/female02/female02.obj'
];

const categories = ['GEARS', 'DRONES', 'ENCLOSURES', 'MINIATURES', 'ARTICULATED', 'OTHER'];

async function seed() {
  const client = new Client({ connectionString: dbUrl });
  try {
    await client.connect();
    console.log('Connected to database.');

    // 1. Create Users
    console.log('Creating 20 users (10 students, 10 designers)...');
    const passwordHash = await bcrypt.hash('password123', 10);
    const users = [];

    for (let i = 0; i < 20; i++) {
      const role = i < 10 ? 'STUDENT' : 'DESIGNER';
      const fullName = faker.person.fullName();
      const email = faker.internet.email().toLowerCase();
      
      const res = await client.query(
        `INSERT INTO users (full_name, email, password, role, suspended, email_verified, email_opt_in)
         VALUES ($1, $2, $3, $4, false, true, true) RETURNING user_id`,
        [fullName, email, passwordHash, role]
      );
      users.push({ id: res.rows[0].user_id, role, fullName });
    }

    const designers = users.filter(u => u.role === 'DESIGNER');

    // 2. Add Printers
    console.log('Adding 5 printers...');
    const printerStatuses = ['AVAILABLE', 'BUSY', 'OFFLINE', 'MAINTENANCE'];
    for (let i = 0; i < 5; i++) {
      const pName = `PRN-${faker.number.int({ min: 100, max: 999 })}`;
      const pLoc = `Lab ${faker.string.alpha({ length: 1, casing: 'upper' })}`;
      const pStatus = faker.helpers.arrayElement(printerStatuses);
      
      await client.query(
        `INSERT INTO printers (printer_name, lab_location, status, created_at)
         VALUES ($1, $2, $3, NOW())`,
        [pName, pLoc, pStatus]
      );
    }

    // 3. For each designer, add 10 3D designs
    console.log('Adding 10 3D designs for each designer (100 total)...');
    for (const designer of designers) {
      for (let i = 0; i < 10; i++) {
        const fileUrl = faker.helpers.arrayElement(sampleStls);
        const fileName = faker.system.fileName() + (fileUrl.endsWith('.obj') ? '.obj' : '.stl');
        const storedFilename = faker.string.uuid();
        const fileSizeBytes = faker.number.int({ min: 50000, max: 10000000 });
        const fileType = fileUrl.endsWith('.obj') ? 'model/obj' : 'model/stl';
        
        // Insert model_file
        const fileRes = await client.query(
          `INSERT INTO model_files (file_name, file_url, file_type, stored_filename, file_size_bytes, uploaded_at, user_id, geometry_parsed, pre_sliced)
           VALUES ($1, $2, $3, $4, $5, NOW(), $6, false, false) RETURNING file_id`,
          [fileName, fileUrl, fileType, storedFilename, fileSizeBytes, designer.id]
        );
        const fileId = fileRes.rows[0].file_id;

        // Insert design_listing
        const title = faker.commerce.productName() + ' 3D Model';
        const description = faker.commerce.productDescription();
        const basePrice = faker.number.float({ min: 0, max: 50, fractionDigits: 2 });
        const category = faker.helpers.arrayElement(categories);
        
        await client.query(
          `INSERT INTO design_listings (file_id, designer_id, title, description, base_price, category, status, created_at, published_at, total_orders, total_earnings, favorite_count, download_count, ownership_attested)
           VALUES ($1, $2, $3, $4, $5, $6, 'PUBLISHED', NOW(), NOW(), 0, 0, 0, 0, true)`,
          [fileId, designer.id, title, description, basePrice, category]
        );
      }
    }

    console.log('Database successfully seeded!');
  } catch (error) {
    console.error('Error seeding database:', error);
  } finally {
    await client.end();
  }
}

seed();

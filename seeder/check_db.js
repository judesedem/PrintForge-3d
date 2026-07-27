const { Client } = require('pg');
const dbUrl = 'postgres://neondb_owner:npg_MmGXB4AQ9jUY@ep-polished-union-atblvpsn.c-9.us-east-1.aws.neon.tech/neondb?sslmode=require';

async function check() {
  const client = new Client({ connectionString: dbUrl });
  try {
    await client.connect();
    
    // Simulate what findPublishedNewest does:
    // "SELECT dl FROM DesignListing dl WHERE dl.status = 'PUBLISHED' " +
    // "AND dl.designerId NOT IN (SELECT u.userId FROM User u WHERE u.suspended = true) " +
    // "ORDER BY (SELECT u.isPremium FROM User u WHERE u.userId = dl.designerId) DESC, dl.createdAt DESC"

    const query = `
      SELECT dl.id, dl.title, dl.designer_id, dl.created_at, u.is_premium
      FROM design_listings dl
      JOIN users u ON u.user_id = dl.designer_id
      WHERE dl.status = 'PUBLISHED'
      AND dl.designer_id NOT IN (SELECT user_id FROM users WHERE suspended = true)
      ORDER BY u.is_premium DESC, dl.created_at DESC
      LIMIT 20
    `;
    
    const res = await client.query(query);
    console.log("Top 20 items returned by simulated backend query:");
    console.log(res.rows.map(r => r.title));

  } catch (error) {
    console.error(error);
  } finally {
    await client.end();
  }
}
check();

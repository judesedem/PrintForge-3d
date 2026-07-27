const { Client } = require('pg');

const dbUrl = 'postgres://postgres:admin@postgres:5432/printforge_db';

async function updateImages() {
  const client = new Client({ connectionString: dbUrl });
  try {
    await client.connect();
    
    // Fetch all listings
    const res = await client.query('SELECT id, title FROM design_listings');
    const listings = res.rows;
    
    for (const listing of listings) {
      // The titles are mostly format: "Adjective Material Noun 3D Model"
      // e.g. "Fantastic Concrete Chicken 3D Model"
      // We want to extract the "Noun" to use as an image search keyword.
      let keyword = '3d,model';
      
      const match = listing.title.match(/(?:.* )?([a-zA-Z]+) 3D Model/i);
      if (match && match[1]) {
        keyword = match[1].toLowerCase();
      } else {
        // Fallback for other titles
        const parts = listing.title.split(' ');
        if (parts.length >= 2) {
            keyword = parts[0];
        }
      }
      
      // We'll use loremflickr to get an image matching the keyword
      // e.g. https://loremflickr.com/600/600/chicken
      // Adding `lock` param ensures it stays consistent for the same listing ID
      const imageUrl = `https://loremflickr.com/600/600/${keyword}?lock=${listing.id}`;
      
      await client.query('UPDATE design_listings SET thumbnail_url = $1 WHERE id = $2', [imageUrl, listing.id]);
    }
    
    console.log(`Updated images for ${listings.length} designs based on their keywords.`);
  } catch (error) {
    console.error(error);
  } finally {
    await client.end();
  }
}

updateImages();

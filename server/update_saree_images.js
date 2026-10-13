import mongoose from 'mongoose';

const URI = 'mongodb+srv://lifechangersind:alpha1421@alphaproduct.kovyp.mongodb.net/Ai-Mirror?appName=AlphaProduct';

async function updateImages() {
  const c = await mongoose.connect(URI);
  const col = c.connection.db.collection('sarees');

  // Exact mappings to real assets in project
  const updates = [
    { id: 'saree-1', img: '/assets/saree_kanjivaram_red.jpg' },
    { id: 'saree-2', img: '/assets/saree_peacock_blue.jpg' },
    { id: 'saree-3', img: '/assets/saree_blush_pink.jpg' },
    { id: 'saree-4', img: '/assets/saree_mustard_yellow.jpg' },
    { id: 'saree-5', img: '/assets/kanjivaram_red_gold_1791632062922.jpg' },
    { id: 'saree-6', img: '/assets/peacock_blue_saree_1791632083264.jpg' }
  ];

  for (const item of updates) {
    const res = await col.updateOne(
      { sareeId: item.id },
      { $set: { image: item.img, tryOnImage: item.img } }
    );
    console.log(`Updated ${item.id} -> ${item.img}:`, res.modifiedCount);
  }

  // Also remove any dummy items that are not in the official catalog
  const deleteRes = await col.deleteMany({
    sareeId: { $regex: '^p-' }
  });
  console.log('Removed dummy/scratch sarees:', deleteRes.deletedCount);

  const finalSarees = await col.find().project({ sareeId: 1, name: 1, image: 1 }).toArray();
  console.log('Final Sarees in DB:');
  finalSarees.forEach((s, idx) => console.log(`${idx + 1}. [${s.sareeId}] ${s.name} => ${s.image}`));

  await mongoose.disconnect();
}

updateImages().catch(console.error);

import mongoose from 'mongoose';

const URI = 'mongodb+srv://lifechangersind:alpha1421@alphaproduct.kovyp.mongodb.net/Ai-Mirror?appName=AlphaProduct';

async function updateImages() {
  const c = await mongoose.connect(URI);
  const col = c.connection.db.collection('sarees');

  // Exact mappings to real assets in project
  const updates = [
    { id: 'saree-3', img: '/assets/image_20261013_123805.jpg' },
    { id: 'saree-4', img: '/assets/image_20261013_123806.jpg' },
    { id: 'saree-5', img: '/assets/image_20261013_123806_1.jpg' },
    { id: 'saree-6', img: '/assets/image_20261013_123806_2.jpg' },
    { id: 'saree-7', img: '/assets/image_20261013_123812.jpg' },
    { id: 'saree-8', img: '/assets/image_20261013_123813.jpg' }
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

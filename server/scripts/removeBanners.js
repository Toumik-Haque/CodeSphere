require('dotenv').config();

const mongoose = require('mongoose');

// The per-user banner upload feature has been removed. Every member now uses
// the single default banner, so drop any stored banner data.
async function removeBanners() {
  if (!process.env.MONGODB_URI) {
    throw new Error('MONGODB_URI is missing from .env');
  }

  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected to MongoDB.');

  const db = mongoose.connection.db;

  for (const collectionName of ['users', 'admins']) {
    const collection = db.collection(collectionName);
    const filter = { bannerImage: { $exists: true } };
    const count = await collection.countDocuments(filter);

    if (count === 0) {
      console.log(`No bannerImage fields found in ${collectionName}.`);
      continue;
    }

    const result = await collection.updateMany(filter, {
      $unset: { bannerImage: '' },
    });

    console.log(`Removed bannerImage from ${result.modifiedCount} ${collectionName} documents.`);
  }
}

removeBanners()
  .catch((error) => {
    console.error('Banner migration failed:', error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }
  });

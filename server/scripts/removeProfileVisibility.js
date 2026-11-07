require('dotenv').config();

const mongoose = require('mongoose');
const User = require('../models/User');

async function removeProfileVisibility() {
  if (!process.env.MONGODB_URI) {
    throw new Error('MONGODB_URI is missing from .env');
  }

  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected to MongoDB.');

  const filter = { profileVisibility: { $exists: true } };
  const existingCount = await User.collection.countDocuments(filter);

  if (existingCount === 0) {
    console.log('No profileVisibility fields found. Nothing to migrate.');
    return;
  }

  const result = await User.collection.updateMany(filter, {
    $unset: { profileVisibility: '' },
  });

  console.log(`Removed profileVisibility from ${result.modifiedCount} user records.`);
}

removeProfileVisibility()
  .catch((error) => {
    console.error('Profile visibility migration failed:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }
  });

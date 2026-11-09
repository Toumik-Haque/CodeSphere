// One-time migration after merging main into arnab. Safe to re-run.
//
// 1. Profile portfolio projects (main's feature) used the "projects"
//    collection, which is now the Project Hub's. They move to
//    "portfolioprojects" (model PortfolioProject).
//
// Usage (from server/): node scripts/migratePortfolioProjects.js

require('dotenv').config();
const mongoose = require('mongoose');

(async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    const db = mongoose.connection.db;

    // Portfolio documents have a `user` field and no `slug` (Hub projects have `slug` + `owner`).
    const old = await db.collection('projects').find({ user: { $exists: true }, slug: { $exists: false } }).toArray();
    for (const doc of old) {
      await db.collection('portfolioprojects').updateOne({ _id: doc._id }, { $setOnInsert: doc }, { upsert: true });
      await db.collection('projects').deleteOne({ _id: doc._id });
    }
    console.log(`Portfolio projects moved: ${old.length}`);
  } catch (error) {
    console.error('Migration failed:', error.message);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
  }
})();

// One-time migration after merging main into arnab. Safe to re-run.
//
// 1. Profile portfolio projects (main's feature) used the "projects"
//    collection, which is now the Project Hub's. They move to
//    "portfolioprojects" (model PortfolioProject).
// 2. Profile photos/banners exist under two names (profileImage/bannerImage
//    from the dashboard, avatarUrl/bannerUrl used by the forum and Project
//    Hub). Copy whichever is set into the other so both show everywhere.
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

    const users = db.collection('users');
    const empty = (field) => ({ $or: [{ [field]: '' }, { [field]: { $exists: false } }, { [field]: null }] });
    const results = await Promise.all([
      users.updateMany({ 'profileImage.url': { $nin: ['', null] }, ...empty('avatarUrl') }, [{ $set: { avatarUrl: '$profileImage.url' } }]),
      users.updateMany({ 'bannerImage.url': { $nin: ['', null] }, ...empty('bannerUrl') }, [{ $set: { bannerUrl: '$bannerImage.url' } }]),
      users.updateMany({ avatarUrl: { $nin: ['', null] }, ...empty('profileImage.url') }, [{ $set: { profileImage: { url: '$avatarUrl', fileId: { $ifNull: ['$avatarFileId', ''] } } } }]),
      users.updateMany({ bannerUrl: { $nin: ['', null] }, ...empty('bannerImage.url') }, [{ $set: { bannerImage: { url: '$bannerUrl', fileId: { $ifNull: ['$bannerFileId', ''] } } } }]),
    ]);
    console.log(`Photo/banner fields synced: ${results.map((r) => r.modifiedCount).join(', ')}`);
  } catch (error) {
    console.error('Migration failed:', error.message);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
  }
})();

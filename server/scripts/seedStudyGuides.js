// Loads the starter Study Guide pages (data/guideSeed.js) as published.
// Safe to re-run: guides are matched by slug and updated in place.
// Usage (from server/): node scripts/seedStudyGuides.js
require('dotenv').config();
const mongoose = require('mongoose');
const StudyGuide = require('../models/StudyGuide');
const guides = require('../data/guideSeed');

(async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    for (const { examples, ...guide } of guides) {
      void examples; // used only to verify the content when it was written
      await StudyGuide.updateOne({ slug: guide.slug }, { $set: { ...guide, status: 'published' } }, { upsert: true });
      console.log(`✔ ${guide.slug}`);
    }
    console.log(`Done: ${guides.length} guides.`);
  } catch (error) {
    console.error('Seeding guides failed:', error.message);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
  }
})();

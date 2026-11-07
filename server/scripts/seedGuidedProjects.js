// Loads the starter guided projects (data/guidedProjects.js) into the Project Hub.
// Safe to re-run: matched by slug and updated in place.
// Usage (from server/): node scripts/seedGuidedProjects.js
require('dotenv').config();
const mongoose = require('mongoose');
const { GuidedProject } = require('../models/Project');
const guided = require('../data/guidedProjects');

(async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    for (const g of guided) {
      await GuidedProject.updateOne({ slug: g.slug }, { $set: { ...g, status: 'published' } }, { upsert: true });
      console.log(`✔ ${g.slug}`);
    }
    console.log(`Done: ${guided.length} guided projects.`);
  } catch (error) {
    console.error('Seeding failed:', error.message);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
  }
})();

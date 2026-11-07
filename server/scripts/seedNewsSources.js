// Adds the suggested Tech News sources (data/news.js) as INACTIVE sources.
// An editor must test each feed in Admin → Tech News → Sources and check the
// publisher's terms before enabling it. Safe to re-run.
// Usage (from server/): node scripts/seedNewsSources.js
require('dotenv').config();
const mongoose = require('mongoose');
const { NewsSource } = require('../models/News');
const { SUGGESTED_SOURCES } = require('../data/news');

(async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    for (const source of SUGGESTED_SOURCES) {
      const result = await NewsSource.updateOne(
        { feedUrl: source.feedUrl },
        { $setOnInsert: { ...source, isActive: false, notes: 'Suggested source: test the feed and check terms before enabling.' } },
        { upsert: true },
      );
      console.log(`${result.upsertedCount ? 'added  ' : 'exists '} ${source.name}`);
    }
  } catch (error) {
    console.error('Seeding sources failed:', error.message);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
  }
})();

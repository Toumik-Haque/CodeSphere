// Loads the starter Reverse Coding challenges (data/reverseSeed.js).
// Safe to re-run: challenges are matched by slug and updated in place.
//
// Usage (from server/):
//   node scripts/seedReverseChallenges.js            publish all
//   node scripts/seedReverseChallenges.js --draft    keep as drafts
//
// If Judge0 is configured, each reference solution is validated against
// every test first; challenges that fail stay as drafts. Without Judge0 the
// starter set is published as-is (it was verified against every test when
// it was written).

require('dotenv').config();
const mongoose = require('mongoose');
const { ReverseChallenge } = require('../models/Reverse');
const { isConfigured } = require('../config/judge0');
const { evaluate } = require('../utils/reverseJudge');
const seeds = require('../data/reverseSeed');

const keepDraft = process.argv.includes('--draft');

(async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    const judge = isConfigured();
    console.log(judge ? 'Validating with Judge0…' : 'Judge0 not configured: using the pre-verified starter set.');

    for (const seed of seeds) {
      const { reference, ...data } = seed;
      const doc = {
        ...data,
        languages: data.languages || ['python'],
        referenceSolution: { language: 'python', code: reference },
      };

      let valid = true;
      let note = 'Starter set: reference solution verified against every test when written.';
      if (judge) {
        const result = await evaluate(doc, 'python', reference, doc.tests.map((t) => ({ ...t, hidden: false })));
        valid = result.verdict === 'accepted';
        note = valid ? 'Reference solution passed every test (Judge0).' : `Reference solution failed: ${result.verdict} (${result.passed}/${result.total}).`;
      }

      const existing = await ReverseChallenge.findOne({ slug: doc.slug });
      const publish = valid && !keepDraft;
      await ReverseChallenge.updateOne(
        { slug: doc.slug },
        {
          $set: {
            ...doc,
            validatedAt: valid ? new Date() : null,
            validationNote: note,
            ...(publish ? { status: 'published', publishedAt: existing?.publishedAt || new Date() } : {}),
          },
          ...(publish ? {} : { $setOnInsert: { status: 'draft' } }),
        },
        { upsert: true },
      );
      console.log(`${valid ? '✔' : '✘'} ${doc.slug.padEnd(22)} ${publish ? 'published' : 'draft'}  ${valid ? '' : note}`);
    }
    console.log(`Done: ${seeds.length} challenges.`);
  } catch (error) {
    console.error('Seeding failed:', error.message);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
  }
})();

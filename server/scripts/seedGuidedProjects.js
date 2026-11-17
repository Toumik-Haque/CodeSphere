// Loads the guided projects into the Project Hub:
//   data/guidedProjects.js        the original starter projects (order 1-6)
//   data/guidedProjectsAiEra.json the AI-era catalogue (its order 1-100 is shifted to follow the starters)
// data/guidedProjectsAiEraDrafts.json holds catalogue entries still being rewritten; it is NOT
// seeded. Move an entry into guidedProjectsAiEra.json once it is ready.
// Safe to re-run: matched by slug and updated in place.
//
// Usage (from server/):
//   node scripts/seedGuidedProjects.js           validate, then write
//   node scripts/seedGuidedProjects.js --check   validate only, no database needed
//   node scripts/seedGuidedProjects.js --force   also update projects whose task list changed
//                                                even though students have started them
//
// Student progress is stored by task position ("milestone:task"), so changing the
// tasks of a started project would move their ticks onto different tasks. Without
// --force such projects are skipped and listed.
require('dotenv').config();
const mongoose = require('mongoose');
const { GuidedProject, GuidedProgress } = require('../models/Project');
const { readGuided } = require('../utils/guidedValidate');
const starters = require('../data/guidedProjects');
const aiEra = require('../data/guidedProjectsAiEra.json');

const CHECK_ONLY = process.argv.includes('--check');
const FORCE = process.argv.includes('--force');
const AI_ERA_ORDER_OFFSET = starters.length;

const taskShape = (milestones) => JSON.stringify((milestones || []).map((m) => m.tasks));

function prepare() {
  const source = [
    ...starters,
    ...aiEra.map((p) => ({ ...p, order: Number(p.order) + AI_ERA_ORDER_OFFSET })),
  ];
  const errors = [];
  const seen = new Set();
  const items = source.map((raw, i) => {
    const { data, error } = readGuided({ ...raw, status: 'published' });
    const label = raw.slug || `item ${i + 1}`;
    if (error) {
      errors.push(`${label}: ${error}`);
      return null;
    }
    if (data.slug !== raw.slug) errors.push(`${label}: slug would be changed to "${data.slug}"`);
    if (seen.has(data.slug)) errors.push(`${label}: duplicate slug`);
    seen.add(data.slug);
    return data;
  });
  return { items, errors };
}

(async () => {
  const { items, errors } = prepare();
  if (errors.length) {
    console.error(`✖ ${errors.length} problem(s), nothing was written:\n  ${errors.join('\n  ')}`);
    process.exitCode = 1;
    return;
  }
  console.log(`✔ ${items.length} guided projects are valid.`);
  if (CHECK_ONLY) return;

  try {
    await mongoose.connect(process.env.MONGODB_URI);
    let created = 0;
    let updated = 0;
    const skipped = [];
    for (const g of items) {
      const existing = await GuidedProject.findOne({ slug: g.slug }).select('milestones').lean();
      if (existing && !FORCE && taskShape(existing.milestones) !== taskShape(g.milestones)
        && await GuidedProgress.exists({ guided: existing._id })) {
        skipped.push(g.slug);
        continue;
      }
      await GuidedProject.updateOne({ slug: g.slug }, { $set: g }, { upsert: true });
      if (existing) updated += 1;
      else created += 1;
    }
    console.log(`Done: ${created} created, ${updated} updated.`);
    if (skipped.length) {
      console.warn(`! Skipped ${skipped.length} started project(s) whose tasks changed (re-run with --force to apply):\n  ${skipped.join('\n  ')}`);
    }
  } catch (error) {
    console.error('Seeding failed:', error.message);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
  }
})();

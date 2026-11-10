// Validation for guided projects, shared by the admin editor routes and the seed script,
// so seeded data obeys exactly the same limits as projects written in the editor.
const { PROJECT_CATEGORIES, PROJECT_LEVELS } = require('../models/Project');

const clean = (v, max) => String(v ?? '').replace(/\r\n?/g, '\n').replace(/<[^>]*>/g, '').trim().slice(0, max);
const safeUrl = (v) => {
  const s = String(v || '').trim().slice(0, 500);
  return /^https?:\/\/[^\s<>"]+$/i.test(s) ? s : '';
};
const lines = (v) => (Array.isArray(v) ? v : String(v || '').split('\n')).map((x) => clean(x, 200)).filter(Boolean);

function readGuided(b) {
  const data = {
    title: clean(b.title, 100),
    slug: clean(b.slug || b.title, 80).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, ''),
    summary: clean(b.summary, 300),
    level: PROJECT_LEVELS.includes(b.level) ? b.level : 'Beginner',
    category: PROJECT_CATEGORIES.includes(b.category) ? b.category : 'web',
    estHours: Math.min(200, Math.max(1, Number(b.estHours) || 10)),
    tags: [...new Set(lines(b.tags).map((t) => t.toLowerCase().slice(0, 30)))].slice(0, 8),
    prerequisites: lines(b.prerequisites).slice(0, 10),
    stack: lines(b.stack).slice(0, 12),
    outcomes: lines(b.outcomes).slice(0, 10),
    problem: clean(b.problem, 3000),
    starterRepo: safeUrl(b.starterRepo),
    submissionCriteria: lines(b.submissionCriteria).slice(0, 8),
    order: Number(b.order) || 100,
    status: b.status === 'draft' ? 'draft' : 'published',
    milestones: (Array.isArray(b.milestones) ? b.milestones : []).slice(0, 12).map((m) => ({
      title: clean(m?.title, 100),
      description: clean(m?.description, 500),
      tasks: lines(m?.tasks).slice(0, 12),
      resources: (Array.isArray(m?.resources) ? m.resources : []).map((r) => ({ title: clean(r?.title, 100), url: safeUrl(r?.url) })).filter((r) => r.title && r.url).slice(0, 6),
    })).filter((m) => m.title && m.tasks.length),
  };
  if (data.title.length < 3) return { error: 'Give the guided project a title.' };
  if (!data.slug) return { error: 'The URL slug is invalid.' };
  if (data.summary.length < 20) return { error: 'Write a summary (20+ characters).' };
  if (!data.milestones.length) return { error: 'Add at least one milestone with tasks.' };
  return { data };
}

module.exports = { readGuided };

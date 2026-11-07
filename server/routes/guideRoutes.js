const express = require('express');
const mongoose = require('mongoose');
const StudyGuide = require('../models/StudyGuide');
const { ReverseChallenge } = require('../models/Reverse');
const { protect, requireStaff } = require('../middleware/authMiddleware');

const router = express.Router();

const LEVELS = ['Beginner', 'Intermediate', 'Advanced'];
const KINDS = ['docs', 'video', 'article', 'practice', 'course'];
// Admins and challenge editors manage learning content.
const editor = [protect, requireStaff('challenge-editor')];

const isId = (id) => mongoose.Types.ObjectId.isValid(id);
const clean = (v, max) => String(v ?? '').replace(/\r\n?/g, '\n').trim().slice(0, max);
const safeUrl = (url) => (/^https?:\/\/[^\s]+$/i.test(String(url || '').trim()) ? String(url).trim() : null);

function card(g) {
  return {
    id: String(g._id),
    slug: g.slug,
    title: g.title,
    topic: g.topic,
    level: g.level,
    summary: g.summary,
    tags: g.tags,
    estMinutes: g.estMinutes,
    updatedAt: g.updatedAt,
  };
}

// GET /api/guides?topic&level&q
router.get('/', async (req, res) => {
  try {
    const filter = { status: 'published' };
    if (typeof req.query.topic === 'string' && req.query.topic) filter.topic = req.query.topic;
    if (LEVELS.includes(req.query.level)) filter.level = req.query.level;
    const q = clean(req.query.q, 80);
    if (q) filter.$text = { $search: q };

    const [guides, topics] = await Promise.all([
      StudyGuide.find(filter, q ? { score: { $meta: 'textScore' } } : {})
        .sort(q ? { score: { $meta: 'textScore' } } : { order: 1, title: 1 }).lean(),
      StudyGuide.distinct('topic', { status: 'published' }),
    ]);
    res.json({ guides: guides.map(card), topics: topics.sort(), levels: LEVELS });
  } catch (error) {
    console.error('Guides list error:', error);
    res.status(500).json({ message: 'Could not load the study guide.' });
  }
});

// GET /api/guides/:slug: guide + related Reverse Coding challenges + more
// guides on the same topic.
router.get('/:slug', async (req, res) => {
  try {
    const guide = await StudyGuide.findOne({ slug: req.params.slug, status: 'published' }).lean();
    if (!guide) return res.status(404).json({ message: 'Guide not found.' });

    const [challenges, related] = await Promise.all([
      ReverseChallenge.find({ topic: guide.topic, status: 'published', publishedAt: { $lte: new Date() } })
        .select('slug title level points').limit(6).lean(),
      StudyGuide.find({ topic: guide.topic, status: 'published', _id: { $ne: guide._id } }).select('slug title level').limit(5).lean(),
    ]);
    return res.json({
      guide: { ...card(guide), body: guide.body, resources: guide.resources },
      challenges: challenges.map((c) => ({ slug: c.slug, title: c.title, level: c.level, points: c.points })),
      related: related.map((g) => ({ slug: g.slug, title: g.title, level: g.level })),
    });
  } catch (error) {
    console.error('Guide error:', error);
    return res.status(500).json({ message: 'Could not load this guide.' });
  }
});

// ---------- editors ----------

function guideInput(body) {
  const errors = [];
  const value = {
    title: clean(body.title, 120),
    slug: clean(body.slug || body.title, 80).toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/^-+|-+$/g, ''),
    topic: clean(body.topic, 40),
    level: body.level,
    summary: clean(body.summary, 300),
    body: clean(body.body, 20000),
    tags: (Array.isArray(body.tags) ? body.tags : []).map((t) => clean(t, 24).toLowerCase()).filter(Boolean).slice(0, 8),
    estMinutes: Math.min(Math.max(Number(body.estMinutes) || 10, 1), 240),
    order: Number.isFinite(Number(body.order)) ? Number(body.order) : 100,
    resources: [],
  };
  (Array.isArray(body.resources) ? body.resources : []).slice(0, 12).forEach((r) => {
    const url = safeUrl(r?.url);
    const title = clean(r?.title, 120);
    if (!title && !r?.url) return;
    if (!url || !title) errors.push('Each resource needs a title and an http(s) link.');
    else value.resources.push({ title, url, kind: KINDS.includes(r.kind) ? r.kind : 'docs' });
  });
  if (!value.title) errors.push('Add a title.');
  if (!value.slug) errors.push('Add a URL slug.');
  if (!value.topic) errors.push('Add a topic.');
  if (!LEVELS.includes(value.level)) errors.push('Choose a level.');
  if (value.summary.length < 10) errors.push('Write a short summary (10+ characters).');
  if (value.body.length < 50) errors.push('The guide needs some content (50+ characters).');
  return { errors, value };
}

router.get('/admin/all', editor, async (req, res) => {
  try {
    const guides = await StudyGuide.find().sort({ order: 1, title: 1 }).lean();
    res.json({ guides: guides.map((g) => ({ ...g, id: String(g._id) })), levels: LEVELS, kinds: KINDS });
  } catch (error) {
    console.error('Guides admin error:', error);
    res.status(500).json({ message: 'Could not load guides.' });
  }
});

router.post('/admin', editor, async (req, res) => {
  const { errors, value } = guideInput(req.body);
  if (errors.length) return res.status(400).json({ message: errors[0] });
  try {
    const guide = await StudyGuide.create({ ...value, status: req.body.status === 'published' ? 'published' : 'draft', updatedBy: req.user._id });
    return res.status(201).json({ id: String(guide._id) });
  } catch (error) {
    if (error.code === 11000) return res.status(409).json({ message: 'That slug is already used.' });
    console.error('Guide create error:', error);
    return res.status(500).json({ message: 'Could not create the guide.' });
  }
});

router.put('/admin/:id', editor, async (req, res) => {
  if (!isId(req.params.id)) return res.status(404).json({ message: 'Guide not found.' });
  const { errors, value } = guideInput(req.body);
  if (errors.length) return res.status(400).json({ message: errors[0] });
  try {
    const status = ['draft', 'published'].includes(req.body.status) ? req.body.status : undefined;
    const result = await StudyGuide.updateOne(
      { _id: req.params.id },
      { $set: { ...value, ...(status ? { status } : {}), updatedBy: req.user._id } },
    );
    if (!result.matchedCount) return res.status(404).json({ message: 'Guide not found.' });
    return res.json({ ok: true });
  } catch (error) {
    if (error.code === 11000) return res.status(409).json({ message: 'That slug is already used.' });
    console.error('Guide update error:', error);
    return res.status(500).json({ message: 'Could not save the guide.' });
  }
});

router.delete('/admin/:id', editor, async (req, res) => {
  if (!isId(req.params.id)) return res.status(404).json({ message: 'Guide not found.' });
  try {
    await StudyGuide.deleteOne({ _id: req.params.id });
    return res.json({ ok: true });
  } catch (error) {
    console.error('Guide delete error:', error);
    return res.status(500).json({ message: 'Could not delete the guide.' });
  }
});

module.exports = router;

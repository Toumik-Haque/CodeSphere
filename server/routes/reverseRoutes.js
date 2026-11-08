const express = require('express');
const mongoose = require('mongoose');
const { ReverseChallenge, ReverseAttempt, ReverseBookmark } = require('../models/Reverse');
const { protect, optionalAuth, requireStaff } = require('../middleware/authMiddleware');

// Admins and challenge editors.
const editorOnly = requireStaff('challenge-editor');
const { createLimiter } = require('../utils/rateLimit');
const { isConfigured, activeRunner, SUPPORTED_LANGUAGES } = require('../config/codeRunner');
const { evaluate } = require('../utils/reverseJudge');
const { syncBadgesQuietly } = require('../utils/badges');
const { getBroadcastOptions } = require('../utils/broadcast');
const { notifyLiveChallenges } = require('../utils/reverseNotifications');
const StudyGuide = require('../models/StudyGuide');

const router = express.Router();

const FORMATS = {
  output: 'Output reconstruction',
  io: 'Input-output reconstruction',
  pattern: 'Pattern reconstruction',
  algorithm: 'Algorithm reconstruction',
  bug: 'Bug-to-behaviour',
  logic: 'Logic reconstruction',
};
const LEVELS = ['Beginner', 'Intermediate', 'Advanced'];
const MAX_CODE = 20000;
const MAX_TESTS = 20;

const limitRuns = createLimiter({ windowMs: 60 * 1000, max: 8, message: 'You\'re running code very fast. Wait a moment and try again.' });
const limitSubmits = createLimiter({ windowMs: 60 * 1000, max: 4, message: 'Up to 4 submissions a minute. Test with Run first.' });
const inFlight = new Set();

const isId = (id) => mongoose.Types.ObjectId.isValid(id);
const publishedFilter = () => ({ status: 'published', publishedAt: { $lte: new Date() } });

function scoreFor(challenge, verdict, passed, total) {
  if (verdict === 'accepted') return challenge.points;
  if (!total || !passed) return 0;
  // Partial credit: up to half the points for passing some tests.
  return Math.floor((challenge.points * passed) / total / 2);
}

function card(c, state = {}) {
  return {
    id: String(c._id),
    slug: c.slug,
    title: c.title,
    format: c.format,
    formatLabel: FORMATS[c.format] || c.format,
    level: c.level,
    topic: c.topic,
    tags: c.tags,
    points: c.points,
    estMinutes: c.estMinutes,
    languages: c.languages,
    featured: c.featured,
    summary: c.statement.replace(/\s+/g, ' ').slice(0, 160),
    publishedAt: c.publishedAt,
    ...state,
  };
}

// Per-user best score, attempts and bookmarks for a set of challenges.
async function userState(userId, challengeIds) {
  if (!userId) return new Map();
  const [best, bookmarks] = await Promise.all([
    ReverseAttempt.aggregate([
      { $match: { user: new mongoose.Types.ObjectId(String(userId)), challenge: { $in: challengeIds }, kind: 'submit' } },
      { $group: { _id: '$challenge', best: { $max: '$score' }, attempts: { $sum: 1 }, solved: { $max: { $cond: [{ $eq: ['$verdict', 'accepted'] }, 1, 0] } } } },
    ]),
    ReverseBookmark.find({ user: userId, challenge: { $in: challengeIds } }).select('challenge').lean(),
  ]);
  const map = new Map();
  best.forEach((b) => map.set(String(b._id), { bestScore: b.best, attempts: b.attempts, solved: Boolean(b.solved) }));
  bookmarks.forEach((b) => {
    const key = String(b.challenge);
    map.set(key, { ...(map.get(key) || {}), bookmarked: true });
  });
  return map;
}

// ---------- student ----------

// GET /api/reverse?level&topic&language&tab=all|completed|bookmarked
router.get('/', optionalAuth, async (req, res) => {
  try {
    const filter = publishedFilter();
    if (LEVELS.includes(req.query.level)) filter.level = req.query.level;
    if (typeof req.query.topic === 'string' && req.query.topic) filter.topic = req.query.topic;
    if (SUPPORTED_LANGUAGES.includes(req.query.language)) filter.languages = req.query.language;

    const challenges = await ReverseChallenge.find(filter)
      .select('slug title format level topic tags points estMinutes languages featured statement publishedAt')
      .sort({ featured: -1, publishedAt: -1 })
      .lean();
    const state = await userState(req.user?._id, challenges.map((c) => c._id));

    let list = challenges.map((c) => card(c, state.get(String(c._id)) || {}));
    if (req.query.tab === 'completed') list = list.filter((c) => c.solved);
    if (req.query.tab === 'bookmarked') list = list.filter((c) => c.bookmarked);

    const topics = await ReverseChallenge.distinct('topic', publishedFilter());
    const solvedCount = [...state.values()].filter((s) => s.solved).length;

    res.json({
      challenges: list,
      topics: topics.sort(),
      levels: LEVELS,
      formats: FORMATS,
      judgeReady: isConfigured(),
      progress: req.user ? { solved: solvedCount, total: challenges.length } : null,
    });
  } catch (error) {
    console.error('Reverse list error:', error);
    res.status(500).json({ message: 'Could not load challenges.' });
  }
});

// GET /api/reverse/:slug: statement, examples, public tests, hints,
// editorial (after solving) and my history.
router.get('/:slug', optionalAuth, async (req, res) => {
  try {
    const challenge = await ReverseChallenge.findOne({ slug: req.params.slug, ...publishedFilter() }).lean();
    if (!challenge) return res.status(404).json({ message: 'Challenge not found.' });

    const state = (await userState(req.user?._id, [challenge._id])).get(String(challenge._id)) || {};
    const history = req.user
      ? await ReverseAttempt.find({ user: req.user._id, challenge: challenge._id, kind: 'submit' })
        .sort({ createdAt: -1 }).limit(10).select('language verdict passed total score runtimeMs createdAt code').lean()
      : [];

    const publicTests = challenge.tests.filter((t) => !t.hidden).map((t) => ({ input: t.input, output: t.output }));
    // Study Guide pages on the same topic (linked from the editorial).
    const guides = await StudyGuide.find({ topic: challenge.topic, status: 'published' }).select('slug title level').limit(3).lean();

    return res.json({
      challenge: {
        ...card(challenge, state),
        statement: challenge.statement,
        inputFormat: challenge.inputFormat,
        outputFormat: challenge.outputFormat,
        constraints: challenge.constraints,
        examples: challenge.examples,
        publicTests,
        hiddenTestCount: challenge.tests.length - publicTests.length,
        hints: challenge.hints,
        starterCode: Object.fromEntries(challenge.starterCode ? Object.entries(challenge.starterCode) : []),
        outputPolicy: challenge.outputPolicy,
        timeLimit: challenge.timeLimit,
        // The editorial unlocks once you've solved it.
        editorial: state.solved ? challenge.editorial : null,
        editorialLocked: Boolean(challenge.editorial) && !state.solved,
      },
      history: history.map((h) => ({ ...h, id: String(h._id), _id: undefined })),
      guides: guides.map((g) => ({ slug: g.slug, title: g.title, level: g.level })),
      judgeReady: isConfigured(),
    });
  } catch (error) {
    console.error('Reverse detail error:', error);
    return res.status(500).json({ message: 'Could not load this challenge.' });
  }
});

async function prepare(req, res) {
  const { language, code } = req.body;
  const challenge = await ReverseChallenge.findOne({ slug: req.params.slug, ...publishedFilter() });
  if (!challenge) {
    res.status(404).json({ message: 'Challenge not found.' });
    return null;
  }
  if (!challenge.languages.includes(language) || !SUPPORTED_LANGUAGES.includes(language)) {
    res.status(400).json({ message: 'Choose one of the languages accepted by this challenge.' });
    return null;
  }
  if (typeof code !== 'string' || !code.trim() || code.length > MAX_CODE) {
    res.status(400).json({ message: `Write some code first (up to ${MAX_CODE / 1000} KB).` });
    return null;
  }
  if (!isConfigured()) {
    res.status(503).json({ message: 'Code running is turned off on this server. Ask the CodeSphere team.' });
    return null;
  }
  const key = String(req.user._id);
  if (inFlight.has(key)) {
    res.status(429).json({ message: 'Your previous run is still being checked.' });
    return null;
  }
  return challenge;
}

// POST /api/reverse/:slug/run { language, code }: visible sample tests only.
router.post('/:slug/run', protect, limitRuns, async (req, res) => {
  const key = String(req.user._id);
  try {
    const challenge = await prepare(req, res);
    if (!challenge) return undefined;
    inFlight.add(key);

    const tests = challenge.tests.filter((t) => !t.hidden);
    const result = await evaluate(challenge, req.body.language, req.body.code, tests);
    await ReverseAttempt.create({
      user: req.user._id,
      challenge: challenge._id,
      kind: 'run',
      language: req.body.language,
      verdict: result.verdict,
      passed: result.passed,
      total: result.total,
      runtimeMs: result.runtimeMs,
    });
    return res.json(result);
  } catch (error) {
    console.error('Reverse run error:', error);
    return res.status(502).json({ message: 'Could not run your code right now. Try again.' });
  } finally {
    inFlight.delete(key);
  }
});

// POST /api/reverse/:slug/submit { language, code }: every test (hidden ones
// report only pass/fail). Score is calculated here, never by the browser.
router.post('/:slug/submit', protect, limitSubmits, async (req, res) => {
  const key = String(req.user._id);
  try {
    const challenge = await prepare(req, res);
    if (!challenge) return undefined;
    inFlight.add(key);

    const result = await evaluate(challenge, req.body.language, req.body.code, challenge.tests);
    const score = scoreFor(challenge, result.verdict, result.passed, result.total);
    const previous = (await userState(req.user._id, [challenge._id])).get(String(challenge._id)) || {};

    await ReverseAttempt.create({
      user: req.user._id,
      challenge: challenge._id,
      kind: 'submit',
      language: req.body.language,
      code: req.body.code,
      verdict: result.verdict,
      passed: result.passed,
      total: result.total,
      score,
      runtimeMs: result.runtimeMs,
    });

    const firstSolve = result.verdict === 'accepted' && !previous.solved;
    const newBadges = result.verdict === 'accepted' ? await syncBadgesQuietly(req.user._id) : [];

    return res.json({
      ...result,
      score,
      bestScore: Math.max(score, previous.bestScore || 0),
      xpGained: Math.max(0, score - (previous.bestScore || 0)),
      firstSolve,
      editorial: result.verdict === 'accepted' ? challenge.editorial : null,
      newBadges,
    });
  } catch (error) {
    console.error('Reverse submit error:', error);
    return res.status(502).json({ message: 'Could not check your submission right now. Try again.' });
  } finally {
    inFlight.delete(key);
  }
});

// POST /api/reverse/:slug/bookmark: toggle.
router.post('/:slug/bookmark', protect, async (req, res) => {
  try {
    const challenge = await ReverseChallenge.findOne({ slug: req.params.slug, ...publishedFilter() }).select('_id');
    if (!challenge) return res.status(404).json({ message: 'Challenge not found.' });
    const keyDoc = { user: req.user._id, challenge: challenge._id };
    const removed = await ReverseBookmark.findOneAndDelete(keyDoc);
    if (!removed) await ReverseBookmark.updateOne(keyDoc, { $setOnInsert: keyDoc }, { upsert: true });
    return res.json({ bookmarked: !removed });
  } catch (error) {
    console.error('Reverse bookmark error:', error);
    return res.status(500).json({ message: 'Could not update your bookmark.' });
  }
});

// ---------- authoring (admins) ----------

const EDITABLE = [
  'slug', 'title', 'format', 'level', 'topic', 'tags', 'points', 'estMinutes', 'languages', 'statement',
  'inputFormat', 'outputFormat', 'constraints', 'examples', 'starterCode', 'hints', 'editorial', 'tests',
  'referenceSolution', 'outputPolicy', 'timeLimit', 'memoryLimitKb', 'featured',
];

function validateChallenge(body) {
  const errors = [];
  const value = {};
  EDITABLE.forEach((k) => {
    if (body[k] !== undefined) value[k] = body[k];
  });
  if (value.slug !== undefined) {
    value.slug = String(value.slug).toLowerCase().trim().replace(/[^a-z0-9-]+/g, '-').replace(/^-+|-+$/g, '');
    if (!value.slug) errors.push('Add a URL slug.');
  }
  if (value.format !== undefined && !FORMATS[value.format]) errors.push('Choose a challenge format.');
  if (value.level !== undefined && !LEVELS.includes(value.level)) errors.push('Choose a level.');
  if (value.languages !== undefined) {
    value.languages = (Array.isArray(value.languages) ? value.languages : []).filter((l) => SUPPORTED_LANGUAGES.includes(l));
    if (!value.languages.length) errors.push('Allow at least one language.');
  }
  if (value.tests !== undefined) {
    if (!Array.isArray(value.tests) || value.tests.length < 2 || value.tests.length > MAX_TESTS) {
      errors.push(`Add 2-${MAX_TESTS} test cases.`);
    } else {
      value.tests = value.tests.map((t) => ({ input: String(t.input ?? ''), output: String(t.output ?? ''), hidden: Boolean(t.hidden) }));
      if (!value.tests.some((t) => !t.hidden)) errors.push('Make at least one test public (a visible sample).');
      if (!value.tests.some((t) => t.hidden)) errors.push('Add at least one hidden test.');
    }
  }
  if (value.tags !== undefined) value.tags = (Array.isArray(value.tags) ? value.tags : []).map(String).slice(0, 8);
  if (value.hints !== undefined) value.hints = (Array.isArray(value.hints) ? value.hints : []).map(String).filter(Boolean).slice(0, 5);
  return { errors, value };
}

// GET /api/reverse/admin/all: every challenge (any status), full data.
router.get('/admin/all', protect, editorOnly, async (req, res) => {
  try {
    const challenges = await ReverseChallenge.find().sort({ updatedAt: -1 }).lean();
    const stats = await ReverseAttempt.aggregate([
      { $match: { kind: 'submit' } },
      { $group: { _id: '$challenge', attempts: { $sum: 1 }, accepted: { $sum: { $cond: [{ $eq: ['$verdict', 'accepted'] }, 1, 0] } } } },
    ]);
    const byId = new Map(stats.map((s) => [String(s._id), s]));
    res.json({
      challenges: challenges.map((c) => ({
        ...c,
        id: String(c._id),
        starterCode: Object.fromEntries(c.starterCode ? Object.entries(c.starterCode) : []),
        stats: byId.get(String(c._id)) || { attempts: 0, accepted: 0 },
      })),
      formats: FORMATS,
      levels: LEVELS,
      languages: SUPPORTED_LANGUAGES,
      judgeReady: isConfigured(),
      runner: activeRunner(),
    });
  } catch (error) {
    console.error('Reverse admin list error:', error);
    res.status(500).json({ message: 'Could not load challenges.' });
  }
});

// POST /api/reverse/admin: create a draft.
router.post('/admin', protect, editorOnly, async (req, res) => {
  const { errors, value } = validateChallenge(req.body);
  for (const field of ['slug', 'title', 'format', 'level', 'topic', 'points', 'statement', 'tests']) {
    if (value[field] === undefined || value[field] === '') errors.push(`Missing: ${field}.`);
  }
  if (errors.length) return res.status(400).json({ message: errors[0], errors });
  try {
    const challenge = await ReverseChallenge.create({ ...value, status: 'draft', createdBy: req.user._id, updatedBy: req.user._id });
    return res.status(201).json({ id: String(challenge._id) });
  } catch (error) {
    if (error.code === 11000) return res.status(409).json({ message: 'That slug is already used.' });
    console.error('Reverse create error:', error);
    return res.status(500).json({ message: 'Could not create the challenge.' });
  }
});

// PUT /api/reverse/admin/:id: edit. Changing tests or the reference
// solution clears validation (it must be re-validated before publishing).
router.put('/admin/:id', protect, editorOnly, async (req, res) => {
  if (!isId(req.params.id)) return res.status(404).json({ message: 'Challenge not found.' });
  const { errors, value } = validateChallenge(req.body);
  if (errors.length) return res.status(400).json({ message: errors[0], errors });
  try {
    const challenge = await ReverseChallenge.findById(req.params.id);
    if (!challenge) return res.status(404).json({ message: 'Challenge not found.' });
    const behaviourChanged = ['tests', 'referenceSolution', 'outputPolicy', 'timeLimit', 'memoryLimitKb']
      .some((k) => value[k] !== undefined && JSON.stringify(value[k]) !== JSON.stringify(challenge[k]));
    Object.assign(challenge, value, { updatedBy: req.user._id });
    if (behaviourChanged) {
      challenge.validatedAt = null;
      challenge.validationNote = 'Tests or limits changed: validate again.';
    }
    await challenge.save();
    return res.json({ ok: true, needsValidation: behaviourChanged });
  } catch (error) {
    if (error.code === 11000) return res.status(409).json({ message: 'That slug is already used.' });
    console.error('Reverse update error:', error);
    return res.status(500).json({ message: 'Could not save the challenge.' });
  }
});

// POST /api/reverse/admin/:id/validate: the reference solution must pass
// every test before the challenge can be published.
router.post('/admin/:id/validate', protect, editorOnly, async (req, res) => {
  if (!isId(req.params.id)) return res.status(404).json({ message: 'Challenge not found.' });
  try {
    const challenge = await ReverseChallenge.findById(req.params.id);
    if (!challenge) return res.status(404).json({ message: 'Challenge not found.' });
    if (!challenge.referenceSolution?.code) return res.status(400).json({ message: 'Add a reference solution first.' });
    if (!isConfigured()) return res.status(503).json({ message: 'Validation needs the code runner (CODE_RUNNER is off).' });

    // Show admins every test's details (they're allowed to see hidden ones).
    const asPublic = challenge.tests.map((t) => ({ ...t.toObject(), hidden: false }));
    const result = await evaluate(challenge, challenge.referenceSolution.language, challenge.referenceSolution.code, asPublic);
    const ok = result.verdict === 'accepted';
    challenge.validatedAt = ok ? new Date() : null;
    challenge.validationNote = ok ? 'Reference solution passed every test.' : `Reference solution failed: ${result.verdict} (${result.passed}/${result.total}).`;
    await challenge.save();
    return res.json({ ok, ...result, note: challenge.validationNote });
  } catch (error) {
    console.error('Reverse validate error:', error);
    return res.status(502).json({ message: 'Could not validate right now.' });
  }
});

// POST /api/reverse/admin/:id/publish { publishAt? }: publish now or later.
router.post('/admin/:id/publish', protect, editorOnly, async (req, res) => {
  if (!isId(req.params.id)) return res.status(404).json({ message: 'Challenge not found.' });
  try {
    const challenge = await ReverseChallenge.findById(req.params.id);
    if (!challenge) return res.status(404).json({ message: 'Challenge not found.' });
    if (!challenge.validatedAt) return res.status(400).json({ message: 'Validate the reference solution before publishing.' });

    const publishAt = req.body.publishAt ? new Date(req.body.publishAt) : new Date();
    if (Number.isNaN(publishAt.getTime())) return res.status(400).json({ message: 'Invalid publish date.' });
    const wasLive = challenge.status === 'published';
    challenge.status = 'published';
    challenge.publishedAt = publishAt;
    Object.assign(challenge, getBroadcastOptions(req.body));
    if (!wasLive) challenge.notifiedAt = null;
    challenge.updatedBy = req.user._id;
    await challenge.save();

    if (publishAt <= new Date()) await notifyLiveChallenges();
    return res.json({ ok: true, publishedAt: challenge.publishedAt });
  } catch (error) {
    console.error('Reverse publish error:', error);
    return res.status(500).json({ message: 'Could not publish.' });
  }
});

// POST /api/reverse/admin/:id/retire: unpublish (keeps attempts/history).
router.post('/admin/:id/retire', protect, editorOnly, async (req, res) => {
  if (!isId(req.params.id)) return res.status(404).json({ message: 'Challenge not found.' });
  try {
    await ReverseChallenge.updateOne({ _id: req.params.id }, { $set: { status: 'retired', updatedBy: req.user._id } });
    return res.json({ ok: true });
  } catch (error) {
    console.error('Reverse retire error:', error);
    return res.status(500).json({ message: 'Could not retire.' });
  }
});

module.exports = router;

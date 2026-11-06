const express = require('express');
const ChallengeProgress = require('../models/ChallengeProgress');
const { protect } = require('../middleware/authMiddleware');
const { CHALLENGES } = require('../data/codingChallenges');
const { runCode, isConfigured, SUPPORTED_LANGUAGES } = require('../config/judge0');
const { challengeXpTotal } = require('../utils/progress');

const router = express.Router();

const MAX_CODE_LENGTH = 20000;
const CHECKS_PER_MINUTE = 6;

const challengesById = new Map(CHALLENGES.map((c) => [c.id, c]));

// Case-insensitive; any run of whitespace/newlines counts as one space.
function normalise(output) {
  return output.trim().toLowerCase().split(/\s+/).filter(Boolean).join(' ');
}

// Simple per-user limit so one student can't burn the Judge0 quota.
const recentChecks = new Map();
function isRateLimited(userId) {
  const now = Date.now();
  const times = (recentChecks.get(userId) || []).filter((t) => now - t < 60000);
  if (times.length >= CHECKS_PER_MINUTE) {
    recentChecks.set(userId, times);
    return true;
  }
  times.push(now);
  recentChecks.set(userId, times);
  return false;
}

// Everything except the expected output.
function publicChallenge({ expected, ...challenge }) {
  void expected;
  return challenge;
}

// GET /api/challenges: the challenge list (public).
router.get('/', (req, res) => {
  res.json({ challenges: CHALLENGES.map(publicChallenge) });
});

// GET /api/challenges/progress: which challenges this student has solved.
router.get('/progress', protect, async (req, res) => {
  try {
    const progress = await ChallengeProgress.findOne({ user: req.user._id }).lean();
    res.json({
      solved: progress?.solved || [],
      xp: challengeXpTotal(progress),
      // Manual "Done" marking is allowed only while Judge0 isn't set up.
      manualMode: !isConfigured(),
    });
  } catch (error) {
    console.error('Challenge progress error:', error);
    res.status(500).json({ message: 'Could not load your progress.' });
  }
});

// POST /api/challenges/:id/check { language, code }: run the code and, if the
// output is correct, mark the challenge solved.
router.post('/:id/check', protect, async (req, res) => {
  try {
    const challenge = challengesById.get(req.params.id);
    const { language, code } = req.body;

    if (!challenge) {
      return res.status(404).json({ message: 'Challenge not found.' });
    }
    if (!SUPPORTED_LANGUAGES.includes(language)) {
      return res.status(400).json({ message: 'This language can\'t be checked yet. Pick one of the featured languages.' });
    }
    if (typeof code !== 'string' || !code.trim()) {
      return res.status(400).json({ message: 'Write some code in the editor first.' });
    }
    if (code.length > MAX_CODE_LENGTH) {
      return res.status(400).json({ message: 'Your code is too long to check.' });
    }
    if (!isConfigured()) {
      return res.status(503).json({ message: 'The code checker isn\'t set up on this server yet.' });
    }
    if (isRateLimited(String(req.user._id))) {
      return res.status(429).json({ message: 'Slow down a little. Try again in a minute.' });
    }

    const run = await runCode(language, code);
    const passed = run.status === 'ok' && normalise(run.stdout) === normalise(challenge.expected);

    let alreadySolved = false;
    if (passed) {
      // Add only if not already solved (atomic, so double clicks don't duplicate).
      const updated = await ChallengeProgress.findOneAndUpdate(
        { user: req.user._id, 'solved.challengeId': { $ne: challenge.id } },
        { $push: { solved: { challengeId: challenge.id, language } } },
        { new: true },
      );
      if (!updated) {
        const existing = await ChallengeProgress.findOne({ user: req.user._id });
        if (existing) {
          alreadySolved = true;
        } else {
          await ChallengeProgress.create({
            user: req.user._id,
            solved: [{ challengeId: challenge.id, language }],
          }).catch((err) => {
            // A parallel request created it first: already recorded.
            if (err.code !== 11000) throw err;
          });
        }
      }
    }

    return res.json({
      passed,
      alreadySolved,
      status: run.status,
      output: run.stdout.slice(0, 4000),
      error: run.error ? run.error.slice(0, 4000) : '',
      xp: passed ? challenge.xp : 0,
    });
  } catch (error) {
    console.error('Challenge check error:', error);
    const timedOut = error.name === 'TimeoutError' || error.name === 'AbortError';
    return res.status(502).json({
      message: timedOut
        ? 'The code checker took too long to respond. Try again.'
        : 'Could not check your code right now.',
    });
  }
});

// Manual marking (honour system), used while Judge0 isn't configured.
// Once JUDGE0_API_KEY / JUDGE0_URL is set, only /check can solve challenges.
function manualModeOnly(req, res, next) {
  if (isConfigured()) {
    return res.status(403).json({ message: 'Use Check answer to solve this challenge.' });
  }
  return next();
}

// POST /api/challenges/:id/done: mark a challenge solved.
router.post('/:id/done', protect, manualModeOnly, async (req, res) => {
  try {
    if (!challengesById.has(req.params.id)) {
      return res.status(404).json({ message: 'Challenge not found.' });
    }
    const language = SUPPORTED_LANGUAGES.includes(req.body?.language) ? req.body.language : 'any';
    const progress = await ChallengeProgress.findOneAndUpdate(
      { user: req.user._id },
      { $setOnInsert: { user: req.user._id } },
      { new: true, upsert: true },
    );
    if (!progress.solved.some((s) => s.challengeId === req.params.id)) {
      progress.solved.push({ challengeId: req.params.id, language });
      await progress.save();
    }
    return res.json({ solved: progress.solved, xp: challengeXpTotal(progress) });
  } catch (error) {
    console.error('Challenge done error:', error);
    return res.status(500).json({ message: 'Could not save your progress.' });
  }
});

// DELETE /api/challenges/:id/done: unmark a challenge.
router.delete('/:id/done', protect, manualModeOnly, async (req, res) => {
  try {
    const progress = await ChallengeProgress.findOneAndUpdate(
      { user: req.user._id },
      { $pull: { solved: { challengeId: req.params.id } } },
      { new: true },
    );
    return res.json({ solved: progress?.solved || [], xp: challengeXpTotal(progress) });
  } catch (error) {
    console.error('Challenge undo error:', error);
    return res.status(500).json({ message: 'Could not save your progress.' });
  }
});

module.exports = router;

const express = require('express');
const DebugProgress = require('../models/DebugProgress');
const { protect } = require('../middleware/authMiddleware');
const { BUGS, BUG_CATEGORIES } = require('../data/debugBugs');
const {
  dateInIndia,
  shiftDate,
  nextUnlockAt,
  bugXp,
  liveStreak,
  debugXpTotal,
} = require('../utils/progress');
const { syncBadgesQuietly } = require('../utils/badges');

const router = express.Router();

const bugsById = new Map(BUGS.map((bug) => [bug.id, bug]));
const levelOf = (bugId) => bugsById.get(bugId)?.level;

function categoryLabel(id) {
  return BUG_CATEGORIES.find((c) => c.id === id)?.label || id;
}

// What a student sees before answering: no answer, explanation or meme.
function publicBug(bug) {
  return {
    id: bug.id,
    category: bug.category,
    categoryLabel: categoryLabel(bug.category),
    level: bug.level,
    code: bug.code,
    options: bug.options,
  };
}

// Full details, only for challenges the student has already submitted.
function revealedBug(bug, entry) {
  return {
    ...publicBug(bug),
    answer: bug.answer,
    explanation: bug.explanation,
    meme: bug.meme,
    picked: entry.picked,
    correct: entry.correct,
    date: entry.date,
    xp: entry.correct ? entry.xp ?? bugXp(bug.level, 0) : 0,
  };
}

function stats(progress, today) {
  const completed = progress.completed.filter((entry) => bugsById.has(entry.bugId));
  return {
    streak: liveStreak(progress, today),
    bestStreak: progress.bestStreak,
    completedCount: completed.length,
    correctCount: completed.filter((entry) => entry.correct).length,
    totalBugs: BUGS.length,
    xp: debugXpTotal(progress, levelOf),
    // Days the bug was fixed (these build the streak).
    activeDates: [...new Set(completed.filter((e) => e.correct).map((e) => e.date))],
  };
}

function history(progress) {
  return progress.completed
    .filter((entry) => bugsById.has(entry.bugId))
    .map((entry) => revealedBug(bugsById.get(entry.bugId), entry))
    .reverse();
}

async function getProgress(userId) {
  return DebugProgress.findOneAndUpdate(
    { user: userId },
    { $setOnInsert: { user: userId } },
    { new: true, upsert: true },
  );
}

// GET /api/debug/today: today's challenge (or today's result), stats and history.
router.get('/today', protect, async (req, res) => {
  try {
    const today = dateInIndia();
    const progress = await getProgress(req.user._id);
    const base = {
      today,
      nextUnlockAt: nextUnlockAt(today),
      stats: stats(progress, today),
      history: history(progress),
    };

    const doneToday = progress.completed.find(
      (entry) => entry.date === today && bugsById.has(entry.bugId),
    );
    if (doneToday) {
      return res.json({
        ...base,
        status: 'done',
        result: revealedBug(bugsById.get(doneToday.bugId), doneToday),
      });
    }

    // Keep today's assignment stable; otherwise pick a new unseen bug.
    let bug =
      progress.current?.date === today ? bugsById.get(progress.current.bugId) : null;

    if (!bug) {
      const completedIds = new Set(progress.completed.map((entry) => entry.bugId));
      const remaining = BUGS.filter((b) => !completedIds.has(b.id));

      if (!remaining.length) {
        return res.json({ ...base, status: 'all-done' });
      }

      bug = remaining[Math.floor(Math.random() * remaining.length)];
      progress.current = { bugId: bug.id, date: today };
      await progress.save();
    }

    return res.json({ ...base, status: 'open', challenge: publicBug(bug) });
  } catch (error) {
    console.error('Debug today error:', error);
    return res.status(500).json({ message: 'Could not load today\'s challenge.' });
  }
});

// POST /api/debug/submit { bugId, picked }: answer today's challenge once.
router.post('/submit', protect, async (req, res) => {
  try {
    const { bugId, picked } = req.body;
    const bug = bugsById.get(bugId);

    if (!bug || !Number.isInteger(picked) || picked < 0 || picked >= bug.options.length) {
      return res.status(400).json({ message: 'Invalid answer.' });
    }

    const today = dateInIndia();
    const progress = await getProgress(req.user._id);

    if (progress.current?.bugId !== bugId || progress.current?.date !== today) {
      return res.status(409).json({
        message: 'This is not your challenge for today. Refresh to load it.',
      });
    }

    // Only a correct fix extends the streak and earns XP (base XP for the
    // bug's level + a streak bonus). A wrong answer still uses up the day.
    const correct = picked === bug.answer;
    const continued = progress.lastCompletedDate === shiftDate(today, -1);
    const streak = correct ? (continued ? progress.streak + 1 : 1) : progress.streak;
    const entry = { bugId, picked, correct, date: today, xp: correct ? bugXp(bug.level, streak) : 0 };
    const streakUpdate = correct
      ? { streak, bestStreak: Math.max(progress.bestStreak, streak), lastCompletedDate: today }
      : {};

    // Only succeeds if today's challenge is still unanswered, so a double
    // submit can't count twice.
    const updated = await DebugProgress.findOneAndUpdate(
      { _id: progress._id, 'current.bugId': bugId, 'current.date': today },
      {
        $push: { completed: entry },
        $unset: { current: '' },
        $set: streakUpdate,
      },
      { new: true },
    );

    if (!updated) {
      return res.status(409).json({ message: 'You already answered today\'s challenge.' });
    }

    const newBadges = await syncBadgesQuietly(req.user._id);

    return res.json({
      status: 'done',
      today,
      nextUnlockAt: nextUnlockAt(today),
      result: revealedBug(bug, entry),
      stats: stats(updated, today),
      history: history(updated),
      newBadges,
    });
  } catch (error) {
    console.error('Debug submit error:', error);
    return res.status(500).json({ message: 'Could not submit your answer.' });
  }
});

module.exports = router;

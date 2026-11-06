const express = require('express');
const DebugProgress = require('../models/DebugProgress');
const { protect } = require('../middleware/authMiddleware');
const { BUGS, BUG_CATEGORIES } = require('../data/debugBugs');

const router = express.Router();

// The daily challenge rolls over at midnight India time.
const TIME_ZONE = 'Asia/Kolkata';
const UTC_OFFSET = '+05:30';

const bugsById = new Map(BUGS.map((bug) => [bug.id, bug]));

function dateInIndia(date = new Date()) {
  // en-CA formats as YYYY-MM-DD.
  return new Intl.DateTimeFormat('en-CA', { timeZone: TIME_ZONE }).format(date);
}

function shiftDate(dateString, days) {
  const date = new Date(`${dateString}T12:00:00${UTC_OFFSET}`);
  date.setUTCDate(date.getUTCDate() + days);
  return dateInIndia(date);
}

function nextUnlockAt(today) {
  return new Date(`${shiftDate(today, 1)}T00:00:00${UTC_OFFSET}`).toISOString();
}

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
  };
}

// A streak survives only if the last completion was today or yesterday.
function liveStreak(progress, today) {
  const last = progress.lastCompletedDate;
  if (last === today || last === shiftDate(today, -1)) return progress.streak;
  return 0;
}

function stats(progress, today) {
  const completed = progress.completed.filter((entry) => bugsById.has(entry.bugId));
  return {
    streak: liveStreak(progress, today),
    bestStreak: progress.bestStreak,
    completedCount: completed.length,
    correctCount: completed.filter((entry) => entry.correct).length,
    totalBugs: BUGS.length,
    activeDates: [...new Set(completed.map((entry) => entry.date))],
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

    const entry = { bugId, picked, correct: picked === bug.answer, date: today };
    const continued = progress.lastCompletedDate === shiftDate(today, -1);
    const streak = continued ? progress.streak + 1 : 1;

    // Only succeeds if today's challenge is still unanswered, so a double
    // submit can't count twice.
    const updated = await DebugProgress.findOneAndUpdate(
      { _id: progress._id, 'current.bugId': bugId, 'current.date': today },
      {
        $push: { completed: entry },
        $unset: { current: '' },
        $set: {
          streak,
          bestStreak: Math.max(progress.bestStreak, streak),
          lastCompletedDate: today,
        },
      },
      { new: true },
    );

    if (!updated) {
      return res.status(409).json({ message: 'You already answered today\'s challenge.' });
    }

    return res.json({
      status: 'done',
      today,
      nextUnlockAt: nextUnlockAt(today),
      result: revealedBug(bug, entry),
      stats: stats(updated, today),
      history: history(updated),
    });
  } catch (error) {
    console.error('Debug submit error:', error);
    return res.status(500).json({ message: 'Could not submit your answer.' });
  }
});

module.exports = router;

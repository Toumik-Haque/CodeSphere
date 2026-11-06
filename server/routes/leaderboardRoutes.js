const express = require('express');
const User = require('../models/User');
const DebugProgress = require('../models/DebugProgress');
const ChallengeProgress = require('../models/ChallengeProgress');
const { optionalAuth } = require('../middleware/authMiddleware');
const { BUGS } = require('../data/debugBugs');
const {
  dateInIndia,
  liveStreak,
  debugXpTotal,
  challengeXpTotal,
} = require('../utils/progress');

const router = express.Router();

const MAX_ROWS = 100;
const YEARS = ['1st Year', '2nd Year', '3rd Year', '4th Year'];

const bugLevels = new Map(BUGS.map((bug) => [bug.id, bug.level]));
const levelOf = (bugId) => bugLevels.get(bugId);

// Sort orders. The first value decides the rank; the rest break ties in
// display order only.
const SORTS = {
  xp: (a, b) => b.xp - a.xp || b.streak - a.streak || a.name.localeCompare(b.name),
  streak: (a, b) => b.streak - a.streak || b.bestStreak - a.bestStreak || b.xp - a.xp
    || a.name.localeCompare(b.name),
};

function initials(name) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join('');
}

// Guests see "Asha R."; signed-in students see full names.
function displayName(name, isGuest) {
  if (!isGuest) return name;
  const [first, ...rest] = name.split(/\s+/).filter(Boolean);
  const last = rest.pop();
  return last ? `${first} ${last[0].toUpperCase()}.` : first;
}

// GET /api/leaderboard?sort=xp|streak&year=1st%20Year
router.get('/', optionalAuth, async (req, res) => {
  try {
    const sort = SORTS[req.query.sort] ? req.query.sort : 'xp';
    const year = YEARS.includes(req.query.year) ? req.query.year : null;
    const isGuest = !req.user;
    const today = dateInIndia();

    const [users, debugDocs, challengeDocs] = await Promise.all([
      User.find({ role: 'user', ...(year ? { yearOfStudy: year } : {}) })
        .select('name yearOfStudy')
        .lean(),
      DebugProgress.find().select('user completed streak bestStreak lastCompletedDate').lean(),
      ChallengeProgress.find().select('user solved').lean(),
    ]);

    const debugByUser = new Map(debugDocs.map((doc) => [String(doc.user), doc]));
    const challengeByUser = new Map(challengeDocs.map((doc) => [String(doc.user), doc]));

    const rows = users
      .map((user) => {
        const id = String(user._id);
        const debug = debugByUser.get(id);
        const challenge = challengeByUser.get(id);
        const debugXp = debugXpTotal(debug, levelOf);
        const challengeXp = challengeXpTotal(challenge);

        return {
          id,
          name: user.name,
          year: user.yearOfStudy,
          xp: debugXp + challengeXp,
          debugXp,
          challengeXp,
          streak: liveStreak(debug, today),
          bestStreak: debug?.bestStreak || 0,
          bugsFixed: debug ? debug.completed.filter((e) => e.correct).length : 0,
          challengesSolved: challenge ? challenge.solved.length : 0,
        };
      })
      // Only students who have played appear on the board.
      .filter((row) => row.xp > 0 || row.bestStreak > 0)
      .sort(SORTS[sort]);

    // Competition ranking (1, 1, 3): ties on the main metric share a rank.
    let previous = null;
    rows.forEach((row, index) => {
      const value = row[sort];
      row.rank = previous && previous.value === value ? previous.rank : index + 1;
      previous = { value, rank: row.rank };
    });

    const publicRow = (row) => ({
      ...row,
      name: displayName(row.name, isGuest),
      initials: initials(row.name),
      id: undefined,
      isMe: Boolean(req.user && String(req.user._id) === row.id),
    });

    const meRow = req.user ? rows.find((row) => row.id === String(req.user._id)) : null;

    return res.json({
      sort,
      year,
      today,
      totalPlayers: rows.length,
      rows: rows.slice(0, MAX_ROWS).map(publicRow),
      me: meRow ? publicRow(meRow) : null,
      signedIn: !isGuest,
    });
  } catch (error) {
    console.error('Leaderboard error:', error);
    return res.status(500).json({ message: 'Could not load the leaderboard.' });
  }
});

module.exports = router;

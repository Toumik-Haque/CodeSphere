const express = require('express');
const User = require('../models/User');
const DebugProgress = require('../models/DebugProgress');
const ChallengeProgress = require('../models/ChallengeProgress');
const UserBadge = require('../models/UserBadge');
const { badgesById, levelFor } = require('../utils/badges');
const { reverseSummary, forumSummary } = require('../utils/activity');
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

// Competition ranking (1, 1, 3): rows sorted by `key`; ties on the main
// metric share a rank.
function assignRanks(sortedRows, key) {
  let previous = null;
  sortedRows.forEach((row, index) => {
    const value = row[key];
    const rank = previous && previous.value === value ? previous.rank : index + 1;
    row.ranks = { ...row.ranks, [key]: rank };
    previous = { value, rank };
  });
}

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

    const [users, debugDocs, challengeDocs, badgeDocs] = await Promise.all([
      User.find({ role: 'user', ...(year ? { yearOfStudy: year } : {}) })
        .select('name yearOfStudy collegeName createdAt badgeShowcase profileImage avatarUrl')
        .lean(),
      DebugProgress.find().select('user completed streak bestStreak lastCompletedDate').lean(),
      ChallengeProgress.find().select('user solved').lean(),
      UserBadge.find().select('user badgeId').lean(),
    ]);
    const [reverseByUser, forumByUser] = await Promise.all([reverseSummary(), forumSummary()]);

    // Earned badge ids per student (only badges that still exist).
    const badgesByUser = new Map();
    badgeDocs.forEach((doc) => {
      if (!badgesById.has(doc.badgeId)) return;
      const key = String(doc.user);
      badgesByUser.set(key, [...(badgesByUser.get(key) || []), doc.badgeId]);
    });

    const debugByUser = new Map(debugDocs.map((doc) => [String(doc.user), doc]));
    const challengeByUser = new Map(challengeDocs.map((doc) => [String(doc.user), doc]));

    const rows = users
      .map((user) => {
        const id = String(user._id);
        const debug = debugByUser.get(id);
        const challenge = challengeByUser.get(id);
        const debugXp = debugXpTotal(debug, levelOf);
        const challengeXp = challengeXpTotal(challenge);

        const answered = debug ? debug.completed.length : 0;
        const fixed = debug ? debug.completed.filter((e) => e.correct).length : 0;

        const badges = badgesByUser.get(id) || [];

        return {
          id,
          badges,
          badgeCount: badges.length,
          showcase: (user.badgeShowcase || []).filter((b) => badges.includes(b)),
          name: user.name,
          avatar: user.profileImage?.url || user.avatarUrl || '',
          year: user.yearOfStudy,
          college: user.collegeName,
          memberSince: user.createdAt,
          xp: debugXp + challengeXp + (reverseByUser.get(id)?.xp || 0),
          reverseXp: reverseByUser.get(id)?.xp || 0,
          reverseSolved: reverseByUser.get(id)?.solved || 0,
          acceptedAnswers: forumByUser.get(id)?.acceptedAnswers || 0,
          debugXp,
          challengeXp,
          streak: liveStreak(debug, today),
          bestStreak: debug?.bestStreak || 0,
          bugsFixed: fixed,
          bugsAnswered: answered,
          accuracy: answered ? Math.round((fixed / answered) * 100) : 0,
          challengesSolved: challenge ? challenge.solved.length : 0,
        };
      })
      .map((row) => {
        const level = levelFor(row.xp);
        return { ...row, level: { name: level.name, emoji: level.emoji } };
      })
      // Only students who have played appear on the board.
      .filter((row) => row.xp > 0 || row.bestStreak > 0);

    // Rank on both boards so profiles can show both; then order by `sort`.
    for (const key of Object.keys(SORTS)) {
      assignRanks(rows.sort(SORTS[key]), key);
    }
    rows.sort(SORTS[sort]);
    rows.forEach((row) => {
      row.rank = row.ranks[sort];
    });

    const publicRow = (row) => ({
      ...row,
      name: displayName(row.name, isGuest),
      initials: initials(row.name),
      id: undefined,
      isMe: Boolean(req.user && String(req.user._id) === row.id),
    });

    const meRow = req.user ? rows.find((row) => row.id === String(req.user._id)) : null;

    // Spotlight: the top student for each title (first in sort order wins ties).
    const top = (compare) => (rows.length ? [...rows].sort(compare)[0] : null);
    const champion = top(SORTS.xp);
    const streakLeader = top(SORTS.streak);
    const bestStreak = top((a, b) => b.bestStreak - a.bestStreak || SORTS.xp(a, b));
    const spotlight = {
      xp: champion?.xp ? publicRow(champion) : null,
      streak: streakLeader?.streak ? publicRow(streakLeader) : null,
      bestStreak: bestStreak?.bestStreak ? publicRow(bestStreak) : null,
    };

    return res.json({
      sort,
      year,
      today,
      totalPlayers: rows.length,
      rows: rows.slice(0, MAX_ROWS).map(publicRow),
      me: meRow ? publicRow(meRow) : null,
      spotlight,
      signedIn: !isGuest,
    });
  } catch (error) {
    console.error('Leaderboard error:', error);
    return res.status(500).json({ message: 'Could not load the leaderboard.' });
  }
});

module.exports = router;

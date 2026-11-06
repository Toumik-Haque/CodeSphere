// Shared rules for dates, streaks and XP (Debugging Arena, coding
// challenges and the leaderboard).

const { CHALLENGES } = require('../data/codingChallenges');

// The day rolls over at midnight India time.
const TIME_ZONE = 'Asia/Kolkata';
const UTC_OFFSET = '+05:30';

// XP for fixing the daily bug, by difficulty.
const BUG_XP = { Beginner: 10, Easy: 15, Medium: 20, Hard: 30 };
// Bonus per streak day for the daily bug, capped.
const STREAK_BONUS_PER_DAY = 2;
const STREAK_BONUS_CAP = 20;

const challengeXpById = new Map(CHALLENGES.map((c) => [c.id, c.xp]));

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

// XP for one correctly fixed daily bug, given the streak it brings you to.
function bugXp(level, streak) {
  const base = BUG_XP[level] || BUG_XP.Beginner;
  return base + Math.min(streak * STREAK_BONUS_PER_DAY, STREAK_BONUS_CAP);
}

// A streak survives only if the last fixed bug was today or yesterday.
function liveStreak(debugProgress, today = dateInIndia()) {
  if (!debugProgress) return 0;
  const last = debugProgress.lastCompletedDate;
  if (last === today || last === shiftDate(today, -1)) return debugProgress.streak || 0;
  return 0;
}

// Total XP earned in the Debugging Arena. Entries saved before XP existed
// get the base XP for their level.
function debugXpTotal(debugProgress, levelOf) {
  if (!debugProgress) return 0;
  return debugProgress.completed.reduce((sum, entry) => {
    if (!entry.correct) return sum;
    if (typeof entry.xp === 'number') return sum + entry.xp;
    return sum + (BUG_XP[levelOf(entry.bugId)] || 0);
  }, 0);
}

function challengeXpTotal(challengeProgress) {
  if (!challengeProgress) return 0;
  return challengeProgress.solved.reduce(
    (sum, entry) => sum + (challengeXpById.get(entry.challengeId) || 0),
    0,
  );
}

module.exports = {
  BUG_XP,
  dateInIndia,
  shiftDate,
  nextUnlockAt,
  bugXp,
  liveStreak,
  debugXpTotal,
  challengeXpTotal,
};

// Works out a student's stats, level and badges.
//
// buildStats() and evaluateBadges() are pure (easy to test); syncBadges()
// loads data from the database and saves any newly earned badges.

const mongoose = require('mongoose');
const User = require('../models/User');
const UserBadge = require('../models/UserBadge');
const DebugProgress = require('../models/DebugProgress');
const ChallengeProgress = require('../models/ChallengeProgress');
const Attendance = require('../models/Attendance');
const { BUGS } = require('../data/debugBugs');
const { BADGES, BADGE_GROUPS, LEVELS, MAX_SHOWCASE } = require('../data/badges');
const { debugXpTotal, challengeXpTotal } = require('./progress');
const { reverseSummary, forumSummary } = require('./activity');

const bugsById = new Map(BUGS.map((bug) => [bug.id, bug]));
const badgesById = new Map(BADGES.map((badge) => [badge.id, badge]));
const DAY_MS = 86400000;

const dayNumber = (date) => Math.round(new Date(`${date}T12:00:00+05:30`).getTime() / DAY_MS);
const weekday = (date) => new Date(`${date}T12:00:00+05:30`).getUTCDay(); // 0 Sun .. 6 Sat

function levelFor(xp) {
  let index = 0;
  LEVELS.forEach((level, i) => {
    if (xp >= level.minXp) index = i;
  });
  const current = LEVELS[index];
  const next = LEVELS[index + 1] || null;
  return {
    ...current,
    index,
    next,
    progress: next ? (xp - current.minXp) / (next.minXp - current.minXp) : 1,
  };
}

/**
 * debug: DebugProgress doc (or null), challenge: ChallengeProgress doc (or
 * null), attendance: [{ category }] for events attended, user: { profileComplete },
 * reverse: { xp, solved } (Reverse Coding), forum: { posts, acceptedAnswers }.
 */
function buildStats({ debug, challenge, attendance = [], user = {}, reverse = {}, forum = {} }) {
  const completed = debug?.completed || [];
  const fixed = completed.filter((e) => e.correct);
  const levelOf = (bugId) => bugsById.get(bugId)?.level;

  const fixedByCategory = {};
  fixed.forEach((e) => {
    const category = bugsById.get(e.bugId)?.category;
    if (category) fixedByCategory[category] = (fixedByCategory[category] || 0) + 1;
  });

  const fixDates = [...new Set(fixed.map((e) => e.date))].sort();

  // Comebacks: a fix after 3+ days with no fix.
  let comebacks = 0;
  for (let i = 1; i < fixDates.length; i += 1) {
    if (dayNumber(fixDates[i]) - dayNumber(fixDates[i - 1]) >= 4) comebacks += 1;
  }

  // Distinct weekends (keyed by the Saturday) with a fix.
  const weekends = new Set();
  fixDates.forEach((date) => {
    const day = weekday(date);
    if (day === 6) weekends.add(dayNumber(date));
    if (day === 0) weekends.add(dayNumber(date) - 1);
  });

  const answered = completed.length;
  const correctIn = (entries) => entries.filter((e) => e.correct).length;
  const improved = answered >= 20
    && correctIn(completed.slice(-10)) > correctIn(completed.slice(0, 10));
  const accuracy = answered ? Math.round((fixed.length / answered) * 100) : 0;

  const solved = challenge?.solved || [];
  const languages = new Set(solved.map((s) => s.language).filter((l) => l && l !== 'any'));

  const debugXp = debugXpTotal(debug, levelOf);
  const challengeXp = challengeXpTotal(challenge);

  const reverseXp = reverse.xp || 0;

  return {
    xp: debugXp + challengeXp + reverseXp,
    debugXp,
    challengeXp,
    reverseXp,
    reverseSolved: reverse.solved || 0,
    forumPosts: forum.posts || 0,
    acceptedAnswers: forum.acceptedAnswers || 0,
    bugsFixed: fixed.length,
    bugsAnswered: answered,
    accuracy,
    bestStreak: debug?.bestStreak || 0,
    fixDays: fixDates.length,
    comebacks,
    weekends: weekends.size,
    sharpshooter: answered >= 10 && accuracy >= 80 ? 1 : 0,
    improved: improved ? 1 : 0,
    challengesSolved: solved.length,
    challengeLanguages: languages.size,
    eventsAttended: attendance.length,
    workshops: attendance.filter((a) => a.category === 'Workshop').length,
    hackathons: attendance.filter((a) => a.category === 'Hackathon').length,
    meetups: attendance.filter((a) => a.category === 'Community Meetup').length,
    profileComplete: user.profileComplete ? 1 : 0,
    fixed_python: fixedByCategory.python || 0,
    fixed_javascript: fixedByCategory.javascript || 0,
    fixed_c: fixedByCategory.c || 0,
    fixed_logic: fixedByCategory.logic || 0,
    fixed_git: fixedByCategory.git || 0,
  };
}

// Badge ids the stats qualify for (auto and self-reported badges only).
function qualifiedBadgeIds(stats) {
  return BADGES
    .filter((b) => (b.type === 'auto' || b.type === 'self') && (stats[b.metric] || 0) >= b.target)
    .map((b) => b.id);
}

// Full badge list for display: earned info from saved UserBadges + progress.
function evaluateBadges(stats, savedBadges) {
  const saved = new Map(savedBadges.map((b) => [b.badgeId, b]));
  return BADGES.map((badge) => {
    const record = saved.get(badge.id);
    const hasTarget = typeof badge.target === 'number';
    const current = hasTarget ? Math.min(stats[badge.metric] || 0, badge.target) : 0;
    return {
      id: badge.id,
      group: badge.group,
      emoji: badge.emoji,
      name: badge.name,
      tier: badge.tier || null,
      type: badge.type,
      how: badge.how,
      earned: Boolean(record),
      earnedAt: record?.earnedAt || null,
      note: record?.note || null,
      progress: hasTarget ? { current: record ? badge.target : current, target: badge.target } : null,
    };
  });
}

async function loadStats(userId) {
  const id = new mongoose.Types.ObjectId(String(userId));
  const [debug, challenge, attendance, user, reverse, forum] = await Promise.all([
    DebugProgress.findOne({ user: id }).lean(),
    ChallengeProgress.findOne({ user: id }).lean(),
    Attendance.find({ user: id, status: 'present' }).populate('event', 'category').lean(),
    User.findById(id).select('profileComplete').lean(),
    reverseSummary([id]),
    forumSummary([id]),
  ]);
  return buildStats({
    debug,
    challenge,
    attendance: attendance.filter((a) => a.event).map((a) => ({ category: a.event.category })),
    user: user || {},
    reverse: reverse.get(String(id)) || {},
    forum: forum.get(String(id)) || {},
  });
}

/**
 * Recalculate a student's badges and save any newly earned ones.
 * Returns { stats, level, saved, newBadges } (newBadges: badge objects).
 */
async function syncBadges(userId) {
  const stats = await loadStats(userId);
  const existing = await UserBadge.find({ user: userId }).lean();
  const have = new Set(existing.map((b) => b.badgeId));
  const toAdd = qualifiedBadgeIds(stats).filter((id) => !have.has(id));

  if (toAdd.length) {
    // Unordered: if a parallel request saved one first, the rest still save.
    await UserBadge.insertMany(
      toAdd.map((badgeId) => ({ user: userId, badgeId })),
      { ordered: false },
    ).catch((error) => {
      if (error.code !== 11000 && !error.writeErrors) throw error;
    });
  }

  const saved = toAdd.length ? await UserBadge.find({ user: userId }).lean() : existing;
  return {
    stats,
    level: levelFor(stats.xp),
    saved,
    newBadges: toAdd.map((id) => publicBadge(badgesById.get(id))),
  };
}

// Safe wrapper for action routes: badge errors must never break the action.
async function syncBadgesQuietly(userId) {
  try {
    return (await syncBadges(userId)).newBadges;
  } catch (error) {
    console.error('Badge sync error:', error);
    return [];
  }
}

function publicBadge(badge) {
  return { id: badge.id, emoji: badge.emoji, name: badge.name, group: badge.group, tier: badge.tier || null, how: badge.how };
}

module.exports = {
  BADGES,
  BADGE_GROUPS,
  LEVELS,
  MAX_SHOWCASE,
  badgesById,
  levelFor,
  buildStats,
  qualifiedBadgeIds,
  evaluateBadges,
  syncBadges,
  syncBadgesQuietly,
  publicBadge,
};

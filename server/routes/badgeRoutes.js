const express = require('express');
const mongoose = require('mongoose');
const User = require('../models/User');
const UserBadge = require('../models/UserBadge');
const { protect, adminOnly } = require('../middleware/authMiddleware');
const {
  BADGES,
  BADGE_GROUPS,
  LEVELS,
  MAX_SHOWCASE,
  badgesById,
  badgeLeaderboard,
  evaluateBadges,
  syncBadges,
  publicBadge,
} = require('../utils/badges');

const router = express.Router();

const isValidId = (id) => mongoose.Types.ObjectId.isValid(id);

// GET /api/badges/catalog: every badge, group and level (public).
router.get('/catalog', (req, res) => {
  res.json({
    groups: BADGE_GROUPS,
    levels: LEVELS,
    badges: BADGES.map((badge) => ({ ...publicBadge(badge), type: badge.type })),
    maxShowcase: MAX_SHOWCASE,
  });
});

// GET /api/badges/username/:username: a member's earned badges and pinned
// showcase, for their public profile card.
router.get('/username/:username', protect, async (req, res) => {
  try {
    const username = String(req.params.username || '').toLowerCase().trim();
    const member = await User.findOne({ username, role: 'user' })
      .select('badgeShowcase')
      .lean();

    if (!member) {
      return res.status(404).json({ message: 'Member profile not found.' });
    }

    const saved = await UserBadge.find({ user: member._id }).lean();
    const badges = saved
      .filter((b) => badgesById.has(b.badgeId))
      .map((b) => ({
        ...publicBadge(badgesById.get(b.badgeId)),
        earned: true,
        earnedAt: b.earnedAt,
      }))
      .sort((a, b) => new Date(b.earnedAt) - new Date(a.earnedAt));

    const earnedIds = new Set(badges.map((b) => b.id));

    return res.json({
      badges,
      totalCount: BADGES.filter((b) => b.type !== 'coming-soon').length,
      showcase: (member.badgeShowcase || []).filter((id) => earnedIds.has(id)),
    });
  } catch (error) {
    console.error('Member badges error:', error);
    return res.status(500).json({ message: 'Could not load member badges.' });
  }
});

// GET /api/badges/leaderboard: top badge earners by XP, with the member's rank.
router.get('/leaderboard', protect, async (req, res) => {
  try {
    const result = await badgeLeaderboard(req.user._id, 10);
    return res.json(result);
  } catch (error) {
    console.error('Badges leaderboard error:', error);
    return res.status(500).json({ message: 'Could not load the badge leaderboard.' });
  }
});

// GET /api/badges/me: my stats, level, all badges with progress, showcase and
// badges I haven't seen yet. Also catches up on any badges I qualify for.
router.get('/me', protect, async (req, res) => {
  try {
    const { stats, level, saved } = await syncBadges(req.user._id);
    const badges = evaluateBadges(stats, saved);
    const unseen = saved
      .filter((b) => !b.seen && badgesById.has(b.badgeId))
      .map((b) => ({ ...publicBadge(badgesById.get(b.badgeId)), earnedAt: b.earnedAt }));
    const earnedIds = new Set(saved.map((b) => b.badgeId));

    res.json({
      stats,
      level,
      badges,
      earnedCount: badges.filter((b) => b.earned).length,
      totalCount: badges.filter((b) => b.type !== 'coming-soon').length,
      showcase: (req.user.badgeShowcase || []).filter((id) => earnedIds.has(id)),
      unseen,
    });
  } catch (error) {
    console.error('Badges me error:', error);
    res.status(500).json({ message: 'Could not load your badges.' });
  }
});

// POST /api/badges/me/seen: clear the "new badge" flags.
router.post('/me/seen', protect, async (req, res) => {
  try {
    await UserBadge.updateMany({ user: req.user._id, seen: false }, { $set: { seen: true } });
    res.json({ ok: true });
  } catch (error) {
    console.error('Badges seen error:', error);
    res.status(500).json({ message: 'Could not update your badges.' });
  }
});

// PUT /api/badges/me/showcase { badgeIds }: pin up to 3 earned badges.
router.put('/me/showcase', protect, async (req, res) => {
  try {
    const requested = Array.isArray(req.body.badgeIds) ? req.body.badgeIds : [];
    const earned = new Set(
      (await UserBadge.find({ user: req.user._id }).select('badgeId').lean()).map((b) => b.badgeId),
    );
    const showcase = [...new Set(requested)].filter((id) => earned.has(id)).slice(0, MAX_SHOWCASE);

    await User.updateOne({ _id: req.user._id }, { $set: { badgeShowcase: showcase } });
    res.json({ showcase });
  } catch (error) {
    console.error('Badges showcase error:', error);
    res.status(500).json({ message: 'Could not save your showcase.' });
  }
});

// POST /api/badges/me/profile-complete { complete }: completion is calculated
// from profile data stored on the user's database record.
router.post('/me/profile-complete', protect, async (req, res) => {
  try {
    await User.updateOne({ _id: req.user._id }, { $set: { profileComplete: Boolean(req.body.complete) } });
    const { newBadges } = await syncBadges(req.user._id);
    res.json({ newBadges });
  } catch (error) {
    console.error('Badges profile error:', error);
    res.status(500).json({ message: 'Could not update your profile status.' });
  }
});

// ---------- Admin: community badges ----------

// GET /api/badges/admin/user/:id: a student's earned badges.
router.get('/admin/user/:id', protect, adminOnly, async (req, res) => {
  if (!isValidId(req.params.id)) return res.status(400).json({ message: 'Invalid user.' });
  try {
    const saved = await UserBadge.find({ user: req.params.id }).lean();
    return res.json({
      badges: saved
        .filter((b) => badgesById.has(b.badgeId))
        .map((b) => ({ ...publicBadge(badgesById.get(b.badgeId)), type: badgesById.get(b.badgeId).type, earnedAt: b.earnedAt, note: b.note })),
    });
  } catch (error) {
    console.error('Badges admin list error:', error);
    return res.status(500).json({ message: 'Could not load badges.' });
  }
});

// POST /api/badges/admin/award { userId, badgeId, note }
router.post('/admin/award', protect, adminOnly, async (req, res) => {
  const { userId, badgeId, note } = req.body;
  const badge = badgesById.get(badgeId);
  if (!isValidId(userId)) return res.status(400).json({ message: 'Invalid user.' });
  if (!badge || badge.type !== 'admin') {
    return res.status(400).json({ message: 'Only community badges can be awarded by hand.' });
  }

  try {
    const student = await User.findById(userId).select('role');
    if (!student || student.role !== 'user') return res.status(404).json({ message: 'Student not found.' });

    await UserBadge.updateOne(
      { user: userId, badgeId },
      {
        $setOnInsert: { user: userId, badgeId, earnedAt: new Date(), seen: false },
        $set: { awardedBy: req.user._id, note: typeof note === 'string' ? note.trim().slice(0, 200) : '' },
      },
      { upsert: true },
    );
    return res.json({ ok: true });
  } catch (error) {
    console.error('Badges award error:', error);
    return res.status(500).json({ message: 'Could not award the badge.' });
  }
});

// DELETE /api/badges/admin/award { userId, badgeId }
router.delete('/admin/award', protect, adminOnly, async (req, res) => {
  const { userId, badgeId } = req.body;
  const badge = badgesById.get(badgeId);
  if (!isValidId(userId) || !badge || badge.type !== 'admin') {
    return res.status(400).json({ message: 'Only community badges can be removed by hand.' });
  }

  try {
    await UserBadge.deleteOne({ user: userId, badgeId });
    await User.updateOne({ _id: userId }, { $pull: { badgeShowcase: badgeId } });
    return res.json({ ok: true });
  } catch (error) {
    console.error('Badges remove error:', error);
    return res.status(500).json({ message: 'Could not remove the badge.' });
  }
});

module.exports = router;

const express = require('express');
const mongoose = require('mongoose');
const Notification = require('../models/Notification');
const User = require('../models/User');
const { protect } = require('../middleware/authMiddleware');
const { MUTABLE_TYPES } = require('../utils/notify');

const router = express.Router();

// GET /api/notifications?limit=20: latest notifications + unread count.
router.get('/', protect, async (req, res) => {
  try {
    const limit = Math.min(Number(req.query.limit) || 20, 50);
    const [items, unread] = await Promise.all([
      Notification.find({ user: req.user._id }).sort({ createdAt: -1 }).limit(limit).lean(),
      Notification.countDocuments({ user: req.user._id, read: false }),
    ]);
    res.json({
      items,
      unread,
      muted: req.user.mutedNotifications || [],
      mutable: MUTABLE_TYPES,
      updateEmailsOptOut: Boolean(req.user.updateEmailsOptOut),
    });
  } catch (error) {
    console.error('Notifications error:', error);
    res.status(500).json({ message: 'Could not load notifications.' });
  }
});

// POST /api/notifications/read { ids?: [] }: mark some (or all) as read.
router.post('/read', protect, async (req, res) => {
  try {
    const filter = { user: req.user._id, read: false };
    if (Array.isArray(req.body.ids)) {
      filter._id = { $in: req.body.ids.filter((id) => mongoose.Types.ObjectId.isValid(id)) };
    }
    await Notification.updateMany(filter, { $set: { read: true } });
    res.json({ ok: true });
  } catch (error) {
    console.error('Notifications read error:', error);
    res.status(500).json({ message: 'Could not update notifications.' });
  }
});

// PUT /api/notifications/preferences { muted?: [], updateEmailsOptOut?: boolean }.
router.put('/preferences', protect, async (req, res) => {
  try {
    const set = {};
    if (Array.isArray(req.body.muted)) {
      set.mutedNotifications = req.body.muted.filter((t) => MUTABLE_TYPES.includes(t));
    }
    if (typeof req.body.updateEmailsOptOut === 'boolean') {
      set.updateEmailsOptOut = req.body.updateEmailsOptOut;
    }
    await User.updateOne({ _id: req.user._id }, { $set: set });
    res.json({
      muted: set.mutedNotifications || req.user.mutedNotifications || [],
      updateEmailsOptOut: set.updateEmailsOptOut ?? Boolean(req.user.updateEmailsOptOut),
    });
  } catch (error) {
    console.error('Notifications prefs error:', error);
    res.status(500).json({ message: 'Could not save your preferences.' });
  }
});

module.exports = router;

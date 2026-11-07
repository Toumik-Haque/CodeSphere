const express = require('express');
const mongoose = require('mongoose');
const { protect } = require('../middleware/authMiddleware');
const { ForumThread } = require('../models/Forum');
const realtime = require('../utils/realtime');

const router = express.Router();

// POST /api/realtime/ticket: a one-time, 60-second ticket for my stream.
router.post('/ticket', protect, (req, res) => {
  res.json({ ticket: realtime.createTicket(req.user._id) });
});

// GET /api/realtime/me?ticket=: my private stream (notification events).
router.get('/me', (req, res) => {
  const userId = realtime.redeemTicket(String(req.query.ticket || ''));
  if (!userId) return res.status(401).json({ message: 'Invalid or expired ticket.' });
  return realtime.openUserStream(req, res, userId);
});

// GET /api/realtime/threads/:id: public stream for a visible forum thread
// (new-reply events carry only ids, never post content).
router.get('/threads/:id', async (req, res) => {
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) return res.status(404).end();
  const exists = await ForumThread.exists({ _id: req.params.id, status: 'visible' });
  if (!exists) return res.status(404).end();
  return realtime.openThreadStream(req, res, req.params.id);
});

module.exports = router;

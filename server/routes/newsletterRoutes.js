const express = require('express');
const mongoose = require('mongoose');
const User = require('../models/User');
const { protect } = require('../middleware/authMiddleware');
const { verifyUnsubscribe } = require('../utils/newsletter');

const router = express.Router();

// GET /api/newsletter/me: am I subscribed to the Tech Brief email?
router.get('/me', protect, (req, res) => {
  res.json({ subscribed: Boolean(req.user.newsletterOptIn) });
});

// PUT /api/newsletter/me { subscribed }: opt in or out.
router.put('/me', protect, async (req, res) => {
  try {
    const subscribed = Boolean(req.body.subscribed);
    await User.updateOne({ _id: req.user._id }, { $set: { newsletterOptIn: subscribed } });
    res.json({ subscribed });
  } catch (error) {
    console.error('Newsletter pref error:', error);
    res.status(500).json({ message: 'Could not update your subscription.' });
  }
});

// GET /api/newsletter/unsubscribe?u=&t=: one-click link from the email.
router.get('/unsubscribe', async (req, res) => {
  const page = (title, text) => `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title}</title></head>
    <body style="font-family:Arial,sans-serif;background:#f4f8fc;display:grid;place-items:center;min-height:100vh;margin:0">
    <div style="background:#fff;padding:32px;border-radius:16px;max-width:420px;text-align:center">
    <h1 style="color:#10243a;font-size:22px">${title}</h1><p style="color:#617287">${text}</p></div></body></html>`;

  const { u: userId, t: token } = req.query;
  if (!mongoose.Types.ObjectId.isValid(userId) || !verifyUnsubscribe(String(userId), token)) {
    return res.status(400).send(page('Link not valid', 'This unsubscribe link is invalid. You can turn the email off on the Tech News page instead.'));
  }
  try {
    await User.updateOne({ _id: userId }, { $set: { newsletterOptIn: false } });
    return res.send(page('You\'re unsubscribed', 'You won\'t get the CodeSphere Tech Brief by email any more. You can subscribe again on the Tech News page.'));
  } catch (error) {
    console.error('Unsubscribe error:', error);
    return res.status(500).send(page('Something went wrong', 'Please try again later.'));
  }
});

module.exports = router;

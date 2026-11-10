const express = require('express');
const mongoose = require('mongoose');
const User = require('../models/User');
const { protect } = require('../middleware/authMiddleware');
const { verifyUnsubscribe } = require('../utils/newsletter');

const router = express.Router();

// GET /api/newsletter/me: email preferences for the signed-in user.
router.get('/me', protect, (req, res) => {
  res.json({
    subscribed: Boolean(req.user.newsletterOptIn),
    daily: Boolean(req.user.dailyNewsOptIn),
    updates: !req.user.updateEmailsOptOut,
  });
});

// PUT /api/newsletter/me { subscribed, daily, updates }: opt in or out.
router.put('/me', protect, async (req, res) => {
  try {
    // { subscribed } = weekly Tech Brief, { daily } = daily "Today in Tech",
    // { updates } = community update emails (stored as the inverse opt-out).
    const set = {};
    if ('subscribed' in req.body) set.newsletterOptIn = Boolean(req.body.subscribed);
    if ('daily' in req.body) set.dailyNewsOptIn = Boolean(req.body.daily);
    if ('updates' in req.body) set.updateEmailsOptOut = !Boolean(req.body.updates);
    const user = await User.findByIdAndUpdate(req.user._id, { $set: set }, { new: true })
      .select('newsletterOptIn dailyNewsOptIn updateEmailsOptOut');
    res.json({
      subscribed: user.newsletterOptIn,
      daily: user.dailyNewsOptIn,
      updates: !user.updateEmailsOptOut,
    });
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
    return res.status(400).send(page('Link not valid', 'This unsubscribe link is invalid. You can manage email preferences from your CodeSphere profile instead.'));
  }
  try {
    if (req.query.list === 'daily') {
      await User.updateOne({ _id: userId }, { $set: { dailyNewsOptIn: false } });
      return res.send(page('Daily emails stopped', 'You won\'t get Today in Tech by email any more. You can turn it back on in your profile email preferences.'));
    }
    if (req.query.list === 'updates') {
      await User.updateOne({ _id: userId }, { $set: { updateEmailsOptOut: true } });
      return res.send(page('Update emails stopped', 'You won\'t receive CodeSphere update emails any more. You can turn them back on in your profile email preferences.'));
    }
    await User.updateOne({ _id: userId }, { $set: { newsletterOptIn: false } });
    return res.send(page('You\'re unsubscribed', 'You won\'t get the CodeSphere Tech Brief by email any more. You can subscribe again in your profile email preferences.'));
  } catch (error) {
    console.error('Unsubscribe error:', error);
    return res.status(500).send(page('Something went wrong', 'Please try again later.'));
  }
});

module.exports = router;

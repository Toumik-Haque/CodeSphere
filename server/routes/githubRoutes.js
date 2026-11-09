// Connect a GitHub account (OAuth) to verify project ownership.
//
// Optional: enabled only when GITHUB_OAUTH_CLIENT_ID and
// GITHUB_OAUTH_CLIENT_SECRET are set. No scopes are requested (public
// profile only) and the access token is used once and never stored.
// Callback URL to register on GitHub: {API_PUBLIC_URL}/github/callback

const express = require('express');
const crypto = require('crypto');
const User = require('../models/User');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();
const STATE_TTL_MS = 10 * 60 * 1000;

const enabled = () => Boolean(process.env.GITHUB_OAUTH_CLIENT_ID && process.env.GITHUB_OAUTH_CLIENT_SECRET);
const apiUrl = () => (process.env.API_PUBLIC_URL || `http://localhost:${process.env.PORT || 5000}/api`).replace(/\/+$/, '');
const clientUrl = () => (process.env.CLIENT_URL || 'http://localhost:5173').replace(/\/+$/, '');
const secret = () => process.env.JWT_SECRET || 'codesphere';

// state = userId.expiry.signature (stops another site completing a link for you)
function signState(userId) {
  const payload = `${userId}.${Date.now() + STATE_TTL_MS}.${crypto.randomBytes(8).toString('hex')}`;
  const sig = crypto.createHmac('sha256', secret()).update(`gh-state:${payload}`).digest('hex').slice(0, 32);
  return `${payload}.${sig}`;
}

function readState(state) {
  const parts = String(state || '').split('.');
  if (parts.length !== 4) return null;
  const [userId, expiry, nonce, sig] = parts;
  const expected = crypto.createHmac('sha256', secret()).update(`gh-state:${userId}.${expiry}.${nonce}`).digest('hex').slice(0, 32);
  if (sig.length !== expected.length || !crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null;
  if (Number(expiry) < Date.now()) return null;
  return userId;
}

const back = (res, outcome) => res.redirect(`${clientUrl()}/projects?tab=mine&github=${encodeURIComponent(outcome)}`);

router.get('/status', protect, (req, res) => {
  res.json({ enabled: enabled(), connected: Boolean(req.user.githubConnection?.login), login: req.user.githubConnection?.login || '' });
});

// POST /api/github/connect → { url } to send the browser to
router.post('/connect', protect, (req, res) => {
  if (!enabled()) return res.status(503).json({ message: 'GitHub connection is not set up on this server yet.' });
  const params = new URLSearchParams({
    client_id: process.env.GITHUB_OAUTH_CLIENT_ID,
    redirect_uri: `${apiUrl()}/github/callback`,
    state: signState(String(req.user._id)),
    allow_signup: 'false',
    scope: '', // public profile only
  });
  res.json({ url: `https://github.com/login/oauth/authorize?${params}` });
});

router.get('/callback', async (req, res) => {
  if (!enabled()) return back(res, 'disabled');
  const userId = readState(req.query.state);
  if (!userId || typeof req.query.code !== 'string') return back(res, 'invalid');
  try {
    const tokenRes = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id: process.env.GITHUB_OAUTH_CLIENT_ID,
        client_secret: process.env.GITHUB_OAUTH_CLIENT_SECRET,
        code: req.query.code,
        redirect_uri: `${apiUrl()}/github/callback`,
      }),
      signal: AbortSignal.timeout(10000),
    });
    const { access_token: token } = await tokenRes.json();
    if (!token) return back(res, 'denied');
    const meRes = await fetch('https://api.github.com/user', {
      headers: { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json', 'User-Agent': 'CodeSphere-Project-Hub' },
      signal: AbortSignal.timeout(10000),
    });
    const me = await meRes.json();
    if (!me?.id || !me?.login) return back(res, 'failed');
    // One GitHub account per CodeSphere account.
    const taken = await User.exists({ 'githubConnection.id': me.id, _id: { $ne: userId } });
    if (taken) return back(res, 'in-use');
    await User.updateOne({ _id: userId }, { $set: { githubConnection: { id: me.id, login: me.login, connectedAt: new Date() } } });
    return back(res, 'connected'); // the token is dropped here, never stored
  } catch (error) {
    console.error('GitHub OAuth error:', error.message);
    return back(res, 'failed');
  }
});

router.delete('/connection', protect, async (req, res) => {
  await User.updateOne(
    { _id: req.user._id },
    { $set: { githubConnection: { id: null, login: '', connectedAt: null } } },
  );
  res.json({ connected: false });
});

module.exports = router;
module.exports.readState = readState;
module.exports.signState = signState;

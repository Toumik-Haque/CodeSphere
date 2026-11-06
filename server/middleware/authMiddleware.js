const jwt = require('jsonwebtoken');
const User = require('../models/User');

async function protect(req, res, next) {
  try {
    const authorization = req.headers.authorization || '';
    const [scheme, token] = authorization.split(' ');

    if (scheme !== 'Bearer' || !token) {
      return res.status(401).json({ message: 'Authentication required.' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id);

    if (!user) {
      return res.status(401).json({ message: 'Account not found.' });
    }

    req.user = user;
    next();
  } catch {
    return res.status(401).json({
      message: 'Invalid or expired authentication token.',
    });
  }
}

function adminOnly(req, res, next) {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({
      message: 'Administrator access required.',
    });
  }

  next();
}

// Like protect, but lets guests through: sets req.user only if a valid
// token is sent.
async function optionalAuth(req, res, next) {
  const [scheme, token] = (req.headers.authorization || '').split(' ');
  if (scheme !== 'Bearer' || !token) return next();

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = await User.findById(decoded.id);
  } catch {
    // Invalid or expired token: continue as a guest.
  }
  return next();
}

module.exports = { protect, adminOnly, optionalAuth };
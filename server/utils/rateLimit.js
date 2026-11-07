// Simple in-memory, per-user rate limiter for write actions.
// (Per server process; good enough for a single instance.)

/**
 * createLimiter({ windowMs, max, message }) returns Express middleware that
 * allows at most `max` requests per user per `windowMs`. Use after `protect`.
 */
function createLimiter({ windowMs, max, message }) {
  const hits = new Map();

  return function rateLimit(req, res, next) {
    const key = String(req.user?._id || req.ip);
    const now = Date.now();
    const recent = (hits.get(key) || []).filter((t) => now - t < windowMs);

    if (recent.length >= max) {
      hits.set(key, recent);
      const retryIn = Math.ceil((windowMs - (now - recent[0])) / 60000);
      return res.status(429).json({
        message: message || `You're doing that too often. Try again in ${retryIn} minute${retryIn === 1 ? '' : 's'}.`,
      });
    }

    recent.push(now);
    hits.set(key, recent);
    return next();
  };
}

module.exports = { createLimiter };

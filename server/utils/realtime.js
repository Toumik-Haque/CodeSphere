// Lightweight realtime updates with Server-Sent Events (SSE).
//
// - Per-user streams: new notifications are pushed instantly.
// - Per-thread streams: readers of a forum thread hear about new replies.
//
// Browsers' EventSource can't send an Authorization header, so private
// streams use a one-time ticket (60 seconds) instead of the login token.
// In-memory and per-process, which suits a single server instance.

const crypto = require('crypto');

const TICKET_TTL_MS = 60 * 1000;
const HEARTBEAT_MS = 25 * 1000;
const MAX_STREAMS_PER_USER = 5;

const tickets = new Map(); // ticket -> { userId, expires }
const userStreams = new Map(); // userId -> Set(res)
const threadStreams = new Map(); // threadId -> Set(res)

function createTicket(userId) {
  const now = Date.now();
  for (const [key, value] of tickets) if (value.expires < now) tickets.delete(key);
  const ticket = crypto.randomBytes(24).toString('hex');
  tickets.set(ticket, { userId: String(userId), expires: now + TICKET_TTL_MS });
  return ticket;
}

// Single use: a ticket works once and is then deleted.
function redeemTicket(ticket) {
  const entry = tickets.get(ticket);
  tickets.delete(ticket);
  if (!entry || entry.expires < Date.now()) return null;
  return entry.userId;
}

function openStream(req, res, registry, key) {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache, no-transform',
    Connection: 'keep-alive',
    'X-Accel-Buffering': 'no',
  });
  res.write('retry: 5000\n\n');

  if (!registry.has(key)) registry.set(key, new Set());
  const set = registry.get(key);

  // Cap per-user streams (e.g. many tabs): close the oldest.
  if (registry === userStreams && set.size >= MAX_STREAMS_PER_USER) {
    const oldest = set.values().next().value;
    oldest.end();
    set.delete(oldest);
  }
  set.add(res);

  const heartbeat = setInterval(() => res.write(': ping\n\n'), HEARTBEAT_MS);
  req.on('close', () => {
    clearInterval(heartbeat);
    set.delete(res);
    if (!set.size) registry.delete(key);
  });
}

function send(set, event, data) {
  if (!set) return;
  const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  set.forEach((res) => res.write(payload));
}

const pushToUser = (userId, event, data) => send(userStreams.get(String(userId)), event, data);
const pushToThread = (threadId, event, data) => send(threadStreams.get(String(threadId)), event, data);

module.exports = {
  createTicket,
  redeemTicket,
  openUserStream: (req, res, userId) => openStream(req, res, userStreams, String(userId)),
  openThreadStream: (req, res, threadId) => openStream(req, res, threadStreams, String(threadId)),
  pushToUser,
  pushToThread,
};

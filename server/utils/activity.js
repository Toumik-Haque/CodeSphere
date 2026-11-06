// Per-student totals from Reverse Coding and the Forum, used by badges and
// the leaderboard. Pass userIds to limit to some students (or omit for all).

const mongoose = require('mongoose');
const { ReverseAttempt } = require('../models/Reverse');
const { ForumThread, ForumReply } = require('../models/Forum');

const toIds = (userIds) => (userIds ? userIds.map((id) => new mongoose.Types.ObjectId(String(id))) : null);

/** Map userId → { xp, solved }: best score per challenge, summed. */
async function reverseSummary(userIds) {
  const ids = toIds(userIds);
  const rows = await ReverseAttempt.aggregate([
    { $match: { kind: 'submit', ...(ids ? { user: { $in: ids } } : {}) } },
    {
      $group: {
        _id: { user: '$user', challenge: '$challenge' },
        best: { $max: '$score' },
        solved: { $max: { $cond: [{ $eq: ['$verdict', 'accepted'] }, 1, 0] } },
      },
    },
    { $group: { _id: '$_id.user', xp: { $sum: '$best' }, solved: { $sum: '$solved' } } },
  ]);
  return new Map(rows.map((r) => [String(r._id), { xp: r.xp, solved: r.solved }]));
}

/**
 * Map userId → { posts, acceptedAnswers }. An accepted answer counts only
 * when someone else accepted it on their own question (no self-accepts).
 */
async function forumSummary(userIds) {
  const ids = toIds(userIds);
  const byAuthor = ids ? { author: { $in: ids } } : {};
  const [threads, replies, accepted] = await Promise.all([
    ForumThread.aggregate([{ $match: { status: 'visible', ...byAuthor } }, { $group: { _id: '$author', n: { $sum: 1 } } }]),
    ForumReply.aggregate([{ $match: { status: 'visible', ...byAuthor } }, { $group: { _id: '$author', n: { $sum: 1 } } }]),
    ForumThread.aggregate([
      { $match: { status: 'visible', acceptedReply: { $ne: null } } },
      { $lookup: { from: ForumReply.collection.name, localField: 'acceptedReply', foreignField: '_id', as: 'reply' } },
      { $unwind: '$reply' },
      { $match: { 'reply.status': 'visible', $expr: { $ne: ['$reply.author', '$author'] }, ...(ids ? { 'reply.author': { $in: ids } } : {}) } },
      { $group: { _id: '$reply.author', n: { $sum: 1 } } },
    ]),
  ]);

  const map = new Map();
  const add = (rows, key) => rows.forEach((r) => {
    const id = String(r._id);
    map.set(id, { posts: 0, acceptedAnswers: 0, ...map.get(id), [key]: (map.get(id)?.[key] || 0) + r.n });
  });
  add(threads, 'posts');
  add(replies, 'posts');
  add(accepted, 'acceptedAnswers');
  return map;
}

module.exports = { reverseSummary, forumSummary };

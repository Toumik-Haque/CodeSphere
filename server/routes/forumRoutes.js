const express = require('express');
const mongoose = require('mongoose');
const User = require('../models/User');
const {
  ForumThread,
  ForumReply,
  ForumReaction,
  ForumBookmark,
  ForumFollow,
  ForumReport,
  ForumModeration,
} = require('../models/Forum');
const { protect, optionalAuth, requireStaff, hasStaffRole } = require('../middleware/authMiddleware');
const { createLimiter } = require('../utils/rateLimit');
const { notify } = require('../utils/notify');
const { syncBadgesQuietly } = require('../utils/badges');
const {
  FORUM_CATEGORIES,
  POST_TYPES,
  REACTION_TYPES,
  REPORT_REASONS,
  LIMITS,
  GUIDELINES,
} = require('../data/forum');

const router = express.Router();

const PAGE_SIZE = 15;
const TRENDING_DAYS = 14;
const categoryIds = new Set(FORUM_CATEGORIES.map((c) => c.id));
const postTypeIds = new Set(POST_TYPES.map((t) => t.id));
const reasonIds = new Set(REPORT_REASONS.map((r) => r.id));

const limitThreads = createLimiter({ windowMs: 15 * 60 * 1000, max: 5, message: 'You can start up to 5 discussions every 15 minutes.' });
const limitReplies = createLimiter({ windowMs: 10 * 60 * 1000, max: 20, message: 'You\'re replying very fast. Take a short break and try again.' });
const limitReactions = createLimiter({ windowMs: 60 * 1000, max: 60 });
const limitReports = createLimiter({ windowMs: 60 * 60 * 1000, max: 10, message: 'You can send up to 10 reports an hour.' });

// ---------- helpers ----------

const isId = (id) => mongoose.Types.ObjectId.isValid(id);
// Admins and forum moderators.
const isStaff = (user) => hasStaffRole(user, 'moderator');
const sameUser = (a, b) => Boolean(a && b) && String(a._id || a) === String(b._id || b);

// Plain text only: drop control characters, normalise newlines, trim.
function cleanText(value) {
  if (typeof value !== 'string') return '';
  return value
    .replace(/\r\n?/g, '\n')
    // eslint-disable-next-line no-control-regex
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '')
    .replace(/\n{4,}/g, '\n\n\n')
    .trim();
}

function cleanTags(tags) {
  if (!Array.isArray(tags)) return [];
  const out = tags
    .map((t) => String(t).toLowerCase().trim().replace(/^#/, '').replace(/[^a-z0-9+#.-]+/g, '-').replace(/^-+|-+$/g, ''))
    .filter((t) => t && t.length <= LIMITS.tagMax);
  return [...new Set(out)].slice(0, LIMITS.maxTags);
}

const countLinks = (text) => (text.match(/https?:\/\//gi) || []).length;

function publicAuthor(user) {
  if (!user) return { name: 'Deleted user', initials: '?', year: '', isStaff: false };
  const name = user.name || 'Student';
  return {
    id: String(user._id),
    name,
    initials: name.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0].toUpperCase()).join(''),
    year: user.role === 'admin' ? '' : user.yearOfStudy || '',
    isStaff: user.role === 'admin' || Boolean(user.staffRoles?.includes('moderator')),
  };
}

function preview(body) {
  const text = body.replace(/```[\s\S]*?```/g, ' [code] ').replace(/\s+/g, ' ').trim();
  return text.length > 220 ? `${text.slice(0, 217)}…` : text;
}

const totalReactions = (r = {}) => (r.like || 0) + (r.helpful || 0) + (r.celebrate || 0);

function withinEditWindow(doc) {
  return Date.now() - new Date(doc.createdAt).getTime() < LIMITS.editWindowMs;
}

function threadCard(thread) {
  return {
    id: String(thread._id),
    title: thread.title,
    preview: preview(thread.body),
    category: thread.category,
    postType: thread.postType,
    tags: thread.tags,
    author: publicAuthor(thread.author),
    createdAt: thread.createdAt,
    lastActivityAt: thread.lastActivityAt,
    replyCount: thread.replyCount,
    viewCount: thread.viewCount,
    reactionCount: totalReactions(thread.reactions),
    pinned: thread.pinned,
    locked: thread.locked,
    answered: Boolean(thread.acceptedReply),
    status: thread.status,
  };
}

async function recountReplies(threadId) {
  const count = await ForumReply.countDocuments({ thread: threadId, status: 'visible' });
  await ForumThread.updateOne({ _id: threadId }, { $set: { replyCount: count } });
  return count;
}

function forumMuted(user) {
  return user.forumMutedUntil && new Date(user.forumMutedUntil) > new Date();
}

function mutedMessage(user) {
  return `Your forum posting is paused until ${new Date(user.forumMutedUntil).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}. Contact the CodeSphere team if you think this is a mistake.`;
}

// Validates title/body/category/type/tags; returns { errors, value }.
function validateThread(input, user, { partial = false } = {}) {
  const errors = [];
  const value = {};

  if (!partial || input.title !== undefined) {
    value.title = cleanText(input.title).replace(/\s+/g, ' ');
    if (value.title.length < LIMITS.titleMin || value.title.length > LIMITS.titleMax) {
      errors.push(`Title must be ${LIMITS.titleMin}–${LIMITS.titleMax} characters.`);
    }
  }
  if (!partial || input.body !== undefined) {
    value.body = cleanText(input.body);
    if (value.body.length < LIMITS.bodyMin || value.body.length > LIMITS.threadBodyMax) {
      errors.push(`Post must be ${LIMITS.bodyMin}–${LIMITS.threadBodyMax} characters.`);
    }
  }
  if (!partial || input.tags !== undefined) value.tags = cleanTags(input.tags);

  if (!partial) {
    value.category = input.category;
    value.postType = input.postType;
    const category = FORUM_CATEGORIES.find((c) => c.id === value.category);
    const type = POST_TYPES.find((t) => t.id === value.postType);
    if (!category) errors.push('Choose a category.');
    if (!type) errors.push('Choose a post type.');
    if ((category?.staffOnly || type?.staffOnly) && !isStaff(user)) {
      errors.push('Only the CodeSphere team can post announcements.');
    }
  }

  if (value.body && Date.now() - new Date(user.createdAt).getTime() < LIMITS.newAccountMs
    && countLinks(value.body) > LIMITS.newAccountMaxLinks) {
    errors.push(`New accounts can include up to ${LIMITS.newAccountMaxLinks} links per post for their first day.`);
  }

  return { errors, value };
}

async function logAction(moderator, targetType, target, action, reason = '', meta = {}) {
  await ForumModeration.create({ moderator: moderator._id, targetType, target, action, reason, meta });
}

// ---------- public config ----------

router.get('/config', (req, res) => {
  res.json({
    categories: FORUM_CATEGORIES,
    postTypes: POST_TYPES,
    reactionTypes: REACTION_TYPES,
    reportReasons: REPORT_REASONS,
    guidelines: GUIDELINES,
    limits: {
      titleMin: LIMITS.titleMin,
      titleMax: LIMITS.titleMax,
      bodyMin: LIMITS.bodyMin,
      threadBodyMax: LIMITS.threadBodyMax,
      replyBodyMax: LIMITS.replyBodyMax,
      maxTags: LIMITS.maxTags,
      editWindowMinutes: LIMITS.editWindowMs / 60000,
    },
  });
});

// ---------- threads ----------

// GET /api/forum/threads?tab=latest|trending|unanswered|following|saved
//   &category&type&tag&q&page
router.get('/threads', optionalAuth, async (req, res) => {
  try {
    const tab = ['latest', 'trending', 'unanswered', 'following', 'saved'].includes(req.query.tab) ? req.query.tab : 'latest';
    const page = Math.max(1, Number.parseInt(req.query.page, 10) || 1);
    const filter = { status: 'visible' };

    if (categoryIds.has(req.query.category)) filter.category = req.query.category;
    if (postTypeIds.has(req.query.type)) filter.postType = req.query.type;
    if (typeof req.query.tag === 'string' && req.query.tag) filter.tags = cleanTags([req.query.tag])[0];

    const q = cleanText(req.query.q || '').slice(0, 100);
    if (q) filter.$text = { $search: q };

    if (tab === 'following' || tab === 'saved') {
      if (!req.user) return res.status(401).json({ message: 'Sign in to see your followed and saved discussions.' });
      const Model = tab === 'following' ? ForumFollow : ForumBookmark;
      const ids = (await Model.find({ user: req.user._id }).select('thread').lean()).map((d) => d.thread);
      filter._id = { $in: ids };
    }
    if (tab === 'unanswered') filter.replyCount = 0;
    if (tab === 'trending') filter.lastActivityAt = { $gte: new Date(Date.now() - TRENDING_DAYS * 86400000) };

    const sort = q ? { score: { $meta: 'textScore' } }
      : tab === 'unanswered' ? { createdAt: -1 }
        : { pinned: -1, lastActivityAt: -1 };

    let threads;
    let total;
    if (tab === 'trending') {
      // Score recent threads by replies, reactions and views.
      const recent = await ForumThread.find(filter).sort({ lastActivityAt: -1 }).limit(300)
        .populate('author', 'name yearOfStudy role staffRoles').lean();
      recent.sort((a, b) => trendScore(b) - trendScore(a));
      total = recent.length;
      threads = recent.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
    } else {
      const query = ForumThread.find(filter, q ? { score: { $meta: 'textScore' } } : {});
      [threads, total] = await Promise.all([
        query.sort(sort).skip((page - 1) * PAGE_SIZE).limit(PAGE_SIZE).populate('author', 'name yearOfStudy role staffRoles').lean(),
        ForumThread.countDocuments(filter),
      ]);
    }

    res.json({
      threads: threads.map(threadCard),
      page,
      pages: Math.max(1, Math.ceil(total / PAGE_SIZE)),
      total,
    });
  } catch (error) {
    console.error('Forum list error:', error);
    res.status(500).json({ message: 'Could not load discussions.' });
  }
});

function trendScore(thread) {
  const ageHours = (Date.now() - new Date(thread.lastActivityAt).getTime()) / 3600000;
  const activity = thread.replyCount * 3 + totalReactions(thread.reactions) * 2 + thread.viewCount * 0.1;
  return activity / (1 + ageHours / 24);
}

// GET /api/forum/tags: popular tags.
router.get('/tags', async (req, res) => {
  try {
    const tags = await ForumThread.aggregate([
      { $match: { status: 'visible' } },
      { $unwind: '$tags' },
      { $group: { _id: '$tags', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 20 },
    ]);
    res.json({ tags: tags.map((t) => ({ tag: t._id, count: t.count })) });
  } catch (error) {
    console.error('Forum tags error:', error);
    res.status(500).json({ message: 'Could not load tags.' });
  }
});

// POST /api/forum/threads { title, body, category, postType, tags }
router.post('/threads', protect, limitThreads, async (req, res) => {
  try {
    if (forumMuted(req.user)) return res.status(403).json({ message: mutedMessage(req.user) });

    const { errors, value } = validateThread(req.body, req.user);
    if (errors.length) return res.status(400).json({ message: errors[0], errors });

    const duplicate = await ForumThread.exists({
      author: req.user._id,
      body: value.body,
      createdAt: { $gte: new Date(Date.now() - 10 * 60 * 1000) },
    });
    if (duplicate) return res.status(409).json({ message: 'You just posted this. Check your discussions.' });

    const thread = await ForumThread.create({ ...value, author: req.user._id });
    await ForumFollow.create({ user: req.user._id, thread: thread._id });
    const newBadges = await syncBadgesQuietly(req.user._id);
    return res.status(201).json({ id: String(thread._id), newBadges });
  } catch (error) {
    console.error('Forum create error:', error);
    return res.status(500).json({ message: 'Could not create your discussion.' });
  }
});

// GET /api/forum/threads/:id: thread, replies and the viewer's state.
router.get('/threads/:id', optionalAuth, async (req, res) => {
  if (!isId(req.params.id)) return res.status(404).json({ message: 'Discussion not found.' });
  try {
    const thread = await ForumThread.findById(req.params.id).populate('author', 'name yearOfStudy role staffRoles').lean();
    const staff = isStaff(req.user);
    const mine = sameUser(thread?.author, req.user);
    if (!thread || (thread.status !== 'visible' && !staff && !(mine && thread.status === 'hidden'))) {
      return res.status(404).json({ message: 'This discussion was removed or doesn\'t exist.' });
    }

    if (!mine) await ForumThread.updateOne({ _id: thread._id }, { $inc: { viewCount: 1 } });

    const replyFilter = { thread: thread._id, status: staff ? { $in: ['visible', 'hidden'] } : 'visible' };
    const replies = await ForumReply.find(replyFilter).sort({ createdAt: 1 }).populate('author', 'name yearOfStudy role staffRoles').lean();

    let viewer = { signedIn: false };
    if (req.user) {
      const targetIds = [thread._id, ...replies.map((r) => r._id)];
      const [reactions, bookmarked, following] = await Promise.all([
        ForumReaction.find({ user: req.user._id, target: { $in: targetIds } }).lean(),
        ForumBookmark.exists({ user: req.user._id, thread: thread._id }),
        ForumFollow.exists({ user: req.user._id, thread: thread._id }),
      ]);
      const myReactions = {};
      reactions.forEach((r) => {
        const key = String(r.target);
        myReactions[key] = [...(myReactions[key] || []), r.type];
      });
      viewer = {
        signedIn: true,
        isStaff: staff,
        isAuthor: mine,
        bookmarked: Boolean(bookmarked),
        following: Boolean(following),
        myReactions,
        muted: forumMuted(req.user) ? mutedMessage(req.user) : null,
      };
    }

    const userId = req.user ? String(req.user._id) : null;
    return res.json({
      thread: {
        ...threadCard(thread),
        viewCount: thread.viewCount + (mine ? 0 : 1),
        body: thread.body,
        reactions: thread.reactions,
        acceptedReply: thread.acceptedReply ? String(thread.acceptedReply) : null,
        editedAt: thread.editedAt,
        canEdit: mine && withinEditWindow(thread),
        canDelete: mine || staff,
      },
      replies: replies.map((reply) => ({
        id: String(reply._id),
        body: reply.body,
        author: publicAuthor(reply.author),
        parentReply: reply.parentReply ? String(reply.parentReply) : null,
        reactions: reply.reactions,
        createdAt: reply.createdAt,
        editedAt: reply.editedAt,
        status: reply.status,
        canEdit: userId && String(reply.author?._id) === userId && withinEditWindow(reply),
        canDelete: (userId && String(reply.author?._id) === userId) || staff,
      })),
      viewer,
    });
  } catch (error) {
    console.error('Forum detail error:', error);
    return res.status(500).json({ message: 'Could not load this discussion.' });
  }
});

// PATCH /api/forum/threads/:id { title?, body?, tags? }: author, 30 min.
router.patch('/threads/:id', protect, async (req, res) => {
  if (!isId(req.params.id)) return res.status(404).json({ message: 'Discussion not found.' });
  try {
    const thread = await ForumThread.findById(req.params.id);
    if (!thread || thread.status === 'deleted' || thread.status === 'removed') return res.status(404).json({ message: 'Discussion not found.' });
    if (!sameUser(thread.author, req.user)) return res.status(403).json({ message: 'You can only edit your own posts.' });
    if (!withinEditWindow(thread)) {
      return res.status(403).json({ message: `Posts can be edited for ${LIMITS.editWindowMs / 60000} minutes after posting.` });
    }

    const { errors, value } = validateThread(req.body, req.user, { partial: true });
    if (errors.length) return res.status(400).json({ message: errors[0], errors });

    Object.assign(thread, value, { editedAt: new Date() });
    await thread.save();
    return res.json({ ok: true });
  } catch (error) {
    console.error('Forum edit error:', error);
    return res.status(500).json({ message: 'Could not save your changes.' });
  }
});

// DELETE /api/forum/threads/:id: the author deletes their own post.
router.delete('/threads/:id', protect, async (req, res) => {
  if (!isId(req.params.id)) return res.status(404).json({ message: 'Discussion not found.' });
  try {
    const thread = await ForumThread.findById(req.params.id);
    if (!thread || thread.status === 'deleted') return res.status(404).json({ message: 'Discussion not found.' });
    if (!sameUser(thread.author, req.user)) return res.status(403).json({ message: 'You can only delete your own posts.' });

    thread.status = 'deleted';
    await thread.save();
    return res.json({ ok: true });
  } catch (error) {
    console.error('Forum delete error:', error);
    return res.status(500).json({ message: 'Could not delete this discussion.' });
  }
});

// ---------- replies ----------

// POST /api/forum/threads/:id/replies { body, parentReply? }
router.post('/threads/:id/replies', protect, limitReplies, async (req, res) => {
  if (!isId(req.params.id)) return res.status(404).json({ message: 'Discussion not found.' });
  try {
    if (forumMuted(req.user)) return res.status(403).json({ message: mutedMessage(req.user) });

    const thread = await ForumThread.findById(req.params.id);
    if (!thread || thread.status !== 'visible') return res.status(404).json({ message: 'Discussion not found.' });
    if (thread.locked && !isStaff(req.user)) return res.status(403).json({ message: 'This discussion is locked.' });

    const body = cleanText(req.body.body);
    if (body.length < 2 || body.length > LIMITS.replyBodyMax) {
      return res.status(400).json({ message: `Replies must be 2–${LIMITS.replyBodyMax} characters.` });
    }
    if (Date.now() - new Date(req.user.createdAt).getTime() < LIMITS.newAccountMs && countLinks(body) > LIMITS.newAccountMaxLinks) {
      return res.status(400).json({ message: `New accounts can include up to ${LIMITS.newAccountMaxLinks} links per reply for their first day.` });
    }

    // One level of nesting: replying to a nested reply attaches to its parent.
    let parentReply = null;
    if (req.body.parentReply) {
      if (!isId(req.body.parentReply)) return res.status(400).json({ message: 'Invalid reply.' });
      const parent = await ForumReply.findOne({ _id: req.body.parentReply, thread: thread._id, status: 'visible' });
      if (!parent) return res.status(400).json({ message: 'The reply you answered was removed.' });
      parentReply = parent.parentReply || parent._id;
    }

    const reply = await ForumReply.create({ thread: thread._id, author: req.user._id, parentReply, body });
    await recountReplies(thread._id);
    await ForumThread.updateOne({ _id: thread._id }, { $set: { lastActivityAt: new Date() } });
    await ForumFollow.updateOne(
      { user: req.user._id, thread: thread._id },
      { $setOnInsert: { user: req.user._id, thread: thread._id } },
      { upsert: true },
    );

    // Notify followers (and the replied-to author), not the replier.
    const followers = (await ForumFollow.find({ thread: thread._id }).select('user').lean()).map((f) => String(f.user));
    let recipients = new Set(followers);
    if (parentReply) {
      const parent = await ForumReply.findById(parentReply).select('author').lean();
      if (parent) recipients.add(String(parent.author));
    }
    recipients.delete(String(req.user._id));
    recipients = [...recipients];
    await notify(recipients, {
      type: 'forum-reply',
      title: `${req.user.name} replied to "${thread.title.slice(0, 80)}"`,
      body: body.slice(0, 140),
      link: `/forum/${thread._id}#reply-${reply._id}`,
    });

    const newBadges = await syncBadgesQuietly(req.user._id);
    return res.status(201).json({ id: String(reply._id), newBadges });
  } catch (error) {
    console.error('Forum reply error:', error);
    return res.status(500).json({ message: 'Could not post your reply.' });
  }
});

// PATCH /api/forum/replies/:id { body }: author, 30 min.
router.patch('/replies/:id', protect, async (req, res) => {
  if (!isId(req.params.id)) return res.status(404).json({ message: 'Reply not found.' });
  try {
    const reply = await ForumReply.findById(req.params.id);
    if (!reply || reply.status !== 'visible') return res.status(404).json({ message: 'Reply not found.' });
    if (!sameUser(reply.author, req.user)) return res.status(403).json({ message: 'You can only edit your own replies.' });
    if (!withinEditWindow(reply)) return res.status(403).json({ message: `Replies can be edited for ${LIMITS.editWindowMs / 60000} minutes after posting.` });

    const body = cleanText(req.body.body);
    if (body.length < 2 || body.length > LIMITS.replyBodyMax) {
      return res.status(400).json({ message: `Replies must be 2–${LIMITS.replyBodyMax} characters.` });
    }
    reply.body = body;
    reply.editedAt = new Date();
    await reply.save();
    return res.json({ ok: true });
  } catch (error) {
    console.error('Forum reply edit error:', error);
    return res.status(500).json({ message: 'Could not save your changes.' });
  }
});

// DELETE /api/forum/replies/:id: the author deletes their reply.
router.delete('/replies/:id', protect, async (req, res) => {
  if (!isId(req.params.id)) return res.status(404).json({ message: 'Reply not found.' });
  try {
    const reply = await ForumReply.findById(req.params.id);
    if (!reply || reply.status === 'deleted') return res.status(404).json({ message: 'Reply not found.' });
    if (!sameUser(reply.author, req.user)) return res.status(403).json({ message: 'You can only delete your own replies.' });

    reply.status = 'deleted';
    await reply.save();
    await recountReplies(reply.thread);
    await ForumThread.updateOne({ _id: reply.thread, acceptedReply: reply._id }, { $set: { acceptedReply: null } });
    return res.json({ ok: true });
  } catch (error) {
    console.error('Forum reply delete error:', error);
    return res.status(500).json({ message: 'Could not delete this reply.' });
  }
});

// POST /api/forum/threads/:id/accept { replyId | null }: question author
// marks (or clears) the accepted answer.
router.post('/threads/:id/accept', protect, async (req, res) => {
  if (!isId(req.params.id)) return res.status(404).json({ message: 'Discussion not found.' });
  try {
    const thread = await ForumThread.findById(req.params.id);
    if (!thread || thread.status !== 'visible') return res.status(404).json({ message: 'Discussion not found.' });
    if (!sameUser(thread.author, req.user)) return res.status(403).json({ message: 'Only the person who asked can accept an answer.' });
    if (thread.postType !== 'question') return res.status(400).json({ message: 'Only questions have accepted answers.' });

    if (!req.body.replyId) {
      thread.acceptedReply = null;
    } else {
      if (!isId(req.body.replyId)) return res.status(400).json({ message: 'Invalid reply.' });
      const reply = await ForumReply.findOne({ _id: req.body.replyId, thread: thread._id, status: 'visible' });
      if (!reply) return res.status(404).json({ message: 'Reply not found.' });
      thread.acceptedReply = reply._id;
    }
    await thread.save();
    // The helper (not the asker) may have earned a "helpful answer" badge.
    if (thread.acceptedReply) {
      const reply = await ForumReply.findById(thread.acceptedReply).select('author').lean();
      if (reply) await syncBadgesQuietly(reply.author);
    }
    return res.json({ acceptedReply: thread.acceptedReply ? String(thread.acceptedReply) : null });
  } catch (error) {
    console.error('Forum accept error:', error);
    return res.status(500).json({ message: 'Could not update the answer.' });
  }
});

// ---------- reactions, bookmarks, follows ----------

// POST /api/forum/reactions { targetType, targetId, type }: toggle.
router.post('/reactions', protect, limitReactions, async (req, res) => {
  const { targetType, targetId, type } = req.body;
  if (!['thread', 'reply'].includes(targetType) || !isId(targetId) || !REACTION_TYPES.includes(type)) {
    return res.status(400).json({ message: 'Invalid reaction.' });
  }
  try {
    const Model = targetType === 'thread' ? ForumThread : ForumReply;
    const target = await Model.findById(targetId).select('status reactions');
    if (!target || target.status !== 'visible') return res.status(404).json({ message: 'Post not found.' });

    const key = { user: req.user._id, targetType, target: targetId, type };
    const removed = await ForumReaction.findOneAndDelete(key);
    if (removed) {
      await Model.updateOne({ _id: targetId }, { $inc: { [`reactions.${type}`]: -1 } });
    } else {
      try {
        await ForumReaction.create(key);
        await Model.updateOne({ _id: targetId }, { $inc: { [`reactions.${type}`]: 1 } });
      } catch (error) {
        if (error.code !== 11000) throw error; // double click: already reacted
      }
    }
    const updated = await Model.findById(targetId).select('reactions').lean();
    const mine = (await ForumReaction.find({ user: req.user._id, target: targetId }).select('type').lean()).map((r) => r.type);
    return res.json({ reactions: updated.reactions, mine });
  } catch (error) {
    console.error('Forum reaction error:', error);
    return res.status(500).json({ message: 'Could not save your reaction.' });
  }
});

async function toggle(Model, req, res) {
  if (!isId(req.params.id)) return res.status(404).json({ message: 'Discussion not found.' });
  try {
    const exists = await ForumThread.exists({ _id: req.params.id, status: 'visible' });
    if (!exists) return res.status(404).json({ message: 'Discussion not found.' });
    const key = { user: req.user._id, thread: req.params.id };
    const removed = await Model.findOneAndDelete(key);
    if (!removed) await Model.updateOne(key, { $setOnInsert: key }, { upsert: true });
    return res.json({ active: !removed });
  } catch (error) {
    console.error('Forum toggle error:', error);
    return res.status(500).json({ message: 'Could not update this discussion.' });
  }
}

router.post('/threads/:id/bookmark', protect, (req, res) => toggle(ForumBookmark, req, res));
router.post('/threads/:id/follow', protect, (req, res) => toggle(ForumFollow, req, res));

// ---------- reports ----------

// POST /api/forum/reports { targetType, targetId, reason, detail }
router.post('/reports', protect, limitReports, async (req, res) => {
  const { targetType, targetId, reason } = req.body;
  if (!['thread', 'reply'].includes(targetType) || !isId(targetId) || !reasonIds.has(reason)) {
    return res.status(400).json({ message: 'Choose what\'s wrong with this post.' });
  }
  try {
    const target = targetType === 'thread'
      ? await ForumThread.findById(targetId).select('status author')
      : await ForumReply.findById(targetId).select('status author thread');
    if (!target || target.status !== 'visible') return res.status(404).json({ message: 'Post not found.' });
    if (sameUser(target.author, req.user)) return res.status(400).json({ message: 'You can\'t report your own post. Edit or delete it instead.' });

    const already = await ForumReport.exists({ reporter: req.user._id, targetType, target: targetId, status: 'open' });
    if (already) return res.json({ ok: true, message: 'You already reported this. Moderators will review it.' });

    await ForumReport.create({
      reporter: req.user._id,
      targetType,
      target: targetId,
      thread: targetType === 'thread' ? target._id : target.thread,
      reason,
      detail: cleanText(req.body.detail).slice(0, 500),
    });
    return res.status(201).json({ ok: true, message: 'Thanks for reporting. A moderator will review it.' });
  } catch (error) {
    console.error('Forum report error:', error);
    return res.status(500).json({ message: 'Could not send your report.' });
  }
});

// ---------- moderation (admins) ----------

// GET /api/forum/admin/reports?status=open
router.get('/admin/reports', protect, requireStaff('moderator'), async (req, res) => {
  try {
    const status = ['open', 'resolved', 'dismissed'].includes(req.query.status) ? req.query.status : 'open';
    const reports = await ForumReport.find({ status }).sort({ createdAt: status === 'open' ? 1 : -1 }).limit(100)
      .populate('reporter', 'name').populate('reviewedBy', 'name').lean();

    const threadIds = reports.filter((r) => r.targetType === 'thread').map((r) => r.target);
    const replyIds = reports.filter((r) => r.targetType === 'reply').map((r) => r.target);
    const [threads, replies] = await Promise.all([
      ForumThread.find({ _id: { $in: threadIds } }).populate('author', 'name forumMutedUntil').lean(),
      ForumReply.find({ _id: { $in: replyIds } }).populate('author', 'name forumMutedUntil').lean(),
    ]);
    const byId = new Map([...threads, ...replies].map((d) => [String(d._id), d]));

    // Group reports on the same target so the queue shows priority.
    const counts = {};
    reports.forEach((r) => {
      counts[String(r.target)] = (counts[String(r.target)] || 0) + 1;
    });

    res.json({
      reports: reports.map((r) => {
        const target = byId.get(String(r.target));
        return {
          id: String(r._id),
          targetType: r.targetType,
          targetId: String(r.target),
          threadId: String(r.thread),
          reason: r.reason,
          detail: r.detail,
          status: r.status,
          createdAt: r.createdAt,
          reporter: r.reporter?.name || 'Unknown',
          reviewedBy: r.reviewedBy?.name || null,
          resolution: r.resolution,
          reportCount: counts[String(r.target)],
          target: target ? {
            title: target.title || null,
            body: target.body.slice(0, 600),
            status: target.status,
            pinned: target.pinned,
            locked: target.locked,
            category: target.category,
            author: target.author ? { id: String(target.author._id), name: target.author.name, mutedUntil: target.author.forumMutedUntil } : null,
          } : null,
        };
      }),
    });
  } catch (error) {
    console.error('Forum reports error:', error);
    res.status(500).json({ message: 'Could not load reports.' });
  }
});

// GET /api/forum/admin/audit: latest moderator actions.
router.get('/admin/audit', protect, requireStaff('moderator'), async (req, res) => {
  try {
    const actions = await ForumModeration.find().sort({ createdAt: -1 }).limit(100).populate('moderator', 'name').lean();
    res.json({
      actions: actions.map((a) => ({
        id: String(a._id),
        moderator: a.moderator?.name || 'Unknown',
        targetType: a.targetType,
        target: String(a.target),
        action: a.action,
        reason: a.reason,
        meta: a.meta,
        createdAt: a.createdAt,
      })),
    });
  } catch (error) {
    console.error('Forum audit error:', error);
    res.status(500).json({ message: 'Could not load the audit trail.' });
  }
});

const THREAD_ACTIONS = ['hide', 'restore', 'remove', 'pin', 'unpin', 'lock', 'unlock', 'move'];
const REPLY_ACTIONS = ['hide', 'restore', 'remove'];
const USER_ACTIONS = ['mute', 'unmute'];
const REPORT_ACTIONS = ['resolve', 'dismiss'];

// POST /api/forum/admin/actions
//   { targetType, targetId, action, reason, category?, days?, reportId? }
router.post('/admin/actions', protect, requireStaff('moderator'), async (req, res) => {
  const { targetType, targetId, action } = req.body;
  const reason = cleanText(req.body.reason || '').slice(0, 300);
  if (!isId(targetId)) return res.status(400).json({ message: 'Invalid target.' });

  try {
    let meta = {};

    if (targetType === 'thread' && THREAD_ACTIONS.includes(action)) {
      const thread = await ForumThread.findById(targetId);
      if (!thread || thread.status === 'deleted') return res.status(404).json({ message: 'Discussion not found.' });
      if (action === 'hide') thread.status = 'hidden';
      if (action === 'restore') thread.status = 'visible';
      if (action === 'remove') thread.status = 'removed';
      if (action === 'pin' || action === 'unpin') thread.pinned = action === 'pin';
      if (action === 'lock' || action === 'unlock') thread.locked = action === 'lock';
      if (action === 'move') {
        if (!categoryIds.has(req.body.category)) return res.status(400).json({ message: 'Choose a category.' });
        meta = { from: thread.category, to: req.body.category };
        thread.category = req.body.category;
      }
      await thread.save();
      if (['hide', 'remove', 'move'].includes(action)) {
        await notify(thread.author, {
          type: 'forum-moderation',
          title: action === 'move'
            ? `A moderator moved your discussion "${thread.title.slice(0, 60)}" to a better category`
            : `A moderator ${action === 'hide' ? 'hid' : 'removed'} your discussion "${thread.title.slice(0, 60)}"`,
          body: reason,
          link: `/forum/${thread._id}`,
        });
      }
    } else if (targetType === 'reply' && REPLY_ACTIONS.includes(action)) {
      const reply = await ForumReply.findById(targetId);
      if (!reply || reply.status === 'deleted') return res.status(404).json({ message: 'Reply not found.' });
      reply.status = { hide: 'hidden', restore: 'visible', remove: 'removed' }[action];
      await reply.save();
      await recountReplies(reply.thread);
      if (action !== 'restore') {
        await ForumThread.updateOne({ _id: reply.thread, acceptedReply: reply._id }, { $set: { acceptedReply: null } });
        await notify(reply.author, {
          type: 'forum-moderation',
          title: `A moderator ${action === 'hide' ? 'hid' : 'removed'} one of your replies`,
          body: reason,
          link: `/forum/${reply.thread}`,
        });
      }
    } else if (targetType === 'user' && USER_ACTIONS.includes(action)) {
      const user = await User.findById(targetId);
      if (!user || user.role === 'admin') return res.status(404).json({ message: 'Student not found.' });
      if (user.staffRoles?.length && req.user.role !== 'admin') {
        return res.status(403).json({ message: 'Only admins can pause staff members.' });
      }
      if (action === 'mute') {
        const days = Math.min(Math.max(Number.parseInt(req.body.days, 10) || 1, 1), 30);
        user.forumMutedUntil = new Date(Date.now() + days * 86400000);
        meta = { days };
        await notify(user._id, {
          type: 'forum-moderation',
          title: `Your forum posting is paused for ${days} day${days === 1 ? '' : 's'}`,
          body: reason,
          link: '/forum',
        });
      } else {
        user.forumMutedUntil = null;
      }
      await user.save();
    } else if (targetType === 'report' && REPORT_ACTIONS.includes(action)) {
      // Handled below with reportId.
    } else {
      return res.status(400).json({ message: 'That action isn\'t allowed here.' });
    }

    const reportId = targetType === 'report' ? targetId : req.body.reportId;
    const reportAction = targetType === 'report' ? action : 'resolve';
    if (reportId && isId(reportId)) {
      const report = await ForumReport.findById(reportId);
      if (report && report.status === 'open') {
        // Close every open report on the same post.
        const reports = await ForumReport.find({ target: report.target, status: 'open' });
        await ForumReport.updateMany(
          { target: report.target, status: 'open' },
          {
            $set: {
              status: reportAction === 'dismiss' ? 'dismissed' : 'resolved',
              reviewedBy: req.user._id,
              reviewedAt: new Date(),
              resolution: reason || (targetType === 'report' ? '' : action),
            },
          },
        );
        await notify(reports.map((r) => r.reporter), {
          type: 'forum-report-reviewed',
          title: 'Your report was reviewed by a moderator',
          body: reportAction === 'dismiss' ? 'No action was needed this time. Thanks for helping keep the forum safe.' : 'Action was taken. Thanks for helping keep the forum safe.',
          link: '/forum',
        });
      }
    }

    await logAction(req.user, targetType, targetId, action, reason, meta);
    return res.json({ ok: true });
  } catch (error) {
    console.error('Forum moderation error:', error);
    return res.status(500).json({ message: 'Could not apply this action.' });
  }
});

module.exports = router;

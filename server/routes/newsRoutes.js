const express = require('express');
const mongoose = require('mongoose');
const { NewsSource, NewsItem, NewsDigest, NewsBookmark, NewsFetchLog } = require('../models/News');
const { ForumThread, ForumFollow } = require('../models/Forum');
const { protect, adminOnly, optionalAuth } = require('../middleware/authMiddleware');
const { NEWS_CATEGORIES, NEWS_LIMITS } = require('../data/news');
const { toPlainText, canonicalUrl, ingestSource, ingestAll, notifyLiveDigests } = require('../utils/newsIngest');

const router = express.Router();

const PAGE_SIZE = 12;
const categoryIds = new Set(NEWS_CATEGORIES.map((c) => c.id));
const ITEM_STATUSES = ['candidate', 'reviewing', 'approved', 'published', 'rejected', 'archived'];

const isId = (id) => mongoose.Types.ObjectId.isValid(id);
const liveDigest = () => ({ status: 'published', publishedAt: { $lte: new Date() } });
const clean = (value, max) => toPlainText(String(value ?? ''), max);

function publicItem(item, bookmarked = new Set()) {
  return {
    id: String(item._id),
    title: item.title,
    sourceName: item.sourceName,
    url: item.canonicalUrl,
    author: item.author,
    publishedAt: item.publishedAt,
    reviewedAt: item.reviewedAt,
    category: item.category,
    tags: item.tags,
    summary: item.editorSummary,
    whyItMatters: item.whyItMatters,
    digest: item.digest && item.digest.slug ? { slug: item.digest.slug, title: item.digest.title } : null,
    bookmarked: bookmarked.has(String(item._id)),
  };
}

async function bookmarksFor(user, itemIds) {
  if (!user) return new Set();
  const marks = await NewsBookmark.find({ user: user._id, item: { $in: itemIds } }).select('item').lean();
  return new Set(marks.map((m) => String(m.item)));
}

async function digestPayload(digest, user) {
  const items = await NewsItem.find({ _id: { $in: [digest.topStory, ...digest.items].filter(Boolean) } }).lean();
  const byId = new Map(items.map((i) => [String(i._id), i]));
  const marks = await bookmarksFor(user, items.map((i) => i._id));
  return {
    id: String(digest._id),
    title: digest.title,
    slug: digest.slug,
    weekStart: digest.weekStart,
    weekEnd: digest.weekEnd,
    intro: digest.intro,
    publishedAt: digest.publishedAt,
    topStory: digest.topStory && byId.get(String(digest.topStory)) ? publicItem(byId.get(String(digest.topStory)), marks) : null,
    items: digest.items.map((id) => byId.get(String(id))).filter(Boolean).map((i) => publicItem(i, marks)),
    tryThis: digest.tryThis?.title ? digest.tryThis : null,
    communityQuestion: digest.communityQuestion,
    forumThread: digest.forumThread ? String(digest.forumThread) : null,
  };
}

// ---------- public ----------

router.get('/config', (req, res) => res.json({ categories: NEWS_CATEGORIES }));

// GET /api/news/digests/latest
router.get('/digests/latest', optionalAuth, async (req, res) => {
  try {
    const digest = await NewsDigest.findOne(liveDigest()).sort({ publishedAt: -1 }).lean();
    if (!digest) return res.json({ digest: null });
    return res.json({ digest: await digestPayload(digest, req.user) });
  } catch (error) {
    console.error('News latest error:', error);
    return res.status(500).json({ message: 'Could not load the latest digest.' });
  }
});

// GET /api/news/digests?page: archive.
router.get('/digests', async (req, res) => {
  try {
    const page = Math.max(1, Number.parseInt(req.query.page, 10) || 1);
    const [digests, total] = await Promise.all([
      NewsDigest.find(liveDigest()).sort({ publishedAt: -1 }).skip((page - 1) * PAGE_SIZE).limit(PAGE_SIZE)
        .select('title slug weekStart weekEnd intro publishedAt items').lean(),
      NewsDigest.countDocuments(liveDigest()),
    ]);
    res.json({
      digests: digests.map((d) => ({ id: String(d._id), title: d.title, slug: d.slug, weekStart: d.weekStart, weekEnd: d.weekEnd, intro: d.intro, publishedAt: d.publishedAt, itemCount: d.items.length })),
      page,
      pages: Math.max(1, Math.ceil(total / PAGE_SIZE)),
    });
  } catch (error) {
    console.error('News archive error:', error);
    res.status(500).json({ message: 'Could not load the archive.' });
  }
});

// GET /api/news/digests/:slug
router.get('/digests/:slug', optionalAuth, async (req, res) => {
  try {
    const digest = await NewsDigest.findOne({ slug: req.params.slug, ...liveDigest() }).lean();
    if (!digest) return res.status(404).json({ message: 'Digest not found.' });
    return res.json({ digest: await digestPayload(digest, req.user) });
  } catch (error) {
    console.error('News digest error:', error);
    return res.status(500).json({ message: 'Could not load this digest.' });
  }
});

// GET /api/news?q&category&page: search published stories.
router.get('/', optionalAuth, async (req, res) => {
  try {
    const page = Math.max(1, Number.parseInt(req.query.page, 10) || 1);
    const filter = { status: 'published' };
    if (categoryIds.has(req.query.category)) filter.category = req.query.category;
    const q = clean(req.query.q, 100);
    if (q) filter.$text = { $search: q };

    const [items, total] = await Promise.all([
      NewsItem.find(filter).sort(q ? { score: { $meta: 'textScore' } } : { reviewedAt: -1 })
        .skip((page - 1) * PAGE_SIZE).limit(PAGE_SIZE).populate('digest', 'slug title').lean(),
      NewsItem.countDocuments(filter),
    ]);
    const marks = await bookmarksFor(req.user, items.map((i) => i._id));
    res.json({ items: items.map((i) => publicItem(i, marks)), page, pages: Math.max(1, Math.ceil(total / PAGE_SIZE)), total });
  } catch (error) {
    console.error('News search error:', error);
    res.status(500).json({ message: 'Could not load news.' });
  }
});

// GET /api/news/bookmarks: my saved stories (private).
router.get('/bookmarks', protect, async (req, res) => {
  try {
    const marks = await NewsBookmark.find({ user: req.user._id }).sort({ createdAt: -1 }).limit(100)
      .populate({ path: 'item', populate: { path: 'digest', select: 'slug title' } }).lean();
    const items = marks.map((m) => m.item).filter((i) => i && i.status === 'published');
    res.json({ items: items.map((i) => publicItem(i, new Set(items.map((x) => String(x._id))))) });
  } catch (error) {
    console.error('News bookmarks error:', error);
    res.status(500).json({ message: 'Could not load your saved stories.' });
  }
});

// POST /api/news/items/:id/bookmark: toggle.
router.post('/items/:id/bookmark', protect, async (req, res) => {
  if (!isId(req.params.id)) return res.status(404).json({ message: 'Story not found.' });
  try {
    const exists = await NewsItem.exists({ _id: req.params.id, status: 'published' });
    if (!exists) return res.status(404).json({ message: 'Story not found.' });
    const key = { user: req.user._id, item: req.params.id };
    const removed = await NewsBookmark.findOneAndDelete(key);
    if (!removed) await NewsBookmark.updateOne(key, { $setOnInsert: key }, { upsert: true });
    return res.json({ bookmarked: !removed });
  } catch (error) {
    console.error('News bookmark error:', error);
    return res.status(500).json({ message: 'Could not update your saved stories.' });
  }
});

// ---------- editors (admins) ----------

const admin = [protect, adminOnly];

// Sources
router.get('/admin/sources', admin, async (req, res) => {
  try {
    const [sources, logs] = await Promise.all([
      NewsSource.find().sort({ name: 1 }).lean(),
      NewsFetchLog.find().sort({ createdAt: -1 }).limit(30).populate('source', 'name').lean(),
    ]);
    res.json({ sources, logs: logs.map((l) => ({ ...l, source: l.source?.name || 'Deleted source' })) });
  } catch (error) {
    console.error('News sources error:', error);
    res.status(500).json({ message: 'Could not load sources.' });
  }
});

function sourceInput(body) {
  const errors = [];
  const value = {
    name: clean(body.name, 100),
    baseUrl: canonicalUrl(body.baseUrl),
    feedUrl: body.feedUrl ? canonicalUrl(body.feedUrl) : '',
    category: body.category,
    notes: clean(body.notes, 300),
    isActive: Boolean(body.isActive),
  };
  if (!value.name) errors.push('Add a source name.');
  if (!value.baseUrl) errors.push('Add a valid website URL.');
  if (body.feedUrl && !value.feedUrl) errors.push('The feed URL must be a valid http(s) URL.');
  if (!categoryIds.has(value.category)) errors.push('Choose a category.');
  return { errors, value };
}

router.post('/admin/sources', admin, async (req, res) => {
  const { errors, value } = sourceInput(req.body);
  if (errors.length) return res.status(400).json({ message: errors[0] });
  try {
    const source = await NewsSource.create(value);
    return res.status(201).json({ id: String(source._id) });
  } catch (error) {
    console.error('News source create error:', error);
    return res.status(500).json({ message: 'Could not add the source.' });
  }
});

router.put('/admin/sources/:id', admin, async (req, res) => {
  if (!isId(req.params.id)) return res.status(404).json({ message: 'Source not found.' });
  const { errors, value } = sourceInput(req.body);
  if (errors.length) return res.status(400).json({ message: errors[0] });
  try {
    await NewsSource.updateOne({ _id: req.params.id }, { $set: value });
    return res.json({ ok: true });
  } catch (error) {
    console.error('News source update error:', error);
    return res.status(500).json({ message: 'Could not save the source.' });
  }
});

// POST /api/news/admin/sources/:id/fetch: test/fetch one source now.
router.post('/admin/sources/:id/fetch', admin, async (req, res) => {
  if (!isId(req.params.id)) return res.status(404).json({ message: 'Source not found.' });
  try {
    const source = await NewsSource.findById(req.params.id);
    if (!source || !source.feedUrl) return res.status(400).json({ message: 'This source has no feed URL.' });
    const result = await ingestSource(source, 'manual');
    return res.json({ ok: true, ...result });
  } catch (error) {
    return res.status(502).json({ message: `Fetch failed: ${error.message}` });
  }
});

// POST /api/news/admin/ingest: fetch every active source now.
router.post('/admin/ingest', admin, async (req, res) => {
  try {
    res.json({ results: await ingestAll('manual') });
  } catch (error) {
    console.error('News ingest error:', error);
    res.status(500).json({ message: 'Could not fetch sources.' });
  }
});

// Items (review queue)
router.get('/admin/items', admin, async (req, res) => {
  try {
    const status = ITEM_STATUSES.includes(req.query.status) ? req.query.status : 'candidate';
    const items = await NewsItem.find({ status }).sort({ publishedAt: -1, createdAt: -1 }).limit(100)
      .populate('reviewedBy', 'name').populate('addedBy', 'name').lean();
    const counts = Object.fromEntries(await Promise.all(ITEM_STATUSES.map(async (s) => [s, await NewsItem.countDocuments({ status: s })])));
    res.json({
      items: items.map((i) => ({ ...i, id: String(i._id), reviewedBy: i.reviewedBy?.name || null, addedBy: i.addedBy?.name || null })),
      counts,
    });
  } catch (error) {
    console.error('News items error:', error);
    res.status(500).json({ message: 'Could not load the review queue.' });
  }
});

// POST /api/news/admin/items: add a story manually (goes to review).
router.post('/admin/items', admin, async (req, res) => {
  const url = canonicalUrl(req.body.url);
  const title = clean(req.body.title, NEWS_LIMITS.titleMax);
  const sourceName = clean(req.body.sourceName, 100);
  if (!url || !title || !sourceName) return res.status(400).json({ message: 'Add the original link, title and source name.' });
  try {
    const duplicate = await NewsItem.findOne({ canonicalUrl: url }).select('status title').lean();
    if (duplicate) return res.status(409).json({ message: `Already in the system (${duplicate.status}): "${duplicate.title}"` });
    const publishedAt = req.body.publishedAt ? new Date(req.body.publishedAt) : null;
    const item = await NewsItem.create({
      sourceName,
      canonicalUrl: url,
      title,
      author: clean(req.body.author, 120),
      publishedAt: publishedAt && !Number.isNaN(publishedAt.getTime()) ? publishedAt : null,
      category: categoryIds.has(req.body.category) ? req.body.category : '',
      status: 'reviewing',
      addedBy: req.user._id,
    });
    return res.status(201).json({ id: String(item._id) });
  } catch (error) {
    console.error('News add error:', error);
    return res.status(500).json({ message: 'Could not add the story.' });
  }
});

// PUT /api/news/admin/items/:id: edit + change status. Approving requires a
// human-written summary, category, source, link and original date.
router.put('/admin/items/:id', admin, async (req, res) => {
  if (!isId(req.params.id)) return res.status(404).json({ message: 'Story not found.' });
  try {
    const item = await NewsItem.findById(req.params.id);
    if (!item) return res.status(404).json({ message: 'Story not found.' });
    if (item.status === 'published' && req.body.status && req.body.status !== 'archived') {
      return res.status(400).json({ message: 'Published stories can only be archived.' });
    }

    if (req.body.title !== undefined) item.title = clean(req.body.title, NEWS_LIMITS.titleMax);
    if (req.body.editorSummary !== undefined) item.editorSummary = clean(req.body.editorSummary, NEWS_LIMITS.summaryMax);
    if (req.body.whyItMatters !== undefined) item.whyItMatters = clean(req.body.whyItMatters, NEWS_LIMITS.whyMax);
    if (req.body.category !== undefined && categoryIds.has(req.body.category)) item.category = req.body.category;
    if (req.body.tags !== undefined) item.tags = (Array.isArray(req.body.tags) ? req.body.tags : []).map((t) => clean(t, 24).toLowerCase()).filter(Boolean).slice(0, 5);
    if (req.body.author !== undefined) item.author = clean(req.body.author, 120);
    if (req.body.publishedAt) {
      const date = new Date(req.body.publishedAt);
      if (!Number.isNaN(date.getTime())) item.publishedAt = date;
    }

    const next = req.body.status;
    if (next) {
      if (!ITEM_STATUSES.includes(next) || next === 'published') return res.status(400).json({ message: 'Publish stories through a digest.' });
      if (next === 'approved') {
        const missing = [];
        if (!item.editorSummary) missing.push('a summary');
        if (!item.category) missing.push('a category');
        if (!item.publishedAt) missing.push('the original publish date');
        if (missing.length) return res.status(400).json({ message: `Before approving, add ${missing.join(', ')}.` });
        item.reviewedBy = req.user._id;
        item.reviewedAt = new Date();
      }
      item.status = next;
    }
    await item.save();
    return res.json({ ok: true });
  } catch (error) {
    console.error('News item update error:', error);
    return res.status(500).json({ message: 'Could not save the story.' });
  }
});

// Digests
router.get('/admin/digests', admin, async (req, res) => {
  try {
    const digests = await NewsDigest.find().sort({ weekStart: -1 }).limit(50).lean();
    res.json({ digests: digests.map((d) => ({ ...d, id: String(d._id) })) });
  } catch (error) {
    console.error('News admin digests error:', error);
    res.status(500).json({ message: 'Could not load digests.' });
  }
});

function digestInput(body) {
  const errors = [];
  const value = {
    title: clean(body.title, 140),
    intro: clean(body.intro, 800),
    communityQuestion: clean(body.communityQuestion, 300),
    tryThis: {
      title: clean(body.tryThis?.title, 140),
      url: body.tryThis?.url ? canonicalUrl(body.tryThis.url) || '' : '',
      description: clean(body.tryThis?.description, 400),
    },
    weekStart: new Date(body.weekStart),
    weekEnd: new Date(body.weekEnd),
    items: (Array.isArray(body.items) ? body.items : []).filter(isId).slice(0, 10),
    topStory: isId(body.topStory) ? body.topStory : null,
  };
  if (!value.title) errors.push('Add a title.');
  if (Number.isNaN(value.weekStart.getTime()) || Number.isNaN(value.weekEnd.getTime()) || value.weekEnd < value.weekStart) errors.push('Choose the week dates.');
  if (body.tryThis?.url && !value.tryThis.url) errors.push('The "Try this" link must be a valid URL.');
  value.slug = `${value.weekStart.toISOString().slice(0, 10)}-${value.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 50)}`;
  return { errors, value };
}

router.post('/admin/digests', admin, async (req, res) => {
  const { errors, value } = digestInput(req.body);
  if (errors.length) return res.status(400).json({ message: errors[0] });
  try {
    const digest = await NewsDigest.create({ ...value, createdBy: req.user._id });
    return res.status(201).json({ id: String(digest._id) });
  } catch (error) {
    if (error.code === 11000) return res.status(409).json({ message: 'A digest with this week and title already exists.' });
    console.error('News digest create error:', error);
    return res.status(500).json({ message: 'Could not create the digest.' });
  }
});

router.put('/admin/digests/:id', admin, async (req, res) => {
  if (!isId(req.params.id)) return res.status(404).json({ message: 'Digest not found.' });
  const { errors, value } = digestInput(req.body);
  if (errors.length) return res.status(400).json({ message: errors[0] });
  try {
    const digest = await NewsDigest.findById(req.params.id);
    if (!digest) return res.status(404).json({ message: 'Digest not found.' });
    const { slug, ...rest } = value;
    Object.assign(digest, digest.status === 'draft' ? value : rest);
    await digest.save();
    return res.json({ ok: true });
  } catch (error) {
    if (error.code === 11000) return res.status(409).json({ message: 'A digest with this week and title already exists.' });
    console.error('News digest update error:', error);
    return res.status(500).json({ message: 'Could not save the digest.' });
  }
});

// POST /api/news/admin/digests/:id/publish { publishAt?, createDiscussion? }
router.post('/admin/digests/:id/publish', admin, async (req, res) => {
  if (!isId(req.params.id)) return res.status(404).json({ message: 'Digest not found.' });
  try {
    const digest = await NewsDigest.findById(req.params.id);
    if (!digest) return res.status(404).json({ message: 'Digest not found.' });

    const ids = [digest.topStory, ...digest.items].filter(Boolean);
    if (ids.length < 3) return res.status(400).json({ message: 'Add a top story and at least 2 quick reads (3-7 stories).' });
    const items = await NewsItem.find({ _id: { $in: ids } });
    const notReady = items.filter((i) => !['approved', 'published'].includes(i.status));
    if (items.length !== new Set(ids.map(String)).size || notReady.length) {
      return res.status(400).json({ message: `Every story must be approved first (${notReady.map((i) => `"${i.title.slice(0, 40)}"`).join(', ') || 'some were removed'}).` });
    }

    const publishAt = req.body.publishAt ? new Date(req.body.publishAt) : new Date();
    if (Number.isNaN(publishAt.getTime())) return res.status(400).json({ message: 'Invalid publish date.' });

    // Optional linked forum discussion for the community question.
    if (req.body.createDiscussion && digest.communityQuestion && !digest.forumThread) {
      const thread = await ForumThread.create({
        author: req.user._id,
        category: 'open',
        postType: 'discussion',
        title: `Tech Brief: ${digest.communityQuestion}`.slice(0, 150),
        body: `From this week's CodeSphere Tech Brief, "${digest.title}".\n\n${digest.communityQuestion}\n\nRead the digest: /news/${digest.slug}`,
        tags: ['tech-news'],
      });
      await ForumFollow.create({ user: req.user._id, thread: thread._id });
      digest.forumThread = thread._id;
    }

    digest.status = 'published';
    digest.publishedAt = publishAt;
    digest.publishedBy = req.user._id;
    await digest.save();
    await NewsItem.updateMany({ _id: { $in: ids } }, { $set: { status: 'published', digest: digest._id } });
    await notifyLiveDigests();
    return res.json({ ok: true, publishedAt: digest.publishedAt, scheduled: publishAt > new Date() });
  } catch (error) {
    console.error('News publish error:', error);
    return res.status(500).json({ message: 'Could not publish the digest.' });
  }
});

module.exports = router;

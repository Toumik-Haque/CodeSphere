const mongoose = require('mongoose');

const { Schema } = mongoose;

// Approved publisher/feed registry.
const sourceSchema = new Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 100 },
    baseUrl: { type: String, required: true, trim: true },
    feedUrl: { type: String, default: '', trim: true },
    category: { type: String, required: true },
    isActive: { type: Boolean, default: false },
    notes: { type: String, default: '', maxlength: 300 },
    lastFetchedAt: { type: Date, default: null },
    lastSuccessAt: { type: Date, default: null },
    lastError: { type: String, default: '' },
    lastFetchCount: { type: Number, default: 0 },
  },
  { timestamps: true },
);

// One news story: a fetched candidate or a manually added link, reviewed and
// summarised by an editor before it can be published in a digest.
const itemSchema = new Schema(
  {
    source: { type: Schema.Types.ObjectId, ref: 'NewsSource', default: null },
    sourceName: { type: String, required: true, trim: true, maxlength: 100 },
    externalId: { type: String, default: '' },
    canonicalUrl: { type: String, required: true, unique: true },
    title: { type: String, required: true, trim: true, maxlength: 200 },
    author: { type: String, default: '', maxlength: 120 },
    // When the publisher published it (not when CodeSphere added it).
    publishedAt: { type: Date, default: null },
    // Short source-provided snippet (plain text, capped).
    feedSummary: { type: String, default: '', maxlength: 500 },
    category: { type: String, default: '' },
    tags: { type: [String], default: [] },
    // Original, human-written student-focused text.
    editorSummary: { type: String, default: '', maxlength: 600 },
    whyItMatters: { type: String, default: '', maxlength: 600 },
    // candidate | reviewing | approved | published | rejected | archived
    status: { type: String, default: 'candidate', index: true },
    addedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    reviewedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    reviewedAt: { type: Date, default: null },
    digest: { type: Schema.Types.ObjectId, ref: 'NewsDigest', default: null },
    fetchedAt: { type: Date, default: Date.now },
  },
  { timestamps: true },
);
itemSchema.index({ source: 1, externalId: 1 });
itemSchema.index({ title: 'text', editorSummary: 'text', whyItMatters: 'text' });

// A weekly edition.
const digestSchema = new Schema(
  {
    title: { type: String, required: true, trim: true, maxlength: 140 },
    slug: { type: String, required: true, unique: true },
    weekStart: { type: Date, required: true },
    weekEnd: { type: Date, required: true },
    intro: { type: String, default: '', maxlength: 800 },
    topStory: { type: Schema.Types.ObjectId, ref: 'NewsItem', default: null },
    items: [{ type: Schema.Types.ObjectId, ref: 'NewsItem' }],
    tryThis: {
      title: { type: String, default: '', maxlength: 140 },
      url: { type: String, default: '' },
      description: { type: String, default: '', maxlength: 400 },
    },
    communityQuestion: { type: String, default: '', maxlength: 300 },
    forumThread: { type: Schema.Types.ObjectId, ref: 'ForumThread', default: null },
    // draft | published (publishedAt in the future = scheduled)
    status: { type: String, enum: ['draft', 'published'], default: 'draft', index: true },
    publishedAt: { type: Date, default: null },
    notifiedAt: { type: Date, default: null },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
    publishedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true },
);

const bookmarkSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    item: { type: Schema.Types.ObjectId, ref: 'NewsItem', required: true },
  },
  { timestamps: true },
);
bookmarkSchema.index({ user: 1, item: 1 }, { unique: true });

// Ingestion log (one per source fetch) so editors can see failures.
const fetchLogSchema = new Schema(
  {
    source: { type: Schema.Types.ObjectId, ref: 'NewsSource', required: true },
    ok: { type: Boolean, required: true },
    found: { type: Number, default: 0 },
    added: { type: Number, default: 0 },
    error: { type: String, default: '' },
    trigger: { type: String, enum: ['schedule', 'manual'], default: 'manual' },
  },
  { timestamps: true },
);
fetchLogSchema.index({ createdAt: -1 });

module.exports = {
  NewsSource: mongoose.model('NewsSource', sourceSchema),
  NewsItem: mongoose.model('NewsItem', itemSchema),
  NewsDigest: mongoose.model('NewsDigest', digestSchema),
  NewsBookmark: mongoose.model('NewsBookmark', bookmarkSchema),
  NewsFetchLog: mongoose.model('NewsFetchLog', fetchLogSchema),
};

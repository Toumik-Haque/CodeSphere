const mongoose = require('mongoose');

const { Schema } = mongoose;
const ref = (model) => ({ type: Schema.Types.ObjectId, ref: model });

// status: visible | hidden (by moderator, can be restored) | removed (by
// moderator) | deleted (by the author). Only "visible" content is public.
const STATUSES = ['visible', 'hidden', 'removed', 'deleted'];

const reactionCounts = {
  like: { type: Number, default: 0 },
  helpful: { type: Number, default: 0 },
  celebrate: { type: Number, default: 0 },
};

const threadSchema = new Schema(
  {
    author: { ...ref('User'), required: true, index: true },
    category: { type: String, required: true, index: true },
    postType: { type: String, required: true },
    title: { type: String, required: true, trim: true, maxlength: 150 },
    body: { type: String, required: true, maxlength: 10000 },
    tags: { type: [String], default: [], index: true },
    status: { type: String, enum: STATUSES, default: 'visible', index: true },
    pinned: { type: Boolean, default: false },
    locked: { type: Boolean, default: false },
    acceptedReply: { ...ref('ForumReply'), default: null },
    replyCount: { type: Number, default: 0 },
    viewCount: { type: Number, default: 0 },
    reactions: reactionCounts,
    lastActivityAt: { type: Date, default: Date.now, index: true },
    editedAt: { type: Date, default: null },
    // Up to 3 images (stored in ImageKit).
    attachments: {
      type: [{ url: String, fileId: String, _id: false }],
      default: [],
    },
  },
  { timestamps: true },
);
threadSchema.index({ title: 'text', body: 'text', tags: 'text' }, { weights: { title: 5, tags: 3, body: 1 } });

const replySchema = new Schema(
  {
    thread: { ...ref('ForumThread'), required: true, index: true },
    author: { ...ref('User'), required: true, index: true },
    // One level of nesting: a reply can answer another top-level reply.
    parentReply: { ...ref('ForumReply'), default: null },
    body: { type: String, required: true, maxlength: 5000 },
    status: { type: String, enum: STATUSES, default: 'visible' },
    reactions: reactionCounts,
    editedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

const reactionSchema = new Schema(
  {
    user: { ...ref('User'), required: true },
    targetType: { type: String, enum: ['thread', 'reply'], required: true },
    target: { type: Schema.Types.ObjectId, required: true },
    type: { type: String, enum: ['like', 'helpful', 'celebrate'], required: true },
  },
  { timestamps: true },
);
reactionSchema.index({ user: 1, targetType: 1, target: 1, type: 1 }, { unique: true });

const bookmarkSchema = new Schema(
  { user: { ...ref('User'), required: true }, thread: { ...ref('ForumThread'), required: true } },
  { timestamps: true },
);
bookmarkSchema.index({ user: 1, thread: 1 }, { unique: true });

const followSchema = new Schema(
  { user: { ...ref('User'), required: true }, thread: { ...ref('ForumThread'), required: true } },
  { timestamps: true },
);
followSchema.index({ user: 1, thread: 1 }, { unique: true });
followSchema.index({ thread: 1 });

const reportSchema = new Schema(
  {
    reporter: { ...ref('User'), required: true },
    targetType: { type: String, enum: ['thread', 'reply'], required: true },
    target: { type: Schema.Types.ObjectId, required: true },
    thread: { ...ref('ForumThread'), required: true },
    reason: { type: String, required: true },
    detail: { type: String, default: '', maxlength: 500 },
    status: { type: String, enum: ['open', 'resolved', 'dismissed'], default: 'open', index: true },
    reviewedBy: { ...ref('User'), default: null },
    resolution: { type: String, default: '', maxlength: 300 },
    reviewedAt: { type: Date, default: null },
  },
  { timestamps: true },
);
reportSchema.index({ reporter: 1, targetType: 1, target: 1, status: 1 });

// An uploaded image waiting to be attached to a thread by its owner.
const uploadSchema = new Schema(
  {
    owner: { ...ref('User'), required: true, index: true },
    url: { type: String, required: true },
    fileId: { type: String, required: true },
    used: { type: Boolean, default: false },
  },
  { timestamps: true },
);

// Audit trail: every moderator action.
const moderationSchema = new Schema(
  {
    moderator: { ...ref('User'), required: true },
    targetType: { type: String, enum: ['thread', 'reply', 'user', 'report'], required: true },
    target: { type: Schema.Types.ObjectId, required: true },
    action: { type: String, required: true },
    reason: { type: String, default: '', maxlength: 300 },
    meta: { type: Schema.Types.Mixed, default: {} },
  },
  { timestamps: true },
);
moderationSchema.index({ createdAt: -1 });

module.exports = {
  ForumThread: mongoose.model('ForumThread', threadSchema),
  ForumReply: mongoose.model('ForumReply', replySchema),
  ForumReaction: mongoose.model('ForumReaction', reactionSchema),
  ForumBookmark: mongoose.model('ForumBookmark', bookmarkSchema),
  ForumFollow: mongoose.model('ForumFollow', followSchema),
  ForumReport: mongoose.model('ForumReport', reportSchema),
  ForumModeration: mongoose.model('ForumModeration', moderationSchema),
  ForumUpload: mongoose.model('ForumUpload', uploadSchema),
};

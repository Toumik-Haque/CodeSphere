const mongoose = require('mongoose');

const { Schema } = mongoose;
const ObjectId = Schema.Types.ObjectId;

const CATEGORIES = ['web', 'ai-ml', 'dsa', 'mobile', 'cloud-devops', 'open-source', 'data', 'iot', 'other'];
const LEVELS = ['Beginner', 'Intermediate', 'Advanced'];

const media = new Schema({ url: String, fileId: String, caption: { type: String, default: '', maxlength: 140 } }, { _id: true });

// Snapshot of what GitHub said, kept separate from what the student wrote,
// so a refresh never overwrites their story or screenshots.
const githubSnapshot = new Schema({
  url: String,
  owner: String,
  repo: String,
  nodeId: String,
  description: String,
  defaultBranch: String,
  license: String, // SPDX id or ''
  licenseName: String,
  languages: [String],
  topics: [String],
  stars: Number,
  forks: Number,
  openIssues: Number,
  pushedAt: Date,
  homepage: String,
  readmePreview: String,
  isFork: Boolean,
  isArchived: Boolean,
  fetchedAt: Date,
}, { _id: false });

// ---------- A showcased project (imported, manual or from a guided track) ----------
const projectSchema = new Schema({
  slug: { type: String, required: true, unique: true },
  owner: { type: ObjectId, ref: 'User', required: true, index: true },
  sourceType: { type: String, enum: ['github', 'manual', 'guided'], required: true },
  guided: { type: ObjectId, ref: 'GuidedProject' },

  title: { type: String, required: true, trim: true, maxlength: 100 },
  summary: { type: String, trim: true, maxlength: 280, default: '' },
  problem: { type: String, maxlength: 3000, default: '' },
  solution: { type: String, maxlength: 5000, default: '' },
  features: [{ type: String, maxlength: 160 }],
  contribution: { type: String, maxlength: 1500, default: '' },
  outcomes: { type: String, maxlength: 1500, default: '' },
  limitations: { type: String, maxlength: 1500, default: '' },

  category: { type: String, enum: CATEGORIES, default: 'other', index: true },
  level: { type: String, enum: LEVELS, default: 'Beginner', index: true },
  projectStatus: { type: String, enum: ['prototype', 'in-progress', 'completed', 'archived'], default: 'completed' },
  teamType: { type: String, enum: ['individual', 'team'], default: 'individual' },
  contributors: [{ name: { type: String, maxlength: 80 }, role: { type: String, maxlength: 80 }, user: { type: ObjectId, ref: 'User' } }],
  techStack: [{ type: String, maxlength: 40 }],
  tags: [{ type: String, maxlength: 30 }],

  demoUrl: { type: String, default: '' },
  videoUrl: { type: String, default: '' },
  cover: { url: String, fileId: String },
  screenshots: [media],

  github: githubSnapshot,
  githubUnavailable: { type: Boolean, default: false }, // repo deleted / made private since import
  // Verified with a connected GitHub account.
  ownershipVerified: {
    kind: { type: String, enum: ['owner', 'contributor'] },
    login: String,
    at: Date,
  },
  // Team workspace: the owner invites members; invited members accept.
  members: [{
    user: { type: ObjectId, ref: 'User', required: true },
    role: { type: String, maxlength: 60, default: 'Member' },
    status: { type: String, enum: ['invited', 'active'], default: 'invited' },
    invitedAt: { type: Date, default: Date.now },
    joinedAt: Date,
  }],
  tasks: [{
    title: { type: String, required: true, maxlength: 140 },
    status: { type: String, enum: ['todo', 'doing', 'done'], default: 'todo' },
    assignee: { type: ObjectId, ref: 'User' },
    createdBy: { type: ObjectId, ref: 'User' },
    updatedAt: { type: Date, default: Date.now },
  }],
  githubNodeId: { type: String, default: undefined }, // duplicate detection

  visibility: { type: String, enum: ['public', 'unlisted'], default: 'public' },
  status: {
    type: String,
    enum: ['draft', 'pending_review', 'changes_requested', 'published', 'rejected', 'archived'],
    default: 'draft',
    index: true,
  },
  authorshipConfirmed: { type: Boolean, default: false },
  reviewNote: { type: String, maxlength: 1000, default: '' },
  reviewedBy: { type: ObjectId, ref: 'User' },
  reviewedAt: Date,
  featured: { type: Boolean, default: false, index: true },
  submittedAt: Date,
  publishedAt: Date,
  lastSyncedAt: Date,
  views: { type: Number, default: 0 },
}, { timestamps: true });

projectSchema.index({ githubNodeId: 1 }, { unique: true, partialFilterExpression: { githubNodeId: { $type: 'string' } } });
projectSchema.index({ title: 'text', summary: 'text', techStack: 'text', tags: 'text' });

// ---------- Build in Public updates ----------
const updateSchema = new Schema({
  project: { type: ObjectId, ref: 'Project', required: true, index: true },
  author: { type: ObjectId, ref: 'User', required: true },
  kind: { type: String, enum: ['built', 'learned', 'blocker', 'next'], default: 'built' },
  body: { type: String, required: true, maxlength: 2000 },
  link: { type: String, default: '' },
  reactions: {
    like: [{ type: ObjectId, ref: 'User' }],
    celebrate: [{ type: ObjectId, ref: 'User' }],
    helpful: [{ type: ObjectId, ref: 'User' }],
  },
  commentCount: { type: Number, default: 0 },
}, { timestamps: true });

// Comments on Build in Public updates (moderated: reported comments hide).
const commentSchema = new Schema({
  update: { type: ObjectId, ref: 'ProjectUpdate', required: true, index: true },
  project: { type: ObjectId, ref: 'Project', required: true },
  author: { type: ObjectId, ref: 'User', required: true },
  body: { type: String, required: true, maxlength: 1000 },
  reports: [{ type: ObjectId, ref: 'User' }],
  hidden: { type: Boolean, default: false },
}, { timestamps: true });

// Funnel analytics (kept 1 year).
const eventSchema = new Schema({
  name: { type: String, required: true, index: true },
  user: { type: ObjectId, ref: 'User' },
  project: { type: ObjectId, ref: 'Project' },
  guided: { type: ObjectId, ref: 'GuidedProject' },
  meta: { type: Object, default: {} },
  createdAt: { type: Date, default: Date.now, expires: 60 * 60 * 24 * 365 },
});

// ---------- Guided projects (authored by CodeSphere) ----------
const guidedSchema = new Schema({
  slug: { type: String, required: true, unique: true },
  title: { type: String, required: true, maxlength: 100 },
  summary: { type: String, maxlength: 300 },
  level: { type: String, enum: LEVELS, default: 'Beginner' },
  category: { type: String, enum: CATEGORIES, default: 'web' },
  estHours: { type: Number, default: 10 },
  prerequisites: [String],
  stack: [String],
  outcomes: [String],
  problem: { type: String, maxlength: 3000 },
  milestones: [{
    title: String,
    description: String,
    tasks: [String],
    resources: [{ title: String, url: String }],
  }],
  starterRepo: { type: String, default: '' },
  submissionCriteria: [String],
  status: { type: String, enum: ['draft', 'published'], default: 'published' },
  order: { type: Number, default: 100 },
}, { timestamps: true });

const progressSchema = new Schema({
  user: { type: ObjectId, ref: 'User', required: true },
  guided: { type: ObjectId, ref: 'GuidedProject', required: true },
  done: [String], // "milestoneIndex:taskIndex"
  repoUrl: { type: String, default: '' },
  demoUrl: { type: String, default: '' },
  project: { type: ObjectId, ref: 'Project' }, // showcase entry once submitted
  completedAt: Date,
}, { timestamps: true });
progressSchema.index({ user: 1, guided: 1 }, { unique: true });

module.exports = {
  Project: mongoose.model('Project', projectSchema),
  ProjectUpdate: mongoose.model('ProjectUpdate', updateSchema),
  ProjectComment: mongoose.model('ProjectComment', commentSchema),
  ProjectEvent: mongoose.model('ProjectEvent', eventSchema),
  GuidedProject: mongoose.model('GuidedProject', guidedSchema),
  GuidedProgress: mongoose.model('GuidedProgress', progressSchema),
  PROJECT_CATEGORIES: CATEGORIES,
  PROJECT_LEVELS: LEVELS,
};
const projectSchema = new mongoose.Schema(
  {
    // The user who owns this project
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },

    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },

    description: {
      type: String,
      required: true,
      trim: true,
      maxlength: 1000,
    },

    technologies: {
      type: [String],
      default: [],
    },

    type: {
      type: String,
      trim: true,
      default: '',
    },

    githubUrl: {
      type: String,
      trim: true,
      default: '',
    },

    liveUrl: {
      type: String,
      trim: true,
      default: '',
    },

    status: {
      type: String,
      enum: ['Completed', 'In Progress', 'Planning'],
      default: 'Completed',
    },

    featured: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('Project', projectSchema);

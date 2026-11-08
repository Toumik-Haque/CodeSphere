const mongoose = require('mongoose');

const { Schema } = mongoose;
const ObjectId = Schema.Types.ObjectId;

// ---------- Hackathons organised by CodeSphere ----------
const hackathonSchema = new Schema(
  {
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
    title: { type: String, required: true, trim: true, maxlength: 120 },
    tagline: { type: String, trim: true, maxlength: 200, default: '' },
    description: { type: String, maxlength: 20000, default: '' },
    rules: { type: String, maxlength: 10000, default: '' },
    tracks: [{ type: String, trim: true, maxlength: 60 }],
    prizes: [{ title: { type: String, maxlength: 80 }, reward: { type: String, maxlength: 120 } }],
    mode: { type: String, enum: ['online', 'offline', 'hybrid'], default: 'online' },
    venue: { type: String, trim: true, maxlength: 200, default: '' },
    bannerUrl: { type: String, trim: true, default: '' },
    regStart: { type: Date, required: true },
    regEnd: { type: Date, required: true },
    submissionStart: { type: Date, required: true },
    submissionEnd: { type: Date, required: true },
    teamMin: { type: Number, min: 1, max: 10, default: 1 },
    teamMax: { type: Number, min: 1, max: 10, default: 4 },
    status: { type: String, enum: ['draft', 'published'], default: 'draft', index: true },
    resultsPublished: { type: Boolean, default: false },
    createdBy: { type: ObjectId, ref: 'User' },
    bannerFileId: { type: String, default: '' },
    linkedinPostLink: { type: String, trim: true, default: '' },
    instagramPostLink: { type: String, trim: true, default: '' },
    // ---- Community hosting (events/hackathons submitted by students) ----
    origin: { type: String, enum: ['club', 'community'], default: 'club', index: true },
    reviewStatus: { type: String, enum: ['none', 'pending', 'approved', 'rejected'], default: 'none', index: true },
    reviewNote: { type: String, trim: true, maxlength: 1000, default: '' },
    reviewedAt: Date,
    reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    submittedAt: Date,
    hostName: { type: String, trim: true, maxlength: 120, default: '' },
    contactEmail: { type: String, trim: true, maxlength: 200, default: '' },
    contactPhone: { type: String, trim: true, maxlength: 30, default: '' },
    websiteLink: { type: String, trim: true, default: '' },
  },
  { timestamps: true },
);

const teamSchema = new Schema(
  {
    hackathon: { type: ObjectId, ref: 'Hackathon', required: true, index: true },
    name: { type: String, required: true, trim: true, maxlength: 60 },
    leader: { type: ObjectId, ref: 'User', required: true },
    members: [{ type: ObjectId, ref: 'User' }],
    inviteCode: { type: String, required: true, unique: true },
  },
  { timestamps: true },
);
teamSchema.index({ hackathon: 1, name: 1 }, { unique: true, collation: { locale: 'en', strength: 2 } });
teamSchema.index({ hackathon: 1, members: 1 });

// An uploaded file (pitch deck, prototype build, screenshot), stored on ImageKit.
const fileSchema = new Schema(
  {
    url: { type: String, required: true },
    fileId: { type: String, default: '' },
    name: { type: String, trim: true, maxlength: 140, default: '' },
    size: { type: Number, default: 0 },
    type: { type: String, default: '' },
    uploadedAt: { type: Date, default: Date.now },
  },
  { _id: false },
);

const submissionSchema = new Schema(
  {
    hackathon: { type: ObjectId, ref: 'Hackathon', required: true, index: true },
    team: { type: ObjectId, ref: 'HackathonTeam', required: true, unique: true },
    title: { type: String, required: true, trim: true, maxlength: 100 },
    tagline: { type: String, trim: true, maxlength: 200, default: '' },
    description: { type: String, maxlength: 8000, default: '' },
    // Structured write-up (like SIH / Devfolio): each part has its own box.
    problem: { type: String, maxlength: 3000, default: '' },
    solution: { type: String, maxlength: 3000, default: '' },
    challenges: { type: String, maxlength: 3000, default: '' },
    impact: { type: String, maxlength: 3000, default: '' },
    track: { type: String, trim: true, maxlength: 60, default: '' },
    techStack: [{ type: String, trim: true, maxlength: 30 }],
    repoUrl: { type: String, trim: true, default: '' },
    demoUrl: { type: String, trim: true, default: '' },
    videoUrl: { type: String, trim: true, default: '' },
    deckUrl: { type: String, trim: true, default: '' },
    deckFile: { type: fileSchema, default: undefined },
    prototypeFile: { type: fileSchema, default: undefined },
    screenshots: { type: [fileSchema], default: [] },
    // draft: saved but not handed in; submitted: final (judged, shown in the gallery).
    // Older submissions have no status and count as submitted.
    status: { type: String, enum: ['draft', 'submitted'], default: 'draft', index: true },
    submittedAt: Date,
    // Organiser review
    review: { type: String, enum: ['new', 'shortlisted', 'rejected'], default: 'new' },
    score: { type: Number, min: 0, max: 100 },
    judgeNote: { type: String, trim: true, maxlength: 2000, default: '' },
    lastEditedBy: { type: ObjectId, ref: 'User' },
    award: { type: String, trim: true, maxlength: 80, default: '' },
    rank: { type: Number, min: 1, max: 100 },
  },
  { timestamps: true },
);

// ---------- Hackathons collected from other platforms ----------
const externalSchema = new Schema(
  {
    source: { type: String, required: true, index: true },
    externalId: { type: String, required: true },
    title: { type: String, required: true },
    organizer: { type: String, default: '' },
    url: { type: String, required: true },
    image: { type: String, default: '' },
    mode: { type: String, enum: ['online', 'offline', 'hybrid'], default: 'online' },
    location: { type: String, default: '' },
    startsAt: Date,
    endsAt: Date,
    regEndsAt: Date,
    prize: { type: String, default: '' },
    themes: [String],
    teamSize: { type: String, default: '' },
    participants: { type: Number, default: 0 },
    lastSeenAt: { type: Date, default: Date.now },
  },
  { timestamps: true },
);
externalSchema.index({ source: 1, externalId: 1 }, { unique: true });
externalSchema.index({ title: 'text', organizer: 'text', themes: 'text' });

const syncSchema = new Schema({
  _id: { type: String, default: 'external-hackathons' },
  lastRunAt: Date,
  results: [{ source: String, ok: Boolean, count: Number, error: String }],
});

module.exports = {
  Hackathon: mongoose.model('Hackathon', hackathonSchema),
  HackathonTeam: mongoose.model('HackathonTeam', teamSchema),
  HackathonSubmission: mongoose.model('HackathonSubmission', submissionSchema),
  ExternalHackathon: mongoose.model('ExternalHackathon', externalSchema),
  HackathonSync: mongoose.model('HackathonSync', syncSchema),
};

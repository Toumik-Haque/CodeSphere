const mongoose = require('mongoose');

const { Schema } = mongoose;

// A Reverse Coding challenge: students see the statement, examples and
// public tests, and must write a program that reproduces the behaviour.
// Hidden tests and the reference solution never leave the server.
const testSchema = new Schema(
  {
    input: { type: String, default: '', maxlength: 5000 },
    output: { type: String, required: true, maxlength: 5000 },
    hidden: { type: Boolean, default: true },
  },
  { _id: false },
);

const exampleSchema = new Schema(
  {
    input: { type: String, default: '', maxlength: 2000 },
    output: { type: String, required: true, maxlength: 2000 },
    explanation: { type: String, default: '', maxlength: 500 },
  },
  { _id: false },
);

const challengeSchema = new Schema(
  {
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
    title: { type: String, required: true, trim: true, maxlength: 120 },
    // output | io | pattern | algorithm | bug | logic
    format: { type: String, required: true },
    level: { type: String, enum: ['Beginner', 'Intermediate', 'Advanced'], required: true },
    topic: { type: String, required: true, trim: true, maxlength: 40 },
    tags: { type: [String], default: [] },
    points: { type: Number, required: true, min: 5, max: 200 },
    estMinutes: { type: Number, default: 10 },
    languages: { type: [String], default: ['python'] },

    statement: { type: String, required: true, maxlength: 6000 },
    inputFormat: { type: String, default: '', maxlength: 1000 },
    outputFormat: { type: String, default: '', maxlength: 1000 },
    constraints: { type: String, default: '', maxlength: 1000 },
    examples: { type: [exampleSchema], default: [] },
    // Partial or buggy code students start from (format "bug").
    starterCode: { type: Map, of: String, default: {} },
    hints: { type: [String], default: [] },
    editorial: { type: String, default: '', maxlength: 6000 },

    tests: { type: [testSchema], default: [] },
    referenceSolution: {
      language: { type: String, default: 'python' },
      code: { type: String, default: '', maxlength: 20000 },
    },
    // How outputs are compared: exact (only the final newline is ignored),
    // trim (trailing spaces/blank lines ignored; leading spaces matter, good
    // for patterns), tokens (any whitespace is equivalent).
    outputPolicy: { type: String, enum: ['exact', 'trim', 'tokens'], default: 'trim' },
    timeLimit: { type: Number, default: 2, min: 1, max: 10 },
    memoryLimitKb: { type: Number, default: 128000, min: 16000, max: 512000 },

    status: { type: String, enum: ['draft', 'published', 'retired'], default: 'draft', index: true },
    publishedAt: { type: Date, default: null },
    sendNotification: { type: Boolean, default: true },
    sendEmail: { type: Boolean, default: true },
    notifiedAt: { type: Date, default: null },
    featured: { type: Boolean, default: false },
    validatedAt: { type: Date, default: null },
    validationNote: { type: String, default: '' },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
    updatedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true },
);

// One run or submission. Hidden test details are never stored per attempt.
const attemptSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    challenge: { type: Schema.Types.ObjectId, ref: 'ReverseChallenge', required: true, index: true },
    kind: { type: String, enum: ['run', 'submit'], required: true },
    language: { type: String, required: true },
    // Kept so students can see their own history (never shown to others).
    code: { type: String, default: '', maxlength: 20000 },
    // accepted | wrong | compile-error | runtime-error | timeout | system-error
    verdict: { type: String, required: true },
    passed: { type: Number, default: 0 },
    total: { type: Number, default: 0 },
    score: { type: Number, default: 0 },
    runtimeMs: { type: Number, default: null },
  },
  { timestamps: true },
);
attemptSchema.index({ user: 1, challenge: 1, kind: 1, createdAt: -1 });

const bookmarkSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    challenge: { type: Schema.Types.ObjectId, ref: 'ReverseChallenge', required: true },
  },
  { timestamps: true },
);
bookmarkSchema.index({ user: 1, challenge: 1 }, { unique: true });

module.exports = {
  ReverseChallenge: mongoose.model('ReverseChallenge', challengeSchema),
  ReverseAttempt: mongoose.model('ReverseAttempt', attemptSchema),
  ReverseBookmark: mongoose.model('ReverseBookmark', bookmarkSchema),
};

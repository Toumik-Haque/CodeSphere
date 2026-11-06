const mongoose = require('mongoose');

// One document per student: their daily Debugging Arena state and history.
// Dates are stored as YYYY-MM-DD strings in India time (see routes/debugRoutes.js).
const completedSchema = new mongoose.Schema(
  {
    bugId: { type: String, required: true },
    picked: { type: Number, required: true },
    correct: { type: Boolean, required: true },
    // XP earned for this bug (0 if wrong). No default on purpose: entries
    // saved before XP existed are scored by level (utils/progress.js).
    xp: { type: Number },
    date: { type: String, required: true },
    completedAt: { type: Date, default: Date.now },
  },
  { _id: false },
);

const debugProgressSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
    },
    // Today's assigned challenge, until it's submitted.
    current: {
      bugId: String,
      date: String,
    },
    completed: {
      type: [completedSchema],
      default: [],
    },
    // Streak = consecutive days with a correctly fixed bug.
    streak: { type: Number, default: 0 },
    bestStreak: { type: Number, default: 0 },
    // Last day the bug was fixed correctly.
    lastCompletedDate: { type: String, default: null },
  },
  { timestamps: true },
);

module.exports = mongoose.model('DebugProgress', debugProgressSchema);

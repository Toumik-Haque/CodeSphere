const mongoose = require('mongoose');

// One document per student: their daily Debugging Arena state and history.
// Dates are stored as YYYY-MM-DD strings in India time (see routes/debugRoutes.js).
const completedSchema = new mongoose.Schema(
  {
    bugId: { type: String, required: true },
    picked: { type: Number, required: true },
    correct: { type: Boolean, required: true },
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
    streak: { type: Number, default: 0 },
    bestStreak: { type: Number, default: 0 },
    lastCompletedDate: { type: String, default: null },
  },
  { timestamps: true },
);

module.exports = mongoose.model('DebugProgress', debugProgressSchema);

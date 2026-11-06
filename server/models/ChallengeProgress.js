const mongoose = require('mongoose');

// Playground coding challenges a student has solved (verified by the server).
const solvedSchema = new mongoose.Schema(
  {
    challengeId: { type: String, required: true },
    language: { type: String, required: true },
    solvedAt: { type: Date, default: Date.now },
  },
  { _id: false },
);

const challengeProgressSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
    },
    solved: {
      type: [solvedSchema],
      default: [],
    },
  },
  { timestamps: true },
);

module.exports = mongoose.model('ChallengeProgress', challengeProgressSchema);

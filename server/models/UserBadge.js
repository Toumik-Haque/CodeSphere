const mongoose = require('mongoose');

// A badge a student has earned. Saved the moment it's earned, so badges are
// never lost (e.g. when a streak ends). Admin badges also store who gave
// them and an optional note.
const userBadgeSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    badgeId: { type: String, required: true },
    earnedAt: { type: Date, default: Date.now },
    // False until the student has seen it (used for the "new badge" toast).
    seen: { type: Boolean, default: false },
    awardedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    note: { type: String, trim: true, maxlength: 200 },
  },
  { timestamps: true },
);

userBadgeSchema.index({ user: 1, badgeId: 1 }, { unique: true });

module.exports = mongoose.model('UserBadge', userBadgeSchema);

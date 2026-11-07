const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 80,
    },
    collegeName: {
      type: String,
      required: true,
      trim: true,
      maxlength: 150,
      default: 'ALIPURDUAR GOVERNMENT ENGINEERING AND MANAGEMENT COLLEGE',
    },
    yearOfStudy: {
      type: String,
      required: true,
      enum: ['1st Year', '2nd Year', '3rd Year', '4th Year'],
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      required: true,
      select: false,
    },
    role: {
      type: String,
      enum: ['user', 'admin'],
      default: 'user',
    },
    // Self-reported by the Profile page when the profile reaches 100%.
    profileComplete: {
      type: Boolean,
      default: false,
    },
    // Up to 3 earned badge ids the student pins to their profile.
    badgeShowcase: {
      type: [String],
      default: [],
    },
    // Extra staff permissions an admin can grant to a student:
    // moderator (forum), news-editor (Tech News), challenge-editor (Reverse Coding).
    staffRoles: {
      type: [String],
      enum: ['moderator', 'news-editor', 'challenge-editor'],
      default: [],
    },
    // Notification types the student has muted (see utils/notify.js).
    mutedNotifications: {
      type: [String],
      default: [],
    },
    // Set by forum moderators: no forum posting until this date.
    forumMutedUntil: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('User', userSchema);
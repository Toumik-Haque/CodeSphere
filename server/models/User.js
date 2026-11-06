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
  },
  { timestamps: true }
);

module.exports = mongoose.model('User', userSchema);
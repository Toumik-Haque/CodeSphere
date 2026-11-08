
const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
  {
    // Basic account information
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 80,
    },

    username: {
      type: String,
      lowercase: true,
      trim: true,
      minlength: 3,
      maxlength: 30,
      match: /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
      unique: true,
      sparse: true,
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

    // Academic information
    collegeName: {
      type: String,
      required: true,
      trim: true,
      maxlength: 150,
      default:
        'ALIPURDUAR GOVERNMENT ENGINEERING AND MANAGEMENT COLLEGE',
    },

    yearOfStudy: {
      type: String,
      required: true,
      enum: ['1st Year', '2nd Year', '3rd Year', '4th Year'],
    },

    // Developer profile information
    profileImage: {
      url: {
        type: String,
        default: '',
      },
      fileId: {
        type: String,
        default: '',
      },
    },

    bannerImage: {
      url: {
        type: String,
        default: '',
      },
      fileId: {
        type: String,
        default: '',
      },
    },

    bio: {
      type: String,
      trim: true,
      maxlength: 500,
      default: '',
    },

    phone: {
      type: String,
      trim: true,
      maxlength: 30,
      default: '',
    },

    city: {
      type: String,
      trim: true,
      maxlength: 100,
      default: '',
    },

    gender: {
      type: String,
      enum: ['', 'Male', 'Female', 'Prefer not to say', 'Other'],
      default: '',
    },

    dateOfBirth: {
      type: String,
      trim: true,
      default: '',
    },

    degree: {
      type: String,
      trim: true,
      default: '',
    },

    department: {
      type: String,
      trim: true,
      default: '',
    },

    graduationYear: {
      type: String,
      trim: true,
      default: '',
    },

    github: {
      type: String,
      trim: true,
      default: '',
    },

    linkedin: {
      type: String,
      trim: true,
      default: '',
    },

    portfolio: {
      type: String,
      trim: true,
      default: '',
    },

    technicalInterests: {
      type: [String],
      default: [],
    },

    skills: {
      type: [String],
      default: [],
    },

    skillDetails: {
      type: [{
        name: { type: String, trim: true, required: true },
        level: {
          type: String,
          enum: ['Beginner', 'Intermediate', 'Advanced'],
          default: 'Intermediate',
        },
      }],
      default: [],
    },

    codingProfiles: {
      type: [{
        platform: { type: String, trim: true, required: true },
        url: { type: String, trim: true, required: true },
      }],
      default: [],
    },

    achievements: {
      type: [{
        title: { type: String, trim: true, required: true },
        category: { type: String, trim: true, default: '' },
        issuer: { type: String, trim: true, default: '' },
        year: { type: String, trim: true, default: '' },
        link: { type: String, trim: true, default: '' },
      }],
      default: [],
    },

    learningGoals: {
      type: [String],
      default: [],
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
      enum: ['moderator', 'news-editor', 'challenge-editor', 'hackathon-organizer', 'project-reviewer'],
      default: [],
    },
    // Opted in to the weekly Tech Brief email.
    // Profile photo (ImageKit) shown in the forum and leaderboards.
    avatarUrl: { type: String, default: '' },
    avatarFileId: { type: String, default: '' },
    // Connected GitHub identity (Project Hub verification). No token is stored.
    github: {
      id: Number,
      login: String,
      connectedAt: Date,
    },
    // Profile banner image (ImageKit).
    bannerUrl: { type: String, default: '' },
    bannerFileId: { type: String, default: '' },
    // Saved resume (PDF or image on ImageKit), visible only to its owner.
    resume: {
      url: { type: String, default: '' },
      fileId: { type: String, default: '' },
      name: { type: String, default: '' },
      size: { type: Number, default: 0 },
      type: { type: String, default: '' },
      uploadedAt: Date,
    },
    // Daily "Today in Tech" email (separate from the weekly newsletter).
    dailyNewsOptIn: { type: Boolean, default: false },
    newsletterOptIn: {
      type: Boolean,
      default: false,
    },
    updateEmailsOptOut: { type: Boolean, default: false },
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
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('User', userSchema);

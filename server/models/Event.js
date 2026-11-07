
const mongoose = require('mongoose');

const eventSchema = new mongoose.Schema(
  {
    bannerImage: {
      url: {
        type: String,
        default: '',
      },
      publicId: {
        type: String,
        default: '',
      },
      provider: {
        type: String,
        enum: ['imagekit', ''],
        default: '',
      },
    },
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 120,
    },
    slug: {
      type: String,
      unique: true,
      sparse: true,
      trim: true,
    },
    category: {
      type: String,
      required: true,
      enum: ['Workshop', 'Hackathon', 'Community Meetup'],
    },
    description: {
      type: String,
      required: true,
      trim: true,
      maxlength: 30000,
    },
    date: {
      type: Date,
      required: true,
    },
    endDate: {
      type: Date,
      default: null,
    },
    venue: {
      type: String,
      trim: true,
      maxlength: 200,
      default: '',
    },
    mode: {
      type: String,
      enum: ['In-person', 'Online', 'Hybrid'],
      default: 'In-person',
    },
    meetingLink: {
      type: String,
      trim: true,
      default: '',
    },
    registrationLink: {
      type: String,
      trim: true,
      default: '',
    },
    linkedinPostLink: {
      type: String,
      trim: true,
      default: '',
    },
    instagramPostLink: {
      type: String,
      trim: true,
      default: '',
    },
    rules: { type: String, trim: true, maxlength: 10000, default: '' },
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
    status: {
      type: String,
      enum: ['draft', 'published'],
      default: 'draft',
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  { timestamps: true }
);

eventSchema.index({ category: 1, status: 1, date: 1 });

module.exports = mongoose.model('Event', eventSchema);

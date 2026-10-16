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
      maxlength: 5000,
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
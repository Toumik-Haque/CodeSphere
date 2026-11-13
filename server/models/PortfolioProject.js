const mongoose = require('mongoose');
// Simple portfolio projects shown on a student's profile (title, description,
// technologies, links). Separate from the Project Hub (models/Project.js).

const projectSchema = new mongoose.Schema(
  {
    // The user who owns this project
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },

    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },

    description: {
      type: String,
      required: true,
      trim: true,
      maxlength: 1000,
    },

    technologies: {
      type: [String],
      default: [],
    },

    type: {
      type: String,
      trim: true,
      default: '',
    },

    githubUrl: {
      type: String,
      trim: true,
      default: '',
    },

    liveUrl: {
      type: String,
      trim: true,
      default: '',
    },

    status: {
      type: String,
      enum: ['Completed', 'In Progress', 'Planning'],
      default: 'Completed',
    },

    featured: {
      type: Boolean,
      default: false,
    },

    // Position chosen by the student on their profile. Missing values fall
    // back to the default featured/updated ordering.
    order: {
      type: Number,
      min: 0,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('PortfolioProject', projectSchema);
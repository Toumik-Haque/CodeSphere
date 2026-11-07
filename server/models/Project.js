const mongoose = require('mongoose');

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
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('Project', projectSchema);
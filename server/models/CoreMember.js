const mongoose = require('mongoose');

const coreMemberSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Member name is required.'],
      trim: true,
      maxlength: 100,
    },

    role: {
      type: String,
      required: [true, 'Member role is required.'],
      trim: true,
      maxlength: 100,
    },

    image: {
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

    githubLink: {
      type: String,
      trim: true,
      default: '',
      maxlength: 500,
    },

    linkedinLink: {
      type: String,
      trim: true,
      default: '',
      maxlength: 500,
    },

    instagramLink: {
      type: String,
      trim: true,
      default: '',
      maxlength: 500,
    },

    order: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('CoreMember', coreMemberSchema);

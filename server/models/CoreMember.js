
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
    },

    link: {
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

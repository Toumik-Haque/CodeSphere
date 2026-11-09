const mongoose = require('mongoose');

// Admins live in their own collection (`admins`), separate from students in
// `users`. The document keeps the same shape as a user so the existing admin
// panel and JWT flow keep working after an account is migrated.
const adminSchema = new mongoose.Schema(
  {
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
      enum: ['admin'],
      default: 'admin',
    },

    collegeName: {
      type: String,
      trim: true,
      default: '',
    },

    yearOfStudy: {
      type: String,
      trim: true,
      default: '',
    },

    profileImage: {
      url: { type: String, default: '' },
      fileId: { type: String, default: '' },
    },

    staffRoles: {
      type: [String],
      default: [],
    },
  },
  {
    timestamps: true,
    strict: false,
  }
);

module.exports = mongoose.model('Admin', adminSchema);

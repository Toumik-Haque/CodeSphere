
const mongoose = require('mongoose');

const registrationSchema = new mongoose.Schema(
  {
    event: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Event',
      required: true,
    },

    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },

    status: {
      type: String,
      enum: ['registered', 'cancelled'],
      default: 'registered',
    },

    registeredAt: {
      type: Date,
      default: Date.now,
    },

    cancelledAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

// Prevent duplicate registration records for the same event and user.
registrationSchema.index(
  { event: 1, user: 1 },
  { unique: true }
);

// Useful for retrieving event participants.
registrationSchema.index({ event: 1, status: 1 });

// Useful for retrieving a member's registrations.
registrationSchema.index({ user: 1, status: 1, registeredAt: -1 });

module.exports = mongoose.model('Registration', registrationSchema);

const mongoose = require('mongoose');

const announcementSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true, maxlength: 120 },
    body: { type: String, required: true, maxlength: 30000 },
    attachments: [{
      name: { type: String, required: true, maxlength: 200 },
      type: { type: String, enum: ['image', 'document'], required: true },
      url: { type: String, required: true },
      fileId: { type: String, default: '' },
    }],
    audience: { type: String, default: '@all', maxlength: 500 },
    recipientUsernames: [{ type: String, lowercase: true, trim: true }],
    publishedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    publishedAt: { type: Date, default: Date.now, index: true },
  },
  { timestamps: true },
);

module.exports = mongoose.model('Announcement', announcementSchema);

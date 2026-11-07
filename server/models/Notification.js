const mongoose = require('mongoose');

// One in-app notification, shared by every module (forum, news, reverse
// coding, badges...). `link` is a path inside the site.
const notificationSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    type: {
      type: String,
      required: true,
      enum: [
        'forum-reply',
        'forum-mention',
        'forum-moderation',
        'forum-report-reviewed',
        'reverse-result',
        'reverse-new',
        'news-digest',
        'news-daily',
        'hackathon',
        'host-review',
        'project',
        'system',
      ],
    },
    title: { type: String, required: true, maxlength: 200 },
    body: { type: String, default: '', maxlength: 400 },
    link: { type: String, default: '' },
    read: { type: Boolean, default: false },
  },
  { timestamps: true },
);

notificationSchema.index({ user: 1, createdAt: -1 });
notificationSchema.index({ user: 1, read: 1 });

module.exports = mongoose.model('Notification', notificationSchema);

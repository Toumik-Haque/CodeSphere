const Notification = require('../models/Notification');
const User = require('../models/User');
const { pushToUser } = require('./realtime');

// Notification types a student can mute (see User.mutedNotifications).
const MUTABLE_TYPES = ['forum-reply', 'reverse-new', 'news-digest'];

/**
 * Create notifications for one or more users. Never throws: a failed
 * notification must not break the action that triggered it.
 */
async function notify(userIds, { type, title, body = '', link = '' }) {
  try {
    const ids = [...new Set((Array.isArray(userIds) ? userIds : [userIds]).map(String))];
    if (!ids.length) return;

    let recipients = ids;
    if (MUTABLE_TYPES.includes(type)) {
      const muted = await User.find({ _id: { $in: ids }, mutedNotifications: type }).select('_id').lean();
      const mutedSet = new Set(muted.map((u) => String(u._id)));
      recipients = ids.filter((id) => !mutedSet.has(id));
    }

    if (recipients.length) {
      await Notification.insertMany(recipients.map((user) => ({ user, type, title, body, link })));
      // Live update for anyone with the site open.
      recipients.forEach((user) => pushToUser(user, 'notification', { type, title, link }));
    }
  } catch (error) {
    console.error('Notify error:', error.message);
  }
}

module.exports = { notify, MUTABLE_TYPES };

const { ReverseChallenge } = require('../models/Reverse');
const { broadcastUpdate } = require('./broadcast');

async function notifyLiveChallenges() {
  const due = await ReverseChallenge.find({
    status: 'published',
    publishedAt: { $lte: new Date() },
    notifiedAt: null,
  }).limit(100);

  for (const challenge of due) {
    await broadcastUpdate({
      title: `New ${challenge.level} Reverse Coding challenge: ${challenge.title}`,
      body: challenge.statement.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').slice(0, 400),
      link: `/reverse-coding/${challenge.slug}`,
      sendNotification: challenge.sendNotification,
      sendEmail: false,
      notificationType: 'reverse-new',
    });
    challenge.notifiedAt = new Date();
    await challenge.save();
  }
}

function startReverseNotifications() {
  if (process.env.REVERSE_NOTIFICATIONS === 'off') return;
  const run = () => notifyLiveChallenges().catch((error) => console.error('Reverse notification scheduler error:', error.message));
  setTimeout(run, 30 * 1000).unref();
  setInterval(run, 60 * 1000).unref();
}

module.exports = { notifyLiveChallenges, startReverseNotifications };

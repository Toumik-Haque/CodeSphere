// Daily "Today's bug" reminder email for every registered member, showing their
// own streak. Sent once a day (default 9:00 AM IST); members who already solved
// today's bug or opted out of update emails are skipped.
//
// Settings: BUG_REMINDER=off disables it; BUG_REMINDER_HOUR (0-23, IST) sets the time.
const JobRun = require('../models/JobRun');
const User = require('../models/User');
const DebugProgress = require('../models/DebugProgress');
const { isEmailConfigured, unsubscribeToken } = require('./newsletter');
const { escapeHtml, renderEmail, siteUrl, apiUrl, preferencesUrl } = require('./emailTemplates');
const { dateInIndia, liveStreak } = require('./progress');

const BATCH_SIZE = 500;
const ARENA_PATH = '/playground#debugging-arena';



const reminderHour = () => {
  const hour = Number(process.env.BUG_REMINDER_HOUR);
  return Number.isInteger(hour) && hour >= 0 && hour <= 23 ? hour : 9;
};

const hourInIndia = () => Number(new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Kolkata', hour: '2-digit', hour12: false }).format(new Date()));

function reminderFor(user, progress, today) {
  const streak = liveStreak(progress, today);
  const best = progress?.bestStreak || 0;
  const subject = streak > 0
    ? `🔥 Keep your ${streak}-day streak alive: today's bug is waiting`
    : "🐞 Today's bug is ready. Start a streak!";
  const title = streak > 0 ? `Day ${streak + 1} is waiting, ${user.name.split(' ')[0]}!` : `Today's bug is ready, ${user.name.split(' ')[0]}`;
  const lead = streak > 0
    ? `You've fixed a bug ${streak} day${streak === 1 ? '' : 's'} in a row. Solve today's to keep the streak going. Miss today and it resets to zero.`
    : 'A fresh bug is waiting in the Debugging Arena. Spot the problem, pick the fix and earn XP. Solve one every day to build a streak.';

  const tile = (value, label, color) => `
    <td width="50%" style="padding:6px">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:${color};border-radius:12px">
        <tr><td align="center" style="padding:14px 8px">
          <div style="color:#153653;font-size:26px;font-weight:800;line-height:1.1">${escapeHtml(value)}</div>
          <div style="margin-top:4px;color:#5b7083;font-size:12px;font-weight:700">${escapeHtml(label)}</div>
        </td></tr>
      </table>
    </td>`;
  const body = `
    <p style="margin:0 0 16px;color:#34465a">${escapeHtml(lead)}</p>
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin:0 0 6px">
      <tr>${tile(`${streak} 🔥`, 'Current streak', '#fff3ec')}${tile(`${best}`, 'Best streak', '#eef5fb')}</tr>
    </table>
    <p style="margin:12px 0 0;color:#5b7083;font-size:13px">A new bug unlocks every day at midnight (IST). Longer streaks earn bonus XP.</p>`;

  const unsubscribe = `${apiUrl()}/newsletter/unsubscribe?u=${user._id}&t=${unsubscribeToken(user._id)}&list=updates`;
  return {
    to: [{ email: user.email, name: user.name }],
    subject,
    htmlContent: renderEmail({
      preheader: lead.slice(0, 150),
      eyebrow: 'DAILY DEBUGGING ARENA',
      title,
      body,
      ctaLabel: streak > 0 ? 'Fix today’s bug' : 'Solve today’s bug',
      ctaUrl: `${siteUrl()}${ARENA_PATH}`,
      footerNote: 'You get this because you opted in to community update emails.',
      unsubscribeUrl: unsubscribe,
      preferencesUrl: preferencesUrl(),
    }),
    textContent: `${title}\n\n${lead}\n\nCurrent streak: ${streak}  ·  Best streak: ${best}\n\nSolve it: ${siteUrl()}${ARENA_PATH}\n\nUnsubscribe: ${unsubscribe}`,
  };
}

async function sendBugReminders(today = dateInIndia()) {
  const users = await User.find({ role: 'user', email: { $ne: '' }, updateEmailsOptOut: { $ne: true } })
    .select('_id name email')
    .lean();
  const progress = await DebugProgress.find({ user: { $in: users.map((u) => u._id) } })
    .select('user streak bestStreak lastCompletedDate')
    .lean();
  const byUser = new Map(progress.map((p) => [String(p.user), p]));

  // Already solved today: no reminder needed.
  const versions = users
    .filter((u) => u.email && byUser.get(String(u._id))?.lastCompletedDate !== today)
    .map((u) => reminderFor(u, byUser.get(String(u._id)), today));

  let sent = 0;
  for (let i = 0; i < versions.length; i += BATCH_SIZE) {
    const batch = versions.slice(i, i + BATCH_SIZE);
    try {
      const response = await fetch(process.env.BREVO_API_URL || 'https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        headers: { 'api-key': process.env.BREVO_API_KEY, 'Content-Type': 'application/json', accept: 'application/json' },
        body: JSON.stringify({
          sender: { name: process.env.BREVO_SENDER_NAME || 'CodeSphere', email: process.env.BREVO_SENDER_EMAIL },
          subject: batch[0].subject,
          htmlContent: batch[0].htmlContent,
          messageVersions: batch,
        }),
        signal: AbortSignal.timeout(20000),
      });
      if (!response.ok) {
        console.error('Bug reminder batch failed:', response.status, await response.text());
        continue;
      }
      sent += batch.length;
    } catch (error) {
      console.error('Bug reminder batch failed:', error.message);
    }
  }
  return { sent, attempted: versions.length };
}

async function tick() {
  if (!isEmailConfigured()) return;
  if (hourInIndia() < reminderHour()) return;
  const today = dateInIndia();
  // Claim today's run atomically: only one server (or restart) sends it.
  const claimed = await JobRun.findOneAndUpdate(
    { _id: 'bug-reminder', lastDate: { $ne: today } },
    { $set: { lastDate: today, lastRunAt: new Date() } },
    { upsert: true, new: true },
  ).catch((error) => (error.code === 11000 ? null : Promise.reject(error)));
  if (!claimed) return;
  const result = await sendBugReminders(today);
  await JobRun.updateOne({ _id: 'bug-reminder' }, { $set: { sent: result.sent } });
  console.log(`Daily bug reminder: sent ${result.sent} of ${result.attempted}.`);
}

function startBugReminder() {
  if (process.env.BUG_REMINDER === 'off') return;
  const run = () => tick().catch((error) => console.error('Bug reminder error:', error.message));
  setTimeout(run, 30000).unref();
  setInterval(run, 10 * 60 * 1000).unref();
}

module.exports = { startBugReminder, sendBugReminders, reminderFor };

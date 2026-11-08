const User = require('../models/User');
const { notify } = require('./notify');
const { isEmailConfigured, unsubscribeToken } = require('./newsletter');

const BATCH_SIZE = 500;
const siteUrl = () => (process.env.CLIENT_URL || 'http://localhost:5173').replace(/\/+$/, '');
const apiUrl = () => (process.env.API_PUBLIC_URL || `http://localhost:${process.env.PORT || 5000}/api`).replace(/\/+$/, '');
const escapeHtml = (value) => String(value ?? '')
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#39;');

async function sendUpdateEmails(users, { title, body, link, htmlBody = '', emailExcludeUserIds = [] }) {
  if (!isEmailConfigured()) {
    console.warn('Update email delivery skipped: Brevo is not configured.');
    return { sent: 0, attempted: 0, skipped: true };
  }

  const excluded = new Set(emailExcludeUserIds.map(String));
  const recipients = users.filter((user) => !user.updateEmailsOptOut && user.email && !excluded.has(String(user._id)));
  if (!recipients.length) return { sent: 0, attempted: 0, skipped: false };

  let sent = 0;
  for (let i = 0; i < recipients.length; i += BATCH_SIZE) {
    const batch = recipients.slice(i, i + BATCH_SIZE);
    const versions = batch.map((user) => {
      const unsubscribe = `${apiUrl()}/newsletter/unsubscribe?u=${user._id}&t=${unsubscribeToken(user._id)}&list=updates`;
      const content = htmlBody || `<p style="color:#34465a">${escapeHtml(body)}</p>`;
      const htmlContent = `<!doctype html><html><body style="margin:0;background:#f4f8fc;font-family:Arial,sans-serif">
        <table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:24px 12px">
        <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;background:#fff;border-radius:16px;padding:24px">
        <tr><td><div style="color:#f05a36;font-size:12px;font-weight:700;letter-spacing:1px">CODESPHERE COMMUNITY UPDATE</div>
        <h1 style="color:#10243a;font-size:23px;margin:10px 0 16px">${escapeHtml(title)}</h1>
        <div style="color:#34465a;font-size:15px;line-height:1.6">${content}</div>
        <p style="margin:22px 0;text-align:center"><a href="${escapeHtml(`${siteUrl()}${link}`)}" style="display:inline-block;background:#f05a36;color:#fff;padding:12px 22px;border-radius:10px;text-decoration:none;font-weight:700">View update</a></p>
        <p style="color:#8a99a8;font-size:12px;text-align:center">You received this because you have a CodeSphere account.
        <a href="${escapeHtml(unsubscribe)}" style="color:#617287">Unsubscribe from update emails</a></p>
        </td></tr></table></td></tr></table></body></html>`;
      const textContent = `${title}\n\n${body}\n\nView update: ${siteUrl()}${link}\nUnsubscribe: ${unsubscribe}`;
      return {
        to: [{ email: user.email, name: user.name }],
        htmlContent,
        textContent,
      };
    });

    try {
      const response = await fetch(process.env.BREVO_API_URL || 'https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        headers: {
          'api-key': process.env.BREVO_API_KEY,
          'Content-Type': 'application/json',
          accept: 'application/json',
        },
        body: JSON.stringify({
          sender: {
            name: process.env.BREVO_SENDER_NAME || 'CodeSphere',
            email: process.env.BREVO_SENDER_EMAIL,
          },
          subject: `CodeSphere update: ${title}`.slice(0, 150),
          htmlContent: versions[0].htmlContent,
          messageVersions: versions,
        }),
        signal: AbortSignal.timeout(20000),
      });

      if (!response.ok) {
        console.error('Update email batch failed:', response.status, await response.text());
        continue;
      }

      sent += batch.length;
    } catch (error) {
      console.error('Update email batch failed:', error.message);
    }
  }

  return { sent, attempted: recipients.length, skipped: false };
}

async function broadcastUpdate({
  title,
  body = '',
  link,
  htmlBody = '',
  emailExcludeUserIds = [],
  notificationExcludeUserIds = [],
  sendNotification = true,
  sendEmail = true,
}) {
  try {
    const users = await User.find({ role: 'user' })
      .select('_id name email updateEmailsOptOut')
      .lean();
    const excludedNotifications = new Set(notificationExcludeUserIds.map(String));
    const ids = users
      .filter((user) => !excludedNotifications.has(String(user._id)))
      .map((user) => user._id);

    const [, emailResult] = await Promise.all([
      sendNotification ? notify(ids, {
        type: 'announcement',
        title: title.slice(0, 200),
        body: body.slice(0, 400),
        link,
      }) : Promise.resolve(),
      sendEmail
        ? sendUpdateEmails(users, { title, body, link, htmlBody, emailExcludeUserIds })
        : Promise.resolve({ sent: 0, attempted: 0, skipped: true, disabled: true }),
    ]);
    return { emails: emailResult };
  } catch (error) {
    console.error('Broadcast update error:', error.message);
    return { notifications: { created: 0 }, emails: { sent: 0, attempted: 0, skipped: true } };
  }
}

function getBroadcastOptions(body = {}) {
  const enabled = (value) => value === undefined || value === true || value === 'true';
  return {
    sendNotification: enabled(body.sendNotification),
    sendEmail: enabled(body.sendEmail),
  };
}

module.exports = { broadcastUpdate, getBroadcastOptions };

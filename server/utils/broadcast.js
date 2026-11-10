const User = require('../models/User');
const { notify } = require('./notify');
const { isEmailConfigured, unsubscribeToken } = require('./newsletter');
const {
  escapeHtml,
  renderEmail,
  siteUrl,
  apiUrl,
  preferencesUrl,
} = require('./emailTemplates');

const BATCH_SIZE = 500;

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
      const htmlContent = renderEmail({
        preheader: body ? body.slice(0, 160) : title,
        eyebrow: 'CODESPHERE COMMUNITY UPDATE',
        title,
        body: content,
        ctaLabel: link ? 'View update' : '',
        ctaUrl: link ? `${siteUrl()}${link}` : '',
        footerNote: 'You are receiving this because you opted in to community update emails.',
        unsubscribeUrl: unsubscribe,
        preferencesUrl: preferencesUrl(),
      });
      const textContent = `${title}\n\n${body}\n\n${link ? `View update: ${siteUrl()}${link}\n` : ''}Unsubscribe: ${unsubscribe}`;
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
  recipientUserIds = null,
  notificationType = 'announcement',
  sendNotification = true,
  sendEmail = true,
}) {
  try {
    const query = { role: 'user' };
    if (Array.isArray(recipientUserIds)) query._id = { $in: recipientUserIds };
    const users = await User.find(query)
      .select('_id name email updateEmailsOptOut')
      .lean();
    const excludedNotifications = new Set(notificationExcludeUserIds.map(String));
    const ids = users
      .filter((user) => !excludedNotifications.has(String(user._id)))
      .map((user) => user._id);

    const [, emailResult] = await Promise.all([
      sendNotification && ids.length ? notify(ids, {
        type: notificationType,
        title: title.slice(0, 200),
        body: body.slice(0, 400),
        link,
      }) : Promise.resolve(),
      sendEmail
        ? sendUpdateEmails(users, { title, body, link, htmlBody, emailExcludeUserIds })
        : Promise.resolve({ sent: 0, attempted: 0, skipped: true, disabled: true }),
    ]);
    return { targeted: users.length, emails: emailResult };
  } catch (error) {
    console.error('Broadcast update error:', error.message);
    return { targeted: 0, notifications: { created: 0 }, emails: { sent: 0, attempted: 0, skipped: true } };
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

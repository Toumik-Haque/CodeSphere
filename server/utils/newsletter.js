// Weekly Tech Brief email (opt-in) sent through Brevo.
//
// Env: BREVO_API_KEY, BREVO_SENDER_EMAIL, BREVO_SENDER_NAME, CLIENT_URL
//      (site link in emails), API_PUBLIC_URL (for the unsubscribe link;
//      defaults to http://localhost:<PORT>/api), BREVO_API_URL (override).

const crypto = require('crypto');
const User = require('../models/User');
const { NewsItem } = require('../models/News');

const BATCH_SIZE = 500; // recipients per Brevo request (messageVersions)

const siteUrl = () => (process.env.CLIENT_URL || 'http://localhost:5173').replace(/\/+$/, '');
const apiUrl = () => (process.env.API_PUBLIC_URL || `http://localhost:${process.env.PORT || 5000}/api`).replace(/\/+$/, '');

function isEmailConfigured() {
  return Boolean(process.env.BREVO_API_KEY && process.env.BREVO_SENDER_EMAIL);
}

// Signed so nobody can unsubscribe someone else.
function unsubscribeToken(userId) {
  return crypto.createHmac('sha256', process.env.JWT_SECRET || 'codesphere').update(`unsubscribe:${userId}`).digest('hex').slice(0, 32);
}

function verifyUnsubscribe(userId, token) {
  const expected = unsubscribeToken(userId);
  return typeof token === 'string' && token.length === expected.length
    && crypto.timingSafeEqual(Buffer.from(token), Buffer.from(expected));
}

const escape = (text) => String(text ?? '')
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');

const safeUrl = (url) => (/^https?:\/\//i.test(url || '') ? escape(url) : '#');

function storyHtml(item, top = false) {
  return `
    <tr><td style="padding:${top ? '18px' : '14px'} 0;border-bottom:1px solid #e6edf4">
      ${top ? '<div style="color:#f05a36;font-size:12px;font-weight:700;letter-spacing:1px">TOP STORY</div>' : ''}
      <a href="${safeUrl(item.canonicalUrl)}" style="color:#10243a;font-size:${top ? '20px' : '16px'};font-weight:700;text-decoration:none">${escape(item.title)}</a>
      <div style="color:#617287;font-size:12px;margin:4px 0">${escape(item.sourceName)}${item.publishedAt ? ` · ${new Date(item.publishedAt).toDateString()}` : ''}</div>
      ${item.editorSummary ? `<p style="color:#26384b;font-size:14px;margin:6px 0">${escape(item.editorSummary)}</p>` : ''}
      ${top && item.whyItMatters ? `<p style="background:#fff8e6;color:#5c4300;font-size:14px;padding:10px;border-radius:8px"><b>Why developers should care:</b> ${escape(item.whyItMatters)}</p>` : ''}
    </td></tr>`;
}

function digestEmail(digest, items, user) {
  const byId = new Map(items.map((i) => [String(i._id), i]));
  const top = digest.topStory ? byId.get(String(digest.topStory)) : null;
  const quick = digest.items.map((id) => byId.get(String(id))).filter(Boolean);
  const link = `${siteUrl()}/news/${encodeURIComponent(digest.slug)}`;
  const unsubscribe = `${apiUrl()}/newsletter/unsubscribe?u=${user._id}&t=${unsubscribeToken(user._id)}`;

  const html = `<!doctype html><html><body style="margin:0;background:#f4f8fc;font-family:Arial,sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:24px 12px">
    <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;background:#ffffff;border-radius:16px;padding:24px">
      <tr><td>
        <div style="color:#f05a36;font-size:12px;font-weight:700;letter-spacing:1px">CODESPHERE TECH BRIEF</div>
        <h1 style="color:#10243a;font-size:24px;margin:8px 0">${escape(digest.title)}</h1>
        ${digest.intro ? `<p style="color:#34465a;font-size:15px">${escape(digest.intro)}</p>` : ''}
      </td></tr>
      ${top ? storyHtml(top, true) : ''}
      ${quick.map((item) => storyHtml(item)).join('')}
      ${digest.communityQuestion ? `<tr><td style="padding:16px 0"><b style="color:#10243a">Community question:</b> <span style="color:#34465a">${escape(digest.communityQuestion)}</span></td></tr>` : ''}
      <tr><td style="padding:18px 0" align="center">
        <a href="${safeUrl(link)}" style="background:#f05a36;color:#fff;padding:12px 22px;border-radius:10px;text-decoration:none;font-weight:700">Read it on CodeSphere</a>
      </td></tr>
      <tr><td style="color:#8a99a8;font-size:12px;text-align:center">
        You get this because you subscribed to the Tech Brief.
        <a href="${safeUrl(unsubscribe)}" style="color:#8a99a8">Unsubscribe</a>
      </td></tr>
    </table>
  </td></tr></table></body></html>`;

  const text = [
    `CodeSphere Tech Brief: ${digest.title}`,
    digest.intro,
    ...[top, ...quick].filter(Boolean).map((i) => `- ${i.title} (${i.sourceName}) ${i.canonicalUrl}`),
    `Read it: ${link}`,
    `Unsubscribe: ${unsubscribe}`,
  ].filter(Boolean).join('\n\n');

  return { html, text };
}

/**
 * Email a published digest to every opted-in student. Never throws.
 * Returns { sent, skipped } (skipped when email isn't configured).
 */
async function sendDigestNewsletter(digest) {
  try {
    if (!isEmailConfigured()) return { sent: 0, skipped: true };
    const subscribers = await User.find({ role: 'user', newsletterOptIn: true }).select('_id name email').lean();
    if (!subscribers.length) return { sent: 0, skipped: false };

    const items = await NewsItem.find({ _id: { $in: [digest.topStory, ...digest.items].filter(Boolean) } }).lean();
    let sent = 0;

    for (let i = 0; i < subscribers.length; i += BATCH_SIZE) {
      const batch = subscribers.slice(i, i + BATCH_SIZE);
      // Each subscriber gets their own unsubscribe link, so one version each.
      const versions = batch.map((user) => {
        const { html, text } = digestEmail(digest, items, user);
        return { to: [{ email: user.email, name: user.name }], htmlContent: html, textContent: text };
      });

      const response = await fetch(process.env.BREVO_API_URL || 'https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        headers: { 'api-key': process.env.BREVO_API_KEY, 'Content-Type': 'application/json', accept: 'application/json' },
        body: JSON.stringify({
          sender: { name: process.env.BREVO_SENDER_NAME || 'CodeSphere', email: process.env.BREVO_SENDER_EMAIL },
          subject: `CodeSphere Tech Brief: ${digest.title}`,
          htmlContent: versions[0].htmlContent,
          messageVersions: versions,
        }),
        signal: AbortSignal.timeout(20000),
      });
      if (!response.ok) {
        console.error('Newsletter send error:', response.status, await response.text().catch(() => ''));
        continue;
      }
      sent += batch.length;
    }
    return { sent, skipped: false };
  } catch (error) {
    console.error('Newsletter error:', error.message);
    return { sent: 0, skipped: false, error: error.message };
  }
}

module.exports = { sendDigestNewsletter, isEmailConfigured, unsubscribeToken, verifyUnsubscribe };

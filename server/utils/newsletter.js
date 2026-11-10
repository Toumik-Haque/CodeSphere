// Weekly Tech Brief email (opt-in) sent through Brevo.
//
// Env: BREVO_API_KEY, BREVO_SENDER_EMAIL, BREVO_SENDER_NAME, CLIENT_URL
//      (site link in emails), API_PUBLIC_URL (for the unsubscribe link;
//      defaults to http://localhost:<PORT>/api), BREVO_API_URL (override).

const crypto = require('crypto');
const User = require('../models/User');
const { NewsItem } = require('../models/News');
const {
  escapeHtml,
  safeUrl,
  siteUrl,
  apiUrl,
  renderEmail,
  preferencesUrl,
} = require('./emailTemplates');

const BATCH_SIZE = 500; // recipients per Brevo request (messageVersions)

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

function storyHtml(item, top = false) {
  return `
    <tr><td style="padding:${top ? '18px' : '14px'} 0;border-bottom:1px solid #e6edf4">
      ${top ? '<div style="color:#f05a36;font-size:12px;font-weight:700;letter-spacing:1px">TOP STORY</div>' : ''}
      <a href="${safeUrl(item.canonicalUrl)}" style="color:#10243a;font-size:${top ? '20px' : '16px'};font-weight:700;text-decoration:none">${escapeHtml(item.title)}</a>
      <div style="color:#617287;font-size:12px;margin:4px 0">${escapeHtml(item.sourceName)}${item.publishedAt ? ` · ${new Date(item.publishedAt).toDateString()}` : ''}</div>
      ${item.editorSummary ? `<p style="color:#26384b;font-size:14px;margin:6px 0">${escapeHtml(item.editorSummary)}</p>` : ''}
      ${top && item.whyItMatters ? `<p style="background:#fff8e6;color:#5c4300;font-size:14px;padding:10px;border-radius:8px"><b>Why developers should care:</b> ${escapeHtml(item.whyItMatters)}</p>` : ''}
    </td></tr>`;
}

function digestEmail(digest, items, user) {
  const byId = new Map(items.map((i) => [String(i._id), i]));
  const top = digest.topStory ? byId.get(String(digest.topStory)) : null;
  const quick = digest.items.map((id) => byId.get(String(id))).filter(Boolean);
  const link = `${siteUrl()}/news/${encodeURIComponent(digest.slug)}`;
  const unsubscribe = `${apiUrl()}/newsletter/unsubscribe?u=${user._id}&t=${unsubscribeToken(user._id)}`;
  const body = `
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
      ${top ? storyHtml(top, true) : ''}
      ${quick.map((item) => storyHtml(item)).join('')}
    </table>
    ${digest.communityQuestion ? `<div style="margin-top:18px;padding:14px 16px;border-radius:11px;background:#f3f7fb;color:#34465a;font-size:14px;line-height:1.7"><strong style="color:#10243a">Community question:</strong> ${escapeHtml(digest.communityQuestion)}</div>` : ''}`;

  const html = renderEmail({
    preheader: digest.intro || digest.title,
    eyebrow: 'CODESPHERE TECH BRIEF',
    title: digest.title,
    intro: digest.intro,
    body,
    ctaLabel: 'Read it on CodeSphere',
    ctaUrl: link,
    footerNote: 'You get this because you subscribed to the Weekly Tech Brief.',
    unsubscribeUrl: unsubscribe,
    preferencesUrl: preferencesUrl(),
  });

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

// ---------- Daily "Today in Tech" email (separate opt-in) ----------

function dailyEmail(brief, items, user) {
  const link = `${siteUrl()}/news?view=today`;
  const unsubscribe = `${apiUrl()}/newsletter/unsubscribe?u=${user._id}&t=${unsubscribeToken(user._id)}&list=daily`;
  const date = new Date(`${brief.day}T00:00:00+05:30`).toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'Asia/Kolkata' });
  const rows = items.map((item, i) => `
    <tr><td style="padding:14px 0;border-bottom:1px solid #e6edf4">
      <div style="color:#f05a36;font-size:12px;font-weight:700">${i + 1}. ${escapeHtml(item.sourceName)}</div>
      <a href="${safeUrl(item.url)}" style="color:#10243a;font-size:${i === 0 ? '19px' : '16px'};font-weight:700;text-decoration:none">${escapeHtml(item.title)}</a>
      ${item.summary ? `<p style="color:#34465a;font-size:14px;margin:6px 0 0">${escapeHtml(item.summary.slice(0, 200))}</p>` : ''}
    </td></tr>`).join('');
  const html = renderEmail({
    preheader: `The ${items.length} stories developers are talking about today.`,
    eyebrow: 'TODAY IN TECH · CODESPHERE',
    title: date,
    intro: `The ${items.length} stories developers are talking about today.`,
    body: `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">${rows}</table>`,
    ctaLabel: 'See all of today\'s news',
    ctaUrl: link,
    footerNote: 'You get this because you turned on the daily email.',
    unsubscribeUrl: unsubscribe,
    preferencesUrl: preferencesUrl(),
  });
  const text = [`Today in Tech: ${date}`, ...items.map((i, n) => `${n + 1}. ${i.title} (${i.sourceName}) ${i.url}`), `More: ${link}`, `Stop daily emails: ${unsubscribe}`].join('\n\n');
  return { html, text };
}

/**
 * Email today's brief to daily subscribers. Never throws.
 * Brevo's free plan allows 300 emails/day: capped by DAILY_EMAIL_LIMIT (default 250).
 */
async function sendDailyBriefEmail(brief, items) {
  try {
    if (!isEmailConfigured()) return { sent: 0, skipped: true };
    const limit = Math.max(0, Number(process.env.DAILY_EMAIL_LIMIT) || 250);
    const subscribers = await User.find({ role: 'user', dailyNewsOptIn: true }).sort({ _id: 1 }).limit(limit).select('_id name email').lean();
    let sent = 0;
    for (let i = 0; i < subscribers.length; i += BATCH_SIZE) {
      const batch = subscribers.slice(i, i + BATCH_SIZE);
      const versions = batch.map((user) => {
        const { html, text } = dailyEmail(brief, items, user);
        return { to: [{ email: user.email, name: user.name }], htmlContent: html, textContent: text };
      });
      const response = await fetch(process.env.BREVO_API_URL || 'https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        headers: { 'api-key': process.env.BREVO_API_KEY, 'Content-Type': 'application/json', accept: 'application/json' },
        body: JSON.stringify({
          sender: { name: process.env.BREVO_SENDER_NAME || 'CodeSphere', email: process.env.BREVO_SENDER_EMAIL },
          subject: `Today in Tech: ${items[0]?.title || 'your daily brief'}`.slice(0, 150),
          htmlContent: versions[0].htmlContent,
          messageVersions: versions,
        }),
        signal: AbortSignal.timeout(20000),
      });
      if (!response.ok) {
        console.error('Daily email error:', response.status, await response.text().catch(() => ''));
        continue;
      }
      sent += batch.length;
    }
    return { sent, skipped: false };
  } catch (error) {
    console.error('Daily email error:', error.message);
    return { sent: 0, skipped: false, error: error.message };
  }
}

module.exports = { sendDigestNewsletter, sendDailyBriefEmail, isEmailConfigured, unsubscribeToken, verifyUnsubscribe };

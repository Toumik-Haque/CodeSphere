// Admin "Email everyone" button: send any event, hackathon, recruitment, study
// guide, project or reverse-coding puzzle to every member as an email, at any
// time, with an optional personal message. Unsubscribed members are skipped.
const express = require('express');
const mongoose = require('mongoose');
const User = require('../models/User');
const Event = require('../models/Event');
const StudyGuide = require('../models/StudyGuide');
const { Hackathon } = require('../models/Hackathon');
const { Recruitment } = require('../models/Recruitment');
const { Project } = require('../models/Project');
const { ReverseChallenge } = require('../models/Reverse');
const { protect, adminOnly } = require('../middleware/authMiddleware');
const { broadcastUpdate } = require('../utils/broadcast');
const { escapeHtml } = require('../utils/emailTemplates');
const { eventEmailHtml, eventFactsText } = require('../utils/eventEmail');

const router = express.Router();
const COOLDOWN_MS = 10 * 60 * 1000;
const lastPush = new Map(); // "kind:id" -> time, to stop accidental double sends

const plain = (html = '') => String(html)
  .replace(/<(br|\/p|\/li|\/h[1-6])[^>]*>/gi, ' ')
  .replace(/<[^>]*>/g, '')
  .replace(/&nbsp;/g, ' ')
  .replace(/&lt;/g, '<')
  .replace(/&gt;/g, '>')
  .replace(/&quot;/g, '"')
  .replace(/&#39;/g, "'")
  .replace(/&amp;/g, '&')
  .replace(/\s+/g, ' ')
  .trim();
const clip = (text, n) => (text.length > n ? `${text.slice(0, n - 1)}…` : text);
const TZ = 'Asia/Kolkata';
const day = (d) => new Date(d).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'long', timeZone: TZ });

// A highlighted list of key facts, like the event email's box.
function factsBox(facts) {
  const rows = facts.filter(([, value]) => value).map(([label, value]) => `
      <tr>
        <td style="padding:6px 12px 6px 0;width:110px;color:#8a5a49;font-size:11px;font-weight:800;letter-spacing:.8px;text-transform:uppercase;vertical-align:top">${escapeHtml(label)}</td>
        <td style="padding:6px 0;color:#153653;font-size:15px;font-weight:700">${escapeHtml(value)}</td>
      </tr>`).join('');
  if (!rows) return '';
  return `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin:4px 0 18px;background:#fff6f2;border:1px solid #ffd9cc;border-left:4px solid #e4572e;border-radius:12px">
    <tr><td style="padding:10px 16px"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">${rows}</table></td></tr>
  </table>`;
}
const para = (text) => (text ? `<p style="margin:0 0 12px;color:#34465a">${escapeHtml(text)}</p>` : '');
const factsText = (facts) => facts.filter(([, v]) => v).map(([k, v]) => `${k}: ${v}`).join(' · ');

// How each kind of item becomes an email.
const KINDS = {
  event: {
    label: 'event',
    async load(id) {
      const e = await Event.findById(id).lean();
      if (!e) return null;
      const text = clip(plain(e.description), 600);
      return {
        title: e.title,
        html: eventEmailHtml(e, text),
        text: `${eventFactsText(e)}\n\n${text}`,
        link: `/events/${e.slug}`,
        image: e.bannerImage?.url,
        live: e.status === 'published',
      };
    },
  },
  hackathon: {
    label: 'hackathon',
    async load(id) {
      const h = await Hackathon.findById(id).lean();
      if (!h) return null;
      const facts = [
        ['Register by', day(h.regEnd)],
        ['Submissions', `${day(h.submissionStart)} – ${day(h.submissionEnd)}`],
        ['Mode', h.venue ? `${h.mode} · ${h.venue}` : h.mode],
        ['Team size', h.teamMin === h.teamMax ? `${h.teamMax}` : `${h.teamMin}–${h.teamMax}`],
        ['Prizes', (h.prizes || []).map((p) => p.reward || p.title).filter(Boolean).slice(0, 3).join(' · ')],
      ];
      const text = clip(h.tagline || plain(h.description), 500);
      return { title: h.title, html: factsBox(facts) + para(text), text: `${factsText(facts)}\n\n${text}`, link: `/hackathons/${h.slug}`, image: h.bannerUrl, live: h.status === 'published' };
    },
  },
  recruitment: {
    label: 'recruitment',
    async load(id) {
      const r = await Recruitment.findById(id).lean();
      if (!r) return null;
      const facts = [
        ['Organisation', r.organization],
        ['Apply by', day(r.applyBy)],
        ['Roles', (r.roles || []).map((x) => x.title).join(', ')],
        ['Where', r.mode === 'Online' ? (r.platform || 'Online') : [r.venue, r.mode === 'Hybrid' && r.platform].filter(Boolean).join(' + ')],
      ];
      const text = clip(r.summary || plain(r.description), 500);
      return { title: `${r.type === 'interview' ? 'Interviews' : 'Now recruiting'}: ${r.title}`, html: factsBox(facts) + para(text), text: `${factsText(facts)}\n\n${text}`, link: `/recruitments/${r.slug}`, image: r.banner?.url, live: ['published', 'closed'].includes(r.status) };
    },
  },
  guide: {
    label: 'study guide',
    async load(id) {
      const g = await StudyGuide.findById(id).lean();
      if (!g) return null;
      const facts = [['Level', g.level], ['Topic', g.topic]];
      return { title: `Study guide: ${g.title}`, html: factsBox(facts) + para(g.summary), text: `${factsText(facts)}\n\n${g.summary}`, link: `/materials/${g.slug}`, live: g.status === 'published' };
    },
  },
  project: {
    label: 'project',
    async load(id) {
      const p = await Project.findById(id).lean();
      if (!p) return null;
      return { title: `Project spotlight: ${p.title}`, html: para(p.summary), text: p.summary || '', link: `/projects/${p.slug}`, image: p.screenshots?.[0]?.url, live: p.status === 'published' && p.visibility === 'public' };
    },
  },
  reverse: {
    label: 'reverse-coding puzzle',
    async load(id) {
      const c = await ReverseChallenge.findById(id).lean();
      if (!c) return null;
      const facts = [['Level', c.level], ['Points', c.points]];
      const text = clip(plain(c.statement), 400);
      return { title: `New puzzle: ${c.title}`, html: factsBox(facts) + para(text), text: `${factsText(facts)}\n\n${text}`, link: `/reverse-coding/${c.slug}`, live: c.status === 'published' };
    },
  },
};

// GET /api/push/audience: how many members would get the email.
router.get('/audience', protect, adminOnly, async (req, res) => {
  const count = await User.countDocuments({ role: 'user', email: { $nin: ['', null] }, updateEmailsOptOut: { $ne: true } });
  res.json({ count });
});

// POST /api/push/:kind/:id { message, subject, sendNotification }
router.post('/:kind/:id', protect, adminOnly, async (req, res) => {
  const kind = KINDS[req.params.kind];
  if (!kind) return res.status(404).json({ message: 'Unknown item type.' });
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) return res.status(404).json({ message: 'Not found.' });

  const key = `${req.params.kind}:${req.params.id}`;
  const last = lastPush.get(key);
  if (last && Date.now() - last < COOLDOWN_MS) {
    const minutes = Math.ceil((COOLDOWN_MS - (Date.now() - last)) / 60000);
    return res.status(429).json({ message: `This ${kind.label} was just emailed. Try again in ${minutes} minute${minutes === 1 ? '' : 's'}.` });
  }

  const item = await kind.load(req.params.id);
  if (!item) return res.status(404).json({ message: 'Not found.' });
  if (!item.live) return res.status(400).json({ message: `Publish this ${kind.label} first. Members can't open it yet.` });

  const message = String(req.body?.message || '').replace(/\r\n?/g, '\n').trim().slice(0, 1000);
  const subject = String(req.body?.subject || '').trim().slice(0, 150) || item.title;
  const personal = message
    ? `<div style="margin:0 0 18px;padding:12px 16px;border-radius:12px;background:#eef5fb;color:#153653;font-size:15px;line-height:1.6">${escapeHtml(message).replace(/\n/g, '<br>')}</div>`
    : '';

  lastPush.set(key, Date.now());
  const result = await broadcastUpdate({
    title: subject,
    body: `${message ? `${message}\n\n` : ''}${item.text}`.slice(0, 2000),
    htmlBody: personal + item.html,
    link: item.link,
    imageUrl: item.image,
    sendEmail: true,
    sendNotification: req.body?.sendNotification === true,
  });
  const emails = result?.emails || {};
  if (emails.skipped && !emails.disabled) {
    lastPush.delete(key);
    return res.status(503).json({ message: 'Email isn\'t set up on this server (Brevo keys are missing).' });
  }
  res.json({
    sent: emails.sent || 0,
    attempted: emails.attempted || 0,
    message: `Emailed ${emails.sent || 0} of ${emails.attempted || 0} members.`,
  });
});

module.exports = router;

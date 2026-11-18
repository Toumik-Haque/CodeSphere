// Weekly "spotlight" email: one email a week, a different part of the site each
// week, so every section is featured once a month without flooding inboxes.
//
//   1st week  Compete    hackathons + events
//   2nd week  Build      Project Hub, guided projects, open source
//   3rd week  Learn      study guides, Playground, Tech News
//   4th week  Challenge  Reverse Coding, Leaderboard, daily bug
//   5th week  Community  Forum, core team (only in months with five)
//
// Sent on SPOTLIGHT_DAY (0=Sun … 6=Sat, default 1 = Monday) at SPOTLIGHT_HOUR IST
// (default 18). SECTION_SPOTLIGHT=off disables it. Goes through broadcastUpdate,
// so unsubscribed members are skipped and everyone also gets an in-app note.
const JobRun = require('../models/JobRun');
const Event = require('../models/Event');
const StudyGuide = require('../models/StudyGuide');
const { Project, GuidedProject } = require('../models/Project');
const { ReverseChallenge } = require('../models/Reverse');
const { ForumThread } = require('../models/Forum');
const { Hackathon, ExternalHackathon } = require('../models/Hackathon');
const { broadcastUpdate } = require('./broadcast');
const { isEmailConfigured } = require('./newsletter');
const { escapeHtml, siteUrl } = require('./emailTemplates');

const TZ = 'Asia/Kolkata';
const parts = (date = new Date()) => Object.fromEntries(
  new Intl.DateTimeFormat('en-GB', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', weekday: 'short', hour12: false })
    .formatToParts(date)
    .map((p) => [p.type, p.value]),
);
const WEEKDAYS = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
const setting = (name, fallback, min, max) => {
  const value = Number(process.env[name]);
  return Number.isInteger(value) && value >= min && value <= max ? value : fallback;
};
const shortDate = (d) => new Intl.DateTimeFormat('en-IN', { timeZone: TZ, day: 'numeric', month: 'short' }).format(new Date(d));
const clip = (s = '', n = 110) => {
  const text = String(s).replace(/\s+/g, ' ').trim();
  return text.length > n ? `${text.slice(0, n - 1)}…` : text;
};

// ---------- What each week features ----------
const THEMES = {
  1: {
    key: 'compete',
    title: 'Hackathons & events to join this month',
    intro: 'Team up, build something in a weekend and win prizes, or learn something new at a CodeSphere event.',
    link: '/hackathons',
    cta: 'Browse hackathons',
    async items(now) {
      const [club, external, events] = await Promise.all([
        Hackathon.find({ status: 'published', regEnd: { $gte: now } }).sort({ regEnd: 1 }).limit(2).lean(),
        ExternalHackathon.find({ endsAt: { $gte: now } }).sort({ endsAt: 1 }).limit(3).lean(),
        Event.find({ status: 'published', date: { $gte: now } }).sort({ date: 1 }).limit(2).lean(),
      ]);
      return [
        ...club.map((h) => ({ title: h.title, meta: `CodeSphere hackathon · register by ${shortDate(h.regEnd)}`, text: h.tagline, href: `/hackathons/${h.slug}` })),
        ...events.map((e) => ({ title: e.title, meta: `Event · ${shortDate(e.date)}${e.venue ? ` · ${e.venue}` : ''}`, href: `/events/${e.slug}` })),
        ...external.map((h) => ({ title: h.title, meta: `${h.organizer || 'Hackathon'} · ends ${shortDate(h.endsAt)}${h.prize ? ` · ${h.prize}` : ''}`, href: h.url, external: true })),
      ].slice(0, 5);
    },
  },
  2: {
    key: 'build',
    title: 'Build something you can show off',
    intro: 'See what members are building, find teammates, or follow a guided project from idea to deployed app.',
    link: '/projects',
    cta: 'Open the Project Hub',
    async items() {
      const [projects, guided] = await Promise.all([
        Project.find({ status: 'published', visibility: 'public' }).sort({ featured: -1, publishedAt: -1 }).limit(3).lean(),
        GuidedProject.find({ status: 'published' }).sort({ createdAt: -1 }).limit(2).lean(),
      ]);
      return [
        ...projects.map((p) => ({ title: p.title, meta: p.featured ? 'Featured project' : 'Community project', text: p.summary, href: `/projects/${p.slug}` })),
        ...guided.map((g) => ({ title: g.title, meta: `Guided project · ${g.level}`, text: g.summary, href: `/projects/guided/${g.slug}` })),
        { title: 'Make your first open-source contribution', meta: 'Open Source', text: 'A step-by-step guide to your first pull request.', href: '/open-source' },
      ].slice(0, 5);
    },
  },
  3: {
    key: 'learn',
    title: 'Learn something new this week',
    intro: 'Fresh study guides, a browser coding playground with 70+ languages, and the day in tech in a few minutes.',
    link: '/materials',
    cta: 'Open the Study Guide',
    async items() {
      const guides = await StudyGuide.find({ status: 'published' }).sort({ updatedAt: -1 }).limit(3).lean();
      return [
        ...guides.map((g) => ({ title: g.title, meta: `Study guide · ${g.level}`, text: g.summary, href: `/materials/${g.slug}` })),
        { title: 'Playground', meta: 'Code in your browser', text: 'Run Python, C++, Java, JavaScript and more with nothing to install.', href: '/playground' },
        { title: 'Tech News', meta: 'Daily digest', text: 'The stories developers are talking about today.', href: '/news' },
      ];
    },
  },
  4: {
    key: 'challenge',
    title: 'Test your skills: puzzles, bugs and the leaderboard',
    intro: 'Crack reverse-coding puzzles, fix a bug a day to grow your streak, and climb the leaderboard.',
    link: '/reverse-coding',
    cta: 'Try a puzzle',
    async items() {
      const puzzles = await ReverseChallenge.find({ status: 'published' }).sort({ featured: -1, publishedAt: -1 }).limit(3).lean();
      return [
        ...puzzles.map((c) => ({ title: c.title, meta: `Reverse coding · ${c.level}`, href: `/reverse-coding/${c.slug}` })),
        { title: "Today's bug", meta: 'Debugging Arena', text: 'One bug a day. Keep your streak alive and earn bonus XP.', href: '/playground#debugging-arena' },
        { title: 'Leaderboard', meta: 'XP, streaks and badges', text: 'See where you rank this month.', href: '/leaderboard' },
      ];
    },
  },
  5: {
    key: 'community',
    title: 'Join the conversation',
    intro: 'Ask questions, help others and share what you are working on in the CodeSphere forum.',
    link: '/forum',
    cta: 'Visit the forum',
    async items() {
      const threads = await ForumThread.find({ status: 'visible' }).sort({ lastActivityAt: -1 }).limit(4).lean();
      return [
        ...threads.map((t) => ({ title: t.title, meta: `Forum · ${t.replyCount || 0} repl${t.replyCount === 1 ? 'y' : 'ies'}`, href: `/forum/${t._id}` })),
        { title: 'Meet the core team', meta: 'CodeSphere', text: 'The people who run the club and its events.', href: '/team' },
      ];
    },
  },
};

function itemsHtml(items) {
  if (!items.length) return '';
  const rows = items.map((item) => {
    const href = item.external ? item.href : `${siteUrl()}${item.href}`;
    return `
      <tr>
        <td style="padding:12px 0;border-top:1px solid #edf1f5">
          <a href="${escapeHtml(href)}" style="color:#153653;font-size:15px;font-weight:700;text-decoration:none">${escapeHtml(item.title)} &rarr;</a>
          ${item.meta ? `<div style="margin-top:3px;color:#d94324;font-size:12px;font-weight:700">${escapeHtml(item.meta)}</div>` : ''}
          ${item.text ? `<div style="margin-top:4px;color:#5b7083;font-size:13px;line-height:1.55">${escapeHtml(clip(item.text))}</div>` : ''}
        </td>
      </tr>`;
  }).join('');
  return `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin:6px 0 4px">${rows}</table>`;
}

// Build and send the spotlight for a week of the month (1-5).
async function sendSpotlight(week, now = new Date()) {
  const theme = THEMES[week];
  if (!theme) return null;
  const items = await theme.items(now).catch((error) => {
    console.error(`Spotlight ${theme.key} items error:`, error.message);
    return [];
  });
  const htmlBody = `<p style="margin:0 0 8px;color:#34465a">${escapeHtml(theme.intro)}</p>${itemsHtml(items)}`;
  const listText = items.map((i) => `• ${i.title}${i.meta ? ` (${i.meta})` : ''}`).join('\n');
  return broadcastUpdate({
    title: theme.title,
    body: `${theme.intro}${listText ? `\n\n${listText}` : ''}`,
    htmlBody,
    link: theme.link,
    notificationType: 'announcement',
  });
}

async function tick() {
  if (!isEmailConfigured()) return;
  const now = new Date();
  const p = parts(now);
  if (WEEKDAYS[p.weekday] !== setting('SPOTLIGHT_DAY', 1, 0, 6)) return;
  if (Number(p.hour) < setting('SPOTLIGHT_HOUR', 18, 0, 23)) return;
  const week = Math.ceil(Number(p.day) / 7); // 1st, 2nd … 5th such weekday of the month
  const runKey = `${p.year}-${p.month}-w${week}`;
  // Claim this week atomically, so restarts or extra servers never resend.
  const claimed = await JobRun.findOneAndUpdate(
    { _id: 'section-spotlight', lastDate: { $ne: runKey } },
    { $set: { lastDate: runKey, lastRunAt: now } },
    { upsert: true, new: true },
  ).catch((error) => (error.code === 11000 ? null : Promise.reject(error)));
  if (!claimed) return;
  const result = await sendSpotlight(week, now);
  await JobRun.updateOne({ _id: 'section-spotlight' }, { $set: { sent: result?.emails?.sent || 0 } });
  console.log(`Section spotlight (${THEMES[week]?.key}): emailed ${result?.emails?.sent || 0} of ${result?.emails?.attempted || 0}.`);
}

function startSectionSpotlight() {
  if (process.env.SECTION_SPOTLIGHT === 'off') return;
  const run = () => tick().catch((error) => console.error('Section spotlight error:', error.message));
  setTimeout(run, 45000).unref();
  setInterval(run, 15 * 60 * 1000).unref();
}

module.exports = { startSectionSpotlight, sendSpotlight, THEMES, itemsHtml };

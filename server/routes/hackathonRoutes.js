const express = require('express');
const crypto = require('crypto');
const mongoose = require('mongoose');
const { Hackathon, HackathonTeam, HackathonSubmission, ExternalHackathon, HackathonSync } = require('../models/Hackathon');
const { protect, optionalAuth, requireStaff, hasStaffRole } = require('../middleware/authMiddleware');
const { notify } = require('../utils/notify');
const { broadcastUpdate, getBroadcastOptions } = require('../utils/broadcast');
const { createLimiter } = require('../utils/rateLimit');
const { syncExternalHackathons, SOURCE_NAMES } = require('../utils/hackathonSync');
const { validateHackathon } = require('../utils/hackathonValidate');
const submissionFiles = require('../utils/hackathonFiles');

const router = express.Router();
const organizer = [protect, requireStaff('hackathon-organizer')];

// Organisers, or the student who hosts this (approved) community hackathon.
async function canManage(user, hackathonId) {
  if (hasStaffRole(user, 'hackathon-organizer')) return true;
  return Boolean(await Hackathon.exists({ _id: hackathonId, origin: 'community', reviewStatus: 'approved', createdBy: user._id }));
}
const manager = (getHackathonId) => [protect, async (req, res, next) => {
  try {
    const id = await getHackathonId(req);
    if (id && isId(String(id)) && await canManage(req.user, id)) return next();
  } catch {
    /* fall through */
  }
  return res.status(403).json({ message: 'Not allowed.' });
}];
const manageById = manager((req) => req.params.id);
const manageBySubmission = manager(async (req) => (isId(req.params.id) ? (await HackathonSubmission.findById(req.params.id).select('hackathon').lean())?.hackathon : null));
const teamLimiter = createLimiter({ windowMs: 60 * 60 * 1000, max: 30, message: 'Too many team changes. Try again later.' });

const isId = (id) => mongoose.Types.ObjectId.isValid(id);
const HANDED_IN = { status: { $ne: 'draft' } };
const clean = (v, max) => String(v ?? '').replace(/\r\n?/g, '\n').trim().slice(0, max);
const safeUrl = (url) => {
  const s = clean(url, 500);
  return /^https?:\/\/[^\s<>"]+$/i.test(s) ? s : '';
};
const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const initials = (name = '') => name.split(/\s+/).filter(Boolean).map((w) => w[0]).slice(0, 2).join('').toUpperCase();

// Where a hackathon is in its life cycle.
function phaseOf(h, now = new Date()) {
  if (h.resultsPublished) return 'results';
  if (now < h.regStart) return 'upcoming';
  if (now <= h.submissionEnd && now >= h.submissionStart) return 'submission';
  if (now <= h.regEnd) return 'registration';
  if (now < h.submissionStart) return 'building';
  return 'judging';
}

const windows = (h, now = new Date()) => ({
  canRegister: now >= h.regStart && now <= h.regEnd && !h.resultsPublished,
  canSubmit: now >= h.submissionStart && now <= h.submissionEnd && !h.resultsPublished,
  canChangeTeam: now <= h.submissionEnd && !h.resultsPublished,
});

function card(h, counts = {}) {
  return {
    id: String(h._id),
    slug: h.slug,
    title: h.title,
    tagline: h.tagline,
    mode: h.mode,
    venue: h.venue,
    bannerUrl: h.bannerUrl,
    tracks: h.tracks,
    prizes: h.prizes,
    regStart: h.regStart,
    regEnd: h.regEnd,
    submissionStart: h.submissionStart,
    submissionEnd: h.submissionEnd,
    teamMin: h.teamMin,
    teamMax: h.teamMax,
    status: h.status,
    resultsPublished: h.resultsPublished,
    phase: phaseOf(h),
    teams: counts.teams || 0,
    submissions: counts.submissions || 0,
  };
}

async function countsFor(ids) {
  const [teams, subs] = await Promise.all([
    HackathonTeam.aggregate([{ $match: { hackathon: { $in: ids } } }, { $group: { _id: '$hackathon', n: { $sum: 1 } } }]),
    HackathonSubmission.aggregate([{ $match: { hackathon: { $in: ids }, ...HANDED_IN } }, { $group: { _id: '$hackathon', n: { $sum: 1 } } }]),
  ]);
  const map = {};
  teams.forEach((t) => { map[t._id] = { ...(map[t._id] || {}), teams: t.n }; });
  subs.forEach((s) => { map[s._id] = { ...(map[s._id] || {}), submissions: s.n }; });
  return map;
}

const member = (u) => ({ id: String(u._id), name: u.name, initials: initials(u.name), year: u.yearOfStudy || '' });

const fileView = (f) => (f?.url ? { url: f.url, name: f.name, size: f.size, type: f.type } : null);

function submissionView(s, { withAward, withReview = false }) {
  return {
    id: String(s._id),
    title: s.title,
    tagline: s.tagline,
    description: s.description,
    problem: s.problem || '',
    solution: s.solution || '',
    challenges: s.challenges || '',
    impact: s.impact || '',
    deckFile: fileView(s.deckFile),
    prototypeFile: fileView(s.prototypeFile),
    screenshots: (s.screenshots || []).map(fileView).filter(Boolean),
    status: s.status || 'submitted',
    submittedAt: s.submittedAt || (s.status ? null : s.createdAt),
    track: s.track,
    techStack: s.techStack,
    repoUrl: s.repoUrl,
    demoUrl: s.demoUrl,
    videoUrl: s.videoUrl,
    deckUrl: s.deckUrl,
    updatedAt: s.updatedAt,
    team: s.team?.name ? { name: s.team.name, members: (s.team.members || []).map(member) } : undefined,
    ...(withAward ? { award: s.award, rank: s.rank } : {}),
    ...(withReview ? { review: s.review || 'new', score: s.score ?? null, judgeNote: s.judgeNote || '' } : {}),
  };
}

const loadPublished = (slug) => Hackathon.findOne({ slug: clean(slug, 80).toLowerCase(), status: 'published' });
const myTeam = (hackathonId, userId) => HackathonTeam.findOne({ hackathon: hackathonId, members: userId });

// =====================================================================
// Hackathons from other platforms
// =====================================================================

// GET /api/hackathons/external?source&mode&q&sort&page
router.get('/external', async (req, res) => {
  try {
    const filter = {};
    if (SOURCE_NAMES.includes(req.query.source)) filter.source = req.query.source;
    if (['online', 'offline', 'hybrid'].includes(req.query.mode)) filter.mode = req.query.mode;
    const q = clean(req.query.q, 60);
    if (q) filter.$or = [{ title: new RegExp(escapeRegex(q), 'i') }, { organizer: new RegExp(escapeRegex(q), 'i') }, { themes: new RegExp(escapeRegex(q), 'i') }];
    const sorts = {
      deadline: { regEndsAt: 1, endsAt: 1 },
      popular: { participants: -1 },
      new: { createdAt: -1 },
    };
    const sort = sorts[req.query.sort] || sorts.deadline;
    const page = Math.max(1, Math.min(50, Number(req.query.page) || 1));
    const limit = 24;

    // Closing soonest first, but undated listings go last.
    const pipeline = [
      { $match: filter },
      { $addFields: { _deadline: { $ifNull: ['$regEndsAt', { $ifNull: ['$endsAt', new Date('2999-01-01')] }] } } },
      { $sort: req.query.sort === 'popular' || req.query.sort === 'new' ? sort : { _deadline: 1, _id: 1 } },
      { $skip: (page - 1) * limit },
      { $limit: limit },
      { $project: { _deadline: 0, __v: 0, lastSeenAt: 0 } },
    ];
    const [items, total, bySource, state] = await Promise.all([
      ExternalHackathon.aggregate(pipeline),
      ExternalHackathon.countDocuments(filter),
      ExternalHackathon.aggregate([{ $group: { _id: '$source', n: { $sum: 1 } } }]),
      HackathonSync.findById('external-hackathons').lean(),
    ]);
    res.json({
      items: items.map(({ _id, createdAt, updatedAt, ...h }) => ({ id: String(_id), ...h })),
      total,
      page,
      pages: Math.max(1, Math.ceil(total / limit)),
      sources: SOURCE_NAMES.map((s) => ({ id: s, count: bySource.find((b) => b._id === s)?.n || 0 })),
      lastSyncedAt: state?.lastRunAt || null,
    });
  } catch (error) {
    res.status(500).json({ message: 'Could not load hackathons.' });
  }
});

// =====================================================================
// Organiser tools (admins + hackathon organisers)
// =====================================================================

router.get('/admin/all', organizer, async (req, res) => {
  const list = await Hackathon.find({ $or: [{ origin: { $ne: 'community' } }, { reviewStatus: 'approved' }] }).sort({ submissionEnd: -1 }).lean();
  const counts = await countsFor(list.map((h) => h._id));
  const sync = await HackathonSync.findById('external-hackathons').lean();
  res.json({ hackathons: list.map((h) => ({ ...card(h, counts[h._id]), description: h.description, rules: h.rules })), sync });
});

router.post('/admin/sync', organizer, async (req, res) => {
  const results = await syncExternalHackathons();
  res.json({ results });
});

router.get('/admin/:id', manageById, async (req, res) => {
  if (!isId(req.params.id)) return res.status(404).json({ message: 'Not found.' });
  const h = await Hackathon.findById(req.params.id).lean();
  if (!h) return res.status(404).json({ message: 'Not found.' });
  const [teams, subs] = await Promise.all([
    HackathonTeam.find({ hackathon: h._id }).populate('members', 'name email yearOfStudy').sort({ createdAt: 1 }).lean(),
    HackathonSubmission.find({ hackathon: h._id }).populate({ path: 'team', select: 'name members', populate: { path: 'members', select: 'name yearOfStudy' } }).sort({ rank: 1, submittedAt: 1, updatedAt: -1 }).lean(),
  ]);
  res.json({
    hackathon: { ...card(h), description: h.description, rules: h.rules },
    teams: teams.map((t) => ({
      id: String(t._id),
      name: t.name,
      submitted: subs.some((s) => String(s.team?._id) === String(t._id) && s.status !== 'draft'),
      draft: subs.some((s) => String(s.team?._id) === String(t._id) && s.status === 'draft'),
      // Student hosts see names only; staff organisers also see emails.
      members: t.members.map((u) => ({ ...member(u), ...(hasStaffRole(req.user, 'hackathon-organizer') ? { email: u.email } : {}) })),
    })),
    submissions: subs.map((s) => submissionView(s, { withAward: true, withReview: true })),
  });
});

router.post('/admin', organizer, async (req, res) => {
  const { data, error } = validateHackathon(req.body || {});
  if (error) return res.status(400).json({ message: error });
  try {
    const h = await Hackathon.create({ ...data, createdBy: req.user._id });
    if (h.status === 'published') {
      await broadcastUpdate({
        title: `New hackathon: ${h.title}`,
        body: h.tagline || h.description.slice(0, 400),
        link: `/hackathons/${h.slug}`,
        ...getBroadcastOptions(req.body),
      });
    }
    res.status(201).json({ id: String(h._id), slug: h.slug });
  } catch (e) {
    res.status(e.code === 11000 ? 409 : 500).json({ message: e.code === 11000 ? 'That URL slug is taken.' : 'Could not save.' });
  }
});

router.put('/admin/:id', organizer, async (req, res) => {
  if (!isId(req.params.id)) return res.status(404).json({ message: 'Not found.' });
  const { data, error } = validateHackathon(req.body || {});
  if (error) return res.status(400).json({ message: error });
  try {
    const h = await Hackathon.findById(req.params.id);
    if (!h) return res.status(404).json({ message: 'Not found.' });
    const wasPublished = h.status === 'published';
    Object.assign(h, data);
    await h.save();
    if (!wasPublished && h.status === 'published') {
      await broadcastUpdate({
        title: `New hackathon: ${h.title}`,
        body: h.tagline || h.description.slice(0, 400),
        link: `/hackathons/${h.slug}`,
        ...getBroadcastOptions(req.body),
      });
    }
    res.json({ id: String(h._id), slug: h.slug });
  } catch (e) {
    res.status(e.code === 11000 ? 409 : 500).json({ message: e.code === 11000 ? 'That URL slug is taken.' : 'Could not save.' });
  }
});

router.delete('/admin/:id', organizer, async (req, res) => {
  if (!isId(req.params.id)) return res.status(404).json({ message: 'Not found.' });
  const h = await Hackathon.findByIdAndDelete(req.params.id);
  if (!h) return res.status(404).json({ message: 'Not found.' });
  const subs = await HackathonSubmission.find({ hackathon: h._id }).lean();
  await Promise.all([HackathonTeam.deleteMany({ hackathon: h._id }), HackathonSubmission.deleteMany({ hackathon: h._id })]);
  await submissionFiles.removeFiles(subs.flatMap(submissionFiles.filesOf));
  res.json({ message: 'Deleted.' });
});

// Judge a submission: award label + rank.
// Only the fields sent are changed.
router.put('/admin/submissions/:id', manageBySubmission, async (req, res) => {
  if (!isId(req.params.id)) return res.status(404).json({ message: 'Not found.' });
  const b = req.body || {};
  const set = {};
  const unset = {};
  const numberOrUnset = (key, min, max) => {
    if (!(key in b)) return;
    if (b[key] === '' || b[key] == null) unset[key] = 1;
    else set[key] = Math.min(max, Math.max(min, Math.round(Number(b[key]) || min)));
  };
  if ('award' in b) set.award = clean(b.award, 80);
  numberOrUnset('rank', 1, 100);
  numberOrUnset('score', 0, 100);
  if ('judgeNote' in b) set.judgeNote = clean(b.judgeNote, 2000);
  if ('review' in b) {
    if (!['new', 'shortlisted', 'rejected'].includes(b.review)) return res.status(400).json({ message: 'Unknown review status.' });
    set.review = b.review;
  }
  const s = await HackathonSubmission.findByIdAndUpdate(
    req.params.id,
    { ...(Object.keys(set).length ? { $set: set } : {}), ...(Object.keys(unset).length ? { $unset: unset } : {}) },
    { new: true },
  );
  if (!s) return res.status(404).json({ message: 'Not found.' });
  res.json({ award: s.award, rank: s.rank, review: s.review, score: s.score ?? null, judgeNote: s.judgeNote });
});

// Spreadsheet of every submission, for offline judging.
// GET /api/hackathons/admin/:id/submissions.csv
router.get('/admin/:id/submissions.csv', manageById, async (req, res) => {
  if (!isId(req.params.id)) return res.status(404).json({ message: 'Not found.' });
  const h = await Hackathon.findById(req.params.id).select('slug').lean();
  if (!h) return res.status(404).json({ message: 'Not found.' });
  const subs = await HackathonSubmission.find({ hackathon: h._id })
    .populate({ path: 'team', select: 'name members', populate: { path: 'members', select: 'name email' } })
    .sort({ rank: 1, submittedAt: 1 })
    .lean();
  const showEmails = hasStaffRole(req.user, 'hackathon-organizer');
  const cell = (v) => {
    const text = String(v ?? '').replace(/\r?\n/g, ' ');
    // Stop spreadsheet formulas, then quote.
    return `"${(/^[=+\-@]/.test(text) ? `'${text}` : text).replace(/"/g, '""')}"`;
  };
  const header = ['Team', 'Members', 'Project', 'Track', 'Status', 'Submitted at', 'Review', 'Score', 'Rank', 'Award',
    'Pitch', 'Problem', 'Solution', 'Tech stack', 'Deck', 'Prototype file', 'Code', 'Demo', 'Video', 'Screenshots', 'Judge notes'];
  const rows = subs.map((s) => [
    s.team?.name,
    (s.team?.members || []).map((m) => (showEmails ? `${m.name} <${m.email}>` : m.name)).join('; '),
    s.title, s.track, s.status || 'submitted', s.submittedAt ? new Date(s.submittedAt).toISOString() : '',
    s.review || 'new', s.score ?? '', s.rank ?? '', s.award,
    s.tagline, s.problem, s.solution, (s.techStack || []).join(', '),
    s.deckFile?.url || s.deckUrl, s.prototypeFile?.url, s.repoUrl, s.demoUrl, s.videoUrl,
    (s.screenshots || []).map((f) => f.url).join(' '), s.judgeNote,
  ]);
  const csv = [header, ...rows].map((r) => r.map(cell).join(',')).join('\r\n');
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="${h.slug}-submissions.csv"`);
  res.send(`\uFEFF${csv}`);
});

// Publish (or hide) results; participants are notified when published.
router.post('/admin/:id/results', manageById, async (req, res) => {
  if (!isId(req.params.id)) return res.status(404).json({ message: 'Not found.' });
  const h = await Hackathon.findById(req.params.id);
  if (!h) return res.status(404).json({ message: 'Not found.' });
  const publish = Boolean(req.body.published);
  if (publish && new Date() < h.submissionEnd) return res.status(400).json({ message: 'Wait until submissions close.' });
  const wasPublished = h.resultsPublished;
  h.resultsPublished = publish;
  await h.save();
  if (publish && !wasPublished) {
    const teams = await HackathonTeam.find({ hackathon: h._id }).select('members').lean();
    const teamMembers = [...new Set(teams.flatMap((t) => t.members).map(String))];
    const broadcastOptions = getBroadcastOptions(req.body);
    if (broadcastOptions.sendNotification) {
      await notify(teamMembers, {
        type: 'hackathon',
        title: `Results are out for ${h.title}`,
        body: 'See the winners and every project in the gallery.',
        link: `/hackathons/${h.slug}`,
      });
    }
    if (req.user.role === 'admin') {
      await broadcastUpdate({
        title: `Hackathon results are live: ${h.title}`,
        body: 'See the final results and celebrate the teams.',
        link: `/hackathons/${h.slug}`,
        notificationExcludeUserIds: teamMembers,
        ...broadcastOptions,
      });
    }
  }
  res.json({ resultsPublished: h.resultsPublished });
});

// =====================================================================
// Club hackathons (public + participants)
// =====================================================================

// GET /api/hackathons
router.get('/', async (req, res) => {
  const list = await Hackathon.find({ status: 'published' }).sort({ submissionEnd: -1 }).limit(60).lean();
  const counts = await countsFor(list.map((h) => h._id));
  res.json({ hackathons: list.map((h) => card(h, counts[h._id])) });
});

// GET /api/hackathons/:slug
router.get('/:slug', optionalAuth, async (req, res) => {
  const h = await loadPublished(req.params.slug);
  if (!h) return res.status(404).json({ message: 'Hackathon not found.' });
  const counts = await countsFor([h._id]);
  const now = new Date();

  let team = null;
  let submission = null;
  if (req.user) {
    const t = await myTeam(h._id, req.user._id).populate('members', 'name yearOfStudy').lean();
    if (t) {
      team = {
        id: String(t._id),
        name: t.name,
        inviteCode: t.inviteCode,
        isLeader: String(t.leader) === String(req.user._id),
        leaderId: String(t.leader),
        members: t.members.map(member),
      };
      const s = await HackathonSubmission.findOne({ team: t._id }).lean();
      if (s) submission = submissionView(s, { withAward: h.resultsPublished });
    }
  }

  // The project gallery opens once submissions close.
  let gallery = [];
  if (now > h.submissionEnd || h.resultsPublished) {
    const subs = await HackathonSubmission.find({ hackathon: h._id, ...HANDED_IN })
      .populate({ path: 'team', select: 'name members', populate: { path: 'members', select: 'name yearOfStudy' } })
      .sort(h.resultsPublished ? { rank: 1, createdAt: 1 } : { createdAt: 1 })
      .lean();
    gallery = subs.map((s) => submissionView(s, { withAward: h.resultsPublished }));
    if (h.resultsPublished) gallery.sort((a, b) => (a.rank || 999) - (b.rank || 999));
  }

  res.json({
    hackathon: {
      ...card(h.toObject(), counts[h._id]),
      description: h.description,
      rules: h.rules,
      origin: h.origin,
      hostName: h.hostName,
      websiteLink: h.websiteLink,
      linkedinPostLink: h.linkedinPostLink,
      instagramPostLink: h.instagramPostLink,
      canManage: Boolean(req.user && String(h.createdBy) === String(req.user._id) && h.origin === 'community'),
      ...windows(h, now),
    },
    team,
    submission,
    gallery,
  });
});

async function inOpenRegistration(req, res) {
  const h = await loadPublished(req.params.slug);
  if (!h) {
    res.status(404).json({ message: 'Hackathon not found.' });
    return null;
  }
  return h;
}

// POST /api/hackathons/:slug/teams { name }  — create a team (you lead it)
router.post('/:slug/teams', protect, teamLimiter, async (req, res) => {
  const h = await inOpenRegistration(req, res);
  if (!h) return;
  if (!windows(h).canRegister) return res.status(400).json({ message: 'Registration is closed.' });
  if (await myTeam(h._id, req.user._id)) return res.status(400).json({ message: 'You are already in a team for this hackathon.' });
  const name = clean(req.body.name, 60);
  if (name.length < 2) return res.status(400).json({ message: 'Give your team a name.' });
  try {
    const team = await HackathonTeam.create({
      hackathon: h._id,
      name,
      leader: req.user._id,
      members: [req.user._id],
      inviteCode: crypto.randomBytes(5).toString('hex').toUpperCase(),
    });
    res.status(201).json({ id: String(team._id), inviteCode: team.inviteCode });
  } catch (e) {
    res.status(e.code === 11000 ? 409 : 500).json({ message: e.code === 11000 ? 'That team name is taken.' : 'Could not create the team.' });
  }
});

// POST /api/hackathons/:slug/teams/join { code }
router.post('/:slug/teams/join', protect, teamLimiter, async (req, res) => {
  const h = await inOpenRegistration(req, res);
  if (!h) return;
  if (!windows(h).canRegister) return res.status(400).json({ message: 'Registration is closed.' });
  if (await myTeam(h._id, req.user._id)) return res.status(400).json({ message: 'You are already in a team for this hackathon.' });
  const code = clean(req.body.code, 20).toUpperCase();
  // Atomic: only joins while the team still has room.
  const team = await HackathonTeam.findOneAndUpdate(
    { hackathon: h._id, inviteCode: code, [`members.${h.teamMax - 1}`]: { $exists: false } },
    { $addToSet: { members: req.user._id } },
    { new: true },
  );
  if (!team) {
    const exists = await HackathonTeam.exists({ hackathon: h._id, inviteCode: code });
    return res.status(400).json({ message: exists ? `That team is full (max ${h.teamMax}).` : 'That invite code is not valid.' });
  }
  await notify(team.leader, {
    type: 'hackathon',
    title: `${req.user.name} joined ${team.name}`,
    body: h.title,
    link: `/hackathons/${h.slug}`,
  });
  res.json({ id: String(team._id), name: team.name });
});

// POST /api/hackathons/:slug/teams/leave
router.post('/:slug/teams/leave', protect, teamLimiter, async (req, res) => {
  const h = await inOpenRegistration(req, res);
  if (!h) return;
  if (!windows(h).canChangeTeam) return res.status(400).json({ message: 'Teams are locked now.' });
  const team = await myTeam(h._id, req.user._id);
  if (!team) return res.status(400).json({ message: 'You are not in a team.' });
  team.members = team.members.filter((m) => String(m) !== String(req.user._id));
  if (!team.members.length) {
    const sub = await HackathonSubmission.findOneAndDelete({ team: team._id }).lean();
    await submissionFiles.removeFiles(submissionFiles.filesOf(sub));
    await team.deleteOne();
    return res.json({ message: 'You left and the empty team was removed.' });
  }
  if (String(team.leader) === String(req.user._id)) [team.leader] = team.members;
  await team.save();
  res.json({ message: 'You left the team.' });
});

// DELETE /api/hackathons/:slug/teams/members/:userId — leader removes a member
router.delete('/:slug/teams/members/:userId', protect, async (req, res) => {
  const h = await inOpenRegistration(req, res);
  if (!h) return;
  if (!windows(h).canChangeTeam) return res.status(400).json({ message: 'Teams are locked now.' });
  const team = await myTeam(h._id, req.user._id);
  if (!team || String(team.leader) !== String(req.user._id)) return res.status(403).json({ message: 'Only the team leader can remove members.' });
  if (String(req.params.userId) === String(req.user._id)) return res.status(400).json({ message: 'Use Leave team instead.' });
  const before = team.members.length;
  team.members = team.members.filter((m) => String(m) !== String(req.params.userId));
  if (team.members.length === before) return res.status(404).json({ message: 'Not a member of your team.' });
  await team.save();
  res.json({ message: 'Removed.' });
});

// Shared checks for a team member changing their submission.
async function submissionContext(req, res) {
  const h = await inOpenRegistration(req, res);
  if (!h) return null;
  if (!windows(h).canSubmit) {
    res.status(400).json({ message: 'Submissions are not open right now.' });
    return null;
  }
  const team = await myTeam(h._id, req.user._id);
  if (!team) {
    res.status(400).json({ message: 'Join or create a team first.' });
    return null;
  }
  return { h, team };
}

// What a final submission must include (like SIH / Devfolio / Unstop).
function missingForFinal(s) {
  const missing = [];
  if ((s.title || '').length < 3) missing.push('project name');
  if ((s.problem || '').length < 30) missing.push('problem statement (30+ characters)');
  if ((s.solution || '').length < 30) missing.push('your solution (30+ characters)');
  if (!s.deckFile?.url && !s.deckUrl) missing.push('pitch deck (upload a PPT/PDF or add a link)');
  if (!s.prototypeFile?.url && !s.demoUrl && !s.repoUrl && !s.videoUrl) missing.push('prototype (upload a file, or add a demo, code or video link)');
  return missing;
}

// PUT /api/hackathons/:slug/submission  { ...fields, action: 'draft' | 'submit' }
// Saves your team's project. "submit" hands in the final version (it can still
// be edited until the deadline); "draft" just saves your progress.
router.put('/:slug/submission', protect, async (req, res) => {
  const ctx = await submissionContext(req, res);
  if (!ctx) return;
  const { h, team } = ctx;
  const b = req.body || {};
  const final = b.action === 'submit';
  if (final && team.members.length < h.teamMin) return res.status(400).json({ message: `Your team needs at least ${h.teamMin} members to submit.` });

  const links = { repoUrl: b.repoUrl, demoUrl: b.demoUrl, videoUrl: b.videoUrl, deckUrl: b.deckUrl };
  for (const [key, value] of Object.entries(links)) {
    if (value && !safeUrl(value)) return res.status(400).json({ message: `${key.replace('Url', '')} link must start with http:// or https://` });
  }
  const data = {
    title: clean(b.title, 100),
    tagline: clean(b.tagline, 200),
    description: clean(b.description, 8000),
    problem: clean(b.problem, 3000),
    solution: clean(b.solution, 3000),
    challenges: clean(b.challenges, 3000),
    impact: clean(b.impact, 3000),
    track: h.tracks.includes(b.track) ? b.track : '',
    techStack: (Array.isArray(b.techStack) ? b.techStack : String(b.techStack || '').split(','))
      .map((t) => clean(t, 30)).filter(Boolean).slice(0, 12),
    repoUrl: safeUrl(b.repoUrl),
    demoUrl: safeUrl(b.demoUrl),
    videoUrl: safeUrl(b.videoUrl),
    deckUrl: safeUrl(b.deckUrl),
    lastEditedBy: req.user._id,
  };
  if (data.title.length < 3) return res.status(400).json({ message: 'Give your project a name (3+ characters).' });

  const existing = await HackathonSubmission.findOne({ team: team._id }).lean();
  const wasFinal = existing && existing.status !== 'draft';
  // Once handed in, a submission stays final; edits must keep it complete.
  if (final || wasFinal) {
    const missing = missingForFinal({ ...existing, ...data });
    if (missing.length) return res.status(400).json({ message: `Before you submit, add: ${missing.join(', ')}.`, missing });
    data.status = 'submitted';
    if (!wasFinal) data.submittedAt = new Date();
  } else {
    data.status = 'draft';
  }

  const s = await HackathonSubmission.findOneAndUpdate(
    { team: team._id },
    { $set: data, $setOnInsert: { hackathon: h._id, team: team._id } },
    { upsert: true, new: true },
  );
  const others = team.members.filter((m) => String(m) !== String(req.user._id));
  if (others.length && (final || wasFinal)) {
    await notify(others, {
      type: 'hackathon',
      title: `${req.user.name} ${wasFinal ? 'updated' : 'submitted'} your team's project`,
      body: `${data.title} · ${h.title}`,
      link: `/hackathons/${h.slug}`,
    });
  }
  const message = !final && !wasFinal ? 'Draft saved. Submit it before the deadline.' : wasFinal ? 'Submission updated.' : 'Project submitted! 🎉';
  res.json({ id: String(s._id), status: s.status, message });
});

// POST /api/hackathons/:slug/submission/files/:kind  (multipart "file")
// kind: deck | prototype | screenshot. Starts a draft if there is none yet.
router.post('/:slug/submission/files/:kind', protect, teamLimiter, async (req, res, next) => {
  const ctx = await submissionContext(req, res);
  if (!ctx) return;
  req.ctx = ctx;
  next();
}, submissionFiles.receive, async (req, res) => {
  const { h, team } = req.ctx;
  const { kind } = req.params;
  try {
    let s = await HackathonSubmission.findOne({ team: team._id });
    if (kind === 'screenshot' && (s?.screenshots?.length || 0) >= submissionFiles.MAX_SCREENSHOTS) {
      return res.status(400).json({ message: `You can add up to ${submissionFiles.MAX_SCREENSHOTS} screenshots.` });
    }
    const file = await submissionFiles.store(req.file, req.fileType, `/codesphere/hackathons/${h._id}/${team._id}`);
    if (!s) {
      s = new HackathonSubmission({ hackathon: h._id, team: team._id, title: `${team.name}'s project`, status: 'draft' });
    }
    let replaced = null;
    if (kind === 'screenshot') s.screenshots.push(file);
    else {
      const key = kind === 'deck' ? 'deckFile' : 'prototypeFile';
      replaced = s[key];
      s[key] = file;
    }
    s.lastEditedBy = req.user._id;
    await s.save();
    if (replaced?.fileId) await submissionFiles.removeFiles([replaced]);
    res.status(201).json({ file: fileView(file), submission: submissionView(s.toObject(), { withAward: false }) });
  } catch (error) {
    console.error('Hackathon file upload error:', error.message);
    res.status(500).json({ message: 'Could not upload the file. Try again.' });
  }
});

// DELETE /api/hackathons/:slug/submission/files/:kind?url=  (url picks the screenshot)
router.delete('/:slug/submission/files/:kind', protect, async (req, res) => {
  const ctx = await submissionContext(req, res);
  if (!ctx) return;
  const { kind } = req.params;
  if (!submissionFiles.KINDS[kind]) return res.status(404).json({ message: 'Unknown upload type.' });
  const s = await HackathonSubmission.findOne({ team: ctx.team._id });
  if (!s) return res.status(404).json({ message: 'Nothing to remove.' });
  let removed = null;
  if (kind === 'screenshot') {
    const index = s.screenshots.findIndex((f) => f.url === req.query.url);
    if (index < 0) return res.status(404).json({ message: 'Screenshot not found.' });
    [removed] = s.screenshots.splice(index, 1);
  } else {
    const key = kind === 'deck' ? 'deckFile' : 'prototypeFile';
    removed = s[key];
    s[key] = undefined;
    // A final submission must keep a deck and a prototype.
    if (s.status !== 'draft' && missingForFinal(s.toObject()).length) {
      return res.status(400).json({ message: `Your submission needs a ${kind === 'deck' ? 'pitch deck' : 'prototype'}. Upload a new one to replace it instead.` });
    }
  }
  s.lastEditedBy = req.user._id;
  await s.save();
  if (removed?.fileId) await submissionFiles.removeFiles([removed]);
  res.json({ submission: submissionView(s.toObject(), { withAward: false }) });
});

module.exports = router;
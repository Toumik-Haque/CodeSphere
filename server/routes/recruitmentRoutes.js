// Recruitment drives and interview sessions (e.g. "GDG on Campus core team").
// Admins post directly; any member can post, and it goes live once an admin
// approves it. Members apply in one click and/or through a Google Form.
const express = require('express');
const crypto = require('crypto');
const multer = require('multer');
const mongoose = require('mongoose');
const { Recruitment, RecruitmentApplication } = require('../models/Recruitment');
const User = require('../models/User');
const { protect, optionalAuth } = require('../middleware/authMiddleware');
const { notify } = require('../utils/notify');
const { broadcastUpdate, getBroadcastOptions } = require('../utils/broadcast');
const { createLimiter } = require('../utils/rateLimit');
const { adminIds } = require('../utils/accounts');
const { storeImage, deleteImages } = require('../utils/forumMedia');

const router = express.Router();

const TYPES = ['recruitment', 'interview'];
const MODES = ['Online', 'In-person', 'Hybrid'];
const APPLICATION_STATUSES = ['applied', 'shortlisted', 'selected', 'rejected'];
const MAX_PENDING = 5;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const isId = (id) => mongoose.Types.ObjectId.isValid(id);
const isAdmin = (user) => user?.role === 'admin';
const clean = (value, max) => String(value ?? '').replace(/\r\n?/g, '\n').trim().slice(0, max);
const httpsUrl = (value) => {
  const url = clean(value, 500);
  if (!url) return '';
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'https:' ? parsed.toString() : null;
  } catch {
    return null;
  }
};
const toDate = (value) => {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};
const slugify = (text) => `${clean(text, 80).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60) || 'recruitment'}-${crypto.randomBytes(3).toString('hex')}`;
const parseList = (value) => {
  if (Array.isArray(value)) return value;
  try {
    return JSON.parse(value || '[]');
  } catch {
    return [];
  }
};

const submitLimiter = createLimiter({ windowMs: 60 * 60 * 1000, max: 20, message: 'Too many posts. Try again later.' });
const applyLimiter = createLimiter({ windowMs: 60 * 60 * 1000, max: 40, message: 'Too many applications. Try again later.' });

// ---------- Banner (5 MB image) ----------
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024, files: 1 },
  fileFilter: (req, file, cb) => (['image/jpeg', 'image/png', 'image/webp'].includes(file.mimetype)
    ? cb(null, true)
    : cb(new Error('The banner must be a JPEG, PNG or WebP image.'))),
});
const bannerUpload = (req, res, next) => upload.single('banner')(req, res, (error) => {
  if (error) return res.status(400).json({ message: error.code === 'LIMIT_FILE_SIZE' ? 'The banner must be 5 MB or smaller.' : error.message });
  return next();
});

// ---------- Validation ----------
function validate(body) {
  const data = {
    title: clean(body.title, 120),
    organization: clean(body.organization, 100),
    type: TYPES.includes(body.type) ? body.type : 'recruitment',
    summary: clean(body.summary, 300),
    description: clean(body.description, 8000),
    eligibility: clean(body.eligibility, 1500),
    mode: MODES.includes(body.mode) ? body.mode : 'In-person',
    venue: clean(body.venue, 200),
    platform: clean(body.platform, 120),
    applyBy: toDate(body.applyBy),
    oneClick: body.oneClick === true || body.oneClick === 'true',
    formUrl: httpsUrl(body.formUrl),
    contactName: clean(body.contactName, 80),
    contactEmail: clean(body.contactEmail, 200),
    roles: parseList(body.roles)
      .map((r) => ({
        title: clean(r?.title, 80),
        description: clean(r?.description, 400),
        openings: Number(r?.openings) > 0 ? Math.min(500, Math.round(Number(r.openings))) : undefined,
      }))
      .filter((r) => r.title)
      .slice(0, 10),
    process: parseList(body.process)
      .map((p) => ({ title: clean(p?.title, 80), detail: clean(p?.detail, 400), date: toDate(p?.date) || undefined }))
      .filter((p) => p.title)
      .slice(0, 8),
  };
  if (data.title.length < 5) return { error: 'Give it a title (at least 5 characters).' };
  if (data.organization.length < 2) return { error: 'Which organisation is recruiting?' };
  if (data.description.length < 40) return { error: 'Describe it in at least 40 characters: what it is and who should apply.' };
  if (!data.applyBy) return { error: 'Set the last date to apply.' };
  if (data.formUrl === null) return { error: 'The Google Form link must be a full https:// link.' };
  if (!data.oneClick && !data.formUrl) return { error: 'Choose how people register: one-click, a Google Form link, or both.' };
  if (data.mode !== 'Online' && !data.venue) return { error: 'Add the venue for an in-person or hybrid session.' };
  if (data.contactEmail && !EMAIL.test(data.contactEmail)) return { error: 'The contact email doesn\'t look right.' };
  return { data };
}

// ---------- Views ----------
const isOpen = (r, now = new Date()) => r.status === 'published' && new Date(r.applyBy) >= now;

function card(r, applicants = 0) {
  return {
    id: String(r._id),
    slug: r.slug,
    title: r.title,
    organization: r.organization,
    type: r.type,
    summary: r.summary,
    mode: r.mode,
    venue: r.venue,
    platform: r.platform,
    applyBy: r.applyBy,
    roles: (r.roles || []).map((role) => role.title),
    banner: r.banner?.url || '',
    oneClick: r.oneClick,
    hasForm: Boolean(r.formUrl),
    status: r.status,
    origin: r.origin,
    reviewStatus: r.reviewStatus,
    open: isOpen(r),
    applicants,
    createdAt: r.createdAt,
  };
}

const detail = (r, applicants) => ({
  ...card(r, applicants),
  description: r.description,
  eligibility: r.eligibility,
  rolesDetail: r.roles || [],
  process: r.process || [],
  formUrl: r.formUrl,
  contactName: r.contactName,
  contactEmail: r.contactEmail,
  reviewNote: r.reviewNote,
});

async function applicantCounts(ids) {
  const rows = await RecruitmentApplication.aggregate([
    { $match: { recruitment: { $in: ids }, status: { $ne: 'withdrawn' } } },
    { $group: { _id: '$recruitment', n: { $sum: 1 } } },
  ]);
  return new Map(rows.map((row) => [String(row._id), row.n]));
}

const canManage = (user, r) => Boolean(user && (isAdmin(user) || String(r.createdBy) === String(user._id)));

async function findManageable(req, res) {
  if (!isId(req.params.id)) {
    res.status(404).json({ message: 'Not found.' });
    return null;
  }
  const r = await Recruitment.findById(req.params.id);
  if (!r) {
    res.status(404).json({ message: 'Not found.' });
    return null;
  }
  if (!canManage(req.user, r)) {
    res.status(403).json({ message: 'Only the poster or an admin can do that.' });
    return null;
  }
  return r;
}

// Tell everyone about a newly live post (notification + email with banner).
async function announce(r, options) {
  await broadcastUpdate({
    title: `${r.type === 'interview' ? 'Interviews' : 'Now recruiting'}: ${r.organization}, ${r.title}`.slice(0, 200),
    body: `${r.summary || r.description.slice(0, 300)}\n\nApply by ${new Date(r.applyBy).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', timeZone: 'Asia/Kolkata' })}.`,
    link: `/recruitments/${r.slug}`,
    imageUrl: r.banner?.url,
    notificationType: 'recruitment',
    ...options,
  });
}

// =====================================================================
// Public
// =====================================================================

// GET /api/recruitments?type=recruitment|interview&state=open|closed
router.get('/', async (req, res) => {
  const now = new Date();
  const query = { status: { $in: ['published', 'closed'] } };
  if (TYPES.includes(req.query.type)) query.type = req.query.type;
  if (req.query.state === 'open') Object.assign(query, { status: 'published', applyBy: { $gte: now } });
  if (req.query.state === 'closed') query.$or = [{ status: 'closed' }, { applyBy: { $lt: now } }];
  const items = await Recruitment.find(query).sort({ applyBy: req.query.state === 'closed' ? -1 : 1 }).limit(100).lean();
  const counts = await applicantCounts(items.map((r) => r._id));
  // Open ones first (soonest deadline), then closed (most recent).
  const cards = items.map((r) => card(r, counts.get(String(r._id)) || 0));
  cards.sort((a, b) => (b.open - a.open) || (a.open ? new Date(a.applyBy) - new Date(b.applyBy) : new Date(b.applyBy) - new Date(a.applyBy)));
  res.json({ recruitments: cards });
});

// GET /api/recruitments/mine: what I've posted and what I've applied to.
router.get('/mine', protect, async (req, res) => {
  const [posted, applications] = await Promise.all([
    Recruitment.find({ createdBy: req.user._id }).sort({ createdAt: -1 }).lean(),
    RecruitmentApplication.find({ user: req.user._id }).populate('recruitment').sort({ createdAt: -1 }).lean(),
  ]);
  const counts = await applicantCounts(posted.map((r) => r._id));
  res.json({
    posted: posted.map((r) => card(r, counts.get(String(r._id)) || 0)),
    applications: applications.filter((a) => a.recruitment).map((a) => ({
      id: String(a._id),
      status: a.status,
      role: a.role,
      appliedAt: a.createdAt,
      recruitment: card(a.recruitment),
    })),
  });
});

// GET /api/recruitments/admin/all: every post, pending review first (admins).
router.get('/admin/all', protect, async (req, res) => {
  if (!isAdmin(req.user)) return res.status(403).json({ message: 'Admins only.' });
  const items = await Recruitment.find({}).sort({ createdAt: -1 }).limit(300).lean();
  const counts = await applicantCounts(items.map((r) => r._id));
  const posterIds = [...new Set(items.map((r) => String(r.createdBy)))].filter(isId);
  const posters = await User.find({ _id: { $in: posterIds } }).select('name email').lean();
  const posterById = new Map(posters.map((u) => [String(u._id), u]));
  res.json({
    recruitments: items.map((r) => ({
      ...detail(r, counts.get(String(r._id)) || 0),
      postedBy: posterById.get(String(r.createdBy)) ? { name: posterById.get(String(r.createdBy)).name, email: posterById.get(String(r.createdBy)).email } : { name: 'CodeSphere admin' },
    })),
  });
});

// GET /api/recruitments/:slug
router.get('/:slug', optionalAuth, async (req, res) => {
  const r = await Recruitment.findOne({ slug: clean(req.params.slug, 100).toLowerCase() }).lean();
  const manage = r && canManage(req.user, r);
  // Drafts and posts under review are visible only to their poster and admins.
  if (!r || (!['published', 'closed'].includes(r.status) && !manage)) {
    return res.status(404).json({ message: 'This recruitment was not found.' });
  }
  const [counts, mine] = await Promise.all([
    applicantCounts([r._id]),
    req.user ? RecruitmentApplication.findOne({ recruitment: r._id, user: req.user._id }).lean() : null,
  ]);
  res.json({
    recruitment: { ...detail(r, counts.get(String(r._id)) || 0), canManage: manage },
    myApplication: mine && mine.status !== 'withdrawn' ? { status: mine.status, role: mine.role, note: mine.note, appliedAt: mine.createdAt } : null,
  });
});

// =====================================================================
// Posting and editing
// =====================================================================

async function save(req, res) {
  const { data, error } = validate(req.body || {});
  if (error) return res.status(400).json({ message: error });
  const admin = isAdmin(req.user);
  const publishNow = admin && req.body.publish !== 'false' && req.body.publish !== false;

  let r = null;
  if (req.params.id) {
    r = await findManageable(req, res);
    if (!r) return null;
  } else if (!admin) {
    const pending = await Recruitment.countDocuments({ createdBy: req.user._id, reviewStatus: 'pending' });
    if (pending >= MAX_PENDING) return res.status(400).json({ message: `You already have ${MAX_PENDING} posts waiting for review.` });
  }

  let newBanner = null;
  if (req.file) {
    try {
      newBanner = await storeImage(req.file.buffer, req.user._id, 'recruitments');
    } catch (e) {
      return res.status(e.status || 500).json({ message: e.status ? e.message : 'Could not upload the banner.' });
    }
  }
  const oldBanner = r?.banner?.fileId && (newBanner || req.body.removeBanner === 'true') ? { fileId: r.banner.fileId } : null;

  const wasLive = r?.status === 'published';
  if (!r) {
    r = new Recruitment({
      ...data,
      slug: slugify(`${data.organization} ${data.title}`),
      createdBy: req.user._id,
      origin: admin ? 'club' : 'community',
    });
  } else {
    Object.assign(r, data);
  }
  if (newBanner) r.banner = newBanner;
  else if (req.body.removeBanner === 'true') r.banner = { url: '', fileId: '' };

  if (admin) {
    // Admins choose: publish now, or keep as a draft.
    if (publishNow) {
      r.status = new Date(r.applyBy) < new Date() ? 'closed' : 'published';
      if (r.origin === 'community' && r.reviewStatus === 'pending') {
        r.reviewStatus = 'approved';
        r.reviewedBy = req.user._id;
        r.reviewedAt = new Date();
      }
    } else if (!wasLive) {
      r.status = 'draft';
    }
  } else {
    // Members' posts (new or edited) wait for an admin to approve them.
    r.status = 'draft';
    r.reviewStatus = 'pending';
    r.reviewNote = '';
  }

  try {
    await r.save();
  } catch (e) {
    if (newBanner) await deleteImages([newBanner]);
    return res.status(500).json({ message: 'Could not save. Try again.' });
  }
  if (oldBanner) await deleteImages([oldBanner]);

  if (!admin) {
    await notify(await adminIds(), {
      type: 'recruitment',
      title: `New ${r.type} to review: ${r.title}`,
      body: `${r.organization} · posted by ${req.user.name}`,
      link: '/admin/recruitments',
    });
  } else if (!wasLive && r.status === 'published') {
    await announce(r, getBroadcastOptions(req.body));
  }

  return res.status(req.params.id ? 200 : 201).json({
    id: String(r._id),
    slug: r.slug,
    status: r.status,
    reviewStatus: r.reviewStatus,
    message: admin
      ? (r.status === 'published' ? 'Published! It is live now.' : 'Saved as a draft.')
      : 'Submitted! An admin will review it, and you\'ll be notified when it goes live.',
  });
}

router.post('/', protect, submitLimiter, bannerUpload, save);
router.put('/:id', protect, submitLimiter, bannerUpload, save);

// POST /api/recruitments/:id/review { decision: approve|reject, note }  (admins)
router.post('/:id/review', protect, async (req, res) => {
  if (!isAdmin(req.user)) return res.status(403).json({ message: 'Admins only.' });
  if (!isId(req.params.id)) return res.status(404).json({ message: 'Not found.' });
  const r = await Recruitment.findById(req.params.id);
  if (!r) return res.status(404).json({ message: 'Not found.' });
  const approve = req.body.decision === 'approve';
  const note = clean(req.body.note, 1000);
  if (!approve && !note) return res.status(400).json({ message: 'Tell the poster what to change.' });
  r.reviewStatus = approve ? 'approved' : 'rejected';
  r.reviewNote = note;
  r.reviewedBy = req.user._id;
  r.reviewedAt = new Date();
  r.status = approve ? (new Date(r.applyBy) < new Date() ? 'closed' : 'published') : 'draft';
  await r.save();
  await notify(r.createdBy, {
    type: 'recruitment',
    title: approve ? `Approved: "${r.title}" is now live 🎉` : `Changes needed: "${r.title}"`,
    body: approve ? (note || 'Thanks for posting on CodeSphere.') : note,
    link: approve ? `/recruitments/${r.slug}` : `/recruitments/${r.id}/edit`,
  });
  if (approve && r.status === 'published') await announce(r, { ...getBroadcastOptions(req.body), notificationExcludeUserIds: [r.createdBy] });
  res.json({ reviewStatus: r.reviewStatus, status: r.status });
});

// POST /api/recruitments/:id/close  { closed: true|false }: stop or reopen applications.
router.post('/:id/close', protect, async (req, res) => {
  const r = await findManageable(req, res);
  if (!r) return;
  if (r.status === 'draft') return res.status(400).json({ message: 'It isn\'t live yet.' });
  r.status = req.body.closed === false ? 'published' : 'closed';
  await r.save();
  res.json({ status: r.status });
});

// DELETE /api/recruitments/:id
router.delete('/:id', protect, async (req, res) => {
  const r = await findManageable(req, res);
  if (!r) return;
  await Promise.all([RecruitmentApplication.deleteMany({ recruitment: r._id }), r.deleteOne()]);
  if (r.banner?.fileId) await deleteImages([{ fileId: r.banner.fileId }]);
  res.json({ message: 'Deleted.' });
});

// =====================================================================
// Applying
// =====================================================================

// POST /api/recruitments/:slug/apply { role, note }: one-click application.
router.post('/:slug/apply', protect, applyLimiter, async (req, res) => {
  if (isAdmin(req.user)) return res.status(400).json({ message: 'Admins can\'t apply.' });
  const r = await Recruitment.findOne({ slug: clean(req.params.slug, 100).toLowerCase() });
  if (!r || !['published', 'closed'].includes(r.status)) return res.status(404).json({ message: 'This recruitment was not found.' });
  if (!r.oneClick) return res.status(400).json({ message: 'Apply through the Google Form for this one.' });
  if (!isOpen(r)) return res.status(400).json({ message: 'Applications are closed.' });
  const roles = r.roles.map((role) => role.title);
  const role = clean(req.body.role, 80);
  if (roles.length && !roles.includes(role)) return res.status(400).json({ message: 'Pick the role you are applying for.' });

  const existing = await RecruitmentApplication.findOne({ recruitment: r._id, user: req.user._id });
  if (existing && existing.status !== 'withdrawn') return res.status(400).json({ message: 'You have already applied.' });
  const application = existing || new RecruitmentApplication({ recruitment: r._id, user: req.user._id });
  Object.assign(application, { role, note: clean(req.body.note, 600), status: 'applied' });
  await application.save();

  await notify(r.createdBy, {
    type: 'recruitment',
    title: `${req.user.name} applied${role ? ` for ${role}` : ''}`,
    body: r.title,
    link: `/recruitments/${r.slug}`,
  });
  res.status(201).json({ message: 'Application sent! You\'ll be notified about the next steps.', application: { status: 'applied', role } });
});

// DELETE /api/recruitments/:slug/apply: withdraw.
router.delete('/:slug/apply', protect, async (req, res) => {
  const r = await Recruitment.findOne({ slug: clean(req.params.slug, 100).toLowerCase() }).select('_id applyBy status');
  if (!r) return res.status(404).json({ message: 'Not found.' });
  const application = await RecruitmentApplication.findOne({ recruitment: r._id, user: req.user._id });
  if (!application || application.status === 'withdrawn') return res.status(404).json({ message: 'You haven\'t applied.' });
  if (['selected', 'rejected'].includes(application.status)) return res.status(400).json({ message: 'A decision has already been made on your application.' });
  application.status = 'withdrawn';
  await application.save();
  res.json({ message: 'Application withdrawn.' });
});

// =====================================================================
// Applicants (poster and admins)
// =====================================================================

const APPLICANT_FIELDS = 'name email username phone collegeName yearOfStudy degree department github linkedin profileImage avatarUrl resume';

async function applicantsOf(r) {
  const rows = await RecruitmentApplication.find({ recruitment: r._id, status: { $ne: 'withdrawn' } })
    .populate('user', APPLICANT_FIELDS)
    .sort({ createdAt: 1 })
    .lean();
  return rows.filter((a) => a.user).map((a) => ({
    id: String(a._id),
    status: a.status,
    role: a.role,
    note: a.note,
    appliedAt: a.createdAt,
    user: {
      name: a.user.name,
      email: a.user.email,
      username: a.user.username,
      phone: a.user.phone || '',
      college: a.user.collegeName || '',
      year: a.user.yearOfStudy || '',
      department: a.user.department || a.user.degree || '',
      github: a.user.github || '',
      linkedin: a.user.linkedin || '',
      avatar: a.user.profileImage?.url || a.user.avatarUrl || '',
      resume: a.user.resume?.url || '',
    },
  }));
}

// GET /api/recruitments/:id/applications
router.get('/:id/applications', protect, async (req, res) => {
  const r = await findManageable(req, res);
  if (!r) return;
  res.json({ applications: await applicantsOf(r) });
});

// GET /api/recruitments/:id/applications.csv
router.get('/:id/applications.csv', protect, async (req, res) => {
  const r = await findManageable(req, res);
  if (!r) return;
  const rows = await applicantsOf(r);
  const cell = (v) => {
    const text = String(v ?? '').replace(/\r?\n/g, ' ');
    return `"${(/^[=+\-@]/.test(text) ? `'${text}` : text).replace(/"/g, '""')}"`;
  };
  const header = ['Name', 'Email', 'Phone', 'Role', 'Status', 'College', 'Year', 'Department', 'GitHub', 'LinkedIn', 'Resume', 'Note', 'Applied at'];
  const lines = rows.map((a) => [a.user.name, a.user.email, a.user.phone, a.role, a.status, a.user.college, a.user.year, a.user.department,
    a.user.github, a.user.linkedin, a.user.resume, a.note, new Date(a.appliedAt).toISOString()]);
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="${r.slug}-applicants.csv"`);
  res.send(`﻿${[header, ...lines].map((line) => line.map(cell).join(',')).join('\r\n')}`);
});

// PATCH /api/recruitments/applications/:appId { status }
router.patch('/applications/:appId', protect, async (req, res) => {
  if (!isId(req.params.appId)) return res.status(404).json({ message: 'Not found.' });
  const status = req.body.status;
  if (!APPLICATION_STATUSES.includes(status)) return res.status(400).json({ message: 'Unknown status.' });
  const application = await RecruitmentApplication.findById(req.params.appId);
  if (!application || application.status === 'withdrawn') return res.status(404).json({ message: 'Not found.' });
  const r = await Recruitment.findById(application.recruitment);
  if (!r || !canManage(req.user, r)) return res.status(403).json({ message: 'Only the poster or an admin can do that.' });
  const changed = application.status !== status;
  application.status = status;
  await application.save();
  if (changed && status !== 'applied') {
    const messages = {
      shortlisted: `You've been shortlisted for ${r.title} 🎉`,
      selected: `Congratulations! You've been selected for ${r.title} 🎉`,
      rejected: `Update on your application to ${r.title}`,
    };
    await notify(application.user, {
      type: 'recruitment',
      title: messages[status],
      body: status === 'rejected' ? `Thank you for applying to ${r.organization}. You weren't selected this time.` : `${r.organization}: watch for details on the next steps.`,
      link: `/recruitments/${r.slug}`,
    });
  }
  res.json({ status: application.status });
});

module.exports = router;

// Community hosting: any signed-in student can submit an event or a
// hackathon. Submissions wait in a review queue; admins (or hackathon
// organisers, for hackathons) approve or reject them with a reason, and the
// host can edit and resubmit.

const express = require('express');
const multer = require('multer');
const mongoose = require('mongoose');
const Event = require('../models/Event');
const User = require('../models/User');
const { Hackathon, HackathonTeam, HackathonSubmission } = require('../models/Hackathon');
const { protect, hasStaffRole } = require('../middleware/authMiddleware');
const { notify } = require('../utils/notify');
const { broadcastUpdate, getBroadcastOptions } = require('../utils/broadcast');
const { createLimiter } = require('../utils/rateLimit');
const { storeImage, deleteImages } = require('../utils/forumMedia');
const sanitizeDescription = require('../utils/sanitizeDescription');
const { validateHackathon, clean, safeUrl } = require('../utils/hackathonValidate');

const router = express.Router();
const KINDS = ['event', 'hackathon'];
const EVENT_CATEGORIES = ['Workshop', 'Hackathon', 'Community Meetup'];
const EVENT_MODES = ['In-person', 'Online', 'Hybrid'];
const MAX_OPEN = 5;
const submitLimiter = createLimiter({ windowMs: 24 * 60 * 60 * 1000, max: 10, message: 'You can submit up to 10 times a day.' });

const isId = (id) => mongoose.Types.ObjectId.isValid(id);
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const LINKEDIN = /^https:\/\/([a-z0-9-]+\.)?linkedin\.com\//i;
const INSTAGRAM = /^https:\/\/(www\.)?instagram\.com\//i;

// ---------- Banner upload (5 MB, real image check) ----------
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024, files: 1 },
  fileFilter: (req, file, cb) => (['image/jpeg', 'image/png', 'image/webp'].includes(file.mimetype)
    ? cb(null, true)
    : cb(new Error('The banner must be a JPEG, PNG or WebP image.'))),
});
function bannerUpload(req, res, next) {
  upload.single('banner')(req, res, (error) => {
    if (error) return res.status(400).json({ message: error.code === 'LIMIT_FILE_SIZE' ? 'The banner must be 5 MB or smaller.' : error.message });
    return next();
  });
}

// ---------- Text helpers ----------
const escapeHtml = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
// Plain text from the form → safe paragraphs for the event page.
const textToHtml = (text) => text.split(/\n{2,}/).map((p) => `<p>${escapeHtml(p).replace(/\n/g, '<br>')}</p>`).join('');
const htmlToText = (html = '') => html
  .replace(/<br\s*\/?>/gi, '\n').replace(/<\/p>\s*/gi, '\n\n').replace(/<[^>]*>/g, '')
  .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&')
  .trim();

function parseJsonField(value, fallback) {
  if (Array.isArray(value)) return value;
  try {
    return value ? JSON.parse(value) : fallback;
  } catch {
    return fallback;
  }
}

// Fields every hosted listing needs.
function validateHost(body) {
  const host = {
    hostName: clean(body.hostName, 120),
    contactEmail: clean(body.contactEmail, 200).toLowerCase(),
    contactPhone: clean(body.contactPhone, 30),
    websiteLink: safeUrl(body.websiteLink),
    linkedinPostLink: safeUrl(body.linkedinPostLink),
    instagramPostLink: safeUrl(body.instagramPostLink),
    rules: clean(body.rules, 10000),
  };
  if (host.hostName.length < 2) return { error: 'Add the organiser / club name.' };
  if (!EMAIL.test(host.contactEmail)) return { error: 'Add a valid contact email.' };
  if (host.contactPhone && !/^[+\d][\d\s-]{6,}$/.test(host.contactPhone)) return { error: 'The phone number looks invalid.' };
  if (body.websiteLink && !host.websiteLink) return { error: 'The website must be an http(s) link.' };
  if (!LINKEDIN.test(host.linkedinPostLink)) return { error: 'Add the LinkedIn post link (https://www.linkedin.com/…).' };
  if (!INSTAGRAM.test(host.instagramPostLink)) return { error: 'Add the Instagram post link (https://www.instagram.com/…).' };
  if (host.rules.length < 20) return { error: 'Add the rules / guidelines (at least 20 characters).' };
  return { host };
}

function validateEventFields(body) {
  const description = clean(body.description, 5000);
  const data = {
    title: clean(body.title, 120),
    category: EVENT_CATEGORIES.includes(body.category) ? body.category : '',
    mode: EVENT_MODES.includes(body.mode) ? body.mode : 'In-person',
    date: new Date(body.date),
    endDate: body.endDate ? new Date(body.endDate) : null,
    venue: clean(body.venue, 200),
    meetingLink: safeUrl(body.meetingLink),
    registrationLink: safeUrl(body.registrationLink),
  };
  if (data.title.length < 3) return { error: 'Give the event a title.' };
  if (!data.category) return { error: 'Choose a category.' };
  if (description.length < 50) return { error: 'Describe the event in at least 50 characters.' };
  if (Number.isNaN(data.date.getTime())) return { error: 'Set the start date and time.' };
  if (data.date < new Date()) return { error: 'The event must start in the future.' };
  if (data.endDate && (Number.isNaN(data.endDate.getTime()) || data.endDate < data.date)) return { error: 'The end must be after the start.' };
  if (data.mode !== 'Online' && !data.venue) return { error: 'Add the venue.' };
  if (data.mode !== 'In-person' && !data.meetingLink) return { error: 'Add the meeting / stream link.' };
  if (!data.registrationLink) return { error: 'Add the registration link (http/https).' };
  if (data.mode === 'Online') data.venue = '';
  if (data.mode === 'In-person') data.meetingLink = '';
  data.description = sanitizeDescription(textToHtml(description));
  return { data };
}

function validateHackathonFields(body) {
  const { data, error } = validateHackathon({
    ...body,
    tracks: parseJsonField(body.tracks, []),
    prizes: parseJsonField(body.prizes, []),
    status: 'draft',
    bannerUrl: '',
  });
  if (error) return { error };
  if (data.description.length < 50) return { error: 'Describe the hackathon in at least 50 characters.' };
  if (data.regEnd < new Date()) return { error: 'Registration must still be open in the future.' };
  delete data.bannerUrl;
  delete data.status;
  return { data };
}

const modelFor = (kind) => (kind === 'event' ? Event : Hackathon);
const bannerOf = (doc, kind) => (kind === 'event' ? doc.bannerImage?.url : doc.bannerUrl);

// Who may review this kind of submission.
const canReview = (user, kind) => user.role === 'admin' || (kind === 'hackathon' && hasStaffRole(user, 'hackathon-organizer'));

async function reviewers(kind) {
  const filter = kind === 'hackathon'
    ? { $or: [{ role: 'admin' }, { staffRoles: 'hackathon-organizer' }] }
    : { role: 'admin' };
  return (await User.find(filter).select('_id').lean()).map((u) => u._id);
}

function view(doc, kind) {
  const base = {
    kind,
    id: String(doc._id),
    title: doc.title,
    slug: doc.slug,
    reviewStatus: doc.reviewStatus,
    reviewNote: doc.reviewNote,
    reviewedAt: doc.reviewedAt,
    submittedAt: doc.submittedAt,
    published: doc.status === 'published',
    bannerUrl: bannerOf(doc, kind) || '',
    hostName: doc.hostName,
    contactEmail: doc.contactEmail,
    contactPhone: doc.contactPhone,
    websiteLink: doc.websiteLink,
    linkedinPostLink: doc.linkedinPostLink,
    instagramPostLink: doc.instagramPostLink,
    rules: doc.rules,
    mode: doc.mode,
    venue: doc.venue,
    updatedAt: doc.updatedAt,
    host: doc.createdBy?.name ? { id: String(doc.createdBy._id), name: doc.createdBy.name, email: doc.createdBy.email } : undefined,
  };
  if (kind === 'event') {
    return {
      ...base,
      category: doc.category,
      description: htmlToText(doc.description),
      date: doc.date,
      endDate: doc.endDate,
      meetingLink: doc.meetingLink,
      registrationLink: doc.registrationLink,
    };
  }
  return {
    ...base,
    tagline: doc.tagline,
    description: doc.description,
    tracks: doc.tracks,
    prizes: (doc.prizes || []).map((p) => ({ title: p.title, reward: p.reward })),
    regStart: doc.regStart,
    regEnd: doc.regEnd,
    submissionStart: doc.submissionStart,
    submissionEnd: doc.submissionEnd,
    teamMin: doc.teamMin,
    teamMax: doc.teamMax,
  };
}

async function uniqueSlug(Model, title) {
  const base = clean(title, 70).normalize('NFKD').replace(/[̀-ͯ]/g, '').toLowerCase()
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'listing';
  let slug = base;
  for (let n = 2; await Model.exists({ slug }); n += 1) slug = `${base}-${n}`;
  return slug;
}

function kindParam(req, res) {
  if (!KINDS.includes(req.params.kind)) {
    res.status(404).json({ message: 'Unknown listing type.' });
    return null;
  }
  return req.params.kind;
}

// =====================================================================
// Admin review queue
// =====================================================================

// GET /api/host/admin/queue?status=pending|approved|rejected
router.get('/admin/queue', protect, async (req, res) => {
  const kinds = KINDS.filter((k) => canReview(req.user, k));
  if (!kinds.length) return res.status(403).json({ message: 'Not allowed.' });
  const status = ['pending', 'approved', 'rejected'].includes(req.query.status) ? req.query.status : 'pending';
  const lists = await Promise.all(kinds.map(async (kind) => {
    const docs = await modelFor(kind).find({ origin: 'community', reviewStatus: status })
      .populate('createdBy', 'name email').sort({ submittedAt: status === 'pending' ? 1 : -1 }).limit(100).lean();
    return docs.map((d) => view(d, kind));
  }));
  const counts = {};
  await Promise.all(kinds.map(async (kind) => {
    counts[kind] = await modelFor(kind).countDocuments({ origin: 'community', reviewStatus: 'pending' });
  }));
  res.json({ items: lists.flat(), counts, kinds });
});

// POST /api/host/admin/:kind/:id/review { decision: 'approve' | 'reject', note }
router.post('/admin/:kind/:id/review', protect, async (req, res) => {
  const kind = kindParam(req, res);
  if (!kind) return;
  if (!canReview(req.user, kind)) return res.status(403).json({ message: 'Not allowed.' });
  if (!isId(req.params.id)) return res.status(404).json({ message: 'Not found.' });
  const { decision } = req.body || {};
  const note = clean(req.body?.note, 1000);
  if (!['approve', 'reject'].includes(decision)) return res.status(400).json({ message: 'Choose approve or reject.' });
  if (decision === 'reject' && note.length < 5) return res.status(400).json({ message: 'Tell the host why, so they can fix it.' });

  const doc = await modelFor(kind).findOne({ _id: req.params.id, origin: 'community' });
  if (!doc) return res.status(404).json({ message: 'Not found.' });
  doc.reviewStatus = decision === 'approve' ? 'approved' : 'rejected';
  doc.status = decision === 'approve' ? 'published' : 'draft';
  doc.reviewNote = note;
  doc.reviewedAt = new Date();
  doc.reviewedBy = req.user._id;
  await doc.save();

  const path = kind === 'event' ? `/events/${doc.slug}` : `/hackathons/${doc.slug}`;
  await notify(doc.createdBy, {
    type: 'host-review',
    title: decision === 'approve' ? `Approved: "${doc.title}" is now live 🎉` : `Changes needed: "${doc.title}"`,
    body: decision === 'approve' ? (note || 'Thanks for hosting with CodeSphere.') : note,
    link: decision === 'approve' ? path : '/host',
  });
  if (decision === 'approve' && req.user.role === 'admin') {
    await broadcastUpdate({
      title: `New community ${kind}: ${doc.title}`,
      body: kind === 'event'
        ? htmlToText(doc.description).slice(0, 400)
        : doc.tagline || doc.description.slice(0, 400),
      link: path,
      notificationExcludeUserIds: [doc.createdBy],
      ...getBroadcastOptions(req.body),
    });
  }
  res.json({ reviewStatus: doc.reviewStatus, published: doc.status === 'published' });
});

// =====================================================================
// Hosts
// =====================================================================

// GET /api/host/mine
router.get('/mine', protect, async (req, res) => {
  const [events, hackathons] = await Promise.all([
    Event.find({ origin: 'community', createdBy: req.user._id }).sort({ updatedAt: -1 }).lean(),
    Hackathon.find({ origin: 'community', createdBy: req.user._id }).sort({ updatedAt: -1 }).lean(),
  ]);
  res.json({ items: [...events.map((e) => view(e, 'event')), ...hackathons.map((h) => view(h, 'hackathon'))].sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt)) });
});

// GET /api/host/:kind/:id (host or reviewer)
router.get('/:kind/:id', protect, async (req, res) => {
  const kind = kindParam(req, res);
  if (!kind) return;
  if (!isId(req.params.id)) return res.status(404).json({ message: 'Not found.' });
  const doc = await modelFor(kind).findOne({ _id: req.params.id, origin: 'community' }).populate('createdBy', 'name email').lean();
  if (!doc || (String(doc.createdBy?._id) !== String(req.user._id) && !canReview(req.user, kind))) return res.status(404).json({ message: 'Not found.' });
  res.json({ item: view(doc, kind) });
});

// Create (POST /api/host/:kind) or update + resubmit (PUT /api/host/:kind/:id)
async function save(req, res) {
  const kind = kindParam(req, res);
  if (!kind) return;
  const Model = modelFor(kind);
  const existing = req.params.id ? (isId(req.params.id) ? await Model.findOne({ _id: req.params.id, origin: 'community', createdBy: req.user._id }) : null) : null;
  if (req.params.id && !existing) return res.status(404).json({ message: 'Not found.' });

  if (!existing) {
    const open = (await Event.countDocuments({ origin: 'community', createdBy: req.user._id, reviewStatus: 'pending' }))
      + (await Hackathon.countDocuments({ origin: 'community', createdBy: req.user._id, reviewStatus: 'pending' }));
    if (open >= MAX_OPEN) return res.status(429).json({ message: `You already have ${MAX_OPEN} submissions waiting for review.` });
  }

  const body = req.body || {};
  const { host, error: hostError } = validateHost(body);
  if (hostError) return res.status(400).json({ message: hostError });
  const { data, error } = kind === 'event' ? validateEventFields(body) : validateHackathonFields(body);
  if (error) return res.status(400).json({ message: error });
  if (!existing && !req.file) return res.status(400).json({ message: 'Upload a banner image.' });

  let banner = null;
  try {
    if (req.file) banner = await storeImage(req.file.buffer, req.user._id, 'hosted');
  } catch (e) {
    return res.status(e.status || 500).json({ message: e.status ? e.message : 'Could not upload the banner.' });
  }

  const doc = existing || new Model({ origin: 'community', createdBy: req.user._id });
  const oldBanner = kind === 'event' ? doc.bannerImage?.publicId : doc.bannerFileId;
  Object.assign(doc, data, host, {
    reviewStatus: 'pending',
    status: 'draft', // hidden until approved (again)
    reviewNote: existing ? doc.reviewNote : '',
    submittedAt: new Date(),
  });
  if (kind === 'event') {
    if (banner) doc.bannerImage = { url: banner.url, publicId: banner.fileId, provider: 'imagekit' };
  } else if (banner) {
    doc.bannerUrl = banner.url;
    doc.bannerFileId = banner.fileId;
  }
  if (!existing) doc.slug = await uniqueSlug(Model, data.title);

  try {
    await doc.save();
  } catch (e) {
    if (banner) await deleteImages([banner]);
    return res.status(e.code === 11000 ? 409 : 500).json({ message: e.code === 11000 ? 'Try a slightly different title.' : 'Could not save.' });
  }
  if (banner && oldBanner) await deleteImages([{ fileId: oldBanner }]);

  await notify(await reviewers(kind), {
    type: 'host-review',
    title: `${existing ? 'Updated' : 'New'} ${kind} to review: ${doc.title}`,
    body: `Submitted by ${req.user.name} for ${host.hostName}`,
    link: '/admin/review',
  });
  res.status(existing ? 200 : 201).json({ id: String(doc._id), message: existing ? 'Changes sent for review.' : 'Submitted! We\'ll notify you after review.' });
}

router.post('/:kind', protect, submitLimiter, bannerUpload, save);
router.put('/:kind/:id', protect, submitLimiter, bannerUpload, save);

// DELETE /api/host/:kind/:id — withdraw (not once approved; ask an admin then)
router.delete('/:kind/:id', protect, async (req, res) => {
  const kind = kindParam(req, res);
  if (!kind) return;
  if (!isId(req.params.id)) return res.status(404).json({ message: 'Not found.' });
  const Model = modelFor(kind);
  const doc = await Model.findOne({ _id: req.params.id, origin: 'community', createdBy: req.user._id });
  if (!doc) return res.status(404).json({ message: 'Not found.' });
  if (doc.reviewStatus === 'approved') return res.status(400).json({ message: 'This is live. Contact an admin to take it down.' });
  await doc.deleteOne();
  if (kind === 'hackathon') {
    await Promise.all([HackathonTeam.deleteMany({ hackathon: doc._id }), HackathonSubmission.deleteMany({ hackathon: doc._id })]);
  }
  const fileId = kind === 'event' ? doc.bannerImage?.publicId : doc.bannerFileId;
  if (fileId) await deleteImages([{ fileId }]);
  res.json({ message: 'Withdrawn.' });
});

module.exports = router;

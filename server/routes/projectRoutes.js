// Project Hub: showcase, GitHub import, guided projects, Build in Public.

const express = require('express');
const mongoose = require('mongoose');
const User = require('../models/User');
const { Project, ProjectUpdate, GuidedProject, GuidedProgress, PROJECT_CATEGORIES, PROJECT_LEVELS } = require('../models/Project');
const { protect, optionalAuth, hasStaffRole } = require('../middleware/authMiddleware');
const { createLimiter } = require('../utils/rateLimit');
const { notify } = require('../utils/notify');
const { broadcastUpdate, getBroadcastOptions } = require('../utils/broadcast');
const { handleImageUpload, storeImage, deleteImages } = require('../utils/forumMedia');
const { fetchRepoPreview, ImportError } = require('../utils/githubImport');
const { track } = require('../utils/projectEvents');
const { adminIds } = require('../utils/accounts');

const router = express.Router();

const previewLimiter = createLimiter({ windowMs: 60 * 60 * 1000, max: 30, message: 'Too many imports this hour. Try again later.' });
const writeLimiter = createLimiter({ windowMs: 60 * 60 * 1000, max: 60, message: 'Slow down a little and try again soon.' });
const updateLimiter = createLimiter({ windowMs: 60 * 60 * 1000, max: 20, message: 'Up to 20 updates an hour.' });
const SYNC_COOLDOWN_MS = 10 * 60 * 1000;
const MAX_SCREENSHOTS = 6;

const isId = (id) => mongoose.Types.ObjectId.isValid(id);
const clean = (v, max) => String(v ?? '').replace(/\r\n?/g, '\n').replace(/<[^>]*>/g, '').trim().slice(0, max);
const safeUrl = (v) => {
  const s = String(v || '').trim().slice(0, 500);
  return /^https?:\/\/[^\s<>"]+$/i.test(s) ? s : '';
};
const list = (v, maxItems, maxLen) => (Array.isArray(v) ? v : String(v || '').split(','))
  .map((x) => clean(x, maxLen)).filter(Boolean).slice(0, maxItems);
const initials = (name = '') => name.split(/\s+/).filter(Boolean).map((w) => w[0]).slice(0, 2).join('').toUpperCase();
const isReviewer = (user) => Boolean(user) && (user.role === 'admin' || hasStaffRole(user, 'project-reviewer'));
const isOwner = (project, user) => Boolean(user) && String(project.owner?._id || project.owner) === String(user._id);
const memberOf = (project, user) => (user ? (project.members || []).find((m) => String(m.user?._id || m.user) === String(user._id)) : null);
// Owner or an accepted team member.
const canWork = (project, user) => isOwner(project, user) || memberOf(project, user)?.status === 'active';

async function uniqueSlug(title) {
  const base = clean(title, 60).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'project';
  let slug = base;
  for (let n = 2; await Project.exists({ slug }); n += 1) slug = `${base}-${n}`;
  return slug;
}

const person = (u) => (u ? { id: String(u._id), name: u.name, initials: initials(u.name), avatarUrl: u.profileImage?.url || '' } : null);

function card(p) {
  return {
    id: String(p._id),
    slug: p.slug,
    title: p.title,
    summary: p.summary,
    category: p.category,
    level: p.level,
    teamType: p.teamType,
    techStack: p.techStack,
    cover: p.cover?.url || p.screenshots?.[0]?.url || '',
    demoUrl: p.demoUrl,
    githubUrl: p.github?.url || '',
    license: p.github?.license || '',
    featured: p.featured,
    status: p.status,
    sourceType: p.sourceType,
    owner: person(p.owner),
    contributorsCount: (p.contributors || []).length,
    publishedAt: p.publishedAt,
    updatedAt: p.updatedAt,
  };
}

function detail(p, viewer) {
  const mine = isOwner(p, viewer);
  const staff = isReviewer(viewer);
  return {
    ...card(p),
    problem: p.problem,
    solution: p.solution,
    features: p.features,
    contribution: p.contribution,
    outcomes: p.outcomes,
    limitations: p.limitations,
    projectStatus: p.projectStatus,
    contributors: p.contributors.map((c) => ({ name: c.name, role: c.role })),
    tags: p.tags,
    videoUrl: p.videoUrl,
    screenshots: (p.screenshots || []).map((s) => ({ id: String(s._id), url: s.url, caption: s.caption })),
    coverId: p.cover?.fileId ? 'cover' : '',
    github: p.github?.url ? {
      url: p.github.url, owner: p.github.owner, repo: p.github.repo, description: p.github.description,
      license: p.github.license, licenseName: p.github.licenseName, languages: p.github.languages, topics: p.github.topics,
      stars: p.github.stars, forks: p.github.forks, pushedAt: p.github.pushedAt, readmePreview: p.github.readmePreview,
      fetchedAt: p.github.fetchedAt, defaultBranch: p.github.defaultBranch,
    } : null,
    visibility: p.visibility,
    lastSyncedAt: p.lastSyncedAt,
    guided: p.guided ? { slug: p.guided.slug, title: p.guided.title } : null,
    ownershipVerified: p.ownershipVerified?.kind ? { kind: p.ownershipVerified.kind, login: p.ownershipVerified.login } : null,
    team: (p.members || []).filter((m) => m.status === 'active' && m.user?.name).map((m) => ({ ...person(m.user), role: m.role })),
    ...(canWork(p, viewer) || staff ? {
      githubUnavailable: p.githubUnavailable,
      invites: (p.members || []).filter((m) => m.status === 'invited' && m.user?.name).map((m) => ({ ...person(m.user), role: m.role })),
      tasks: (p.tasks || []).map((t) => ({ id: String(t._id), title: t.title, status: t.status, assignee: t.assignee?.name ? person(t.assignee) : null })),
    } : {}),
    myInvite: memberOf(p, viewer)?.status === 'invited' ? { role: memberOf(p, viewer).role } : null,
    isMember: canWork(p, viewer),
    ...(mine || staff ? { reviewNote: p.reviewNote, authorshipConfirmed: p.authorshipConfirmed, submittedAt: p.submittedAt } : {}),
    canEdit: mine,
    canReview: staff,
  };
}

// Fields a student writes (never overwritten by GitHub refreshes).
function readForm(b) {
  const data = {
    title: clean(b.title, 100),
    summary: clean(b.summary, 280),
    problem: clean(b.problem, 3000),
    solution: clean(b.solution, 5000),
    features: list(b.features, 12, 160),
    contribution: clean(b.contribution, 1500),
    outcomes: clean(b.outcomes, 1500),
    limitations: clean(b.limitations, 1500),
    category: PROJECT_CATEGORIES.includes(b.category) ? b.category : 'other',
    level: PROJECT_LEVELS.includes(b.level) ? b.level : 'Beginner',
    projectStatus: ['prototype', 'in-progress', 'completed', 'archived'].includes(b.projectStatus) ? b.projectStatus : 'completed',
    teamType: b.teamType === 'team' ? 'team' : 'individual',
    contributors: (Array.isArray(b.contributors) ? b.contributors : [])
      .map((c) => ({ name: clean(c?.name, 80), role: clean(c?.role, 80) })).filter((c) => c.name).slice(0, 12),
    techStack: list(b.techStack, 15, 40),
    tags: list(b.tags, 10, 30).map((t) => t.toLowerCase()),
    demoUrl: safeUrl(b.demoUrl),
    videoUrl: safeUrl(b.videoUrl),
    visibility: b.visibility === 'unlisted' ? 'unlisted' : 'public',
    authorshipConfirmed: Boolean(b.authorshipConfirmed),
  };
  const errors = [];
  if (data.title.length < 3) errors.push('Give the project a title.');
  if (b.demoUrl && !data.demoUrl) errors.push('The demo link must start with http:// or https://');
  if (b.videoUrl && !data.videoUrl) errors.push('The video link must start with http:// or https://');
  return { data, errors };
}

// Required before a project can be sent for review.
function submissionProblems(p) {
  const problems = [];
  if ((p.summary || '').length < 20) problems.push('Write a one-line summary (20+ characters).');
  if ((p.solution || '').length < 50) problems.push('Explain what the project does (50+ characters).');
  if ((p.contribution || '').length < 20) problems.push('Describe your role / contribution.');
  if (!p.techStack?.length) problems.push('Add the technologies used.');
  if (!p.authorshipConfirmed) problems.push('Confirm you built or contributed to this project.');
  if (p.teamType === 'team' && (p.contributors || []).length < 2) problems.push('List every team member (at least two).');
  if (!p.github?.url && !p.demoUrl) problems.push('Add a GitHub repository or a live demo link.');
  return problems;
}

const snapshotFrom = (repo) => ({ ...repo, pushedAt: repo.pushedAt ? new Date(repo.pushedAt) : undefined, fetchedAt: new Date(repo.fetchedAt) });

function importErrorResponse(res, error) {
  if (error instanceof ImportError) {
    return res.status(error.status).json({ message: error.message, ...(error.retryAt ? { retryAt: error.retryAt } : {}), ...(error.existing ? { existing: error.existing } : {}) });
  }
  console.error('Project import error:', error);
  return res.status(500).json({ message: 'Something went wrong. Your details are kept; please try again.' });
}

async function loadOwned(req, res) {
  if (!isId(req.params.id)) {
    res.status(404).json({ message: 'Project not found.' });
    return null;
  }
  const project = await Project.findById(req.params.id);
  if (!project || !isOwner(project, req.user)) {
    res.status(404).json({ message: 'Project not found.' });
    return null;
  }
  return project;
}

const reviewersOf = async () => {
  const [admins, staff] = await Promise.all([
    adminIds(),
    User.find({ staffRoles: 'project-reviewer' }).select('_id').lean(),
  ]);
  return [...admins, ...staff.map((u) => u._id)];
};

// =====================================================================
// GitHub preview
// =====================================================================

// POST /api/projects/github/preview { url }
router.post('/github/preview', protect, previewLimiter, async (req, res) => {
  track('github_import_started', { user: req.user._id });
  try {
    const preview = await fetchRepoPreview(req.body?.url);
    track('github_import_succeeded', { user: req.user._id, meta: { repo: preview.repository.url } });
    const existing = await Project.findOne({ githubNodeId: preview.repository.nodeId, status: { $ne: 'rejected' } }).select('slug title owner status').lean();
    if (existing) {
      const own = String(existing.owner) === String(req.user._id);
      preview.duplicate = { slug: existing.slug, title: existing.title, own, status: existing.status, id: own ? String(existing._id) : undefined };
    }
    res.json(preview);
  } catch (error) {
    track('github_import_failed', { user: req.user._id, meta: { status: error.status || 500 } });
    importErrorResponse(res, error);
  }
});

// =====================================================================
// Admin / reviewers
// =====================================================================

router.get('/admin/queue', protect, async (req, res) => {
  if (!isReviewer(req.user)) return res.status(403).json({ message: 'Not allowed.' });
  const status = ['pending_review', 'published', 'changes_requested', 'rejected', 'archived'].includes(req.query.status) ? req.query.status : 'pending_review';
  const items = await Project.find({ status }).populate('owner', 'name email profileImage').populate('guided', 'slug title')
    .sort(status === 'pending_review' ? { submittedAt: 1 } : { updatedAt: -1 }).limit(100);
  const counts = { pending_review: await Project.countDocuments({ status: 'pending_review' }) };
  res.json({
    items: items.map((p) => ({ ...detail(p, req.user), ownerEmail: p.owner?.email, duplicateOf: null })),
    counts,
  });
});

// POST /api/projects/admin/:id/review { decision, note }
router.post('/admin/:id/review', protect, async (req, res) => {
  if (!isReviewer(req.user)) return res.status(403).json({ message: 'Not allowed.' });
  if (!isId(req.params.id)) return res.status(404).json({ message: 'Not found.' });
  const project = await Project.findById(req.params.id);
  if (!project) return res.status(404).json({ message: 'Not found.' });
  const decision = req.body?.decision;
  const note = clean(req.body?.note, 1000);
  const notes = { changes: 'Changes requested', reject: 'Not accepted' };
  if (['changes', 'reject'].includes(decision) && note.length < 5) return res.status(400).json({ message: 'Write a short note so the student knows what to do.' });

  const now = new Date();
  const wasPublished = project.status === 'published';
  let title = '';
  switch (decision) {
    case 'approve':
      project.status = 'published';
      if (!project.publishedAt) track('project_published', { user: project.owner, project: project._id, meta: { hoursToPublish: project.submittedAt ? Math.round((now - project.submittedAt) / 36e5) : null } });
      project.publishedAt = project.publishedAt || now;
      title = `Your project "${project.title}" is live in the Showcase 🎉`;
      break;
    case 'changes':
      project.status = 'changes_requested';
      title = `${notes.changes}: "${project.title}"`;
      break;
    case 'reject':
      project.status = 'rejected';
      title = `${notes.reject}: "${project.title}"`;
      break;
    case 'feature':
      if (project.status !== 'published') return res.status(400).json({ message: 'Only published projects can be featured.' });
      project.featured = true;
      title = `"${project.title}" is now featured on the Project Hub ⭐`;
      break;
    case 'unfeature':
      project.featured = false;
      break;
    case 'archive':
      project.status = 'archived';
      project.featured = false;
      title = `"${project.title}" was removed from the Showcase`;
      break;
    default:
      return res.status(400).json({ message: 'Unknown decision.' });
  }
  if (note || ['approve', 'changes', 'reject', 'archive'].includes(decision)) project.reviewNote = note;
  project.reviewedBy = req.user._id;
  project.reviewedAt = now;
  await project.save();
  if (title) {
    await notify(project.owner, { type: 'project', title, body: note, link: `/projects/${project.slug}` });
  }
  if (req.user.role === 'admin' && decision === 'approve' && !wasPublished) {
    await broadcastUpdate({
      title: `New community project: ${project.title}`,
      body: project.summary,
      link: `/projects/${project.slug}`,
      notificationExcludeUserIds: [project.owner],
      ...getBroadcastOptions(req.body),
    });
  }
  res.json({ status: project.status, featured: project.featured });
});

// =====================================================================
// Guided projects
// =====================================================================

const guidedCard = (g, progress) => {
  const total = g.milestones.reduce((n, m) => n + m.tasks.length, 0);
  return {
    id: String(g._id),
    slug: g.slug,
    title: g.title,
    summary: g.summary,
    level: g.level,
    category: g.category,
    estHours: g.estHours,
    stack: g.stack,
    milestoneCount: g.milestones.length,
    taskCount: total,
    progress: progress ? { done: progress.done.length, total, completedAt: progress.completedAt, project: progress.project ? String(progress.project) : null } : null,
  };
};

router.get('/guided', optionalAuth, async (req, res) => {
  const filter = { status: 'published' };
  if (PROJECT_LEVELS.includes(req.query.level)) filter.level = req.query.level;
  if (PROJECT_CATEGORIES.includes(req.query.category)) filter.category = req.query.category;
  const q = clean(req.query.q, 80);
  if (q) {
    // Match from the start of a word, so "rag" finds RAG projects but not "storage".
    const escaped = q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const rx = new RegExp(/^\w/.test(q) ? `\\b${escaped}` : escaped, 'i');
    filter.$or = [{ title: rx }, { summary: rx }, { tags: rx }, { stack: rx }];
  }
  const items = await GuidedProject.find(filter).sort({ order: 1, createdAt: 1 }).lean();
  const progress = req.user ? await GuidedProgress.find({ user: req.user._id, guided: { $in: items.map((g) => g._id) } }).lean() : [];
  const byId = new Map(progress.map((p) => [String(p.guided), p]));
  res.json({ items: items.map((g) => guidedCard(g, byId.get(String(g._id)))) });
});

router.get('/guided/:slug', optionalAuth, async (req, res) => {
  const g = await GuidedProject.findOne({ slug: String(req.params.slug), status: 'published' }).lean();
  if (!g) return res.status(404).json({ message: 'Guided project not found.' });
  const progress = req.user ? await GuidedProgress.findOne({ user: req.user._id, guided: g._id }).lean() : null;
  const showcase = await Project.find({ guided: g._id, status: 'published', visibility: 'public' }).populate('owner', 'name profileImage').sort({ publishedAt: -1 }).limit(6);
  res.json({
    guided: { ...guidedCard(g, progress), prerequisites: g.prerequisites, outcomes: g.outcomes, problem: g.problem, milestones: g.milestones, starterRepo: g.starterRepo, submissionCriteria: g.submissionCriteria },
    progress: progress ? { done: progress.done, repoUrl: progress.repoUrl, demoUrl: progress.demoUrl, completedAt: progress.completedAt, project: progress.project ? String(progress.project) : null } : null,
    showcase: showcase.map(card),
  });
});

router.post('/guided/:slug/start', protect, async (req, res) => {
  const g = await GuidedProject.findOne({ slug: String(req.params.slug), status: 'published' });
  if (!g) return res.status(404).json({ message: 'Guided project not found.' });
  const started = await GuidedProgress.updateOne({ user: req.user._id, guided: g._id }, { $setOnInsert: { done: [] } }, { upsert: true });
  if (started.upsertedCount) track('guided_project_started', { user: req.user._id, guided: g._id });
  res.json({ started: true });
});

// PUT /api/projects/guided/:slug/progress { task: "m:t", done } | { repoUrl, demoUrl }
router.put('/guided/:slug/progress', protect, writeLimiter, async (req, res) => {
  const g = await GuidedProject.findOne({ slug: String(req.params.slug), status: 'published' });
  if (!g) return res.status(404).json({ message: 'Guided project not found.' });
  const progress = await GuidedProgress.findOne({ user: req.user._id, guided: g._id });
  if (!progress) return res.status(400).json({ message: 'Start the project first.' });
  const { task } = req.body || {};
  if (typeof task === 'string') {
    const [m, t] = task.split(':').map(Number);
    if (!g.milestones[m] || !g.milestones[m].tasks[t]) return res.status(400).json({ message: 'Unknown task.' });
    const key = `${m}:${t}`;
    const milestoneWasDone = g.milestones[m].tasks.every((_, i) => progress.done.includes(`${m}:${i}`));
    progress.done = req.body.done ? [...new Set([...progress.done, key])] : progress.done.filter((k) => k !== key);
    if (!milestoneWasDone && g.milestones[m].tasks.every((_, i) => progress.done.includes(`${m}:${i}`))) {
      track('milestone_completed', { user: req.user._id, guided: g._id, meta: { milestone: m } });
    }
  }
  if ('repoUrl' in (req.body || {})) {
    if (req.body.repoUrl && !safeUrl(req.body.repoUrl)) return res.status(400).json({ message: 'The repository link must start with https://' });
    progress.repoUrl = safeUrl(req.body.repoUrl);
  }
  if ('demoUrl' in (req.body || {})) {
    if (req.body.demoUrl && !safeUrl(req.body.demoUrl)) return res.status(400).json({ message: 'The demo link must start with https://' });
    progress.demoUrl = safeUrl(req.body.demoUrl);
  }
  const total = g.milestones.reduce((n, mm) => n + mm.tasks.length, 0);
  progress.completedAt = progress.done.length >= total ? (progress.completedAt || new Date()) : undefined;
  await progress.save();
  res.json({ done: progress.done, repoUrl: progress.repoUrl, demoUrl: progress.demoUrl, completedAt: progress.completedAt });
});

// POST /api/projects/guided/:slug/submit: create a showcase draft from the guided project
router.post('/guided/:slug/submit', protect, writeLimiter, async (req, res) => {
  try {
    const g = await GuidedProject.findOne({ slug: String(req.params.slug), status: 'published' });
    if (!g) return res.status(404).json({ message: 'Guided project not found.' });
    const progress = await GuidedProgress.findOne({ user: req.user._id, guided: g._id });
    if (!progress) return res.status(400).json({ message: 'Start the project first.' });
    if (progress.project && await Project.exists({ _id: progress.project })) return res.json({ id: String(progress.project) });

    let snapshot = null;
    if (progress.repoUrl && /github\.com/i.test(progress.repoUrl)) {
      const preview = await fetchRepoPreview(progress.repoUrl);
      const dup = await Project.findOne({ githubNodeId: preview.repository.nodeId, status: { $ne: 'rejected' } }).select('slug').lean();
      if (dup) throw new ImportError(409, 'This repository is already listed on CodeSphere.', { existing: dup.slug });
      snapshot = snapshotFrom(preview.repository);
    }
    const project = await Project.create({
      slug: await uniqueSlug(`${g.title} ${req.user.name.split(' ')[0]}`),
      owner: req.user._id,
      sourceType: 'guided',
      guided: g._id,
      title: g.title,
      summary: g.summary,
      problem: g.problem,
      category: g.category,
      level: g.level,
      techStack: g.stack,
      demoUrl: progress.demoUrl,
      contributors: [{ name: req.user.name, role: 'Builder', user: req.user._id }],
      ...(snapshot ? { github: snapshot, githubNodeId: snapshot.nodeId, lastSyncedAt: new Date() } : {}),
    });
    progress.project = project._id;
    await progress.save();
    res.status(201).json({ id: String(project._id) });
  } catch (error) {
    importErrorResponse(res, error);
  }
});

// =====================================================================
// My projects
// =====================================================================

router.get('/mine', protect, async (req, res) => {
  const [projects, progress] = await Promise.all([
    Project.find({ owner: req.user._id }).populate('owner', 'name profileImage').sort({ updatedAt: -1 }),
    GuidedProgress.find({ user: req.user._id }).populate('guided').sort({ updatedAt: -1 }),
  ]);
  res.json({
    projects: projects.map((p) => ({ ...card(p), reviewNote: p.reviewNote })),
    guided: progress.filter((p) => p.guided).map((p) => guidedCard(p.guided, p)),
  });
});

// =====================================================================
// Showcase (public)
// =====================================================================

// GET /api/projects?category&level&q&featured&sort=new|popular&page
router.get('/', async (req, res) => {
  const filter = { status: 'published', visibility: 'public' };
  if (PROJECT_CATEGORIES.includes(req.query.category)) filter.category = req.query.category;
  if (PROJECT_LEVELS.includes(req.query.level)) filter.level = req.query.level;
  if (req.query.featured === '1') filter.featured = true;
  if (req.query.source === 'guided') filter.sourceType = 'guided';
  const q = clean(req.query.q, 80);
  if (q) filter.$text = { $search: q };
  const page = Math.max(1, Math.min(50, Number(req.query.page) || 1));
  const limit = 18;
  const sort = q ? { score: { $meta: 'textScore' } } : req.query.sort === 'popular' ? { views: -1, publishedAt: -1 } : { featured: -1, publishedAt: -1 };
  const [items, total] = await Promise.all([
    Project.find(filter).populate('owner', 'name profileImage').sort(sort).skip((page - 1) * limit).limit(limit),
    Project.countDocuments(filter),
  ]);
  res.json({ items: items.map(card), total, page, pages: Math.max(1, Math.ceil(total / limit)) });
});

// =====================================================================
// Create / edit (owner)
// =====================================================================

// POST /api/projects { githubUrl?, ...form }: always a draft
router.post('/', protect, writeLimiter, async (req, res) => {
  try {
    const { data, errors } = readForm(req.body || {});
    if (errors.length) return res.status(400).json({ message: errors[0] });
    let snapshot = null;
    if (req.body.githubUrl) {
      // Re-fetch on the server: never trust a snapshot sent by the browser.
      const preview = await fetchRepoPreview(req.body.githubUrl);
      const dup = await Project.findOne({ githubNodeId: preview.repository.nodeId, status: { $ne: 'rejected' } }).select('slug owner').lean();
      if (dup) {
        throw new ImportError(409, String(dup.owner) === String(req.user._id)
          ? 'You have already added this repository. Open it from My Projects.'
          : 'This repository is already listed on CodeSphere. Ask its owner to credit you as a contributor.', { existing: dup.slug });
      }
      snapshot = snapshotFrom(preview.repository);
    }
    const project = await Project.create({
      ...data,
      slug: await uniqueSlug(data.title),
      owner: req.user._id,
      sourceType: snapshot ? 'github' : 'manual',
      ...(snapshot ? { github: snapshot, githubNodeId: snapshot.nodeId, lastSyncedAt: new Date() } : {}),
    });
    track('project_draft_created', { user: req.user._id, project: project._id, meta: { source: project.sourceType } });
    res.status(201).json({ id: String(project._id), slug: project.slug });
  } catch (error) {
    if (error.code === 11000) return res.status(409).json({ message: 'This repository is already listed on CodeSphere.' });
    importErrorResponse(res, error);
  }
});

// GET /api/projects/edit/:id: everything the owner needs for the editor
router.get('/edit/:id', protect, async (req, res) => {
  const project = await loadOwned(req, res);
  if (!project) return;
  await project.populate('owner', 'name profileImage');
  await project.populate('guided', 'slug title');
  await project.populate('members.user', 'name profileImage');
  await project.populate('tasks.assignee', 'name profileImage');
  res.json({ project: detail(project, req.user), problems: submissionProblems(project) });
});

// PUT /api/projects/:id: edit; a published project goes back to review
router.put('/:id', protect, writeLimiter, async (req, res) => {
  const project = await loadOwned(req, res);
  if (!project) return;
  if (['rejected'].includes(project.status)) return res.status(400).json({ message: 'This project was not accepted. Create a new one if you have improved it.' });
  const { data, errors } = readForm(req.body || {});
  if (errors.length) return res.status(400).json({ message: errors[0] });
  Object.assign(project, data);
  if (project.status === 'published' || project.status === 'pending_review') {
    project.status = 'pending_review';
    project.submittedAt = new Date();
  }
  await project.save();
  res.json({ id: String(project._id), status: project.status, problems: submissionProblems(project) });
});

router.post('/:id/submit', protect, writeLimiter, async (req, res) => {
  const project = await loadOwned(req, res);
  if (!project) return;
  if (!['draft', 'changes_requested', 'archived'].includes(project.status)) return res.status(400).json({ message: 'This project is already submitted.' });
  const problems = submissionProblems(project);
  if (problems.length) return res.status(400).json({ message: 'A few things are missing before review.', problems });
  project.status = 'pending_review';
  project.submittedAt = new Date();
  await project.save();
  track('project_submitted', { user: req.user._id, project: project._id });
  await notify(await reviewersOf(), { type: 'project', title: `Project to review: ${project.title}`, body: `Submitted by ${req.user.name}`, link: '/admin/projects' });
  res.json({ status: project.status });
});

router.post('/:id/unpublish', protect, async (req, res) => {
  const project = await loadOwned(req, res);
  if (!project) return;
  project.status = 'draft';
  project.featured = false;
  await project.save();
  res.json({ status: project.status });
});

// POST /api/projects/:id/sync: refresh the GitHub snapshot (cooldown)
router.post('/:id/sync', protect, async (req, res) => {
  if (!isId(req.params.id)) return res.status(404).json({ message: 'Project not found.' });
  const project = await Project.findById(req.params.id);
  if (!project || !(isOwner(project, req.user) || isReviewer(req.user))) return res.status(404).json({ message: 'Project not found.' });
  if (!project.github?.url) return res.status(400).json({ message: 'This project is not linked to GitHub.' });
  if (project.lastSyncedAt && Date.now() - project.lastSyncedAt.getTime() < SYNC_COOLDOWN_MS) {
    return res.status(429).json({ message: 'Refreshed recently. Try again in a few minutes.' });
  }
  try {
    const preview = await fetchRepoPreview(project.github.url);
    project.github = snapshotFrom(preview.repository);
    project.githubNodeId = preview.repository.nodeId;
    project.lastSyncedAt = new Date();
    await project.save();
    res.json({ lastSyncedAt: project.lastSyncedAt, github: project.github });
  } catch (error) {
    importErrorResponse(res, error);
  }
});

// Link a GitHub repository to an existing (manual / guided) project.
router.post('/:id/github', protect, writeLimiter, async (req, res) => {
  const project = await loadOwned(req, res);
  if (!project) return;
  try {
    const preview = await fetchRepoPreview(req.body?.url);
    const dup = await Project.findOne({ githubNodeId: preview.repository.nodeId, _id: { $ne: project._id }, status: { $ne: 'rejected' } }).select('slug').lean();
    if (dup) throw new ImportError(409, 'This repository is already listed on CodeSphere.', { existing: dup.slug });
    if (project.githubNodeId !== preview.repository.nodeId) project.ownershipVerified = undefined;
    project.github = snapshotFrom(preview.repository);
    project.githubNodeId = preview.repository.nodeId;
    project.githubUnavailable = false;
    project.lastSyncedAt = new Date();
    await project.save();
    res.json({ github: project.github });
  } catch (error) {
    importErrorResponse(res, error);
  }
});

router.delete('/:id', protect, async (req, res) => {
  const project = await loadOwned(req, res);
  if (!project) return;
  await deleteImages([project.cover, ...(project.screenshots || [])].filter((m) => m?.fileId));
  await ProjectUpdate.deleteMany({ project: project._id });
  await GuidedProgress.updateMany({ project: project._id }, { $unset: { project: 1 } });
  await project.deleteOne();
  res.json({ message: 'Removed from CodeSphere. Your GitHub repository is untouched.' });
});

// ---------- media: cover + screenshots ----------

// POST /api/projects/:id/media?kind=cover|screenshot  (field "image", 2 MB)
router.post('/:id/media', protect, writeLimiter, handleImageUpload, async (req, res) => {
  const project = await loadOwned(req, res);
  if (!project) return;
  const kind = req.query.kind === 'cover' ? 'cover' : 'screenshot';
  if (kind === 'screenshot' && project.screenshots.length >= MAX_SCREENSHOTS) return res.status(400).json({ message: `Up to ${MAX_SCREENSHOTS} screenshots.` });
  try {
    const stored = await storeImage(req.file.buffer, req.user._id, 'projects');
    if (kind === 'cover') {
      if (project.cover?.fileId) await deleteImages([project.cover]);
      project.cover = stored;
    } else {
      project.screenshots.push({ ...stored, caption: clean(req.body?.caption, 140) });
    }
    await project.save();
    res.status(201).json({ cover: project.cover?.url || '', screenshots: project.screenshots.map((s) => ({ id: String(s._id), url: s.url, caption: s.caption })) });
  } catch (error) {
    res.status(error.status || 500).json({ message: error.status ? error.message : 'Could not upload the image.' });
  }
});

router.delete('/:id/media/:mediaId', protect, async (req, res) => {
  const project = await loadOwned(req, res);
  if (!project) return;
  if (req.params.mediaId === 'cover') {
    if (project.cover?.fileId) await deleteImages([project.cover]);
    project.cover = undefined;
  } else {
    const shot = project.screenshots.id(req.params.mediaId);
    if (!shot) return res.status(404).json({ message: 'Image not found.' });
    await deleteImages([shot]);
    shot.deleteOne();
  }
  await project.save();
  res.json({ cover: project.cover?.url || '', screenshots: project.screenshots.map((s) => ({ id: String(s._id), url: s.url, caption: s.caption })) });
});

// ---------- Build in Public ----------

router.get('/:id/updates', optionalAuth, async (req, res) => {
  if (!isId(req.params.id)) return res.status(404).json({ message: 'Project not found.' });
  const project = await Project.findById(req.params.id).select('owner status members');
  if (!project || (project.status !== 'published' && !canWork(project, req.user) && !isReviewer(req.user))) return res.status(404).json({ message: 'Project not found.' });
  const updates = await ProjectUpdate.find({ project: project._id }).populate('author', 'name profileImage').sort({ createdAt: -1 }).limit(50);
  const me = req.user ? String(req.user._id) : '';
  res.json({
    updates: updates.map((u) => ({
      id: String(u._id),
      kind: u.kind,
      body: u.body,
      link: u.link,
      createdAt: u.createdAt,
      author: person(u.author),
      mine: isOwner({ owner: u.author }, req.user),
      commentCount: u.commentCount || 0,
      reactions: Object.fromEntries(['like', 'celebrate', 'helpful'].map((k) => [k, { count: (u.reactions?.[k] || []).length, mine: (u.reactions?.[k] || []).some((id) => String(id) === me) }])),
    })),
  });
});

router.post('/:id/updates', protect, updateLimiter, async (req, res) => {
  if (!isId(req.params.id)) return res.status(404).json({ message: 'Project not found.' });
  const project = await Project.findById(req.params.id);
  if (!project || !canWork(project, req.user)) return res.status(404).json({ message: 'Project not found.' });
  const body = clean(req.body?.body, 2000);
  if (body.length < 5) return res.status(400).json({ message: 'Write a little more about your progress.' });
  const link = safeUrl(req.body?.link);
  if (req.body?.link && !link) return res.status(400).json({ message: 'The link must start with https://' });
  const update = await ProjectUpdate.create({
    project: project._id,
    author: req.user._id,
    kind: ['built', 'learned', 'blocker', 'next'].includes(req.body?.kind) ? req.body.kind : 'built',
    body,
    link,
  });
  track('project_update_created', { user: req.user._id, project: project._id });
  res.status(201).json({ id: String(update._id) });
});

router.delete('/:id/updates/:updateId', protect, async (req, res) => {
  if (!isId(req.params.updateId)) return res.status(404).json({ message: 'Not found.' });
  const update = await ProjectUpdate.findOne({ _id: req.params.updateId, project: req.params.id });
  if (!update || (String(update.author) !== String(req.user._id) && !isReviewer(req.user))) return res.status(404).json({ message: 'Not found.' });
  await update.deleteOne();
  res.json({ message: 'Deleted.' });
});

// ---------- Project page (public when published) ----------

router.get('/:slug', optionalAuth, async (req, res) => {
  const project = await Project.findOne({ slug: String(req.params.slug) }).populate('owner', 'name profileImage').populate('guided', 'slug title')
    .populate('members.user', 'name profileImage').populate('tasks.assignee', 'name profileImage');
  const allowed = project && (project.status === 'published' || canWork(project, req.user) || memberOf(project, req.user) || isReviewer(req.user));
  if (!allowed) return res.status(404).json({ message: 'Project not found.' });
  if (project.status === 'published' && !isOwner(project, req.user)) {
    await Project.updateOne({ _id: project._id }, { $inc: { views: 1 } });
  }
  res.json({ project: detail(project, req.user) });
});

router.helpers = { isReviewer, isOwner, memberOf, canWork, person, clean, safeUrl, isId, card };

module.exports = router;

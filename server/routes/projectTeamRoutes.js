// Project Hub, phase 2: teams, task boards, comments & reactions on updates,
// analytics, the guided-project editor and GitHub ownership verification.
// Mounted on /api/projects BEFORE projectRoutes (which has a /:slug catch-all).

const express = require('express');
const User = require('../models/User');
const { Project, ProjectUpdate, ProjectComment, ProjectEvent, GuidedProject, GuidedProgress } = require('../models/Project');
const { protect } = require('../middleware/authMiddleware');
const { createLimiter } = require('../utils/rateLimit');
const { notify } = require('../utils/notify');
const { broadcastUpdate, getBroadcastOptions } = require('../utils/broadcast');
const { track } = require('../utils/projectEvents');
const { helpers } = require('./projectRoutes');
const { isContributor, ImportError } = require('../utils/githubImport');
const { adminIds } = require('../utils/accounts');
const { readGuided } = require('../utils/guidedValidate');

const { isReviewer, isOwner, memberOf, canWork, person, clean, isId } = helpers;
const router = express.Router();
const commentLimiter = createLimiter({ windowMs: 10 * 60 * 1000, max: 15, message: 'You are commenting very fast. Take a short break.' });
const trackLimiter = createLimiter({ windowMs: 60 * 1000, max: 30, message: 'Too many requests.' });
const MAX_MEMBERS = 8;
const MAX_TASKS = 60;
const REPORTS_TO_HIDE = 3;
const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

async function loadProject(req, res, { select } = {}) {
  if (!isId(req.params.id)) {
    res.status(404).json({ message: 'Project not found.' });
    return null;
  }
  const query = Project.findById(req.params.id);
  if (select) query.select(select);
  const project = await query;
  if (!project) res.status(404).json({ message: 'Project not found.' });
  return project;
}

// =====================================================================
// Analytics: client-side events (views and outbound clicks only)
// =====================================================================

router.post('/track', trackLimiter, async (req, res) => {
  const name = String(req.body?.name || '');
  if (!['project_hub_viewed', 'project_demo_clicked', 'github_source_clicked'].includes(name)) return res.status(400).json({ message: 'Unknown event.' });
  const project = isId(req.body?.projectId) ? req.body.projectId : undefined;
  track(name, { project });
  res.json({ ok: true });
});

// GET /api/projects/admin/analytics?days=30
router.get('/admin/analytics', protect, async (req, res) => {
  if (!isReviewer(req.user)) return res.status(403).json({ message: 'Not allowed.' });
  const days = Math.min(365, Math.max(1, Number(req.query.days) || 30));
  const since = new Date(Date.now() - days * 86400000);
  const counts = Object.fromEntries((await ProjectEvent.aggregate([
    { $match: { createdAt: { $gte: since } } },
    { $group: { _id: '$name', n: { $sum: 1 } } },
  ])).map((r) => [r._id, r.n]));
  const failures = await ProjectEvent.aggregate([
    { $match: { createdAt: { $gte: since }, name: 'github_import_failed' } },
    { $group: { _id: '$meta.status', n: { $sum: 1 } } },
  ]);
  const publishTimes = (await ProjectEvent.find({ createdAt: { $gte: since }, name: 'project_published', 'meta.hoursToPublish': { $ne: null } }).select('meta').lean())
    .map((e) => e.meta.hoursToPublish).sort((a, b) => a - b);
  const median = publishTimes.length ? publishTimes[Math.floor(publishTimes.length / 2)] : null;

  const [students, starters, published, guidedStarted, guidedDone] = await Promise.all([
    User.countDocuments({ role: 'user' }),
    Promise.all([Project.distinct('owner'), GuidedProgress.distinct('user')]).then(([a, b]) => new Set([...a, ...b].map(String)).size),
    Project.find({ status: 'published' }).select('summary solution github demoUrl screenshots cover contributors').lean(),
    GuidedProgress.countDocuments(),
    GuidedProgress.countDocuments({ completedAt: { $ne: null } }),
  ]);
  const quality = published.length ? Math.round(published.filter((p) => p.solution?.length >= 50 && (p.github?.readmePreview || p.demoUrl) && (p.screenshots?.length || p.cover?.url) && p.contributors?.length).length / published.length * 100) : null;
  const pct = (a, b) => (b ? Math.round((a / b) * 100) : null);
  res.json({
    days,
    counts,
    importFailures: failures.map((f) => ({ status: f._id || 'unknown', count: f.n })),
    metrics: {
      importConversion: pct(counts.github_import_succeeded || 0, counts.github_import_started || 0),
      publishConversion: pct(counts.project_published || 0, counts.project_submitted || 0),
      medianHoursToPublish: median,
      studentActivation: pct(starters, students),
      guidedCompletion: pct(guidedDone, guidedStarted),
      showcaseQuality: quality,
      publishedProjects: published.length,
    },
  });
});

// =====================================================================
// Guided project editor (admins + project reviewers)
// =====================================================================

router.get('/admin/guided', protect, async (req, res) => {
  if (!isReviewer(req.user)) return res.status(403).json({ message: 'Not allowed.' });
  const items = await GuidedProject.find().sort({ order: 1, createdAt: 1 }).lean();
  const starts = await GuidedProgress.aggregate([{ $group: { _id: '$guided', n: { $sum: 1 } } }]);
  const byId = new Map(starts.map((s) => [String(s._id), s.n]));
  res.json({ items: items.map((g) => ({ ...g, id: String(g._id), _id: undefined, started: byId.get(String(g._id)) || 0 })) });
});

router.post('/admin/guided', protect, async (req, res) => {
  if (!isReviewer(req.user)) return res.status(403).json({ message: 'Not allowed.' });
  const { data, error } = readGuided(req.body || {});
  if (error) return res.status(400).json({ message: error });
  try {
    const g = await GuidedProject.create(data);
    if (req.user.role === 'admin') {
      await broadcastUpdate({
        title: `New guided project: ${g.title}`,
        body: g.summary,
        link: `/projects/guided/${g.slug}`,
        ...getBroadcastOptions(req.body),
      });
    }
    res.status(201).json({ id: String(g._id), slug: g.slug });
  } catch (e) {
    res.status(e.code === 11000 ? 409 : 500).json({ message: e.code === 11000 ? 'That slug is taken.' : 'Could not save.' });
  }
});

router.put('/admin/guided/:id', protect, async (req, res) => {
  if (!isReviewer(req.user)) return res.status(403).json({ message: 'Not allowed.' });
  if (!isId(req.params.id)) return res.status(404).json({ message: 'Not found.' });
  const { data, error } = readGuided(req.body || {});
  if (error) return res.status(400).json({ message: error });
  try {
    const existing = await GuidedProject.findById(req.params.id);
    if (!existing) return res.status(404).json({ message: 'Not found.' });
    const wasPublished = existing.status === 'published';
    Object.assign(existing, data);
    const g = await existing.save();
    if (req.user.role === 'admin' && !wasPublished && g.status === 'published') {
      await broadcastUpdate({
        title: `New guided project: ${g.title}`,
        body: g.summary,
        link: `/projects/guided/${g.slug}`,
        ...getBroadcastOptions(req.body),
      });
    }
    res.json({ id: String(g._id), slug: g.slug });
  } catch (e) {
    res.status(e.code === 11000 ? 409 : 500).json({ message: e.code === 11000 ? 'That slug is taken.' : 'Could not save.' });
  }
});

router.delete('/admin/guided/:id', protect, async (req, res) => {
  if (!isReviewer(req.user)) return res.status(403).json({ message: 'Not allowed.' });
  if (!isId(req.params.id)) return res.status(404).json({ message: 'Not found.' });
  // Students' showcase projects stay; only progress records are removed.
  await GuidedProgress.deleteMany({ guided: req.params.id });
  await GuidedProject.deleteOne({ _id: req.params.id });
  res.json({ message: 'Deleted.' });
});

// =====================================================================
// GitHub ownership verification (needs a connected GitHub account)
// =====================================================================

// POST /api/projects/:id/verify-github
router.post('/:id/verify-github', protect, async (req, res) => {
  const project = await loadProject(req, res);
  if (!project) return;
  if (!isOwner(project, req.user)) return res.status(403).json({ message: 'Only the owner can verify.' });
  if (!project.github?.url) return res.status(400).json({ message: 'Link a GitHub repository first.' });
  const login = req.user.githubConnection?.login;
  if (!login) return res.status(400).json({ message: 'Connect your GitHub account first.' });
  try {
    let kind = '';
    if (project.github.owner.toLowerCase() === login.toLowerCase()) kind = 'owner';
    else if (await isContributor(project.github.owner, project.github.repo, login)) kind = 'contributor';
    if (!kind) return res.status(400).json({ message: `@${login} is not the owner or a listed contributor of ${project.github.owner}/${project.github.repo}.` });
    project.ownershipVerified = { kind, login, at: new Date() };
    await project.save();
    res.json({ ownershipVerified: { kind, login } });
  } catch (error) {
    if (error instanceof ImportError) return res.status(error.status).json({ message: error.message });
    res.status(500).json({ message: 'Could not check GitHub right now.' });
  }
});

// =====================================================================
// Teams
// =====================================================================

// GET /api/projects/users/search?q=  (for inviting teammates)
router.get('/users/search', protect, async (req, res) => {
  const q = clean(req.query.q, 40);
  if (q.length < 2) return res.json({ users: [] });
  const users = await User.find({ _id: { $ne: req.user._id }, name: new RegExp(escapeRegex(q), 'i') }).select('name profileImage yearOfStudy').limit(8).lean();
  res.json({ users: users.map((u) => ({ ...person(u), year: u.yearOfStudy || '' })) });
});

// GET /api/projects/team/invites: my pending invitations
router.get('/team/invites', protect, async (req, res) => {
  const projects = await Project.find({ members: { $elemMatch: { user: req.user._id, status: 'invited' } } }).populate('owner', 'name profileImage').lean();
  res.json({
    invites: projects.map((p) => ({
      projectId: String(p._id),
      slug: p.slug,
      title: p.title,
      owner: person(p.owner),
      role: p.members.find((m) => String(m.user) === String(req.user._id))?.role || 'Member',
    })),
  });
});

// POST /api/projects/:id/team/invite { userId, role }  (owner)
router.post('/:id/team/invite', protect, async (req, res) => {
  const project = await loadProject(req, res);
  if (!project) return;
  if (!isOwner(project, req.user)) return res.status(403).json({ message: 'Only the project owner can invite.' });
  if (!isId(req.body?.userId) || String(req.body.userId) === String(req.user._id)) return res.status(400).json({ message: 'Choose someone to invite.' });
  if (project.members.length >= MAX_MEMBERS) return res.status(400).json({ message: `Teams can have up to ${MAX_MEMBERS} members.` });
  if (memberOf(project, { _id: req.body.userId })) return res.status(409).json({ message: 'Already invited or on the team.' });
  const invitee = await User.findById(req.body.userId).select('name');
  if (!invitee) return res.status(404).json({ message: 'Student not found.' });
  project.members.push({ user: invitee._id, role: clean(req.body.role, 60) || 'Member', status: 'invited' });
  project.teamType = 'team';
  await project.save();
  await notify(invitee._id, {
    type: 'project',
    title: `${req.user.name} invited you to join "${project.title}"`,
    body: 'Accept to be credited as a contributor and work on the task board.',
    link: `/projects/${project.slug}`,
  });
  res.status(201).json({ message: 'Invitation sent.' });
});

// POST /api/projects/:id/team/respond { accept }
router.post('/:id/team/respond', protect, async (req, res) => {
  const project = await loadProject(req, res);
  if (!project) return;
  const me = memberOf(project, req.user);
  if (!me || me.status !== 'invited') return res.status(404).json({ message: 'No invitation found.' });
  if (req.body?.accept) {
    me.status = 'active';
    me.joinedAt = new Date();
    // Confirmed members are credited as contributors (once).
    const already = project.contributors.some((c) => String(c.user) === String(req.user._id) || c.name.toLowerCase() === req.user.name.toLowerCase());
    if (!already) project.contributors.push({ name: req.user.name, role: me.role, user: req.user._id });
    else project.contributors.forEach((c) => { if (c.name.toLowerCase() === req.user.name.toLowerCase()) c.user = req.user._id; });
    // A team project needs the owner credited too (manual projects start with no credits).
    const owner = await User.findById(project.owner).select('name');
    if (owner && !project.contributors.some((c) => String(c.user) === String(owner._id) || c.name.toLowerCase() === owner.name.toLowerCase())) {
      project.contributors.unshift({ name: owner.name, role: 'Owner', user: owner._id });
    }
  } else {
    project.members = project.members.filter((m) => m !== me);
  }
  await project.save();
  await notify(project.owner, {
    type: 'project',
    title: `${req.user.name} ${req.body?.accept ? 'joined' : 'declined to join'} "${project.title}"`,
    link: `/projects/${project.slug}`,
  });
  res.json({ status: req.body?.accept ? 'active' : 'declined' });
});

// DELETE /api/projects/:id/team/:userId  (owner removes; a member can leave)
router.delete('/:id/team/:userId', protect, async (req, res) => {
  const project = await loadProject(req, res);
  if (!project) return;
  const leaving = String(req.params.userId) === String(req.user._id);
  if (!leaving && !isOwner(project, req.user)) return res.status(403).json({ message: 'Only the owner can remove members.' });
  const member = memberOf(project, { _id: req.params.userId });
  if (!member) return res.status(404).json({ message: 'Not a member.' });
  project.members = project.members.filter((m) => m !== member);
  // Credits stay (history), but the link to the account is dropped.
  project.contributors.forEach((c) => { if (String(c.user) === String(req.params.userId)) c.user = undefined; });
  project.tasks.forEach((t) => { if (String(t.assignee) === String(req.params.userId)) t.assignee = undefined; });
  await project.save();
  res.json({ message: leaving ? 'You left the team.' : 'Member removed.' });
});

// ---------- Task board ----------

const taskView = async (project) => {
  await project.populate('tasks.assignee', 'name profileImage');
  return project.tasks.map((t) => ({ id: String(t._id), title: t.title, status: t.status, assignee: t.assignee?.name ? person(t.assignee) : null }));
};

function validAssignee(project, id) {
  if (!id) return true;
  return String(project.owner) === String(id) || project.members.some((m) => m.status === 'active' && String(m.user) === String(id));
}

router.post('/:id/tasks', protect, async (req, res) => {
  const project = await loadProject(req, res);
  if (!project) return;
  if (!canWork(project, req.user)) return res.status(403).json({ message: 'Only the team can edit tasks.' });
  const title = clean(req.body?.title, 140);
  if (title.length < 2) return res.status(400).json({ message: 'Write the task.' });
  if (project.tasks.length >= MAX_TASKS) return res.status(400).json({ message: 'The board is full; delete finished tasks first.' });
  if (!validAssignee(project, req.body?.assignee)) return res.status(400).json({ message: 'Assign tasks to team members only.' });
  project.tasks.push({ title, assignee: req.body?.assignee || undefined, createdBy: req.user._id });
  await project.save();
  res.status(201).json({ tasks: await taskView(project) });
});

router.put('/:id/tasks/:taskId', protect, async (req, res) => {
  const project = await loadProject(req, res);
  if (!project) return;
  if (!canWork(project, req.user)) return res.status(403).json({ message: 'Only the team can edit tasks.' });
  const task = project.tasks.id(req.params.taskId);
  if (!task) return res.status(404).json({ message: 'Task not found.' });
  if (['todo', 'doing', 'done'].includes(req.body?.status)) task.status = req.body.status;
  if (req.body?.title !== undefined) {
    const title = clean(req.body.title, 140);
    if (title.length >= 2) task.title = title;
  }
  if (req.body?.assignee !== undefined) {
    if (!validAssignee(project, req.body.assignee)) return res.status(400).json({ message: 'Assign tasks to team members only.' });
    task.assignee = req.body.assignee || undefined;
  }
  task.updatedAt = new Date();
  await project.save();
  res.json({ tasks: await taskView(project) });
});

router.delete('/:id/tasks/:taskId', protect, async (req, res) => {
  const project = await loadProject(req, res);
  if (!project) return;
  if (!canWork(project, req.user)) return res.status(403).json({ message: 'Only the team can edit tasks.' });
  const task = project.tasks.id(req.params.taskId);
  if (!task) return res.status(404).json({ message: 'Task not found.' });
  task.deleteOne();
  await project.save();
  res.json({ tasks: await taskView(project) });
});

// =====================================================================
// Reactions & comments on Build in Public updates
// =====================================================================

async function loadUpdate(req, res) {
  if (!isId(req.params.id) || !isId(req.params.updateId)) {
    res.status(404).json({ message: 'Not found.' });
    return {};
  }
  const [project, update] = await Promise.all([
    Project.findById(req.params.id).select('owner members status slug title'),
    ProjectUpdate.findOne({ _id: req.params.updateId, project: req.params.id }),
  ]);
  const visible = project && (project.status === 'published' || canWork(project, req.user) || isReviewer(req.user));
  if (!update || !visible) {
    res.status(404).json({ message: 'Not found.' });
    return {};
  }
  return { project, update };
}

// POST /api/projects/:id/updates/:updateId/react { type: like|celebrate|helpful }  (toggle)
router.post('/:id/updates/:updateId/react', protect, async (req, res) => {
  const { update } = await loadUpdate(req, res);
  if (!update) return;
  const type = req.body?.type;
  if (!['like', 'celebrate', 'helpful'].includes(type)) return res.status(400).json({ message: 'Unknown reaction.' });
  const list = update.reactions[type];
  const has = list.some((id) => String(id) === String(req.user._id));
  await ProjectUpdate.updateOne({ _id: update._id }, has ? { $pull: { [`reactions.${type}`]: req.user._id } } : { $addToSet: { [`reactions.${type}`]: req.user._id } });
  const fresh = await ProjectUpdate.findById(update._id).select('reactions').lean();
  res.json({ type, mine: !has, count: (fresh.reactions?.[type] || []).length });
});

router.get('/:id/updates/:updateId/comments', async (req, res) => {
  const { update } = await loadUpdate(req, res);
  if (!update) return;
  const comments = await ProjectComment.find({ update: update._id, hidden: false }).populate('author', 'name profileImage').sort({ createdAt: 1 }).limit(100).lean();
  res.json({ comments: comments.map((c) => ({ id: String(c._id), body: c.body, createdAt: c.createdAt, author: person(c.author) })) });
});

router.post('/:id/updates/:updateId/comments', protect, commentLimiter, async (req, res) => {
  const { project, update } = await loadUpdate(req, res);
  if (!update) return;
  const body = clean(req.body?.body, 1000);
  if (body.length < 2) return res.status(400).json({ message: 'Write a comment.' });
  const comment = await ProjectComment.create({ update: update._id, project: project._id, author: req.user._id, body });
  await ProjectUpdate.updateOne({ _id: update._id }, { $inc: { commentCount: 1 } });
  if (String(update.author) !== String(req.user._id)) {
    await notify(update.author, { type: 'project', title: `${req.user.name} commented on your update in "${project.title}"`, body: body.slice(0, 140), link: `/projects/${project.slug}` });
  }
  res.status(201).json({ id: String(comment._id) });
});

router.delete('/:id/updates/:updateId/comments/:commentId', protect, async (req, res) => {
  const { project, update } = await loadUpdate(req, res);
  if (!update) return;
  if (!isId(req.params.commentId)) return res.status(404).json({ message: 'Not found.' });
  const comment = await ProjectComment.findOne({ _id: req.params.commentId, update: update._id });
  if (!comment) return res.status(404).json({ message: 'Not found.' });
  const allowed = String(comment.author) === String(req.user._id) || isOwner(project, req.user) || isReviewer(req.user);
  if (!allowed) return res.status(403).json({ message: 'Not allowed.' });
  await comment.deleteOne();
  if (!comment.hidden) await ProjectUpdate.updateOne({ _id: update._id }, { $inc: { commentCount: -1 } });
  res.json({ message: 'Deleted.' });
});

// Report: hidden automatically after REPORTS_TO_HIDE different reports.
router.post('/:id/updates/:updateId/comments/:commentId/report', protect, async (req, res) => {
  const { project, update } = await loadUpdate(req, res);
  if (!update) return;
  if (!isId(req.params.commentId)) return res.status(404).json({ message: 'Not found.' });
  const comment = await ProjectComment.findOneAndUpdate(
    { _id: req.params.commentId, update: update._id },
    { $addToSet: { reports: req.user._id } },
    { new: true },
  );
  if (!comment) return res.status(404).json({ message: 'Not found.' });
  if (!comment.hidden && comment.reports.length >= REPORTS_TO_HIDE) {
    comment.hidden = true;
    await comment.save();
    await ProjectUpdate.updateOne({ _id: update._id }, { $inc: { commentCount: -1 } });
    const staff = await User.find({ staffRoles: 'project-reviewer' }).select('_id').lean();
    const reviewers = [...(await adminIds()), ...staff.map((u) => u._id)];
    await notify(reviewers, { type: 'project', title: `A comment was hidden after ${REPORTS_TO_HIDE} reports`, body: `On "${project.title}": ${comment.body.slice(0, 120)}`, link: `/projects/${project.slug}` });
  }
  res.json({ message: 'Thanks, the team will take a look.' });
});

module.exports = router;

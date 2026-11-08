// Public counts for the landing page's "Explore CodeSphere" section.
// GET /api/stats/landing — no sign-in needed; cached for 5 minutes.
const express = require('express');
const User = require('../models/User');
const Event = require('../models/Event');
const UserBadge = require('../models/UserBadge');
const DebugProgress = require('../models/DebugProgress');
const StudyGuide = require('../models/StudyGuide');
const { Project, GuidedProject } = require('../models/Project');
const { ForumThread } = require('../models/Forum');
const { ReverseChallenge } = require('../models/Reverse');
const { Hackathon, ExternalHackathon } = require('../models/Hackathon');
const { NewsDigest } = require('../models/News');

const router = express.Router();
const CACHE_MS = 5 * 60 * 1000;
let cached = null;

// One failing count shouldn't hide the rest.
const safe = (promise) => promise.catch(() => null);

router.get('/landing', async (req, res) => {
  if (cached && Date.now() - cached.at < CACHE_MS) return res.json(cached.body);
  const now = new Date();
  const [
    members, upcomingEvents, projects, guidedProjects, threads, challenges,
    hackathons, externalHackathons, guides, digests, badges, bugsSolved,
  ] = await Promise.all([
    safe(User.countDocuments({ role: 'user' })),
    safe(Event.countDocuments({ status: 'published', date: { $gte: now } })),
    safe(Project.countDocuments({ visibility: 'public' })),
    safe(GuidedProject.countDocuments({ status: 'published' })),
    safe(ForumThread.countDocuments({ status: 'visible' })),
    safe(ReverseChallenge.countDocuments({ status: 'published' })),
    safe(Hackathon.countDocuments({ status: 'published' })),
    safe(ExternalHackathon.countDocuments({ $or: [{ endsAt: { $gte: now } }, { endsAt: null }] })),
    safe(StudyGuide.countDocuments({ status: 'published' })),
    safe(NewsDigest.countDocuments({ status: 'published' })),
    safe(UserBadge.countDocuments({})),
    safe(DebugProgress.countDocuments({})),
  ]);

  const body = {
    success: true,
    stats: {
      members,
      upcomingEvents,
      projects,
      guidedProjects,
      threads,
      challenges,
      hackathons: (hackathons || 0) + (externalHackathons || 0),
      guides,
      digests,
      badges,
      bugsSolved,
    },
  };
  cached = { at: Date.now(), body };
  return res.json(body);
});

module.exports = router;

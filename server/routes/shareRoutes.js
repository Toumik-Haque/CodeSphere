const express = require('express');
const mongoose = require('mongoose');
const Event = require('../models/Event');
const { Hackathon } = require('../models/Hackathon');
const { Project, GuidedProject } = require('../models/Project');
const User = require('../models/User');
const { NewsDigest } = require('../models/News');
const { DailyNews } = require('../models/DailyNews');
const { ForumThread } = require('../models/Forum');
const StudyGuide = require('../models/StudyGuide');

const router = express.Router();

const SITE_NAME = 'CodeSphere';
const DEFAULT_TITLE = 'CodeSphere - AGEMC';
const DEFAULT_DESCRIPTION =
  'CodeSphere is the AGEMC student developer community for events, hackathons, projects, study materials, and more.';
const DEFAULT_IMAGE = '/email-logo.png';

const clientUrl = () =>
  (process.env.CLIENT_URL || 'https://codesphereagemc.vercel.app').replace(/\/+$/, '');

const absoluteUrl = (value) => {
  if (!value) return '';
  try {
    const url = new URL(value, `${clientUrl()}/`);
    return ['http:', 'https:'].includes(url.protocol) ? url.toString() : '';
  } catch {
    return '';
  }
};

const plainText = (value, maxLength = 300) =>
  String(value || '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, maxLength);

const decodePart = (value) => {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
};

const buildMeta = (path, { title, description, image } = {}) => ({
  title: title ? `${title} | ${SITE_NAME}` : DEFAULT_TITLE,
  description: plainText(description) || DEFAULT_DESCRIPTION,
  image: absoluteUrl(image) || absoluteUrl(DEFAULT_IMAGE),
  url: `${clientUrl()}${path}`,
  siteName: SITE_NAME,
});

const metaForPath = async (rawPath) => {
  const path = rawPath === '/' ? '/' : `/${String(rawPath || '').replace(/^\/+|\/+$/g, '')}`;
  const segments = path.split('/').filter(Boolean).map(decodePart);

  if (!segments.length) return buildMeta(path);

  const [section, slug] = segments;

  if (section === 'events' && slug) {
    const event = await Event.findOne({ slug, status: 'published' })
      .select('title description bannerImage')
      .lean();
    if (event) {
      return buildMeta(path, {
        title: event.title,
        description: event.description,
        image: event.bannerImage?.url,
      });
    }
  }

  if (section === 'hackathons' && slug) {
    const hackathon = await Hackathon.findOne({ slug: slug.toLowerCase(), status: 'published' })
      .select('title tagline description bannerUrl')
      .lean();
    if (hackathon) {
      return buildMeta(path, {
        title: hackathon.title,
        description: hackathon.tagline || hackathon.description,
        image: hackathon.bannerUrl,
      });
    }
  }

  if (section === 'projects') {
    if (slug === 'guided' && segments[2]) {
      const guided = await GuidedProject.findOne({ slug: segments[2] })
        .select('title summary')
        .lean();
      if (guided) {
        return buildMeta(path, {
          title: guided.title,
          description: guided.summary,
        });
      }
    } else if (slug && slug !== 'new' && !segments[2]) {
      const project = await Project.findOne({
        slug,
        status: 'published',
        visibility: 'public',
      })
        .select('title summary cover screenshots')
        .lean();
      if (project) {
        return buildMeta(path, {
          title: project.title,
          description: project.summary,
          image: project.cover?.url || project.screenshots?.[0]?.url,
        });
      }
    }
  }

  if (['user', 'admin'].includes(section) && slug) {
    const member = await User.findOne({ username: slug.toLowerCase() })
      .select('name username profileImage bio collegeName')
      .lean();
    if (member) {
      const memberName = member.name || member.username;
      return buildMeta(path, {
        title: member.name ? `${member.name} (@${member.username})` : `@${member.username}`,
        description:
          member.bio ||
          `${memberName} on ${SITE_NAME}${member.collegeName ? `, ${member.collegeName}` : ''}.`,
        image: member.profileImage?.url,
      });
    }
  }

  if (section === 'forum' && slug && mongoose.isValidObjectId(slug)) {
    const thread = await ForumThread.findOne({ _id: slug, status: 'visible' })
      .select('title body attachments')
      .lean();
    if (thread) {
      return buildMeta(path, {
        title: thread.title,
        description: thread.body,
        image: thread.attachments?.[0]?.url,
      });
    }
  }

  if (section === 'materials' && slug) {
    const guide = await StudyGuide.findOne({ slug: slug.toLowerCase(), status: 'published' })
      .select('title summary')
      .lean();
    if (guide) {
      return buildMeta(path, {
        title: guide.title,
        description: guide.summary,
      });
    }
  }

  if (section === 'news' && slug) {
    const digest = await NewsDigest.findOne({
      slug,
      status: 'published',
      publishedAt: { $lte: new Date() },
    })
      .select('title intro')
      .lean();
    if (digest) {
      return buildMeta(path, {
        title: digest.title,
        description: digest.intro,
      });
    }
  }

  if (section === 'news') {
    const story = await DailyNews.findOne({ image: { $ne: '' } })
      .sort({ publishedAt: -1 })
      .select('title summary image')
      .lean();
    if (story) {
      return buildMeta(path, {
        title: 'Today in Tech',
        description: story.summary || story.title,
        image: story.image,
      });
    }
  }

  return buildMeta(path);
};

router.get('/', async (req, res) => {
  try {
    const path = Array.isArray(req.query.path) ? req.query.path[0] : req.query.path;
    const safePath = path === '/' ? '/' : `/${String(path || '').replace(/^\/+|\/+$/g, '')}`;
    return res.json(await metaForPath(safePath));
  } catch (error) {
    console.error('Share metadata error:', error);
    const fallbackPath = req.query.path === '/' ? '/' : `/${String(req.query.path || '').replace(/^\/+|\/+$/g, '')}`;
    return res.json(buildMeta(fallbackPath));
  }
});

module.exports = router;
module.exports.metaForPath = metaForPath;

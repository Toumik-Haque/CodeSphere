const crypto = require('crypto');
const express = require('express');
const multer = require('multer');
const { toFile } = require('@imagekit/nodejs');
const imagekit = require('../config/imagekit');
const Announcement = require('../models/Announcement');
const User = require('../models/User');
const { protect, adminOnly } = require('../middleware/authMiddleware');
const sanitizeDescription = require('../utils/sanitizeDescription');
const { broadcastUpdate, getBroadcastOptions } = require('../utils/broadcast');

const router = express.Router();
const MAX_FILE_SIZE = 10 * 1024 * 1024;
const MAX_FILES = 5;
const EXTENSIONS = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
  'application/pdf': 'pdf',
};
const ALLOWED_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'application/pdf',
]);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_SIZE, files: MAX_FILES },
  fileFilter: (req, file, callback) => {
    if (!ALLOWED_TYPES.has(file.mimetype)) {
      return callback(new Error('Attach JPEG, PNG, WebP, GIF, or PDF files only.'));
    }
    return callback(null, true);
  },
});

function handleMediaUpload(req, res, next) {
  upload.array('media', MAX_FILES)(req, res, (error) => {
    if (error) {
      return res.status(400).json({
        message: error.code === 'LIMIT_FILE_SIZE'
          ? 'Each attachment must be 10 MB or smaller.'
          : error.code === 'LIMIT_FILE_COUNT'
            ? `Attach no more than ${MAX_FILES} files.`
            : error.message || 'Invalid attachment.',
      });
    }
    return next();
  });
}

function sniffAllowedType(file) {
  const buffer = file.buffer;
  if (file.mimetype === 'image/jpeg' && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) return 'image';
  if (file.mimetype === 'image/png' && buffer.slice(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return 'image';
  if (file.mimetype === 'image/gif' && ['GIF87a', 'GIF89a'].includes(buffer.slice(0, 6).toString('ascii'))) return 'image';
  if (file.mimetype === 'image/webp' && buffer.slice(0, 4).toString('ascii') === 'RIFF' && buffer.slice(8, 12).toString('ascii') === 'WEBP') return 'image';
  if (file.mimetype === 'application/pdf' && buffer.slice(0, 5).toString('ascii') === '%PDF-') return 'document';
  return null;
}

function plainText(html) {
  return html
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function parseAudience(raw) {
  const tokens = String(raw || '').split(/[\s,]+/).filter(Boolean);
  if (!tokens.length || tokens.some((token) => token.toLowerCase() === '@all')) {
    return { mode: 'all', usernames: [], label: '@all' };
  }
  const invalid = tokens.find((token) => !/^@[a-z0-9]+(?:-[a-z0-9]+)*$/i.test(token));
  if (invalid) {
    return { error: `"${invalid}" is not a valid @username. Use @all or comma-separated @usernames.` };
  }
  const usernames = [...new Set(tokens.map((token) => token.slice(1).toLowerCase()))];
  return {
    mode: 'selected',
    usernames,
    label: usernames.map((username) => `@${username}`).join(', '),
  };
}

async function removeUploadedFiles(files) {
  await Promise.all(files.map((file) => imagekit.files.delete(file.fileId)
    .catch((error) => console.error('Announcement upload cleanup error:', error.message))));
}

// Admin: search members (name, username, email) for the "Sent to" suggestions.
router.get('/members', protect, adminOnly, async (req, res) => {
  try {
    const q = String(req.query.q || '').trim().slice(0, 40);
    const filter = { role: 'user', username: { $ne: null } };
    if (q) {
      const pattern = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      filter.$or = [{ name: pattern }, { username: pattern }, { email: pattern }];
    }
    const members = await User.find(filter)
      .select('name username email')
      .sort({ name: 1 })
      .limit(50)
      .lean();
    return res.json({ members });
  } catch (error) {
    console.error('Announcement member search error:', error);
    return res.status(500).json({ message: 'Could not load members.' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    if (!/^[a-f\d]{24}$/i.test(req.params.id)) return res.status(404).json({ message: 'Update not found.' });
    const announcement = await Announcement.findById(req.params.id).lean();
    if (!announcement) return res.status(404).json({ message: 'Update not found.' });
    return res.json({ announcement });
  } catch (error) {
    console.error('Announcement fetch error:', error);
    return res.status(500).json({ message: 'Could not load this update.' });
  }
});

router.post('/', protect, adminOnly, handleMediaUpload, async (req, res) => {
  const title = String(req.body.title || '').replace(/\s+/g, ' ').trim();
  const body = sanitizeDescription(String(req.body.body || ''));
  if (!title || title.length > 120 || !plainText(body) || body.length > 30000 || plainText(body).length > 5000) {
    return res.status(400).json({ message: 'Add a title and update text (up to 5,000 characters).' });
  }

  const audience = parseAudience(req.body.sentTo);
  if (audience.error) return res.status(400).json({ message: audience.error });

  let recipientUserIds = null;
  if (audience.mode === 'selected') {
    const recipients = await User.find({ role: 'user', username: { $in: audience.usernames } })
      .select('_id username')
      .lean();
    const found = new Set(recipients.map((user) => user.username));
    const missing = audience.usernames.filter((username) => !found.has(username));
    if (missing.length) {
      return res.status(400).json({
        message: `Could not find ${missing.map((username) => `@${username}`).join(', ')}.`,
      });
    }
    recipientUserIds = recipients.map((user) => user._id);
  }

  const uploaded = [];
  try {
    for (const file of req.files || []) {
      const type = sniffAllowedType(file);
      if (!type) {
        await removeUploadedFiles(uploaded);
        return res.status(400).json({ message: `${file.originalname} is not a valid supported file.` });
      }
      const fileName = `${crypto.randomUUID()}.${EXTENSIONS[file.mimetype]}`;
      const stored = await imagekit.files.upload({
        file: await toFile(file.buffer, fileName),
        fileName,
        folder: `/codesphere/announcements/${req.user._id}`,
        useUniqueFileName: false,
      });
      uploaded.push({
        name: file.originalname.slice(0, 200),
        type,
        url: stored.url,
        fileId: stored.fileId,
      });
    }

    const announcement = await Announcement.create({
      title,
      body,
      attachments: uploaded,
      audience: audience.label,
      recipientUsernames: audience.usernames,
      publishedBy: req.user._id,
    });

    const excerpt = plainText(body);
    const attachmentHtml = uploaded.map((file) => (
      `<li><a href="${escapeHtml(file.url)}">${escapeHtml(file.name)}</a></li>`
    )).join('');
    const htmlBody = `${body}${attachmentHtml ? `<h3>Attachments</h3><ul>${attachmentHtml}</ul>` : ''}`;
    const broadcastOptions = getBroadcastOptions(req.body);
    const delivery = await broadcastUpdate({
      title,
      body: excerpt,
      htmlBody,
      link: `/updates/${announcement._id}`,
      recipientUserIds,
      ...broadcastOptions,
    });

    const baseMessage = !broadcastOptions.sendNotification && !broadcastOptions.sendEmail
      ? 'Update published without sending notifications or email.'
      : !broadcastOptions.sendEmail
        ? 'Update published. In-app notifications sent.'
        : delivery.emails.skipped
          ? !broadcastOptions.sendNotification
            ? 'Update published. Email delivery is not configured.'
            : 'Update published and in-app alerts sent. Email delivery is not configured.'
          : delivery.emails.attempted === 0
            ? !broadcastOptions.sendNotification
              ? 'Update published. No members currently receive update emails.'
              : 'Update published and members notified in-app. No members currently receive update emails.'
            : `Update published. Email sent to ${delivery.emails.sent} of ${delivery.emails.attempted} members.`;
    const targetNote = audience.mode === 'selected'
      ? ` Targeted to ${recipientUserIds.length} member${recipientUserIds.length === 1 ? '' : 's'}.`
      : '';

    return res.status(201).json({
      message: `${baseMessage}${targetNote}`,
      announcement: { id: String(announcement._id), title: announcement.title },
      delivery: { ...delivery.emails, targeted: delivery.targeted, audience: audience.label },
    });
  } catch (error) {
    if (uploaded.length) await removeUploadedFiles(uploaded);
    console.error('Announcement publish error:', error);
    return res.status(500).json({ message: 'Unable to publish the update.' });
  }
});

module.exports = router;

const express = require('express');
const User = require('../models/User');
const { protect, adminOnly, STAFF_ROLES } = require('../middleware/authMiddleware');
const { notify } = require('../utils/notify');
const { handleImageUpload, storeImage, deleteImages } = require('../utils/forumMedia');

const router = express.Router();

// ---------- Profile photo (stored on ImageKit, visible to others) ----------

// PUT /api/users/me/avatar  (multipart field "image", max 2 MB)
router.put('/me/avatar', protect, handleImageUpload, async (req, res) => {
  try {
    const stored = await storeImage(req.file.buffer, req.user._id, 'avatars');
    const old = req.user.avatarFileId;
    await User.updateOne({ _id: req.user._id }, { $set: { avatarUrl: stored.url, avatarFileId: stored.fileId } });
    if (old) await deleteImages([{ fileId: old }]);
    res.json({ avatarUrl: stored.url });
  } catch (error) {
    res.status(error.status || 500).json({ message: error.status ? error.message : 'Could not upload the photo.' });
  }
});

// ---------- Resume (kept so students can view it any time) ----------

const crypto = require('crypto');
const multer = require('multer');
const { toFile } = require('@imagekit/nodejs');
const imagekit = require('../config/imagekit');

const RESUME_TYPES = { 'application/pdf': 'pdf', 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' };
const resumeUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024, files: 1 },
  fileFilter: (req, file, cb) => (RESUME_TYPES[file.mimetype] ? cb(null, true) : cb(new Error('Upload a PDF, JPG, PNG or WebP file.'))),
});

// Check the real contents, not just the declared type.
function sniffResume(buffer) {
  if (buffer.slice(0, 5).toString('latin1') === '%PDF-') return 'application/pdf';
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) return 'image/jpeg';
  if (buffer.slice(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return 'image/png';
  if (buffer.slice(0, 4).toString('latin1') === 'RIFF' && buffer.slice(8, 12).toString('latin1') === 'WEBP') return 'image/webp';
  return null;
}

const resumeView = (r) => (r?.url ? { url: r.url, name: r.name, size: r.size, type: r.type, uploadedAt: r.uploadedAt } : null);

// GET /api/users/me/resume
router.get('/me/resume', protect, (req, res) => res.json({ resume: resumeView(req.user.resume) }));

// PUT /api/users/me/resume  (multipart field "resume", max 5 MB)
router.put('/me/resume', protect, (req, res, next) => resumeUpload.single('resume')(req, res, (error) => {
  if (error) return res.status(400).json({ message: error.code === 'LIMIT_FILE_SIZE' ? 'The resume must be 5 MB or smaller.' : error.message });
  if (!req.file) return res.status(400).json({ message: 'Choose a resume file.' });
  return next();
}), async (req, res) => {
  try {
    const type = sniffResume(req.file.buffer);
    if (!type) return res.status(400).json({ message: 'That file is not a valid PDF or image.' });
    // Random file name: the link can't be guessed from the student's name.
    const fileName = `${crypto.randomUUID()}.${RESUME_TYPES[type]}`;
    const uploaded = await imagekit.files.upload({
      file: await toFile(req.file.buffer, fileName),
      fileName,
      folder: `/codesphere/resumes/${req.user._id}`,
      useUniqueFileName: false,
    });
    const old = req.user.resume?.fileId;
    const resume = {
      url: uploaded.url,
      fileId: uploaded.fileId,
      name: String(req.file.originalname || 'resume').replace(/[^\w .()-]/g, '_').slice(0, 120),
      size: req.file.size,
      type,
      uploadedAt: new Date(),
    };
    await User.updateOne({ _id: req.user._id }, { $set: { resume } });
    if (old) await deleteImages([{ fileId: old }]);
    res.json({ resume: resumeView(resume) });
  } catch (error) {
    console.error('Resume upload error:', error.message);
    res.status(500).json({ message: 'Could not save the resume. Try again.' });
  }
});

// DELETE /api/users/me/resume
router.delete('/me/resume', protect, async (req, res) => {
  const old = req.user.resume?.fileId;
  await User.updateOne({ _id: req.user._id }, { $unset: { resume: 1 } });
  if (old) await deleteImages([{ fileId: old }]);
  res.json({ resume: null });
});

// DELETE /api/users/me/avatar
router.delete('/me/avatar', protect, async (req, res) => {
  const old = req.user.avatarFileId;
  await User.updateOne({ _id: req.user._id }, { $set: { avatarUrl: '', avatarFileId: '' } });
  if (old) await deleteImages([{ fileId: old }]);
  res.json({ avatarUrl: '' });
});

// GET ALL REGISTERED USERS (EXCLUDING ADMINS)
// GET /api/users/admin/all?search=
router.get('/admin/all', protect, adminOnly, async (req, res) => {
  try {
    const search =
      typeof req.query.search === 'string'
        ? req.query.search.trim()
        : '';

    // Only fetch regular users
    const filter = {
      role: 'user',
    };

    if (search) {
      const escapedSearch = search.replace(
        /[.*+?^${}()|[\]\\]/g,
        '\\$&'
      );

      const regex = new RegExp(escapedSearch, 'i');

      filter.$or = [
        { name: regex },
        { email: regex },
        { collegeName: regex },
        { yearOfStudy: regex },
      ];
    }

    const users = await User.find(filter)
      .select('-password')
      .sort({ createdAt: -1 })
      .lean();

    return res.json({
      success: true,
      count: users.length,
      users,
    });
  } catch (error) {
    console.error('Fetch users error:', error.message);

    return res.status(500).json({
      success: false,
      message: 'Unable to fetch users.',
    });
  }
});

// PUT /api/users/admin/:id/staff-roles { staffRoles: [] }: admins grant or
// revoke staff roles (moderator, news-editor, challenge-editor).
router.put('/admin/:id/staff-roles', protect, adminOnly, async (req, res) => {
  try {
    const roles = [...new Set(Array.isArray(req.body.staffRoles) ? req.body.staffRoles : [])]
      .filter((r) => STAFF_ROLES.includes(r));
    const user = await User.findOne({ _id: req.params.id, role: 'user' });
    if (!user) return res.status(404).json({ message: 'Student not found.' });

    const added = roles.filter((r) => !user.staffRoles.includes(r));
    user.staffRoles = roles;
    await user.save();

    if (added.length) {
      await notify(user._id, {
        type: 'system',
        title: `You're now a CodeSphere ${added.join(' & ')}. Thank you for helping!`,
        body: 'Your staff tools are in the menu under your name.',
        link: '/',
      });
    }
    return res.json({ staffRoles: user.staffRoles });
  } catch (error) {
    console.error('Staff roles error:', error);
    return res.status(500).json({ message: 'Could not update staff roles.' });
  }
});

module.exports = router;
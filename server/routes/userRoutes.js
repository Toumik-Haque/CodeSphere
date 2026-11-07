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
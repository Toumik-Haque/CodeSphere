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
    // Also fill profileImage (used by the profile dashboard).
    await User.updateOne({ _id: req.user._id }, { $set: { avatarUrl: stored.url, avatarFileId: stored.fileId, profileImage: { url: stored.url, fileId: stored.fileId } } });
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

// ---------- Profile banner (bigger images allowed) ----------

const bannerUploadMw = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024, files: 1 },
  fileFilter: (req, file, cb) => (['image/jpeg', 'image/png', 'image/webp', 'image/gif'].includes(file.mimetype)
    ? cb(null, true)
    : cb(new Error('The banner must be a JPEG, PNG, WebP or GIF image.'))),
});

// PUT /api/users/me/banner  (multipart field "image", max 5 MB)
router.put('/me/banner', protect, (req, res, next) => bannerUploadMw.single('image')(req, res, (error) => {
  if (error) return res.status(400).json({ message: error.code === 'LIMIT_FILE_SIZE' ? 'The banner must be 5 MB or smaller.' : error.message });
  if (!req.file) return res.status(400).json({ message: 'Choose an image.' });
  return next();
}), async (req, res) => {
  try {
    const stored = await storeImage(req.file.buffer, req.user._id, 'banners');
    const old = req.user.bannerFileId;
    await User.updateOne({ _id: req.user._id }, { $set: { bannerUrl: stored.url, bannerFileId: stored.fileId, bannerImage: { url: stored.url, fileId: stored.fileId } } });
    if (old) await deleteImages([{ fileId: old }]);
    res.json({ bannerUrl: stored.url });
  } catch (error) {
    res.status(error.status || 500).json({ message: error.status ? error.message : 'Could not upload the banner.' });
  }
});

// DELETE /api/users/me/banner
router.delete('/me/banner', protect, async (req, res) => {
  const old = req.user.bannerFileId;
  await User.updateOne({ _id: req.user._id }, { $set: { bannerUrl: '', bannerFileId: '' } });
  if (old) await deleteImages([{ fileId: old }]);
  res.json({ bannerUrl: '' });
});

// DELETE /api/users/me/avatar
router.delete('/me/avatar', protect, async (req, res) => {
  const old = req.user.avatarFileId;
  await User.updateOne({ _id: req.user._id }, { $set: { avatarUrl: '', avatarFileId: '' } });
  if (old) await deleteImages([{ fileId: old }]);
  res.json({ avatarUrl: '' });
});
// ---------- Public profiles, usernames and profile editing ----------
// (router, protect, adminOnly, imagekit and toFile are declared above)
const Project = require('../models/PortfolioProject'); // profile portfolio, not the Project Hub
const handleProfileUpload = require('../middleware/profileUpload');

const isValidHttpUrl = (value) => {
  if (!value) return true;

  try {
    return ['http:', 'https:'].includes(new URL(value).protocol);
  } catch {
    return false;
  }
};

// Reserved usernames that cannot be used by members
const reservedUsernames = [
  'admin',
  'login',
  'register',
  'dashboard',
  'events',
  'team',
  'contact',
  'settings',
  'profile',
  'api',
  'about',
  'help',
  'forgot-password',
  'reset-password',
];

// Generate a username suggestion from a name
const generateUsername = (name) => {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 30);
};

// Validate username format
const isValidUsername = (username) => {
  return (
    /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(username) &&
    username.length >= 3 &&
    username.length <= 30 &&
    !reservedUsernames.includes(username)
  );
};

// Fields allowed to be updated by the profile owner
const allowedProfileFields = [
  'name',
  'username',
  'bio',
  'phone',
  'city',
  'gender',
  'dateOfBirth',
  'degree',
  'department',
  'graduationYear',
  'github',
  'linkedin',
  'portfolio',
  'technicalInterests',
  'skills',
  'skillDetails',
  'learningGoals',
  'codingProfiles',
  'achievements',
  'collegeName',
  'yearOfStudy',
];

// GET ALL REGISTERED USERS (EXCLUDING ADMINS)
// GET /api/users/admin/export
router.get('/admin/export', protect, adminOnly, async (req, res) => {
  try {
    const users = await User.find({ role: 'user' })
      .select(
        'name username email collegeName yearOfStudy degree department graduationYear city bio github linkedin portfolio technicalInterests skills skillDetails codingProfiles achievements learningGoals profileComplete createdAt'
      )
      .sort({ createdAt: -1 })
      .lean();

    return res.json({
      success: true,
      count: users.length,
      users,
    });
  } catch (error) {
    console.error('Export users error:', error.message);

    return res.status(500).json({
      success: false,
      message: 'Unable to export registered users.',
    });
  }
});

// GET /api/users/admin/all?search=
router.get('/admin/all', protect, adminOnly, async (req, res) => {
  try {
    const search =
      typeof req.query.search === 'string'
        ? req.query.search.trim()
        : '';

    const filter = { role: 'user' };

    if (search) {
      const escapedSearch = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
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
// GET /api/users/search?q=term (search profiles visible to signed-in members)
router.get('/search', protect, async (req, res) => {
  try {
    const search =
      typeof req.query.q === 'string'
        ? req.query.q.trim()
        : '';

    if (search.length < 2 || search.length > 60) {
      return res.status(400).json({
        success: false,
        message: 'Search must be between 2 and 60 characters.',
      });
    }

    const escapedSearch = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(escapedSearch, 'i');
    const users = await User.find({
      role: 'user',
      _id: { $ne: req.user._id },
      username: { $type: 'string', $ne: '' },
      $or: [
        { name: regex },
        { username: regex },
        { collegeName: regex },
      ],
    })
      .select('name username collegeName profileImage avatarUrl')
      .sort({ name: 1, username: 1 })
      .limit(12)
      .lean();

    return res.json({
      success: true,
      users,
    });
  } catch (error) {
    console.error('Search members error:', error.message);

    return res.status(500).json({
      success: false,
      message: 'Unable to search members.',
    });
  }
});

// GET CURRENT USER PROFILE
// GET /api/users/profile
router.get('/profile', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('-password');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found.',
      });
    }

    return res.json({
      success: true,
      user,
      suggestedUsername: generateUsername(user.name),
    });
  } catch (error) {
    console.error('Fetch profile error:', error.message);

    return res.status(500).json({
      success: false,
      message: 'Unable to fetch profile.',
    });
  }
});

// CHECK USERNAME AVAILABILITY
// GET /api/users/username/check/:username
router.get('/username/check/:username', protect, async (req, res) => {
  try {
    const username = req.params.username.toLowerCase().trim();

    if (!isValidUsername(username)) {
      return res.status(400).json({
        success: false,
        available: false,
        message: 'Username must be 3–30 characters and contain only lowercase letters, numbers, and hyphens. Reserved usernames cannot be used.',
      });
    }

    const existingUser = await User.findOne({ username }).select('_id');

    const available =
      !existingUser ||
      existingUser._id.toString() === req.user._id.toString();

    return res.json({
      success: true,
      available,
      message: available
        ? 'Username is available.'
        : 'This username is already taken.',
    });
  } catch (error) {
    console.error('Username check error:', error.message);

    return res.status(500).json({
      success: false,
      message: 'Unable to check username.',
    });
  }
});

// UPDATE CURRENT USER PROFILE
// PATCH /api/users/profile
router.patch('/profile', protect, async (req, res) => {
  try {
    const updates = {};

    for (const field of allowedProfileFields) {
      if (Object.prototype.hasOwnProperty.call(req.body, field)) {
        updates[field] = req.body[field];
      }
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No valid profile fields provided.',
      });
    }

    if (updates.username !== undefined) {
      updates.username = String(updates.username).toLowerCase().trim();

      if (!isValidUsername(updates.username)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid username. Use 3–30 lowercase letters, numbers, or hyphens. Reserved usernames cannot be used.',
        });
      }

      const existingUser = await User.findOne({
        username: updates.username,
        _id: { $ne: req.user._id },
      }).select('_id');

      if (existingUser) {
        return res.status(409).json({
          success: false,
          message: 'This username is already taken.',
        });
      }
    }

    if (
      updates.name !== undefined &&
      (typeof updates.name !== 'string' || !updates.name.trim())
    ) {
      return res.status(400).json({
        success: false,
        message: 'Name cannot be empty.',
      });
    }

    if (
      updates.gender !== undefined &&
      !['', 'Male', 'Female', 'Prefer not to say', 'Other'].includes(updates.gender)
    ) {
      return res.status(400).json({
        success: false,
        message: 'Invalid gender selection.',
      });
    }

    if (
      updates.yearOfStudy !== undefined &&
      !['1st Year', '2nd Year', '3rd Year', '4th Year'].includes(
        updates.yearOfStudy
      )
    ) {
      return res.status(400).json({
        success: false,
        message: 'Invalid year of study.',
      });
    }

    const arrayFields = [
      'technicalInterests',
      'skills',
      'learningGoals',
    ];

    for (const field of arrayFields) {
      if (updates[field] !== undefined) {
        if (
          !Array.isArray(updates[field]) ||
          !updates[field].every((item) => typeof item === 'string')
        ) {
          return res.status(400).json({
            success: false,
            message: `${field} must be an array of strings.`,
          });
        }

        updates[field] = updates[field]
          .map((item) => item.trim())
          .filter(Boolean);
      }
    }

    const objectArrayFields = {
      skillDetails: {
        required: ['name'],
        allowed: ['name', 'level'],
      },
      codingProfiles: {
        required: ['platform', 'url'],
        allowed: ['platform', 'url'],
      },
      achievements: {
        required: ['title'],
        allowed: ['title', 'category', 'issuer', 'year', 'link'],
      },
    };

    for (const [field, rules] of Object.entries(objectArrayFields)) {
      if (updates[field] === undefined) continue;

      if (
        !Array.isArray(updates[field]) ||
        updates[field].length > 100 ||
        !updates[field].every((item) =>
          item &&
          typeof item === 'object' &&
          !Array.isArray(item) &&
          rules.required.every((key) => typeof item[key] === 'string') &&
          Object.entries(item).every(([key, value]) =>
            rules.allowed.includes(key) && typeof value === 'string'
          )
        )
      ) {
        return res.status(400).json({
          success: false,
          message: `${field} must be an array of valid profile entries.`,
        });
      }

      updates[field] = updates[field].map((item) =>
        Object.fromEntries(
          Object.entries(item).map(([key, value]) => [key, value.trim()])
        )
      );

      if (
        updates[field].some((item) =>
          rules.required.some((key) => !item[key]) ||
          (field === 'codingProfiles' && !isValidHttpUrl(item.url)) ||
          (field === 'achievements' && !isValidHttpUrl(item.link))
        )
      ) {
        return res.status(400).json({
          success: false,
          message: `${field} contains a missing required value or invalid URL.`,
        });
      }
    }

    if (
      updates.skillDetails?.some(
        ({ level }) =>
          level !== undefined &&
          !['Beginner', 'Intermediate', 'Advanced'].includes(level)
      )
    ) {
      return res.status(400).json({
        success: false,
        message: 'Invalid skill proficiency level.',
      });
    }

    const stringFields = {
      name: { maxLength: 80, required: true },
      bio: { maxLength: 500 },
      phone: { maxLength: 30 },
      city: { maxLength: 100 },
      collegeName: { maxLength: 150, required: true },
      dateOfBirth: { maxLength: 30 },
      degree: { maxLength: 100 },
      department: { maxLength: 150 },
      graduationYear: { maxLength: 4 },
      github: { maxLength: 500 },
      linkedin: { maxLength: 500 },
      portfolio: { maxLength: 500 },
    };

    for (const [field, rules] of Object.entries(stringFields)) {
      if (updates[field] !== undefined) {
        if (
          typeof updates[field] !== 'string' ||
          updates[field].trim().length > rules.maxLength ||
          (rules.required && !updates[field].trim())
        ) {
          return res.status(400).json({
            success: false,
            message: `${field} must be a${rules.required ? ' non-empty' : ''} string of at most ${rules.maxLength} characters.`,
          });
        }

        updates[field] = updates[field].trim();
      }
    }

    for (const field of ['github', 'linkedin', 'portfolio']) {
      if (
        updates[field] !== undefined &&
        !isValidHttpUrl(updates[field])
      ) {
        return res.status(400).json({
          success: false,
          message: `${field} must be a valid HTTP or HTTPS URL.`,
        });
      }
    }

    const user = await User.findByIdAndUpdate(
      req.user._id,
      { $set: updates },
      {
        new: true,
        runValidators: true,
      }
    ).select('-password');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found.',
      });
    }

    return res.json({
      success: true,
      message: 'Profile updated successfully.',
      user,
    });
  } catch (error) {
    console.error('Update profile error:', error.message);

    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: 'This username is already taken.',
      });
    }

    return res.status(500).json({
      success: false,
      message: 'Unable to update profile.',
    });
  }
});


// UPLOAD OR REPLACE PROFILE PICTURE
// POST /api/users/profile/image
router.post(
  '/profile/image',
  protect,
  handleProfileUpload,
  async (req, res) => {
    let uploadedImage = null;

    try {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: 'Please select an image.',
        });
      }

      const imageField = req.query.type === 'banner' ? 'bannerImage' : 'profileImage';
      const imageFolder = imageField === 'bannerImage' ? 'banners' : 'profiles';
      const imageLabel = imageField === 'bannerImage' ? 'Banner' : 'Profile picture';
      const user = await User.findById(req.user._id);

      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found.',
        });
      }

      uploadedImage = await imagekit.files.upload({
        file: await toFile(
          req.file.buffer,
          req.file.originalname
        ),
        fileName: `${imageFolder}-${user._id}-${Date.now()}`,
        folder: `/codesphere/${imageFolder}`,
      });

      const oldFileId = user[imageField]?.fileId;

      user[imageField] = {
        url: uploadedImage.url,
        fileId: uploadedImage.fileId,
      };
      // Keep the flat fields used by the forum / Project Hub in sync.
      if (imageField === 'profileImage') user.avatarUrl = uploadedImage.url;
      else user.bannerUrl = uploadedImage.url;

      await user.save();

      // Delete the previous image only after saving the new one.
      if (oldFileId) {
        try {
          await imagekit.files.delete(oldFileId);
        } catch (cleanupError) {
          console.error(
            'Old profile image cleanup error:',
            cleanupError.message
          );
        }
      }

      return res.json({
        success: true,
        message: `${imageLabel} updated successfully.`,
        [imageField]: user[imageField],
      });
    } catch (error) {
      console.error('Profile image upload error:', error);

      // Clean up newly uploaded image if saving fails.
      if (uploadedImage?.fileId) {
        try {
          await imagekit.files.delete(uploadedImage.fileId);
        } catch (cleanupError) {
          console.error(
            'New profile image cleanup error:',
            cleanupError.message
          );
        }
      }

      return res.status(500).json({
        success: false,
        message: 'Unable to upload image.',
      });
    }
  }
);

// DELETE PROFILE PICTURE
// DELETE /api/users/profile/image
router.delete('/profile/image', protect, async (req, res) => {
  try {
    const imageField = req.query.type === 'banner' ? 'bannerImage' : 'profileImage';
    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found.',
      });
    }

    const oldFileId = user[imageField]?.fileId;

    user[imageField] = {
      url: '',
      fileId: '',
    };
    if (imageField === 'profileImage') user.avatarUrl = '';
    else user.bannerUrl = '';

    await user.save();

    if (oldFileId) {
      try {
        await imagekit.files.delete(oldFileId);
      } catch (cleanupError) {
        console.error(
          'Profile image deletion error:',
          cleanupError.message
        );
      }
    }

    return res.json({
      success: true,
      message: `${imageField === 'bannerImage' ? 'Banner' : 'Profile picture'} removed successfully.`,
    });
  } catch (error) {
    console.error('Remove profile image error:', error.message);

    return res.status(500).json({
      success: false,
      message: 'Unable to remove profile picture.',
    });
  }
});


// GET ANOTHER MEMBER'S PROFILE
// GET /api/users/profile/:username
router.get('/profile/:username', protect, async (req, res) => {
  try {
    const username = req.params.username.toLowerCase().trim();

    const member = await User.findOne({
      username,
      role: 'user',
    })
      .select(
      'name username collegeName degree department yearOfStudy graduationYear profileImage avatarUrl bannerImage bannerUrl bio github linkedin portfolio technicalInterests skills learningGoals codingProfiles achievements createdAt'
      )
      .lean();

    if (!member) {
      return res.status(404).json({
        success: false,
        message: 'Member profile not found.',
      });
    }

    const legacyGithubProfile = member.codingProfiles?.find(
      (profile) => profile.platform?.toLowerCase() === 'github'
    );
    member.github = member.github || legacyGithubProfile?.url || '';
    member.codingProfiles = (member.codingProfiles || []).filter(
      (profile) => profile.platform?.toLowerCase() !== 'github'
    );

    member.projects = await Project.find({ user: member._id })
      .sort({ featured: -1, updatedAt: -1 })
      .select('title description technologies type githubUrl liveUrl status featured')
      .lean();

    return res.json({
      success: true,
      member,
    });
  } catch (error) {
    console.error('Fetch member profile error:', error.message);

    return res.status(500).json({
      success: false,
      message: 'Unable to fetch member profile.',
    });
  }
});

module.exports = router;

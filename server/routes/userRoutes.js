const express = require('express');
const User = require('../models/User');
const Project = require('../models/Project');
const { protect, adminOnly } = require('../middleware/authMiddleware');

const router = express.Router();

const imagekit = require('../config/imagekit');
const { toFile } = require('@imagekit/nodejs');
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
  'profileVisibility',
];

// GET ALL REGISTERED USERS (EXCLUDING ADMINS)
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
      updates.profileVisibility !== undefined &&
      !['members', 'private'].includes(updates.profileVisibility)
    ) {
      return res.status(400).json({
        success: false,
        message: 'Invalid profile visibility setting.',
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
      'name username collegeName degree department yearOfStudy graduationYear profileImage bio github linkedin portfolio technicalInterests skills learningGoals codingProfiles achievements profileVisibility createdAt'
      )
      .lean();

    if (!member) {
      return res.status(404).json({
        success: false,
        message: 'Member profile not found.',
      });
    }

    const isOwner =
      member._id.toString() === req.user._id.toString();

    if (!isOwner && member.profileVisibility !== 'members') {
      return res.status(404).json({
        success: false,
        message: 'Member profile not found.',
      });
    }

    // Do not expose profile visibility to other members.
    if (!isOwner) {
      delete member.profileVisibility;
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

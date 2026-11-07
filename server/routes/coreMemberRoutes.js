
const express = require('express');
const mongoose = require('mongoose');
const multer = require('multer');

const imagekit = require('../config/imagekit');
const { toFile } = require('@imagekit/nodejs');

const CoreMember = require('../models/CoreMember');
const { sortCoreMembers } = require('../utils/coreMemberRoleOrder');
const { protect, adminOnly } = require('../middleware/authMiddleware');

const router = express.Router();

// Accept JPEG, PNG, and WebP images up to 5 MB.
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024,
  },
  fileFilter: (req, file, callback) => {
    const allowedTypes = [
      'image/jpeg',
      'image/png',
      'image/webp',
    ];

    if (!allowedTypes.includes(file.mimetype)) {
      return callback(
        new Error('Only JPEG, PNG, and WebP images are allowed.')
      );
    }

    callback(null, true);
  },
});

// Convert Multer errors into readable API responses.
function handleImageUpload(req, res, next) {
  upload.single('image')(req, res, (error) => {
    if (error) {
      return res.status(400).json({
        message:
          error.code === 'LIMIT_FILE_SIZE'
            ? 'Image must be 5 MB or smaller.'
            : error.message || 'Invalid image upload.',
      });
    }

    next();
  });
}

// Upload a profile image to ImageKit.
async function uploadToImageKit(fileBuffer, originalName) {
  const uploadedFile = await imagekit.files.upload({
    file: await toFile(fileBuffer, originalName),
    fileName: originalName,
    folder: '/codesphere/team-members',
  });

  return {
    url: uploadedFile.url,
    publicId: uploadedFile.fileId,
    provider: 'imagekit',
  };
}

// Delete an image from ImageKit.
async function deleteStoredImage(image) {
  if (!image?.publicId) return;

  await imagekit.files.delete(image.publicId);
}

// Validate an optional LinkedIn, Instagram, or GitHub URL.
function validateOptionalUrl(value, label) {
  if (typeof value !== 'string') {
    return `${label} must be a valid URL.`;
  }

  const trimmedValue = value.trim();

  if (!trimmedValue) return null;

  if (trimmedValue.length > 500) {
    return `${label} must be 500 characters or fewer.`;
  }

  try {
    const url = new URL(trimmedValue);

    if (!['http:', 'https:'].includes(url.protocol)) {
      return `${label} must use HTTP or HTTPS.`;
    }
  } catch {
    return `Please enter a valid ${label.toLowerCase()}.`;
  }

  return null;
}

// Validate member details.
function validateMember(body) {
  const { name, role } = body;

  const allowedRoles = [
    'Faculty Coordinator',
    'Secretary',
    'Assistant Secretary',
    'Student Member',
  ];

  if (
    typeof name !== 'string' ||
    !name.trim() ||
    name.trim().length > 100
  ) {
    return 'Please provide a valid member name.';
  }

  if (
    typeof role !== 'string' ||
    !allowedRoles.includes(role.trim())
  ) {
    return 'Please select a valid Team Member position.';
  }

  const linkedinError = validateOptionalUrl(
    body.linkedinLink ?? '',
    'LinkedIn profile link'
  );

  if (linkedinError) return linkedinError;

  const instagramError = validateOptionalUrl(
    body.instagramLink ?? '',
    'Instagram profile link'
  );

  if (instagramError) return instagramError;

  const githubError = validateOptionalUrl(
    body.githubLink ?? '',
    'GitHub profile link'
  );

  if (githubError) return githubError;

  return null;
}

// Public: list all team members in display order.
router.get('/', async (req, res) => {
  try {
    const members = await CoreMember.find()
      .select('-__v')
      .lean();

    return res.json({
      members: sortCoreMembers(members),
    });
  } catch (error) {
    console.error('Fetch team members error:', error.message);

    return res.status(500).json({
      message: 'Unable to fetch team members.',
    });
  }
});

// Admin: create a Team Member. Profile image is mandatory.
router.post(
  '/',
  protect,
  adminOnly,
  handleImageUpload,
  async (req, res) => {
    let uploadedImage = null;

    try {
      const validationError = validateMember(req.body);

      if (validationError) {
        return res.status(400).json({
          message: validationError,
        });
      }

      // Require a profile image during creation.
      if (!req.file) {
        return res.status(400).json({
          message: 'Please upload a profile image.',
        });
      }

      uploadedImage = await uploadToImageKit(
        req.file.buffer,
        req.file.originalname
      );

      const member = await CoreMember.create({
        name: req.body.name.trim(),
        role: req.body.role.trim(),
        linkedinLink: (req.body.linkedinLink || '').trim(),
        instagramLink: (req.body.instagramLink || '').trim(),
        githubLink: (req.body.githubLink || '').trim(),
        order: 0,
        image: {
          url: uploadedImage.url,
          publicId: uploadedImage.publicId,
          provider: uploadedImage.provider,
        },
      });

      return res.status(201).json({
        message: 'Team Member created successfully.',
        member,
      });
    } catch (error) {
      console.error('Create Team Member error:', error);

      // If database creation fails, delete the newly uploaded image.
      if (uploadedImage?.publicId) {
        try {
          await imagekit.files.delete(uploadedImage.publicId);
        } catch (cleanupError) {
          console.error(
            'ImageKit cleanup error:',
            cleanupError.message
          );
        }
      }

      return res.status(500).json({
        message: 'Unable to create Team Member.',
      });
    }
  }
);

// Admin: update a Team Member. A new profile image is mandatory.
router.patch(
  '/:id',
  protect,
  adminOnly,
  handleImageUpload,
  async (req, res) => {
    let uploadedImage = null;

    try {
      if (!mongoose.isValidObjectId(req.params.id)) {
        return res.status(400).json({
          message: 'Invalid Team Member ID.',
        });
      }

      const member = await CoreMember.findById(req.params.id);

      if (!member) {
        return res.status(404).json({
          message: 'Team Member not found.',
        });
      }

      // Require a new profile image during every edit.
      if (!req.file) {
        return res.status(400).json({
          message: 'Please upload a new profile image.',
        });
      }

      const candidate = {
        name: req.body.name ?? member.name,
        role: req.body.role ?? member.role,
        linkedinLink: req.body.linkedinLink ?? member.linkedinLink ?? '',
        instagramLink: req.body.instagramLink ?? member.instagramLink ?? '',
        githubLink: req.body.githubLink ?? member.githubLink ?? '',
      };

      const validationError = validateMember(candidate);

      if (validationError) {
        return res.status(400).json({
          message: validationError,
        });
      }

      // Preserve the old image details before replacing it.
      const oldImage = {
        publicId: member.image?.publicId,
      };

      // Upload the mandatory replacement image.
      uploadedImage = await uploadToImageKit(
        req.file.buffer,
        req.file.originalname
      );

      member.name = candidate.name.trim();
      member.role = candidate.role.trim();
      member.linkedinLink = candidate.linkedinLink.trim();
      member.instagramLink = candidate.instagramLink.trim();
      member.githubLink = candidate.githubLink.trim();

      // Replace the existing profile image.
      member.image = {
        url: uploadedImage.url,
        publicId: uploadedImage.publicId,
        provider: uploadedImage.provider,
      };

      // Save database changes before deleting the previous image.
      await member.save();

      // Delete the old image only after the database update succeeds.
      if (oldImage.publicId) {
        try {
          await deleteStoredImage(oldImage);
        } catch (cleanupError) {
          console.error(
            'Old image cleanup error:',
            cleanupError.message
          );
        }
      }

      return res.json({
        message: 'Team Member updated successfully.',
        member,
      });
    } catch (error) {
      console.error('Update Team Member error:', error);

      // If the database update fails, clean up the new ImageKit image.
      if (uploadedImage?.publicId) {
        try {
          await imagekit.files.delete(uploadedImage.publicId);
        } catch (cleanupError) {
          console.error(
            'New ImageKit image cleanup error:',
            cleanupError.message
          );
        }
      }

      return res.status(500).json({
        message: 'Unable to update Team Member.',
      });
    }
  }
);

// Admin: delete a Team Member and their profile image.
router.delete('/:id', protect, adminOnly, async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({
        message: 'Invalid Team Member ID.',
      });
    }

    const member = await CoreMember.findByIdAndDelete(req.params.id);

    if (!member) {
      return res.status(404).json({
        message: 'Team Member not found.',
      });
    }

    // Delete the profile image from ImageKit.
    if (member.image?.publicId) {
      try {
        await deleteStoredImage(member.image);
      } catch (cleanupError) {
        console.error(
          'Deleted member image cleanup error:',
          cleanupError.message
        );
      }
    }

    return res.json({
      message: 'Team Member deleted successfully.',
    });
  } catch (error) {
    console.error('Delete Team Member error:', error.message);

    return res.status(500).json({
      message: 'Unable to delete Team Member.',
    });
  }
});

module.exports = router;

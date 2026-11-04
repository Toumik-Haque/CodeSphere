const express = require('express');
const mongoose = require('mongoose');
const multer = require('multer');

const imagekit = require('../config/imagekit');
const { toFile } = require('@imagekit/nodejs');

const CoreMember = require('../models/CoreMember');
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
    folder: '/codesphere/core-members',
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

  if (
    typeof name !== 'string' ||
    !name.trim() ||
    name.trim().length > 100 ||
    typeof role !== 'string' ||
    !role.trim() ||
    role.trim().length > 100
  ) {
    return 'Please provide a valid member name and role.';
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

// Public: list all core members in display order.
router.get('/', async (req, res) => {
  try {
    const members = await CoreMember.find()
      .select('-__v')
      .sort({ order: 1, name: 1 })
      .lean();

    return res.json({ members });
  } catch (error) {
    console.error('Fetch core members error:', error.message);

    return res.status(500).json({
      message: 'Unable to fetch core members.',
    });
  }
});

// Admin: create a core member.
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
        message: 'Core member created successfully.',
        member,
      });
    } catch (error) {
      console.error('Create core member error:', error);

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
        message: 'Unable to create core member.',
      });
    }
  }
);

// Admin: update a core member and optionally replace the image.
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
          message: 'Invalid core member ID.',
        });
      }

      const member = await CoreMember.findById(req.params.id);

      if (!member) {
        return res.status(404).json({
          message: 'Core member not found.',
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

      // Preserve the original image details before changing anything.
      const oldImage = {
        publicId: member.image?.publicId,
      };

      // Upload replacement image to ImageKit if provided.
      if (req.file) {
        uploadedImage = await uploadToImageKit(
          req.file.buffer,
          req.file.originalname
        );
      }

      member.name = candidate.name.trim();
      member.role = candidate.role.trim();
      member.linkedinLink = candidate.linkedinLink.trim();
      member.instagramLink = candidate.instagramLink.trim();
      member.githubLink = candidate.githubLink.trim();

      const shouldRemoveImage =
        !req.file && req.body.removeImage === 'true';

      if (uploadedImage) {
        member.image = {
          url: uploadedImage.url,
          publicId: uploadedImage.publicId,
          provider: uploadedImage.provider,
        };
      } else if (shouldRemoveImage) {
        member.image = {
          url: '',
          publicId: '',
          provider: '',
        };
      }

      // Save database changes before deleting the previous image.
      await member.save();

      // Delete the old image only after the database update succeeds.
      if ((uploadedImage || shouldRemoveImage) && oldImage.publicId) {
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
        message: 'Core member updated successfully.',
        member,
      });
    } catch (error) {
      console.error('Update core member error:', error);

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
        message: 'Unable to update core member.',
      });
    }
  }
);

// Admin: delete a core member and their profile image.
router.delete('/:id', protect, adminOnly, async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({
        message: 'Invalid core member ID.',
      });
    }

    const member = await CoreMember.findByIdAndDelete(req.params.id);

    if (!member) {
      return res.status(404).json({
        message: 'Core member not found.',
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
      message: 'Core member deleted successfully.',
    });
  } catch (error) {
    console.error('Delete core member error:', error.message);

    return res.status(500).json({
      message: 'Unable to delete core member.',
    });
  }
});

module.exports = router;

const express = require('express');
const mongoose = require('mongoose');
const multer = require('multer');
const { Readable } = require('stream');

const cloudinary = require('../config/cloudinary');
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
        message: error.code === 'LIMIT_FILE_SIZE'
          ? 'Image must be 5 MB or smaller.'
          : error.message || 'Invalid image upload.',
      });
    }

    next();
  });
}

// Upload a profile image to Cloudinary.
function uploadToCloudinary(fileBuffer) {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: 'codesphere/core-members',
        resource_type: 'image',
      },
      (error, result) => {
        if (error) return reject(error);
        resolve(result);
      }
    );

    Readable.from(fileBuffer).pipe(stream);
  });
}

// Delete an image from Cloudinary.
async function deleteCloudinaryImage(publicId) {
  if (!publicId) return;

  await cloudinary.uploader.destroy(publicId, {
    resource_type: 'image',
  });
}

// Validate member details.
function validateMember(body) {
  const { name, role, link = '' } = body;

  if (
    typeof name !== 'string' ||
    !name.trim() ||
    name.trim().length > 100 ||
    typeof role !== 'string' ||
    !role.trim() ||
    role.trim().length > 100 ||
    typeof link !== 'string' ||
    link.length > 500
  ) {
    return 'Please provide a valid member name, role, and supporting link.';
  }

  if (link.trim()) {
    try {
      const url = new URL(link.trim());

      if (!['http:', 'https:'].includes(url.protocol)) {
        return 'The supporting link must use HTTP or HTTPS.';
      }
    } catch {
      return 'Please enter a valid supporting URL.';
    }
  }

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

      if (req.file) {
        uploadedImage = await uploadToCloudinary(req.file.buffer);
      }

      const member = await CoreMember.create({
        name: req.body.name.trim(),
        role: req.body.role.trim(),
        link: (req.body.link || '').trim(),
        order: 0,
        image: uploadedImage
          ? {
            url: uploadedImage.secure_url,
            publicId: uploadedImage.public_id,
          }
          : undefined,
      });

      return res.status(201).json({
        message: 'Core member created successfully.',
        member,
      });
    } catch (error) {
      console.error('Create core member error:', error);

      if (uploadedImage?.public_id) {
        try {
          await deleteCloudinaryImage(uploadedImage.public_id);
        } catch (cleanupError) {
          console.error('Image cleanup error:', cleanupError.message);
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
        link: req.body.link ?? member.link ?? member.linkedin ?? member.github ?? '',
        order: String(member.order ?? 0),
      };

      const validationError = validateMember(candidate);

      if (validationError) {
        return res.status(400).json({
          message: validationError,
        });
      }

      if (req.file) {
        uploadedImage = await uploadToCloudinary(req.file.buffer);
      }

      const oldPublicId = member.image?.publicId;

      Object.assign(member, {
        name: candidate.name.trim(),
        role: candidate.role.trim(),
        link: candidate.link.trim(),
        order: Number(candidate.order),
      });

      if (uploadedImage) {
        member.image = {
          url: uploadedImage.secure_url,
          publicId: uploadedImage.public_id,
        };
      }

      await member.save();

      // Remove the old image only after the database update succeeds.
      if (uploadedImage && oldPublicId) {
        try {
          await deleteCloudinaryImage(oldPublicId);
        } catch (cleanupError) {
          console.error('Old image cleanup error:', cleanupError.message);
        }
      }

      return res.json({
        message: 'Core member updated successfully.',
        member,
      });
    } catch (error) {
      console.error('Update core member error:', error);

      if (uploadedImage?.public_id) {
        try {
          await deleteCloudinaryImage(uploadedImage.public_id);
        } catch (cleanupError) {
          console.error('New image cleanup error:', cleanupError.message);
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

    if (member.image?.publicId) {
      try {
        await deleteCloudinaryImage(member.image.publicId);
      } catch (cleanupError) {
        console.error('Deleted member image cleanup error:', cleanupError.message);
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
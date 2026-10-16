const express = require('express');
const mongoose = require('mongoose');
const multer = require('multer');
const cloudinary = require('../config/cloudinary');
const { Readable } = require('stream');
const Event = require('../models/Event');
const User = require('../models/User');
const Attendance = require('../models/Attendance');
const { protect, adminOnly } = require('../middleware/authMiddleware');

const router = express.Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5 MB maximum
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

function handleBannerUpload(req, res, next) {
  upload.single('bannerImage')(req, res, (error) => {
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

function uploadToCloudinary(fileBuffer) {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: 'codesphere/events',
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

async function deleteCloudinaryImage(publicId) {
  if (!publicId) return;

  await cloudinary.uploader.destroy(publicId, {
    resource_type: 'image',
  });
}

const categories = [
  'Workshop',
  'Hackathon',
  'Community Meetup',
];

function slugify(title) {
  const slug = title
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

  return slug || 'event';
}

async function makeUniqueSlug(title) {
  const baseSlug = slugify(title);
  let slug = baseSlug;
  let counter = 2;

  while (await Event.exists({ slug })) {
    slug = `${baseSlug}-${counter}`;
    counter += 1;
  }

  return slug;
}

function validateEvent(body) {
  const {
    title,
    category,
    description,
    date,
    endDate,
    venue = '',
    mode = 'In-person',
    meetingLink = '',
    status = 'draft',
  } = body;

  if (
    typeof title !== 'string' ||
    !title.trim() ||
    title.trim().length > 120 ||
    !categories.includes(category) ||
    typeof description !== 'string' ||
    !description.trim() ||
    description.trim().length > 5000 ||
    typeof date !== 'string' ||
    !Number.isFinite(Date.parse(date)) ||
    !['In-person', 'Online', 'Hybrid'].includes(mode) ||
    !['draft', 'published'].includes(status) ||
    typeof venue !== 'string' ||
    venue.length > 200 ||
    typeof meetingLink !== 'string' ||
    meetingLink.length > 2048
  ) {
    return 'Please provide valid event details.';
  }

  if (endDate && (
    typeof endDate !== 'string' ||
    !Number.isFinite(Date.parse(endDate)) ||
    Date.parse(endDate) < Date.parse(date)
  )) {
    return 'The event end date must be valid and not before the start date.';
  }

  if (meetingLink) {
    try {
      const url = new URL(meetingLink);
      if (!['http:', 'https:'].includes(url.protocol)) {
        return 'Meeting links must use HTTP or HTTPS.';
      }
    } catch {
      return 'Please enter a valid meeting link.';
    }
  }

  return null;
}

// Public: list published events, optionally filtered by category.
router.get('/', async (req, res) => {
  try {
    const { category } = req.query;

    if (category && !categories.includes(category)) {
      return res.status(400).json({ message: 'Invalid event category.' });
    }

    const filter = { status: 'published' };
    if (category) filter.category = category;

    const events = await Event.find(filter)
      .select('-createdBy -__v')
      .sort({ date: 1 })
      .lean();

    return res.json({ events });
  } catch (error) {
    console.error('Fetch events error:', error.message);
    return res.status(500).json({ message: 'Unable to fetch events.' });
  }
});

// Admin: list all events, including drafts.
router.get('/admin/all', protect, adminOnly, async (req, res) => {
  try {
    const events = await Event.find()
      .sort({ date: -1 })
      .populate('createdBy', 'name email')
      .lean();

    return res.json({ events });
  } catch (error) {
    console.error('Admin event list error:', error.message);
    return res.status(500).json({ message: 'Unable to fetch admin events.' });
  }
});

// GET /api/events/slug/:slug
router.get('/slug/:slug', async (req, res) => {
  try {
    const event = await Event.findOne({
      slug: req.params.slug,
      status: 'published',
    })
      .select('-createdBy -__v')
      .lean();

    if (!event) {
      return res.status(404).json({
        message: 'Event not found.',
      });
    }

    return res.json({ event });
  } catch (error) {
    console.error('Error fetching event by slug:', error);

    return res.status(500).json({
      message: 'Unable to fetch event.',
    });
  }
});

/* Public: fetch one published event by ID. */
router.get('/:id', async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ message: 'Invalid event ID.' });
    }

    const event = await Event.findOne({
      _id: req.params.id,
      status: 'published',
    })
      .select('-createdBy -__v')
      .lean();

    if (!event) {
      return res.status(404).json({ message: 'Event not found.' });
    }

    return res.json({ event });
  } catch (error) {
    console.error('Fetch event details error:', error.message);
    return res.status(500).json({
      message: 'Unable to fetch event details.',
    });
  }
});

// Admin: create an event, optionally with a banner.
router.post('/', protect, adminOnly, handleBannerUpload, async (req, res) => {
  let uploadedBanner = null;

  try {
    const validationError = validateEvent(req.body);

    if (validationError) {
      return res.status(400).json({
        message: validationError,
      });
    }

    if (req.file) {
      uploadedBanner = await uploadToCloudinary(req.file.buffer);
    }

    const slug = await makeUniqueSlug(req.body.title.trim());

    const event = await Event.create({
      title: req.body.title.trim(),
      slug,
      category: req.body.category,
      description: req.body.description.trim(),
      date: new Date(req.body.date),
      endDate: req.body.endDate
        ? new Date(req.body.endDate)
        : null,
      venue: (req.body.venue || '').trim(),
      mode: req.body.mode || 'In-person',
      meetingLink: (req.body.meetingLink || '').trim(),
      status: req.body.status || 'draft',
      bannerImage: uploadedBanner
        ? {
          url: uploadedBanner.secure_url,
          publicId: uploadedBanner.public_id,
        }
        : undefined,
      createdBy: req.user._id,
    });

    return res.status(201).json({
      message: 'Event created successfully.',
      event,
    });
  } catch (error) {
    console.error('Create event error:', error);

    // Clean up the upload if event creation fails.
    if (uploadedBanner?.public_id) {
      try {
        await deleteCloudinaryImage(uploadedBanner.public_id);
      } catch (cleanupError) {
        console.error(
          'Banner cleanup error:',
          cleanupError.message
        );
      }
    }

    return res.status(500).json({
      message: 'Unable to create event.',
    });
  }
}
);

// Admin: edit an event and optionally replace its banner.
router.patch('/:id', protect, adminOnly, handleBannerUpload, async (req, res) => {
  let uploadedBanner = null;

  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({
        message: 'Invalid event ID.',
      });
    }

    const existing = await Event.findById(req.params.id);

    if (!existing) {
      return res.status(404).json({
        message: 'Event not found.',
      });
    }

    const candidate = {
      title: req.body.title ?? existing.title,
      category: req.body.category ?? existing.category,
      description: req.body.description ?? existing.description,
      date: req.body.date ?? existing.date.toISOString(),
      endDate: req.body.endDate === undefined
        ? existing.endDate?.toISOString() || ''
        : req.body.endDate,
      venue: req.body.venue ?? existing.venue,
      mode: req.body.mode ?? existing.mode,
      meetingLink: req.body.meetingLink ?? existing.meetingLink,
      status: req.body.status ?? existing.status,
    };

    const validationError = validateEvent(candidate);

    if (validationError) {
      return res.status(400).json({
        message: validationError,
      });
    }

    if (req.file) {
      uploadedBanner = await uploadToCloudinary(req.file.buffer);
    }

    const oldPublicId = existing.bannerImage?.publicId;

    Object.assign(existing, {
      title: candidate.title.trim(),
      category: candidate.category,
      description: candidate.description.trim(),
      date: new Date(candidate.date),
      endDate: candidate.endDate
        ? new Date(candidate.endDate)
        : null,
      venue: (candidate.venue || '').trim(),
      mode: candidate.mode,
      meetingLink: (candidate.meetingLink || '').trim(),
      status: candidate.status,
    });

    if (uploadedBanner) {
      existing.bannerImage = {
        url: uploadedBanner.secure_url,
        publicId: uploadedBanner.public_id,
      };
    }

    await existing.save();

    // Delete the previous image only after the update succeeds.
    if (uploadedBanner && oldPublicId) {
      try {
        await deleteCloudinaryImage(oldPublicId);
      } catch (cleanupError) {
        console.error(
          'Old banner cleanup error:',
          cleanupError.message
        );
      }
    }

    return res.json({
      message: 'Event updated successfully.',
      event: existing,
    });
  } catch (error) {
    console.error('Update event error:', error);

    if (uploadedBanner?.public_id) {
      try {
        await deleteCloudinaryImage(uploadedBanner.public_id);
      } catch (cleanupError) {
        console.error(
          'New banner cleanup error:',
          cleanupError.message
        );
      }
    }

    return res.status(500).json({
      message: 'Unable to update event.',
    });
  }
}
);

// Admin: delete an event.
router.delete('/:id', protect, adminOnly, async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ message: 'Invalid event ID.' });
    }

    const event = await Event.findByIdAndDelete(req.params.id);

    if (!event) {
      return res.status(404).json({
        message: 'Event not found.',
      });
    }

    if (event.bannerImage?.publicId) {
      try {
        await deleteCloudinaryImage(event.bannerImage.publicId);
      } catch (cleanupError) {
        console.error(
          'Deleted event banner cleanup error:',
          cleanupError.message
        );
      }
    }

    return res.json({ message: 'Event deleted successfully.' });
  } catch (error) {
    console.error('Delete event error:', error.message);
    return res.status(500).json({ message: 'Unable to delete event.' });
  }
});


// Admin: dashboard summary.
router.get('/admin/summary', protect, adminOnly, async (req, res) => {
  try {
    const now = new Date();

    const [
      totalMembers,
      totalEvents,
      upcomingEvents,
      pastEvents,
    ] = await Promise.all([
      User.countDocuments({ role: 'user' }),
      Event.countDocuments(),
      Event.countDocuments({
        status: 'published',
        date: { $gte: now },
      }),
      Event.countDocuments({
        status: 'published',
        $or: [
          { endDate: { $lt: now } },
          { endDate: null, date: { $lt: now } },
        ],
      }),
    ]);

    res.json({
      totalMembers,
      totalEvents,
      upcomingEvents,
      pastEvents,
    });
  } catch (error) {
    console.error('Admin summary error:', error.message);
    res.status(500).json({
      message: 'Unable to load dashboard summary.',
    });
  }
});

// Admin: list members and search by name or email.
router.get('/admin/members', protect, adminOnly, async (req, res) => {
  try {
    const search = String(req.query.search || '').trim();
    const filter = { role: 'user' };

    if (search) {
      const escapedSearch = search.replace(
        /[.*+?^${}()|[\]\\]/g,
        '\\$&'
      );

      filter.$or = [
        { name: { $regex: escapedSearch, $options: 'i' } },
        { email: { $regex: escapedSearch, $options: 'i' } },
      ];
    }

    const members = await User.find(filter)
      .select('name email role createdAt')
      .sort({ createdAt: -1 })
      .lean();

    res.json({ members });
  } catch (error) {
    console.error('Admin member list error:', error.message);
    res.status(500).json({
      message: 'Unable to fetch members.',
    });
  }
});

// Admin: get attendance for all user accounts for one event.
router.get(
  '/admin/:id/attendance',
  protect,
  adminOnly,
  async (req, res) => {
    try {
      const { id } = req.params;

      if (!mongoose.isValidObjectId(id)) {
        return res.status(400).json({
          message: 'Invalid event ID.',
        });
      }

      const event = await Event.findById(id)
        .select('title date endDate status')
        .lean();

      if (!event) {
        return res.status(404).json({
          message: 'Event not found.',
        });
      }

      const members = await User.find({ role: 'user' })
        .select('name email')
        .sort({ name: 1 })
        .lean();

      const records = await Attendance.find({ event: id }).lean();

      const attendanceByUser = new Map(
        records.map((record) => [
          record.user.toString(),
          record,
        ])
      );

      const attendance = members.map((member) => {
        const record = attendanceByUser.get(member._id.toString());

        return {
          ...member,
          status: record?.status || 'absent',
          attendanceId: record?._id || null,
          markedAt: record?.markedAt || null,
        };
      });

      res.json({ event, attendance });
    } catch (error) {
      console.error('Fetch attendance error:', error.message);
      res.status(500).json({
        message: 'Unable to fetch attendance.',
      });
    }
  }
);

// Admin: mark or update a member's attendance for an event.
router.patch(
  '/admin/:id/attendance/:userId',
  protect,
  adminOnly,
  async (req, res) => {
    try {
      const { id, userId } = req.params;
      const { status } = req.body;

      if (
        !mongoose.isValidObjectId(id) ||
        !mongoose.isValidObjectId(userId)
      ) {
        return res.status(400).json({
          message: 'Invalid event or member ID.',
        });
      }

      if (!['present', 'absent'].includes(status)) {
        return res.status(400).json({
          message: 'Status must be present or absent.',
        });
      }

      const [event, member] = await Promise.all([
        Event.findById(id).select('_id'),
        User.findOne({ _id: userId, role: 'user' }).select('_id'),
      ]);

      if (!event) {
        return res.status(404).json({
          message: 'Event not found.',
        });
      }

      if (!member) {
        return res.status(404).json({
          message: 'Member not found.',
        });
      }

      const record = await Attendance.findOneAndUpdate(
        { event: id, user: userId },
        {
          $set: {
            status,
            markedBy: req.user._id,
            markedAt: new Date(),
          },
        },
        {
          new: true,
          upsert: true,
          runValidators: true,
          setDefaultsOnInsert: true,
        }
      );

      res.json({
        message: 'Attendance updated successfully.',
        attendance: record,
      });
    } catch (error) {
      console.error('Update attendance error:', error.message);
      res.status(500).json({
        message: 'Unable to update attendance.',
      });
    }
  }
);

module.exports = router;
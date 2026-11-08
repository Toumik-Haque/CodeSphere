const express = require('express');
const mongoose = require('mongoose');
const multer = require('multer');

const imagekit = require('../config/imagekit');
const { toFile } = require('@imagekit/nodejs');

const sanitizeDescription = require('../utils/sanitizeDescription');

const Event = require('../models/Event');
const User = require('../models/User');
const Attendance = require('../models/Attendance');
const Registration = require('../models/Registration');
const { protect, adminOnly } = require('../middleware/authMiddleware');
const { syncBadgesQuietly } = require('../utils/badges');
const { broadcastUpdate, getBroadcastOptions } = require('../utils/broadcast');

const router = express.Router();

// Only authenticated CodeSphere members can register for events.
function memberOnly(req, res, next) {
  if (req.user?.role !== 'user') {
    return res.status(403).json({
      message: 'Only CodeSphere members can register for events.',
    });
  }

  next();
}

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

// Upload new event banners to ImageKit.
async function uploadToImageKit(fileBuffer, originalName) {
  const uploadedFile = await imagekit.files.upload({
    file: await toFile(fileBuffer, originalName),
    fileName: originalName,
    folder: '/codesphere/events',
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

function isValidOptionalUrl(value) {
  if (typeof value !== 'string' || value.length > 2048) {
    return false;
  }

  if (!value.trim()) return true;

  try {
    const url = new URL(value.trim());
    return ['http:', 'https:'].includes(url.protocol);
  } catch {
    return false;
  }
}

function getPlainText(html = '') {
  return html
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .trim();
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
    registrationLink = '',
    linkedinPostLink = '',
    instagramPostLink = '',
    status = 'draft',
  } = body;

  if (
    typeof title !== 'string' ||
    !title.trim() ||
    title.trim().length > 120 ||
    !categories.includes(category) ||
    typeof description !== 'string' ||
    !getPlainText(description) ||
    description.length > 30000 ||
    getPlainText(description).length > 5000 ||
    typeof date !== 'string' ||
    !Number.isFinite(Date.parse(date)) ||
    !['In-person', 'Online', 'Hybrid'].includes(mode) ||
    !['draft', 'published'].includes(status) ||
    typeof venue !== 'string' ||
    venue.length > 200 ||
    typeof meetingLink !== 'string' ||
    !isValidOptionalUrl(meetingLink) ||
    !isValidOptionalUrl(registrationLink) ||
    !isValidOptionalUrl(linkedinPostLink) ||
    !isValidOptionalUrl(instagramPostLink)
  ) {
    return 'Please provide valid event details.';
  }

  if (mode === 'In-person' && !venue.trim()) {
    return 'Please provide a venue for an in-person event.';
  }

  if (mode === 'Online' && !meetingLink.trim()) {
    return 'Please provide a meeting link for an online event.';
  }

  if (endDate && (
    typeof endDate !== 'string' ||
    !Number.isFinite(Date.parse(endDate)) ||
    Date.parse(endDate) < Date.parse(date)
  )) {
    return 'The event end date must be valid and not before the start date.';
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
      .select('-createdBy -__v -contactEmail -contactPhone -reviewNote -reviewedBy -reviewStatus')
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
    const events = await Event.find({ $or: [{ origin: { $ne: 'community' } }, { reviewStatus: 'approved' }] })
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
      .select('-createdBy -__v -contactEmail -contactPhone -reviewNote -reviewedBy -reviewStatus')
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

// Member: register for a published event.
router.post('/:id/register', protect, memberOnly, async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({
        message: 'Invalid event ID.',
      });
    }

    const event = await Event.findOne({
      _id: id,
      status: 'published',
    }).select('_id title date endDate');

    if (!event) {
      return res.status(404).json({
        message: 'Published event not found.',
      });
    }

    let registration = await Registration.findOne({
      event: id,
      user: req.user._id,
    });

    // Prevent duplicate active registrations.
    if (registration?.status === 'registered') {
      return res.status(409).json({
        message: 'You are already registered for this event.',
      });
    }

    // Reactivate an earlier cancelled registration.
    if (registration) {
      registration.status = 'registered';
      registration.registeredAt = new Date();
      registration.cancelledAt = null;

      await registration.save();
    } else {
      registration = await Registration.create({
        event: id,
        user: req.user._id,
      });
    }

    return res.status(201).json({
      message: 'Successfully registered for the event.',
      registration,
    });
  } catch (error) {
    // Handle simultaneous registration attempts safely.
    if (error.code === 11000) {
      return res.status(409).json({
        message: 'You are already registered for this event.',
      });
    }

    console.error('Event registration error:', error.message);

    return res.status(500).json({
      message: 'Unable to register for this event.',
    });
  }
});

// Member: cancel an event registration.
router.delete('/:id/register', protect, memberOnly, async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({
        message: 'Invalid event ID.',
      });
    }

    const registration = await Registration.findOne({
      event: id,
      user: req.user._id,
      status: 'registered',
    });

    if (!registration) {
      return res.status(404).json({
        message: 'Active registration not found.',
      });
    }

    registration.status = 'cancelled';
    registration.cancelledAt = new Date();

    await registration.save();

    return res.json({
      message: 'Event registration cancelled successfully.',
      registration,
    });
  } catch (error) {
    console.error('Cancel registration error:', error.message);

    return res.status(500).json({
      message: 'Unable to cancel event registration.',
    });
  }
});

// Member: get registration history of the logged-in member.
router.get('/my-registrations', protect, memberOnly, async (req, res) => {
  try {
    const registrations = await Registration.find({
      user: req.user._id,
    })
      .populate(
        'event',
        'title slug category description date endDate venue mode bannerImage status'
      )
      .sort({ registeredAt: -1 })
      .lean();

    return res.json({
      registrations: registrations.filter((registration) => registration.event),
    });
  } catch (error) {
    console.error('Fetch my registrations error:', error.message);

    return res.status(500).json({
      message: 'Unable to fetch your event registrations.',
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
      .select('-createdBy -__v -contactEmail -contactPhone -reviewNote -reviewedBy -reviewStatus')
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
    const sanitizedDescription = sanitizeDescription(
      req.body.description || ''
    );

    const validationError = validateEvent({
      ...req.body,
      description: sanitizedDescription,
    });

    if (validationError) {
      return res.status(400).json({
        message: validationError,
      });
    }

    if (req.file) {
      uploadedBanner = await uploadToImageKit(
        req.file.buffer,
        req.file.originalname
      );
    }

    const slug = await makeUniqueSlug(req.body.title.trim());

    const event = await Event.create({
      title: req.body.title.trim(),
      slug,
      category: req.body.category,
      description: sanitizedDescription,
      date: new Date(req.body.date),
      endDate: req.body.endDate
        ? new Date(req.body.endDate)
        : null,
      venue: req.body.mode === 'Online'
        ? ''
        : (req.body.venue || '').trim(),
      mode: req.body.mode || 'In-person',
      meetingLink: req.body.mode === 'In-person'
        ? ''
        : (req.body.meetingLink || '').trim(),
      registrationLink: (req.body.registrationLink || '').trim(),
      linkedinPostLink: (req.body.linkedinPostLink || '').trim(),
      instagramPostLink: (req.body.instagramPostLink || '').trim(),
      status: req.body.status || 'draft',
      bannerImage: uploadedBanner
        ? {
          url: uploadedBanner.url,
          publicId: uploadedBanner.publicId,
          provider: uploadedBanner.provider,
        }
        : undefined,
      createdBy: req.user._id,
    });

    if (event.status === 'published') {
      await broadcastUpdate({
        title: `New event: ${event.title}`,
        body: getPlainText(event.description).slice(0, 400),
        link: `/events/${event.slug}`,
        ...getBroadcastOptions(req.body),
      });
    }

    return res.status(201).json({
      message: 'Event created successfully.',
      event,
    });
  } catch (error) {
    console.error('Create event error:', error);

    // Clean up the upload if event creation fails.
    if (uploadedBanner?.publicId) {
      try {
        await imagekit.files.delete(uploadedBanner.publicId);
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
});

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
      description: sanitizeDescription(req.body.description ?? existing.description),
      date: req.body.date ?? existing.date.toISOString(),
      endDate: req.body.endDate === undefined
        ? existing.endDate?.toISOString() || ''
        : req.body.endDate,
      venue: req.body.venue ?? existing.venue,
      mode: req.body.mode ?? existing.mode,
      meetingLink: req.body.meetingLink ?? existing.meetingLink,
      registrationLink: req.body.registrationLink ?? existing.registrationLink ?? '',
      linkedinPostLink: req.body.linkedinPostLink ?? existing.linkedinPostLink ?? '',
      instagramPostLink: req.body.instagramPostLink ?? existing.instagramPostLink ?? '',
      status: req.body.status ?? existing.status,
    };

    // Clear fields that do not apply to the selected event format.
    if (candidate.mode === 'Online') {
      candidate.venue = '';
    }

    if (candidate.mode === 'In-person') {
      candidate.meetingLink = '';
    }

    const validationError = validateEvent(candidate);

    if (validationError) {
      return res.status(400).json({
        message: validationError,
      });
    }

    if (req.file) {
      uploadedBanner = await uploadToImageKit(
        req.file.buffer,
        req.file.originalname
      );
    }

    // Keep the old banner details before changing the document.
    const oldBanner = {
      publicId: existing.bannerImage?.publicId,
    };

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
      registrationLink: candidate.registrationLink.trim(),
      linkedinPostLink: candidate.linkedinPostLink.trim(),
      instagramPostLink: candidate.instagramPostLink.trim(),
      status: candidate.status,
    });

    const shouldRemoveBanner =
      !req.file && req.body.removeBannerImage === 'true';

    if (uploadedBanner) {
      existing.bannerImage = {
        url: uploadedBanner.url,
        publicId: uploadedBanner.publicId,
        provider: uploadedBanner.provider,
      };
    } else if (shouldRemoveBanner) {
      existing.bannerImage = {
        url: '',
        publicId: '',
        provider: '',
      };
    }

    const wasPublished = existing.status === 'published';
    await existing.save();

    if (!wasPublished && existing.status === 'published') {
      await broadcastUpdate({
        title: `New event: ${existing.title}`,
        body: getPlainText(existing.description).slice(0, 400),
        link: `/events/${existing.slug}`,
        ...getBroadcastOptions(req.body),
      });
    }

    // Delete the previous image only after the update succeeds.
    if ((uploadedBanner || shouldRemoveBanner) && oldBanner.publicId) {
      try {
        await deleteStoredImage(oldBanner);
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

    // Clean up the newly uploaded ImageKit banner if the update fails.
    if (uploadedBanner?.publicId) {
      try {
        await imagekit.files.delete(uploadedBanner.publicId);
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
});

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

    await Promise.all([
      Registration.deleteMany({ event: event._id }),
      Attendance.deleteMany({ event: event._id }),
    ]);

    if (event.bannerImage?.publicId) {
      try {
        await deleteStoredImage(event.bannerImage);
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

// Admin: get registered participants for one event.
router.get(
  '/admin/:id/registrations',
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
        .select('title slug category date endDate status')
        .lean();

      if (!event) {
        return res.status(404).json({
          message: 'Event not found.',
        });
      }

      const registrations = await Registration.find({
        event: id,
        status: 'registered',
      })
        .populate('user', 'name username email')
        .sort({ registeredAt: -1 })
        .lean();

      return res.json({
        event,
        totalRegistrations: registrations.length,
        registrations,
      });
    } catch (error) {
      console.error('Fetch event registrations error:', error.message);

      return res.status(500).json({
        message: 'Unable to fetch event registrations.',
      });
    }
  }
);

// Admin: get attendance for registered participants only.
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

      // Fetch only actively registered participants.
      const registrations = await Registration.find({
        event: id,
        status: 'registered',
      })
        .populate('user', 'name email username')
        .sort({ registeredAt: -1 })
        .lean();

      const records = await Attendance.find({ event: id }).lean();

      const attendanceByUser = new Map(
        records.map((record) => [
          record.user.toString(),
          record,
        ])
      );

      const attendance = registrations
        .filter((registration) => registration.user)
        .map((registration) => {
          const member = registration.user;
          const record = attendanceByUser.get(member._id.toString());

          return {
            _id: member._id,
            name: member.name,
            email: member.email,
            username: member.username,
            registrationId: registration._id,
            registeredAt: registration.registeredAt,
            status: record?.status || 'absent',
            attendanceId: record?._id || null,
            markedAt: record?.markedAt || null,
          };
        });

      return res.json({
        event,
        totalRegistered: attendance.length,
        attendance,
      });
    } catch (error) {
      console.error('Fetch attendance error:', error.message);

      return res.status(500).json({
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

      const [event, registration] = await Promise.all([
        Event.findById(id).select('_id'),
        Registration.findOne({
          event: id,
          user: userId,
          status: 'registered',
        }).select('_id'),
      ]);

      if (!event) {
        return res.status(404).json({
          message: 'Event not found.',
        });
      }

      if (!registration) {
        return res.status(404).json({
          message: 'This member is not actively registered for the event.',
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

      // Event badges: the student sees any new ones next time they visit.
      if (status === 'present') await syncBadgesQuietly(userId);

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

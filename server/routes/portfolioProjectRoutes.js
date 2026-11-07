const express = require('express');
const mongoose = require('mongoose');

const Project = require('../models/PortfolioProject'); // profile portfolio, not the Project Hub
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

// Validate optional URLs
const isValidUrl = (value) => {
  if (!value) return true;

  try {
    const url = new URL(value);
    return ['http:', 'https:'].includes(url.protocol);
  } catch {
    return false;
  }
};

// Validate project input
const validateProject = (data) => {
  const {
    title,
    description,
    technologies,
    type,
    githubUrl,
    liveUrl,
    status,
    featured,
  } = data;

  if (
    typeof title !== 'string' ||
    !title.trim() ||
    title.trim().length > 100
  ) {
    return 'Project title is required and must be under 100 characters.';
  }

  if (
    typeof description !== 'string' ||
    !description.trim() ||
    description.trim().length > 1000
  ) {
    return 'Description is required and must be under 1000 characters.';
  }

  if (
    type !== undefined &&
    (typeof type !== 'string' || type.trim().length > 80)
  ) {
    return 'Project type must be under 80 characters.';
  }

  if (
    technologies !== undefined &&
    (!Array.isArray(technologies) ||
      !technologies.every((item) => typeof item === 'string'))
  ) {
    return 'Technologies must be an array of strings.';
  }

  if (
    githubUrl !== undefined &&
    (typeof githubUrl !== 'string' || !isValidUrl(githubUrl.trim()))
  ) {
    return 'Please provide a valid GitHub URL.';
  }

  if (
    liveUrl !== undefined &&
    (typeof liveUrl !== 'string' || !isValidUrl(liveUrl.trim()))
  ) {
    return 'Please provide a valid live project URL.';
  }

  if (
    status !== undefined &&
    !['Completed', 'In Progress', 'Planning'].includes(status)
  ) {
    return 'Invalid project status.';
  }

  if (featured !== undefined && typeof featured !== 'boolean') {
    return 'Featured must be true or false.';
  }

  return null;
};

// GET ALL PROJECTS OF LOGGED-IN USER
// GET /api/projects
router.get('/', protect, async (req, res) => {
  try {
    const projects = await Project.find({
      user: req.user._id,
    }).sort({ featured: -1, updatedAt: -1 });

    return res.json({
      success: true,
      count: projects.length,
      projects,
    });
  } catch (error) {
    console.error('Fetch projects error:', error.message);

    return res.status(500).json({
      success: false,
      message: 'Unable to fetch projects.',
    });
  }
});

// CREATE PROJECT
// POST /api/projects
router.post('/', protect, async (req, res) => {
  try {
    const validationError = validateProject(req.body);

    if (validationError) {
      return res.status(400).json({
        success: false,
        message: validationError,
      });
    }

    const projectCount = await Project.countDocuments({
      user: req.user._id,
    });

    if (projectCount >= 20) {
      return res.status(400).json({
        success: false,
        message: 'You can add a maximum of 20 projects.',
      });
    }

    const project = await Project.create({
      user: req.user._id,
      title: req.body.title.trim(),
      description: req.body.description.trim(),
      technologies: (req.body.technologies || [])
        .map((item) => item.trim())
        .filter(Boolean),
      type: (req.body.type || '').trim(),
      githubUrl: (req.body.githubUrl || '').trim(),
      liveUrl: (req.body.liveUrl || '').trim(),
      status: req.body.status || 'Completed',
      featured: Boolean(req.body.featured),
    });

    return res.status(201).json({
      success: true,
      message: 'Project added successfully.',
      project,
    });
  } catch (error) {
    console.error('Create project error:', error.message);

    return res.status(500).json({
      success: false,
      message: 'Unable to add project.',
    });
  }
});

// UPDATE PROJECT
// PATCH /api/projects/:id
router.patch('/:id', protect, async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid project ID.',
      });
    }

    const validationError = validateProject(req.body);

    if (validationError) {
      return res.status(400).json({
        success: false,
        message: validationError,
      });
    }

    const allowedFields = [
      'title',
      'description',
      'technologies',
      'type',
      'githubUrl',
      'liveUrl',
      'status',
      'featured',
    ];

    const updates = {};

    for (const field of allowedFields) {
      if (Object.prototype.hasOwnProperty.call(req.body, field)) {
        updates[field] = req.body[field];
      }
    }

    if (updates.title !== undefined) {
      updates.title = updates.title.trim();
    }

    if (updates.description !== undefined) {
      updates.description = updates.description.trim();
    }

    if (updates.technologies !== undefined) {
      updates.technologies = updates.technologies
        .map((item) => item.trim())
        .filter(Boolean);
    }

    if (updates.type !== undefined) {
      updates.type = updates.type.trim();
    }

    if (updates.githubUrl !== undefined) {
      updates.githubUrl = updates.githubUrl.trim();
    }

    if (updates.liveUrl !== undefined) {
      updates.liveUrl = updates.liveUrl.trim();
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No valid project fields provided.',
      });
    }

    const project = await Project.findOneAndUpdate(
      {
        _id: req.params.id,
        user: req.user._id,
      },
      { $set: updates },
      {
        new: true,
        runValidators: true,
      }
    );

    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Project not found.',
      });
    }

    return res.json({
      success: true,
      message: 'Project updated successfully.',
      project,
    });
  } catch (error) {
    console.error('Update project error:', error.message);

    return res.status(500).json({
      success: false,
      message: 'Unable to update project.',
    });
  }
});

// DELETE PROJECT
// DELETE /api/projects/:id
router.delete('/:id', protect, async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid project ID.',
      });
    }

    const project = await Project.findOneAndDelete({
      _id: req.params.id,
      user: req.user._id,
    });

    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Project not found.',
      });
    }

    return res.json({
      success: true,
      message: 'Project deleted successfully.',
    });
  } catch (error) {
    console.error('Delete project error:', error.message);

    return res.status(500).json({
      success: false,
      message: 'Unable to delete project.',
    });
  }
});

module.exports = router;
const mongoose = require('mongoose');

const { Schema } = mongoose;
const ObjectId = Schema.Types.ObjectId;

// A recruitment drive or interview session, e.g. "GDG on Campus AGEMC: core
// team recruitment". Posted by the club (live at once) or by any member
// (live after an admin approves it).
const recruitmentSchema = new Schema(
  {
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
    title: { type: String, required: true, trim: true, maxlength: 120 },
    organization: { type: String, required: true, trim: true, maxlength: 100 },
    type: { type: String, enum: ['recruitment', 'interview'], default: 'recruitment', index: true },
    summary: { type: String, trim: true, maxlength: 300, default: '' },
    description: { type: String, maxlength: 8000, default: '' },
    eligibility: { type: String, maxlength: 1500, default: '' },
    roles: [{
      _id: false,
      title: { type: String, trim: true, maxlength: 80 },
      description: { type: String, trim: true, maxlength: 400, default: '' },
      openings: { type: Number, min: 0, max: 500 },
    }],
    // How it will be conducted, step by step.
    process: [{
      _id: false,
      title: { type: String, trim: true, maxlength: 80 },
      detail: { type: String, trim: true, maxlength: 400, default: '' },
      date: Date,
    }],
    mode: { type: String, enum: ['Online', 'In-person', 'Hybrid'], default: 'In-person' },
    venue: { type: String, trim: true, maxlength: 200, default: '' },
    platform: { type: String, trim: true, maxlength: 120, default: '' }, // e.g. Google Meet
    applyBy: { type: Date, required: true },
    // How people register: one click on CodeSphere, a Google Form, or both.
    oneClick: { type: Boolean, default: true },
    formUrl: { type: String, trim: true, default: '' },
    banner: {
      url: { type: String, default: '' },
      fileId: { type: String, default: '' },
    },
    contactName: { type: String, trim: true, maxlength: 80, default: '' },
    contactEmail: { type: String, trim: true, maxlength: 200, default: '' },

    status: { type: String, enum: ['draft', 'published', 'closed'], default: 'draft', index: true },
    origin: { type: String, enum: ['club', 'community'], default: 'community', index: true },
    reviewStatus: { type: String, enum: ['none', 'pending', 'approved', 'rejected'], default: 'none', index: true },
    reviewNote: { type: String, trim: true, maxlength: 1000, default: '' },
    reviewedBy: { type: ObjectId },
    reviewedAt: Date,
    createdBy: { type: ObjectId, required: true, index: true },
  },
  { timestamps: true },
);

const applicationSchema = new Schema(
  {
    recruitment: { type: ObjectId, ref: 'Recruitment', required: true, index: true },
    user: { type: ObjectId, ref: 'User', required: true, index: true },
    role: { type: String, trim: true, maxlength: 80, default: '' },
    note: { type: String, trim: true, maxlength: 600, default: '' },
    status: { type: String, enum: ['applied', 'shortlisted', 'selected', 'rejected', 'withdrawn'], default: 'applied' },
  },
  { timestamps: true },
);
applicationSchema.index({ recruitment: 1, user: 1 }, { unique: true });

module.exports = {
  Recruitment: mongoose.model('Recruitment', recruitmentSchema),
  RecruitmentApplication: mongoose.model('RecruitmentApplication', applicationSchema),
};

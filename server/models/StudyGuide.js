const mongoose = require('mongoose');

// A Study Guide page (shown under Learn → Materials). The body is plain text
// with the same safe formatting as the forum (code blocks, bold, links).
const resourceSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true, maxlength: 120 },
    url: { type: String, required: true, trim: true },
    kind: { type: String, enum: ['docs', 'video', 'article', 'practice', 'course'], default: 'docs' },
  },
  { _id: false },
);

const studyGuideSchema = new mongoose.Schema(
  {
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
    title: { type: String, required: true, trim: true, maxlength: 120 },
    // Matches Reverse Coding topics so guides and challenges link up.
    topic: { type: String, required: true, trim: true, maxlength: 40, index: true },
    level: { type: String, enum: ['Beginner', 'Intermediate', 'Advanced'], required: true },
    summary: { type: String, required: true, maxlength: 300 },
    body: { type: String, required: true, maxlength: 20000 },
    resources: { type: [resourceSchema], default: [] },
    tags: { type: [String], default: [] },
    estMinutes: { type: Number, default: 10 },
    order: { type: Number, default: 100 },
    status: { type: String, enum: ['draft', 'published'], default: 'draft', index: true },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true },
);
studyGuideSchema.index({ title: 'text', summary: 'text', body: 'text', tags: 'text' });

module.exports = mongoose.model('StudyGuide', studyGuideSchema);

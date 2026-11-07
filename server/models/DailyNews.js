const mongoose = require('mongoose');

const { Schema } = mongoose;

// Automatically collected tech stories (no editor needed). Kept for
// DAILY_NEWS_KEEP_DAYS and shown on the News page's "Today" feed.
const dailyNewsSchema = new Schema(
  {
    source: { type: String, required: true, index: true }, // hackernews, devto, gnews, newsdata, rss
    sourceName: { type: String, required: true },
    externalId: { type: String, default: '' },
    url: { type: String, required: true, unique: true },
    title: { type: String, required: true, maxlength: 200 },
    summary: { type: String, default: '', maxlength: 500 },
    image: { type: String, default: '' },
    author: { type: String, default: '', maxlength: 120 },
    category: { type: String, default: 'devtools', index: true },
    tags: [String],
    // Popularity on the source (HN points, dev.to reactions); 0 if unknown.
    score: { type: Number, default: 0 },
    comments: { type: Number, default: 0 },
    discussionUrl: { type: String, default: '' },
    publishedAt: { type: Date, required: true, index: true },
    fetchedAt: { type: Date, default: Date.now },
  },
  { timestamps: true },
);
dailyNewsSchema.index({ title: 'text', summary: 'text', tags: 'text' });

// One "Today in Tech" briefing per day (IST).
const dailyBriefSchema = new Schema(
  {
    day: { type: String, required: true, unique: true }, // YYYY-MM-DD (Asia/Kolkata)
    items: [{ type: Schema.Types.ObjectId, ref: 'DailyNews' }],
    notifiedAt: Date,
    emailedAt: Date,
    emailCount: { type: Number, default: 0 },
  },
  { timestamps: true },
);

const syncSchema = new Schema({
  _id: { type: String, default: 'daily-news' },
  lastRunAt: Date,
  results: [{ source: String, ok: Boolean, added: Number, error: String }],
});

module.exports = {
  DailyNews: mongoose.model('DailyNews', dailyNewsSchema),
  DailyBrief: mongoose.model('DailyBrief', dailyBriefSchema),
  DailyNewsSync: mongoose.model('DailyNewsSync', syncSchema),
};

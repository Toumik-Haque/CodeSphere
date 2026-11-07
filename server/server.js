const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const app = express();

const imagekit = require("./config/imagekit");

console.log("ImageKit client initialized:", !!imagekit);

app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:5173',
}));
app.use(express.json());

app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    message: 'CodeSphere API is running',
  });
});

const authRoutes = require('./routes/authRoutes');
const eventRoutes = require('./routes/eventRoutes');
const userRoutes = require('./routes/userRoutes');
const coreMemberRoutes = require('./routes/coreMemberRoutes');
const contactRoutes = require('./routes/contactRoutes');
const debugRoutes = require('./routes/debugRoutes');
// Challenge progress. Answer checking (/check) needs a Judge0 key; without
// one, students mark challenges done themselves.
const challengeRoutes = require('./routes/challengeRoutes');
const leaderboardRoutes = require('./routes/leaderboardRoutes');
const badgeRoutes = require('./routes/badgeRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const forumRoutes = require('./routes/forumRoutes');
const reverseRoutes = require('./routes/reverseRoutes');
const newsRoutes = require('./routes/newsRoutes');
const realtimeRoutes = require('./routes/realtimeRoutes');
const newsletterRoutes = require('./routes/newsletterRoutes');
const guideRoutes = require('./routes/guideRoutes');
const { startNewsScheduler } = require('./utils/newsIngest');

app.use('/api/auth', authRoutes);
app.use('/api/events', eventRoutes);
app.use('/api/users', userRoutes);
app.use('/api/core-members', coreMemberRoutes);
app.use('/api/contact', contactRoutes);
app.use('/api/debug', debugRoutes);
app.use('/api/challenges', challengeRoutes);
app.use('/api/leaderboard', leaderboardRoutes);
app.use('/api/badges', badgeRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/forum', forumRoutes);
app.use('/api/reverse', reverseRoutes);
app.use('/api/news', newsRoutes);
app.use('/api/realtime', realtimeRoutes);
app.use('/api/newsletter', newsletterRoutes);
app.use('/api/guides', guideRoutes);

const PORT = process.env.PORT || 5000;

async function startServer() {
  try {
    if (!process.env.MONGODB_URI) {
      throw new Error('MONGODB_URI is missing from .env');
    }

    await mongoose.connect(process.env.MONGODB_URI);
    console.log('MongoDB connected successfully');

    // Daily feed fetching + scheduled digest announcements (NEWS_SCHEDULER=off to disable).
    startNewsScheduler();

    app.listen(PORT, () => {
      console.log(`CodeSphere API running on port ${PORT}`);
    });
  } catch (error) {
    console.error('Server startup failed:', error.message);
    process.exit(1);
  }
}

startServer();
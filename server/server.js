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
const projectRoutes = require('./routes/projectRoutes');
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
const hackathonRoutes = require('./routes/hackathonRoutes');
const hostRoutes = require('./routes/hostRoutes');
const projectRoutes = require('./routes/projectRoutes');
const projectTeamRoutes = require('./routes/projectTeamRoutes');
const githubRoutes = require('./routes/githubRoutes');
const { startProjectSync } = require('./utils/projectSync');
const { startHackathonSync } = require('./utils/hackathonSync');
const { startNewsScheduler } = require('./utils/newsIngest');
const { startDailyNews } = require('./utils/dailyNews');

app.use('/api/auth', authRoutes);
app.use('/api/events', eventRoutes);
app.use('/api/users', userRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/team-members', coreMemberRoutes);
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
app.use('/api/hackathons', hackathonRoutes);
app.use('/api/host', hostRoutes);
app.use('/api/projects', projectTeamRoutes); // before projectRoutes (it has a /:slug catch-all)
app.use('/api/projects', projectRoutes);
app.use('/api/github', githubRoutes);

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
    // Daily news from Hacker News, DEV, RSS (+ GNews/NewsData if keys are set). DAILY_NEWS=off to disable.
    startDailyNews();
    // Live hackathons from Devpost, Devfolio, Unstop, Hack2Skill, HackerEarth (HACKATHON_SYNC=off to disable).
    startHackathonSync();
    // Daily refresh of published projects' GitHub details (PROJECT_SYNC=off to disable).
    startProjectSync();

    app.listen(PORT, () => {
      console.log(`CodeSphere API running on port ${PORT}`);
    });
  } catch (error) {
    console.error('Server startup failed:', error.message);
    process.exit(1);
  }
}

startServer();
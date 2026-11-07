// One-time (safe to re-run) catch-up: award every student the badges they
// already qualify for. Usage (from server/): node scripts/syncBadges.js
require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');
const { syncBadges } = require('../utils/badges');

(async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    const students = await User.find({ role: 'user' }).select('_id name').lean();
    let awarded = 0;

    for (const student of students) {
      const { newBadges } = await syncBadges(student._id);
      if (newBadges.length) {
        awarded += newBadges.length;
        console.log(`${student.name}: ${newBadges.map((b) => `${b.emoji} ${b.name}`).join(', ')}`);
      }
    }

    console.log(`Done. Checked ${students.length} students, awarded ${awarded} badges.`);
  } catch (error) {
    console.error('Badge sync failed:', error.message);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
  }
})();

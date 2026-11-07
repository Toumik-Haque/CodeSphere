
require('dotenv').config();

const mongoose = require('mongoose');
const User = require('../models/User');
const { generateUniqueUsername } = require('../utils/username');

async function backfillUsernames() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);

    console.log('Connected to MongoDB.');

    const users = await User.find({
      role: 'user',
      $or: [
        { username: { $exists: false } },
        { username: null },
        { username: '' },
      ],
    }).select('_id name username');

    console.log(`Found ${users.length} users without usernames.`);

    let updated = 0;

    for (const user of users) {
      const username = await generateUniqueUsername(user.name);

      await User.updateOne(
        {
          _id: user._id,
          $or: [
            { username: { $exists: false } },
            { username: null },
            { username: '' },
          ],
        },
        {
          $set: { username },
        }
      );

      console.log(`${user.name} → ${username}`);
      updated++;
    }

    console.log('\nUsername migration completed.');
    console.log(`Updated: ${updated}`);

  } catch (error) {
    console.error('Username migration failed:', error);
    process.exitCode = 1;

  } finally {
    await mongoose.disconnect();
  }
}

backfillUsernames();

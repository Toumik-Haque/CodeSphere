require('dotenv').config();

const mongoose = require('mongoose');

// Move every admin account out of the `users` collection into its own
// `admins` collection (same database, same document shape and _id).
async function moveAdmins() {
  if (!process.env.MONGODB_URI) {
    throw new Error('MONGODB_URI is missing from .env');
  }

  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected to MongoDB.');

  const db = mongoose.connection.db;
  const users = db.collection('users');
  const admins = db.collection('admins');

  const adminUsers = await users.find({ role: 'admin' }).toArray();

  if (adminUsers.length === 0) {
    console.log('No admin accounts found in users. Nothing to move.');
  }

  for (const admin of adminUsers) {
    const existing = await admins.findOne({ _id: admin._id });

    if (existing) {
      console.log(`Admin ${admin.email} already exists in admins; removing from users.`);
    } else {
      await admins.insertOne(admin);
      console.log(`Moved admin ${admin.email} to admins.`);
    }

    await users.deleteOne({ _id: admin._id });
  }

  await admins.createIndex({ email: 1 }, { unique: true });
  await admins.createIndex({ username: 1 }, { unique: true, sparse: true });

  const remaining = await users.countDocuments({ role: 'admin' });
  console.log(`Admin move complete. Admins left in users: ${remaining}.`);
}

moveAdmins()
  .catch((error) => {
    console.error('Admin migration failed:', error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }
  });

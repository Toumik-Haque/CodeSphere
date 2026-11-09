const User = require('../models/User');
const Admin = require('../models/Admin');

// Admins are stored in the `admins` collection, students in `users`.
async function findAccountById(id) {
  if (!id) return null;
  return (await Admin.findById(id)) || User.findById(id);
}

async function findAccountByEmail(email, { withPassword = false } = {}) {
  let adminQuery = Admin.findOne({ email });
  if (withPassword) adminQuery = adminQuery.select('+password');
  const admin = await adminQuery;
  if (admin) return admin;

  let userQuery = User.findOne({ email });
  if (withPassword) userQuery = userQuery.select('+password');
  return userQuery;
}

async function adminIds() {
  const admins = await Admin.find({}).select('_id').lean();
  return admins.map((admin) => admin._id);
}

module.exports = { findAccountById, findAccountByEmail, adminIds };

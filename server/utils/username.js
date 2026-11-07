
const User = require('../models/User');

const RESERVED_USERNAMES = [
  'admin',
  'login',
  'register',
  'dashboard',
  'events',
  'team',
  'contact',
  'settings',
  'profile',
  'api',
  'about',
  'help',
  'forgot-password',
  'reset-password',
];

function createUsernameBase(name) {
  let base = String(name || '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 30)
    .replace(/-+$/g, '');

  // Provide a safe fallback for names without usable characters.
  if (base.length < 3) {
    base = base ? `member-${base}` : 'member';
  }

  if (RESERVED_USERNAMES.includes(base)) {
    base = `${base}-user`;
  }

  return base.slice(0, 30).replace(/-+$/g, '');
}

async function generateUniqueUsername(name, excludeUserId = null) {
  const base = createUsernameBase(name);

  let username = base;
  let counter = 1;

  while (true) {
    const query = { username };

    if (excludeUserId) {
      query._id = { $ne: excludeUserId };
    }

    const existingUser = await User.findOne(query).select('_id');

    if (!existingUser) {
      return username;
    }

    const suffix = `-${counter}`;
    username = `${base.slice(0, 30 - suffix.length)}${suffix}`;

    counter += 1;
  }
}

module.exports = {
  generateUniqueUsername,
};

require('dotenv').config();

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const readline = require('node:readline/promises');

async function main() {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  try {
    const email = (await rl.question('Admin email: '))
      .trim()
      .toLowerCase();

    const name = (await rl.question('Admin name: ')).trim();
    const password = await rl.question('Admin password (hidden input is not enabled): ');

    if (!name || !email.includes('@') || password.length < 8 || password.length > 12) {
      throw new Error('Enter a name, valid email, and password of 8–12 characters.');
    }

    await mongoose.connect(process.env.MONGODB_URI);

    const existingUser = await User.findOne({ email });

    if (existingUser) {
      throw new Error(
        'That email already exists. This script will not promote an existing account.'
      );
    }

    const hashedPassword = await bcrypt.hash(password, 8);

    await User.create({
      name,
      email,
      password: hashedPassword,
      role: 'admin',
    });

    console.log('Admin account created successfully.');
  } finally {
    rl.close();
    await mongoose.disconnect().catch(() => {});
  }
}

main().catch((error) => {
  console.error('Admin setup failed:', error.message);
  process.exitCode = 1;
});
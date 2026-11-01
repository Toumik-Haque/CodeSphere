const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');

const User = require('../models/User');
const EmailOtp = require('../models/EmailOtp');
const PasswordResetOtp = require('../models/PasswordResetOtp');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

const DEFAULT_COLLEGE =
  'ALIPURDUAR GOVERNMENT ENGINEERING AND MANAGEMENT COLLEGE';

const STUDY_YEARS = [
  '1st Year',
  '2nd Year',
  '3rd Year',
  '4th Year',
  '5th Year',
];

const OTP_EXPIRY_MINUTES = 5;
const OTP_RESEND_SECONDS = 60;
const MAX_OTP_ATTEMPTS = 5;

function createToken(user) {
  return jwt.sign(
    { id: user._id.toString() },
    process.env.JWT_SECRET,
    { expiresIn: '1d' }
  );
}

function normalizeEmail(email) {
  return email.trim().toLowerCase();
}

function hashOtp(email, otp) {
  return crypto
    .createHmac('sha256', process.env.OTP_HASH_SECRET)
    .update(`${email}:${otp}`)
    .digest('hex');
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

async function sendOtpEmail(email, otp) {
  const response = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: {
      'api-key': process.env.BREVO_API_KEY,
      'Content-Type': 'application/json',
      accept: 'application/json',
    },
    body: JSON.stringify({
      sender: {
        name: process.env.BREVO_SENDER_NAME || 'CodeSphere',
        email: process.env.BREVO_SENDER_EMAIL,
      },
      to: [{ email }],
      subject: 'Your CodeSphere email verification code',
      textContent:
        `Your CodeSphere verification code is ${otp}. ` +
        `It expires in ${OTP_EXPIRY_MINUTES} minutes. ` +
        'If you did not request this code, you can ignore this email.',
      htmlContent: `
        <div style="font-family:Arial,sans-serif;max-width:520px;margin:auto;padding:28px;color:#152238">
          <h2 style="margin-bottom:8px">Verify your email</h2>
          <p>Use this code to verify your email address for CodeSphere:</p>
          <div style="font-size:32px;font-weight:700;letter-spacing:8px;padding:18px;background:#F6F3EE;text-align:center;border-radius:10px">
            ${otp}
          </div>
          <p>This code expires in ${OTP_EXPIRY_MINUTES} minutes.</p>
          <p style="color:#5B6678;font-size:13px">If you did not request this code, you can ignore this email.</p>
        </div>
      `,
    }),
  });

  if (!response.ok) {
    const details = await response.text();
    console.error('Brevo email error:', details);
    throw new Error('Unable to send verification email.');
  }
}

async function sendPasswordResetEmail(email, otp) {
  const response = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: {
      'api-key': process.env.BREVO_API_KEY,
      'Content-Type': 'application/json',
      accept: 'application/json',
    },
    body: JSON.stringify({
      sender: {
        name: process.env.BREVO_SENDER_NAME || 'CodeSphere',
        email: process.env.BREVO_SENDER_EMAIL,
      },
      to: [{ email }],
      subject: 'Your CodeSphere password reset code',
      textContent:
        `Your CodeSphere password reset code is ${otp}. ` +
        `It expires in ${OTP_EXPIRY_MINUTES} minutes. ` +
        'If you did not request this, you can ignore this email.',
      htmlContent: `
        <div style="font-family:Arial,sans-serif;max-width:520px;margin:auto;padding:28px;color:#10243A">
          <h2>Reset your CodeSphere password</h2>
          <p>Use this code to reset your password:</p>
          <div style="font-size:32px;font-weight:700;letter-spacing:8px;padding:18px;background:#EAF5FC;text-align:center;border-radius:10px">
            ${otp}
          </div>
          <p>This code expires in ${OTP_EXPIRY_MINUTES} minutes.</p>
          <p style="color:#536579;font-size:13px">
            If you did not request this code, you can ignore this email.
          </p>
        </div>
      `,
    }),
  });

  if (!response.ok) {
    const details = await response.text();
    console.error('Brevo password reset email error:', details);
    throw new Error('Unable to send password reset email.');
  }
}

// Send or resend an OTP
router.post('/send-otp', async (req, res) => {
  try {
    const email =
      typeof req.body.email === 'string'
        ? normalizeEmail(req.body.email)
        : '';

    if (!isValidEmail(email)) {
      return res.status(400).json({ message: 'Enter a valid email address.' });
    }

    const existingUser = await User.findOne({ email });

    if (existingUser) {
      return res.status(409).json({
        message: 'An account with this email already exists.',
      });
    }

    let record = await EmailOtp.findOne({ email });
    const now = new Date();

    if (record && record.resendAfter > now) {
      const waitSeconds = Math.ceil(
        (record.resendAfter.getTime() - now.getTime()) / 1000
      );

      return res.status(429).json({
        message: `Please wait ${waitSeconds} seconds before requesting another code.`,
        retryAfter: waitSeconds,
      });
    }

    const otp = crypto.randomInt(100000, 1000000).toString();

    if (!record) {
      record = new EmailOtp({ email });
    }

    record.otpHash = hashOtp(email, otp);
    record.expiresAt = new Date(now.getTime() + OTP_EXPIRY_MINUTES * 60 * 1000);
    record.resendAfter = new Date(now.getTime() + OTP_RESEND_SECONDS * 1000);
    record.attempts = 0;
    record.verifiedAt = null;

    await record.save();
    await sendOtpEmail(email, otp);

    return res.json({
      message: 'Verification code sent to your email.',
      expiresIn: OTP_EXPIRY_MINUTES * 60,
      resendAfter: OTP_RESEND_SECONDS,
    });
  } catch (error) {
    console.error('Send OTP error:', error.message);
    return res.status(500).json({
      message: 'Unable to send the verification code right now.',
    });
  }
});

// Verify the OTP
router.post('/verify-otp', async (req, res) => {
  try {
    const email =
      typeof req.body.email === 'string'
        ? normalizeEmail(req.body.email)
        : '';

    const otp =
      typeof req.body.otp === 'string'
        ? req.body.otp.trim()
        : '';

    if (!isValidEmail(email) || !/^\d{6}$/.test(otp)) {
      return res.status(400).json({
        message: 'Enter a valid email address and six-digit code.',
      });
    }

    const record = await EmailOtp.findOne({ email });

    if (!record || record.expiresAt <= new Date()) {
      return res.status(400).json({
        message: 'The code has expired. Please request a new one.',
      });
    }

    if (record.verifiedAt) {
      return res.json({ message: 'Email already verified.' });
    }

    if (record.attempts >= MAX_OTP_ATTEMPTS) {
      await EmailOtp.deleteOne({ _id: record._id });

      return res.status(429).json({
        message: 'Too many incorrect attempts. Please request a new code.',
      });
    }

    const submittedHash = hashOtp(email, otp);

    const hashesMatch =
      submittedHash.length === record.otpHash.length &&
      crypto.timingSafeEqual(
        Buffer.from(submittedHash, 'hex'),
        Buffer.from(record.otpHash, 'hex')
      );

    if (!hashesMatch) {
      record.attempts += 1;
      await record.save();

      return res.status(400).json({
        message: 'Incorrect verification code.',
        attemptsRemaining: MAX_OTP_ATTEMPTS - record.attempts,
      });
    }

    record.verifiedAt = new Date();
    await record.save();

    return res.json({ message: 'Email verified successfully.' });
  } catch (error) {
    console.error('Verify OTP error:', error.message);
    return res.status(500).json({
      message: 'Unable to verify the email right now.',
    });
  }
});

// Register a regular user — requires verified email
router.post('/register', async (req, res) => {
  try {
    const { name, email, password, collegeName, yearOfStudy } = req.body;

    if (
      typeof name !== 'string' ||
      typeof email !== 'string' ||
      typeof password !== 'string' ||
      typeof collegeName !== 'string' ||
      typeof yearOfStudy !== 'string' ||
      !name.trim() ||
      !collegeName.trim() ||
      password.length < 8 ||
      password.length > 128 ||
      !STUDY_YEARS.includes(yearOfStudy)
    ) {
      return res.status(400).json({
        message: 'Please provide valid registration details. Password must be 8–128 characters.',
      });
    }

    const normalizedEmail = normalizeEmail(email);

    if (!isValidEmail(normalizedEmail)) {
      return res.status(400).json({ message: 'Enter a valid email address.' });
    }

    const verification = await EmailOtp.findOne({
      email: normalizedEmail,
      verifiedAt: { $ne: null },
      expiresAt: { $gt: new Date() },
    });

    if (!verification) {
      return res.status(403).json({
        message: 'Please verify your email before creating your account.',
      });
    }

    const existingUser = await User.findOne({ email: normalizedEmail });

    if (existingUser) {
      return res.status(409).json({
        message: 'An account with this email already exists.',
      });
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    const user = await User.create({
      name: name.trim(),
      collegeName: collegeName.trim(),
      yearOfStudy,
      email: normalizedEmail,
      password: hashedPassword,
      role: 'user',
    });

    // Consume the verification record after successful registration.
    await EmailOtp.deleteOne({ _id: verification._id });

    const token = createToken(user);

    return res.status(201).json({
      message: 'Registration successful.',
      token,
      user: {
        id: user._id,
        name: user.name,
        collegeName: user.collegeName,
        yearOfStudy: user.yearOfStudy,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        message: 'An account with this email already exists.',
      });
    }

    console.error('Registration error:', error.message);
    return res.status(500).json({ message: 'Unable to register right now.' });
  }
});

// FORGOT PASSWORD — SEND RESET OTP
router.post('/forgot-password', async (req, res) => {
  try {
    const email =
      typeof req.body.email === 'string'
        ? normalizeEmail(req.body.email)
        : '';

    if (!isValidEmail(email)) {
      return res.status(400).json({
        message: 'Enter a valid email address.',
      });
    }

    const user = await User.findOne({ email });

    // Show an error if the account does not exist.
    if (!user) {
      return res.status(404).json({
        message: 'No account found with this email address.',
      });
    }

    const now = new Date();

    let record = await PasswordResetOtp.findOne({ email });

    // Check resend cooldown.
    if (record && record.resendAfter > now) {
      const waitSeconds = Math.ceil(
        (record.resendAfter.getTime() - now.getTime()) / 1000
      );

      return res.status(429).json({
        message: `Please wait ${waitSeconds} seconds before requesting another code.`,
        retryAfter: waitSeconds,
      });
    }

    const otp = crypto.randomInt(100000, 1000000).toString();

    if (!record) {
      record = new PasswordResetOtp({ email });
    }

    record.otpHash = hashOtp(email, otp);
    record.expiresAt = new Date(
      now.getTime() + OTP_EXPIRY_MINUTES * 60 * 1000
    );
    record.resendAfter = new Date(
      now.getTime() + OTP_RESEND_SECONDS * 1000
    );
    record.attempts = 0;
    record.verifiedAt = null;

    await record.save();
    await sendPasswordResetEmail(email, otp);

    return res.status(200).json({
      message: 'OTP sent successfully. Please check your email.',
      expiresIn: OTP_EXPIRY_MINUTES * 60,
      resendAfter: OTP_RESEND_SECONDS,
    });
  } catch (error) {
    console.error('Forgot password error:', error.message);

    return res.status(500).json({
      message: 'Unable to process your request right now.',
    });
  }
});

// FORGOT PASSWORD — VERIFY RESET OTP
router.post('/verify-reset-otp', async (req, res) => {
  try {
    const email =
      typeof req.body.email === 'string'
        ? normalizeEmail(req.body.email)
        : '';

    const otp =
      typeof req.body.otp === 'string'
        ? req.body.otp.trim()
        : '';

    if (!isValidEmail(email) || !/^\d{6}$/.test(otp)) {
      return res.status(400).json({
        message: 'Enter a valid email address and six-digit code.',
      });
    }

    const record = await PasswordResetOtp.findOne({ email });

    if (!record || record.expiresAt <= new Date()) {
      return res.status(400).json({
        message: 'The code has expired. Please request a new one.',
      });
    }

    if (record.verifiedAt) {
      return res.json({
        message: 'Code verified successfully.',
      });
    }

    if (record.attempts >= MAX_OTP_ATTEMPTS) {
      await PasswordResetOtp.deleteOne({ _id: record._id });

      return res.status(429).json({
        message: 'Too many incorrect attempts. Please request a new code.',
      });
    }

    const submittedHash = hashOtp(email, otp);

    const hashesMatch =
      submittedHash.length === record.otpHash.length &&
      crypto.timingSafeEqual(
        Buffer.from(submittedHash, 'hex'),
        Buffer.from(record.otpHash, 'hex')
      );

    if (!hashesMatch) {
      record.attempts += 1;
      await record.save();

      return res.status(400).json({
        message: 'Incorrect verification code.',
        attemptsRemaining: MAX_OTP_ATTEMPTS - record.attempts,
      });
    }

    record.verifiedAt = new Date();
    await record.save();

    return res.json({
      message: 'Code verified successfully.',
    });
  } catch (error) {
    console.error('Reset OTP verification error:', error.message);

    return res.status(500).json({
      message: 'Unable to verify the code right now.',
    });
  }
});

// FORGOT PASSWORD — SAVE NEW PASSWORD
router.post('/reset-password', async (req, res) => {
  try {
    const email =
      typeof req.body.email === 'string'
        ? normalizeEmail(req.body.email)
        : '';

    const password = req.body.password;

    if (
      !isValidEmail(email) ||
      typeof password !== 'string' ||
      password.length < 8 ||
      password.length > 128
    ) {
      return res.status(400).json({
        message: 'Enter a valid email and a password of 8–128 characters.',
      });
    }

    const record = await PasswordResetOtp.findOne({
      email,
      verifiedAt: { $ne: null },
      expiresAt: { $gt: new Date() },
    });

    if (!record) {
      return res.status(403).json({
        message: 'Please verify a valid reset code before changing your password.',
      });
    }

    const user = await User.findOne({ email }).select('+password');

    if (!user) {
      await PasswordResetOtp.deleteOne({ _id: record._id });

      return res.status(400).json({
        message: 'Unable to reset this password. Please request a new code.',
      });
    }

    user.password = await bcrypt.hash(password, 12);
    await user.save();

    // Consume the verified OTP so it cannot be reused.
    await PasswordResetOtp.deleteOne({ _id: record._id });

    return res.json({
      message: 'Password reset successful. Please sign in with your new password.',
    });
  } catch (error) {
    console.error('Password reset error:', error.message);

    return res.status(500).json({
      message: 'Unable to reset your password right now.',
    });
  }
});


// Shared login for users and admins
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (
      typeof email !== 'string' ||
      typeof password !== 'string' ||
      !email.trim() ||
      !password
    ) {
      return res.status(400).json({
        message: 'Email and password are required.',
      });
    }

    const user = await User.findOne({
      email: normalizeEmail(email),
    }).select('+password');

    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({
        message: 'Invalid email or password.',
      });
    }

    const token = createToken(user);

    return res.json({
      message: 'Login successful.',
      token,
      user: {
        id: user._id,
        name: user.name,
        collegeName: user.collegeName,
        yearOfStudy: user.yearOfStudy,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    console.error('Login error:', error.message);
    return res.status(500).json({ message: 'Unable to log in right now.' });
  }
});

// Get the currently authenticated user's profile
router.get('/me', protect, async (req, res) => {
  res.json({
    user: {
      id: req.user._id,
      name: req.user.name,
      collegeName: req.user.collegeName,
      yearOfStudy: req.user.yearOfStudy,
      email: req.user.email,
      role: req.user.role,
      createdAt: req.user.createdAt,
    },
  });
});

module.exports = router;
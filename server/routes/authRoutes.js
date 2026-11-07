
const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');

const User = require('../models/User');
const EmailOtp = require('../models/EmailOtp');
const PasswordResetOtp = require('../models/PasswordResetOtp');
const { protect } = require('../middleware/authMiddleware');
const { generateUniqueUsername } = require('../utils/username');

const router = express.Router();

const DEFAULT_COLLEGE =
  'ALIPURDUAR GOVERNMENT ENGINEERING AND MANAGEMENT COLLEGE';

const STUDY_YEARS = [
  '1st Year',
  '2nd Year',
  '3rd Year',
  '4th Year',
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


// ============================================
// SHARED MODERN CODESPHERE OTP EMAIL TEMPLATE
// ============================================

function buildOtpEmailHtml({
  title,
  subtitle,
  otp,
  description,
  securityMessage,
}) {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${title}</title>
</head>

<body style="
  margin: 0;
  padding: 0;
  background-color: #F3F7FB;
  font-family: Arial, Helvetica, sans-serif;
  color: #153653;
">

  <table role="presentation" width="100%" cellspacing="0" cellpadding="0"
    border="0" style="background-color: #F3F7FB; padding: 35px 12px;">

    <tr>
      <td align="center">

        <table role="presentation" width="100%" cellspacing="0" cellpadding="0"
          border="0" style="
            max-width: 560px;
            background-color: #FFFFFF;
            border-radius: 18px;
            overflow: hidden;
            border: 1px solid #E5EDF4;
          ">

          <!-- Brand Header -->
          <tr>
            <td align="center" style="
              padding: 30px 25px;
              background-color: #153653;
            ">

              <div style="
                color: #FFFFFF;
                font-size: 27px;
                font-weight: 800;
                letter-spacing: -1px;
              ">
                Code<span style="color: #FF8568;">Sphere</span>
              </div>

              <div style="
                margin-top: 8px;
                color: #D5E6F2;
                font-size: 10px;
                font-weight: 600;
                letter-spacing: 3px;
              ">
                LEARN · BUILD · CONNECT
              </div>

            </td>
          </tr>

          <!-- Main Content -->
          <tr>
            <td style="padding: 38px 32px 20px;">

              <div style="
                display: inline-block;
                padding: 7px 13px;
                border-radius: 30px;
                background-color: #FFF0EB;
                color: #D94324;
                font-size: 10px;
                font-weight: 800;
                letter-spacing: 1.4px;
              ">
                ${subtitle}
              </div>

              <h1 style="
                margin: 20px 0 12px;
                color: #153653;
                font-size: 26px;
                line-height: 1.3;
                letter-spacing: -0.7px;
              ">
                ${title}
              </h1>

              <p style="
                margin: 0;
                color: #52677A;
                font-size: 15px;
                line-height: 1.8;
              ">
                ${description}
              </p>

              <!-- OTP Box -->
              <table role="presentation" width="100%" cellspacing="0"
                cellpadding="0" border="0" style="margin: 28px 0;">

                <tr>
                  <td align="center" style="
                    padding: 25px 15px;
                    background-color: #FFF5F1;
                    border: 1px solid #F9D7CC;
                    border-radius: 14px;
                  ">

                    <div style="
                      margin-bottom: 12px;
                      color: #A94A35;
                      font-size: 10px;
                      font-weight: 800;
                      letter-spacing: 2px;
                    ">
                      YOUR ONE-TIME PASSWORD
                    </div>

                    <div style="
                      color: #153653;
                      font-size: 34px;
                      font-weight: 800;
                      letter-spacing: 9px;
                      line-height: 1.4;
                    ">
                      ${otp}
                    </div>

                    <div style="
                      margin-top: 12px;
                      color: #7B8794;
                      font-size: 11px;
                    ">
                      Enter this code in CodeSphere
                    </div>

                  </td>
                </tr>
              </table>

              <!-- Expiry Notice -->
              <table role="presentation" width="100%" cellspacing="0"
                cellpadding="0" border="0">

                <tr>
                  <td width="34" valign="top" style="padding-top: 2px;">

                    <div style="
                      width: 25px;
                      height: 25px;
                      border-radius: 50%;
                      background-color: #FFF0EB;
                      color: #D94324;
                      text-align: center;
                      line-height: 25px;
                      font-size: 14px;
                      font-weight: bold;
                    ">
                      !
                    </div>

                  </td>

                  <td style="
                    color: #52677A;
                    font-size: 13px;
                    line-height: 1.7;
                  ">
                    This code expires in
                    <strong style="color: #D94324;">
                      ${OTP_EXPIRY_MINUTES} minutes
                    </strong>.
                    Please use it before it expires.
                  </td>
                </tr>

              </table>

              <!-- Security Message -->
              <div style="
                margin-top: 25px;
                padding-top: 20px;
                border-top: 1px solid #EAF0F5;
                color: #7B8794;
                font-size: 12px;
                line-height: 1.8;
              ">
                ${securityMessage}
              </div>

            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td align="center" style="
              padding: 22px 25px;
              background-color: #F8FAFC;
              border-top: 1px solid #EAF0F5;
            ">

              <div style="
                color: #153653;
                font-size: 13px;
                font-weight: 800;
              ">
                Code<span style="color: #F05A36;">Sphere</span>
              </div>

              <p style="
                margin: 7px 0 0;
                color: #8996A5;
                font-size: 11px;
                line-height: 1.6;
              ">
                Learn. Build. Connect.<br />
                This is an automated email. Please do not reply.
              </p>

            </td>
          </tr>

        </table>

      </td>
    </tr>

  </table>

</body>
</html>
  `;
}


// ============================================
// SEND REGISTRATION OTP EMAIL
// ============================================

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
        `Your CodeSphere email verification code is ${otp}. ` +
        `It expires in ${OTP_EXPIRY_MINUTES} minutes. ` +
        'If you did not request this code, you can ignore this email.',

      htmlContent: buildOtpEmailHtml({
        title: 'Verify your email address.',
        subtitle: 'EMAIL VERIFICATION',
        otp,

        description:
          'Welcome to CodeSphere! Use the one-time password below to verify your email address and complete your registration.',

        securityMessage:
          'If you did not try to create a CodeSphere account, you can safely ignore this email. Never share this code with anyone.',
      }),
    }),
  });

  if (!response.ok) {
    const details = await response.text();

    console.error('Brevo email error:', details);

    throw new Error('Unable to send verification email.');
  }
}


// ============================================
// SEND PASSWORD RESET OTP EMAIL
// ============================================

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
        'If you did not request a password reset, you can ignore this email.',

      htmlContent: buildOtpEmailHtml({
        title: 'Reset your password.',
        subtitle: 'PASSWORD RESET',
        otp,

        description:
          'We received a request to reset your CodeSphere account password. Enter the one-time password below to continue.',

        securityMessage:
          'If you did not request a password reset, do not share this code with anyone. You can safely ignore this email. Your existing password will remain unchanged unless you complete the reset process.',
      }),
    }),
  });

  if (!response.ok) {
    const details = await response.text();

    console.error('Brevo password reset email error:', details);

    throw new Error('Unable to send password reset email.');
  }
}


// ============================================
// SEND OR RESEND REGISTRATION OTP
// ============================================

router.post('/send-otp', async (req, res) => {
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
    record.expiresAt = new Date(
      now.getTime() + OTP_EXPIRY_MINUTES * 60 * 1000
    );
    record.resendAfter = new Date(
      now.getTime() + OTP_RESEND_SECONDS * 1000
    );
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


// ============================================
// VERIFY REGISTRATION OTP
// ============================================

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
      return res.json({
        message: 'Email already verified.',
      });
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

    return res.json({
      message: 'Email verified successfully.',
    });

  } catch (error) {
    console.error('Verify OTP error:', error.message);

    return res.status(500).json({
      message: 'Unable to verify the email right now.',
    });
  }
});


// ============================================
// REGISTER REGULAR USER
// REQUIRES VERIFIED EMAIL
// ============================================

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
        message:
          'Please provide valid registration details. Password must be 8–128 characters.',
      });
    }

    const normalizedEmail = normalizeEmail(email);

    if (!isValidEmail(normalizedEmail)) {
      return res.status(400).json({
        message: 'Enter a valid email address.',
      });
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

    const existingUser = await User.findOne({
      email: normalizedEmail,
    });

    if (existingUser) {
      return res.status(409).json({
        message: 'An account with this email already exists.',
      });
    }


    const hashedPassword = await bcrypt.hash(password, 12);

    let user = null;
    let registrationError = null;

    // Retry if another registration claims the same username simultaneously.
    for (let attempt = 0; attempt < 5; attempt++) {
      const username = await generateUniqueUsername(name.trim());

      try {
        user = await User.create({
          name: name.trim(),
          username,
          collegeName: collegeName.trim(),
          yearOfStudy,
          email: normalizedEmail,
          password: hashedPassword,
          role: 'user',
        });

        break;
      } catch (error) {
        registrationError = error;

        // Retry only when the username unique index caused the conflict.
        const usernameConflict =
          error.code === 11000 &&
          (
            error.keyPattern?.username ||
            error.keyValue?.username
          );

        if (!usernameConflict) {
          throw error;
        }
      }
    }

    if (!user) {
      throw registrationError || new Error('Unable to generate a unique username.');
    }


    // Consume the verification record after successful registration.
    await EmailOtp.deleteOne({ _id: verification._id });

    const token = createToken(user);

    return res.status(201).json({
      message: 'Registration successful.',
      token,
      user: {
        id: user._id,
        name: user.name,
        username: user.username,
        collegeName: user.collegeName,
        yearOfStudy: user.yearOfStudy,
        email: user.email,
        role: user.role,
        staffRoles: user.staffRoles || [],
        avatarUrl: user.avatarUrl || '',
      },
    });

  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        message: 'An account with this email already exists.',
      });
    }

    console.error('Registration error:', error.message);

    return res.status(500).json({
      message: 'Unable to register right now.',
    });
  }
});


// ============================================
// FORGOT PASSWORD — SEND RESET OTP
// ============================================

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


// ============================================
// FORGOT PASSWORD — VERIFY RESET OTP
// ============================================

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


// ============================================
// FORGOT PASSWORD — SAVE NEW PASSWORD
// ============================================

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
        message:
          'Please verify a valid reset code before changing your password.',
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
      message:
        'Password reset successful. Please sign in with your new password.',
    });

  } catch (error) {
    console.error('Password reset error:', error.message);

    return res.status(500).json({
      message: 'Unable to reset your password right now.',
    });
  }
});


// ============================================
// SHARED LOGIN FOR USERS AND ADMINS
// ============================================

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
        staffRoles: user.staffRoles || [],
        avatarUrl: user.avatarUrl || '',
      },
    });

  } catch (error) {
    console.error('Login error:', error.message);

    return res.status(500).json({
      message: 'Unable to log in right now.',
    });
  }
});


// ============================================
// GET CURRENTLY AUTHENTICATED USER PROFILE
// ============================================

router.get('/me', protect, async (req, res) => {
  res.json({
    user: {
      id: req.user._id,
      name: req.user.name,
      collegeName: req.user.collegeName,
      yearOfStudy: req.user.yearOfStudy,
      email: req.user.email,
      role: req.user.role,
      staffRoles: req.user.staffRoles || [],
      avatarUrl: req.user.avatarUrl || '',
      bannerUrl: req.user.bannerUrl || '',
      createdAt: req.user.createdAt,
    },
  });
});


module.exports = router;

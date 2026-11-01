import React, { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import '../css/Register.css';

const DEFAULT_COLLEGE = 'ALIPURDUAR GOVERNMENT ENGINEERING AND MANAGEMENT COLLEGE';

const STUDY_YEARS = [
  '1st Year',
  '2nd Year',
  '3rd Year',
  '4th Year',
  '5th Year',
];

export default function Register() {
  const { user, sendOtp, verifyOtp, register } = useAuth();
  const navigate = useNavigate();

  const [step, setStep] = useState(1);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [name, setName] = useState('');
  const [collegeName, setCollegeName] = useState(DEFAULT_COLLEGE);
  const [yearOfStudy, setYearOfStudy] = useState('');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [loading, setLoading] = useState(false);

  if (user) {
    return (
      <Navigate
        to={user.role === 'admin' ? '/admin' : '/profile'}
        replace
      />
    );
  }

  async function handleSendOtp(event) {
    event.preventDefault();
    setError('');
    setNotice('');

    if (!name.trim() || !collegeName.trim() || !yearOfStudy) {
      setError('Please complete all your details.');
      return;
    }

    setLoading(true);

    try {
      const result = await sendOtp(email.trim());
      setStep(2);
      setNotice(result.message || 'Verification code sent to your email.');
    } catch (err) {
      setError(err.message || 'Unable to send verification code.');
    } finally {
      setLoading(false);
    }
  }

  async function handleVerifyOtp(event) {
    event.preventDefault();
    setError('');
    setNotice('');

    if (!/^\d{6}$/.test(otp)) {
      setError('Enter the six-digit verification code.');
      return;
    }

    setLoading(true);

    try {
      const result = await verifyOtp(email.trim(), otp.trim());
      setStep(3);
      setNotice(result.message || 'Email verified successfully.');
    } catch (err) {
      setError(err.message || 'Unable to verify your email.');
    } finally {
      setLoading(false);
    }
  }

  async function handleResendOtp() {
    setError('');
    setNotice('');
    setLoading(true);

    try {
      const result = await sendOtp(email.trim());
      setOtp('');
      setNotice(result.message || 'A new verification code has been sent.');
    } catch (err) {
      setError(err.message || 'Unable to resend verification code.');
    } finally {
      setLoading(false);
    }
  }

  async function handleRegister(event) {
    event.preventDefault();
    setError('');
    setNotice('');

    if (password.length < 8 || password.length > 128) {
      setError('Password must contain 8–128 characters.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);

    try {
      await register(
        name.trim(),
        email.trim(),
        password,
        collegeName.trim(),
        yearOfStudy
      );

      navigate('/profile', { replace: true });
    } catch (err) {
      setError(err.message || 'Unable to create your account.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="auth-page">
      <form
        className="auth-card"
        onSubmit={
          step === 1
            ? handleSendOtp
            : step === 2
              ? handleVerifyOtp
              : handleRegister
        }
      >
        <Link to="/" className="auth-brand">
          Code<span>Sphere</span>
        </Link>

        <p className="auth-eyebrow">JOIN THE COMMUNITY</p>
        <h1>Create your account</h1>

        <p className="auth-subtitle">
          {step === 1 && 'Enter your details to get started.'}
          {step === 2 && 'Verify your email address to continue.'}
          {step === 3 && 'Your email is verified. Set your password.'}
        </p>

        {/* Modern three-step progress indicator */}
        <div className="auth-steps">
          {[
            { number: 1, label: 'Details' },
            { number: 2, label: 'Verify Email' },
            { number: 3, label: 'Password' },
          ].map((item) => (
            <div
              className={`auth-step ${step === item.number
                ? 'active'
                : step > item.number
                  ? 'completed'
                  : ''
                }`}
              key={item.number}
            >
              <div className="auth-step-circle">
                {step > item.number ? '✓' : item.number}
              </div>
              <span>{item.label}</span>
            </div>
          ))}
        </div>

        {error && (
          <div className="auth-error" role="alert">
            {error}
          </div>
        )}

        {notice && (
          <div className="auth-success" role="status">
            {notice}
          </div>
        )}

        {/* STEP 1: Personal details */}
        {step === 1 && (
          <>
            <label htmlFor="register-name">Full name</label>
            <input
              id="register-name"
              type="text"
              autoComplete="name"
              maxLength={80}
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Your full name"
              required
            />

            <label htmlFor="register-college">College name</label>
            <input
              id="register-college"
              type="text"
              maxLength={150}
              value={collegeName}
              onChange={(event) => setCollegeName(event.target.value)}
              placeholder="Your college name"
              required
            />

            <label htmlFor="register-year">Year of study</label>
            <select
              id="register-year"
              value={yearOfStudy}
              onChange={(event) => setYearOfStudy(event.target.value)}
              required
            >
              <option value="">Select current study year</option>
              {STUDY_YEARS.map((year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </select>

            <label htmlFor="register-email">Email address</label>
            <input
              id="register-email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@example.com"
              required
            />

            <button
              className="auth-submit"
              type="submit"
              disabled={loading}
            >
              {loading ? 'Sending code...' : 'Send verification code'}
            </button>
          </>
        )}

        {/* STEP 2: Email verification */}
        {step === 2 && (
          <>
            <p className="auth-subtitle">
              Verification code sent to <strong>{email}</strong>
            </p>

            <label htmlFor="register-otp">
              Six-digit verification code
            </label>
            <input
              id="register-otp"
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              pattern="[0-9]{6}"
              value={otp}
              onChange={(event) =>
                setOtp(event.target.value.replace(/\D/g, '').slice(0, 6))
              }
              placeholder="Enter your OTP"
              required
            />

            <button
              className="auth-submit"
              type="submit"
              disabled={loading}
            >
              {loading ? 'Verifying...' : 'Verify email'}
            </button>

            <button
              className="auth-home"
              type="button"
              onClick={handleResendOtp}
              disabled={loading}
            >
              Resend verification code
            </button>

            <button
              className="auth-home"
              type="button"
              onClick={() => {
                setStep(1);
                setOtp('');
                setError('');
                setNotice('');
              }}
              disabled={loading}
            >
              Change email or details
            </button>
          </>
        )}

        {/* STEP 3: Create password */}
        {step === 3 && (
          <>
            <p className="auth-success">
              <i className="bi bi-check-circle" /> Email verified
            </p>

            <label htmlFor="register-password">Password</label>
            <div className="password-input-wrap">
              <input
                id="register-password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="new-password"
                minLength={8}
                maxLength={128}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="At least 8 characters"
                required
              />

              <button
                type="button"
                className="password-toggle"
                onClick={() => setShowPassword((prev) => !prev)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                aria-pressed={showPassword}
              >
                <i className={`bi ${showPassword ? 'bi-eye-slash' : 'bi-eye'}`} />
              </button>
            </div>

            <label htmlFor="confirm-password">Confirm password</label>
            <div className="password-input-wrap">
              <input
                id="confirm-password"
                type={showConfirmPassword ? 'text' : 'password'}
                autoComplete="new-password"
                minLength={8}
                maxLength={128}
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                placeholder="Enter your password again"
                required
              />

              <button
                type="button"
                className="password-toggle"
                onClick={() => setShowConfirmPassword((prev) => !prev)}
                aria-label={
                  showConfirmPassword
                    ? 'Hide confirm password'
                    : 'Show confirm password'
                }
                aria-pressed={showConfirmPassword}
              >
                <i
                  className={`bi ${showConfirmPassword ? 'bi-eye-slash' : 'bi-eye'
                    }`}
                />
              </button>
            </div>

            <button
              className="auth-submit"
              type="submit"
              disabled={loading}
            >
              {loading ? 'Creating account...' : 'Create Account'}
            </button>
          </>
        )}

        <p className="auth-switch">
          Already registered? <Link to="/login">Sign in</Link>
        </p>

        <Link to="/" className="auth-home">
          <i className="bi bi-arrow-left" /> Back to website
        </Link>
      </form>
    </main>
  );
}
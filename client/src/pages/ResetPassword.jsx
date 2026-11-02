import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import '../css/Register.css';

export default function ResetPassword() {
  const {
    forgotPassword,
    verifyResetOtp,
    resetPassword,
  } = useAuth();

  const navigate = useNavigate();

  const [step, setStep] = useState(1);
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [loading, setLoading] = useState(false);

  // STEP 1 — SEND RESET OTP
  async function handleSendOtp(event) {
    event.preventDefault();

    setError('');
    setNotice('');

    const normalizedEmail = email.trim().toLowerCase();

    if (!normalizedEmail) {
      setError('Please enter your email address.');
      return;
    }

    setLoading(true);

    try {
      const result = await forgotPassword(normalizedEmail);

      // Move to Step 2 only if the request succeeds.
      setEmail(normalizedEmail);
      setNotice(
        result.message || 'OTP sent successfully. Please check your email.'
      );
      setOtp('');
      setStep(2);
    } catch (err) {
      // A 404 (no account found) stays on Step 1.
      setError(err.message || 'Unable to send the reset code.');
    } finally {
      setLoading(false);
    }
  }

  // STEP 2 — VERIFY RESET OTP
  async function handleVerifyOtp(event) {
    event.preventDefault();

    setError('');
    setNotice('');

    if (!/^\d{6}$/.test(otp.trim())) {
      setError('Please enter a valid six-digit verification code.');
      return;
    }

    setLoading(true);

    try {
      const result = await verifyResetOtp(
        email.trim().toLowerCase(),
        otp.trim()
      );

      setNotice(result.message || 'Code verified successfully.');
      setStep(3);
    } catch (err) {
      setError(err.message || 'Unable to verify the code.');
    } finally {
      setLoading(false);
    }
  }

  // STEP 3 — RESET PASSWORD
  async function handleResetPassword(event) {
    event.preventDefault();

    setError('');
    setNotice('');

    if (password.length < 8 || password.length > 128) {
      setError('Password must be between 8 and 128 characters.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);

    try {
      const result = await resetPassword(
        email.trim().toLowerCase(),
        password
      );

      navigate('/login', {
        replace: true,
        state: {
          passwordReset: true,
          message:
            result.message ||
            'Password reset successful. Please sign in with your new password.',
        },
      });
    } catch (err) {
      setError(err.message || 'Unable to reset your password.');
    } finally {
      setLoading(false);
    }
  }

  function handleChangeEmail() {
    setStep(1);
    setOtp('');
    setError('');
    setNotice('');
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
              : handleResetPassword
        }
      >
        <Link to="/" className="auth-brand">
          Code<span>Sphere</span>
        </Link>

        <p className="auth-eyebrow">RESET PASSWORD</p>

        <h1>
          {step === 1 && 'Forgot password?'}
          {step === 2 && 'Verify your email'}
          {step === 3 && 'Create new password'}
        </h1>

        <p className="auth-subtitle">
          {step === 1 &&
            'Enter your registered email address. We will send you a password reset code.'}

          {step === 2 &&
            `Enter the six-digit code sent to ${email}.`}

          {step === 3 &&
            'Choose a strong new password for your CodeSphere account.'}
        </p>

        {/* PROGRESS INDICATOR */}
        <div className="auth-steps">
          {['Email', 'Verify', 'Reset'].map((label, index) => {
            const number = index + 1;

            return (
              <div
                className={`auth-step ${
                  step === number
                    ? 'active'
                    : step > number
                      ? 'completed'
                      : ''
                }`}
                key={label}
              >
                <div className="auth-step-circle">
                  {step > number ? (
                    <i className="bi bi-check-lg" />
                  ) : (
                    number
                  )}
                </div>

                <span>{label}</span>
              </div>
            );
          })}
        </div>

        {/* ERROR MESSAGE */}
        {error && (
          <div className="auth-error" role="alert">
            {error}
          </div>
        )}

        {/* SUCCESS MESSAGE */}
        {notice && (
          <div className="auth-success" role="status">
            {notice}
          </div>
        )}

        {/* STEP 1 — EMAIL */}
        {step === 1 && (
          <>
            <label htmlFor="reset-email">Email address</label>

            <input
              id="reset-email"
              type="email"
              autoComplete="email"
              placeholder="Enter your registered email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />
          </>
        )}

        {/* STEP 2 — OTP */}
        {step === 2 && (
          <>
            <label htmlFor="reset-otp">
              Six-digit verification code
            </label>

            <input
              id="reset-otp"
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              placeholder="Enter OTP"
              value={otp}
              onChange={(event) =>
                setOtp(
                  event.target.value.replace(/\D/g, '').slice(0, 6)
                )
              }
              required
            />

            <button
              type="button"
              className="auth-home"
              onClick={handleChangeEmail}
            >
              <i className="bi bi-arrow-left" /> Change email address
            </button>
          </>
        )}

        {/* STEP 3 — NEW PASSWORD */}
        {step === 3 && (
          <>
            <label htmlFor="reset-new-password">
              New password
            </label>

            <div className="password-input-wrap">
              <input
                id="reset-new-password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="new-password"
                placeholder="Enter your new password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                minLength={8}
                maxLength={128}
                required
              />

              <button
                type="button"
                className="password-toggle"
                onClick={() =>
                  setShowPassword((prev) => !prev)
                }
                aria-label={
                  showPassword ? 'Hide password' : 'Show password'
                }
                aria-pressed={showPassword}
              >
                <i
                  className={`bi ${
                    showPassword ? 'bi-eye-slash' : 'bi-eye'
                  }`}
                  aria-hidden="true"
                />
              </button>
            </div>

            <label htmlFor="reset-confirm-password">
              Confirm new password
            </label>

            <div className="password-input-wrap">
              <input
                id="reset-confirm-password"
                type={showConfirmPassword ? 'text' : 'password'}
                autoComplete="new-password"
                placeholder="Confirm your new password"
                value={confirmPassword}
                onChange={(event) =>
                  setConfirmPassword(event.target.value)
                }
                minLength={8}
                maxLength={128}
                required
              />

              <button
                type="button"
                className="password-toggle"
                onClick={() =>
                  setShowConfirmPassword((prev) => !prev)
                }
                aria-label={
                  showConfirmPassword
                    ? 'Hide confirm password'
                    : 'Show confirm password'
                }
                aria-pressed={showConfirmPassword}
              >
                <i
                  className={`bi ${
                    showConfirmPassword ? 'bi-eye-slash' : 'bi-eye'
                  }`}
                  aria-hidden="true"
                />
              </button>
            </div>
          </>
        )}

        {/* SUBMIT BUTTON */}
        <button
          className="auth-submit"
          type="submit"
          disabled={loading}
        >
          {loading
            ? 'Please wait...'
            : step === 1
              ? 'Send Reset Code'
              : step === 2
                ? 'Verify Code'
                : 'Reset Password'}
        </button>

        <p className="auth-switch">
          Remember your password? <Link to="/login">Sign in</Link>
        </p>

        <Link to="/" className="auth-home">
          <i className="bi bi-arrow-left" /> Back to website
        </Link>
      </form>
    </main>
  );
}
import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useNotice } from '../context/NoticeContext';
import '../css/Register.css';

export default function ResetPassword() {
  const {
    forgotPassword,
    verifyResetOtp,
    resetPassword,
  } = useAuth();

  const navigate = useNavigate();
  const { showNotice } = useNotice();

  const [step, setStep] = useState(1);
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [loading, setLoading] = useState(false);

  // STEP 1 — SEND RESET OTP
  async function handleSendOtp(event) {
    event.preventDefault();

    const normalizedEmail = email.trim().toLowerCase();

    if (!normalizedEmail) {
      showNotice({
        tone: 'error',
        kicker: 'Reset password',
        title: 'Enter your email address',
        message: 'We need your registered email to send a reset code.',
      });
      return;
    }

    setLoading(true);

    try {
      const result = await forgotPassword(normalizedEmail);

      // Move to Step 2 only if the request succeeds.
      setEmail(normalizedEmail);
      setOtp('');
      setStep(2);
      showNotice({
        tone: 'success',
        kicker: 'Reset code sent',
        title: 'Check your email',
        message: result.message || 'OTP sent successfully. Please check your email.',
      });
    } catch (err) {
      // A 404 (no account found) stays on Step 1.
      showNotice({
        tone: 'error',
        kicker: 'Reset password',
        title: "Couldn't send the reset code",
        message: err.message || 'Unable to send the reset code.',
      });
    } finally {
      setLoading(false);
    }
  }

  // STEP 2 — VERIFY RESET OTP
  async function handleVerifyOtp(event) {
    event.preventDefault();

    if (!/^\d{6}$/.test(otp.trim())) {
      showNotice({
        tone: 'error',
        kicker: 'Verification code',
        title: 'Enter a six-digit code',
        message: 'The verification code must be exactly six digits.',
      });
      return;
    }

    setLoading(true);

    try {
      const result = await verifyResetOtp(
        email.trim().toLowerCase(),
        otp.trim()
      );

      setStep(3);
      showNotice({
        tone: 'success',
        kicker: 'Code verified',
        title: 'Create your new password',
        message: result.message || 'Code verified successfully.',
      });
    } catch (err) {
      showNotice({
        tone: 'error',
        kicker: 'Verification code',
        title: "Couldn't verify the code",
        message: err.message || 'Unable to verify the code.',
      });
    } finally {
      setLoading(false);
    }
  }

  // STEP 3 — RESET PASSWORD
  async function handleResetPassword(event) {
    event.preventDefault();

    if (password.length < 8 || password.length > 128) {
      showNotice({
        tone: 'error',
        kicker: 'New password',
        title: 'Choose a longer password',
        message: 'Password must be between 8 and 128 characters.',
      });
      return;
    }

    if (password !== confirmPassword) {
      showNotice({
        tone: 'error',
        kicker: 'New password',
        title: 'Passwords do not match',
        message: 'Re-enter your new password in both fields to confirm it.',
      });
      return;
    }

    setLoading(true);

    try {
      const result = await resetPassword(
        email.trim().toLowerCase(),
        password
      );

      showNotice({
        tone: 'success',
        kicker: 'Password reset',
        title: 'Your password has been updated',
        message:
          result.message ||
          'Password reset successful. Please sign in with your new password.',
      });

      navigate('/login', { replace: true });
    } catch (err) {
      showNotice({
        tone: 'error',
        kicker: 'Password reset',
        title: "Couldn't reset your password",
        message: err.message || 'Unable to reset your password.',
      });
    } finally {
      setLoading(false);
    }
  }

  function handleChangeEmail() {
    setStep(1);
    setOtp('');
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
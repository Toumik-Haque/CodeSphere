import React, { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const { user, login } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  if (user) {
    return (
      <Navigate
        to={user.role === 'admin' ? '/admin' : '/dashboard'}
        replace
      />
    );
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');
    setLoading(true);

    try {
      const loggedInUser = await login(email, password);

      navigate(
        loggedInUser.role === 'admin' ? '/admin' : '/dashboard',
        { replace: true }
      );
    } catch (err) {
      setError(err.message || 'Unable to sign in. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="auth-page">
      <form className="auth-card" onSubmit={handleSubmit}>
        <Link to="/" className="auth-brand">
          Code<span>Sphere</span>
        </Link>

        <p className="auth-eyebrow">WELCOME BACK</p>
        <h1>Sign in to CodeSphere</h1>

        <p className="auth-subtitle">
          Continue your journey with the community.
        </p>

        {error && (
          <div className="auth-error" role="alert">
            {error}
          </div>
        )}

        <label htmlFor="login-email">Email address</label>
        <input
          id="login-email"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="Enter your registered email"
          required
        />

        <label htmlFor="login-password">Password</label>

        <div className="password-input-wrap">
          <input
            id="login-password"
            type={showPassword ? 'text' : 'password'}
            autoComplete="current-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="Enter your password"
            required
          />

          <button
            type="button"
            className="password-toggle"
            onClick={() => setShowPassword((prev) => !prev)}
            aria-label={showPassword ? 'Hide password' : 'Show password'}
            aria-pressed={showPassword}
          >
            <i
              className={`bi ${showPassword ? 'bi-eye-slash' : 'bi-eye'}`}
              aria-hidden="true"
            />
          </button>
        </div>

        <div className="login-forgot">
          <Link to="/reset-password">Forgot password?</Link>
        </div>

        <button
          className="auth-submit"
          type="submit"
          disabled={loading}
        >
          {loading ? 'Signing in...' : 'Sign In'}
        </button>

        <p className="auth-switch">
          New to CodeSphere? <Link to="/register">Create an account</Link>
        </p>

        <Link to="/" className="auth-home">
          <i className="bi bi-arrow-left" /> Back to website
        </Link>
      </form>
    </main>
  );
}
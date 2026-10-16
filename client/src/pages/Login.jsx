import React, { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const { user, login } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  if (user) {
    return (
      <Navigate
        to={user.role === 'admin' ? '/admin' : '/profile'}
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
        loggedInUser.role === 'admin' ? '/admin' : '/profile',
        { replace: true }
      );
    } catch (err) {
      setError(err.message);
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
          placeholder="you@example.com"
          required
        />

        <label htmlFor="login-password">Password</label>
        <input
          id="login-password"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          placeholder="Enter your password"
          required
        />

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
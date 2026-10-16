import React, { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Register() {
  const { user, register } = useAuth();
  const navigate = useNavigate();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
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

    if (password.length < 8) {
      setError('Password must contain at least 8 characters.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);

    try {
      await register(name, email, password);
      navigate('/profile', { replace: true });
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

        <p className="auth-eyebrow">JOIN THE COMMUNITY</p>
        <h1>Create your account</h1>
        <p className="auth-subtitle">
          Start learning, collaborating, and building together.
        </p>

        {error && (
          <div className="auth-error" role="alert">
            {error}
          </div>
        )}

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

        <label htmlFor="register-password">Password</label>
        <input
          id="register-password"
          type="password"
          autoComplete="new-password"
          minLength={8}
          maxLength={128}
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          placeholder="At least 8 characters"
          required
        />

        <label htmlFor="confirm-password">Confirm password</label>
        <input
          id="confirm-password"
          type="password"
          autoComplete="new-password"
          value={confirmPassword}
          onChange={(event) => setConfirmPassword(event.target.value)}
          placeholder="Enter your password again"
          required
        />

        <button
          className="auth-submit"
          type="submit"
          disabled={loading}
        >
          {loading ? 'Creating account...' : 'Create Account'}
        </button>

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
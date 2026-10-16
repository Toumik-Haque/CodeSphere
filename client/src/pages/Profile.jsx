import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { apiRequest } from '../lib/api';
import '../css/Profile.css';

export default function Profile() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [profile, setProfile] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    async function loadProfile() {
      try {
        const data = await apiRequest('/auth/me');

        if (active) setProfile(data.user);
      } catch (err) {
        if (!active) return;

        setError(err.message);
      } finally {
        if (active) setLoading(false);
      }
    }

    loadProfile();

    return () => {
      active = false;
    };
  }, []);

  function handleLogout() {
    logout();
    navigate('/login', { replace: true });
  }

  return (
    <main className="auth-page">
      <section className="auth-card profile-card">
        <div className="profile-icon">
          <i className="bi bi-person-circle" aria-hidden="true" />
        </div>

        <p className="auth-eyebrow">CODESPHERE MEMBER</p>
        <h1>My Profile</h1>
        <p className="auth-subtitle">
          Your account and community information.
        </p>

        {loading && <p className="auth-subtitle">Loading your profile...</p>}

        {error && (
          <div className="auth-error" role="alert">
            {error}
          </div>
        )}

        {profile && (
          <div className="profile-details">
            <div className="profile-detail">
              <span>Full name</span>
              <strong>{profile.name}</strong>
            </div>

            <div className="profile-detail">
              <span>Email address</span>
              <strong>{profile.email}</strong>
            </div>

            <div className="profile-detail">
              <span>Account type</span>
              <strong>{profile.role === 'admin' ? 'Administrator' : 'Member'}</strong>
            </div>

            <div className="profile-detail">
              <span>Member since</span>
              <strong>
                {profile.createdAt
                  ? new Date(profile.createdAt).toLocaleDateString()
                  : '—'}
              </strong>
            </div>
          </div>
        )}

        <button className="auth-submit" onClick={handleLogout}>
          Sign Out
        </button>

        <Link to="/" className="auth-home">
          <i className="bi bi-arrow-left" aria-hidden="true" /> Back to website
        </Link>
      </section>
    </main>
  );
}
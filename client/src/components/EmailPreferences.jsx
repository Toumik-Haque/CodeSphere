import { useEffect, useState } from 'react';
import { apiRequest } from '../lib/api';

const PREFERENCES = [
  {
    key: 'updates',
    icon: 'bi-megaphone',
    label: 'Community updates',
    description: 'Announcements, events, hackathons, projects, and study guides.',
  },
  {
    key: 'subscribed',
    icon: 'bi-newspaper',
    label: 'Weekly Tech Brief',
    description: 'The most useful developer stories, delivered once a week. Off by default.',
  },
  {
    key: 'daily',
    icon: 'bi-lightning-charge',
    label: 'Daily Today in Tech',
    description: 'A short digest of what matters in tech every morning. Off by default.',
  },
];

export default function EmailPreferences({ email = '' }) {
  const [prefs, setPrefs] = useState(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    apiRequest('/newsletter/me')
      .then((result) => !cancelled && setPrefs(result))
      .catch((loadError) => !cancelled && setError(loadError.message || 'Could not load email preferences.'));
    return () => {
      cancelled = true;
    };
  }, []);

  const toggle = async (key) => {
    if (!prefs || saving) return;
    const previous = prefs;
    const next = { ...prefs, [key]: !prefs[key] };
    setPrefs(next);
    setSaving(true);
    setMessage('');
    setError('');
    try {
      const result = await apiRequest('/newsletter/me', {
        method: 'PUT',
        body: JSON.stringify({ [key]: next[key] }),
      });
      setPrefs(result);
      setMessage('Email preferences saved.');
    } catch (saveError) {
      setPrefs(previous);
      setError(saveError.message || 'Could not save email preferences.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="profile-section-card email-preferences-card">
      <div className="profile-section-heading">
        <div>
          <h2>Email preferences</h2>
          <p>Choose which optional emails you want to receive.</p>
        </div>
        <span className="profile-section-icon">
          <i className="bi bi-envelope-at" />
        </span>
      </div>

      {email && (
        <div className="email-preferences-address">
          <span>Emails are sent to</span>
          <strong>{email}</strong>
        </div>
      )}

      <div className="email-preferences-list">
        {PREFERENCES.map((preference) => (
          <label className="email-preference-row" key={preference.key}>
            <span className="email-preference-icon" aria-hidden="true">
              <i className={`bi ${preference.icon}`} />
            </span>
            <span className="email-preference-copy">
              <strong>{preference.label}</strong>
              <small>{preference.description}</small>
            </span>
            <span className="email-preference-switch">
              <input
                type="checkbox"
                checked={Boolean(prefs?.[preference.key])}
                onChange={() => toggle(preference.key)}
                disabled={!prefs || saving}
              />
              <span aria-hidden="true" />
            </span>
          </label>
        ))}
      </div>

      {error && <p className="email-preferences-feedback is-error" role="alert">{error}</p>}
      {message && !error && <p className="email-preferences-feedback" role="status">{message}</p>}

      <div className="email-preferences-note">
        <i className="bi bi-shield-lock" aria-hidden="true" />
        <span>Registration verification and password reset emails are always sent.</span>
      </div>
    </section>
  );
}

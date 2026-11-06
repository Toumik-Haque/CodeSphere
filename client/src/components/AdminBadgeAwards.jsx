import { useEffect, useState } from 'react';
import { apiRequest } from '../lib/api';
import { loadBadgeCatalog } from '../lib/badges';
import '../css/Badges.css';

// Admin: view a student's badges and award/remove community badges.
export default function AdminBadgeAwards({ userId, userName }) {
  const [open, setOpen] = useState(false);
  const [catalog, setCatalog] = useState(null);
  const [earned, setEarned] = useState(null);
  const [notes, setNotes] = useState({});
  const [busy, setBusy] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!open) return undefined;
    let cancelled = false;
    Promise.all([loadBadgeCatalog(), apiRequest(`/badges/admin/user/${userId}`)])
      .then(([cat, list]) => {
        if (cancelled) return;
        setCatalog(cat);
        setEarned(list.badges);
      })
      .catch((err) => !cancelled && setMessage(err.message));
    return () => {
      cancelled = true;
    };
  }, [open, userId]);

  const refresh = async () => {
    const list = await apiRequest(`/badges/admin/user/${userId}`);
    setEarned(list.badges);
  };

  const award = async (badgeId) => {
    setBusy(badgeId);
    setMessage('');
    try {
      await apiRequest('/badges/admin/award', {
        method: 'POST',
        body: JSON.stringify({ userId, badgeId, note: notes[badgeId] || '' }),
      });
      await refresh();
      setMessage('Badge awarded. The student will see it next time they open their profile.');
    } catch (err) {
      setMessage(err.message);
    } finally {
      setBusy('');
    }
  };

  const remove = async (badgeId) => {
    setBusy(badgeId);
    setMessage('');
    try {
      await apiRequest('/badges/admin/award', { method: 'DELETE', body: JSON.stringify({ userId, badgeId }) });
      await refresh();
    } catch (err) {
      setMessage(err.message);
    } finally {
      setBusy('');
    }
  };

  const communityBadges = (catalog?.badges || []).filter((b) => b.type === 'admin');
  const earnedIds = new Set((earned || []).map((b) => b.id));

  return (
    <div className="adm-badges">
      <button
        type="button"
        className="adm-badges-toggle"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
      >
        <i className="bi bi-award" aria-hidden="true" /> Badges
        {earned && <span>{earned.length}</span>}
        <i className={`bi ${open ? 'bi-chevron-up' : 'bi-chevron-down'}`} aria-hidden="true" />
      </button>

      {open && (
        <div className="adm-badges-panel">
          {!earned && !message && <p className="bdg-muted">Loading badges…</p>}

          {earned && (
            <>
              <h4>Earned by {userName}</h4>
              {earned.length ? (
                <div className="bdg-showcase">
                  {earned.map((badge) => (
                    <span key={badge.id} className="bdg-chip" title={badge.note || badge.how}>
                      <span aria-hidden="true">{badge.emoji}</span> {badge.name}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="bdg-muted">No badges yet.</p>
              )}

              <h4>Community badges (awarded by admins)</h4>
              <ul className="adm-badges-list">
                {communityBadges.map((badge) => {
                  const has = earnedIds.has(badge.id);
                  return (
                    <li key={badge.id}>
                      <span className="adm-badge-name">
                        <span aria-hidden="true">{badge.emoji}</span>
                        <span>
                          <strong>{badge.name}</strong>
                          <small>{badge.how}</small>
                        </span>
                      </span>
                      {!has && (
                        <input
                          type="text"
                          maxLength={200}
                          placeholder="Optional note (why?)"
                          value={notes[badge.id] || ''}
                          onChange={(e) => setNotes((n) => ({ ...n, [badge.id]: e.target.value }))}
                          aria-label={`Note for ${badge.name}`}
                        />
                      )}
                      <button
                        type="button"
                        className={has ? 'is-remove' : 'is-award'}
                        onClick={() => (has ? remove(badge.id) : award(badge.id))}
                        disabled={busy === badge.id}
                      >
                        {busy === badge.id ? '…' : has ? 'Remove' : 'Award'}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </>
          )}

          {message && <p className="adm-badges-message" role="status">{message}</p>}
        </div>
      )}
    </div>
  );
}

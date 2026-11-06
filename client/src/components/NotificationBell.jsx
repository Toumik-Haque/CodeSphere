import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiRequest } from '../lib/api';
import { timeAgo } from '../lib/time';

const TYPE_ICONS = {
  'forum-reply': 'bi-chat-dots',
  'forum-moderation': 'bi-shield-exclamation',
  'forum-report-reviewed': 'bi-flag',
  'reverse-result': 'bi-arrow-repeat',
  'reverse-new': 'bi-arrow-repeat',
  'news-digest': 'bi-newspaper',
  system: 'bi-info-circle',
};

const MUTE_LABELS = {
  'forum-reply': 'Replies to discussions I follow',
  'reverse-new': 'New Reverse Coding challenges',
  'news-digest': 'New Tech Brief editions',
};

const POLL_MS = 60000;

// Bell with unread count and a dropdown of recent notifications.
export default function NotificationBell({ compact = false }) {
  const [open, setOpen] = useState(false);
  const [data, setData] = useState(null);
  const [showPrefs, setShowPrefs] = useState(false);
  const ref = useRef(null);

  const load = useCallback(() => apiRequest('/notifications?limit=15').then(setData).catch(() => {}), []);

  // Poll for new notifications (only while the tab is visible).
  useEffect(() => {
    let timer;
    const tick = () => {
      if (document.visibilityState === 'visible') load();
      timer = window.setTimeout(tick, POLL_MS);
    };
    timer = window.setTimeout(tick, 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  useEffect(() => {
    if (!open) return undefined;
    const onClick = (e) => !ref.current?.contains(e.target) && setOpen(false);
    const onKey = (e) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', onClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const markAll = async () => {
    await apiRequest('/notifications/read', { method: 'POST', body: JSON.stringify({}) }).catch(() => {});
    load();
  };

  const openItem = (item) => {
    setOpen(false);
    if (!item.read) apiRequest('/notifications/read', { method: 'POST', body: JSON.stringify({ ids: [item._id] }) }).then(load).catch(() => {});
  };

  const toggleMute = async (type) => {
    const muted = data.muted.includes(type) ? data.muted.filter((t) => t !== type) : [...data.muted, type];
    const r = await apiRequest('/notifications/preferences', { method: 'PUT', body: JSON.stringify({ muted }) }).catch(() => null);
    if (r) setData((d) => ({ ...d, muted: r.muted }));
  };

  const unread = data?.unread || 0;

  return (
    <div className={`notif ${compact ? 'is-compact' : ''}`} ref={ref}>
      <button
        type="button"
        className="notif-bell"
        onClick={() => {
          setOpen((o) => !o);
          if (!open) load();
        }}
        aria-expanded={open}
        aria-label={`Notifications${unread ? `, ${unread} unread` : ''}`}
      >
        <i className={`bi ${unread ? 'bi-bell-fill' : 'bi-bell'}`} aria-hidden="true" />
        {unread > 0 && <span className="notif-count" aria-hidden="true">{unread > 9 ? '9+' : unread}</span>}
      </button>

      {open && (
        <div className="notif-panel" role="dialog" aria-label="Notifications">
          <div className="notif-head">
            <strong>Notifications</strong>
            <div>
              {unread > 0 && <button type="button" onClick={markAll}>Mark all read</button>}
              <button type="button" onClick={() => setShowPrefs((p) => !p)} aria-label="Notification settings" aria-expanded={showPrefs}>
                <i className="bi bi-gear" aria-hidden="true" />
              </button>
            </div>
          </div>

          {showPrefs && data && (
            <div className="notif-prefs">
              <p>Notify me about:</p>
              {data.mutable.map((type) => (
                <label key={type}>
                  <input type="checkbox" checked={!data.muted.includes(type)} onChange={() => toggleMute(type)} />
                  {MUTE_LABELS[type] || type}
                </label>
              ))}
              <small>Moderation and account messages are always shown.</small>
            </div>
          )}

          <ul className="notif-list">
            {!data && <li className="notif-empty">Loading…</li>}
            {data?.items.length === 0 && <li className="notif-empty">You&apos;re all caught up 🎉</li>}
            {data?.items.map((item) => (
              <li key={item._id} className={item.read ? '' : 'is-unread'}>
                <Link to={item.link || '#'} onClick={() => openItem(item)}>
                  <i className={`bi ${TYPE_ICONS[item.type] || 'bi-bell'}`} aria-hidden="true" />
                  <span>
                    <strong>{item.title}</strong>
                    {item.body && <small className="notif-body">{item.body}</small>}
                    <small>{timeAgo(item.createdAt)}</small>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

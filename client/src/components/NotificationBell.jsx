import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { createPortal } from 'react-dom';
import { apiRequest } from '../lib/api';
import { timeAgo } from '../lib/time';
import { openUserStream } from '../lib/realtime';
import { useAuth } from '../context/AuthContext';
import RichTextEditor from './RichTextEditor';
import BroadcastOptions from './BroadcastOptions';
import '../css/Updates.css';

const TYPE_ICONS = {
  announcement: 'bi-megaphone',
  'forum-reply': 'bi-chat-dots',
  'forum-mention': 'bi-at',
  'forum-moderation': 'bi-shield-exclamation',
  'forum-report-reviewed': 'bi-flag',
  'reverse-result': 'bi-arrow-repeat',
  'reverse-new': 'bi-arrow-repeat',
  'news-digest': 'bi-newspaper',
  'news-daily': 'bi-lightning-charge',
  hackathon: 'bi-trophy',
  'host-review': 'bi-megaphone',
  project: 'bi-rocket-takeoff',
  system: 'bi-info-circle',
};

const MUTE_LABELS = {
  announcement: 'Community updates & announcements',
  'forum-reply': 'Replies to discussions I follow',
  'forum-mention': 'When someone @mentions me',
  'reverse-new': 'New Reverse Coding challenges',
  'news-digest': 'New Tech Brief editions',
  'news-daily': 'Daily "Today in Tech" (8 AM)',
};

// Live updates arrive over SSE; polling is only a slow safety net.
const POLL_MS = 5 * 60000;

// Bell with unread count and a dropdown of recent notifications.
export default function NotificationBell({ compact = false }) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [data, setData] = useState(null);
  const [showPrefs, setShowPrefs] = useState(false);
  const [publisherOpen, setPublisherOpen] = useState(false);
  const [updateTitle, setUpdateTitle] = useState('');
  const [updateBody, setUpdateBody] = useState('');
  const [updateFiles, setUpdateFiles] = useState([]);
  const [sentTo, setSentTo] = useState('@all');
  const [broadcastOptions, setBroadcastOptions] = useState({ sendNotification: true, sendEmail: true });
  const [publishing, setPublishing] = useState(false);
  const [publisherMessage, setPublisherMessage] = useState('');
  const [publisherError, setPublisherError] = useState('');
  const ref = useRef(null);
  const isAdmin = user?.role === 'admin';

  const load = useCallback(() => apiRequest('/notifications?limit=15').then(setData).catch(() => {}), []);

  // Live: refresh as soon as the server pushes a new notification.
  useEffect(() => openUserStream(() => load()), [load]);

  // Fallback poll (only while the tab is visible).
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

  useEffect(() => {
    if (!publisherOpen) return undefined;
    const onKey = (event) => {
      if (event.key === 'Escape' && !publishing) setPublisherOpen(false);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [publisherOpen, publishing]);

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

  const selectUpdateFiles = (event) => {
    const files = Array.from(event.target.files || []);
    const allowedTypes = new Set([
      'image/jpeg',
      'image/png',
      'image/webp',
      'image/gif',
      'application/pdf',
    ]);
    const invalidFile = files.find((file) => !allowedTypes.has(file.type) || file.size > 10 * 1024 * 1024);
    if (invalidFile) {
      setPublisherError(`${invalidFile.name} is unsupported or larger than 10 MB.`);
      event.target.value = '';
      return;
    }
    if (updateFiles.length + files.length > 5) {
      setPublisherError('Attach no more than 5 files.');
      event.target.value = '';
      return;
    }
    setPublisherError('');
    setUpdateFiles((current) => [...current, ...files]);
    event.target.value = '';
  };

  const publishUpdate = async (event) => {
    event.preventDefault();
    setPublisherMessage('');
    setPublisherError('');
    if (!updateTitle.trim() || !updateBody.replace(/<[^>]*>/g, ' ').trim()) {
      setPublisherError('Add a title and update text before publishing.');
      return;
    }

    const audience = sentTo.trim() || '@all';
    const tokens = audience.split(/[\s,]+/).filter(Boolean);
    const invalidToken = tokens.find((token) => !/^@(?:all|[a-z0-9]+(?:-[a-z0-9]+)*)$/i.test(token));
    if (invalidToken) {
      setPublisherError(`"${invalidToken}" is not a valid @username. Use @all or comma-separated @usernames.`);
      return;
    }

    const formData = new FormData();
    formData.append('title', updateTitle.trim());
    formData.append('body', updateBody);
    formData.append('sentTo', tokens.join(','));
    formData.append('sendNotification', String(broadcastOptions.sendNotification));
    formData.append('sendEmail', String(broadcastOptions.sendEmail));
    updateFiles.forEach((file) => formData.append('media', file));
    setPublishing(true);
    try {
      const result = await apiRequest('/announcements', { method: 'POST', body: formData });
      setUpdateTitle('');
      setUpdateBody('');
      setUpdateFiles([]);
      setSentTo('@all');
      setBroadcastOptions({ sendNotification: true, sendEmail: true });
      setPublisherOpen(false);
      setPublisherMessage(result.message || 'Update published.');
      await load();
    } catch (error) {
      setPublisherError(error.message || 'Could not publish the update.');
    } finally {
      setPublishing(false);
    }
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

          {isAdmin && (
            <button
              type="button"
              className="notif-publish-update"
              onClick={() => {
                setPublisherError('');
                setPublisherMessage('');
                setPublisherOpen(true);
              }}
            >
              <i className="bi bi-megaphone" aria-hidden="true" />
              Publish community update
              <i className="bi bi-plus-lg" aria-hidden="true" />
            </button>
          )}

          {publisherMessage && <p className="notif-publish-success" role="status">{publisherMessage}</p>}

          {showPrefs && data && (
            <div className="notif-prefs">
              <p>Notify me about:</p>
              {data.mutable.map((type) => (
                <label key={type}>
                  <input type="checkbox" checked={!data.muted.includes(type)} onChange={() => toggleMute(type)} />
                  {MUTE_LABELS[type] || type}
                </label>
              ))}
              <small>These settings only control in-app notifications. Manage email preferences from your profile.</small>
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

      {publisherOpen && isAdmin && createPortal((
        <div
          className="update-publisher-backdrop"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !publishing) setPublisherOpen(false);
          }}
        >
          <form
            className="update-publisher"
            role="dialog"
            aria-modal="true"
            aria-labelledby="update-publisher-title"
            onSubmit={publishUpdate}
          >
            <header className="update-publisher-header">
              <div>
                <span>COMMUNITY ANNOUNCEMENT</span>
                <h2 id="update-publisher-title">Publish an update</h2>
                <p>Share a formatted update with CodeSphere members.</p>
              </div>
              <button
                type="button"
                className="update-publisher-close"
                onClick={() => setPublisherOpen(false)}
                disabled={publishing}
                aria-label="Close update publisher"
              >
                <i className="bi bi-x-lg" aria-hidden="true" />
              </button>
            </header>

            <div className="update-publisher-fields">
              <label className="update-publisher-label" htmlFor="update-title">Title</label>
              <input
                id="update-title"
                className="update-publisher-title-input"
                type="text"
                value={updateTitle}
                onChange={(event) => setUpdateTitle(event.target.value)}
                maxLength={120}
                placeholder="What should everyone know?"
                required
              />
              <span className="update-publisher-label">Update details</span>
              <RichTextEditor
                value={updateBody}
                onChange={setUpdateBody}
                height={260}
                placeholder="Write your update..."
              />
              <div className="update-media-row">
                <label className="update-media-picker">
                  <i className="bi bi-paperclip" aria-hidden="true" />
                  Add images or PDFs
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif,application/pdf"
                    multiple
                    onChange={selectUpdateFiles}
                  />
                </label>
                <small>Up to 5 files · 10 MB each</small>
              </div>
              {updateFiles.length > 0 && (
                <ul className="update-file-list">
                  {updateFiles.map((file, index) => (
                    <li key={`${file.name}-${file.lastModified}-${index}`}>
                      <i className={`bi ${file.type === 'application/pdf' ? 'bi-file-earmark-pdf' : 'bi-image'}`} aria-hidden="true" />
                      <span>{file.name}</span>
                      <button
                        type="button"
                        onClick={() => setUpdateFiles((current) => current.filter((_, fileIndex) => fileIndex !== index))}
                        aria-label={`Remove ${file.name}`}
                      >
                        <i className="bi bi-x" aria-hidden="true" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              <label className="update-publisher-label" htmlFor="update-sent-to">Sent to</label>
              <input
                id="update-sent-to"
                className="update-publisher-sent-to"
                type="text"
                value={sentTo}
                onChange={(event) => setSentTo(event.target.value)}
                placeholder="@all or @username, @another"
                spellCheck="false"
              />
              <small className="update-publisher-hint">
                The update stays public. This only controls who receives the notification and email.
              </small>
              <BroadcastOptions value={broadcastOptions} onChange={setBroadcastOptions} />
            </div>

            {publisherError && <p className="update-publisher-error" role="alert">{publisherError}</p>}
            <footer className="update-publisher-footer">
              <span>Choose how to notify members when you publish</span>
              <div>
                <button type="button" className="update-publisher-cancel" onClick={() => setPublisherOpen(false)} disabled={publishing}>Cancel</button>
                <button type="submit" className="update-publisher-submit" disabled={publishing}>
                  <i className={`bi ${publishing ? 'bi-arrow-repeat' : 'bi-send'}`} aria-hidden="true" />
                  {publishing ? 'Publishing…' : 'Publish update'}
                </button>
              </div>
            </footer>
          </form>
        </div>
      ), document.body)}
    </div>
  );
}

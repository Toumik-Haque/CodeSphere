import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { apiRequest } from '../lib/api';
import '../css/ShareAndPush.css';

// Admin-only "Email everyone" button for an event, hackathon, recruitment,
// study guide, project or reverse-coding puzzle. Opens a confirm dialog with
// an optional subject and personal message.
export default function PushEmailButton({ kind, id, title, className = '', label = 'Email everyone' }) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [audience, setAudience] = useState(null);
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [notify, setNotify] = useState(false);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState({ text: '', tone: '' });

  useEffect(() => {
    if (!open) return undefined;
    let cancelled = false;
    apiRequest('/push/audience').then((r) => !cancelled && setAudience(r.count)).catch(() => {});
    const onKey = (e) => e.key === 'Escape' && !busy && setOpen(false);
    window.addEventListener('keydown', onKey);
    return () => {
      cancelled = true;
      window.removeEventListener('keydown', onKey);
    };
  }, [open, busy]);

  if (user?.role !== 'admin') return null;

  const send = async (e) => {
    e.preventDefault();
    setBusy(true);
    setResult({ text: '', tone: '' });
    try {
      const r = await apiRequest(`/push/${kind}/${id}`, {
        method: 'POST',
        body: JSON.stringify({ subject, message, sendNotification: notify }),
      });
      setResult({ text: r.message, tone: 'ok' });
      setMessage('');
    } catch (err) {
      setResult({ text: err.message, tone: 'error' });
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <button type="button" className={`push-btn ${className}`} onClick={() => { setOpen(true); setResult({ text: '', tone: '' }); }}>
        <i className="bi bi-send" aria-hidden="true" /> {label}
      </button>
      {open && (
        <div className="push-dialog" role="dialog" aria-modal="true" aria-labelledby={`push-title-${id}`}>
          <button type="button" className="push-backdrop" aria-label="Close" onClick={() => !busy && setOpen(false)} />
          <form className="push-panel" onSubmit={send}>
            <h3 id={`push-title-${id}`}><i className="bi bi-envelope-paper" aria-hidden="true" /> Email this to everyone</h3>
            <p className="push-what">“{title}”</p>
            <p className="push-muted">
              Goes to {audience === null ? '…' : <b>{audience} member{audience === 1 ? '' : 's'}</b>} (everyone except those who unsubscribed),
              with its banner, key details and a link.
            </p>
            <label>Subject <small>(optional)</small>
              <input value={subject} onChange={(e) => setSubject(e.target.value)} maxLength={150} placeholder={title} />
            </label>
            <label>Your message <small>(optional, shown at the top)</small>
              <textarea value={message} onChange={(e) => setMessage(e.target.value)} rows={3} maxLength={1000} placeholder="e.g. Only 2 days left to register. Don't miss it!" />
            </label>
            <label className="push-check">
              <input type="checkbox" checked={notify} onChange={(e) => setNotify(e.target.checked)} />
              Also send an in-app notification
            </label>
            {result.text && <p className={result.tone === 'ok' ? 'push-ok' : 'push-error'} role={result.tone === 'ok' ? 'status' : 'alert'}>{result.text}</p>}
            <div className="push-actions">
              <button type="button" className="push-cancel" onClick={() => setOpen(false)} disabled={busy}>{result.tone === 'ok' ? 'Close' : 'Cancel'}</button>
              {result.tone !== 'ok' && (
                <button type="submit" className="push-send" disabled={busy}>
                  <i className="bi bi-send-fill" aria-hidden="true" /> {busy ? 'Sending…' : 'Send email now'}
                </button>
              )}
            </div>
          </form>
        </div>
      )}
    </>
  );
}

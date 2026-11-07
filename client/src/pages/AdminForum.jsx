import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import { apiRequest } from '../lib/api';
import { loadForumConfig } from '../lib/forum';
import { timeAgo, formatDate } from '../lib/time';
import '../css/Forum.css';

export default function AdminForum() {
  const [view, setView] = useState('open');
  const [config, setConfig] = useState(null);
  const [reports, setReports] = useState(null);
  const [audit, setAudit] = useState(null);
  const [reasons, setReasons] = useState({});
  const [message, setMessage] = useState('');
  const [version, setVersion] = useState(0);

  const reload = useCallback(() => setVersion((v) => v + 1), []);

  useEffect(() => {
    let cancelled = false;
    loadForumConfig().then((c) => !cancelled && setConfig(c)).catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    const request = view === 'audit'
      ? apiRequest('/forum/admin/audit').then((r) => !cancelled && setAudit(r.actions))
      : apiRequest(`/forum/admin/reports?status=${view}`).then((r) => !cancelled && setReports(r.reports));
    request.catch((err) => !cancelled && setMessage(err.message));
    return () => {
      cancelled = true;
    };
  }, [view, version]);

  const act = async (body, report) => {
    setMessage('');
    try {
      await apiRequest('/forum/admin/actions', {
        method: 'POST',
        body: JSON.stringify({ ...body, reason: reasons[report.id] || '', reportId: report.id }),
      });
      setMessage('Action applied and report closed.');
      reload();
    } catch (err) {
      setMessage(err.message);
    }
  };

  const reasonLabel = (id) => config?.reportReasons.find((r) => r.id === id)?.label || id;

  // One card per reported post (reports on the same post are grouped).
  const grouped = [];
  const seen = new Set();
  (reports || []).forEach((r) => {
    if (view === 'open' && seen.has(r.targetId)) return;
    seen.add(r.targetId);
    grouped.push(r);
  });
  if (view === 'open') grouped.sort((a, b) => b.reportCount - a.reportCount);

  return (
    <>
      <Navbar />
      <main className="forum-page">
        <div className="container">
          <Link to="/admin" className="forum-back"><i className="bi bi-arrow-left" aria-hidden="true" /> Admin dashboard</Link>
          <h1 className="forum-page-title"><i className="bi bi-shield-lock" aria-hidden="true" /> Forum moderation</h1>

          <div className="forum-tabs" role="tablist">
            {[['open', 'Open reports', 'bi-flag'], ['resolved', 'Resolved', 'bi-check2-circle'], ['dismissed', 'Dismissed', 'bi-x-circle'], ['audit', 'Audit trail', 'bi-journal-text']].map(([id, label, icon]) => (
              <button key={id} type="button" role="tab" aria-selected={view === id} className={view === id ? 'active' : ''} onClick={() => setView(id)}>
                <i className={`bi ${icon}`} aria-hidden="true" /> {label}
              </button>
            ))}
          </div>

          {message && <p className="forum-filter-note" role="status">{message}</p>}

          {view === 'audit' ? (
            <div className="forum-audit">
              {!audit && <p className="forum-muted">Loading…</p>}
              {audit?.length === 0 && <p className="forum-muted">No moderator actions yet.</p>}
              {audit?.map((a) => (
                <div key={a.id} className="forum-audit-row">
                  <span className="forum-pill">{a.action}</span>
                  <span><strong>{a.moderator}</strong> · {a.targetType}{a.meta?.days ? ` · ${a.meta.days} days` : ''}{a.meta?.to ? ` · moved to ${a.meta.to}` : ''}</span>
                  {a.reason && <em>“{a.reason}”</em>}
                  <small className="forum-muted">{formatDate(a.createdAt)} · {timeAgo(a.createdAt)}</small>
                </div>
              ))}
            </div>
          ) : (
            <div className="forum-queue">
              {!reports && <p className="forum-muted">Loading…</p>}
              {reports && grouped.length === 0 && (
                <div className="forum-empty"><span aria-hidden="true">✅</span><h3>Nothing here</h3><p>No {view} reports.</p></div>
              )}
              {grouped.map((r) => (
                <article key={r.id} className="forum-report">
                  <header>
                    {view === 'open' && <span className={`forum-pill ${r.reportCount > 2 ? 'locked' : ''}`}>{r.reportCount} report{r.reportCount === 1 ? '' : 's'}</span>}
                    <span className="forum-pill">{reasonLabel(r.reason)}</span>
                    <span className="forum-muted">{r.targetType} · reported by {r.reporter} · {timeAgo(r.createdAt)}</span>
                    <Link to={`/forum/${r.threadId}${r.targetType === 'reply' ? `#reply-${r.targetId}` : ''}`} target="_blank" rel="noreferrer">Open <i className="bi bi-box-arrow-up-right" aria-hidden="true" /></Link>
                  </header>
                  {r.detail && <p className="forum-report-detail">“{r.detail}”</p>}
                  {r.target ? (
                    <blockquote>
                      {r.target.title && <strong>{r.target.title}</strong>}
                      <p>{r.target.body}</p>
                      <small className="forum-muted">
                        by {r.target.author?.name} · status: {r.target.status}
                        {r.target.author?.mutedUntil && new Date(r.target.author.mutedUntil) > new Date() && ` · posting paused until ${formatDate(r.target.author.mutedUntil)}`}
                      </small>
                    </blockquote>
                  ) : <p className="forum-muted">The reported post no longer exists.</p>}

                  {view === 'open' ? (
                    <>
                      <input
                        type="text"
                        className="forum-reason"
                        placeholder="Reason (shown to the author and saved in the audit trail)"
                        value={reasons[r.id] || ''}
                        maxLength={300}
                        onChange={(e) => setReasons((x) => ({ ...x, [r.id]: e.target.value }))}
                      />
                      <div className="forum-modbar">
                        <button type="button" onClick={() => act({ targetType: 'report', targetId: r.id, action: 'dismiss' }, r)}>Dismiss (no action)</button>
                        {r.target && r.target.status === 'visible' && (
                          <>
                            <button type="button" onClick={() => act({ targetType: r.targetType, targetId: r.targetId, action: 'hide' }, r)}>Hide</button>
                            <button type="button" className="danger" onClick={() => act({ targetType: r.targetType, targetId: r.targetId, action: 'remove' }, r)}>Remove</button>
                          </>
                        )}
                        {r.targetType === 'thread' && r.target && (
                          <>
                            <button type="button" onClick={() => act({ targetType: 'thread', targetId: r.targetId, action: r.target.locked ? 'unlock' : 'lock' }, r)}>{r.target.locked ? 'Unlock' : 'Lock'}</button>
                            <select value="" aria-label="Move to category" onChange={(e) => e.target.value && act({ targetType: 'thread', targetId: r.targetId, action: 'move', category: e.target.value }, r)}>
                              <option value="">Move to…</option>
                              {config?.categories.filter((c) => c.id !== r.target.category).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                            </select>
                          </>
                        )}
                        {r.target?.author && (
                          <select value="" aria-label="Pause posting" onChange={(e) => e.target.value && act({ targetType: 'user', targetId: r.target.author.id, action: 'mute', days: e.target.value }, r)}>
                            <option value="">Pause author posting…</option>
                            {[1, 3, 7, 14, 30].map((d) => <option key={d} value={d}>{d} day{d === 1 ? '' : 's'}</option>)}
                          </select>
                        )}
                      </div>
                    </>
                  ) : (
                    <p className="forum-muted">
                      {r.status} by {r.reviewedBy || '—'}{r.resolution && `: ${r.resolution}`}
                    </p>
                  )}
                </article>
              ))}
            </div>
          )}
        </div>
      </main>
    </>
  );
}

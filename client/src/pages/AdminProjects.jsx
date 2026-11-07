import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import { apiRequest } from '../lib/api';
import { categoryOf } from '../lib/projects';
import { timeAgo } from '../lib/time';
import ProjectAnalytics from '../components/ProjectAnalytics';
import GuidedEditor from '../components/GuidedEditor';
import '../css/Projects.css';

const TABS = [
  ['pending_review', 'Pending review'],
  ['published', 'Published'],
  ['changes_requested', 'Changes requested'],
  ['rejected', 'Rejected'],
  ['archived', 'Unpublished'],
  ['analytics', 'Analytics'],
  ['guided', 'Guided projects'],
];
const QUEUE_TABS = ['pending_review', 'published', 'changes_requested', 'rejected', 'archived'];

const CHECKLIST = [
  'Explains the problem and what was built',
  'GitHub repository opens and matches the description',
  'Submitter\'s role is clear; collaborators credited',
  'Appropriate for a student showcase',
  'Links are safe and relevant',
  'License shown accurately; copied material attributed',
  'Screenshots readable, no secrets or personal data',
];

function ReviewCard({ p, onDone }) {
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const cat = categoryOf(p.category);

  const decide = async (decision) => {
    setBusy(true);
    setError('');
    try {
      await apiRequest(`/projects/admin/${p.id}/review`, { method: 'POST', body: JSON.stringify({ decision, note }) });
      onDone(`${p.title}: ${decision}`);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <article className="ap-card">
      <div className="ap-head">
        <div>
          <div className="ph-chips">
            <span className="ph-chip"><i className={`bi ${cat.icon}`} aria-hidden="true" /> {cat.label}</span>
            <span className="ph-chip">{p.level}</span>
            <span className="ph-chip">{p.sourceType}</span>
            {p.teamType === 'team' && <span className="ph-chip">Team</span>}
            {p.featured && <span className="ph-chip gold">Featured</span>}
          </div>
          <h2><Link to={`/projects/${p.slug}`}>{p.title}</Link></h2>
          <p className="ph-muted">by {p.owner?.name} ({p.ownerEmail}) · submitted {p.submittedAt ? timeAgo(p.submittedAt) : '—'}</p>
        </div>
        {p.cover && <img src={p.cover} alt="" className="ap-cover" />}
      </div>
      <p>{p.summary}</p>
      <dl className="pe-facts">
        <div><dt>Role</dt><dd>{p.contribution || '—'}</dd></div>
        <div><dt>Contributors</dt><dd>{p.contributors.map((c) => `${c.name}${c.role ? ` (${c.role})` : ''}`).join(', ') || '—'}</dd></div>
        <div><dt>Repository</dt><dd>{p.github ? <a href={p.github.url} target="_blank" rel="noopener noreferrer nofollow">{p.github.owner}/{p.github.repo}</a> : 'Not linked'}</dd></div>
        <div><dt>License</dt><dd>{p.github ? (p.github.license || 'No license detected') : '—'}</dd></div>
        <div><dt>Demo</dt><dd>{p.demoUrl ? <a href={p.demoUrl} target="_blank" rel="noopener noreferrer nofollow">{p.demoUrl}</a> : '—'}</dd></div>
        <div><dt>Authorship confirmed</dt><dd>{p.authorshipConfirmed ? 'Yes' : 'No'}</dd></div>
      </dl>
      <details>
        <summary>Reviewer checklist</summary>
        <ul className="pd-list">{CHECKLIST.map((c) => <li key={c}>{c}</li>)}</ul>
      </details>
      <textarea rows={2} value={note} onChange={(e) => setNote(e.target.value)} maxLength={1000} placeholder="Note for the student (required to request changes or reject)" aria-label="Review note" />
      <div className="ap-actions">
        {p.status !== 'published' && <button type="button" className="btn btn-gold" disabled={busy} onClick={() => decide('approve')}>Approve & publish</button>}
        {p.status === 'published' && (p.featured
          ? <button type="button" className="ph-btn" disabled={busy} onClick={() => decide('unfeature')}>Unfeature</button>
          : <button type="button" className="ph-btn" disabled={busy} onClick={() => decide('feature')}><i className="bi bi-star" aria-hidden="true" /> Feature</button>)}
        {p.status !== 'changes_requested' && <button type="button" className="ph-btn" disabled={busy} onClick={() => decide('changes')}>Request changes</button>}
        {p.status !== 'rejected' && <button type="button" className="ph-btn danger" disabled={busy} onClick={() => decide('reject')}>Reject</button>}
        {p.status === 'published' && <button type="button" className="ph-btn danger" disabled={busy} onClick={() => decide('archive')}>Unpublish</button>}
      </div>
      {error && <p className="ph-error">{error}</p>}
    </article>
  );
}

export default function AdminProjects() {
  const [tab, setTab] = useState('pending_review');
  const [data, setData] = useState(null);
  const [message, setMessage] = useState('');
  const [version, setVersion] = useState(0);
  const reload = useCallback(() => setVersion((v) => v + 1), []);

  useEffect(() => {
    if (!QUEUE_TABS.includes(tab)) return undefined;
    let cancelled = false;
    apiRequest(`/projects/admin/queue?status=${tab}`).then((r) => !cancelled && setData(r)).catch((e) => !cancelled && setMessage(e.message));
    return () => {
      cancelled = true;
    };
  }, [tab, version]);

  return (
    <>
      <Navbar />
      <main className="ph-page pe-page">
        <div className="container">
          <h1 className="ap-title"><i className="bi bi-kanban" aria-hidden="true" /> Project submissions</h1>
          <div className="ph-tabs" role="tablist">
            {TABS.map(([id, label]) => (
              <button key={id} type="button" role="tab" aria-selected={tab === id} className={tab === id ? 'active' : ''} onClick={() => { if (id !== tab) { setData(null); setTab(id); } }}>
                {label}{id === 'pending_review' && data?.counts.pending_review > 0 && <span className="ap-count">{data.counts.pending_review}</span>}
              </button>
            ))}
          </div>
          {message && <p className="ph-ok" role="status">{message}</p>}
          {tab === 'analytics' && <ProjectAnalytics />}
          {tab === 'guided' && <GuidedEditor />}
          {!QUEUE_TABS.includes(tab) ? null : !data ? <div className="ph-card ph-skeleton" /> : data.items.length === 0 ? <div className="ph-empty"><p>Nothing here.</p></div> : (
            <div className="ap-list">{data.items.map((p) => <ReviewCard key={p.id} p={p} onDone={(m) => { setMessage(m); reload(); }} />)}</div>
          )}
        </div>
      </main>
    </>
  );
}

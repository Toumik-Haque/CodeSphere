import { useEffect, useMemo, useState } from 'react';
import { apiRequest } from '../lib/api';
import BroadcastOptions from './BroadcastOptions';
import { SubmissionDetails, SubmissionLinks } from './HackathonSubmission';
import '../css/Hackathons.css';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
const fmt = (d) => (d ? new Date(d).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' }) : '');

const FILTERS = [
  { id: 'final', label: 'Submitted', test: (s) => s.status !== 'draft' },
  { id: 'new', label: 'To review', test: (s) => s.status !== 'draft' && s.review === 'new' },
  { id: 'shortlisted', label: 'Shortlisted', test: (s) => s.review === 'shortlisted' },
  { id: 'rejected', label: 'Rejected', test: (s) => s.review === 'rejected' },
  { id: 'draft', label: 'Drafts', test: (s) => s.status === 'draft' },
  { id: 'all', label: 'All', test: () => true },
];

const SORTS = {
  submitted: (a, b) => new Date(a.submittedAt || a.updatedAt) - new Date(b.submittedAt || b.updatedAt),
  score: (a, b) => (b.score ?? -1) - (a.score ?? -1),
  rank: (a, b) => (a.rank || 999) - (b.rank || 999),
};

const REVIEW_LABEL = { new: 'Not reviewed', shortlisted: 'Shortlisted', rejected: 'Rejected' };

// One submission: quick links, full write-up on demand, and the review form.
function ReviewCard({ s, onSave }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    review: s.review || 'new',
    score: s.score ?? '',
    rank: s.rank || '',
    award: s.award || '',
    judgeNote: s.judgeNote || '',
  });
  const [saving, setSaving] = useState(false);
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const save = async (e) => {
    e.preventDefault();
    setSaving(true);
    await onSave(s, form);
    setSaving(false);
  };

  return (
    <article className={`hk-review-card review-${s.review || 'new'} ${s.status === 'draft' ? 'is-draft' : ''}`}>
      <header>
        <div>
          <h4>{s.title}</h4>
          <p className="hk-muted">
            <i className="bi bi-people" aria-hidden="true" /> {s.team?.name}
            {s.team?.members?.length ? ` · ${s.team.members.map((m) => m.name).join(', ')}` : ''}
          </p>
        </div>
        <div className="hk-review-tags">
          {s.track && <span className="hk-chip">{s.track}</span>}
          {s.status === 'draft'
            ? <span className="hk-chip warn">Draft</span>
            : <span className="hk-chip ok" title={fmt(s.submittedAt)}>Submitted {fmt(s.submittedAt)}</span>}
          <span className={`hk-chip review-${s.review || 'new'}`}>{REVIEW_LABEL[s.review || 'new']}</span>
          {s.score != null && <span className="hk-chip score">{s.score}/100</span>}
        </div>
      </header>

      {s.tagline && <p className="hk-project-tagline">{s.tagline}</p>}
      <SubmissionLinks s={s} />

      <button type="button" className="hk-link-btn" onClick={() => setOpen((v) => !v)} aria-expanded={open}>
        <i className={`bi ${open ? 'bi-chevron-up' : 'bi-chevron-down'}`} aria-hidden="true" /> {open ? 'Hide' : 'View'} full submission
      </button>
      {open && (
        <div className="hk-review-body">
          {s.techStack?.length > 0 && <div className="hk-themes">{s.techStack.map((t) => <span key={t}>{t}</span>)}</div>}
          <SubmissionDetails s={s} withLinks={false} />
        </div>
      )}

      <form className="hk-review-form" onSubmit={save}>
        <div className="hk-review-seg" role="radiogroup" aria-label={`Review status for ${s.title}`}>
          {Object.entries(REVIEW_LABEL).map(([value, label]) => (
            <label key={value} className={form.review === value ? `on review-${value}` : ''}>
              <input type="radio" name={`review-${s.id}`} value={value} checked={form.review === value} onChange={set('review')} />
              {label}
            </label>
          ))}
        </div>
        <label>Score<input type="number" min="0" max="100" value={form.score} onChange={set('score')} placeholder="0–100" /></label>
        <label>Rank<input type="number" min="1" max="100" value={form.rank} onChange={set('rank')} placeholder="—" /></label>
        <label className="wide">Award<input value={form.award} onChange={set('award')} maxLength={80} placeholder="e.g. Winner, Best UI" /></label>
        <label className="full">Judge notes <small>(only organisers see these)</small>
          <textarea value={form.judgeNote} onChange={set('judgeNote')} rows={2} maxLength={2000} placeholder="Strengths, concerns, questions for the team…" />
        </label>
        <button type="submit" className="hk-btn" disabled={saving}>{saving ? 'Saving…' : 'Save review'}</button>
      </form>
    </article>
  );
}

// Teams, submissions, review and result publishing for one hackathon.
// Used by organisers and by students who host an approved hackathon.
export default function HackathonJudging({ id, onChanged = () => {}, showEmails = true }) {
  const [data, setData] = useState(null);
  const [msg, setMsg] = useState('');
  const [version, setVersion] = useState(0);
  const [filter, setFilter] = useState('final');
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState('submitted');
  const [showTeams, setShowTeams] = useState(false);
  const [broadcastOptions, setBroadcastOptions] = useState({ sendNotification: true, sendEmail: true });

  useEffect(() => {
    let cancelled = false;
    apiRequest(`/hackathons/admin/${id}`).then((r) => !cancelled && setData(r)).catch((e) => !cancelled && setMsg(e.message));
    return () => {
      cancelled = true;
    };
  }, [id, version]);

  const subs = useMemo(() => data?.submissions || [], [data]);
  const counts = useMemo(() => Object.fromEntries(FILTERS.map((f) => [f.id, subs.filter(f.test).length])), [subs]);
  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    const test = FILTERS.find((f) => f.id === filter).test;
    return subs
      .filter(test)
      .filter((s) => !q || `${s.title} ${s.team?.name} ${s.track} ${(s.techStack || []).join(' ')}`.toLowerCase().includes(q))
      .sort(SORTS[sort]);
  }, [subs, filter, query, sort]);

  if (!data) return <p className="hk-muted">{msg || 'Loading submissions…'}</p>;
  const h = data.hackathon;

  const saveReview = async (s, form) => {
    try {
      await apiRequest(`/hackathons/admin/submissions/${s.id}`, { method: 'PUT', body: JSON.stringify(form) });
      setMsg(`Saved review for "${s.title}".`);
      setVersion((v) => v + 1);
    } catch (e) {
      setMsg(e.message);
    }
  };

  const setResults = async (published) => {
    if (published && !window.confirm('Publish the results with the selected notification options?')) return;
    try {
      await apiRequest(`/hackathons/admin/${id}/results`, { method: 'POST', body: JSON.stringify({ published, ...broadcastOptions }) });
      setMsg(published ? 'Results published.' : 'Results hidden.');
      setVersion((v) => v + 1);
      onChanged();
    } catch (e) {
      setMsg(e.message);
    }
  };

  const downloadCsv = async () => {
    try {
      const response = await fetch(`${API_URL}/hackathons/admin/${id}/submissions.csv`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('codesphere_token')}` },
      });
      if (!response.ok) throw new Error('Could not download the spreadsheet.');
      const url = URL.createObjectURL(await response.blob());
      const link = document.createElement('a');
      link.href = url;
      link.download = `${h.slug || 'hackathon'}-submissions.csv`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      setMsg(e.message);
    }
  };

  return (
    <div className="hk-judging">
      <div className="hk-judge-stats">
        <div><strong>{data.teams.length}</strong><span>Teams</span></div>
        <div><strong>{counts.final}</strong><span>Submitted</span></div>
        <div><strong>{counts.draft}</strong><span>Drafts</span></div>
        <div><strong>{counts.shortlisted}</strong><span>Shortlisted</span></div>
      </div>

      <div className="hk-judging-head">
        <h3>Submissions</h3>
        <div className="hk-judge-actions">
          <button type="button" className="hk-btn" onClick={downloadCsv} disabled={!subs.length}>
            <i className="bi bi-download" aria-hidden="true" /> Download CSV
          </button>
          {h.resultsPublished
            ? <button type="button" className="hk-btn" onClick={() => setResults(false)}>Hide results</button>
            : <button type="button" className="btn btn-gold" onClick={() => setResults(true)}>Publish results</button>}
        </div>
      </div>
      {!h.resultsPublished && <BroadcastOptions value={broadcastOptions} onChange={setBroadcastOptions} />}
      {msg && <p className="hk-ok" role="status">{msg}</p>}

      <div className="hk-judge-toolbar">
        <div className="hk-judge-filters" role="tablist" aria-label="Filter submissions">
          {FILTERS.map((f) => (
            <button key={f.id} type="button" role="tab" aria-selected={filter === f.id} className={filter === f.id ? 'on' : ''} onClick={() => setFilter(f.id)}>
              {f.label} <span>{counts[f.id]}</span>
            </button>
          ))}
        </div>
        <div className="hk-judge-search">
          <input type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search project, team, tech…" aria-label="Search submissions" />
          <select value={sort} onChange={(e) => setSort(e.target.value)} aria-label="Sort submissions">
            <option value="submitted">First submitted</option>
            <option value="score">Highest score</option>
            <option value="rank">Rank</option>
          </select>
        </div>
      </div>

      {shown.length === 0
        ? <p className="hk-muted">{subs.length ? 'Nothing matches this filter.' : 'No submissions yet.'}</p>
        : shown.map((s) => <ReviewCard key={`${s.id}-${s.review}-${s.score}-${s.rank}`} s={s} onSave={saveReview} />)}

      <button type="button" className="hk-link-btn hk-teams-toggle" onClick={() => setShowTeams((v) => !v)} aria-expanded={showTeams}>
        <i className={`bi ${showTeams ? 'bi-chevron-up' : 'bi-chevron-down'}`} aria-hidden="true" /> All teams ({data.teams.length})
      </button>
      {showTeams && (
        <div className="hk-team-table">
          {data.teams.map((t) => (
            <div key={t.id}>
              <strong>{t.name}</strong>{' '}
              {t.submitted
                ? <span className="hk-chip ok">Submitted</span>
                : t.draft ? <span className="hk-chip warn">Draft</span> : <span className="hk-chip">No submission</span>}
              <p className="hk-muted">{t.members.map((m) => (showEmails && m.email ? `${m.name} (${m.email})` : m.name)).join(', ')}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

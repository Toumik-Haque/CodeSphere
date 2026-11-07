import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import { apiRequest } from '../lib/api';
import { PHASES, SOURCES } from '../lib/hackathons';
import { timeAgo } from '../lib/time';
import '../css/Hackathons.css';

// <input type="datetime-local"> wants local time without a zone.
const toLocal = (d) => {
  if (!d) return '';
  const date = new Date(d);
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
};
const fromLocal = (s) => (s ? new Date(s).toISOString() : '');

const EMPTY = {
  title: '', slug: '', tagline: '', description: '', rules: '', tracks: '', mode: 'online', venue: '', bannerUrl: '',
  regStart: '', regEnd: '', submissionStart: '', submissionEnd: '', teamMin: 1, teamMax: 4, status: 'draft',
  prizes: [{ title: 'Winner', reward: '' }],
};

const toForm = (h) => ({
  ...EMPTY,
  ...h,
  tracks: (h.tracks || []).join(', '),
  prizes: h.prizes?.length ? h.prizes.map(({ title, reward }) => ({ title, reward })) : EMPTY.prizes,
  regStart: toLocal(h.regStart),
  regEnd: toLocal(h.regEnd),
  submissionStart: toLocal(h.submissionStart),
  submissionEnd: toLocal(h.submissionEnd),
});

const toPayload = (f) => ({
  ...f,
  tracks: f.tracks.split(',').map((t) => t.trim()).filter(Boolean),
  prizes: f.prizes.filter((p) => p.title.trim()),
  regStart: fromLocal(f.regStart),
  regEnd: fromLocal(f.regEnd),
  submissionStart: fromLocal(f.submissionStart),
  submissionEnd: fromLocal(f.submissionEnd),
});

function Judging({ id, onChanged }) {
  const [data, setData] = useState(null);
  const [msg, setMsg] = useState('');
  const [version, setVersion] = useState(0);

  useEffect(() => {
    let cancelled = false;
    apiRequest(`/hackathons/admin/${id}`).then((r) => !cancelled && setData(r)).catch((e) => !cancelled && setMsg(e.message));
    return () => {
      cancelled = true;
    };
  }, [id, version]);

  if (!data) return <p className="hk-muted">{msg || 'Loading teams…'}</p>;
  const h = data.hackathon;

  const saveAward = async (s, award, rank) => {
    try {
      await apiRequest(`/hackathons/admin/submissions/${s.id}`, { method: 'PUT', body: JSON.stringify({ award, rank }) });
      setMsg(`Saved "${s.title}".`);
      setVersion((v) => v + 1);
    } catch (e) {
      setMsg(e.message);
    }
  };

  const setResults = async (published) => {
    if (published && !window.confirm('Publish results? Every participant will be notified.')) return;
    try {
      await apiRequest(`/hackathons/admin/${id}/results`, { method: 'POST', body: JSON.stringify({ published }) });
      setMsg(published ? 'Results published.' : 'Results hidden.');
      setVersion((v) => v + 1);
      onChanged();
    } catch (e) {
      setMsg(e.message);
    }
  };

  return (
    <div className="hk-judging">
      <div className="hk-judging-head">
        <h3>{data.teams.length} teams · {data.submissions.length} submissions</h3>
        {h.resultsPublished
          ? <button type="button" className="hk-btn" onClick={() => setResults(false)}>Hide results</button>
          : <button type="button" className="btn btn-gold" onClick={() => setResults(true)}>Publish results</button>}
      </div>
      {msg && <p className="hk-ok" role="status">{msg}</p>}

      <h4>Submissions</h4>
      {data.submissions.length === 0 && <p className="hk-muted">No submissions yet.</p>}
      {data.submissions.map((s) => (
        <form
          key={s.id}
          className="hk-judge-row"
          onSubmit={(e) => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget);
            saveAward(s, fd.get('award'), fd.get('rank'));
          }}
        >
          <div>
            <strong>{s.title}</strong> <span className="hk-muted">by {s.team?.name}</span>
            <div className="hk-project-links">
              {s.repoUrl && <a href={s.repoUrl} target="_blank" rel="noopener noreferrer nofollow">Code</a>}
              {s.demoUrl && <a href={s.demoUrl} target="_blank" rel="noopener noreferrer nofollow">Demo</a>}
              {s.videoUrl && <a href={s.videoUrl} target="_blank" rel="noopener noreferrer nofollow">Video</a>}
              {s.deckUrl && <a href={s.deckUrl} target="_blank" rel="noopener noreferrer nofollow">Slides</a>}
            </div>
          </div>
          <input name="rank" type="number" min="1" max="100" defaultValue={s.rank || ''} placeholder="Rank" aria-label={`Rank for ${s.title}`} />
          <input name="award" defaultValue={s.award} placeholder="Award (e.g. Winner)" maxLength={80} aria-label={`Award for ${s.title}`} />
          <button type="submit" className="hk-btn">Save</button>
        </form>
      ))}

      <h4>Teams</h4>
      <div className="hk-team-table">
        {data.teams.map((t) => (
          <div key={t.id}>
            <strong>{t.name}</strong> {t.submitted ? <span className="hk-chip ok">Submitted</span> : <span className="hk-chip">No submission</span>}
            <p className="hk-muted">{t.members.map((m) => `${m.name} (${m.email})`).join(', ')}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function AdminHackathons() {
  const [data, setData] = useState(null);
  const [form, setForm] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [judgingId, setJudgingId] = useState(null);
  const [message, setMessage] = useState('');
  const [syncing, setSyncing] = useState(false);
  const [version, setVersion] = useState(0);
  const reload = useCallback(() => setVersion((v) => v + 1), []);

  useEffect(() => {
    let cancelled = false;
    apiRequest('/hackathons/admin/all').then((r) => !cancelled && setData(r)).catch((e) => !cancelled && setMessage(e.message));
    return () => {
      cancelled = true;
    };
  }, [version]);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const setPrize = (i, k, v) => setForm((f) => ({ ...f, prizes: f.prizes.map((p, j) => (j === i ? { ...p, [k]: v } : p)) }));

  const open = (h) => {
    setForm(h ? toForm(h) : { ...EMPTY });
    setEditingId(h?.id || null);
    setJudgingId(null);
    setMessage('');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const save = async (status) => {
    try {
      const body = JSON.stringify({ ...toPayload(form), status: status || form.status });
      if (editingId) await apiRequest(`/hackathons/admin/${editingId}`, { method: 'PUT', body });
      else setEditingId((await apiRequest('/hackathons/admin', { method: 'POST', body })).id);
      setForm((f) => ({ ...f, status: status || f.status }));
      setMessage(status === 'published' ? 'Published.' : 'Saved.');
      reload();
    } catch (e) {
      setMessage(e.message);
    }
  };

  const remove = async () => {
    if (!window.confirm('Delete this hackathon, its teams and all submissions? This cannot be undone.')) return;
    try {
      await apiRequest(`/hackathons/admin/${editingId}`, { method: 'DELETE' });
      setForm(null);
      setEditingId(null);
      setMessage('Deleted.');
      reload();
    } catch (e) {
      setMessage(e.message);
    }
  };

  const syncNow = async () => {
    setSyncing(true);
    try {
      const { results } = await apiRequest('/hackathons/admin/sync', { method: 'POST' });
      setMessage(`Synced: ${results.map((r) => `${SOURCES[r.source]?.name || r.source} ${r.ok ? r.count : 'failed'}`).join(' · ')}`);
      reload();
    } catch (e) {
      setMessage(e.message);
    } finally {
      setSyncing(false);
    }
  };

  return (
    <>
      <Navbar />
      <main className="hk-page hk-admin">
        <div className="container">
          <div className="hk-admin-head">
            <h1><i className="bi bi-trophy" aria-hidden="true" /> Hackathons</h1>
            <div className="hk-form-actions">
              <Link to="/hackathons" className="hk-btn">View page</Link>
              <button type="button" className="btn btn-gold" onClick={() => open(null)}><i className="bi bi-plus-lg" aria-hidden="true" /> New hackathon</button>
            </div>
          </div>
          {message && <p className="hk-ok" role="status">{message}</p>}

          <section className="hk-panel hk-sync">
            <div>
              <strong>Live hackathons from other platforms</strong>
              <p className="hk-muted">
                Synced automatically every 6 hours.
                {data?.sync?.lastRunAt && <> Last run {timeAgo(data.sync.lastRunAt)}: {data.sync.results.map((r) => `${SOURCES[r.source]?.name || r.source} ${r.ok ? r.count : '✗'}`).join(' · ')}</>}
              </p>
            </div>
            <button type="button" className="hk-btn" onClick={syncNow} disabled={syncing}>
              <i className="bi bi-arrow-repeat" aria-hidden="true" /> {syncing ? 'Syncing…' : 'Sync now'}
            </button>
          </section>

          {form && (
            <form className="hk-panel hk-admin-form" onSubmit={(e) => { e.preventDefault(); save(); }}>
              <h2>{editingId ? 'Edit hackathon' : 'New hackathon'} {form.status === 'published' && <span className="hk-chip ok">Published</span>}</h2>
              <div className="hk-form-grid">
                <label>Title *<input value={form.title} onChange={set('title')} maxLength={120} required /></label>
                <label>URL slug<input value={form.slug} onChange={set('slug')} maxLength={80} placeholder="auto from title" /></label>
                <label className="wide">Tagline<input value={form.tagline} onChange={set('tagline')} maxLength={200} /></label>
                <label>Registration opens *<input type="datetime-local" value={form.regStart} onChange={set('regStart')} required /></label>
                <label>Registration closes *<input type="datetime-local" value={form.regEnd} onChange={set('regEnd')} required /></label>
                <label>Submissions open *<input type="datetime-local" value={form.submissionStart} onChange={set('submissionStart')} required /></label>
                <label>Submissions close *<input type="datetime-local" value={form.submissionEnd} onChange={set('submissionEnd')} required /></label>
                <label>Mode
                  <select value={form.mode} onChange={set('mode')}>
                    <option value="online">Online</option>
                    <option value="offline">In person</option>
                    <option value="hybrid">Hybrid</option>
                  </select>
                </label>
                <label>Venue<input value={form.venue} onChange={set('venue')} maxLength={200} placeholder="e.g. Seminar Hall, Block B" /></label>
                <label>Min team size<input type="number" min="1" max="10" value={form.teamMin} onChange={set('teamMin')} /></label>
                <label>Max team size<input type="number" min="1" max="10" value={form.teamMax} onChange={set('teamMax')} /></label>
                <label className="wide">Tracks (comma separated)<input value={form.tracks} onChange={set('tracks')} placeholder="AI for Good, Campus Life, Open Innovation" /></label>
                <label className="wide">Banner image link<input type="url" value={form.bannerUrl} onChange={set('bannerUrl')} placeholder="https://…" /></label>
                <label className="wide">About *<textarea rows={8} value={form.description} onChange={set('description')} placeholder="What is this hackathon about? Who can join? What should teams build?" /></label>
                <label className="wide">Rules<textarea rows={5} value={form.rules} onChange={set('rules')} /></label>
              </div>

              <h3>Prizes</h3>
              {form.prizes.map((p, i) => (
                <div key={i} className="hk-prize-row">
                  <input value={p.title} onChange={(e) => setPrize(i, 'title', e.target.value)} placeholder="Winner / Runner-up / Best UI" maxLength={80} aria-label="Prize title" />
                  <input value={p.reward} onChange={(e) => setPrize(i, 'reward', e.target.value)} placeholder="₹5,000 + goodies" maxLength={120} aria-label="Reward" />
                  <button type="button" className="hk-icon-btn" aria-label="Remove prize" onClick={() => setForm((f) => ({ ...f, prizes: f.prizes.filter((_, j) => j !== i) }))}><i className="bi bi-x-lg" /></button>
                </div>
              ))}
              <button type="button" className="hk-btn" onClick={() => setForm((f) => ({ ...f, prizes: [...f.prizes, { title: '', reward: '' }] }))}><i className="bi bi-plus" aria-hidden="true" /> Add prize</button>

              <div className="hk-form-actions">
                <button type="submit" className="hk-btn">Save draft</button>
                <button type="button" className="btn btn-gold" onClick={() => save('published')}>{form.status === 'published' ? 'Save & keep published' : 'Publish'}</button>
                {form.status === 'published' && <button type="button" className="hk-btn" onClick={() => save('draft')}>Unpublish</button>}
                {editingId && <button type="button" className="hk-link-danger" onClick={remove}>Delete</button>}
                <button type="button" className="hk-btn" onClick={() => setForm(null)}>Close</button>
              </div>
            </form>
          )}

          <div className="hk-admin-list">
            {data?.hackathons.length === 0 && <p className="hk-muted">No hackathons yet. Create the first one.</p>}
            {data?.hackathons.map((h) => (
              <div key={h.id} className="hk-admin-row">
                <div className="hk-admin-row-main">
                  <strong>{h.title}</strong>
                  <span className={`hk-phase tone-${h.status === 'draft' ? 'gray' : PHASES[h.phase]?.tone}`}>{h.status === 'draft' ? 'Draft' : PHASES[h.phase]?.label}</span>
                  <span className="hk-muted">{h.teams} teams · {h.submissions} submissions</span>
                  <div className="hk-form-actions">
                    <button type="button" className="hk-btn" onClick={() => open(h)}><i className="bi bi-pencil" aria-hidden="true" /> Edit</button>
                    <button type="button" className="hk-btn" onClick={() => setJudgingId(judgingId === h.id ? null : h.id)}><i className="bi bi-clipboard-check" aria-hidden="true" /> Teams & judging</button>
                    {h.status === 'published' && <Link className="hk-btn" to={`/hackathons/${h.slug}`}>Open</Link>}
                  </div>
                </div>
                {judgingId === h.id && <Judging id={h.id} onChanged={reload} />}
              </div>
            ))}
          </div>
        </div>
      </main>
    </>
  );
}

import { useEffect, useState } from 'react';
import { apiRequest } from '../lib/api';
import '../css/Hackathons.css';

// Teams, submissions, ranking and result publishing for one hackathon.
// Used by organisers and by students who host an approved hackathon.
export default function HackathonJudging({ id, onChanged = () => {}, showEmails = true }) {
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
            <p className="hk-muted">{t.members.map((m) => (showEmails && m.email ? `${m.name} (${m.email})` : m.name)).join(', ')}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import ProjectCard from '../components/ProjectCard';
import { useAuth } from '../context/AuthContext';
import { apiRequest } from '../lib/api';
import { categoryOf } from '../lib/projects';
import '../css/Projects.css';

export default function GuidedProject() {
  const { slug } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [links, setLinks] = useState({ repoUrl: '', demoUrl: '' });
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');

  const load = useCallback(() => {
    apiRequest(`/projects/guided/${encodeURIComponent(slug)}`)
      .then((r) => {
        setData(r);
        if (r.progress) setLinks({ repoUrl: r.progress.repoUrl, demoUrl: r.progress.demoUrl });
      })
      .catch((e) => setError(e.message));
  }, [slug]);
  useEffect(() => {
    load();
  }, [load]);

  const call = async (path, body, after) => {
    setBusy(true);
    setMsg('');
    try {
      const r = await apiRequest(`/projects/guided/${slug}/${path}`, { method: path === 'progress' ? 'PUT' : 'POST', body: body ? JSON.stringify(body) : undefined });
      if (after) after(r);
      else load();
    } catch (e) {
      setMsg(e.message);
    } finally {
      setBusy(false);
    }
  };

  const toggle = (key, done) => {
    // Optimistic tick.
    setData((d) => ({ ...d, progress: { ...d.progress, done: done ? [...d.progress.done, key] : d.progress.done.filter((k) => k !== key) } }));
    call('progress', { task: key, done }, (r) => setData((d) => ({ ...d, progress: { ...d.progress, ...r } })));
  };

  if (error) {
    return (
      <>
        <Navbar />
        <main className="ph-page"><div className="container ph-empty"><h3>{error}</h3><Link to="/projects?tab=guided">← Guided projects</Link></div></main>
        <Footer />
      </>
    );
  }
  if (!data) return (<><Navbar /><main className="ph-page"><div className="container"><div className="ph-card ph-skeleton" style={{ height: 320 }} /></div></main></>);

  const g = data.guided;
  const progress = data.progress;
  const cat = categoryOf(g.category);
  const done = new Set(progress?.done || []);
  const total = g.taskCount;
  const pct = Math.round((done.size / Math.max(1, total)) * 100);

  return (
    <>
      <Navbar />
      <main className="ph-page gp-page">
        <header className="pd-hero">
          <div className="container">
            <Link to="/projects?tab=guided" className="pd-back"><i className="bi bi-arrow-left" aria-hidden="true" /> Guided projects</Link>
            <div className="ph-chips">
              <span className="ph-chip on-dark"><i className={`bi ${cat.icon}`} aria-hidden="true" /> {cat.label}</span>
              <span className="ph-chip on-dark">{g.level}</span>
              <span className="ph-chip on-dark"><i className="bi bi-clock" aria-hidden="true" /> ~{g.estHours} hours</span>
            </div>
            <h1>{g.title}</h1>
            <p>{g.summary}</p>
            {progress ? (
              <div className="gp-progress">
                <span className="ph-progress large"><span style={{ width: `${pct}%` }} /></span>
                <strong>{done.size}/{total} tasks · {pct}%</strong>
              </div>
            ) : (
              <div className="pd-hero-actions">
                {user
                  ? <button type="button" className="btn btn-gold" disabled={busy} onClick={() => call('start')}><i className="bi bi-play-fill" aria-hidden="true" /> Start this project</button>
                  : <Link to="/login" className="btn btn-gold">Sign in to start</Link>}
              </div>
            )}
          </div>
        </header>

        <div className="container pd-layout">
          <div className="pd-main">
            <section className="pd-block">
              <h2>The brief</h2>
              <p className="pd-text">{g.problem}</p>
            </section>

            <section className="pd-block">
              <h2><i className="bi bi-signpost-2" aria-hidden="true" /> Roadmap</h2>
              <ol className="gp-milestones">
                {g.milestones.map((m, mi) => {
                  const mDone = m.tasks.every((_, ti) => done.has(`${mi}:${ti}`));
                  return (
                    <li key={m.title} className={mDone ? 'done' : ''}>
                      <h3><span>{mDone ? <i className="bi bi-check-lg" aria-hidden="true" /> : mi + 1}</span> {m.title}</h3>
                      {m.description && <p className="ph-muted">{m.description}</p>}
                      <ul>
                        {m.tasks.map((t, ti) => {
                          const key = `${mi}:${ti}`;
                          return (
                            <li key={key}>
                              <label>
                                <input type="checkbox" checked={done.has(key)} disabled={!progress || busy} onChange={(e) => toggle(key, e.target.checked)} />
                                <span>{t}</span>
                              </label>
                            </li>
                          );
                        })}
                      </ul>
                      {m.resources?.length > 0 && (
                        <p className="gp-resources">
                          <i className="bi bi-book" aria-hidden="true" /> {m.resources.map((r, i) => <span key={r.url}>{i > 0 && ' · '}<a href={r.url} target="_blank" rel="noopener noreferrer">{r.title}</a></span>)}
                        </p>
                      )}
                    </li>
                  );
                })}
              </ol>
            </section>

            {data.showcase.length > 0 && (
              <section className="pd-block">
                <h2>Built by students</h2>
                <div className="ph-grid">{data.showcase.map((p) => <ProjectCard key={p.id} p={p} />)}</div>
              </section>
            )}
          </div>

          <aside className="pd-side">
            <section className="pd-block">
              <h2>Before you start</h2>
              <ul className="pd-list">{g.prerequisites.map((x) => <li key={x}>{x}</li>)}</ul>
              <h3>You&apos;ll use</h3>
              <div className="ph-chips">{g.stack.map((s) => <span key={s} className="ph-chip">{s}</span>)}</div>
              <h3>You&apos;ll learn</h3>
              <ul className="pd-list">{g.outcomes.map((x) => <li key={x}>{x}</li>)}</ul>
              <p className="ph-muted">Need a refresher? <Link to="/materials">Study Guide</Link></p>
            </section>

            {progress && (
              <section className="pd-block">
                <h2>Your build</h2>
                <label className="pe-field"><span>Your GitHub repository</span>
                  <input type="url" value={links.repoUrl} onChange={(e) => setLinks((l) => ({ ...l, repoUrl: e.target.value }))} placeholder="https://github.com/you/project" />
                </label>
                <label className="pe-field"><span>Live demo</span>
                  <input type="url" value={links.demoUrl} onChange={(e) => setLinks((l) => ({ ...l, demoUrl: e.target.value }))} placeholder="https://…" />
                </label>
                <button type="button" className="ph-btn wide" disabled={busy} onClick={() => call('progress', links, () => setMsg('Links saved.'))}>Save links</button>
                <h3>When you&apos;re done</h3>
                <ul className="pd-list">{g.submissionCriteria.map((x) => <li key={x}>{x}</li>)}</ul>
                {progress.project
                  ? <Link to={`/projects/${progress.project}/edit`} className="btn btn-gold wide">Open your showcase draft</Link>
                  : (
                    <button type="button" className="btn btn-gold wide" disabled={busy || done.size === 0} onClick={() => call('submit', null, (r) => navigate(`/projects/${r.id}/edit`))}>
                      <i className="bi bi-send" aria-hidden="true" /> Submit to the Showcase
                    </button>
                  )}
                <small className="ph-muted">Creates a draft with your links; you add screenshots and your story, then submit it for review.</small>
                {msg && <p className="ph-ok" role="status">{msg}</p>}
              </section>
            )}
          </aside>
        </div>
      </main>
      <Footer />
    </>
  );
}

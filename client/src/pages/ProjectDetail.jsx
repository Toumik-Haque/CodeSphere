import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { apiRequest } from '../lib/api';
import { STATUS, categoryOf } from '../lib/projects';
import { formatDate, timeAgo } from '../lib/time';
import '../css/Projects.css';

const UPDATE_KINDS = {
  built: { label: 'Built', icon: 'bi-hammer' },
  learned: { label: 'Learned', icon: 'bi-lightbulb' },
  blocker: { label: 'Blocker', icon: 'bi-cone-striped' },
  next: { label: 'Next', icon: 'bi-arrow-right-circle' },
};

function Updates({ project }) {
  const [items, setItems] = useState(null);
  const [form, setForm] = useState({ kind: 'built', body: '', link: '' });
  const [error, setError] = useState('');
  const [version, setVersion] = useState(0);

  useEffect(() => {
    let cancelled = false;
    apiRequest(`/projects/${project.id}/updates`).then((r) => !cancelled && setItems(r.updates)).catch(() => !cancelled && setItems([]));
    return () => {
      cancelled = true;
    };
  }, [project.id, version]);

  const post = async (e) => {
    e.preventDefault();
    setError('');
    try {
      await apiRequest(`/projects/${project.id}/updates`, { method: 'POST', body: JSON.stringify(form) });
      setForm({ kind: 'built', body: '', link: '' });
      setVersion((v) => v + 1);
    } catch (err) {
      setError(err.message);
    }
  };

  const remove = async (id) => {
    if (!window.confirm('Delete this update?')) return;
    await apiRequest(`/projects/${project.id}/updates/${id}`, { method: 'DELETE' });
    setVersion((v) => v + 1);
  };

  if (!items) return null;
  if (!items.length && !project.canEdit) return null;

  return (
    <section className="pd-block">
      <h2><i className="bi bi-broadcast" aria-hidden="true" /> Build in Public</h2>
      {project.canEdit && (
        <form className="pd-update-form" onSubmit={post}>
          <div className="pd-kinds" role="radiogroup" aria-label="Update type">
            {Object.entries(UPDATE_KINDS).map(([id, k]) => (
              <button key={id} type="button" role="radio" aria-checked={form.kind === id} className={form.kind === id ? 'active' : ''} onClick={() => setForm((f) => ({ ...f, kind: id }))}>
                <i className={`bi ${k.icon}`} aria-hidden="true" /> {k.label}
              </button>
            ))}
          </div>
          <textarea rows={3} value={form.body} onChange={(e) => setForm((f) => ({ ...f, body: e.target.value }))} maxLength={2000} placeholder="What did you build or learn? What's blocking you? What's next?" aria-label="Update" />
          <div className="pd-update-row">
            <input type="url" value={form.link} onChange={(e) => setForm((f) => ({ ...f, link: e.target.value }))} placeholder="Optional link (commit, PR, demo…)" aria-label="Link" />
            <button type="submit" className="btn btn-gold">Post update</button>
          </div>
          {error && <p className="ph-error">{error}</p>}
        </form>
      )}
      {items.length === 0 ? <p className="ph-muted">No updates yet. Share your progress as you build.</p> : (
        <ol className="pd-updates">
          {items.map((u) => (
            <li key={u.id}>
              <span className={`pd-kind kind-${u.kind}`}><i className={`bi ${UPDATE_KINDS[u.kind]?.icon}`} aria-hidden="true" /> {UPDATE_KINDS[u.kind]?.label}</span>
              <p>{u.body}</p>
              <small>
                {u.author?.name} · {timeAgo(u.createdAt)}
                {u.link && <> · <a href={u.link} target="_blank" rel="noopener noreferrer nofollow">link</a></>}
                {(u.mine || project.canReview) && <> · <button type="button" className="ph-linkbtn" onClick={() => remove(u.id)}>Delete</button></>}
              </small>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}

export default function ProjectDetail() {
  const { slug } = useParams();
  const [project, setProject] = useState(null);
  const [error, setError] = useState('');
  const [shot, setShot] = useState(null);

  const load = useCallback(() => {
    apiRequest(`/projects/${encodeURIComponent(slug)}`).then((r) => setProject(r.project)).catch((e) => setError(e.message));
  }, [slug]);
  useEffect(() => {
    load();
  }, [load]);

  if (error) {
    return (
      <>
        <Navbar />
        <main className="ph-page"><div className="container ph-empty"><h3>{error}</h3><Link to="/projects">← Project Hub</Link></div></main>
        <Footer />
      </>
    );
  }

  const p = project;
  const cat = p && categoryOf(p.category);
  const st = p && STATUS[p.status];

  return (
    <>
      <Navbar />
      <main className="ph-page pd-page">
        {!p ? <div className="container"><div className="ph-card ph-skeleton" style={{ height: 360 }} /></div> : (
          <>
            <header className="pd-hero" style={p.cover ? { '--cover': `url("${encodeURI(p.cover)}")` } : undefined}>
              <div className="container">
                <Link to="/projects" className="pd-back"><i className="bi bi-arrow-left" aria-hidden="true" /> Project Hub</Link>
                {p.status !== 'published' && st && <span className={`ph-status tone-${st.tone}`}><i className={`bi ${st.icon}`} aria-hidden="true" /> {st.label}: only you{p.canReview ? ' and reviewers' : ''} can see this</span>}
                <div className="ph-chips">
                  <span className="ph-chip on-dark"><i className={`bi ${cat.icon}`} aria-hidden="true" /> {cat.label}</span>
                  <span className="ph-chip on-dark">{p.level}</span>
                  <span className="ph-chip on-dark">{p.teamType === 'team' ? 'Team project' : 'Individual'}</span>
                  <span className="ph-chip on-dark">{{ prototype: 'Prototype', 'in-progress': 'In progress', completed: 'Completed', archived: 'Archived' }[p.projectStatus]}</span>
                  {p.featured && <span className="ph-chip on-dark gold"><i className="bi bi-star-fill" aria-hidden="true" /> Featured</span>}
                </div>
                <h1>{p.title}</h1>
                {p.summary && <p>{p.summary}</p>}
                <div className="pd-hero-actions">
                  {p.demoUrl && <a href={p.demoUrl} target="_blank" rel="noopener noreferrer nofollow" className="btn btn-gold"><i className="bi bi-box-arrow-up-right" aria-hidden="true" /> Live demo</a>}
                  {p.github?.url && <a href={p.github.url} target="_blank" rel="noopener noreferrer nofollow" className="pd-ghost"><i className="bi bi-github" aria-hidden="true" /> View source on GitHub</a>}
                  {p.videoUrl && <a href={p.videoUrl} target="_blank" rel="noopener noreferrer nofollow" className="pd-ghost"><i className="bi bi-play-circle" aria-hidden="true" /> Demo video</a>}
                  {p.canEdit && <Link to={`/projects/${p.id}/edit`} className="pd-ghost"><i className="bi bi-pencil" aria-hidden="true" /> Edit</Link>}
                </div>
                <p className="pd-by">
                  Built by <strong>{p.owner?.name}</strong>
                  {p.contributors.length > 1 && <> and {p.contributors.length - 1} more</>}
                  {p.publishedAt && <> · published {formatDate(p.publishedAt)}</>}
                  {p.guided && <> · from the guided project <Link to={`/projects/guided/${p.guided.slug}`}>{p.guided.title}</Link></>}
                </p>
              </div>
            </header>

            <div className="container pd-layout">
              <div className="pd-main">
                {(p.problem || p.solution) && (
                  <section className="pd-block">
                    <h2>Project story</h2>
                    {p.problem && <><h3>The problem</h3><p className="pd-text">{p.problem}</p></>}
                    {p.solution && <><h3>What it does</h3><p className="pd-text">{p.solution}</p></>}
                    {p.features?.length > 0 && <><h3>Key features</h3><ul className="pd-list">{p.features.map((f) => <li key={f}>{f}</li>)}</ul></>}
                  </section>
                )}

                {p.screenshots.length > 0 && (
                  <section className="pd-block">
                    <h2>Screenshots</h2>
                    <div className="pd-shots">
                      {p.screenshots.map((s) => (
                        <button key={s.id} type="button" onClick={() => setShot(s)} aria-label="Open screenshot"><img src={s.url} alt={s.caption || `${p.title} screenshot`} loading="lazy" /></button>
                      ))}
                    </div>
                  </section>
                )}

                {(p.contribution || p.outcomes || p.limitations) && (
                  <section className="pd-block">
                    {p.contribution && <><h2>Role & contribution</h2><p className="pd-text">{p.contribution}</p></>}
                    {p.outcomes && <><h3>What I learned</h3><p className="pd-text">{p.outcomes}</p></>}
                    {p.limitations && <><h3>Limitations & next steps</h3><p className="pd-text">{p.limitations}</p></>}
                  </section>
                )}

                {p.github?.readmePreview && (
                  <section className="pd-block">
                    <h2><i className="bi bi-book" aria-hidden="true" /> README preview</h2>
                    <p className="pd-readme">{p.github.readmePreview}</p>
                    <a href={`${p.github.url}#readme`} target="_blank" rel="noopener noreferrer nofollow">Read the full README on GitHub →</a>
                  </section>
                )}

                <Updates project={p} />
              </div>

              <aside className="pd-side">
                <section className="pd-block">
                  <h2>Tech stack</h2>
                  <div className="ph-chips">{p.techStack.map((t) => <span key={t} className="ph-chip">{t}</span>)}</div>
                  {p.tags?.length > 0 && <div className="ph-chips">{p.tags.map((t) => <span key={t} className="ph-chip topic">#{t}</span>)}</div>}
                </section>
                {p.contributors.length > 0 && (
                  <section className="pd-block">
                    <h2>Contributors</h2>
                    <ul className="pd-people">{p.contributors.map((c, i) => <li key={`${c.name}-${i}`}><strong>{c.name}</strong>{c.role && <span>{c.role}</span>}</li>)}</ul>
                  </section>
                )}
                {p.github && (
                  <section className="pd-block">
                    <h2>Source & license</h2>
                    <dl className="pe-facts">
                      <div><dt>Repository</dt><dd><a href={p.github.url} target="_blank" rel="noopener noreferrer nofollow">{p.github.owner}/{p.github.repo}</a></dd></div>
                      <div><dt>License</dt><dd>{p.github.license ? p.github.licenseName || p.github.license : 'No license detected'}</dd></div>
                      {p.github.languages?.length > 0 && <div><dt>Languages</dt><dd>{p.github.languages.join(', ')}</dd></div>}
                      <div><dt>Stars · Forks</dt><dd>{p.github.stars} · {p.github.forks}</dd></div>
                      <div><dt>Last synced</dt><dd>{p.lastSyncedAt ? timeAgo(p.lastSyncedAt) : timeAgo(p.github.fetchedAt)}</dd></div>
                    </dl>
                  </section>
                )}
                <p className="pd-disclaimer">Featured status highlights student work; it is not a security review. Spot a problem? Contact the CodeSphere team.</p>
              </aside>
            </div>

            {shot && (
              <div className="pd-lightbox" role="dialog" aria-modal="true" aria-label="Screenshot" onClick={() => setShot(null)}>
                <img src={shot.url} alt={shot.caption || 'Screenshot'} />
                <button type="button" aria-label="Close" onClick={() => setShot(null)}><i className="bi bi-x-lg" /></button>
              </div>
            )}
          </>
        )}
      </main>
      <Footer />
    </>
  );
}

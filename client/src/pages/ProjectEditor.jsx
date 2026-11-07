import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { useAuth } from '../context/AuthContext';
import { apiRequest } from '../lib/api';
import { CATEGORIES, LEVELS, STATUS } from '../lib/projects';
import { timeAgo } from '../lib/time';
import '../css/Projects.css';

const EMPTY = {
  title: '', summary: '', problem: '', solution: '', features: '', contribution: '', outcomes: '', limitations: '',
  category: 'web', level: 'Beginner', projectStatus: 'completed', teamType: 'individual', contributors: [],
  techStack: '', tags: '', demoUrl: '', videoUrl: '', visibility: 'public', authorshipConfirmed: false,
};

// Guess a CodeSphere domain from GitHub languages/topics.
function guessCategory(repo) {
  const t = [...repo.languages, ...repo.topics].join(' ').toLowerCase();
  if (/machine-learning|deep-learning|ai|ml|tensorflow|pytorch|jupyter/.test(t)) return 'ai-ml';
  if (/android|kotlin|swift|flutter|dart|react-native|ios/.test(t)) return 'mobile';
  if (/docker|kubernetes|terraform|devops|aws|hcl/.test(t)) return 'cloud-devops';
  if (/arduino|iot|esp32|raspberry/.test(t)) return 'iot';
  if (/algorithm|data-structures|dsa|leetcode|competitive/.test(t)) return 'dsa';
  if (/data|pandas|analysis|visuali/.test(t)) return 'data';
  if (/javascript|typescript|html|css|react|vue|node|web/.test(t)) return 'web';
  return 'other';
}

function GithubPreview({ repo, warnings }) {
  return (
    <div className="pe-preview">
      <div className="pe-preview-head">
        <i className="bi bi-github" aria-hidden="true" />
        <div>
          <strong>{repo.owner}/{repo.repo}</strong>
          <a href={repo.url} target="_blank" rel="noopener noreferrer nofollow">{repo.url}</a>
        </div>
      </div>
      {repo.description && <p>{repo.description}</p>}
      <div className="ph-chips">
        {repo.languages.map((l) => <span key={l} className="ph-chip">{l}</span>)}
        {repo.topics.map((t) => <span key={t} className="ph-chip topic">#{t}</span>)}
      </div>
      <dl className="pe-facts">
        <div><dt>License</dt><dd>{repo.license || 'No license detected'}</dd></div>
        <div><dt>Stars · Forks</dt><dd>{repo.stars} · {repo.forks}</dd></div>
        <div><dt>Last push</dt><dd>{repo.pushedAt ? timeAgo(repo.pushedAt) : '—'}</dd></div>
        <div><dt>Fetched</dt><dd>{timeAgo(repo.fetchedAt)}</dd></div>
      </dl>
      {repo.readmePreview && (
        <details>
          <summary>README preview</summary>
          <p className="pe-readme">{repo.readmePreview}</p>
        </details>
      )}
      {warnings?.length > 0 && <ul className="pe-warnings">{warnings.map((w) => <li key={w}><i className="bi bi-info-circle" aria-hidden="true" /> {w}</li>)}</ul>}
    </div>
  );
}

function Field({ label, hint, required, wide, children }) {
  return (
    <label className={`pe-field ${wide ? 'wide' : ''}`}>
      <span>{label}{required && <em aria-hidden="true"> *</em>}</span>
      {children}
      {hint && <small>{hint}</small>}
    </label>
  );
}

export default function ProjectEditor() {
  const { id } = useParams();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [mode, setMode] = useState(id ? 'edit' : params.get('mode') === 'manual' ? 'manual' : 'github');
  const [url, setUrl] = useState('');
  const [preview, setPreview] = useState(null);
  const [fetching, setFetching] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [project, setProject] = useState(null);
  const [problems, setProblems] = useState([]);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);

  // Editing: load the project.
  useEffect(() => {
    if (!id) return undefined;
    let cancelled = false;
    apiRequest(`/projects/edit/${id}`)
      .then((r) => {
        if (cancelled) return;
        const p = r.project;
        setProject(p);
        setProblems(r.problems);
        setForm({
          ...EMPTY,
          ...Object.fromEntries(Object.keys(EMPTY).map((k) => [k, p[k] ?? EMPTY[k]])),
          features: (p.features || []).join('\n'),
          techStack: (p.techStack || []).join(', '),
          tags: (p.tags || []).join(', '),
          contributors: p.contributors || [],
        });
      })
      .catch((e) => !cancelled && setError(e.message));
    return () => {
      cancelled = true;
    };
  }, [id]);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }));
  const setContributor = (i, k, v) => setForm((f) => ({ ...f, contributors: f.contributors.map((c, j) => (j === i ? { ...c, [k]: v } : c)) }));

  const fetchPreview = async (e) => {
    e.preventDefault();
    setFetching(true);
    setError('');
    try {
      const r = await apiRequest('/projects/github/preview', { method: 'POST', body: JSON.stringify({ url }) });
      setPreview(r);
      const repo = r.repository;
      setForm((f) => ({
        ...f,
        title: f.title || repo.repo.replace(/[-_]+/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
        summary: f.summary || repo.description.slice(0, 280),
        techStack: f.techStack || repo.languages.join(', '),
        tags: f.tags || repo.topics.join(', '),
        demoUrl: f.demoUrl || repo.homepage,
        category: f.category === EMPTY.category ? guessCategory(repo) : f.category,
        contributors: f.contributors.length ? f.contributors : [{ name: user?.name || '', role: 'Author' }],
      }));
    } catch (err) {
      setError(err.message);
    } finally {
      setFetching(false);
    }
  };

  const payload = () => ({
    ...form,
    features: form.features.split('\n').map((s) => s.trim()).filter(Boolean),
    techStack: form.techStack.split(',').map((s) => s.trim()).filter(Boolean),
    tags: form.tags.split(',').map((s) => s.trim()).filter(Boolean),
  });

  const save = async (andSubmit = false) => {
    setBusy(true);
    setError('');
    setMessage('');
    try {
      let projectId = id;
      if (id) {
        const r = await apiRequest(`/projects/${id}`, { method: 'PUT', body: JSON.stringify(payload()) });
        setProblems(r.problems);
      } else {
        const r = await apiRequest('/projects', { method: 'POST', body: JSON.stringify({ ...payload(), githubUrl: mode === 'github' ? preview?.repository.url : '' }) });
        projectId = r.id;
      }
      if (andSubmit) {
        await apiRequest(`/projects/${projectId}/submit`, { method: 'POST' });
        navigate('/projects?tab=mine');
        return;
      }
      if (!id) {
        navigate(`/projects/${projectId}/edit`, { replace: true });
        return;
      }
      setMessage('Saved.');
      const fresh = await apiRequest(`/projects/edit/${projectId}`);
      setProject(fresh.project);
      setProblems(fresh.problems);
    } catch (err) {
      setError(err.data?.problems ? `${err.message} ${err.data.problems.join(' ')}` : err.message);
    } finally {
      setBusy(false);
    }
  };

  const upload = async (file, kind) => {
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      setError('Images must be 2 MB or smaller.');
      return;
    }
    setUploading(true);
    setError('');
    try {
      const fd = new FormData();
      fd.append('image', file, file.name);
      const r = await apiRequest(`/projects/${id}/media?kind=${kind}`, { method: 'POST', body: fd });
      setProject((p) => ({ ...p, cover: r.cover, screenshots: r.screenshots }));
    } catch (err) {
      setError(err.message);
    } finally {
      setUploading(false);
    }
  };

  const removeMedia = async (mediaId) => {
    const r = await apiRequest(`/projects/${id}/media/${mediaId}`, { method: 'DELETE' });
    setProject((p) => ({ ...p, cover: r.cover, screenshots: r.screenshots }));
  };

  const action = async (path, confirmText, after) => {
    if (confirmText && !window.confirm(confirmText)) return;
    setError('');
    try {
      const r = await apiRequest(`/projects/${id}/${path}`, { method: path === '' ? 'DELETE' : 'POST' });
      after?.(r);
    } catch (err) {
      setError(err.message);
    }
  };

  const showForm = mode !== 'github' || preview || id;
  const st = project && STATUS[project.status];

  return (
    <>
      <Navbar />
      <main className="ph-page pe-page">
        <div className="container">
          <Link to="/projects?tab=mine" className="pe-back"><i className="bi bi-arrow-left" aria-hidden="true" /> My projects</Link>
          <header className="pe-head">
            <h1>{id ? 'Edit project' : mode === 'github' ? 'Showcase a project you\'ve already built' : 'Add a project manually'}</h1>
            {!id && (
              <p>
                {mode === 'github'
                  ? 'Paste a public GitHub repository link. We fetch the repository details; you add the story, screenshots and demo, then submit it for review.'
                  : 'Describe your project, add screenshots and links, then submit it for review.'}
              </p>
            )}
            {st && <span className={`ph-status tone-${st.tone}`}><i className={`bi ${st.icon}`} aria-hidden="true" /> {st.label}</span>}
          </header>

          {project?.reviewNote && ['changes_requested', 'rejected'].includes(project.status) && (
            <div className="pe-review-note"><strong>Reviewer&apos;s note</strong><p>{project.reviewNote}</p></div>
          )}

          {!id && (
            <div className="ph-tabs pe-mode" role="tablist">
              <button type="button" role="tab" aria-selected={mode === 'github'} className={mode === 'github' ? 'active' : ''} onClick={() => setMode('github')}><i className="bi bi-github" aria-hidden="true" /> Import from GitHub</button>
              <button type="button" role="tab" aria-selected={mode === 'manual'} className={mode === 'manual' ? 'active' : ''} onClick={() => setMode('manual')}><i className="bi bi-pencil-square" aria-hidden="true" /> Manual</button>
            </div>
          )}

          {mode === 'github' && !id && (
            <form className="pe-card pe-import" onSubmit={fetchPreview}>
              <label htmlFor="gh-url">GitHub repository URL</label>
              <div className="pe-import-row">
                <input id="gh-url" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://github.com/owner/repository" maxLength={300} required />
                <button type="submit" className="btn btn-gold" disabled={fetching}>{fetching ? 'Fetching…' : 'Fetch project details'}</button>
              </div>
              <small>Public repositories only. We read the repository details and README. Your code stays on GitHub.</small>
              {preview?.duplicate && (
                <p className="ph-error">
                  {preview.duplicate.own
                    ? <>You have already added this repository. <Link to={`/projects/${preview.duplicate.id}/edit`}>Open it</Link>.</>
                    : <>This repository is already on CodeSphere as <Link to={`/projects/${preview.duplicate.slug}`}>{preview.duplicate.title}</Link>. Ask its owner to credit you.</>}
                </p>
              )}
              {preview && <GithubPreview repo={preview.repository} warnings={preview.warnings} />}
            </form>
          )}

          {id && project?.github && (
            <div className="pe-card">
              <GithubPreview repo={{ ...project.github, repo: project.github.repo, fetchedAt: project.github.fetchedAt }} />
              <div className="ap-actions">
                <button type="button" className="ph-btn" onClick={() => action('sync', null, (r) => setProject((p) => ({ ...p, github: { ...p.github, ...r.github }, lastSyncedAt: r.lastSyncedAt })))}>
                  <i className="bi bi-arrow-repeat" aria-hidden="true" /> Refresh from GitHub
                </button>
                {project.ownershipVerified
                  ? <span className="pd-verified"><i className="bi bi-patch-check-fill" aria-hidden="true" /> Verified {project.ownershipVerified.kind} (@{project.ownershipVerified.login})</span>
                  : (
                    <button type="button" className="ph-btn" onClick={() => action('verify-github', null, (r) => setProject((p) => ({ ...p, ownershipVerified: r.ownershipVerified })))}>
                      <i className="bi bi-patch-check" aria-hidden="true" /> Verify with GitHub
                    </button>
                  )}
              </div>
              {!project.ownershipVerified && <small className="ph-muted">Verification needs your GitHub account connected (My projects → Connect GitHub).</small>}
            </div>
          )}

          {error && <p className="ph-error" role="alert">{error}</p>}
          {message && <p className="ph-ok" role="status">{message}</p>}

          {showForm && !(preview?.duplicate) && (
            <form className="pe-layout" onSubmit={(e) => { e.preventDefault(); save(false); }}>
              <div className="pe-main">
                <section className="pe-card">
                  <h2>Basics</h2>
                  <div className="pe-grid">
                    <Field label="Project title" required wide><input value={form.title} onChange={set('title')} maxLength={100} /></Field>
                    <Field label="One-line summary" required wide hint={`${form.summary.length}/280`}><input value={form.summary} onChange={set('summary')} maxLength={280} placeholder="What it is, in one sentence" /></Field>
                    <Field label="Domain"><select value={form.category} onChange={set('category')}>{CATEGORIES.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}</select></Field>
                    <Field label="Level"><select value={form.level} onChange={set('level')}>{LEVELS.map((l) => <option key={l}>{l}</option>)}</select></Field>
                    <Field label="Status"><select value={form.projectStatus} onChange={set('projectStatus')}>
                      <option value="prototype">Prototype</option><option value="in-progress">In progress</option><option value="completed">Completed</option><option value="archived">Archived</option>
                    </select></Field>
                    <Field label="Visibility" hint="Unlisted: only people with the link"><select value={form.visibility} onChange={set('visibility')}>
                      <option value="public">Public (in the Showcase)</option><option value="unlisted">Unlisted</option>
                    </select></Field>
                  </div>
                </section>

                <section className="pe-card">
                  <h2>Project story</h2>
                  <div className="pe-grid">
                    <Field label="Problem" wide hint="Who is it for, and what problem does it solve?"><textarea rows={3} value={form.problem} onChange={set('problem')} maxLength={3000} /></Field>
                    <Field label="What it does" required wide hint="Your solution and how it works (50+ characters)"><textarea rows={5} value={form.solution} onChange={set('solution')} maxLength={5000} /></Field>
                    <Field label="Key features" wide hint="One per line"><textarea rows={4} value={form.features} onChange={set('features')} /></Field>
                    <Field label="Your role / contribution" required wide hint="What did you personally build?"><textarea rows={3} value={form.contribution} onChange={set('contribution')} maxLength={1500} /></Field>
                    <Field label="What you learned" wide><textarea rows={3} value={form.outcomes} onChange={set('outcomes')} maxLength={1500} /></Field>
                    <Field label="Known limitations / next steps" wide><textarea rows={2} value={form.limitations} onChange={set('limitations')} maxLength={1500} /></Field>
                  </div>
                </section>

                <section className="pe-card">
                  <h2>Tech & links</h2>
                  <div className="pe-grid">
                    <Field label="Tech stack" required wide hint="Comma separated"><input value={form.techStack} onChange={set('techStack')} placeholder="React, Node.js, MongoDB" /></Field>
                    <Field label="Tags" wide hint="Comma separated"><input value={form.tags} onChange={set('tags')} placeholder="campus, productivity" /></Field>
                    <Field label="Live demo"><input type="url" value={form.demoUrl} onChange={set('demoUrl')} placeholder="https://…" /></Field>
                    <Field label="Demo video"><input type="url" value={form.videoUrl} onChange={set('videoUrl')} placeholder="https://youtu.be/…" /></Field>
                  </div>
                </section>

                <section className="pe-card">
                  <h2>Team & credits</h2>
                  <div className="pe-grid">
                    <Field label="Project type"><select value={form.teamType} onChange={set('teamType')}><option value="individual">Individual</option><option value="team">Team</option></select></Field>
                  </div>
                  {form.contributors.map((c, i) => (
                    <div key={i} className="pe-contrib">
                      <input value={c.name} onChange={(e) => setContributor(i, 'name', e.target.value)} placeholder="Name" maxLength={80} aria-label="Contributor name" />
                      <input value={c.role} onChange={(e) => setContributor(i, 'role', e.target.value)} placeholder="Role (Frontend, ML, Design…)" maxLength={80} aria-label="Role" />
                      <button type="button" aria-label="Remove" onClick={() => setForm((f) => ({ ...f, contributors: f.contributors.filter((_, j) => j !== i) }))}><i className="bi bi-x-lg" /></button>
                    </div>
                  ))}
                  <button type="button" className="ph-btn" onClick={() => setForm((f) => ({ ...f, contributors: [...f.contributors, { name: '', role: '' }] }))}><i className="bi bi-person-plus" aria-hidden="true" /> Add contributor</button>
                  <label className="pe-confirm">
                    <input type="checkbox" checked={form.authorshipConfirmed} onChange={set('authorshipConfirmed')} />
                    <span>I built or contributed to this project, I have permission to showcase it, and everyone who worked on it is credited above.</span>
                  </label>
                </section>

                {id ? (
                  <section className="pe-card">
                    <h2>Cover & screenshots</h2>
                    <div className="pe-media">
                      <div className="pe-cover" style={project?.cover ? { backgroundImage: `url("${encodeURI(project.cover)}")` } : undefined}>
                        {!project?.cover && <span>No cover yet</span>}
                        <label className="ph-btn">
                          <input type="file" accept="image/jpeg,image/png,image/webp,image/gif" hidden onChange={(e) => { upload(e.target.files[0], 'cover'); e.target.value = ''; }} disabled={uploading} />
                          <i className="bi bi-image" aria-hidden="true" /> {project?.cover ? 'Change cover' : 'Upload cover'}
                        </label>
                        {project?.cover && <button type="button" className="ph-btn danger" onClick={() => removeMedia('cover')}>Remove</button>}
                      </div>
                      <div className="pe-shots">
                        {project?.screenshots?.map((s) => (
                          <figure key={s.id}>
                            <img src={s.url} alt="Screenshot" />
                            <button type="button" aria-label="Remove screenshot" onClick={() => removeMedia(s.id)}><i className="bi bi-x" /></button>
                          </figure>
                        ))}
                        {(project?.screenshots?.length || 0) < 6 && (
                          <label className="pe-shot-add">
                            <input type="file" accept="image/jpeg,image/png,image/webp,image/gif" hidden onChange={(e) => { upload(e.target.files[0], 'screenshot'); e.target.value = ''; }} disabled={uploading} />
                            <i className={`bi ${uploading ? 'bi-hourglass-split' : 'bi-plus-lg'}`} aria-hidden="true" /> Screenshot
                          </label>
                        )}
                      </div>
                      <small>Don&apos;t include passwords, keys or personal data in screenshots. Up to 6 images, 2 MB each.</small>
                    </div>
                  </section>
                ) : (
                  <p className="pe-hint"><i className="bi bi-info-circle" aria-hidden="true" /> Save the draft first, then you can add a cover and screenshots.</p>
                )}
              </div>

              <aside className="pe-side">
                <div className="pe-card">
                  <h2>Ready for review?</h2>
                  {id ? (
                    problems.length ? (
                      <ul className="pe-checklist">{problems.map((p) => <li key={p}><i className="bi bi-circle" aria-hidden="true" /> {p}</li>)}</ul>
                    ) : <p className="ph-ok">Everything needed is there. 🎉</p>
                  ) : <p className="ph-muted">Save a draft to see what&apos;s still needed.</p>}
                  <button type="submit" className="ph-btn wide" disabled={busy}><i className="bi bi-save" aria-hidden="true" /> {busy ? 'Saving…' : 'Save draft'}</button>
                  {(!project || ['draft', 'changes_requested', 'archived'].includes(project.status)) && (
                    <button type="button" className="btn btn-gold wide" disabled={busy} onClick={() => save(true)}>Submit for review</button>
                  )}
                  {project?.status === 'published' && <p className="ph-muted">Saving changes sends the project back for a quick review.</p>}
                  {project && (
                    <div className="pe-danger">
                      <Link to={`/projects/${project.slug}`} className="ph-btn wide">Preview page</Link>
                      {project.status === 'published' && (
                        <button type="button" className="ph-btn wide" onClick={() => action('unpublish', 'Remove this project from the Showcase? You can resubmit later.', () => setProject((p) => ({ ...p, status: 'draft' })))}>Unpublish</button>
                      )}
                      <button type="button" className="ph-btn danger wide" onClick={() => action('', 'Delete this CodeSphere listing? Your GitHub repository is not touched.', () => navigate('/projects?tab=mine'))}>Delete listing</button>
                    </div>
                  )}
                </div>
              </aside>
            </form>
          )}
        </div>
      </main>
      <Footer />
    </>
  );
}

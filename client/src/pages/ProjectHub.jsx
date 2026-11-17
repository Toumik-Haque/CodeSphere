import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { useAuth } from '../context/AuthContext';
import { apiRequest } from '../lib/api';
import { CATEGORIES, LEVELS, categoryOf } from '../lib/projects';
import { timeAgo } from '../lib/time';
import ProjectCard from '../components/ProjectCard';
import GithubConnect from '../components/GithubConnect';
import '../css/Projects.css';

const GUIDED_PAGE = 24;

function GuidedCard({ g }) {
  const cat = categoryOf(g.category);
  const pct = g.progress ? Math.round((g.progress.done / Math.max(1, g.progress.total)) * 100) : 0;
  return (
    <article className="ph-guided">
      <div className="ph-chips">
        <span className="ph-chip"><i className={`bi ${cat.icon}`} aria-hidden="true" /> {cat.label}</span>
        <span className={`ph-chip level-${g.level.toLowerCase()}`}>{g.level}</span>
        <span className="ph-chip"><i className="bi bi-clock" aria-hidden="true" /> ~{g.estHours} h</span>
      </div>
      <h3><Link to={`/projects/guided/${g.slug}`} className="ph-stretch">{g.title}</Link></h3>
      <p className="ph-summary">{g.summary}</p>
      <p className="ph-stack">{g.stack.join(' · ')}</p>
      <div className="ph-guided-foot">
        <span>{g.milestoneCount} milestones · {g.taskCount} tasks</span>
        {g.progress
          ? <span className="ph-progress"><span style={{ width: `${pct}%` }} /><em>{g.progress.completedAt ? 'Completed' : `${pct}%`}</em></span>
          : <span className="ph-start">Start <i className="bi bi-arrow-right" aria-hidden="true" /></span>}
      </div>
    </article>
  );
}

export default function ProjectHub() {
  const { user } = useAuth();
  const [params, setParams] = useSearchParams();
  const tab = params.get('tab') || 'showcase';
  const category = params.get('category') || '';
  const level = params.get('level') || '';
  const q = params.get('q') || '';
  const [search, setSearch] = useState(q);
  const [showcase, setShowcase] = useState(null);
  const [featured, setFeatured] = useState([]);
  const [guided, setGuided] = useState(null);
  const [guidedShown, setGuidedShown] = useState(GUIDED_PAGE);
  const [mine, setMine] = useState(null);
  const [error, setError] = useState('');

  const update = (changes) => {
    const next = new URLSearchParams(params);
    Object.entries(changes).forEach(([k, v]) => (v ? next.set(k, v) : next.delete(k)));
    setParams(next, { replace: true });
  };

  useEffect(() => {
    apiRequest('/projects?featured=1').then((r) => setFeatured(r.items.slice(0, 3))).catch(() => {});
    apiRequest('/projects/track', { method: 'POST', body: JSON.stringify({ name: 'project_hub_viewed' }) }).catch(() => {});
  }, []);

  const [invites, setInvites] = useState([]);
  useEffect(() => {
    if (!user) return undefined;
    let cancelled = false;
    apiRequest('/projects/team/invites').then((r) => !cancelled && setInvites(r.invites)).catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [user]);

  useEffect(() => {
    let cancelled = false;
    const query = new URLSearchParams();
    if (category) query.set('category', category);
    if (level) query.set('level', level);
    if (tab === 'showcase') {
      if (q) query.set('q', q);
      apiRequest(`/projects?${query}`).then((r) => !cancelled && setShowcase(r)).catch((e) => !cancelled && setError(e.message));
    } else if (tab === 'guided') {
      if (q) query.set('q', q);
      apiRequest(`/projects/guided?${query}`).then((r) => {
        if (cancelled) return;
        setGuided(r.items);
        setGuidedShown(GUIDED_PAGE);
      }).catch((e) => !cancelled && setError(e.message));
    } else if (tab === 'mine' && user) {
      apiRequest('/projects/mine').then((r) => !cancelled && setMine(r)).catch((e) => !cancelled && setError(e.message));
    }
    return () => {
      cancelled = true;
    };
  }, [tab, category, level, q, user]);

  const tabs = [
    { id: 'showcase', label: 'Showcase', icon: 'bi-grid-3x3-gap' },
    { id: 'guided', label: 'Guided projects', icon: 'bi-signpost-split' },
    ...(user ? [{ id: 'mine', label: 'My projects', icon: 'bi-person-workspace' }] : []),
  ];

  return (
    <>
      <Navbar />
      <main className="ph-page">
        <section className="ph-hero">
          <div className="container">
            <span className="ph-eyebrow"><i className="bi bi-rocket-takeoff" aria-hidden="true" /> PROJECT HUB</span>
            <h1>Don&apos;t just learn to code.<br /><span className="gold-text">Build something worth sharing.</span></h1>
            <p>Start a guided project with clear milestones, or import a project you&apos;ve already built from GitHub and showcase it to the whole community.</p>
            <div className="ph-actions">
              <button type="button" className="ph-action" onClick={() => update({ tab: 'guided' })}>
                <i className="bi bi-signpost-split" aria-hidden="true" />
                <span><strong>Start a guided project</strong><small>Step-by-step milestones</small></span>
              </button>
              <Link to={user ? '/projects/new?mode=github' : '/login'} className="ph-action primary">
                <i className="bi bi-github" aria-hidden="true" />
                <span><strong>Import from GitHub</strong><small>Paste a repo link</small></span>
              </Link>
              <Link to={user ? '/projects/new?mode=manual' : '/login'} className="ph-action">
                <i className="bi bi-pencil-square" aria-hidden="true" />
                <span><strong>Add manually</strong><small>Not on GitHub? No problem</small></span>
              </Link>
            </div>
          </div>
        </section>

        <div className="container">
          {featured.length > 0 && tab === 'showcase' && !category && !level && !q && (
            <section className="ph-section">
              <h2><i className="bi bi-star-fill" aria-hidden="true" /> Featured projects</h2>
              <div className="ph-grid">{featured.map((p) => <ProjectCard key={p.id} p={p} />)}</div>
            </section>
          )}

          <div className="ph-toolbar">
            <div className="ph-tabs" role="tablist">
              {tabs.map((t) => (
                <button key={t.id} type="button" role="tab" aria-selected={tab === t.id} className={tab === t.id ? 'active' : ''} onClick={() => update({ tab: t.id === 'showcase' ? '' : t.id })}>
                  <i className={`bi ${t.icon}`} aria-hidden="true" /> {t.label}
                </button>
              ))}
            </div>
            {tab !== 'mine' && (
              <div className="ph-filters">
                {(tab === 'showcase' || tab === 'guided') && (
                  <form role="search" onSubmit={(e) => { e.preventDefault(); update({ q: search.trim() }); }} className="ph-search">
                    <i className="bi bi-search" aria-hidden="true" />
                    <input type="search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder={tab === 'guided' ? 'Search guided projects, topics…' : 'Search projects, stacks…'} aria-label="Search projects" maxLength={80} />
                  </form>
                )}
                <select value={category} onChange={(e) => update({ category: e.target.value })} aria-label="Domain">
                  <option value="">All domains</option>
                  {CATEGORIES.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
                </select>
                <select value={level} onChange={(e) => update({ level: e.target.value })} aria-label="Level">
                  <option value="">All levels</option>
                  {LEVELS.map((l) => <option key={l}>{l}</option>)}
                </select>
              </div>
            )}
          </div>

          {error && <p className="ph-error" role="alert">{error}</p>}

          {tab === 'showcase' && (
            !showcase ? <div className="ph-grid">{[1, 2, 3].map((i) => <div key={i} className="ph-card ph-skeleton" />)}</div>
              : showcase.items.length === 0 ? (
                <div className="ph-empty">
                  <span aria-hidden="true">🛠️</span>
                  <h3>No projects here yet</h3>
                  <p>Be the first: import a project from GitHub or add one manually.</p>
                </div>
              ) : <div className="ph-grid">{showcase.items.map((p) => <ProjectCard key={p.id} p={p} />)}</div>
          )}

          {tab === 'guided' && (
            !guided ? <div className="ph-grid">{[1, 2, 3].map((i) => <div key={i} className="ph-card ph-skeleton" />)}</div>
              : guided.length === 0 ? <div className="ph-empty"><p>No guided projects match.</p></div>
                : (
                  <>
                    <p className="ph-muted">{guided.length} guided project{guided.length === 1 ? '' : 's'}</p>
                    <div className="ph-grid">{guided.slice(0, guidedShown).map((g) => <GuidedCard key={g.id} g={g} />)}</div>
                    {guided.length > guidedShown && (
                      <div className="ph-more">
                        <button type="button" className="ph-btn" onClick={() => setGuidedShown((n) => n + GUIDED_PAGE)}>
                          Show more ({guided.length - guidedShown} left)
                        </button>
                      </div>
                    )}
                  </>
                )
          )}

          {tab === 'mine' && user && (
            !mine ? <div className="ph-card ph-skeleton" /> : (
              <>
                <GithubConnect outcome={params.get('github')} />
                {invites.length > 0 && (
                  <section className="ph-invites">
                    <h2 className="ph-h2"><i className="bi bi-envelope-open" aria-hidden="true" /> Team invitations</h2>
                    {invites.map((i) => (
                      <Link key={i.projectId} to={`/projects/${i.slug}`} className="ph-invite">
                        <strong>{i.title}</strong>
                        <span>{i.owner?.name} invited you as {i.role}: open to accept or decline</span>
                      </Link>
                    ))}
                  </section>
                )}
                <h2 className="ph-h2">Your projects</h2>
                {mine.projects.length === 0
                  ? <div className="ph-empty"><p>Nothing yet. Import a project from GitHub or add one manually.</p></div>
                  : (
                    <div className="ph-mine">
                      {mine.projects.map((p) => (
                        <div key={p.id} className="ph-mine-row">
                          <ProjectCard p={p} showStatus />
                          <div className="ph-mine-actions">
                            <Link to={`/projects/${p.id}/edit`} className="ph-btn"><i className="bi bi-pencil" aria-hidden="true" /> Edit</Link>
                            <Link to={`/projects/${p.slug}`} className="ph-btn">View</Link>
                            <small>Updated {timeAgo(p.updatedAt)}</small>
                          </div>
                          {p.reviewNote && ['changes_requested', 'rejected'].includes(p.status) && <p className="ph-note">Reviewer: {p.reviewNote}</p>}
                        </div>
                      ))}
                    </div>
                  )}
                <h2 className="ph-h2">Guided projects in progress</h2>
                {mine.guided.length === 0
                  ? <div className="ph-empty"><p>You haven&apos;t started a guided project yet.</p></div>
                  : <div className="ph-grid">{mine.guided.map((g) => <GuidedCard key={g.id} g={g} />)}</div>}
              </>
            )
          )}
        </div>
      </main>
      <Footer />
    </>
  );
}

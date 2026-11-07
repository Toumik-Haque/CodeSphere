import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import SafeText from '../components/SafeText';
import HackathonJudging from '../components/HackathonJudging';
import { useAuth } from '../context/AuthContext';
import { apiRequest } from '../lib/api';
import { countdown, isPast, PHASES } from '../lib/hackathons';
import '../css/Hackathons.css';

const fmt = (d) => new Date(d).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });
const EMPTY_SUB = { title: '', tagline: '', description: '', track: '', techStack: '', repoUrl: '', demoUrl: '', videoUrl: '', deckUrl: '' };

function Timeline({ h }) {
  const steps = [
    { label: 'Registration opens', at: h.regStart },
    { label: 'Submissions open', at: h.submissionStart },
    { label: 'Registration closes', at: h.regEnd },
    { label: 'Submissions close', at: h.submissionEnd },
  ].sort((a, b) => new Date(a.at) - new Date(b.at));
  return (
    <ol className="hk-timeline">
      {steps.map((s) => (
        <li key={s.label} className={isPast(s.at) ? 'done' : ''}>
          <strong>{s.label}</strong>
          <span>{fmt(s.at)}</span>
        </li>
      ))}
      <li className={h.resultsPublished ? 'done' : ''}><strong>Results</strong><span>{h.resultsPublished ? 'Published' : 'After judging'}</span></li>
    </ol>
  );
}

function ProjectCard({ s, showAward }) {
  return (
    <article className={`hk-project ${showAward && s.rank ? `rank-${Math.min(s.rank, 4)}` : ''}`}>
      {showAward && s.award && <span className="hk-award"><i className="bi bi-award-fill" aria-hidden="true" /> {s.award}</span>}
      <h3>{s.title}</h3>
      {s.tagline && <p className="hk-project-tagline">{s.tagline}</p>}
      {s.team && <p className="hk-project-team"><i className="bi bi-people" aria-hidden="true" /> {s.team.name} · {s.team.members.map((m) => m.name).join(', ')}</p>}
      {s.track && <span className="hk-chip">{s.track}</span>}
      {s.techStack?.length > 0 && <div className="hk-themes">{s.techStack.map((t) => <span key={t}>{t}</span>)}</div>}
      <details>
        <summary>About the project</summary>
        <div className="hk-project-desc"><SafeText text={s.description} /></div>
      </details>
      <div className="hk-project-links">
        {s.repoUrl && <a href={s.repoUrl} target="_blank" rel="noopener noreferrer nofollow"><i className="bi bi-github" aria-hidden="true" /> Code</a>}
        {s.demoUrl && <a href={s.demoUrl} target="_blank" rel="noopener noreferrer nofollow"><i className="bi bi-play-circle" aria-hidden="true" /> Live demo</a>}
        {s.videoUrl && <a href={s.videoUrl} target="_blank" rel="noopener noreferrer nofollow"><i className="bi bi-camera-video" aria-hidden="true" /> Video</a>}
        {s.deckUrl && <a href={s.deckUrl} target="_blank" rel="noopener noreferrer nofollow"><i className="bi bi-file-earmark-slides" aria-hidden="true" /> Slides</a>}
      </div>
    </article>
  );
}

function TeamPanel({ h, team, reload, slug }) {
  const { user } = useAuth();
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);

  const call = async (path, options, done) => {
    setBusy(true);
    setMsg('');
    try {
      const r = await apiRequest(`/hackathons/${slug}${path}`, options);
      if (done) done(r);
      reload();
    } catch (e) {
      setMsg(e.message);
    } finally {
      setBusy(false);
    }
  };

  if (!user) {
    return (
      <section className="hk-panel">
        <h2><i className="bi bi-people" aria-hidden="true" /> Your team</h2>
        <p>Sign in to create or join a team.</p>
        <Link to="/login" className="btn btn-gold">Sign in</Link>
      </section>
    );
  }

  if (!team) {
    return (
      <section className="hk-panel">
        <h2><i className="bi bi-people" aria-hidden="true" /> Your team</h2>
        {!h.canRegister ? (
          <p>{h.phase === 'upcoming' ? `Registration opens ${fmt(h.regStart)}.` : 'Registration is closed.'}</p>
        ) : (
          <>
            <p className="hk-muted">Teams of {h.teamMin === h.teamMax ? h.teamMax : `${h.teamMin} to ${h.teamMax}`}. Going solo? Create a team of one{h.teamMin > 1 ? ' and invite others' : ''}.</p>
            <form onSubmit={(e) => { e.preventDefault(); call('/teams', { method: 'POST', body: JSON.stringify({ name }) }); }} className="hk-inline-form">
              <label htmlFor="team-name">Create a team</label>
              <div>
                <input id="team-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Team name" maxLength={60} required />
                <button type="submit" className="btn btn-gold" disabled={busy}>Create</button>
              </div>
            </form>
            <div className="hk-or"><span>or</span></div>
            <form onSubmit={(e) => { e.preventDefault(); call('/teams/join', { method: 'POST', body: JSON.stringify({ code }) }); }} className="hk-inline-form">
              <label htmlFor="team-code">Join with an invite code</label>
              <div>
                <input id="team-code" value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder="e.g. 4F9A2C7B1E" maxLength={20} required />
                <button type="submit" className="hk-btn" disabled={busy}>Join</button>
              </div>
            </form>
          </>
        )}
        {msg && <p className="hk-error" role="alert">{msg}</p>}
      </section>
    );
  }

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(team.inviteCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* ignore */
    }
  };

  return (
    <section className="hk-panel">
      <h2><i className="bi bi-people-fill" aria-hidden="true" /> {team.name}</h2>
      <ul className="hk-members">
        {team.members.map((m) => (
          <li key={m.id}>
            <span className="hk-avatar" aria-hidden="true">{m.initials}</span>
            <span>{m.name}{m.id === team.leaderId && <em> · Leader</em>}{m.id === String(user._id || user.id) && <em> · You</em>}</span>
            {team.isLeader && m.id !== team.leaderId && h.canChangeTeam && (
              <button type="button" className="hk-icon-btn" title={`Remove ${m.name}`} aria-label={`Remove ${m.name}`} disabled={busy}
                onClick={() => window.confirm(`Remove ${m.name} from the team?`) && call(`/teams/members/${m.id}`, { method: 'DELETE' })}>
                <i className="bi bi-x-lg" aria-hidden="true" />
              </button>
            )}
          </li>
        ))}
      </ul>
      <p className="hk-muted">{team.members.length} of {h.teamMax} members{team.members.length < h.teamMin && ` · need ${h.teamMin - team.members.length} more to submit`}</p>
      {h.canRegister && team.members.length < h.teamMax && (
        <div className="hk-invite">
          <span>Invite code</span>
          <code>{team.inviteCode}</code>
          <button type="button" className="hk-btn" onClick={copy}>{copied ? 'Copied!' : 'Copy'}</button>
        </div>
      )}
      {h.canChangeTeam && (
        <button type="button" className="hk-link-danger" disabled={busy}
          onClick={() => window.confirm(team.members.length === 1 ? 'Leave and delete this team (and its submission)?' : 'Leave this team?') && call('/teams/leave', { method: 'POST' })}>
          Leave team
        </button>
      )}
      {msg && <p className="hk-error" role="alert">{msg}</p>}
    </section>
  );
}

function SubmissionForm({ h, team, submission, slug, reload }) {
  const [form, setForm] = useState(() => (submission ? { ...EMPTY_SUB, ...submission, techStack: (submission.techStack || []).join(', ') } : EMPTY_SUB));
  const [editing, setEditing] = useState(!submission);
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  if (!team) return null;
  if (submission && !editing) {
    return (
      <section className="hk-panel hk-submitted">
        <h2><i className="bi bi-check-circle-fill" aria-hidden="true" /> Project submitted</h2>
        <ProjectCard s={submission} showAward={h.resultsPublished} />
        {h.canSubmit && <button type="button" className="hk-btn" onClick={() => setEditing(true)}><i className="bi bi-pencil" aria-hidden="true" /> Edit submission</button>}
        {msg && <p className="hk-ok" role="status">{msg}</p>}
      </section>
    );
  }
  if (!h.canSubmit) {
    return (
      <section className="hk-panel">
        <h2><i className="bi bi-upload" aria-hidden="true" /> Submission</h2>
        <p>{!isPast(h.submissionStart) ? `Submissions open ${fmt(h.submissionStart)}. Start building!` : 'Submissions are closed.'}</p>
      </section>
    );
  }
  const tooSmall = team.members.length < h.teamMin;

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setMsg('');
    try {
      const r = await apiRequest(`/hackathons/${slug}/submission`, { method: 'PUT', body: JSON.stringify(form) });
      setMsg(r.message);
      setEditing(false);
      reload();
    } catch (err) {
      setMsg(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <form className="hk-panel hk-submit-form" onSubmit={submit}>
      <h2><i className="bi bi-upload" aria-hidden="true" /> {submission ? 'Edit your project' : 'Submit your project'}</h2>
      <p className="hk-muted">Closes {fmt(h.submissionEnd)} ({countdown(h.submissionEnd)}). Any team member can edit until then.</p>
      {tooSmall && <p className="hk-error">Your team needs at least {h.teamMin} members before you can submit.</p>}
      <div className="hk-form-grid">
        <label>Project name *<input value={form.title} onChange={set('title')} maxLength={100} required /></label>
        <label>One-line pitch<input value={form.tagline} onChange={set('tagline')} maxLength={200} placeholder="What does it do, in one sentence?" /></label>
        {h.tracks.length > 0 && (
          <label>Track
            <select value={form.track} onChange={set('track')}>
              <option value="">Choose a track</option>
              {h.tracks.map((t) => <option key={t}>{t}</option>)}
            </select>
          </label>
        )}
        <label>Tech stack<input value={form.techStack} onChange={set('techStack')} placeholder="React, Node, MongoDB" /></label>
        <label className="wide">Description *
          <textarea value={form.description} onChange={set('description')} rows={7} maxLength={8000} required
            placeholder={'The problem, your solution, how it works, and what you would build next.'} />
        </label>
        <label>GitHub / code link<input type="url" value={form.repoUrl} onChange={set('repoUrl')} placeholder="https://github.com/…" /></label>
        <label>Live demo / prototype<input type="url" value={form.demoUrl} onChange={set('demoUrl')} placeholder="https://… (Vercel, Figma, etc.)" /></label>
        <label>Demo video<input type="url" value={form.videoUrl} onChange={set('videoUrl')} placeholder="https://youtu.be/…" /></label>
        <label>Slides / pitch deck<input type="url" value={form.deckUrl} onChange={set('deckUrl')} placeholder="https://…" /></label>
      </div>
      <p className="hk-muted">Add at least one of: code, live demo or video.</p>
      <div className="hk-form-actions">
        <button type="submit" className="btn btn-gold" disabled={busy || tooSmall}>{busy ? 'Saving…' : submission ? 'Save changes' : 'Submit project'}</button>
        {submission && <button type="button" className="hk-btn" onClick={() => setEditing(false)}>Cancel</button>}
      </div>
      {msg && <p className="hk-error" role="alert">{msg}</p>}
    </form>
  );
}

export default function HackathonDetail() {
  const { slug } = useParams();
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [version, setVersion] = useState(0);
  const reload = useCallback(() => setVersion((v) => v + 1), []);

  useEffect(() => {
    let cancelled = false;
    apiRequest(`/hackathons/${encodeURIComponent(slug)}`)
      .then((r) => !cancelled && setData(r))
      .catch((e) => !cancelled && setError(e.message));
    return () => {
      cancelled = true;
    };
  }, [slug, version]);

  if (error) {
    return (
      <>
        <Navbar />
        <main className="hk-page hk-detail"><div className="container"><div className="hk-empty"><h3>{error}</h3><Link to="/hackathons">← All hackathons</Link></div></div></main>
        <Footer />
      </>
    );
  }

  const h = data?.hackathon;
  const phase = h && (PHASES[h.phase] || PHASES.upcoming);

  return (
    <>
      <Navbar />
      <main className="hk-page hk-detail">
        {!h ? (
          <div className="container"><div className="hk-club-card hk-skeleton" style={{ height: 320 }} /></div>
        ) : (
          <>
            <header className="hk-detail-hero" style={h.bannerUrl ? { '--banner': `url("${encodeURI(h.bannerUrl)}")` } : undefined}>
              <div className="container">
                <Link to="/hackathons" className="hk-back"><i className="bi bi-arrow-left" aria-hidden="true" /> All hackathons</Link>
                <span className={`hk-phase tone-${phase.tone}`}>{phase.label}</span>
                <h1>{h.title}</h1>
                {h.tagline && <p>{h.tagline}</p>}
                {h.origin === 'community' && h.hostName && (
                  <p className="hk-hosted">
                    <i className="bi bi-people" aria-hidden="true" /> Hosted by <strong>{h.hostName}</strong>
                    {[['bi-linkedin', 'LinkedIn', h.linkedinPostLink], ['bi-instagram', 'Instagram', h.instagramPostLink], ['bi-globe2', 'Website', h.websiteLink]]
                      .filter(([, , url]) => url)
                      .map(([icon, label, url]) => (
                        <a key={label} href={url} target="_blank" rel="noopener noreferrer nofollow" aria-label={label}><i className={`bi ${icon}`} aria-hidden="true" /></a>
                      ))}
                  </p>
                )}
                <div className="hk-stats">
                  <span><strong>{h.teams}</strong> teams</span>
                  <span><strong>{h.submissions}</strong> projects</span>
                  <span><strong>{h.teamMin === h.teamMax ? h.teamMax : `${h.teamMin}–${h.teamMax}`}</strong> per team</span>
                  <span><i className={`bi ${h.mode === 'online' ? 'bi-globe2' : 'bi-geo-alt'}`} aria-hidden="true" /> {h.mode === 'online' ? 'Online' : h.venue || h.mode}</span>
                </div>
              </div>
            </header>

            <div className="container hk-detail-layout">
              <div className="hk-detail-main">
                {data.gallery.length > 0 && (
                  <section className="hk-block">
                    <h2>{h.resultsPublished ? '🏆 Winners & projects' : 'Project gallery'}</h2>
                    {!h.resultsPublished && <p className="hk-muted">Judging is in progress. Results will appear here.</p>}
                    <div className="hk-projects">{data.gallery.map((s) => <ProjectCard key={s.id} s={s} showAward={h.resultsPublished} />)}</div>
                  </section>
                )}

                {h.description && (
                  <section className="hk-block">
                    <h2>About</h2>
                    <div className="hk-prose"><SafeText text={h.description} /></div>
                  </section>
                )}

                {h.tracks.length > 0 && (
                  <section className="hk-block">
                    <h2>Tracks</h2>
                    <div className="hk-tracks">{h.tracks.map((t) => <span key={t}><i className="bi bi-signpost-split" aria-hidden="true" /> {t}</span>)}</div>
                  </section>
                )}

                {h.prizes.length > 0 && (
                  <section className="hk-block">
                    <h2>Prizes</h2>
                    <div className="hk-prizes">
                      {h.prizes.map((p, i) => (
                        <div key={`${p.title}-${i}`} className={`hk-prize-card p${Math.min(i + 1, 4)}`}>
                          <span aria-hidden="true">{['🥇', '🥈', '🥉'][i] || '🎁'}</span>
                          <strong>{p.title}</strong>
                          {p.reward && <small>{p.reward}</small>}
                        </div>
                      ))}
                    </div>
                  </section>
                )}

                {h.rules && (
                  <section className="hk-block">
                    <h2>Rules</h2>
                    <div className="hk-prose"><SafeText text={h.rules} /></div>
                  </section>
                )}
              </div>

              <aside className="hk-detail-side">
                {h.canManage && (
                  <section className="hk-panel">
                    <h2><i className="bi bi-clipboard-check" aria-hidden="true" /> You host this</h2>
                    <p className="hk-muted">Manage teams, rank projects and publish results.</p>
                    <details>
                      <summary className="hk-btn">Open teams & judging</summary>
                      <HackathonJudging id={h.id} showEmails={false} onChanged={reload} />
                    </details>
                    <Link to={`/host/hackathon/${h.id}/edit`} className="hk-btn" style={{ marginTop: 8 }}>Edit listing</Link>
                  </section>
                )}
                <TeamPanel h={h} team={data.team} slug={slug} reload={reload} />
                {data.team && <SubmissionForm key={data.submission?.updatedAt || 'new'} h={h} team={data.team} submission={data.submission} slug={slug} reload={reload} />}
                <section className="hk-panel">
                  <h2><i className="bi bi-calendar3" aria-hidden="true" /> Timeline</h2>
                  <Timeline h={h} />
                </section>
              </aside>
            </div>
          </>
        )}
      </main>
      <Footer />
    </>
  );
}

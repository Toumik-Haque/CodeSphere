import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import SafeText from '../components/SafeText';
import HackathonJudging from '../components/HackathonJudging';
import HackathonSubmission, { SubmissionDetails, SubmissionLinks } from '../components/HackathonSubmission';
import { useAuth } from '../context/AuthContext';
import { apiRequest } from '../lib/api';
import { isPast, PHASES } from '../lib/hackathons';
import '../css/Hackathons.css';

const fmt = (d) => new Date(d).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });

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
        <SubmissionDetails s={s} withLinks={false} />
      </details>
      <SubmissionLinks s={s} />
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
                {h.canManage && (
                  <section className="hk-panel">
                    <h2><i className="bi bi-clipboard-check" aria-hidden="true" /> You host this</h2>
                    <p className="hk-muted">Review submissions, score and rank projects, and publish results.</p>
                    <details>
                      <summary className="hk-btn">Open submissions & judging</summary>
                      <HackathonJudging id={h.id} showEmails={false} onChanged={reload} />
                    </details>
                    <Link to={`/host/hackathon/${h.id}/edit`} className="hk-btn" style={{ marginTop: 8 }}>Edit listing</Link>
                  </section>
                )}
                {data.team && <HackathonSubmission key={data.submission?.updatedAt || 'new'} h={h} team={data.team} submission={data.submission} slug={slug} reload={reload} ProjectCard={ProjectCard} />}
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
                <TeamPanel h={h} team={data.team} slug={slug} reload={reload} />
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

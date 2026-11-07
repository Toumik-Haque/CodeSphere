import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { apiRequest } from '../lib/api';
import { formatDate, timeAgo } from '../lib/time';
import { SOURCES, PHASES, countdown, closesWithin } from '../lib/hackathons';
import '../css/Hackathons.css';
import '../css/Host.css';

const MODE_ICON = { online: 'bi-globe2', offline: 'bi-geo-alt', hybrid: 'bi-diagram-2' };

function ClubCard({ h }) {
  const phase = PHASES[h.phase] || PHASES.upcoming;
  const deadline = h.phase === 'upcoming' ? h.regStart : h.phase === 'submission' ? h.submissionEnd : h.regEnd;
  return (
    <article className="hk-club-card">
      <div className="hk-club-banner" style={h.bannerUrl ? { backgroundImage: `url("${encodeURI(h.bannerUrl)}")` } : undefined}>
        <span className={`hk-phase tone-${phase.tone}`}>{phase.label}</span>
      </div>
      <div className="hk-club-body">
        <h3><Link to={`/hackathons/${h.slug}`} className="hk-stretch">{h.title}</Link></h3>
        {h.tagline && <p>{h.tagline}</p>}
        <div className="hk-meta">
          <span><i className={`bi ${MODE_ICON[h.mode]}`} aria-hidden="true" /> {h.mode === 'online' ? 'Online' : h.venue || h.mode}</span>
          <span><i className="bi bi-people" aria-hidden="true" /> Teams of {h.teamMin === h.teamMax ? h.teamMax : `${h.teamMin}–${h.teamMax}`}</span>
          <span><i className="bi bi-flag" aria-hidden="true" /> {h.teams} team{h.teams === 1 ? '' : 's'}</span>
        </div>
        {h.prizes?.[0] && <p className="hk-prize"><i className="bi bi-trophy-fill" aria-hidden="true" /> {h.prizes[0].reward || h.prizes[0].title}</p>}
        {['upcoming', 'registration', 'submission', 'building'].includes(h.phase) && (
          <p className="hk-deadline">
            {h.phase === 'upcoming' ? `Registration opens ${formatDate(deadline)}` : `${countdown(deadline)} · until ${formatDate(deadline)}`}
          </p>
        )}
      </div>
    </article>
  );
}

function ExternalCard({ h }) {
  const source = SOURCES[h.source] || { name: h.source, color: '#10243A' };
  const deadline = h.regEndsAt || h.endsAt;
  const left = countdown(deadline);
  const urgent = closesWithin(deadline, 3);
  return (
    <article className="hk-card">
      <div className="hk-card-top">
        {h.image ? <img src={h.image} alt="" loading="lazy" referrerPolicy="no-referrer" onError={(e) => { e.currentTarget.style.visibility = 'hidden'; }} /> : <span className="hk-card-fallback" aria-hidden="true"><i className="bi bi-code-slash" /></span>}
        <span className="hk-source" style={{ '--src': source.color }}>{source.name}</span>
      </div>
      <div className="hk-card-body">
        <h3>
          <a href={h.url} target="_blank" rel="noopener noreferrer nofollow" className="hk-stretch">
            {h.title}
            <span className="visually-hidden"> (opens on {source.name})</span>
          </a>
        </h3>
        {h.organizer && <p className="hk-org">{h.organizer}</p>}
        <div className="hk-meta">
          <span><i className={`bi ${MODE_ICON[h.mode] || 'bi-globe2'}`} aria-hidden="true" /> {h.mode === 'online' ? 'Online' : h.location || h.mode}</span>
          {h.teamSize && <span><i className="bi bi-people" aria-hidden="true" /> {h.teamSize}</span>}
          {h.participants > 0 && <span><i className="bi bi-person-check" aria-hidden="true" /> {h.participants.toLocaleString('en-IN')}</span>}
        </div>
        {h.themes?.length > 0 && (
          <div className="hk-themes">{h.themes.slice(0, 3).map((t) => <span key={t}>{t}</span>)}</div>
        )}
        <footer className="hk-card-foot">
          {h.prize ? <strong className="hk-card-prize"><i className="bi bi-trophy" aria-hidden="true" /> {h.prize}</strong> : <span />}
          {left && <span className={`hk-left ${urgent ? 'urgent' : ''}`}>{left}</span>}
        </footer>
        <span className="hk-go" aria-hidden="true">View on {source.name} <i className="bi bi-box-arrow-up-right" /></span>
      </div>
    </article>
  );
}

export default function Hackathons() {
  const [params, setParams] = useSearchParams();
  const [club, setClub] = useState(null);
  const [feed, setFeed] = useState(null);
  const [error, setError] = useState('');
  const [search, setSearch] = useState(params.get('q') || '');

  const source = params.get('source') || '';
  const mode = params.get('mode') || '';
  const sort = params.get('sort') || 'deadline';
  const q = params.get('q') || '';
  const page = Number(params.get('page')) || 1;

  const update = (changes) => {
    const next = new URLSearchParams(params);
    Object.entries(changes).forEach(([k, v]) => (v ? next.set(k, v) : next.delete(k)));
    if (!('page' in changes)) next.delete('page');
    setParams(next, { replace: true });
  };

  useEffect(() => {
    apiRequest('/hackathons').then((r) => setClub(r.hackathons)).catch(() => setClub([]));
  }, []);

  useEffect(() => {
    let cancelled = false;
    const query = new URLSearchParams({ sort, page: String(page) });
    if (source) query.set('source', source);
    if (mode) query.set('mode', mode);
    if (q) query.set('q', q);
    apiRequest(`/hackathons/external?${query}`)
      .then((r) => {
        if (cancelled) return;
        setError('');
        setFeed(r);
      })
      .catch((e) => !cancelled && setError(e.message));
    return () => {
      cancelled = true;
    };
  }, [source, mode, sort, q, page]);

  // Debounced search
  useEffect(() => {
    const t = setTimeout(() => {
      if (search.trim() !== q) update({ q: search.trim() });
    }, 400);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  const totalLive = feed?.sources.reduce((n, s) => n + s.count, 0) || 0;
  const activeClub = club?.filter((h) => h.phase !== 'results') || [];
  const pastClub = club?.filter((h) => h.phase === 'results') || [];

  return (
    <>
      <Navbar />
      <main className="hk-page">
        <section className="hk-hero">
          <div className="container">
            <span className="hk-eyebrow"><span className="hk-dot" /> {totalLive ? `${totalLive} hackathons live right now` : 'Hackathons'}</span>
            <h1>Build something <span className="gold-text">in a weekend.</span></h1>
            <p>Join CodeSphere&apos;s own hackathons with your team, or find your next one from Devpost, Devfolio, Unstop, Hack2Skill and HackerEarth, all in one place.</p>
            <div className="hk-hero-actions">
              <a href="#club" className="btn btn-gold">CodeSphere hackathons</a>
              <a href="#live" className="hk-ghost">Browse live hackathons <i className="bi bi-arrow-down" aria-hidden="true" /></a>
            </div>
          </div>
        </section>

        <div className="container">
          {/* ---------- Club hackathons ---------- */}
          <section id="club" className="hk-section">
            <header className="hk-section-head">
              <div>
                <h2>Hosted by CodeSphere</h2>
                <p>Form a team, build a prototype, submit it and get judged by the club.</p>
              </div>
            </header>
            {!club && <div className="hk-club-grid"><div className="hk-club-card hk-skeleton" /><div className="hk-club-card hk-skeleton" /></div>}
            {club && activeClub.length === 0 && (
              <div className="hk-empty">
                <span aria-hidden="true">🚀</span>
                <h3>No club hackathon running right now</h3>
                <p>The next one will show up here. Meanwhile, pick one from the live list below.</p>
              </div>
            )}
            {activeClub.length > 0 && <div className="hk-club-grid">{activeClub.map((h) => <ClubCard key={h.id} h={h} />)}</div>}
            {pastClub.length > 0 && (
              <details className="hk-past">
                <summary>Past hackathons ({pastClub.length})</summary>
                <div className="hk-club-grid">{pastClub.map((h) => <ClubCard key={h.id} h={h} />)}</div>
              </details>
            )}
          </section>

          <div className="host-cta">
            <div>
              <strong>Hosting a hackathon?</strong>
              <p>List it on CodeSphere. Fill in the details, our team reviews it, and it goes live for every student.</p>
            </div>
            <div>
              <Link to="/host/hackathon/new" className="btn btn-gold"><i className="bi bi-plus-lg" aria-hidden="true" /> Add your hackathon</Link>
              <Link to="/host" className="host-btn">My listings</Link>
            </div>
          </div>

          {/* ---------- Live from other platforms ---------- */}
          <section id="live" className="hk-section">
            <header className="hk-section-head">
              <div>
                <h2>Live around the web</h2>
                <p>
                  Open hackathons from popular platforms. Click any card to register on the host site.
                  {feed?.lastSyncedAt && <> Updated {timeAgo(feed.lastSyncedAt)}.</>}
                </p>
              </div>
            </header>

            <div className="hk-toolbar">
              <div className="hk-sources" role="tablist" aria-label="Platform">
                <button type="button" role="tab" aria-selected={!source} className={!source ? 'active' : ''} onClick={() => update({ source: '' })}>
                  All <small>{totalLive}</small>
                </button>
                {feed?.sources.map((s) => (
                  <button key={s.id} type="button" role="tab" aria-selected={source === s.id} className={source === s.id ? 'active' : ''} style={{ '--src': SOURCES[s.id]?.color }} onClick={() => update({ source: s.id })} disabled={!s.count}>
                    <span className="hk-src-dot" aria-hidden="true" /> {SOURCES[s.id]?.name || s.id} <small>{s.count}</small>
                  </button>
                ))}
              </div>
              <div className="hk-filters">
                <label className="hk-search">
                  <i className="bi bi-search" aria-hidden="true" />
                  <input type="search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search AI, Web3, college…" aria-label="Search hackathons" maxLength={60} />
                </label>
                <select value={mode} onChange={(e) => update({ mode: e.target.value })} aria-label="Mode">
                  <option value="">Any mode</option>
                  <option value="online">Online</option>
                  <option value="offline">In person</option>
                  <option value="hybrid">Hybrid</option>
                </select>
                <select value={sort} onChange={(e) => update({ sort: e.target.value })} aria-label="Sort">
                  <option value="deadline">Closing soon</option>
                  <option value="popular">Most popular</option>
                  <option value="new">Newly added</option>
                </select>
              </div>
            </div>

            {error && <p className="hk-error" role="alert">{error}</p>}
            {!feed && !error && <div className="hk-grid">{Array.from({ length: 8 }, (_, i) => <div key={i} className="hk-card hk-skeleton" />)}</div>}
            {feed && feed.items.length === 0 && (
              <div className="hk-empty">
                <span aria-hidden="true">🔎</span>
                <h3>No hackathons match</h3>
                <p>{totalLive ? 'Try another platform or clear the search.' : 'The live list fills in after the first sync (a few seconds after the server starts).'}</p>
              </div>
            )}
            {feed && feed.items.length > 0 && <div className="hk-grid">{feed.items.map((h) => <ExternalCard key={h.id} h={h} />)}</div>}

            {feed && feed.pages > 1 && (
              <nav className="hk-pagination" aria-label="Pages">
                <button type="button" disabled={page <= 1} onClick={() => update({ page: String(page - 1) })}><i className="bi bi-chevron-left" aria-hidden="true" /> Previous</button>
                <span>Page {feed.page} of {feed.pages}</span>
                <button type="button" disabled={page >= feed.pages} onClick={() => update({ page: String(page + 1) })}>Next <i className="bi bi-chevron-right" aria-hidden="true" /></button>
              </nav>
            )}
            <p className="hk-disclaimer">Listings come from each platform&apos;s public pages and link to the original. Check details and rules on the host site.</p>
          </section>
        </div>
      </main>
      <Footer />
    </>
  );
}

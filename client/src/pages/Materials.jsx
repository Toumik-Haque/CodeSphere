import { useEffect, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import SafeText from '../components/SafeText';
import { apiRequest } from '../lib/api';
import { formatDate } from '../lib/time';
import '../css/Materials.css';

const KIND_ICONS = { docs: 'bi-book', video: 'bi-play-btn', article: 'bi-file-text', practice: 'bi-controller', course: 'bi-mortarboard' };

function LevelPill({ level }) {
  return <span className={`mat-pill level-${level.toLowerCase()}`}>{level}</span>;
}

function GuideView({ slug }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    apiRequest(`/guides/${slug}`)
      .then((r) => !cancelled && setData(r))
      .catch((e) => !cancelled && setError(e.message));
    return () => {
      cancelled = true;
    };
  }, [slug]);

  if (error) return <div className="mat-empty"><span aria-hidden="true">📚</span><h1>{error}</h1><Link to="/materials" className="btn btn-gold">All guides</Link></div>;
  if (!data) return <div className="mat-card mat-skeleton" style={{ height: 400 }} />;

  const { guide, challenges, related } = data;
  return (
    <div className="mat-guide-layout">
      <article className="mat-guide">
        <Link to="/materials" className="mat-back"><i className="bi bi-arrow-left" aria-hidden="true" /> All guides</Link>
        <div className="mat-meta">
          <LevelPill level={guide.level} />
          <span className="mat-pill">{guide.topic}</span>
          <span><i className="bi bi-clock" aria-hidden="true" /> {guide.estMinutes} min read</span>
          <span>Updated {formatDate(guide.updatedAt)}</span>
        </div>
        <h1>{guide.title}</h1>
        <p className="mat-summary">{guide.summary}</p>
        <SafeText text={guide.body} className="mat-body" />

        {guide.resources.length > 0 && (
          <section className="mat-resources">
            <h2><i className="bi bi-bookmark-star" aria-hidden="true" /> Go deeper</h2>
            <ul>
              {guide.resources.map((r) => (
                <li key={r.url}>
                  <a href={r.url} target="_blank" rel="noopener noreferrer">
                    <i className={`bi ${KIND_ICONS[r.kind] || 'bi-link'}`} aria-hidden="true" />
                    <span>{r.title}</span>
                    <i className="bi bi-box-arrow-up-right" aria-hidden="true" />
                  </a>
                </li>
              ))}
            </ul>
          </section>
        )}
      </article>

      <aside className="mat-aside">
        {challenges.length > 0 && (
          <section className="mat-aside-card mat-practice">
            <h2><i className="bi bi-arrow-repeat" aria-hidden="true" /> Practise this</h2>
            <ul>
              {challenges.map((c) => (
                <li key={c.slug}>
                  <Link to={`/reverse-coding/${c.slug}`}>
                    <strong>{c.title}</strong>
                    <span>{c.level} · {c.points} pts</span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}
        {related.length > 0 && (
          <section className="mat-aside-card">
            <h2><i className="bi bi-journals" aria-hidden="true" /> More on {guide.topic}</h2>
            <ul>
              {related.map((g) => (
                <li key={g.slug}><Link to={`/materials/${g.slug}`}><strong>{g.title}</strong><span>{g.level}</span></Link></li>
              ))}
            </ul>
          </section>
        )}
        <section className="mat-aside-card">
          <h2><i className="bi bi-chat-dots" aria-hidden="true" /> Stuck?</h2>
          <p>Ask in the forum. Someone has probably wondered the same thing.</p>
          <Link to="/forum/new?category=programming&type=question" className="btn btn-gold">Ask a question</Link>
        </section>
      </aside>
    </div>
  );
}

function GuideList() {
  const [params, setParams] = useSearchParams();
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [search, setSearch] = useState(params.get('q') || '');
  const topic = params.get('topic') || '';
  const level = params.get('level') || '';
  const q = params.get('q') || '';

  const update = (changes) => {
    const next = new URLSearchParams(params);
    Object.entries(changes).forEach(([k, v]) => (v ? next.set(k, v) : next.delete(k)));
    setParams(next);
  };

  useEffect(() => {
    let cancelled = false;
    const query = new URLSearchParams({ ...(topic ? { topic } : {}), ...(level ? { level } : {}), ...(q ? { q } : {}) });
    apiRequest(`/guides?${query}`)
      .then((r) => {
        if (cancelled) return;
        setError('');
        setData(r);
      })
      .catch((e) => !cancelled && setError(e.message));
    return () => {
      cancelled = true;
    };
  }, [topic, level, q]);

  return (
    <>
      <header className="mat-hero">
        <span className="section-eyebrow"><span className="section-eyebrow-line" /> STUDY GUIDE</span>
        <h1>Learn it, <span className="gold-text">then practise it.</span></h1>
        <p>Short, practical guides written for CodeSphere students, each linked to challenges you can try straight away.</p>
        <form className="mat-search" role="search" onSubmit={(e) => { e.preventDefault(); update({ q: search.trim() }); }}>
          <i className="bi bi-search" aria-hidden="true" />
          <input type="search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search guides…" aria-label="Search guides" maxLength={80} />
          <button type="submit">Search</button>
        </form>
      </header>

      <div className="mat-filters">
        <div className="mat-chips" role="tablist" aria-label="Topics">
          <button type="button" role="tab" aria-selected={!topic} className={!topic ? 'active' : ''} onClick={() => update({ topic: '' })}>All topics</button>
          {data?.topics.map((t) => (
            <button key={t} type="button" role="tab" aria-selected={topic === t} className={topic === t ? 'active' : ''} onClick={() => update({ topic: t })}>{t}</button>
          ))}
        </div>
        <select value={level} onChange={(e) => update({ level: e.target.value })} aria-label="Level">
          <option value="">All levels</option>
          {data?.levels.map((l) => <option key={l} value={l}>{l}</option>)}
        </select>
      </div>

      {error && <p className="mat-error" role="alert">{error}</p>}
      {!data && !error && <div className="mat-grid">{Array.from({ length: 6 }, (_, i) => <div key={i} className="mat-card mat-skeleton" />)}</div>}
      {data?.guides.length === 0 && (
        <div className="mat-empty">
          <span aria-hidden="true">📚</span>
          <h2>{q || topic || level ? 'No guides match' : 'Guides are on their way'}</h2>
          <p>{q || topic || level ? 'Try another filter.' : 'The CodeSphere team is writing the first study guides.'}</p>
        </div>
      )}
      <div className="mat-grid">
        {data?.guides.map((g) => (
          <article key={g.slug} className="mat-card">
            <div className="mat-meta"><LevelPill level={g.level} /><span className="mat-pill">{g.topic}</span></div>
            <h3><Link to={`/materials/${g.slug}`} className="mat-card-link">{g.title}</Link></h3>
            <p>{g.summary}</p>
            <span className="mat-read"><i className="bi bi-clock" aria-hidden="true" /> {g.estMinutes} min read</span>
          </article>
        ))}
      </div>
    </>
  );
}

export default function Materials() {
  const { slug } = useParams();
  return (
    <>
      <Navbar />
      <main className="mat-page">
        <div className="container">{slug ? <GuideView slug={slug} /> : <GuideList />}</div>
      </main>
      <Footer />
    </>
  );
}

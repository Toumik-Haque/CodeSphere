import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { useAuth } from '../context/AuthContext';
import { apiRequest } from '../lib/api';
import { LANGUAGES } from '../data/playground';
import '../css/Reverse.css';

const TABS = ['All', 'Beginner', 'Intermediate', 'Advanced', 'Completed', 'Bookmarked'];
const LANG_LABEL = Object.fromEntries(LANGUAGES.map((l) => [l.id, l.label]));

export function LevelPill({ level }) {
  return <span className={`rc-pill level-${level.toLowerCase()}`}>{level}</span>;
}

function ChallengeCard({ c }) {
  return (
    <article className={`rc-card ${c.solved ? 'is-solved' : ''}`}>
      <div className="rc-card-top">
        <LevelPill level={c.level} />
        <span className="rc-pill">{c.formatLabel}</span>
        {c.bookmarked && <i className="bi bi-bookmark-fill rc-bookmarked" aria-label="Bookmarked" />}
      </div>
      <h3><Link to={`/reverse-coding/${c.slug}`} className="rc-card-link">{c.title}</Link></h3>
      <p>{c.summary}</p>
      <div className="rc-card-meta">
        <span><i className="bi bi-star-fill" aria-hidden="true" /> {c.points} pts</span>
        <span><i className="bi bi-clock" aria-hidden="true" /> ~{c.estMinutes} min</span>
        <span><i className="bi bi-tag" aria-hidden="true" /> {c.topic}</span>
        <span><i className="bi bi-code-slash" aria-hidden="true" /> {c.languages.map((l) => LANG_LABEL[l] || l).join(', ')}</span>
      </div>
      <div className="rc-card-status">
        {c.solved
          ? <span className="rc-status solved"><i className="bi bi-check-circle-fill" aria-hidden="true" /> Solved · {c.bestScore} pts</span>
          : c.attempts
            ? <span className="rc-status tried"><i className="bi bi-arrow-repeat" aria-hidden="true" /> {c.attempts} attempt{c.attempts === 1 ? '' : 's'} · best {c.bestScore} pts</span>
            : <span className="rc-status">Not started</span>}
      </div>
    </article>
  );
}

export default function ReverseCoding() {
  const { user, token } = useAuth();
  const isLoggedIn = Boolean(user && token);
  const [params, setParams] = useSearchParams();
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  const tab = params.get('tab') || 'All';
  const topic = params.get('topic') || '';
  const language = params.get('language') || '';

  const update = (changes) => {
    const next = new URLSearchParams(params);
    Object.entries(changes).forEach(([k, v]) => (v ? next.set(k, v) : next.delete(k)));
    setParams(next);
  };

  useEffect(() => {
    let cancelled = false;
    const query = new URLSearchParams();
    if (['Beginner', 'Intermediate', 'Advanced'].includes(tab)) query.set('level', tab);
    if (tab === 'Completed') query.set('tab', 'completed');
    if (tab === 'Bookmarked') query.set('tab', 'bookmarked');
    if (topic) query.set('topic', topic);
    if (language) query.set('language', language);
    apiRequest(`/reverse?${query}`)
      .then((r) => {
        if (cancelled) return;
        setError('');
        setData(r);
      })
      .catch((e) => !cancelled && setError(e.message));
    return () => {
      cancelled = true;
    };
  }, [tab, topic, language]);

  const list = data?.challenges || [];
  const featured = tab === 'All' && !topic && !language ? list.find((c) => c.featured) : null;
  const starter = tab === 'All' && !topic && !language ? list.filter((c) => c.level === 'Beginner' && !c.solved).slice(0, 3) : [];

  return (
    <>
      <Navbar />
      <main className="rc-page">
        <div className="container">
          <header className="rc-hero">
            <span className="section-eyebrow"><span className="section-eyebrow-line" /> REVERSE CODING</span>
            <h1>See the output. <span className="gold-text">Rebuild the code.</span></h1>
            <p>
              Each challenge shows what a program does: example inputs, outputs or a pattern.
              Your job is to write a program that behaves the same way, then pass the hidden tests.
            </p>
            {data?.progress && (
              <div className="rc-progress">
                <span><strong>{data.progress.solved}</strong> / {data.progress.total} solved</span>
                <span className="rc-bar" aria-hidden="true"><span style={{ width: `${data.progress.total ? (data.progress.solved / data.progress.total) * 100 : 0}%` }} /></span>
              </div>
            )}
          </header>

          {data && !data.judgeReady && (
            <p className="rc-notice" role="status">
              <i className="bi bi-info-circle" aria-hidden="true" /> You can read and draft solutions, but running and submitting code is turned off until the CodeSphere team connects the code runner (Judge0).
            </p>
          )}

          {featured && (
            <section className="rc-featured">
              <span className="rc-kicker"><i className="bi bi-stars" aria-hidden="true" /> Challenge of the week</span>
              <h2>{featured.title}</h2>
              <p>{featured.summary}</p>
              <div className="rc-card-meta">
                <LevelPill level={featured.level} />
                <span><i className="bi bi-star-fill" aria-hidden="true" /> {featured.points} pts</span>
                <span><i className="bi bi-clock" aria-hidden="true" /> ~{featured.estMinutes} min</span>
              </div>
              <Link to={`/reverse-coding/${featured.slug}`} className="btn btn-gold">Start challenge <i className="bi bi-arrow-right" aria-hidden="true" /></Link>
            </section>
          )}

          {starter.length > 0 && (
            <section className="rc-starter" aria-labelledby="rc-starter-title">
              <h2 id="rc-starter-title"><i className="bi bi-flower1" aria-hidden="true" /> New here? Start with these</h2>
              <div className="rc-starter-list">
                {starter.map((c) => (
                  <Link key={c.slug} to={`/reverse-coding/${c.slug}`} className="rc-starter-item">
                    <strong>{c.title}</strong>
                    <span>{c.formatLabel} · ~{c.estMinutes} min</span>
                  </Link>
                ))}
              </div>
            </section>
          )}

          <div className="rc-toolbar">
            <div className="rc-tabs" role="tablist" aria-label="Filter challenges">
              {TABS.filter((t) => isLoggedIn || !['Completed', 'Bookmarked'].includes(t)).map((t) => (
                <button key={t} type="button" role="tab" aria-selected={tab === t} className={tab === t ? 'active' : ''} onClick={() => update({ tab: t === 'All' ? '' : t })}>{t}</button>
              ))}
            </div>
            <div className="rc-filters">
              <select value={topic} onChange={(e) => update({ topic: e.target.value })} aria-label="Topic">
                <option value="">All topics</option>
                {data?.topics.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
              <select value={language} onChange={(e) => update({ language: e.target.value })} aria-label="Language">
                <option value="">Any language</option>
                {LANGUAGES.map((l) => <option key={l.id} value={l.id}>{l.label}</option>)}
              </select>
            </div>
          </div>

          {error && <p className="rc-error" role="alert">{error}</p>}
          {!data && !error && <div className="rc-grid">{Array.from({ length: 6 }, (_, i) => <div key={i} className="rc-card rc-skeleton" />)}</div>}
          {data && list.length === 0 && (
            <div className="rc-empty">
              <span aria-hidden="true">🧩</span>
              <h3>No challenges match</h3>
              <p>{tab === 'Completed' ? 'Solve a challenge and it will appear here.' : tab === 'Bookmarked' ? 'Bookmark challenges to come back to them later.' : 'Try another filter.'}</p>
            </div>
          )}
          <div className="rc-grid">{list.map((c) => <ChallengeCard key={c.slug} c={c} />)}</div>
        </div>
      </main>
      <Footer />
    </>
  );
}

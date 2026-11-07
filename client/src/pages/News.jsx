import { useEffect, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { useAuth } from '../context/AuthContext';
import { apiRequest } from '../lib/api';
import { formatDate } from '../lib/time';
import DailyNews, { DailyEmailToggle } from '../components/DailyNews';
import '../css/News.css';

function useCategories() {
  const [categories, setCategories] = useState([]);
  useEffect(() => {
    let cancelled = false;
    apiRequest('/news/config').then((c) => !cancelled && setCategories(c.categories)).catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);
  return categories;
}

function StoryCard({ item, categories, featured = false, signedIn }) {
  const [saved, setSaved] = useState(item.bookmarked);
  const category = categories.find((c) => c.id === item.category);

  const toggle = async () => {
    try {
      const r = await apiRequest(`/news/items/${item.id}/bookmark`, { method: 'POST' });
      setSaved(r.bookmarked);
    } catch {
      /* ignore */
    }
  };

  return (
    <article className={`news-card ${featured ? 'is-featured' : ''}`}>
      <div className="news-card-top">
        {featured && <span className="news-kicker"><i className="bi bi-star-fill" aria-hidden="true" /> Top story</span>}
        {category && <span className="news-pill"><i className={`bi ${category.icon}`} aria-hidden="true" /> {category.name}</span>}
      </div>
      <h3>{item.title}</h3>
      <p className="news-source">
        <strong>{item.sourceName}</strong>
        {item.author && <> · {item.author}</>}
        {item.publishedAt && <> · published {formatDate(item.publishedAt)}</>}
      </p>
      {item.summary && <p>{item.summary}</p>}
      {item.whyItMatters && (
        <div className="news-why">
          <strong><i className="bi bi-lightbulb" aria-hidden="true" /> Why developers should care</strong>
          <p>{item.whyItMatters}</p>
        </div>
      )}
      <div className="news-card-actions">
        <a href={item.url} target="_blank" rel="noopener noreferrer" className="news-read">
          Read on {item.sourceName} <i className="bi bi-box-arrow-up-right" aria-hidden="true" />
        </a>
        {signedIn && (
          <button type="button" className={`news-save ${saved ? 'is-on' : ''}`} onClick={toggle} aria-pressed={saved}>
            <i className={`bi ${saved ? 'bi-bookmark-fill' : 'bi-bookmark'}`} aria-hidden="true" /> {saved ? 'Saved' : 'Save'}
          </button>
        )}
        <button type="button" className="news-save" onClick={() => navigator.clipboard?.writeText(item.url)}>
          <i className="bi bi-link-45deg" aria-hidden="true" /> Copy link
        </button>
        {item.reviewedAt && <small className="news-reviewed">Reviewed by CodeSphere {formatDate(item.reviewedAt)}</small>}
      </div>
    </article>
  );
}

export function DigestView({ digest, categories, signedIn }) {
  return (
    <section className="news-digest" aria-labelledby="digest-title">
      <header className="news-digest-head">
        <span className="news-kicker">Week of {formatDate(digest.weekStart)} – {formatDate(digest.weekEnd)}</span>
        <h2 id="digest-title">{digest.title}</h2>
        {digest.intro && <p>{digest.intro}</p>}
      </header>

      {digest.topStory && <StoryCard item={digest.topStory} categories={categories} featured signedIn={signedIn} />}

      {digest.items.length > 0 && (
        <>
          <h3 className="news-section-title"><i className="bi bi-lightning-charge" aria-hidden="true" /> Quick reads</h3>
          <div className="news-grid">
            {digest.items.map((item) => <StoryCard key={item.id} item={item} categories={categories} signedIn={signedIn} />)}
          </div>
        </>
      )}

      <div className="news-extras">
        {digest.tryThis && (
          <div className="news-try">
            <h3><i className="bi bi-hammer" aria-hidden="true" /> Try this</h3>
            <strong>{digest.tryThis.title}</strong>
            {digest.tryThis.description && <p>{digest.tryThis.description}</p>}
            {digest.tryThis.url && <a href={digest.tryThis.url} target="_blank" rel="noopener noreferrer">Open <i className="bi bi-box-arrow-up-right" aria-hidden="true" /></a>}
          </div>
        )}
        {digest.communityQuestion && (
          <div className="news-question">
            <h3><i className="bi bi-chat-quote" aria-hidden="true" /> Community question</h3>
            <p>{digest.communityQuestion}</p>
            {digest.forumThread
              ? <Link to={`/forum/${digest.forumThread}`} className="btn btn-gold">Join the discussion</Link>
              : <Link to="/forum/new?category=open&type=discussion" className="btn btn-gold">Start a discussion</Link>}
          </div>
        )}
      </div>
    </section>
  );
}

export default function News() {
  const { slug } = useParams();
  const { user, token } = useAuth();
  const signedIn = Boolean(user && token);
  const categories = useCategories();
  const [params, setParams] = useSearchParams();
  const [digest, setDigest] = useState(undefined);
  const [archive, setArchive] = useState([]);
  const [results, setResults] = useState(null);
  const [error, setError] = useState('');
  const [search, setSearch] = useState(params.get('q') || '');

  // Default: today's automatic news. A digest slug opens the weekly Brief.
  const view = params.get('view') || (slug ? 'digest' : 'today');
  const q = params.get('q') || '';
  const category = params.get('category') || '';

  const update = (changes) => {
    const next = new URLSearchParams(params);
    Object.entries(changes).forEach(([k, v]) => (v ? next.set(k, v) : next.delete(k)));
    setParams(next);
  };

  // The digest (latest, or one from the archive) + archive list.
  useEffect(() => {
    let cancelled = false;
    apiRequest(slug ? `/news/digests/${slug}` : '/news/digests/latest')
      .then((r) => !cancelled && setDigest(r.digest))
      .catch((e) => {
        if (cancelled) return;
        setError(e.message);
        setDigest(null);
      });
    apiRequest('/news/digests').then((r) => !cancelled && setArchive(r.digests)).catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [slug]);

  // Search / filter / saved.
  useEffect(() => {
    if (view === 'today' || (view === 'digest' && !q && !category)) return undefined;
    let cancelled = false;
    const request = view === 'saved'
      ? apiRequest('/news/bookmarks')
      : apiRequest(`/news?${new URLSearchParams({ ...(q ? { q } : {}), ...(category ? { category } : {}) })}`);
    request
      .then((r) => !cancelled && setResults(r.items))
      .catch((e) => !cancelled && setError(e.message));
    return () => {
      cancelled = true;
    };
  }, [view, q, category]);

  const isToday = view === 'today' && !q;
  const browsing = !isToday && (view === 'saved' || q || category);

  return (
    <>
      <Navbar />
      <main className="news-page">
        <div className="container">
          <header className="news-hero">
            <span className="section-eyebrow"><span className="section-eyebrow-line" /> TECH NEWS · UPDATED DAILY</span>
            <h1>Stay updated, <span className="gold-text">every single day.</span></h1>
            <p>Today&apos;s top developer stories from Hacker News, DEV and trusted tech blogs, refreshed through the day, plus the weekly Tech Brief curated by the CodeSphere team.</p>
            <form className="news-search" role="search" onSubmit={(e) => { e.preventDefault(); update({ q: search.trim(), view: '' }); }}>
              <i className="bi bi-search" aria-hidden="true" />
              <input type="search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search past stories…" aria-label="Search stories" maxLength={100} />
              <button type="submit">Search</button>
            </form>
            {signedIn && <DailyEmailToggle />}
          </header>

          <div className="news-chips" role="tablist" aria-label="Browse">
            <button type="button" role="tab" aria-selected={isToday && !category} className={isToday && !category ? 'active' : ''} onClick={() => { setSearch(''); update({ view: '', q: '', category: '' }); }}>
              <i className="bi bi-lightning-charge" aria-hidden="true" /> Today
            </button>
            <button type="button" role="tab" aria-selected={view === 'digest' && !browsing} className={view === 'digest' && !browsing ? 'active' : ''} onClick={() => { setSearch(''); update({ view: 'digest', q: '', category: '' }); }}>
              <i className="bi bi-newspaper" aria-hidden="true" /> {slug ? 'This edition' : 'Weekly Brief'}
            </button>
            {categories.map((c) => (
              <button key={c.id} type="button" role="tab" aria-selected={category === c.id} className={category === c.id ? 'active' : ''} onClick={() => update({ category: category === c.id ? '' : c.id, view: view === 'saved' ? '' : (slug ? 'digest' : view === 'today' ? '' : view) })}>
                <i className={`bi ${c.icon}`} aria-hidden="true" /> {c.name}
              </button>
            ))}
            {signedIn && (
              <button type="button" role="tab" aria-selected={view === 'saved'} className={view === 'saved' ? 'active' : ''} onClick={() => update({ view: 'saved', q: '', category: '' })}>
                <i className="bi bi-bookmark" aria-hidden="true" /> Saved
              </button>
            )}
          </div>

          {error && <p className="news-error" role="alert">{error}</p>}

          {isToday ? (
            <DailyNews categories={categories} category={category} onCategory={(c) => update({ category: c })} />
          ) : (
          <div className="news-layout">
            <div className="news-main">
              {browsing ? (
                <>
                  <p className="news-filter-note">
                    {view === 'saved' ? 'Your saved stories (only you can see these).' : <>Stories{category && <> in <strong>{categories.find((c) => c.id === category)?.name}</strong></>}{q && <> matching <strong>“{q}”</strong></>}</>}
                  </p>
                  {!results && <div className="news-card news-skeleton" />}
                  {results?.length === 0 && <div className="news-empty"><span aria-hidden="true">📰</span><p>No stories found.</p></div>}
                  <div className="news-grid">
                    {results?.map((item) => (
                      <div key={item.id}>
                        <StoryCard item={item} categories={categories} signedIn={signedIn} />
                        {item.digest && <Link to={`/news/${item.digest.slug}`} className="news-from">From: {item.digest.title}</Link>}
                      </div>
                    ))}
                  </div>
                </>
              ) : digest === undefined ? (
                <div className="news-card news-skeleton" />
              ) : digest ? (
                <DigestView digest={digest} categories={categories} signedIn={signedIn} />
              ) : (
                <div className="news-empty">
                  <span aria-hidden="true">🗞️</span>
                  <h2>The first Tech Brief is on its way</h2>
                  <p>The CodeSphere team publishes a short digest each week. Check back soon!</p>
                </div>
              )}
            </div>

            <aside className="news-archive" aria-label="Archive">
              <h2><i className="bi bi-archive" aria-hidden="true" /> Archive</h2>
              {archive.length === 0 ? <p className="news-muted">No editions yet.</p> : (
                <ul>
                  {archive.map((d) => (
                    <li key={d.id}>
                      <Link to={`/news/${d.slug}`} className={slug === d.slug ? 'active' : ''}>
                        <strong>{d.title}</strong>
                        <span>{formatDate(d.weekStart)} · {d.itemCount + 1} stories</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
              <p className="news-muted news-policy">
                We link to original sources and write short original summaries. We never republish full articles.
              </p>
            </aside>
          </div>
          )}
        </div>
      </main>
      <Footer />
    </>
  );
}

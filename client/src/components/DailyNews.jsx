import { useEffect, useState } from 'react';
import { apiRequest } from '../lib/api';
import { timeAgo } from '../lib/time';

const SOURCE_LABELS = { hackernews: 'Hacker News', devto: 'DEV', rss: 'Tech blogs', gnews: 'GNews', newsdata: 'NewsData' };

function hostOf(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return '';
  }
}

function Meta({ item }) {
  return (
    <p className="dn-meta">
      <strong>{item.sourceName}</strong>
      {item.source !== 'rss' && hostOf(item.url) && <span> · {hostOf(item.url)}</span>}
      <span> · {timeAgo(item.publishedAt)}</span>
      {item.score > 0 && <span className="dn-score" title={item.source === 'hackernews' ? 'Points on Hacker News' : 'Reactions'}><i className="bi bi-arrow-up-short" aria-hidden="true" />{item.score}</span>}
      {item.comments > 0 && item.discussionUrl && (
        <a href={item.discussionUrl} target="_blank" rel="noopener noreferrer" className="dn-comments"><i className="bi bi-chat" aria-hidden="true" /> {item.comments}</a>
      )}
    </p>
  );
}

function TopStory({ item, rank, categories }) {
  const category = categories.find((c) => c.id === item.category);
  return (
    <article className={`dn-top ${rank === 1 ? 'is-lead' : ''}`}>
      {rank !== 1 && <span className="dn-rank" aria-hidden="true">{rank}</span>}
      {rank === 1 && item.image && <img src={item.image} alt="" loading="lazy" referrerPolicy="no-referrer" onError={(e) => { e.currentTarget.remove(); }} />}
      <div className="dn-top-body">
        <div className="dn-top-head">
          {rank === 1 && <span className="dn-rank" aria-hidden="true">{rank}</span>}
          {category && <span className="dn-cat"><i className={`bi ${category.icon}`} aria-hidden="true" /> {category.name}</span>}
        </div>
        <h3><a href={item.url} target="_blank" rel="noopener noreferrer" className="dn-link">{item.title}</a></h3>
        {rank === 1 && item.summary && <p className="dn-summary">{item.summary}</p>}
        <Meta item={item} />
      </div>
    </article>
  );
}

function FeedCard({ item, categories }) {
  const category = categories.find((c) => c.id === item.category);
  return (
    <article className="dn-card">
      {item.image && <img src={item.image} alt="" loading="lazy" referrerPolicy="no-referrer" onError={(e) => { e.currentTarget.remove(); }} />}
      <div className="dn-card-body">
        {category && <span className="dn-cat"><i className={`bi ${category.icon}`} aria-hidden="true" /> {category.name}</span>}
        <h3><a href={item.url} target="_blank" rel="noopener noreferrer" className="dn-link">{item.title}</a></h3>
        {item.summary && <p className="dn-summary">{item.summary}</p>}
        <Meta item={item} />
      </div>
    </article>
  );
}

export function DailyEmailToggle() {
  const [prefs, setPrefs] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    apiRequest('/newsletter/me').then((r) => !cancelled && setPrefs(r)).catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);
  if (!prefs) return null;

  const toggle = async (key) => {
    setSaving(true);
    try {
      setPrefs(await apiRequest('/newsletter/me', { method: 'PUT', body: JSON.stringify({ [key]: !prefs[key] }) }));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="dn-subscribe">
      <span className="dn-subscribe-label"><i className="bi bi-envelope-paper" aria-hidden="true" /> Email me</span>
      <button type="button" className={prefs.daily ? 'on' : ''} aria-pressed={prefs.daily} disabled={saving} onClick={() => toggle('daily')}>
        <i className={`bi ${prefs.daily ? 'bi-check-circle-fill' : 'bi-circle'}`} aria-hidden="true" /> Today in Tech <small>daily, 8 AM</small>
      </button>
      <button type="button" className={prefs.subscribed ? 'on' : ''} aria-pressed={prefs.subscribed} disabled={saving} onClick={() => toggle('subscribed')}>
        <i className={`bi ${prefs.subscribed ? 'bi-check-circle-fill' : 'bi-circle'}`} aria-hidden="true" /> Weekly Tech Brief
      </button>
    </div>
  );
}

export default function DailyNews({ categories, category, onCategory }) {
  const [today, setToday] = useState(null);
  const [feed, setFeed] = useState([]);
  const [meta, setMeta] = useState(null);
  const [page, setPage] = useState(1);
  const [sort, setSort] = useState('latest');
  const [source, setSource] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    apiRequest('/news/daily/today').then((r) => !cancelled && setToday(r)).catch((e) => !cancelled && setError(e.message));
    return () => {
      cancelled = true;
    };
  }, []);

  // Reset the feed when filters change.
  const [filterKey, setFilterKey] = useState(`${category}|${sort}|${source}`);
  const nextKey = `${category}|${sort}|${source}`;
  if (nextKey !== filterKey) {
    setFilterKey(nextKey);
    setFeed([]);
    setPage(1);
    setLoading(true);
  }

  useEffect(() => {
    let cancelled = false;
    const query = new URLSearchParams({ page: String(page), sort });
    if (category) query.set('category', category);
    if (source) query.set('source', source);
    apiRequest(`/news/daily?${query}`)
      .then((r) => {
        if (cancelled) return;
        setFeed((prev) => (page === 1 ? r.items : [...prev, ...r.items.filter((i) => !prev.some((p) => p.id === i.id))]));
        setMeta(r);
      })
      .catch((e) => !cancelled && setError(e.message))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [page, sort, category, source]);

  const dateLabel = new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' });

  return (
    <div className="dn">
      {error && <p className="news-error" role="alert">{error}</p>}

      {!category && (
        <section className="dn-today" aria-labelledby="today-title">
          <header>
            <span className="dn-live"><span aria-hidden="true" /> Updated {today?.lastSyncedAt ? timeAgo(today.lastSyncedAt) : 'daily'}</span>
            <h2 id="today-title">Today in Tech</h2>
            <p>{dateLabel}{today ? ` · ${today.todayCount} new stories in the last 24 hours` : ''}</p>
          </header>
          {!today && <div className="dn-skeleton" />}
          {today?.items.length === 0 && <p className="news-muted">Today&apos;s stories are being collected. Check back in a few minutes.</p>}
          {today?.items.length > 0 && (
            <div className="dn-top-list">
              {today.items.map((item, i) => <TopStory key={item.id} item={item} rank={i + 1} categories={categories} />)}
            </div>
          )}
        </section>
      )}

      <section aria-labelledby="feed-title">
        <div className="dn-feed-head">
          <h2 id="feed-title">
            {category ? categories.find((c) => c.id === category)?.name : 'All news'}
            {category && <button type="button" className="dn-clear" onClick={() => onCategory('')}><i className="bi bi-x" aria-hidden="true" /> Clear</button>}
          </h2>
          <div className="dn-controls">
            <select value={source} onChange={(e) => setSource(e.target.value)} aria-label="Source">
              <option value="">All sources</option>
              {meta?.sources.map((s) => <option key={s.id} value={s.id}>{SOURCE_LABELS[s.id] || s.id} ({s.count})</option>)}
            </select>
            <div className="dn-sort" role="tablist" aria-label="Sort">
              <button type="button" role="tab" aria-selected={sort === 'latest'} className={sort === 'latest' ? 'active' : ''} onClick={() => setSort('latest')}>Latest</button>
              <button type="button" role="tab" aria-selected={sort === 'hot'} className={sort === 'hot' ? 'active' : ''} onClick={() => setSort('hot')}><i className="bi bi-fire" aria-hidden="true" /> Trending</button>
            </div>
          </div>
        </div>

        <div className="dn-grid">
          {feed.map((item) => <FeedCard key={item.id} item={item} categories={categories} />)}
          {loading && Array.from({ length: 6 }, (_, i) => <div key={`s${i}`} className="dn-card dn-skeleton" />)}
        </div>
        {!loading && feed.length === 0 && <div className="news-empty"><span aria-hidden="true">📰</span><p>No stories here yet.</p></div>}
        {meta && page < meta.pages && !loading && (
          <button type="button" className="dn-more" onClick={() => { setLoading(true); setPage((p) => p + 1); }}>Load more stories</button>
        )}
        <p className="news-muted dn-credit">Headlines link to the original publishers. Collected automatically from Hacker News, DEV and trusted tech blogs.</p>
      </section>
    </div>
  );
}

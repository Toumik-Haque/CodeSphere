import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import { apiRequest } from '../lib/api';
import { formatDate, timeAgo } from '../lib/time';
import DailyNewsAdmin from '../components/DailyNewsAdmin';
import '../css/News.css';

const STATUSES = ['candidate', 'reviewing', 'approved', 'published', 'rejected', 'archived'];
const toDateInput = (d) => (d ? new Date(d).toISOString().slice(0, 10) : '');

function ItemEditor({ item, categories, onDone, onMessage }) {
  const [f, setF] = useState({
    title: item.title,
    editorSummary: item.editorSummary || '',
    whyItMatters: item.whyItMatters || '',
    category: item.category || '',
    tags: (item.tags || []).join(', '),
    author: item.author || '',
    publishedAt: toDateInput(item.publishedAt),
  });
  const set = (k) => (e) => setF((x) => ({ ...x, [k]: e.target.value }));

  const save = async (status) => {
    try {
      await apiRequest(`/news/admin/items/${item.id}`, {
        method: 'PUT',
        body: JSON.stringify({ ...f, tags: f.tags.split(',').map((t) => t.trim()).filter(Boolean), publishedAt: f.publishedAt || undefined, ...(status ? { status } : {}) }),
      });
      onMessage(status ? `Moved to ${status}.` : 'Saved.');
      onDone();
    } catch (e) {
      onMessage(e.message);
    }
  };

  const locked = item.status === 'published';

  return (
    <article className="news-admin-item">
      <header>
        <span className="news-pill">{item.status}</span>
        <strong>{item.sourceName}</strong>
        <a href={item.canonicalUrl} target="_blank" rel="noopener noreferrer">Open original <i className="bi bi-box-arrow-up-right" aria-hidden="true" /></a>
        <small className="news-muted">fetched {timeAgo(item.fetchedAt || item.createdAt)}{item.reviewedBy && ` · reviewed by ${item.reviewedBy} ${formatDate(item.reviewedAt)}`}{item.addedBy && ` · added by ${item.addedBy}`}</small>
      </header>
      {item.feedSummary && <p className="news-feed-summary"><em>Feed snippet:</em> {item.feedSummary}</p>}
      <div className="news-admin-grid">
        <label className="wide"><span>Headline</span><input value={f.title} onChange={set('title')} maxLength={200} disabled={locked} /></label>
        <label className="wide"><span>Summary for students (1-2 original sentences)</span><textarea rows={2} value={f.editorSummary} onChange={set('editorSummary')} maxLength={600} disabled={locked} /></label>
        <label className="wide"><span>Why developers should care</span><textarea rows={2} value={f.whyItMatters} onChange={set('whyItMatters')} maxLength={600} disabled={locked} /></label>
        <label>
          <span>Category</span>
          <select value={f.category} onChange={set('category')} disabled={locked}>
            <option value="">Choose…</option>
            {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </label>
        <label><span>Original publish date</span><input type="date" value={f.publishedAt} onChange={set('publishedAt')} disabled={locked} /></label>
        <label><span>Author</span><input value={f.author} onChange={set('author')} disabled={locked} /></label>
        <label><span>Tags</span><input value={f.tags} onChange={set('tags')} placeholder="python, ai" disabled={locked} /></label>
      </div>
      <div className="news-admin-actions">
        {!locked && <button type="button" className="news-btn" onClick={() => save()}>Save</button>}
        {!locked && item.status !== 'approved' && <button type="button" className="news-btn ok" onClick={() => save('approved')}><i className="bi bi-check2" aria-hidden="true" /> Approve</button>}
        {item.status === 'candidate' && <button type="button" className="news-btn" onClick={() => save('reviewing')}>Start review</button>}
        {!locked && item.status !== 'rejected' && <button type="button" className="news-btn danger" onClick={() => save('rejected')}>Reject</button>}
        {item.status !== 'archived' && <button type="button" className="news-btn" onClick={() => save('archived')}>Archive</button>}
      </div>
    </article>
  );
}

function DigestBuilder({ digest, approved, onDone, onMessage }) {
  const today = new Date();
  const monday = new Date(today);
  monday.setDate(today.getDate() - ((today.getDay() + 6) % 7));
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);

  const [f, setF] = useState(() => ({
    title: digest?.title || '',
    weekStart: toDateInput(digest?.weekStart || monday),
    weekEnd: toDateInput(digest?.weekEnd || sunday),
    intro: digest?.intro || '',
    topStory: digest?.topStory ? String(digest.topStory) : '',
    items: (digest?.items || []).map(String),
    tryTitle: digest?.tryThis?.title || '',
    tryUrl: digest?.tryThis?.url || '',
    tryDescription: digest?.tryThis?.description || '',
    communityQuestion: digest?.communityQuestion || '',
  }));
  const [publishAt, setPublishAt] = useState('');
  const [createDiscussion, setCreateDiscussion] = useState(true);
  const set = (k) => (e) => setF((x) => ({ ...x, [k]: e.target.value }));
  const byId = new Map(approved.map((i) => [i.id, i]));
  const published = digest?.status === 'published';

  const payload = () => ({
    title: f.title,
    weekStart: f.weekStart,
    weekEnd: f.weekEnd,
    intro: f.intro,
    topStory: f.topStory || null,
    items: f.items,
    tryThis: { title: f.tryTitle, url: f.tryUrl, description: f.tryDescription },
    communityQuestion: f.communityQuestion,
  });

  const save = async () => {
    try {
      if (digest) await apiRequest(`/news/admin/digests/${digest.id}`, { method: 'PUT', body: JSON.stringify(payload()) });
      else await apiRequest('/news/admin/digests', { method: 'POST', body: JSON.stringify(payload()) });
      onMessage('Digest saved.');
      onDone();
    } catch (e) {
      onMessage(e.message);
    }
  };

  const publish = async () => {
    try {
      await apiRequest(`/news/admin/digests/${digest.id}`, { method: 'PUT', body: JSON.stringify(payload()) });
      const r = await apiRequest(`/news/admin/digests/${digest.id}/publish`, {
        method: 'POST',
        body: JSON.stringify({ publishAt: publishAt ? new Date(publishAt).toISOString() : undefined, createDiscussion }),
      });
      onMessage(r.scheduled ? `Scheduled for ${formatDate(r.publishedAt)}.` : 'Published! Students have been notified.');
      onDone();
    } catch (e) {
      onMessage(e.message);
    }
  };

  const move = (i, delta) => setF((x) => {
    const items = [...x.items];
    const j = i + delta;
    if (j < 0 || j >= items.length) return x;
    [items[i], items[j]] = [items[j], items[i]];
    return { ...x, items };
  });

  const candidates = approved.filter((i) => i.id !== f.topStory && !f.items.includes(i.id));

  return (
    <section className="news-builder">
      <h2>{digest ? `Edit: ${digest.title}` : 'New weekly digest'} {published && <span className="news-pill">published {formatDate(digest.publishedAt)}</span>}</h2>
      <div className="news-admin-grid">
        <label className="wide"><span>Title</span><input value={f.title} onChange={set('title')} placeholder="AI agents, Python 3.14 and a security wake-up call" maxLength={140} /></label>
        <label><span>Week starts</span><input type="date" value={f.weekStart} onChange={set('weekStart')} /></label>
        <label><span>Week ends</span><input type="date" value={f.weekEnd} onChange={set('weekEnd')} /></label>
        <label className="wide"><span>Intro</span><textarea rows={2} value={f.intro} onChange={set('intro')} maxLength={800} /></label>
        <label className="wide">
          <span>Top story</span>
          <select value={f.topStory} onChange={set('topStory')}>
            <option value="">Choose an approved story…</option>
            {approved.filter((i) => !f.items.includes(i.id)).map((i) => <option key={i.id} value={i.id}>{i.title}</option>)}
          </select>
        </label>
      </div>

      <h3>Quick reads <small>({f.items.length}; aim for 3-7 stories in total)</small></h3>
      <ol className="news-builder-list">
        {f.items.map((id, i) => (
          <li key={id}>
            <span>{byId.get(id)?.title || 'Story no longer approved'}</span>
            <button type="button" onClick={() => move(i, -1)} aria-label="Move up"><i className="bi bi-arrow-up" aria-hidden="true" /></button>
            <button type="button" onClick={() => move(i, 1)} aria-label="Move down"><i className="bi bi-arrow-down" aria-hidden="true" /></button>
            <button type="button" onClick={() => setF((x) => ({ ...x, items: x.items.filter((v) => v !== id) }))} aria-label="Remove"><i className="bi bi-x" aria-hidden="true" /></button>
          </li>
        ))}
      </ol>
      <select value="" onChange={(e) => e.target.value && setF((x) => ({ ...x, items: [...x.items, e.target.value].slice(0, 9) }))} aria-label="Add a quick read">
        <option value="">+ Add an approved story…</option>
        {candidates.map((i) => <option key={i.id} value={i.id}>{i.title}</option>)}
      </select>
      {approved.length === 0 && <p className="news-muted">No approved stories yet. Approve some in the review queue first.</p>}

      <div className="news-admin-grid">
        <label><span>Try this: title</span><input value={f.tryTitle} onChange={set('tryTitle')} maxLength={140} /></label>
        <label><span>Try this: link</span><input value={f.tryUrl} onChange={set('tryUrl')} placeholder="https://…" /></label>
        <label className="wide"><span>Try this: description</span><textarea rows={2} value={f.tryDescription} onChange={set('tryDescription')} maxLength={400} /></label>
        <label className="wide"><span>Community question</span><input value={f.communityQuestion} onChange={set('communityQuestion')} placeholder="How could this change your next project?" maxLength={300} /></label>
      </div>

      <div className="news-admin-actions">
        <button type="button" className="news-btn" onClick={save}>{digest ? 'Save changes' : 'Create draft'}</button>
        {digest && !published && (
          <>
            <label className="news-check"><input type="checkbox" checked={createDiscussion} onChange={(e) => setCreateDiscussion(e.target.checked)} /> Open a forum discussion for the question</label>
            <input type="datetime-local" value={publishAt} onChange={(e) => setPublishAt(e.target.value)} aria-label="Publish at (optional)" />
            <button type="button" className="news-btn ok" onClick={publish}><i className="bi bi-broadcast" aria-hidden="true" /> {publishAt ? 'Schedule' : 'Publish now'}</button>
          </>
        )}
      </div>
    </section>
  );
}

export default function AdminNews() {
  const [tab, setTab] = useState('queue');
  const [status, setStatus] = useState('candidate');
  const [categories, setCategories] = useState([]);
  const [queue, setQueue] = useState(null);
  const [approved, setApproved] = useState([]);
  const [sources, setSources] = useState(null);
  const [digests, setDigests] = useState(null);
  const [editingDigest, setEditingDigest] = useState(null);
  const [newSource, setNewSource] = useState({ name: '', baseUrl: '', feedUrl: '', category: 'ai' });
  const [manual, setManual] = useState({ url: '', title: '', sourceName: '', publishedAt: '', category: '' });
  const [message, setMessage] = useState('');
  const [version, setVersion] = useState(0);

  const reload = useCallback(() => setVersion((v) => v + 1), []);
  const flash = (m) => {
    setMessage(m);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  useEffect(() => {
    let cancelled = false;
    apiRequest('/news/config').then((c) => !cancelled && setCategories(c.categories)).catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    const done = (setter) => (r) => !cancelled && setter(r);
    const fail = (e) => !cancelled && setMessage(e.message);
    if (tab === 'queue') apiRequest(`/news/admin/items?status=${status}`).then(done(setQueue)).catch(fail);
    if (tab === 'sources') apiRequest('/news/admin/sources').then(done(setSources)).catch(fail);
    if (tab === 'digests') {
      apiRequest('/news/admin/digests').then((r) => done(setDigests)(r.digests)).catch(fail);
      Promise.all([apiRequest('/news/admin/items?status=approved'), apiRequest('/news/admin/items?status=published')])
        .then(([a, p]) => done(setApproved)([...a.items, ...p.items])).catch(fail);
    }
    return () => {
      cancelled = true;
    };
  }, [tab, status, version]);

  const call = async (fn, success) => {
    try {
      const r = await fn();
      flash(typeof success === 'function' ? success(r) : success);
      reload();
    } catch (e) {
      flash(e.message);
    }
  };

  return (
    <>
      <Navbar />
      <main className="news-page">
        <div className="container">
          <Link to="/admin" className="news-back"><i className="bi bi-arrow-left" aria-hidden="true" /> Admin dashboard</Link>
          <h1 className="news-admin-title"><i className="bi bi-newspaper" aria-hidden="true" /> Tech News editor</h1>

          <div className="news-chips" role="tablist">
            {[['queue', 'Review queue', 'bi-inboxes'], ['add', 'Add a story', 'bi-plus-circle'], ['digests', 'Digests', 'bi-journal-richtext'], ['sources', 'Sources', 'bi-rss'], ['daily', 'Daily news', 'bi-lightning-charge']].map(([id, label, icon]) => (
              <button key={id} type="button" role="tab" aria-selected={tab === id} className={tab === id ? 'active' : ''} onClick={() => { setTab(id); setMessage(''); }}>
                <i className={`bi ${icon}`} aria-hidden="true" /> {label}
              </button>
            ))}
          </div>

          {message && <p className="news-filter-note" role="status">{message}</p>}

          {tab === 'queue' && (
            <>
              <div className="news-status-tabs">
                {STATUSES.map((s) => (
                  <button key={s} type="button" className={status === s ? 'active' : ''} onClick={() => setStatus(s)}>
                    {s} <small>{queue?.counts?.[s] ?? ''}</small>
                  </button>
                ))}
                <button type="button" className="news-btn" onClick={() => call(() => apiRequest('/news/admin/ingest', { method: 'POST' }), (r) => (r.results.length ? r.results.map((x) => `${x.source}: ${x.ok ? `+${x.added} new` : x.error}`).join(' · ') : 'No active sources with a feed.'))}>
                  <i className="bi bi-arrow-repeat" aria-hidden="true" /> Fetch active sources now
                </button>
              </div>
              {!queue && <p className="news-muted">Loading…</p>}
              {queue?.items.length === 0 && <div className="news-empty"><span aria-hidden="true">📭</span><p>Nothing {status} right now.</p></div>}
              {queue?.items.map((item) => (
                <ItemEditor key={`${item.id}-${version}`} item={item} categories={categories} onDone={reload} onMessage={flash} />
              ))}
            </>
          )}

          {tab === 'add' && (
            <form
              className="news-builder"
              onSubmit={(e) => {
                e.preventDefault();
                call(() => apiRequest('/news/admin/items', { method: 'POST', body: JSON.stringify(manual) }), 'Added to the review queue (Reviewing).');
                setManual({ url: '', title: '', sourceName: '', publishedAt: '', category: '' });
              }}
            >
              <h2>Add a story manually</h2>
              <p className="news-muted">Prefer primary sources: official blogs, release notes, changelogs and research papers.</p>
              <div className="news-admin-grid">
                <label className="wide"><span>Original link</span><input type="url" required value={manual.url} onChange={(e) => setManual((m) => ({ ...m, url: e.target.value }))} placeholder="https://…" /></label>
                <label className="wide"><span>Headline</span><input required value={manual.title} onChange={(e) => setManual((m) => ({ ...m, title: e.target.value }))} maxLength={200} /></label>
                <label><span>Source name</span><input required value={manual.sourceName} onChange={(e) => setManual((m) => ({ ...m, sourceName: e.target.value }))} placeholder="Python.org" /></label>
                <label><span>Original publish date</span><input type="date" value={manual.publishedAt} onChange={(e) => setManual((m) => ({ ...m, publishedAt: e.target.value }))} /></label>
                <label>
                  <span>Category</span>
                  <select value={manual.category} onChange={(e) => setManual((m) => ({ ...m, category: e.target.value }))}>
                    <option value="">Choose…</option>
                    {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </label>
              </div>
              <div className="news-admin-actions"><button type="submit" className="news-btn ok">Add to review queue</button></div>
            </form>
          )}

          {tab === 'digests' && (
            <>
              {editingDigest !== null ? (
                <DigestBuilder
                  key={editingDigest?.id || 'new'}
                  digest={editingDigest || null}
                  approved={approved}
                  onMessage={flash}
                  onDone={() => { setEditingDigest(null); reload(); }}
                />
              ) : (
                <button type="button" className="news-btn ok" onClick={() => setEditingDigest(false)}><i className="bi bi-plus-lg" aria-hidden="true" /> New digest</button>
              )}
              <div className="news-admin-list">
                {digests?.map((d) => (
                  <article key={d.id} className="news-admin-row">
                    <strong>{d.title}</strong>
                    <span className="news-muted">{formatDate(d.weekStart)} – {formatDate(d.weekEnd)} · {d.items.length + (d.topStory ? 1 : 0)} stories</span>
                    <span className="news-pill">{d.status === 'published' ? (new Date(d.publishedAt) > new Date() ? `scheduled ${formatDate(d.publishedAt)}` : 'published') : 'draft'}</span>
                    {d.status === 'published' && <Link to={`/news/${d.slug}`}>View</Link>}
                    <button type="button" className="news-btn" onClick={() => setEditingDigest(d)}>Edit</button>
                  </article>
                ))}
              </div>
            </>
          )}

          {tab === 'daily' && <DailyNewsAdmin />}

          {tab === 'sources' && (
            <>
              <form
                className="news-builder"
                onSubmit={(e) => {
                  e.preventDefault();
                  call(() => apiRequest('/news/admin/sources', { method: 'POST', body: JSON.stringify(newSource) }), 'Source added (inactive). Test it, then enable.');
                  setNewSource({ name: '', baseUrl: '', feedUrl: '', category: 'ai' });
                }}
              >
                <h2>Add an approved source</h2>
                <div className="news-admin-grid">
                  <label><span>Name</span><input required value={newSource.name} onChange={(e) => setNewSource((s) => ({ ...s, name: e.target.value }))} /></label>
                  <label><span>Website</span><input required type="url" value={newSource.baseUrl} onChange={(e) => setNewSource((s) => ({ ...s, baseUrl: e.target.value }))} /></label>
                  <label><span>RSS/Atom feed (optional)</span><input type="url" value={newSource.feedUrl} onChange={(e) => setNewSource((s) => ({ ...s, feedUrl: e.target.value }))} /></label>
                  <label>
                    <span>Category</span>
                    <select value={newSource.category} onChange={(e) => setNewSource((s) => ({ ...s, category: e.target.value }))}>
                      {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </label>
                </div>
                <div className="news-admin-actions"><button type="submit" className="news-btn ok">Add source</button></div>
              </form>

              <div className="news-admin-list">
                {sources?.sources.length === 0 && <p className="news-muted">No sources yet. Run <code>node scripts/seedNewsSources.js</code> to add the suggested ones.</p>}
                {sources?.sources.map((s) => (
                  <article key={s._id} className="news-admin-row">
                    <strong>{s.name}</strong>
                    <span className={`news-pill ${s.isActive ? 'ok' : ''}`}>{s.isActive ? 'active' : 'paused'}</span>
                    <span className="news-muted">
                      {s.feedUrl || 'no feed (manual only)'}
                      {s.lastSuccessAt && ` · last success ${timeAgo(s.lastSuccessAt)}`}
                      {s.lastError && <span className="news-err"> · last error: {s.lastError}</span>}
                    </span>
                    {s.feedUrl && <button type="button" className="news-btn" onClick={() => call(() => apiRequest(`/news/admin/sources/${s._id}/fetch`, { method: 'POST' }), (r) => `${s.name}: ${r.found} found, ${r.added} new candidates.`)}>Test fetch</button>}
                    <button type="button" className="news-btn" onClick={() => call(() => apiRequest(`/news/admin/sources/${s._id}`, { method: 'PUT', body: JSON.stringify({ ...s, isActive: !s.isActive }) }), s.isActive ? 'Paused.' : 'Enabled.')}>
                      {s.isActive ? 'Pause' : 'Enable'}
                    </button>
                  </article>
                ))}
              </div>

              {sources?.logs.length > 0 && (
                <>
                  <h2 className="news-section-title">Recent fetches</h2>
                  <div className="news-admin-list">
                    {sources.logs.map((l) => (
                      <div key={l._id} className="news-admin-row">
                        <span className={`news-pill ${l.ok ? 'ok' : 'bad'}`}>{l.ok ? 'ok' : 'failed'}</span>
                        <strong>{l.source}</strong>
                        <span className="news-muted">{l.ok ? `${l.found} found, ${l.added} new` : l.error} · {l.trigger} · {timeAgo(l.createdAt)}</span>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </>
          )}
        </div>
      </main>
    </>
  );
}

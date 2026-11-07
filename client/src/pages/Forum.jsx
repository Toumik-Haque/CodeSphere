import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { useAuth } from '../context/AuthContext';
import { apiRequest } from '../lib/api';
import { loadForumConfig } from '../lib/forum';
import { timeAgo } from '../lib/time';
import '../css/Forum.css';

const TABS = [
  { id: 'latest', label: 'Latest', icon: 'bi-clock-history' },
  { id: 'trending', label: 'Trending', icon: 'bi-graph-up-arrow' },
  { id: 'unanswered', label: 'Unanswered', icon: 'bi-question-circle' },
  { id: 'following', label: 'Following', icon: 'bi-bell', auth: true },
  { id: 'saved', label: 'Saved', icon: 'bi-bookmark', auth: true },
];

export function AuthorBadge({ author, size = 'sm' }) {
  return (
    <span className={`forum-author forum-author-${size}`}>
      <span className="forum-avatar" aria-hidden="true">{author.initials}</span>
      <span>
        <strong>{author.name}</strong>
        {author.isStaff ? <em className="forum-staff">Team</em> : author.year && <small>{author.year}</small>}
      </span>
    </span>
  );
}

export function ThreadCard({ thread, config }) {
  const category = config?.categories.find((c) => c.id === thread.category);
  const type = config?.postTypes.find((t) => t.id === thread.postType);
  return (
    <article className={`forum-card ${thread.pinned ? 'is-pinned' : ''}`}>
      <div className="forum-card-top">
        {thread.pinned && <span className="forum-pill pinned"><i className="bi bi-pin-angle-fill" aria-hidden="true" /> Pinned</span>}
        {category && <span className="forum-pill"><i className={`bi ${category.icon}`} aria-hidden="true" /> {category.name}</span>}
        {type && <span className={`forum-pill type-${type.id}`}>{type.name}</span>}
        {thread.answered && <span className="forum-pill answered"><i className="bi bi-check-circle-fill" aria-hidden="true" /> Answered</span>}
        {thread.locked && <span className="forum-pill locked"><i className="bi bi-lock-fill" aria-hidden="true" /> Locked</span>}
      </div>
      <h3>
        <Link to={`/forum/${thread.id}`} className="forum-card-link">{thread.title}</Link>
      </h3>
      <p className="forum-card-preview">{thread.preview}</p>
      {thread.tags.length > 0 && (
        <div className="forum-tags">
          {thread.tags.map((tag) => (
            <Link key={tag} to={`/forum?tag=${encodeURIComponent(tag)}`} className="forum-tag">#{tag}</Link>
          ))}
        </div>
      )}
      <div className="forum-card-meta">
        <AuthorBadge author={thread.author} />
        <span className="forum-card-stats">
          <span title="Replies"><i className="bi bi-chat" aria-hidden="true" /> {thread.replyCount}</span>
          <span title="Reactions"><i className="bi bi-heart" aria-hidden="true" /> {thread.reactionCount}</span>
          <span title="Views"><i className="bi bi-eye" aria-hidden="true" /> {thread.viewCount}</span>
          <span title="Last activity">{timeAgo(thread.lastActivityAt)}</span>
        </span>
      </div>
    </article>
  );
}

export default function Forum() {
  const { user, token } = useAuth();
  const isLoggedIn = Boolean(user && token);
  const [params, setParams] = useSearchParams();
  const [config, setConfig] = useState(null);
  const [data, setData] = useState(null);
  const [tags, setTags] = useState([]);
  const [error, setError] = useState('');
  const [search, setSearch] = useState(params.get('q') || '');

  const tab = params.get('tab') || 'latest';
  const category = params.get('category') || '';
  const type = params.get('type') || '';
  const tag = params.get('tag') || '';
  const q = params.get('q') || '';
  const page = Number(params.get('page')) || 1;

  const update = (changes) => {
    const next = new URLSearchParams(params);
    Object.entries(changes).forEach(([key, value]) => (value ? next.set(key, value) : next.delete(key)));
    if (!('page' in changes)) next.delete('page');
    setParams(next);
  };

  useEffect(() => {
    let cancelled = false;
    loadForumConfig().then((c) => !cancelled && setConfig(c)).catch(() => {});
    apiRequest('/forum/tags').then((t) => !cancelled && setTags(t.tags)).catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    const query = new URLSearchParams({ tab, page: String(page) });
    if (category) query.set('category', category);
    if (type) query.set('type', type);
    if (tag) query.set('tag', tag);
    if (q) query.set('q', q);
    apiRequest(`/forum/threads?${query}`)
      .then((result) => {
        if (cancelled) return;
        setError('');
        setData(result);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err.message);
        setData({ threads: [], page: 1, pages: 1, total: 0 });
      });
    return () => {
      cancelled = true;
    };
  }, [tab, category, type, tag, q, page]);

  const activeCategory = config?.categories.find((c) => c.id === category);

  return (
    <>
      <Navbar />
      <main className="forum-page">
        <div className="container">
          <header className="forum-hero">
            <span className="section-eyebrow"><span className="section-eyebrow-line" /> STUDENT DISCUSSION FORUM</span>
            <h1>Ask, share, discuss. <span className="gold-text">Every good idea starts with a conversation.</span></h1>
            <form
              className="forum-search"
              role="search"
              onSubmit={(e) => {
                e.preventDefault();
                update({ q: search.trim() });
              }}
            >
              <i className="bi bi-search" aria-hidden="true" />
              <input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search discussions…"
                aria-label="Search discussions"
                maxLength={100}
              />
              <button type="submit">Search</button>
            </form>
            {isLoggedIn ? (
              <Link to="/forum/new" className="btn btn-gold forum-create">
                <i className="bi bi-plus-lg" aria-hidden="true" /> Create post
              </Link>
            ) : (
              <Link to="/login" className="btn btn-gold forum-create">
                <i className="bi bi-box-arrow-in-right" aria-hidden="true" /> Sign in to post
              </Link>
            )}
          </header>

          <div className="forum-layout">
            {/* Categories */}
            <aside className="forum-sidebar" aria-label="Categories">
              <h2>Categories</h2>
              <ul>
                <li>
                  <button type="button" className={!category ? 'active' : ''} onClick={() => update({ category: '' })}>
                    <i className="bi bi-grid" aria-hidden="true" /> All categories
                  </button>
                </li>
                {config?.categories.map((c) => (
                  <li key={c.id}>
                    <button type="button" className={category === c.id ? 'active' : ''} onClick={() => update({ category: c.id })}>
                      <i className={`bi ${c.icon}`} aria-hidden="true" /> {c.name}
                    </button>
                  </li>
                ))}
              </ul>
            </aside>

            {/* Feed */}
            <section className="forum-feed" aria-label="Discussions">
              <div className="forum-tabs" role="tablist" aria-label="Sort discussions">
                {TABS.filter((t) => !t.auth || isLoggedIn).map((t) => (
                  <button key={t.id} type="button" role="tab" aria-selected={tab === t.id} className={tab === t.id ? 'active' : ''} onClick={() => update({ tab: t.id })}>
                    <i className={`bi ${t.icon}`} aria-hidden="true" /> {t.label}
                  </button>
                ))}
              </div>

              <div className="forum-filters">
                <select value={type} onChange={(e) => update({ type: e.target.value })} aria-label="Post type">
                  <option value="">All post types</option>
                  {config?.postTypes.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
                {/* Mobile category picker (the sidebar hides on small screens) */}
                <select className="forum-category-select" value={category} onChange={(e) => update({ category: e.target.value })} aria-label="Category">
                  <option value="">All categories</option>
                  {config?.categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
                {(q || tag || category || type) && (
                  <button
                    type="button"
                    className="forum-clear"
                    onClick={() => {
                      setSearch('');
                      update({ q: '', tag: '', category: '', type: '' });
                    }}
                  >
                    <i className="bi bi-x-circle" aria-hidden="true" /> Clear filters
                  </button>
                )}
              </div>

              {(q || tag || activeCategory) && (
                <p className="forum-filter-note">
                  Showing
                  {activeCategory && <> <strong>{activeCategory.name}</strong></>}
                  {tag && <> tagged <strong>#{tag}</strong></>}
                  {q && <> matching <strong>“{q}”</strong></>}
                  {data && <> · {data.total} found</>}
                </p>
              )}

              {error && <p className="forum-error" role="alert">{error}</p>}

              {!data && (
                <div aria-busy="true">
                  {Array.from({ length: 4 }, (_, i) => <div key={i} className="forum-card forum-skeleton" />)}
                </div>
              )}

              {data && data.threads.length === 0 && !error && (
                <div className="forum-empty">
                  <span aria-hidden="true">💬</span>
                  <h3>No discussions here yet</h3>
                  <p>Start the conversation. Someone else is probably wondering the same thing.</p>
                  {isLoggedIn && <Link to="/forum/new" className="btn btn-gold">Create the first post</Link>}
                </div>
              )}

              {data?.threads.map((thread) => <ThreadCard key={thread.id} thread={thread} config={config} />)}

              {data && data.pages > 1 && (
                <nav className="forum-pagination" aria-label="Pages">
                  <button type="button" disabled={page <= 1} onClick={() => update({ page: String(page - 1) })}>
                    <i className="bi bi-chevron-left" aria-hidden="true" /> Previous
                  </button>
                  <span>Page {data.page} of {data.pages}</span>
                  <button type="button" disabled={page >= data.pages} onClick={() => update({ page: String(page + 1) })}>
                    Next <i className="bi bi-chevron-right" aria-hidden="true" />
                  </button>
                </nav>
              )}
            </section>

            {/* Right rail */}
            <aside className="forum-rail">
              <section className="forum-rail-card">
                <h2><i className="bi bi-shield-check" aria-hidden="true" /> Community guidelines</h2>
                <ul>{config?.guidelines.map((g) => <li key={g}>{g}</li>)}</ul>
                <p className="forum-rail-note">See something wrong? Use <strong>Report</strong> on any post.</p>
              </section>

              <section className="forum-rail-card forum-prompt">
                <h2><i className="bi bi-lightbulb" aria-hidden="true" /> This week&apos;s prompt</h2>
                <p>What&apos;s one thing you learned this week that you wish you&apos;d known earlier?</p>
                {isLoggedIn && <Link to="/forum/new?category=open&type=discussion">Share yours →</Link>}
              </section>

              {tags.length > 0 && (
                <section className="forum-rail-card">
                  <h2><i className="bi bi-hash" aria-hidden="true" /> Popular tags</h2>
                  <div className="forum-tags">
                    {tags.map((t) => (
                      <button key={t.tag} type="button" className={`forum-tag ${tag === t.tag ? 'active' : ''}`} onClick={() => update({ tag: tag === t.tag ? '' : t.tag })}>
                        #{t.tag} <small>{t.count}</small>
                      </button>
                    ))}
                  </div>
                </section>
              )}
            </aside>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}

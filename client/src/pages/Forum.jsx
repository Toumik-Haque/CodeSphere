import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { useAuth } from '../context/AuthContext';
import { apiRequest } from '../lib/api';
import { loadForumConfig } from '../lib/forum';
import { timeAgo } from '../lib/time';
import AvatarUpload from '../components/AvatarUpload';
import '../css/Forum.css';
import '../css/ForumSocial.css';

const TABS = [
  { id: 'latest', label: 'Latest' },
  { id: 'trending', label: 'Trending' },
  { id: 'unanswered', label: 'Unanswered' },
  { id: 'following', label: 'Following', auth: true },
  { id: 'saved', label: 'Saved', auth: true },
];

// A stable colour per person, so avatars are easy to tell apart.
const avatarHue = (name = '') => [...name].reduce((h, c) => (h * 31 + c.charCodeAt(0)) % 360, 7);

// Profile photo when the person has one, coloured initials otherwise.
function Avatar({ person, className }) {
  if (person.avatarUrl) {
    return (
      <span className={`${className} has-photo`} aria-hidden="true">
        <img src={person.avatarUrl} alt="" loading="lazy" />
      </span>
    );
  }
  return <span className={className} style={{ '--hue': avatarHue(person.name) }} aria-hidden="true">{person.initials}</span>;
}

export function AuthorBadge({ author, size = 'sm' }) {
  return (
    <span className={`forum-author forum-author-${size}`}>
      <Avatar person={author} className="forum-avatar fx-avatar" />
      <span>
        <strong>{author.name}</strong>
        {author.isStaff
          ? <i className="bi bi-patch-check-fill fx-verified" title="CodeSphere team" aria-label="Team" />
          : author.year && <small>{author.year}</small>}
      </span>
    </span>
  );
}

export function ThreadCard({ thread, config }) {
  const category = config?.categories.find((c) => c.id === thread.category);
  const type = config?.postTypes.find((t) => t.id === thread.postType);
  const { author } = thread;
  return (
    <article className={`fx-post ${thread.pinned ? 'is-pinned' : ''}`}>
      <Avatar person={author} className="fx-avatar" />
      <div className="fx-post-main">
        {thread.pinned && <p className="fx-pinned"><i className="bi bi-pin-angle-fill" aria-hidden="true" /> Pinned post</p>}
        <header className="fx-post-head">
          <strong>{author.name}</strong>
          {author.isStaff && <i className="bi bi-patch-check-fill fx-verified" title="CodeSphere team" aria-label="Team" />}
          <span className="fx-muted">
            {author.year && !author.isStaff ? `${author.year} · ` : ''}{timeAgo(thread.lastActivityAt)}
          </span>
          {category && <span className="fx-chip"><i className={`bi ${category.icon}`} aria-hidden="true" /> {category.name}</span>}
        </header>
        <h3>
          <Link to={`/forum/${thread.id}`} className="fx-post-link">{thread.title}</Link>
        </h3>
        <p className="fx-preview">{thread.preview}</p>
        {(type || thread.answered || thread.locked || thread.tags.length > 0) && (
          <div className="fx-labels">
            {type && <span className={`fx-label type-${type.id}`}>{type.name}</span>}
            {thread.answered && <span className="fx-label answered"><i className="bi bi-check-circle-fill" aria-hidden="true" /> Answered</span>}
            {thread.locked && <span className="fx-label locked"><i className="bi bi-lock-fill" aria-hidden="true" /> Locked</span>}
            {thread.tags.map((tag) => (
              <Link key={tag} to={`/forum?tag=${encodeURIComponent(tag)}`} className="fx-hashtag">#{tag}</Link>
            ))}
          </div>
        )}
        <footer className="fx-actions">
          <span className="fx-act reply" title="Replies"><i className="bi bi-chat" aria-hidden="true" /> {thread.replyCount}</span>
          <span className="fx-act like" title="Reactions"><i className="bi bi-heart" aria-hidden="true" /> {thread.reactionCount}</span>
          <span className="fx-act view" title="Views"><i className="bi bi-bar-chart" aria-hidden="true" /> {thread.viewCount}</span>
        </footer>
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
  const tabs = TABS.filter((t) => !t.auth || isLoggedIn);
  const clearAll = () => {
    setSearch('');
    update({ q: '', tag: '', category: '', type: '' });
  };

  return (
    <>
      <Navbar />
      <main className="forum-page fx-page">
        <div className="container fx-shell">
          {/* Left nav */}
          <aside className="fx-nav" aria-label="Categories">
            <p className="fx-nav-title">Forum</p>
            <button type="button" className={!category ? 'active' : ''} onClick={() => update({ category: '' })}>
              <i className="bi bi-house-door" aria-hidden="true" /> <span>Home</span>
            </button>
            {config?.categories.map((c) => (
              <button key={c.id} type="button" className={category === c.id ? 'active' : ''} onClick={() => update({ category: c.id })}>
                <i className={`bi ${c.icon}`} aria-hidden="true" /> <span>{c.name}</span>
              </button>
            ))}
            <Link to={isLoggedIn ? '/forum/new' : '/login'} className="fx-nav-post">
              <i className="bi bi-pencil-square" aria-hidden="true" /> <span>{isLoggedIn ? 'New post' : 'Sign in to post'}</span>
            </Link>
          </aside>

          {/* Feed */}
          <section className="fx-feed" aria-label="Discussions">
            <div className="fx-feed-head">
              <h1>{activeCategory ? activeCategory.name : 'Discussions'}</h1>
              <nav className="fx-tabs" role="tablist" aria-label="Sort discussions">
                {tabs.map((t) => (
                  <button key={t.id} type="button" role="tab" aria-selected={tab === t.id} className={tab === t.id ? 'active' : ''} onClick={() => update({ tab: t.id })}>
                    <span>{t.label}</span>
                  </button>
                ))}
              </nav>
            </div>

            {/* Category chips (small screens) */}
            <div className="fx-chips" aria-label="Categories">
              <button type="button" className={!category ? 'active' : ''} onClick={() => update({ category: '' })}>All</button>
              {config?.categories.map((c) => (
                <button key={c.id} type="button" className={category === c.id ? 'active' : ''} onClick={() => update({ category: c.id })}>{c.name}</button>
              ))}
            </div>

            {isLoggedIn ? (
              <div className="fx-composer">
                <AvatarUpload className="fx-avatar" />
                <Link to={`/forum/new${category ? `?category=${category}` : ''}`} className="fx-composer-link">
                  <span className="fx-composer-input">What&apos;s on your mind? Ask a question or share something…</span>
                  <span className="fx-btn">Post</span>
                </Link>
              </div>
            ) : (
              <div className="fx-composer guest">
                <span className="fx-composer-input">Join the conversation with fellow students.</span>
                <Link to="/login" className="fx-btn">Sign in</Link>
              </div>
            )}

            <div className="fx-filterbar">
              <select value={type} onChange={(e) => update({ type: e.target.value })} aria-label="Post type">
                <option value="">All post types</option>
                {config?.postTypes.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
              {(q || tag) && (
                <p>
                  {tag && <strong>#{tag}</strong>}
                  {q && <> “<strong>{q}</strong>”</>}
                  {data && <> · {data.total} {data.total === 1 ? 'post' : 'posts'}</>}
                </p>
              )}
              {(q || tag || category || type) && (
                <button type="button" className="fx-clear" onClick={clearAll}>
                  <i className="bi bi-x-lg" aria-hidden="true" /> Clear
                </button>
              )}
            </div>

            {error && <p className="forum-error" role="alert">{error}</p>}

            {!data && (
              <div aria-busy="true">
                {Array.from({ length: 4 }, (_, i) => (
                  <div key={i} className="fx-post fx-skeleton">
                    <span className="fx-avatar" />
                    <div className="fx-post-main"><i /><i /><i /></div>
                  </div>
                ))}
              </div>
            )}

            {data && data.threads.length === 0 && !error && (
              <div className="fx-empty">
                <span aria-hidden="true">💬</span>
                <h3>Nothing here yet</h3>
                <p>Start the conversation. Someone else is probably wondering the same thing.</p>
                {isLoggedIn && <Link to="/forum/new" className="fx-btn">Create the first post</Link>}
              </div>
            )}

            {data?.threads.map((thread) => <ThreadCard key={thread.id} thread={thread} config={config} />)}

            {data && data.pages > 1 && (
              <nav className="fx-pagination" aria-label="Pages">
                <button type="button" disabled={page <= 1} onClick={() => update({ page: String(page - 1) })}>
                  <i className="bi bi-arrow-left" aria-hidden="true" /> Newer
                </button>
                <span>{data.page} / {data.pages}</span>
                <button type="button" disabled={page >= data.pages} onClick={() => update({ page: String(page + 1) })}>
                  Older <i className="bi bi-arrow-right" aria-hidden="true" />
                </button>
              </nav>
            )}
          </section>

          {/* Right rail */}
          <aside className="fx-rail">
            <form
              className="fx-search"
              role="search"
              onSubmit={(e) => {
                e.preventDefault();
                update({ q: search.trim() });
              }}
            >
              <i className="bi bi-search" aria-hidden="true" />
              <input type="search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search the forum" aria-label="Search discussions" maxLength={100} />
            </form>

            {tags.length > 0 && (
              <section className="fx-box">
                <h2>Trending tags</h2>
                {tags.slice(0, 8).map((t) => (
                  <button key={t.tag} type="button" className={`fx-trend ${tag === t.tag ? 'active' : ''}`} onClick={() => update({ tag: tag === t.tag ? '' : t.tag })}>
                    <small>Trending in CodeSphere</small>
                    <strong>#{t.tag}</strong>
                    <small>{t.count} {t.count === 1 ? 'post' : 'posts'}</small>
                  </button>
                ))}
              </section>
            )}

            <section className="fx-box">
              <h2>This week&apos;s prompt</h2>
              <p>What&apos;s one thing you learned this week that you wish you&apos;d known earlier?</p>
              {isLoggedIn && <Link to="/forum/new?category=open&type=discussion" className="fx-box-link">Share yours</Link>}
            </section>

            <section className="fx-box">
              <h2>Community guidelines</h2>
              <ul>{config?.guidelines.map((g) => <li key={g}>{g}</li>)}</ul>
              <p className="fx-muted">See something wrong? Use Report on any post.</p>
            </section>
          </aside>
        </div>
      </main>
      <Footer />
    </>
  );
}

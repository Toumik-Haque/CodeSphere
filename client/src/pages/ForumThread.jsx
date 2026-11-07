import { useCallback, useEffect, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import SafeText from '../components/SafeText';
import { AuthorBadge } from './Forum';
import { apiRequest } from '../lib/api';
import { loadForumConfig, REACTIONS } from '../lib/forum';
import { celebrateBadges } from '../lib/badges';
import { openThreadStream } from '../lib/realtime';
import { useAuth } from '../context/AuthContext';
import MentionTextarea from '../components/MentionTextarea';
import RichText from '../components/RichText';
import RichTextEditor from '../components/RichTextEditor';
import { timeAgo } from '../lib/time';
import '../css/Forum.css';
import '../css/ForumSocial.css';

function Reactions({ targetType, targetId, counts, mine = [], disabled, onError }) {
  const [state, setState] = useState({ counts, mine });

  const toggle = async (type) => {
    try {
      const result = await apiRequest('/forum/reactions', {
        method: 'POST',
        body: JSON.stringify({ targetType, targetId, type }),
      });
      setState({ counts: result.reactions, mine: result.mine });
    } catch (err) {
      onError(err.message);
    }
  };

  return (
    <div className="forum-reactions">
      {REACTIONS.map((r) => (
        <button
          key={r.id}
          type="button"
          className={state.mine.includes(r.id) ? 'active' : ''}
          onClick={() => toggle(r.id)}
          disabled={disabled}
          aria-pressed={state.mine.includes(r.id)}
          title={disabled ? 'Sign in to react' : r.label}
        >
          <span aria-hidden="true">{r.emoji}</span> {state.counts?.[r.id] || 0}
          <span className="visually-hidden">{r.label}</span>
        </button>
      ))}
    </div>
  );
}

function ReportDialog({ target, reasons, onClose, onDone }) {
  const [reason, setReason] = useState('');
  const [detail, setDetail] = useState('');
  const [error, setError] = useState('');
  const [sending, setSending] = useState(false);

  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const send = async (e) => {
    e.preventDefault();
    setSending(true);
    try {
      const result = await apiRequest('/forum/reports', {
        method: 'POST',
        body: JSON.stringify({ targetType: target.type, targetId: target.id, reason, detail }),
      });
      onDone(result.message);
    } catch (err) {
      setError(err.message);
      setSending(false);
    }
  };

  return (
    <div className="forum-modal-backdrop" onClick={onClose} role="presentation">
      <form className="forum-modal" role="dialog" aria-modal="true" aria-labelledby="report-title" onClick={(e) => e.stopPropagation()} onSubmit={send}>
        <h2 id="report-title"><i className="bi bi-flag" aria-hidden="true" /> Report this {target.type === 'thread' ? 'post' : 'reply'}</h2>
        <p className="forum-muted">Reports are private. Moderators review every one.</p>
        <fieldset>
          <legend className="visually-hidden">Reason</legend>
          {reasons.map((r) => (
            <label key={r.id} className="forum-radio">
              <input type="radio" name="reason" value={r.id} checked={reason === r.id} onChange={() => setReason(r.id)} required />
              {r.label}
            </label>
          ))}
        </fieldset>
        <label>
          <span>More details <em>(optional)</em></span>
          <textarea value={detail} onChange={(e) => setDetail(e.target.value)} rows={3} maxLength={500} />
        </label>
        {error && <p className="forum-error" role="alert">{error}</p>}
        <div className="forum-form-actions">
          <button type="button" className="forum-btn-ghost" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn btn-gold" disabled={!reason || sending}>{sending ? 'Sending…' : 'Send report'}</button>
        </div>
      </form>
    </div>
  );
}

function ReplyComposer({ threadId, parentReply, onPosted, onCancel, autoFocus, limit }) {
  const [body, setBody] = useState('');
  const [error, setError] = useState('');
  const [sending, setSending] = useState(false);

  const send = async (e) => {
    e.preventDefault();
    setSending(true);
    setError('');
    try {
      const result = await apiRequest(`/forum/threads/${threadId}/replies`, {
        method: 'POST',
        body: JSON.stringify({ body, parentReply: parentReply?.id }),
      });
      setBody('');
      celebrateBadges(result.newBadges);
      onPosted(result.id);
    } catch (err) {
      setError(err.message);
    } finally {
      setSending(false);
    }
  };

  return (
    <form className="forum-composer" onSubmit={send}>
      {parentReply && (
        <p className="forum-replying-to">
          Replying to <strong>{parentReply.author.name}</strong>
          <button type="button" onClick={onCancel} aria-label="Cancel reply"><i className="bi bi-x" aria-hidden="true" /></button>
        </p>
      )}
      <MentionTextarea
        value={body}
        onChange={setBody}
        rows={parentReply ? 3 : 4}
        placeholder="Write a helpful, kind reply… (``` for code, @ to mention)"
        maxLength={limit}
        required
        autoFocus={autoFocus}
        aria-label="Your reply"
      />
      {error && <p className="forum-error" role="alert">{error}</p>}
      <div className="forum-composer-actions">
        <small className="forum-muted">Be kind. Disagree with ideas, not people.</small>
        <button type="submit" className="btn btn-gold" disabled={sending || body.trim().length < 2}>
          {sending ? 'Posting…' : 'Post reply'}
        </button>
      </div>
    </form>
  );
}

function EditBox({ initial, onSave, onCancel, limit, rich = false }) {
  const [value, setValue] = useState(initial);
  const [error, setError] = useState('');
  return (
    <form
      className="forum-composer"
      onSubmit={async (e) => {
        e.preventDefault();
        try {
          await onSave(value);
        } catch (err) {
          setError(err.message);
        }
      }}
    >
      {rich
        ? <RichTextEditor value={value} onChange={setValue} height={300} />
        : <textarea value={value} onChange={(e) => setValue(e.target.value)} rows={6} maxLength={limit} aria-label="Edit text" />}
      {error && <p className="forum-error" role="alert">{error}</p>}
      <div className="forum-composer-actions">
        <button type="button" className="forum-btn-ghost" onClick={onCancel}>Cancel</button>
        <button type="submit" className="btn btn-gold">Save</button>
      </div>
    </form>
  );
}

export default function ForumThread() {
  const { id } = useParams();
  const { hash } = useLocation();
  const navigate = useNavigate();
  const [config, setConfig] = useState(null);
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [report, setReport] = useState(null);
  const [replyTo, setReplyTo] = useState(null);
  const [editing, setEditing] = useState(null);
  const [version, setVersion] = useState(0);

  const reload = useCallback(() => setVersion((v) => v + 1), []);
  const { user } = useAuth();
  const myId = user?.id ? String(user.id) : null;
  // Replies posted by others since this page loaded (live).
  const [newReplies, setNewReplies] = useState(0);

  useEffect(() => openThreadStream(id, (event) => {
    if (event.authorId !== myId) setNewReplies((n) => n + 1);
  }), [id, myId]);

  useEffect(() => {
    let cancelled = false;
    loadForumConfig().then((c) => !cancelled && setConfig(c)).catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    apiRequest(`/forum/threads/${id}`)
      .then((result) => {
        if (cancelled) return;
        setError('');
        setData(result);
      })
      .catch((err) => !cancelled && setError(err.message));
    return () => {
      cancelled = true;
    };
  }, [id, version]);

  // Jump to #reply-<id> links (e.g. from notifications).
  useEffect(() => {
    if (!data || !hash) return;
    document.getElementById(hash.slice(1))?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [data, hash]);

  const flash = (message) => {
    setNotice(message);
    window.setTimeout(() => setNotice(''), 3500);
  };

  const act = async (fn, success) => {
    try {
      await fn();
      if (success) flash(success);
      reload();
    } catch (err) {
      flash(err.message);
    }
  };

  if (error) {
    return (
      <>
        <Navbar />
        <main className="forum-page">
          <div className="container forum-narrow forum-empty">
            <span aria-hidden="true">🔍</span>
            <h1>{error}</h1>
            <Link to="/forum" className="btn btn-gold">Back to the forum</Link>
          </div>
        </main>
        <Footer />
      </>
    );
  }

  if (!data) {
    return (
      <>
        <Navbar />
        <main className="forum-page"><div className="container forum-narrow"><div className="forum-card forum-skeleton" style={{ height: 300 }} /></div></main>
        <Footer />
      </>
    );
  }

  const { thread, replies, viewer } = data;
  const category = config?.categories.find((c) => c.id === thread.category);
  const type = config?.postTypes.find((t) => t.id === thread.postType);
  const topLevel = replies.filter((r) => !r.parentReply);
  const childrenOf = (replyId) => replies.filter((r) => r.parentReply === replyId);
  const canAccept = viewer.isAuthor && thread.postType === 'question';
  const canReact = viewer.signedIn;
  const limits = config?.limits;

  const moderate = (targetType, targetId, action, extra = {}) => act(
    () => apiRequest('/forum/admin/actions', {
      method: 'POST',
      body: JSON.stringify({ targetType, targetId, action, reason: extra.reason || '', ...extra }),
    }),
    'Done.',
  );

  const renderReply = (reply, nested = false) => {
    const accepted = thread.acceptedReply === reply.id;
    return (
      <article key={reply.id} id={`reply-${reply.id}`} className={`forum-reply ${nested ? 'is-nested' : ''} ${accepted ? 'is-accepted' : ''} ${reply.status !== 'visible' ? 'is-hidden' : ''}`}>
        <header>
          <AuthorBadge author={reply.author} />
          <span className="forum-muted">
            {timeAgo(reply.createdAt)}{reply.editedAt && ' · edited'}
          </span>
          {accepted && <span className="forum-pill answered"><i className="bi bi-check-circle-fill" aria-hidden="true" /> Accepted answer</span>}
          {reply.status !== 'visible' && <span className="forum-pill locked">Hidden by moderators</span>}
        </header>

        {editing === reply.id ? (
          <EditBox
            initial={reply.body}
            limit={limits?.replyBodyMax}
            onCancel={() => setEditing(null)}
            onSave={async (body) => {
              await apiRequest(`/forum/replies/${reply.id}`, { method: 'PATCH', body: JSON.stringify({ body }) });
              setEditing(null);
              reload();
            }}
          />
        ) : (
          <SafeText text={reply.body} />
        )}

        <footer className="forum-actions">
          <Reactions key={`r-${reply.id}-${version}`} targetType="reply" targetId={reply.id} counts={reply.reactions} mine={viewer.myReactions?.[reply.id]} disabled={!canReact} onError={flash} />
          {viewer.signedIn && !thread.locked && !viewer.muted && (
            <button type="button" onClick={() => setReplyTo(reply)}><i className="bi bi-reply" aria-hidden="true" /> Reply</button>
          )}
          {canAccept && !nested && (
            <button
              type="button"
              className={accepted ? 'is-on' : ''}
              onClick={() => act(
                () => apiRequest(`/forum/threads/${thread.id}/accept`, { method: 'POST', body: JSON.stringify({ replyId: accepted ? null : reply.id }) }),
                accepted ? 'Answer unmarked.' : 'Marked as the accepted answer.',
              )}
            >
              <i className="bi bi-check2-circle" aria-hidden="true" /> {accepted ? 'Unaccept' : 'Accept answer'}
            </button>
          )}
          {reply.canEdit && <button type="button" onClick={() => setEditing(reply.id)}><i className="bi bi-pencil" aria-hidden="true" /> Edit</button>}
          {reply.canDelete && !viewer.isStaff && (
            <button
              type="button"
              onClick={() => window.confirm('Delete this reply?') && act(() => apiRequest(`/forum/replies/${reply.id}`, { method: 'DELETE' }), 'Reply deleted.')}
            >
              <i className="bi bi-trash" aria-hidden="true" /> Delete
            </button>
          )}
          {viewer.signedIn && !reply.canEdit && !viewer.isStaff && (
            <button type="button" onClick={() => setReport({ type: 'reply', id: reply.id })}><i className="bi bi-flag" aria-hidden="true" /> Report</button>
          )}
          {viewer.isStaff && (
            reply.status === 'visible'
              ? <button type="button" className="forum-mod" onClick={() => moderate('reply', reply.id, 'hide')}><i className="bi bi-eye-slash" aria-hidden="true" /> Hide</button>
              : <button type="button" className="forum-mod" onClick={() => moderate('reply', reply.id, 'restore')}><i className="bi bi-eye" aria-hidden="true" /> Restore</button>
          )}
        </footer>

        {replyTo?.id === reply.id && (
          <ReplyComposer
            threadId={thread.id}
            parentReply={reply}
            autoFocus
            limit={limits?.replyBodyMax}
            onCancel={() => setReplyTo(null)}
            onPosted={() => {
              setReplyTo(null);
              flash('Reply posted.');
              reload();
            }}
          />
        )}

        {!nested && childrenOf(reply.id).map((child) => renderReply(child, true))}
      </article>
    );
  };

  return (
    <>
      <Navbar />
      <main className="forum-page">
        <div className="container forum-narrow">
          <Link to="/forum" className="forum-back"><i className="bi bi-arrow-left" aria-hidden="true" /> Back to the forum</Link>

          <article className="forum-thread">
            <div className="forum-card-top">
              {thread.pinned && <span className="forum-pill pinned"><i className="bi bi-pin-angle-fill" aria-hidden="true" /> Pinned</span>}
              {category && (
                <Link to={`/forum?category=${category.id}`} className="forum-pill"><i className={`bi ${category.icon}`} aria-hidden="true" /> {category.name}</Link>
              )}
              {type && <span className={`forum-pill type-${type.id}`}>{type.name}</span>}
              {thread.answered && <span className="forum-pill answered"><i className="bi bi-check-circle-fill" aria-hidden="true" /> Answered</span>}
              {thread.locked && <span className="forum-pill locked"><i className="bi bi-lock-fill" aria-hidden="true" /> Locked</span>}
              {thread.status !== 'visible' && <span className="forum-pill locked">{thread.status === 'hidden' ? 'Hidden by moderators' : thread.status}</span>}
            </div>

            <h1>{thread.title}</h1>
            <div className="forum-thread-meta">
              <AuthorBadge author={thread.author} size="md" />
              <span className="forum-muted">
                Posted {timeAgo(thread.createdAt)}{thread.editedAt && ' · edited'} · {thread.viewCount} views
              </span>
            </div>

            {editing === 'thread' ? (
              <EditBox
                initial={thread.body}
                rich={thread.format === 'html'}
                limit={limits?.threadBodyMax}
                onCancel={() => setEditing(null)}
                onSave={async (body) => {
                  await apiRequest(`/forum/threads/${thread.id}`, { method: 'PATCH', body: JSON.stringify({ body }) });
                  setEditing(null);
                  reload();
                }}
              />
            ) : (
              thread.format === 'html'
                ? <RichText html={thread.body} className="forum-thread-body" />
                : <SafeText text={thread.body} className="forum-thread-body" />
            )}

            {thread.attachments?.length > 0 && (
              <div className="forum-images is-view">
                {thread.attachments.map((img) => (
                  <a key={img.url} href={img.url} target="_blank" rel="noopener noreferrer">
                    <img src={img.url} alt="Attachment" loading="lazy" />
                  </a>
                ))}
              </div>
            )}

            {thread.tags.length > 0 && (
              <div className="forum-tags">
                {thread.tags.map((tag) => <Link key={tag} to={`/forum?tag=${encodeURIComponent(tag)}`} className="forum-tag">#{tag}</Link>)}
              </div>
            )}

            <footer className="forum-actions">
              <Reactions key={`t-${thread.id}-${version}`} targetType="thread" targetId={thread.id} counts={thread.reactions} mine={viewer.myReactions?.[thread.id]} disabled={!canReact} onError={flash} />
              {viewer.signedIn && (
                <>
                  <button type="button" className={viewer.bookmarked ? 'is-on' : ''} onClick={() => act(() => apiRequest(`/forum/threads/${thread.id}/bookmark`, { method: 'POST' }), viewer.bookmarked ? 'Removed from saved.' : 'Saved.')}>
                    <i className={`bi ${viewer.bookmarked ? 'bi-bookmark-fill' : 'bi-bookmark'}`} aria-hidden="true" /> {viewer.bookmarked ? 'Saved' : 'Save'}
                  </button>
                  <button type="button" className={viewer.following ? 'is-on' : ''} onClick={() => act(() => apiRequest(`/forum/threads/${thread.id}/follow`, { method: 'POST' }), viewer.following ? 'Unfollowed.' : 'Following: you\'ll be notified of replies.')}>
                    <i className={`bi ${viewer.following ? 'bi-bell-fill' : 'bi-bell'}`} aria-hidden="true" /> {viewer.following ? 'Following' : 'Follow'}
                  </button>
                </>
              )}
              <button type="button" onClick={() => navigator.clipboard?.writeText(window.location.href.split('#')[0]).then(() => flash('Link copied.'))}>
                <i className="bi bi-link-45deg" aria-hidden="true" /> Share
              </button>
              {thread.canEdit && <button type="button" onClick={() => setEditing('thread')}><i className="bi bi-pencil" aria-hidden="true" /> Edit</button>}
              {viewer.isAuthor && (
                <button
                  type="button"
                  onClick={() => window.confirm('Delete this discussion? This can\'t be undone.') && apiRequest(`/forum/threads/${thread.id}`, { method: 'DELETE' }).then(() => navigate('/forum')).catch((e) => flash(e.message))}
                >
                  <i className="bi bi-trash" aria-hidden="true" /> Delete
                </button>
              )}
              {viewer.signedIn && !viewer.isAuthor && !viewer.isStaff && (
                <button type="button" onClick={() => setReport({ type: 'thread', id: thread.id })}><i className="bi bi-flag" aria-hidden="true" /> Report</button>
              )}
            </footer>

            {viewer.isStaff && (
              <div className="forum-modbar" aria-label="Moderator tools">
                <strong><i className="bi bi-shield-lock" aria-hidden="true" /> Moderate</strong>
                <button type="button" onClick={() => moderate('thread', thread.id, thread.pinned ? 'unpin' : 'pin')}>{thread.pinned ? 'Unpin' : 'Pin'}</button>
                <button type="button" onClick={() => moderate('thread', thread.id, thread.locked ? 'unlock' : 'lock')}>{thread.locked ? 'Unlock' : 'Lock'}</button>
                {thread.status === 'visible'
                  ? <button type="button" onClick={() => moderate('thread', thread.id, 'hide', { reason: window.prompt('Reason (shown to the author):') || '' })}>Hide</button>
                  : <button type="button" onClick={() => moderate('thread', thread.id, 'restore')}>Restore</button>}
                <select
                  value=""
                  aria-label="Move to category"
                  onChange={(e) => e.target.value && moderate('thread', thread.id, 'move', { category: e.target.value })}
                >
                  <option value="">Move to…</option>
                  {config?.categories.filter((c) => c.id !== thread.category).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
                <Link to="/admin/forum">Report queue →</Link>
              </div>
            )}
          </article>

          {newReplies > 0 && (
            <button
              type="button"
              className="forum-live-banner"
              onClick={() => {
                setNewReplies(0);
                reload();
              }}
            >
              <span className="forum-live-dot" aria-hidden="true" />
              {newReplies} new {newReplies === 1 ? 'reply' : 'replies'}. Show
            </button>
          )}

          <section className="forum-replies" aria-labelledby="replies-title">
            <h2 id="replies-title">{thread.replyCount} {thread.replyCount === 1 ? 'reply' : 'replies'}</h2>
            {topLevel.length === 0 && <p className="forum-muted">No replies yet. Be the first to help!</p>}
            {topLevel.map((reply) => renderReply(reply))}
          </section>

          <section className="forum-reply-box">
            {!viewer.signedIn ? (
              <p className="forum-muted"><Link to="/login">Sign in</Link> to join the discussion.</p>
            ) : viewer.muted ? (
              <p className="forum-error">{viewer.muted}</p>
            ) : thread.locked && !viewer.isStaff ? (
              <p className="forum-muted"><i className="bi bi-lock-fill" aria-hidden="true" /> This discussion is locked. No new replies.</p>
            ) : (
              <>
                <h2>Your reply</h2>
                <ReplyComposer
                  threadId={thread.id}
                  limit={limits?.replyBodyMax}
                  onPosted={(replyId) => {
                    flash('Reply posted.');
                    reload();
                    window.setTimeout(() => document.getElementById(`reply-${replyId}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 400);
                  }}
                />
              </>
            )}
          </section>
        </div>
      </main>

      {report && config && (
        <ReportDialog
          target={report}
          reasons={config.reportReasons}
          onClose={() => setReport(null)}
          onDone={(message) => {
            setReport(null);
            flash(message);
          }}
        />
      )}

      {notice && <div className="forum-toast" role="status">{notice}</div>}
      <Footer />
    </>
  );
}

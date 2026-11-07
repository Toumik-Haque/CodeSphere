import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { apiRequest } from '../lib/api';
import { timeAgo } from '../lib/time';

const KINDS = {
  built: { label: 'Built', icon: 'bi-hammer' },
  learned: { label: 'Learned', icon: 'bi-lightbulb' },
  blocker: { label: 'Blocker', icon: 'bi-cone-striped' },
  next: { label: 'Next', icon: 'bi-arrow-right-circle' },
};
const REACTIONS = [['like', '👍'], ['celebrate', '🎉'], ['helpful', '💡']];

function Comments({ project, update, signedIn, onCount }) {
  const { user } = useAuth();
  const [items, setItems] = useState(null);
  const [body, setBody] = useState('');
  const [msg, setMsg] = useState('');
  const [version, setVersion] = useState(0);
  const myId = String(user?._id || user?.id || '');

  useEffect(() => {
    let cancelled = false;
    apiRequest(`/projects/${project.id}/updates/${update.id}/comments`).then((r) => !cancelled && setItems(r.comments)).catch(() => !cancelled && setItems([]));
    return () => {
      cancelled = true;
    };
  }, [project.id, update.id, version]);

  const post = async (e) => {
    e.preventDefault();
    setMsg('');
    try {
      await apiRequest(`/projects/${project.id}/updates/${update.id}/comments`, { method: 'POST', body: JSON.stringify({ body }) });
      setBody('');
      onCount(1);
      setVersion((v) => v + 1);
    } catch (err) {
      setMsg(err.message);
    }
  };

  const act = async (c, action) => {
    if (action === 'delete' && !window.confirm('Delete this comment?')) return;
    try {
      const r = await apiRequest(`/projects/${project.id}/updates/${update.id}/comments/${c.id}${action === 'report' ? '/report' : ''}`, { method: action === 'report' ? 'POST' : 'DELETE' });
      if (action === 'delete') onCount(-1);
      setMsg(r.message);
      setVersion((v) => v + 1);
    } catch (err) {
      setMsg(err.message);
    }
  };

  return (
    <div className="pu-comments">
      {!items ? <p className="ph-muted">Loading…</p> : items.length === 0 ? <p className="ph-muted">No comments yet.</p> : (
        <ul>
          {items.map((c) => (
            <li key={c.id}>
              <strong>{c.author?.name}</strong> <span className="ph-muted">· {timeAgo(c.createdAt)}</span>
              <p>{c.body}</p>
              {signedIn && (
                <span className="pu-comment-actions">
                  {(c.author?.id === myId || project.canEdit || project.canReview)
                    ? <button type="button" className="ph-linkbtn" onClick={() => act(c, 'delete')}>Delete</button>
                    : <button type="button" className="ph-linkbtn muted" onClick={() => act(c, 'report')}>Report</button>}
                </span>
              )}
            </li>
          ))}
        </ul>
      )}
      {signedIn ? (
        <form onSubmit={post} className="pu-comment-form">
          <input value={body} onChange={(e) => setBody(e.target.value)} placeholder="Write a helpful comment…" maxLength={1000} aria-label="Comment" />
          <button type="submit" className="ph-btn">Reply</button>
        </form>
      ) : <p className="ph-muted">Sign in to comment.</p>}
      {msg && <p className="ph-muted">{msg}</p>}
    </div>
  );
}

function UpdateItem({ project, u, signedIn, onDelete }) {
  const [reactions, setReactions] = useState(u.reactions);
  const [open, setOpen] = useState(false);
  const [count, setCount] = useState(u.commentCount);

  const react = async (type) => {
    if (!signedIn) return;
    const r = await apiRequest(`/projects/${project.id}/updates/${u.id}/react`, { method: 'POST', body: JSON.stringify({ type }) });
    setReactions((prev) => ({ ...prev, [type]: { count: r.count, mine: r.mine } }));
  };

  return (
    <li>
      <span className={`pd-kind kind-${u.kind}`}><i className={`bi ${KINDS[u.kind]?.icon}`} aria-hidden="true" /> {KINDS[u.kind]?.label}</span>
      <p>{u.body}</p>
      <small>
        {u.author?.name} · {timeAgo(u.createdAt)}
        {u.link && <> · <a href={u.link} target="_blank" rel="noopener noreferrer nofollow">link</a></>}
        {(u.mine || project.canReview) && <> · <button type="button" className="ph-linkbtn" onClick={() => onDelete(u.id)}>Delete</button></>}
      </small>
      <div className="pu-bar">
        {REACTIONS.map(([type, emoji]) => (
          <button key={type} type="button" className={reactions[type].mine ? 'on' : ''} onClick={() => react(type)} disabled={!signedIn} aria-pressed={reactions[type].mine} aria-label={type}>
            {emoji} {reactions[type].count || ''}
          </button>
        ))}
        <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open}>
          <i className="bi bi-chat" aria-hidden="true" /> {count || ''} {open ? 'Hide' : 'Comments'}
        </button>
      </div>
      {open && <Comments project={project} update={u} signedIn={signedIn} onCount={(d) => setCount((c) => Math.max(0, c + d))} />}
    </li>
  );
}

// Build in Public: updates with reactions and comments.
export default function ProjectUpdates({ project }) {
  const { user } = useAuth();
  const signedIn = Boolean(user);
  const [items, setItems] = useState(null);
  const [form, setForm] = useState({ kind: 'built', body: '', link: '' });
  const [error, setError] = useState('');
  const [version, setVersion] = useState(0);

  useEffect(() => {
    let cancelled = false;
    apiRequest(`/projects/${project.id}/updates`).then((r) => !cancelled && setItems(r.updates)).catch(() => !cancelled && setItems([]));
    return () => {
      cancelled = true;
    };
  }, [project.id, version]);

  const post = async (e) => {
    e.preventDefault();
    setError('');
    try {
      await apiRequest(`/projects/${project.id}/updates`, { method: 'POST', body: JSON.stringify(form) });
      setForm({ kind: 'built', body: '', link: '' });
      setVersion((v) => v + 1);
    } catch (err) {
      setError(err.message);
    }
  };

  const remove = async (id) => {
    if (!window.confirm('Delete this update?')) return;
    await apiRequest(`/projects/${project.id}/updates/${id}`, { method: 'DELETE' });
    setVersion((v) => v + 1);
  };

  if (!items) return null;
  if (!items.length && !project.isMember) return null;

  return (
    <section className="pd-block">
      <h2><i className="bi bi-broadcast" aria-hidden="true" /> Build in Public</h2>
      {project.isMember && (
        <form className="pd-update-form" onSubmit={post}>
          <div className="pd-kinds" role="radiogroup" aria-label="Update type">
            {Object.entries(KINDS).map(([id, k]) => (
              <button key={id} type="button" role="radio" aria-checked={form.kind === id} className={form.kind === id ? 'active' : ''} onClick={() => setForm((f) => ({ ...f, kind: id }))}>
                <i className={`bi ${k.icon}`} aria-hidden="true" /> {k.label}
              </button>
            ))}
          </div>
          <textarea rows={3} value={form.body} onChange={(e) => setForm((f) => ({ ...f, body: e.target.value }))} maxLength={2000} placeholder="What did you build or learn? What's blocking you? What's next?" aria-label="Update" />
          <div className="pd-update-row">
            <input type="url" value={form.link} onChange={(e) => setForm((f) => ({ ...f, link: e.target.value }))} placeholder="Optional link (commit, PR, demo…)" aria-label="Link" />
            <button type="submit" className="btn btn-gold">Post update</button>
          </div>
          {error && <p className="ph-error">{error}</p>}
        </form>
      )}
      {items.length === 0 ? <p className="ph-muted">No updates yet. Share your progress as you build.</p> : (
        <ol className="pd-updates">
          {items.map((u) => <UpdateItem key={u.id} project={project} u={u} signedIn={signedIn} onDelete={remove} />)}
        </ol>
      )}
    </section>
  );
}

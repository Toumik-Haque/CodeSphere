import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { apiRequest } from '../lib/api';

const COLUMNS = [
  ['todo', 'To do', 'bi-circle'],
  ['doing', 'Doing', 'bi-arrow-repeat'],
  ['done', 'Done', 'bi-check-circle-fill'],
];

function Avatar({ p, size = 28 }) {
  return p.avatarUrl
    ? <img className="pt-avatar" src={p.avatarUrl} alt="" style={{ width: size, height: size }} />
    : <span className="pt-avatar" style={{ width: size, height: size }} aria-hidden="true">{p.initials}</span>;
}

// Invite search (owner only).
function InviteBox({ projectId, onDone }) {
  const [q, setQ] = useState('');
  const [results, setResults] = useState([]);
  const [role, setRole] = useState('');
  const [msg, setMsg] = useState('');

  useEffect(() => {
    if (q.trim().length < 2) return undefined;
    const t = setTimeout(() => {
      apiRequest(`/projects/users/search?q=${encodeURIComponent(q.trim())}`).then((r) => setResults(r.users)).catch(() => {});
    }, 250);
    return () => clearTimeout(t);
  }, [q]);

  const invite = async (user) => {
    setMsg('');
    try {
      await apiRequest(`/projects/${projectId}/team/invite`, { method: 'POST', body: JSON.stringify({ userId: user.id, role }) });
      setMsg(`Invited ${user.name}.`);
      setQ('');
      setResults([]);
      onDone();
    } catch (e) {
      setMsg(e.message);
    }
  };

  return (
    <div className="pt-invite">
      <div className="pt-invite-row">
        <input value={q} onChange={(e) => { setQ(e.target.value); if (e.target.value.trim().length < 2) setResults([]); }} placeholder="Search a CodeSphere member by name" aria-label="Search members" maxLength={40} />
        <input value={role} onChange={(e) => setRole(e.target.value)} placeholder="Role (e.g. Frontend)" aria-label="Role" maxLength={60} />
      </div>
      {results.length > 0 && (
        <ul className="pt-results">
          {results.map((u) => (
            <li key={u.id}>
              <button type="button" onClick={() => invite(u)}>
                <Avatar p={u} size={24} /> <span>{u.name}</span> <small>{u.year}</small> <em>Invite</em>
              </button>
            </li>
          ))}
        </ul>
      )}
      {msg && <p className="ph-muted">{msg}</p>}
    </div>
  );
}

export default function ProjectTeam({ project, onChange }) {
  const { user } = useAuth();
  const [tasks, setTasks] = useState(project.tasks || []);
  const [title, setTitle] = useState('');
  const [assignee, setAssignee] = useState('');
  const [error, setError] = useState('');
  const myId = String(user?._id || user?.id || '');
  const people = [project.owner, ...(project.team || [])].filter(Boolean);

  const respond = async (accept) => {
    try {
      await apiRequest(`/projects/${project.id}/team/respond`, { method: 'POST', body: JSON.stringify({ accept }) });
      onChange();
    } catch (e) {
      setError(e.message);
    }
  };

  const remove = async (member) => {
    const leaving = member.id === myId;
    if (!window.confirm(leaving ? 'Leave this team?' : `Remove ${member.name} from the team?`)) return;
    try {
      await apiRequest(`/projects/${project.id}/team/${member.id}`, { method: 'DELETE' });
      onChange();
    } catch (e) {
      setError(e.message);
    }
  };

  const taskCall = async (method, path, body) => {
    setError('');
    try {
      const r = await apiRequest(`/projects/${project.id}/tasks${path}`, { method, body: body ? JSON.stringify(body) : undefined });
      setTasks(r.tasks);
    } catch (e) {
      setError(e.message);
    }
  };

  return (
    <>
      {project.myInvite && (
        <section className="pt-invite-banner" role="status">
          <i className="bi bi-envelope-open" aria-hidden="true" />
          <div>
            <strong>{project.owner?.name} invited you to join this project as {project.myInvite.role}.</strong>
            <span>Joining credits you as a contributor and opens the team task board.</span>
          </div>
          <button type="button" className="btn btn-gold" onClick={() => respond(true)}>Accept</button>
          <button type="button" className="ph-btn" onClick={() => respond(false)}>Decline</button>
        </section>
      )}

      {(project.team?.length > 0 || project.isMember) && (
        <section className="pd-block">
          <h2><i className="bi bi-people" aria-hidden="true" /> Team</h2>
          <ul className="pt-members">
            {project.owner && <li><Avatar p={project.owner} /> <span><strong>{project.owner.name}</strong><small>Owner</small></span></li>}
            {(project.team || []).map((m) => (
              <li key={m.id}>
                <Avatar p={m} /> <span><strong>{m.name}</strong><small>{m.role}</small></span>
                {(project.canEdit || m.id === myId) && <button type="button" className="ph-linkbtn" onClick={() => remove(m)}>{m.id === myId ? 'Leave' : 'Remove'}</button>}
              </li>
            ))}
            {(project.invites || []).map((m) => (
              <li key={m.id} className="pending">
                <Avatar p={m} /> <span><strong>{m.name}</strong><small>Invited · {m.role}</small></span>
                {project.canEdit && <button type="button" className="ph-linkbtn" onClick={() => remove(m)}>Cancel</button>}
              </li>
            ))}
          </ul>
          {project.canEdit && <InviteBox projectId={project.id} onDone={onChange} />}
        </section>
      )}

      {project.isMember && (
        <section className="pd-block">
          <h2><i className="bi bi-kanban" aria-hidden="true" /> Task board <small className="ph-muted">(team only)</small></h2>
          <form className="pt-task-form" onSubmit={(e) => { e.preventDefault(); if (title.trim()) { taskCall('POST', '', { title, assignee }); setTitle(''); } }}>
            <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Add a task…" maxLength={140} aria-label="New task" />
            <select value={assignee} onChange={(e) => setAssignee(e.target.value)} aria-label="Assignee">
              <option value="">Unassigned</option>
              {people.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
            <button type="submit" className="ph-btn">Add</button>
          </form>
          {error && <p className="ph-error">{error}</p>}
          <div className="pt-board">
            {COLUMNS.map(([status, label, icon]) => (
              <div key={status} className={`pt-col col-${status}`}>
                <h3><i className={`bi ${icon}`} aria-hidden="true" /> {label} <small>{tasks.filter((t) => t.status === status).length}</small></h3>
                {tasks.filter((t) => t.status === status).map((t) => (
                  <div key={t.id} className="pt-task">
                    <p>{t.title}</p>
                    <div className="pt-task-foot">
                      {t.assignee ? <span className="pt-assignee"><Avatar p={t.assignee} size={20} /> {t.assignee.name.split(' ')[0]}</span> : <span className="ph-muted">Unassigned</span>}
                      <span className="pt-task-actions">
                        {status !== 'todo' && <button type="button" aria-label="Move left" onClick={() => taskCall('PUT', `/${t.id}`, { status: status === 'done' ? 'doing' : 'todo' })}><i className="bi bi-arrow-left" /></button>}
                        {status !== 'done' && <button type="button" aria-label="Move right" onClick={() => taskCall('PUT', `/${t.id}`, { status: status === 'todo' ? 'doing' : 'done' })}><i className="bi bi-arrow-right" /></button>}
                        <button type="button" aria-label="Delete task" onClick={() => taskCall('DELETE', `/${t.id}`)}><i className="bi bi-trash" /></button>
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </section>
      )}
    </>
  );
}

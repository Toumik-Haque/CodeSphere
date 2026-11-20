import { useCallback, useEffect, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import SafeText from '../components/SafeText';
import { useAuth } from '../context/AuthContext';
import { apiRequest } from '../lib/api';
import { daysLeft, formatDateTime, formatDay, STATUS_LABEL, TYPE_LABEL } from '../lib/recruitments';
import '../css/Recruitments.css';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

// Applicants list for the poster and admins.
function Applicants({ r }) {
  const [rows, setRows] = useState(null);
  const [msg, setMsg] = useState('');
  const [filter, setFilter] = useState('all');

  const load = useCallback(() => apiRequest(`/recruitments/${r.id}/applications`)
    .then((data) => setRows(data.applications))
    .catch((e) => setMsg(e.message)), [r.id]);

  useEffect(() => {
    load();
  }, [load]);

  const setStatus = async (a, status) => {
    try {
      await apiRequest(`/recruitments/applications/${a.id}`, { method: 'PATCH', body: JSON.stringify({ status }) });
      setRows((list) => list.map((x) => (x.id === a.id ? { ...x, status } : x)));
      setMsg(`${a.user.name}: ${STATUS_LABEL[status]}. They have been notified.`);
    } catch (e) {
      setMsg(e.message);
    }
  };

  const download = async () => {
    try {
      const response = await fetch(`${API_URL}/recruitments/${r.id}/applications.csv`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('codesphere_token')}` },
      });
      if (!response.ok) throw new Error('Could not download the list.');
      const url = URL.createObjectURL(await response.blob());
      const link = document.createElement('a');
      link.href = url;
      link.download = `${r.slug}-applicants.csv`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      setMsg(e.message);
    }
  };

  if (!rows) return <p className="rec-muted">{msg || 'Loading applicants…'}</p>;
  const counts = rows.reduce((acc, a) => ({ ...acc, [a.status]: (acc[a.status] || 0) + 1 }), {});
  const shown = filter === 'all' ? rows : rows.filter((a) => a.status === filter);

  return (
    <div className="rec-applicants">
      <div className="rec-applicants-head">
        <div className="rec-seg small" role="tablist" aria-label="Filter applicants">
          {['all', 'applied', 'shortlisted', 'selected', 'rejected'].map((s) => (
            <button key={s} type="button" role="tab" aria-selected={filter === s} className={filter === s ? 'on' : ''} onClick={() => setFilter(s)}>
              {s === 'all' ? 'All' : STATUS_LABEL[s]} <b>{s === 'all' ? rows.length : counts[s] || 0}</b>
            </button>
          ))}
        </div>
        <button type="button" className="rec-btn" onClick={download} disabled={!rows.length}><i className="bi bi-download" aria-hidden="true" /> CSV</button>
      </div>
      {msg && <p className="rec-ok" role="status">{msg}</p>}
      {r.hasForm && <p className="rec-muted small">People who registered through the Google Form appear in your form&apos;s responses, not here.</p>}
      {shown.length === 0 && <p className="rec-muted">{rows.length ? 'Nobody in this group.' : 'No one-click applications yet.'}</p>}
      {shown.map((a) => (
        <article key={a.id} className={`rec-applicant status-${a.status}`}>
          <div className="rec-applicant-who">
            <span className="rec-avatar">{a.user.avatar ? <img src={a.user.avatar} alt="" /> : a.user.name.charAt(0)}</span>
            <div>
              <strong>{a.user.username ? <Link to={`/user/${a.user.username}`}>{a.user.name}</Link> : a.user.name}</strong>
              <small>{[a.role, a.user.year, a.user.department, a.user.college].filter(Boolean).join(' · ')}</small>
              <small>
                <a href={`mailto:${a.user.email}`}>{a.user.email}</a>
                {a.user.phone && <> · {a.user.phone}</>}
                {a.user.github && <> · <a href={a.user.github} target="_blank" rel="noopener noreferrer">GitHub</a></>}
                {a.user.linkedin && <> · <a href={a.user.linkedin} target="_blank" rel="noopener noreferrer">LinkedIn</a></>}
                {a.user.resume && <> · <a href={a.user.resume} target="_blank" rel="noopener noreferrer">Resume</a></>}
              </small>
              {a.note && <p className="rec-applicant-note">“{a.note}”</p>}
            </div>
          </div>
          <select value={a.status} onChange={(e) => setStatus(a, e.target.value)} aria-label={`Status for ${a.user.name}`}>
            {Object.entries(STATUS_LABEL).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
        </article>
      ))}
    </div>
  );
}

export default function RecruitmentDetail() {
  const { slug } = useParams();
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [role, setRole] = useState('');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  // A message handed over from the editor (e.g. "Submitted for review").
  const [msg, setMsg] = useState(() => ({ text: location.state?.message || '', tone: location.state?.message ? 'ok' : '' }));
  const [version, setVersion] = useState(0);

  useEffect(() => {
    let cancelled = false;
    apiRequest(`/recruitments/${slug}`)
      .then((r) => !cancelled && setData(r))
      .catch((e) => !cancelled && setError(e.message));
    return () => {
      cancelled = true;
    };
  }, [slug, version]);

  if (error) {
    return (
      <>
        <Navbar />
        <main className="rec-page"><div className="container rec-body"><div className="rec-empty"><h2>{error}</h2><Link to="/recruitments" className="rec-btn">All recruitments</Link></div></div></main>
        <Footer />
      </>
    );
  }
  if (!data) return <><Navbar /><main className="rec-page"><p className="container rec-muted rec-body">Loading…</p></main></>;

  const r = data.recruitment;
  const mine = data.myApplication;
  const left = daysLeft(r.applyBy);

  const apply = async (e) => {
    e.preventDefault();
    setBusy(true);
    setMsg({ text: '', tone: '' });
    try {
      const res = await apiRequest(`/recruitments/${slug}/apply`, { method: 'POST', body: JSON.stringify({ role, note }) });
      setMsg({ text: res.message, tone: 'ok' });
      setVersion((v) => v + 1);
    } catch (err) {
      setMsg({ text: err.message, tone: 'error' });
    } finally {
      setBusy(false);
    }
  };

  const withdraw = async () => {
    if (!window.confirm('Withdraw your application?')) return;
    try {
      await apiRequest(`/recruitments/${slug}/apply`, { method: 'DELETE' });
      setMsg({ text: 'Application withdrawn.', tone: 'ok' });
      setVersion((v) => v + 1);
    } catch (err) {
      setMsg({ text: err.message, tone: 'error' });
    }
  };

  const setClosed = async (closed) => {
    try {
      await apiRequest(`/recruitments/${r.id}/close`, { method: 'POST', body: JSON.stringify({ closed }) });
      setVersion((v) => v + 1);
    } catch (err) {
      setMsg({ text: err.message, tone: 'error' });
    }
  };

  const remove = async () => {
    if (!window.confirm(`Delete "${r.title}" and all its applications? This cannot be undone.`)) return;
    try {
      await apiRequest(`/recruitments/${r.id}`, { method: 'DELETE' });
      navigate('/recruitments', { replace: true });
    } catch (err) {
      setMsg({ text: err.message, tone: 'error' });
    }
  };

  const facts = [
    { icon: 'bi-hourglass-split', label: 'Apply by', value: formatDateTime(r.applyBy) },
    { icon: r.mode === 'Online' ? 'bi-camera-video' : 'bi-geo-alt', label: r.mode, value: r.mode === 'Online' ? (r.platform || 'Online') : [r.venue, r.mode === 'Hybrid' && r.platform].filter(Boolean).join(' + ') },
    r.rolesDetail.length > 0 && { icon: 'bi-briefcase', label: 'Roles', value: `${r.rolesDetail.length} open role${r.rolesDetail.length === 1 ? '' : 's'}` },
    r.applicants > 0 && { icon: 'bi-people', label: 'Applied', value: `${r.applicants} so far` },
  ].filter(Boolean);

  return (
    <>
      <Navbar />
      <main className="rec-page">
        <header className="rec-detail-hero">
          {r.banner && <img src={r.banner} alt="" className="rec-detail-banner" />}
          <div className="container rec-detail-head">
            <Link to="/recruitments" className="rec-back"><i className="bi bi-arrow-left" aria-hidden="true" /> All recruitments</Link>
            <div className="rec-tags">
              <span className={`rec-type type-${r.type}`}>{TYPE_LABEL[r.type]}</span>
              {r.open ? <span className="rec-pill open">Open · {left === 0 ? 'closes today' : `${left} day${left === 1 ? '' : 's'} left`}</span> : <span className="rec-pill">Applications closed</span>}
              {r.status === 'draft' && <span className="rec-pill warn">{r.reviewStatus === 'pending' ? 'Waiting for admin approval' : r.reviewStatus === 'rejected' ? 'Changes requested' : 'Draft'}</span>}
            </div>
            <small className="rec-org">{r.organization}{r.origin === 'club' && <i className="bi bi-patch-check-fill" title="Posted by CodeSphere" />}</small>
            <h1>{r.title}</h1>
            {r.summary && <p className="rec-lead">{r.summary}</p>}
          </div>
        </header>

        <div className="container rec-detail-layout">
          <div className="rec-detail-main">
            {r.canManage && r.reviewStatus === 'rejected' && r.reviewNote && (
              <div className="rec-callout warn"><strong>Changes requested by the admin:</strong> {r.reviewNote}</div>
            )}

            <div className="rec-facts">
              {facts.map((f) => (
                <div key={f.label}>
                  <i className={`bi ${f.icon}`} aria-hidden="true" />
                  <span><small>{f.label}</small><strong>{f.value}</strong></span>
                </div>
              ))}
            </div>

            <section className="rec-section">
              <h2>About</h2>
              <SafeText text={r.description} />
            </section>

            {r.rolesDetail.length > 0 && (
              <section className="rec-section">
                <h2>Open roles</h2>
                <div className="rec-roles">
                  {r.rolesDetail.map((role) => (
                    <article key={role.title}>
                      <h3>{role.title}{role.openings ? <small>{role.openings} opening{role.openings === 1 ? '' : 's'}</small> : null}</h3>
                      {role.description && <p>{role.description}</p>}
                    </article>
                  ))}
                </div>
              </section>
            )}

            {r.eligibility && (
              <section className="rec-section">
                <h2>Who can apply</h2>
                <SafeText text={r.eligibility} />
              </section>
            )}

            {r.process.length > 0 && (
              <section className="rec-section">
                <h2>How it works</h2>
                <ol className="rec-timeline">
                  {r.process.map((step, i) => (
                    <li key={`${step.title}-${i}`} className={step.date && new Date(step.date) < new Date() ? 'done' : ''}>
                      <span className="rec-step-num">{i + 1}</span>
                      <div>
                        <strong>{step.title}</strong>
                        {step.date && <small>{formatDateTime(step.date)}</small>}
                        {step.detail && <p>{step.detail}</p>}
                      </div>
                    </li>
                  ))}
                </ol>
              </section>
            )}

            {(r.contactName || r.contactEmail) && (
              <section className="rec-section">
                <h2>Questions?</h2>
                <p>Contact {r.contactName || 'the organisers'}{r.contactEmail && <> at <a href={`mailto:${r.contactEmail}`}>{r.contactEmail}</a></>}.</p>
              </section>
            )}

            {r.canManage && (
              <section className="rec-section rec-manage">
                <div className="rec-manage-head">
                  <h2><i className="bi bi-people" aria-hidden="true" /> Applicants</h2>
                  <div className="rec-actions">
                    <Link to={`/recruitments/${r.id}/edit`} className="rec-btn"><i className="bi bi-pencil" aria-hidden="true" /> Edit</Link>
                    {r.status === 'published' && <button type="button" className="rec-btn" onClick={() => setClosed(true)}>Close applications</button>}
                    {r.status === 'closed' && new Date(r.applyBy) > new Date() && <button type="button" className="rec-btn" onClick={() => setClosed(false)}>Reopen</button>}
                    <button type="button" className="rec-btn danger" onClick={remove}><i className="bi bi-trash3" aria-hidden="true" /> Delete</button>
                  </div>
                </div>
                <Applicants r={r} />
              </section>
            )}
          </div>

          <aside className="rec-apply">
            <h2>{mine ? 'Your application' : 'Register'}</h2>
            {mine ? (
              <>
                <div className={`rec-status-badge status-${mine.status}`}>
                  <i className="bi bi-check2-circle" aria-hidden="true" /> {STATUS_LABEL[mine.status]}
                </div>
                <p className="rec-muted small">{mine.role && <>For <b>{mine.role}</b> · </>}applied {formatDay(mine.appliedAt)}</p>
                {['applied', 'shortlisted'].includes(mine.status) && (
                  <button type="button" className="rec-link danger" onClick={withdraw}>Withdraw application</button>
                )}
              </>
            ) : !r.open ? (
              <p className="rec-muted">Applications are closed.</p>
            ) : (
              <>
                {r.oneClick && (
                  user ? (
                    user.role === 'admin' ? <p className="rec-muted small">Admins manage applications instead of applying.</p> : (
                      <form onSubmit={apply} className="rec-apply-form">
                        {r.rolesDetail.length > 0 && (
                          <label>Role
                            <select value={role} onChange={(e) => setRole(e.target.value)} required>
                              <option value="">Choose a role</option>
                              {r.rolesDetail.map((x) => <option key={x.title}>{x.title}</option>)}
                            </select>
                          </label>
                        )}
                        <label>Why you? <small>(optional)</small>
                          <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={3} maxLength={600} placeholder="A line about yourself or what you'd bring" />
                        </label>
                        <button type="submit" className="rec-btn rec-btn-primary wide" disabled={busy}>
                          <i className="bi bi-lightning-charge-fill" aria-hidden="true" /> {busy ? 'Applying…' : 'Apply in one click'}
                        </button>
                        <p className="rec-muted small">Your CodeSphere profile (name, college, year, links, resume) is shared with the organisers.</p>
                      </form>
                    )
                  ) : (
                    <Link to="/login" state={{ from: location.pathname }} className="rec-btn rec-btn-primary wide">Sign in to apply in one click</Link>
                  )
                )}
                {r.oneClick && r.hasForm && <div className="rec-or"><span>or</span></div>}
                {r.hasForm && (
                  <a href={r.formUrl} target="_blank" rel="noopener noreferrer" className="rec-btn wide">
                    <i className="bi bi-ui-checks" aria-hidden="true" /> Register on Google Form
                  </a>
                )}
              </>
            )}
            {msg.text && <p className={msg.tone === 'ok' ? 'rec-ok' : 'rec-error'} role={msg.tone === 'ok' ? 'status' : 'alert'}>{msg.text}</p>}
          </aside>
        </div>
      </main>
      <Footer />
    </>
  );
}

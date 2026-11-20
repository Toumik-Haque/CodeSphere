import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import BroadcastOptions from '../components/BroadcastOptions';
import PushEmailButton from '../components/PushEmailButton';
import { apiRequest } from '../lib/api';
import { formatDay, TYPE_LABEL } from '../lib/recruitments';
import '../css/Recruitments.css';

// Admin: approve members' recruitment posts and see every post.
export default function AdminRecruitments() {
  const [items, setItems] = useState(null);
  const [tab, setTab] = useState('pending');
  const [notes, setNotes] = useState({});
  const [msg, setMsg] = useState('');
  const [broadcast, setBroadcast] = useState({ sendNotification: true, sendEmail: true });

  const load = useCallback(() => apiRequest('/recruitments/admin/all')
    .then((r) => setItems(r.recruitments))
    .catch((e) => setMsg(e.message)), []);

  useEffect(() => {
    load();
  }, [load]);

  const review = async (r, decision) => {
    const note = (notes[r.id] || '').trim();
    if (decision === 'reject' && !note) {
      setMsg('Write a note telling the poster what to change.');
      return;
    }
    try {
      await apiRequest(`/recruitments/${r.id}/review`, { method: 'POST', body: JSON.stringify({ decision, note, ...broadcast }) });
      setMsg(decision === 'approve' ? `"${r.title}" is live.` : `Sent "${r.title}" back with your note.`);
      load();
    } catch (e) {
      setMsg(e.message);
    }
  };

  const pending = items?.filter((r) => r.reviewStatus === 'pending') || [];
  const shown = tab === 'pending' ? pending : items || [];

  return (
    <>
      <Navbar />
      <main className="rec-page rec-admin">
        <div className="container rec-body">
          <div className="rec-admin-head">
            <div>
              <h1><i className="bi bi-person-badge" aria-hidden="true" /> Recruitment &amp; Interviews</h1>
              <p className="rec-muted">Approve posts from members, or post your own. Your posts go live straight away.</p>
            </div>
            <div className="rec-actions">
              <Link to="/recruitments" className="rec-btn">View page</Link>
              <Link to="/recruitments/new" className="rec-btn rec-btn-primary"><i className="bi bi-plus-lg" aria-hidden="true" /> New post</Link>
            </div>
          </div>

          <div className="rec-seg" role="tablist" aria-label="Filter">
            <button type="button" role="tab" aria-selected={tab === 'pending'} className={tab === 'pending' ? 'on' : ''} onClick={() => setTab('pending')}>
              Waiting for review <b>{pending.length}</b>
            </button>
            <button type="button" role="tab" aria-selected={tab === 'all'} className={tab === 'all' ? 'on' : ''} onClick={() => setTab('all')}>
              All posts <b>{items?.length || 0}</b>
            </button>
          </div>

          {tab === 'pending' && pending.length > 0 && <BroadcastOptions value={broadcast} onChange={setBroadcast} />}
          {msg && <p className="rec-ok" role="status">{msg}</p>}
          {!items && <p className="rec-muted">Loading…</p>}
          {items && shown.length === 0 && <p className="rec-muted">{tab === 'pending' ? 'Nothing waiting for review.' : 'No posts yet.'}</p>}

          {shown.map((r) => (
            <article key={r.id} className="rec-admin-row">
              <div className="rec-admin-main">
                <div className="rec-tags">
                  <span className={`rec-type type-${r.type}`}>{TYPE_LABEL[r.type]}</span>
                  <span className={`rec-pill ${r.status === 'published' ? 'open' : r.reviewStatus === 'pending' ? 'warn' : ''}`}>
                    {r.reviewStatus === 'pending' ? 'Waiting for review' : r.reviewStatus === 'rejected' ? 'Changes requested' : r.status === 'published' ? (r.open ? 'Live' : 'Deadline passed') : r.status === 'closed' ? 'Closed' : 'Draft'}
                  </span>
                </div>
                <h2><Link to={`/recruitments/${r.slug}`}>{r.title}</Link></h2>
                <p className="rec-muted small">
                  {r.organization} · posted by {r.postedBy?.name}{r.postedBy?.email ? ` (${r.postedBy.email})` : ''} · apply by {formatDay(r.applyBy)} · {r.applicants} applied
                </p>
                {r.summary && <p>{r.summary}</p>}
              </div>
              {r.reviewStatus === 'pending' ? (
                <div className="rec-admin-review">
                  <textarea
                    value={notes[r.id] || ''}
                    onChange={(e) => setNotes((n) => ({ ...n, [r.id]: e.target.value }))}
                    rows={2}
                    maxLength={1000}
                    placeholder="Note to the poster (required to request changes)"
                    aria-label={`Review note for ${r.title}`}
                  />
                  <div className="rec-actions">
                    <Link to={`/recruitments/${r.slug}`} className="rec-btn">Preview</Link>
                    <button type="button" className="rec-btn" onClick={() => review(r, 'reject')}>Request changes</button>
                    <button type="button" className="rec-btn rec-btn-primary" onClick={() => review(r, 'approve')}>Approve &amp; publish</button>
                  </div>
                </div>
              ) : (
                <div className="rec-actions">
                  <Link to={`/recruitments/${r.slug}`} className="rec-btn"><i className="bi bi-people" aria-hidden="true" /> Applicants</Link>
                  <Link to={`/recruitments/${r.id}/edit`} className="rec-btn"><i className="bi bi-pencil" aria-hidden="true" /> Edit</Link>
                  {['published', 'closed'].includes(r.status) && <PushEmailButton kind="recruitment" id={r.id} title={r.title} />}
                </div>
              )}
            </article>
          ))}
        </div>
      </main>
    </>
  );
}

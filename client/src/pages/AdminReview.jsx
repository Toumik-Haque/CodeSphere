import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import SafeText from '../components/SafeText';
import { apiRequest } from '../lib/api';
import { timeAgo } from '../lib/time';
import '../css/Host.css';

const fmt = (d) => (d ? new Date(d).toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' }) : '—');
const TABS = [
  { id: 'pending', label: 'Pending' },
  { id: 'approved', label: 'Approved' },
  { id: 'rejected', label: 'Rejected' },
];

function ReviewCard({ item, onDone }) {
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const decide = async (decision) => {
    if (decision === 'reject' && note.trim().length < 5) {
      setError('Write the reason so the host knows what to fix.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      await apiRequest(`/host/admin/${item.kind}/${item.id}/review`, { method: 'POST', body: JSON.stringify({ decision, note }) });
      onDone(decision === 'approve' ? `Approved "${item.title}". It is live now.` : `Sent "${item.title}" back with your note.`);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  const links = [
    ['bi-linkedin', 'LinkedIn post', item.linkedinPostLink],
    ['bi-instagram', 'Instagram post', item.instagramPostLink],
    ['bi-globe2', 'Website', item.websiteLink],
    ['bi-pencil-square', 'Registration', item.registrationLink],
    ['bi-camera-video', 'Meeting link', item.meetingLink],
  ].filter(([, , url]) => url);

  return (
    <article className="review-card">
      {item.bannerUrl && (
        <a href={item.bannerUrl} target="_blank" rel="noopener noreferrer" className="review-banner">
          <img src={item.bannerUrl} alt={`Banner for ${item.title}`} loading="lazy" />
        </a>
      )}
      <div className="review-body">
        <div className="host-item-top">
          <span className="host-kind">{item.kind === 'event' ? `Event · ${item.category}` : 'Hackathon'}</span>
          <span className="host-muted">Submitted {timeAgo(item.submittedAt)} by <strong>{item.host?.name}</strong> ({item.host?.email})</span>
        </div>
        <h2>{item.title}</h2>
        {item.tagline && <p className="host-muted">{item.tagline}</p>}

        <dl className="review-facts">
          {item.kind === 'event' ? (
            <>
              <div><dt>Starts</dt><dd>{fmt(item.date)}</dd></div>
              <div><dt>Ends</dt><dd>{fmt(item.endDate)}</dd></div>
              <div><dt>Mode</dt><dd>{item.mode}{item.venue && ` · ${item.venue}`}</dd></div>
            </>
          ) : (
            <>
              <div><dt>Registration</dt><dd>{fmt(item.regStart)} → {fmt(item.regEnd)}</dd></div>
              <div><dt>Submissions</dt><dd>{fmt(item.submissionStart)} → {fmt(item.submissionEnd)}</dd></div>
              <div><dt>Mode · Teams</dt><dd>{item.mode}{item.venue && ` · ${item.venue}`} · {item.teamMin}–{item.teamMax}</dd></div>
              {item.tracks?.length > 0 && <div><dt>Tracks</dt><dd>{item.tracks.join(', ')}</dd></div>}
              {item.prizes?.length > 0 && <div><dt>Prizes</dt><dd>{item.prizes.map((p) => `${p.title}${p.reward ? ` (${p.reward})` : ''}`).join(' · ')}</dd></div>}
            </>
          )}
          <div><dt>Organiser</dt><dd>{item.hostName}</dd></div>
          <div><dt>Contact</dt><dd><a href={`mailto:${item.contactEmail}`}>{item.contactEmail}</a>{item.contactPhone && ` · ${item.contactPhone}`}</dd></div>
        </dl>

        {links.length > 0 && (
          <div className="review-links">
            {links.map(([icon, label, url]) => (
              <a key={label} href={url} target="_blank" rel="noopener noreferrer nofollow"><i className={`bi ${icon}`} aria-hidden="true" /> {label}</a>
            ))}
          </div>
        )}

        <details open={item.reviewStatus === 'pending'}>
          <summary>Description & rules</summary>
          <h3>Description</h3>
          <div className="review-text"><SafeText text={item.description} /></div>
          <h3>Rules</h3>
          <div className="review-text"><SafeText text={item.rules} /></div>
        </details>

        {item.reviewNote && item.reviewStatus !== 'pending' && <div className={`host-review-note ${item.reviewStatus}`}><strong>Note sent</strong><p>{item.reviewNote}</p></div>}
        {item.reviewStatus === 'pending' && item.reviewNote && <div className="host-review-note rejected"><strong>Resubmitted after your note</strong><p>{item.reviewNote}</p></div>}

        <div className="review-decide">
          <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} maxLength={1000}
            placeholder={item.reviewStatus === 'approved' ? 'Reason for taking it down (sent to the host)…' : 'Reason / note for the host (required to reject)…'}
            aria-label="Note for the host" />
          <div className="host-actions">
            {item.reviewStatus !== 'approved' && <button type="button" className="btn btn-gold" disabled={busy} onClick={() => decide('approve')}><i className="bi bi-check-lg" aria-hidden="true" /> Approve & publish</button>}
            <button type="button" className="review-reject" disabled={busy} onClick={() => decide('reject')}>
              <i className="bi bi-x-lg" aria-hidden="true" /> {item.reviewStatus === 'approved' ? 'Unpublish with reason' : 'Reject with reason'}
            </button>
            {item.published && <Link className="host-btn" to={item.kind === 'event' ? `/events/${item.slug}` : `/hackathons/${item.slug}`}>View live</Link>}
          </div>
          {error && <p className="host-error" role="alert">{error}</p>}
        </div>
      </div>
    </article>
  );
}

export default function AdminReview() {
  const [tab, setTab] = useState('pending');
  const [data, setData] = useState(null);
  const [message, setMessage] = useState('');
  const [version, setVersion] = useState(0);
  const reload = useCallback(() => setVersion((v) => v + 1), []);

  useEffect(() => {
    let cancelled = false;
    apiRequest(`/host/admin/queue?status=${tab}`).then((r) => !cancelled && setData(r)).catch((e) => !cancelled && setMessage(e.message));
    return () => {
      cancelled = true;
    };
  }, [tab, version]);

  const pending = data ? Object.values(data.counts).reduce((a, b) => a + b, 0) : null;

  return (
    <>
      <Navbar />
      <main className="host-page">
        <div className="container">
          <header className="host-head">
            <span className="host-eyebrow"><i className="bi bi-inbox" aria-hidden="true" /> Admin</span>
            <h1>Review hosted listings</h1>
            <p>Events and hackathons submitted by students. Approve to publish, or reject with a reason so they can fix and resubmit.</p>
          </header>
          <div className="review-tabs" role="tablist">
            {TABS.map((t) => (
              <button key={t.id} type="button" role="tab" aria-selected={tab === t.id} className={tab === t.id ? 'active' : ''} onClick={() => { if (t.id !== tab) { setData(null); setTab(t.id); } }}>
                {t.label}{t.id === 'pending' && pending > 0 && <span>{pending}</span>}
              </button>
            ))}
          </div>
          {message && <p className="host-ok" role="status">{message}</p>}
          {!data && <div className="host-skeleton" />}
          {data?.items.length === 0 && (
            <div className="host-empty"><span aria-hidden="true">✅</span><h2>{tab === 'pending' ? 'All caught up' : `Nothing ${tab}`}</h2></div>
          )}
          <div className="host-list">
            {data?.items.map((item) => (
              <ReviewCard key={`${item.kind}-${item.id}`} item={item} onDone={(m) => { setMessage(m); reload(); }} />
            ))}
          </div>
        </div>
      </main>
    </>
  );
}

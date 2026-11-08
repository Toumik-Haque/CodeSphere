import { useCallback, useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import HackathonJudging from '../components/HackathonJudging';
import { apiRequest } from '../lib/api';
import { formatDate, timeAgo } from '../lib/time';
import '../css/Host.css';

const STATUS = {
  pending: { label: 'In review', icon: 'bi-hourglass-split' },
  approved: { label: 'Live', icon: 'bi-check-circle-fill' },
  rejected: { label: 'Changes needed', icon: 'bi-exclamation-circle-fill' },
};

export default function MyHosting() {
  const location = useLocation();
  const [items, setItems] = useState(null);
  const [message, setMessage] = useState(location.state?.message || '');
  const [judging, setJudging] = useState(null);
  const [version, setVersion] = useState(0);
  const reload = useCallback(() => setVersion((v) => v + 1), []);

  useEffect(() => {
    let cancelled = false;
    apiRequest('/host/mine').then((r) => !cancelled && setItems(r.items)).catch((e) => !cancelled && setMessage(e.message));
    return () => {
      cancelled = true;
    };
  }, [version]);

  const withdraw = async (item) => {
    if (!window.confirm(`Withdraw "${item.title}"? This deletes the submission.`)) return;
    try {
      await apiRequest(`/host/${item.kind}/${item.id}`, { method: 'DELETE' });
      setMessage('Withdrawn.');
      reload();
    } catch (e) {
      setMessage(e.message);
    }
  };

  return (
    <>
      <Navbar />
      <main className="host-page">
        <div className="container">
          <header className="host-head host-head-row">
            <div>
              <span className="host-eyebrow"><i className="bi bi-megaphone" aria-hidden="true" /> Community hosting</span>
              <h1>Your hosted listings</h1>
              <p>Track reviews, fix requested changes and manage your live hackathons.</p>
            </div>
            <div className="host-new">
              <Link to="/host/event/new" className="btn btn-gold"><i className="bi bi-calendar-plus" aria-hidden="true" /> Host an event</Link>
              <Link to="/host/hackathon/new" className="host-btn"><i className="bi bi-trophy" aria-hidden="true" /> Host a hackathon</Link>
            </div>
          </header>

          {message && <p className="host-ok" role="status">{message}</p>}
          {!items && <div className="host-skeleton" />}
          {items?.length === 0 && (
            <div className="host-empty">
              <span aria-hidden="true">📣</span>
              <h2>Nothing hosted yet</h2>
              <p>Running a workshop, meetup or hackathon? List it on CodeSphere and reach every student here.</p>
            </div>
          )}

          <div className="host-list">
            {items?.map((item) => {
              const st = STATUS[item.reviewStatus] || STATUS.pending;
              const livePath = item.kind === 'event' ? `/events/${item.slug}` : `/hackathons/${item.slug}`;
              return (
                <article key={`${item.kind}-${item.id}`} className={`host-item status-${item.reviewStatus}`}>
                  <div className="host-item-img" style={item.bannerUrl ? { backgroundImage: `url("${encodeURI(item.bannerUrl)}")` } : undefined} />
                  <div className="host-item-body">
                    <div className="host-item-top">
                      <span className="host-kind">{item.kind === 'event' ? item.category : 'Hackathon'}</span>
                      <span className={`host-status ${item.reviewStatus}`}><i className={`bi ${st.icon}`} aria-hidden="true" /> {st.label}</span>
                    </div>
                    <h2>{item.title}</h2>
                    <p className="host-muted">
                      {item.kind === 'event' ? formatDate(item.date) : `Registration ${formatDate(item.regStart)} – ${formatDate(item.regEnd)}`}
                      {' · '}submitted {timeAgo(item.submittedAt)}
                    </p>
                    {item.reviewStatus === 'rejected' && item.reviewNote && (
                      <div className="host-review-note rejected"><strong>Reviewer&apos;s note</strong><p>{item.reviewNote}</p></div>
                    )}
                    {item.reviewStatus === 'approved' && item.reviewNote && (
                      <div className="host-review-note approved"><strong>Reviewer&apos;s note</strong><p>{item.reviewNote}</p></div>
                    )}
                    <div className="host-actions">
                      {item.published && <Link to={livePath} className="host-btn"><i className="bi bi-box-arrow-up-right" aria-hidden="true" /> View live</Link>}
                      <Link to={`/host/${item.kind}/${item.id}/edit`} className={item.reviewStatus === 'rejected' ? 'btn btn-gold' : 'host-btn'}>
                        <i className="bi bi-pencil" aria-hidden="true" /> {item.reviewStatus === 'rejected' ? 'Fix & resubmit' : 'Edit'}
                      </Link>
                      {item.kind === 'hackathon' && item.reviewStatus === 'approved' && (
                        <button type="button" className="host-btn" onClick={() => setJudging(judging === item.id ? null : item.id)}>
                          <i className="bi bi-inboxes" aria-hidden="true" /> Submissions & judging
                        </button>
                      )}
                      {item.reviewStatus !== 'approved' && <button type="button" className="host-link-danger" onClick={() => withdraw(item)}>Withdraw</button>}
                    </div>
                    {judging === item.id && <HackathonJudging id={item.id} showEmails={false} />}
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}

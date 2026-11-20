import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { useAuth } from '../context/AuthContext';
import { apiRequest } from '../lib/api';
import { daysLeft, formatDay, TYPE_LABEL } from '../lib/recruitments';
import '../css/Recruitments.css';

// Recruitment drives and interview sessions from the club and the community.
export default function Recruitments() {
  const { user } = useAuth();
  const [items, setItems] = useState(null);
  const [type, setType] = useState('');
  const [state, setState] = useState('open');
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    const params = new URLSearchParams();
    if (type) params.set('type', type);
    if (state) params.set('state', state);
    apiRequest(`/recruitments?${params}`)
      .then((r) => !cancelled && setItems(r.recruitments))
      .catch((e) => !cancelled && setError(e.message));
    return () => {
      cancelled = true;
    };
  }, [type, state]);

  return (
    <>
      <Navbar />
      <main className="rec-page">
        <header className="rec-hero">
          <div className="container rec-hero-inner">
            <div>
              <span className="rec-eyebrow"><i className="bi bi-person-badge" aria-hidden="true" /> Recruitment &amp; Interviews</span>
              <h1>Join a team. <span>Grow with it.</span></h1>
              <p>Recruitment drives and interview sessions from CodeSphere, GDG on Campus and other campus tech communities. Apply in one click.</p>
            </div>
            <Link to={user ? '/recruitments/new' : '/login'} className="rec-btn rec-btn-primary">
              <i className="bi bi-megaphone" aria-hidden="true" /> Post a recruitment
            </Link>
          </div>
        </header>

        <div className="container rec-body">
          <div className="rec-filters">
            <div className="rec-seg" role="tablist" aria-label="Type">
              {[['', 'All'], ['recruitment', 'Recruitment drives'], ['interview', 'Interview sessions']].map(([value, label]) => (
                <button key={label} type="button" role="tab" aria-selected={type === value} className={type === value ? 'on' : ''} onClick={() => setType(value)}>{label}</button>
              ))}
            </div>
            <div className="rec-seg" role="tablist" aria-label="Status">
              {[['open', 'Open'], ['closed', 'Closed'], ['', 'All']].map(([value, label]) => (
                <button key={label} type="button" role="tab" aria-selected={state === value} className={state === value ? 'on' : ''} onClick={() => setState(value)}>{label}</button>
              ))}
            </div>
          </div>

          {error && <p className="rec-error">{error}</p>}
          {!items && !error && <p className="rec-muted">Loading…</p>}
          {items?.length === 0 && (
            <div className="rec-empty">
              <i className="bi bi-inbox" aria-hidden="true" />
              <h2>{state === 'open' ? 'Nothing open right now' : 'Nothing here yet'}</h2>
              <p>Running a recruitment for your club or community? Post it here and reach every member.</p>
              <Link to={user ? '/recruitments/new' : '/login'} className="rec-btn rec-btn-primary">Post a recruitment</Link>
            </div>
          )}

          <div className="rec-grid">
            {items?.map((r) => {
              const left = daysLeft(r.applyBy);
              return (
                <Link key={r.id} to={`/recruitments/${r.slug}`} className={`rec-card ${r.open ? '' : 'is-closed'}`}>
                  <div className="rec-card-banner">
                    {r.banner ? <img src={r.banner} alt="" loading="lazy" /> : <span>{r.organization.slice(0, 2).toUpperCase()}</span>}
                    <em className={`rec-type type-${r.type}`}>{TYPE_LABEL[r.type]}</em>
                  </div>
                  <div className="rec-card-body">
                    <small className="rec-org">{r.organization}{r.origin === 'club' && <i className="bi bi-patch-check-fill" title="Posted by CodeSphere" aria-label="Posted by CodeSphere" />}</small>
                    <h2>{r.title}</h2>
                    {r.summary && <p>{r.summary}</p>}
                    {r.roles.length > 0 && (
                      <div className="rec-chips">
                        {r.roles.slice(0, 4).map((role) => <span key={role}>{role}</span>)}
                        {r.roles.length > 4 && <span>+{r.roles.length - 4}</span>}
                      </div>
                    )}
                    <div className="rec-card-meta">
                      <span><i className="bi bi-geo-alt" aria-hidden="true" /> {r.mode === 'Online' ? (r.platform || 'Online') : r.venue || r.mode}</span>
                      <span className={r.open && left <= 3 ? 'urgent' : ''}>
                        <i className="bi bi-hourglass-split" aria-hidden="true" />{' '}
                        {r.open ? (left === 0 ? 'Closes today' : `${left} day${left === 1 ? '' : 's'} left`) : `Closed ${formatDay(r.applyBy)}`}
                      </span>
                      {r.applicants > 0 && <span><i className="bi bi-people" aria-hidden="true" /> {r.applicants} applied</span>}
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}

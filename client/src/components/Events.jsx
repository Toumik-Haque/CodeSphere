
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiRequest } from '../lib/api';
import '../css/Events.css';
import logo from '../assets/logo.png';

function getPublishedTime(event) {
  const value = event.publishedAt || event.createdAt;

  if (value) {
    const time = new Date(value).getTime();
    if (Number.isFinite(time)) return time;
  }

  // Fallback for MongoDB ObjectIds containing a creation timestamp.
  const id = String(event._id || '');
  if (/^[a-f\d]{24}$/i.test(id)) {
    return parseInt(id.slice(0, 8), 16) * 1000;
  }

  return 0;
}

// function slugify(title) {
//   return title
//     .toLowerCase()
//     .trim()
//     .replace(/[^a-z0-9]+/g, '-')
//     .replace(/^-|-$/g, '');
// }

export default function Events() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;

    async function loadEvents() {
      try {
        const data = await apiRequest('/events');
        const list = Array.isArray(data) ? data : data.events || [];

        if (!cancelled) {
          setEvents(
            [...list].sort(
              (a, b) => getPublishedTime(b) - getPublishedTime(a)
            )
          );
        }
      } catch {
        if (!cancelled) {
          setError('Unable to load events right now.');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadEvents();
    return () => {
      cancelled = true;
    };
  }, []);

  const latestEvents = events.slice(0, 3);

  return (
    <section className="events-section" id="events">
      <div className="container">
        <div className="events-heading">
          <span className="section-eyebrow">
            <span className="section-eyebrow-line" />
            WHAT'S HAPPENING
          </span>

          <h2 className="events-title">
            Moments That{' '}
            <span className="gold-text">Move Us Forward.</span>
          </h2>

          <p className="events-subtitle">
            Explore the latest CodeSphere events, ideas, and experiences
            shared by our community.
          </p>
        </div>

        {loading ? (
          <p className="events-status">Loading events...</p>
        ) : error ? (
          <p className="events-status">{error}</p>
        ) : latestEvents.length === 0 ? (
          <p className="events-status">
            No events have been published yet. Check back soon!
          </p>
        ) : (
          <div className="events-cards-grid">
            {latestEvents.map((event) => (
              <EventCard key={event._id} event={event} />
            ))}
          </div>
        )}

        <div className="events-view-all">
          <Link to="/events" className="events-view-all-link">
            View All Events
            <i className="bi bi-arrow-up-right" aria-hidden="true" />
          </Link>
        </div>
      </div>
    </section>
  );
}

export function EventCard({ event }) {
  return (
    <Link
      to={`/events/${event.slug}`}
      aria-label={`View ${event.title}`}
    >

      <article className="published-event-card">
        <div className="published-event-banner">
          <div className="published-event-banner-date-badge">
            <p className="month m-0">{new Date(event.date).toLocaleString('en-GB', { month: 'short' })}</p>
            <p className="day m-0">{new Date(event.date).toLocaleString('en-GB', { day: '2-digit' })}</p>
          </div>


          {event.bannerImage?.url && (
            <img
              className="published-event-banner-blur"
              src={event.bannerImage.url}
              alt=""
              aria-hidden="true"
            />
          )}

          {event.bannerImage?.url ? (
            <img
              className="published-event-banner-image"
              src={event.bannerImage.url}
              alt={`${event.title} banner`}
              loading="lazy"
              onError={(e) => {
                e.currentTarget.style.display = 'none';

                const fallback = e.currentTarget.parentElement
                  ?.querySelector('.published-event-banner-fallback');

                if (fallback) fallback.style.display = 'flex';
              }}
            />
          ) : null}

          <div
            className="published-event-banner-fallback"
            style={{ display: event.bannerImage?.url ? 'none' : 'flex' }}
          >
            <img src={logo} alt="CodeSphere logo" />
            <span>CodeSphere Event</span>
          </div>

        </div>

        <div className="published-event-body">
          <span className="published-event-category">
            {event.category || 'CodeSphere Event'}
          </span>

          <h3 title={event.title}>{event.title}</h3>

          <p className="published-event-description">
            {event.description || 'More details coming soon.'}
          </p>

          <div className="published-event-bottom d-flex align-items-end justify-content-between">
            <div className="published-event-meta">
              <span>
                <i className="bi bi-calendar-event" aria-hidden="true" />
                {new Date(event.date).toLocaleString('en-GB', {
                  day: '2-digit',
                  month: 'short',
                  year: '2-digit',
                  hour: '2-digit',
                  minute: '2-digit',
                  hour12: true
                })}
              </span>

              {event.venue && (
                <span title={event.venue}>
                  <i className="bi bi-geo-alt" aria-hidden="true" />
                  {event.venue || event.mode}
                </span>
              )}
            </div>

            <div className="published-event-arrow">
              <i className="bi bi-arrow-up-right" aria-hidden="true" />
            </div>
          </div>
        </div>
      </article>
    </Link>
  );
}

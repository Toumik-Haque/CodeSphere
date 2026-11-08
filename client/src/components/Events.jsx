
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiRequest } from '../lib/api';
import '../css/Events.css';
import brand from '../assets/logo.png';

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
              (a, b) => new Date(b.date) - new Date(a.date)
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

  const latestEvents = events.slice(0, 4);

  return (
    <section className="events-section" id="events">
      <div className="container">
        <div className="events-heading">
          <span className="section-eyebrow">
            <span className="section-eyebrow-line" />
            WHAT'S HAPPENING
          </span>

          <h2 className="events-title">
            Explore our{' '}
            <span className="gold-text">Events.</span>
          </h2>

          <p className="events-subtitle">
            Workshops, coding sessions, and experiences that bring our
            community together.
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
            <i className="bi bi-arrow-right" aria-hidden="true" />
          </Link>
        </div>
      </div>
    </section>
  );
}

function getDescriptionPreview(html = '') {
  const doc = new DOMParser().parseFromString(html, 'text/html');

  return (doc.body.textContent || '')
    .replace(/\s+/g, ' ')
    .trim();
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
            <p className="month m-0">
              {new Date(event.date).toLocaleString('en-GB', {
                month: 'short',
              })}
            </p>

            <p className="day m-0">
              {new Date(event.date).toLocaleString('en-GB', {
                day: '2-digit',
              })}
            </p>
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
            style={{
              display: event.bannerImage?.url ? 'none' : 'flex',
            }}
          >
            <img src={brand} alt="CodeSphere logo" />
            <span>{event.category || 'CodeSphere Event'}</span>
          </div>
        </div>

        <div className="published-event-body">
          <span className="published-event-category">
            {event.category || 'CodeSphere Event'}
          </span>

          <h3 title={event.title}>{event.title}</h3>

          <p className="published-event-description">
            {getDescriptionPreview(event.description) ||
              'More details coming soon.'}
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
                  hour12: true,
                })}
              </span>


              <span title={event.venue || event.mode}>
                <i className="bi bi-geo-alt" aria-hidden="true" />
                {event.venue || event.mode}
              </span>

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

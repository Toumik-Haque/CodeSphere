
import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { apiRequest } from '../lib/api';
import '../css/EventDetails.css';
import brand from '../assets/brand.svg';

function formatDate(value, options = {}) {
  if (!value) return 'Date to be announced';

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return 'Date to be announced';
  }

  return date.toLocaleDateString('en-IN', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    ...options,
  });
}

function formatTime(value) {
  if (!value) return '';

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';

  return date.toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
}

function eventHasPassed(event) {
  const end = event.endDate || event.date;
  const endTime = new Date(end).getTime();

  return Number.isFinite(endTime) && endTime < Date.now();
}

export default function EventDetails() {
  const { slug } = useParams();

  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;

    async function loadEvent() {
      setLoading(true);
      setError('');
      setEvent(null);

      try {
        const data = await apiRequest(`/events/slug/${encodeURIComponent(slug)}`);


        if (!cancelled) {
          setEvent(data.event);
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err?.message || 'This event could not be found.'
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadEvent();

    return () => {
      cancelled = true;
    };
  }, [slug]);

  const passed = event ? eventHasPassed(event) : false;
  const startTime = event ? formatTime(event.date) : '';
  const endTime = event?.endDate ? formatTime(event.endDate) : '';

  async function handleShareEvent() {
    const shareData = {
      title: event.title,
      text: `Check out ${event.title} on CodeSphere!`,
      url: window.location.href,
    };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch (error) {
        // Ignore cancellation when the user closes the native share menu.
        if (error.name !== 'AbortError') {
          console.error('Unable to share event:', error);
        }
      }
    } else {
      // Fallback for browsers without native sharing.
      try {
        await navigator.clipboard.writeText(window.location.href);
        alert('Event link copied to clipboard!');
      } catch {
        window.prompt('Copy this event link:', window.location.href);
      }
    }
  }

  return (
    <>
      <Navbar />

      <main className="event-view-page">
        <div className="event-view-container container">
          <Link to="/events" className="event-view-back">
            <i className="bi bi-arrow-left" aria-hidden="true" />
            All events
          </Link>

          {loading ? (
            <div className="event-view-state">
              <i className="bi bi-hourglass-split" aria-hidden="true" />
              <p>Loading event details...</p>
            </div>
          ) : error || !event ? (
            <div className="event-view-state">
              <i className="bi bi-calendar-x" aria-hidden="true" />
              <h1>Event unavailable</h1>
              <p>
                {error || 'This event may have been removed or unpublished.'}
              </p>
              <Link to="/events" className="event-view-button">
                Browse all events
              </Link>
            </div>
          ) : (
            <>
              <div className="event-view-layout">
                <section className="event-view-main">
                  <div className="event-view-header">
                    <span className="event-view-category">
                      {event.category}
                    </span>

                    <button
                      type="button"
                      className="event-view-share"
                      onClick={handleShareEvent}
                      aria-label="Share this event"
                    >
                      <i className="bi bi-share" aria-hidden="true"></i>
                      <span>Share</span>
                    </button>
                  </div>


                  <h1 className="event-view-title">{event.title}</h1>

                  <p className="event-view-description">{event.description}</p>

                  <div className="event-view-banner">
                    {event.bannerImage?.url && (
                      <img
                        className="published-event-banner-blur"
                        src={event.bannerImage.url}
                        alt=""
                        aria-hidden="true"
                      />
                    )}

                    {event.bannerImage?.url && (
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

                          const blur = e.currentTarget.parentElement
                            ?.querySelector('.published-event-banner-blur');

                          if (blur) blur.style.display = 'none';
                        }}
                      />
                    )}

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
                </section>

                <aside className="event-view-details">
                  <div className="event-view-detail-row">
                    <i className="bi bi-calendar-event" aria-hidden="true" />
                    <div>
                      <span className="event-view-detail-label">When</span>
                      <p>{formatDate(event.date)}</p>
                      {startTime && (
                        <p>
                          {startTime}
                          {endTime && endTime !== startTime
                            ? ` – ${endTime}`
                            : ''}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="event-view-detail-row">
                    <i className="bi bi-geo-alt" aria-hidden="true" />
                    <div>
                      <span className="event-view-detail-label">Where</span>
                      <p>{event.venue || event.mode || 'Location to be announced'}</p>
                      {event.venue && event.mode !== 'In-person' && (
                        <p>{event.mode}</p>
                      )}
                    </div>
                  </div>

                  <div className="event-view-detail-row">
                    <i className="bi bi-info-circle" aria-hidden="true" />
                    <div>
                      <span className="event-view-detail-label">Event type</span>
                      <p>{event.mode || 'In-person'}</p>
                    </div>
                  </div>

                  <p className={`event-view-status ${passed ? 'is-past' : ''}`}>
                    {passed
                      ? 'This event has already taken place.'
                      : 'This event is upcoming.'}
                  </p>

                  {!passed && event.meetingLink && (
                    <a
                      className="event-view-button"
                      href={event.meetingLink}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      View event / Join
                      <i className="bi bi-arrow-up-right" aria-hidden="true" />
                    </a>
                  )}
                </aside>
              </div>
            </>
          )}
        </div>
      </main>

      <Footer />
    </>
  );
}

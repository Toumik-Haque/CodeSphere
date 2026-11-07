
import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Link, useParams } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { apiRequest } from '../lib/api';
import DOMPurify from 'dompurify';
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
  let end;

  if (event.endDate) {
    end = new Date(event.endDate);
  } else {
    end = new Date(event.date);
    end.setDate(end.getDate() + 1);
    end.setHours(0, 0, 0, 0);
  }

  return Number.isFinite(end.getTime()) && end.getTime() < Date.now();
}

export default function EventDetails() {
  const { slug } = useParams();

  const { user } = useAuth();
  const isAuthenticated = Boolean(user);
  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [isRegistered, setIsRegistered] = useState(false);
  const [registrationLoading, setRegistrationLoading] = useState(false);
  const [registrationChecking, setRegistrationChecking] = useState(false);
  const [registrationError, setRegistrationError] = useState('');

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

  useEffect(() => {
  let cancelled = false;

  async function checkRegistration() {
    // Reset the previous event/user's registration state.
    setIsRegistered(false);
    setRegistrationError('');

    if (!event || !user || user.role !== 'user') {
      setRegistrationChecking(false);
      return;
    }

    setRegistrationChecking(true);

    try {
      const data = await apiRequest('/events/my-registrations');
      const registrations = data.registrations || [];

      const activeRegistration = registrations.some((registration) => {
        const registeredEventId =
          registration.event?._id || registration.event;

        return (
          String(registeredEventId) === String(event._id) &&
          registration.status === 'registered'
        );
      });

      if (!cancelled) {
        setIsRegistered(activeRegistration);
      }
    } catch (err) {
      if (!cancelled) {
        setRegistrationError(
          err.message || 'Unable to check registration status.'
        );
      }
    } finally {
      if (!cancelled) {
        setRegistrationChecking(false);
      }
    }
  }

  checkRegistration();

  return () => {
    cancelled = true;
  };
}, [event, user]);

  const passed = event ? eventHasPassed(event) : false;
  const startTime = event ? formatTime(event.date) : '';
  const endTime = event?.endDate ? formatTime(event.endDate) : '';

  async function handleRegistration() {
    if (!event || registrationLoading) return;

    setRegistrationLoading(true);
    setRegistrationError('');

    try {
      if (isRegistered) {
        const confirmed = window.confirm(
          'Are you sure you want to cancel your event registration?'
        );

        if (!confirmed) return;

        await apiRequest(`/events/${event._id}/register`, {
          method: 'DELETE',
        });

        setIsRegistered(false);
        alert('Your event registration has been cancelled.');
      } else {
        await apiRequest(`/events/${event._id}/register`, {
          method: 'POST',
        });

        setIsRegistered(true);
        alert('Successfully registered for the event!');
      }
    } catch (err) {
      setRegistrationError(
        err.message || 'Unable to process your registration.'
      );
    } finally {
      setRegistrationLoading(false);
    }
  }

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

  console.log('REGISTRATION DEBUG:', {
  user,
  userRole: user?.role,
  isAuthenticated,
  eventTitle: event?.title,
  eventDate: event?.date,
  eventEndDate: event?.endDate,
  passed,
  registrationChecking,
  isRegistered,
});

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

                  <div
                    className="event-view-description"
                    dangerouslySetInnerHTML={{
                      __html: DOMPurify.sanitize(event.description || ''),
                    }}
                  />

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

                  {!passed && (
                    <>
                      {/* Event registration */}
                      {user?.role === 'admin' ? null : !isAuthenticated ? (
                        <Link className="event-view-button text-white" to="/login">
                          Login to Register
                          <i className="bi bi-arrow-right" aria-hidden="true" />
                        </Link>
                      ) : user?.role === 'user' ? (
                        <>
                          {registrationChecking ? (
                            <button
                              type="button"
                              className="event-view-button text-white"
                              disabled
                            >
                              Checking registration...
                            </button>
                          ) : (
                            <button
                              type="button"
                              className="event-view-button text-white"
                              onClick={handleRegistration}
                              disabled={registrationLoading}
                            >
                              {registrationLoading
                                ? 'Please wait...'
                                : isRegistered
                                  ? 'Cancel Registration'
                                  : 'Register Now'}

                              {!registrationLoading && (
                                <i
                                  className={`bi ${isRegistered ? 'bi-x-circle' : 'bi-arrow-right'
                                    }`}
                                  aria-hidden="true"
                                />
                              )}
                            </button>
                          )}
                        </>
                      ) : null}

                      {registrationError && (
                        <p className="event-view-status" role="alert">
                          {registrationError}
                        </p>
                      )}

                      {/* Meeting link */}
                      {event.meetingLink && (
                        isAuthenticated ? (
                          <a
                            className="event-view-button text-white"
                            href={event.meetingLink}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            Meeting Link
                            <i className="bi bi-arrow-up-right" aria-hidden="true" />
                          </a>
                        ) : (
                          <Link className="event-view-button text-white" to="/login">
                            Login to Access Meeting
                            <i className="bi bi-arrow-right" aria-hidden="true" />
                          </Link>
                        )
                      )}
                    </>
                  )}

                  {passed && event.linkedinPostLink && (
                    <a
                      className="event-view-button text-white"
                      href={event.linkedinPostLink}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <i className='bi bi-linkedin' aria-hidden="true" />
                      LINKEDIN POST
                      <i className='bi bi-arrow-up-right' aria-hidden="true" />
                    </a>
                  )}

                  {passed && event.instagramPostLink && (
                    <a
                      className="event-view-button text-white"
                      href={event.instagramPostLink}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <i className='bi bi-instagram' aria-hidden="true" />
                      INSTAGRAM POST
                      <i className='bi bi-arrow-up-right' aria-hidden="true" />
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

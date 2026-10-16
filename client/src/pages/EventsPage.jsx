
import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { apiRequest } from '../lib/api';
import { EventCard } from '../components/Events';
import '../css/EventsPage.css';

function isValidDate(value) {
  return value && !Number.isNaN(new Date(value).getTime());
}

export default function EventsPage() {
  const [events, setEvents] = useState([]);
  const [activeTab, setActiveTab] = useState('upcoming');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;

    async function loadEvents() {
      try {
        const data = await apiRequest('/events');
        const list = Array.isArray(data) ? data : data.events || [];

        if (!cancelled) setEvents(list);
      } catch {
        if (!cancelled) {
          setError('Unable to load events. Please try again later.');
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

  const { upcoming, past } = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const upcomingEvents = [];
    const pastEvents = [];

    events.forEach((event) => {
      if (!isValidDate(event.date)) {
        // Events without a valid date are not assigned to either tab.
        return;
      }

      const eventDate = new Date(event.date);
      eventDate.setHours(0, 0, 0, 0);

      if (eventDate >= today) {
        upcomingEvents.push(event);
      } else {
        pastEvents.push(event);
      }
    });

    upcomingEvents.sort(
      (a, b) => new Date(a.date) - new Date(b.date)
    );

    pastEvents.sort(
      (a, b) => new Date(b.date) - new Date(a.date)
    );

    return { upcoming: upcomingEvents, past: pastEvents };
  }, [events]);

  const visibleEvents = activeTab === 'upcoming' ? upcoming : past;

  return (
    <>
      <Navbar />

      <main className="events-page">
        <div className="container">
          <header className="events-page-heading">

            <span className="section-eyebrow">
              <span className="section-eyebrow-line" />
              THE CODESPHERE EXPERIENCE
            </span>

            <h1 className="events-page-title">
              Explore <span className="gold-text">Our Events.</span>
            </h1>

            <p className="events-subtitle">
              Discover upcoming experiences or revisit the moments
              our community has shared.
            </p>
          </header>

          <div className="events-tabs" role="tablist" aria-label="Events">
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'upcoming'}
              className={`events-tab ${activeTab === 'upcoming' ? 'active' : ''}`}
              onClick={() => setActiveTab('upcoming')}
            >
              Upcoming <span>({upcoming.length})</span>
            </button>

            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'past'}
              className={`events-tab ${activeTab === 'past' ? 'active' : ''}`}
              onClick={() => setActiveTab('past')}
            >
              Past Events <span>({past.length})</span>
            </button>
          </div>

          {loading ? (
            <p className="events-status">Loading events...</p>
          ) : error ? (
            <p className="events-status">{error}</p>
          ) : visibleEvents.length === 0 ? (
            <div className="events-page-empty">
              <i className="bi bi-calendar2-x" aria-hidden="true" />
              <h2>
                {activeTab === 'upcoming'
                  ? 'No upcoming events yet'
                  : 'No past events yet'}
              </h2>
              <p>Check back soon for more from the CodeSphere community.</p>
            </div>
          ) : (
            <div className="events-cards-grid events-page-grid">
              {visibleEvents.map((event) => (
                <EventCard key={event._id} event={event} />
              ))}
            </div>
          )}
        </div>
      </main>

      <Footer />
    </>
  );
}

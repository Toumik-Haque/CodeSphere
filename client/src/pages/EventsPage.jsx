
import { useEffect, useMemo, useState } from 'react';
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
  const [searchQuery, setSearchQuery] = useState('');
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

  const visibleEvents = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    return [...events]
      .filter((event) => {
        if (!query) return true;

        const searchableText = [
          event.title,
          event.description,
          event.venue,
          event.location,
          event.category,
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();

        return searchableText.includes(query);
      })
      .sort((a, b) => {
        const dateA = isValidDate(a.date)
          ? new Date(a.date).getTime()
          : 0;

        const dateB = isValidDate(b.date)
          ? new Date(b.date).getTime()
          : 0;

        return dateB - dateA;
      });
  }, [events, searchQuery]);

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
              Discover all the events and experiences shared by
              our CodeSphere community.
            </p>
          </header>

          <div className="events-search-wrapper">
            <i className="bi bi-search" aria-hidden="true" />

            <input
              type="text"
              className="events-search-input"
              placeholder="Search events by title, venue, or keyword..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              aria-label="Search events"
            />

            {searchQuery && (
              <button
                type="button"
                className="events-search-clear"
                onClick={() => setSearchQuery('')}
                aria-label="Clear search"
              >
                <i className="bi bi-x-lg" />
              </button>
            )}
          </div>

          {!loading && !error && (
            <div className="events-results-count">
              {visibleEvents.length}{' '}
              {visibleEvents.length === 1 ? 'event' : 'events'} found
            </div>
          )}

          {loading ? (
            <p className="events-status">Loading events...</p>
          ) : error ? (
            <p className="events-status">{error}</p>
          ) : visibleEvents.length === 0 ? (
            <div className="events-page-empty">
              <i
                className="bi bi-calendar2-x"
                aria-hidden="true"
              />

              <h2>
                {searchQuery
                  ? 'No matching events found'
                  : 'No events available yet'}
              </h2>

              <p>
                {searchQuery
                  ? 'Try searching with a different title or keyword.'
                  : 'Check back soon for more from the CodeSphere community.'}
              </p>
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

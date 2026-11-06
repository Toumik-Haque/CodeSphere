
import { useEffect, useMemo, useState } from 'react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import VideoBackground from '../components/VideoBackground';
import { apiRequest } from '../lib/api';
import { EventCard } from '../components/Events';
import '../css/EventsPage.css';

function isValidDate(value) {
  return value && !Number.isNaN(new Date(value).getTime());
}

export default function EventsPage() {
  const [events, setEvents] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
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
        const matchesCategory =
          selectedCategory === 'All' ||
          event.category === selectedCategory;

        if (!matchesCategory) return false;

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
  }, [events, searchQuery, selectedCategory]);

  return (
    <>
      <VideoBackground src="/VID_20261105_010923.mp4" rotate="left" />
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

          <div className="events-toolbar">
            <div className="events-category-wrapper">
              <i className="bi bi-filter" aria-hidden="true" />

              <select
                className="events-category-select"
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                aria-label="Filter events by category"
              >
                <option value="All">All Categories</option>
                <option value="Workshop">Workshop</option>
                <option value="Hackathon">Hackathon</option>
                <option value="Community Meetup">Community Meetup</option>
              </select>

              <i
                className="bi bi-chevron-down events-category-arrow"
                aria-hidden="true"
              />
            </div>

            <div className="events-search-wrapper m-0">
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
                {searchQuery || selectedCategory !== 'All'
                  ? 'No matching events found'
                  : 'No events available yet'}
              </h2>

              <p>
                {searchQuery || selectedCategory !== 'All'
                  ? 'Try changing your category or search keyword.'
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

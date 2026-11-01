
import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiRequest } from '../lib/api';
import '../css/CoreMembers.css';
import '../css/TeamCarousel.css';

const SCROLL_SPEED = 50;

export default function TeamCarousel() {
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [paused, setPaused] = useState(false);
  const trackRef = useRef(null);

  useEffect(() => {
    let active = true;

    async function loadMembers() {
      try {
        const data = await apiRequest('/core-members');

        if (active) {
          const list = Array.isArray(data)
            ? data
            : Array.isArray(data?.members)
              ? data.members
              : [];

          setMembers(
            [...list].sort(
              (a, b) =>
                (a.order ?? 0) - (b.order ?? 0) ||
                (a.name || '').localeCompare(b.name || '')
            )
          );
        }
      } catch (err) {
        if (active) {
          setError(err.message || 'Unable to load team members.');
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    loadMembers();

    return () => {
      active = false;
    };
  }, []);

  const displayMembers = [...members, ...members];

  useEffect(() => {
    const track = trackRef.current;
    if (!track || members.length === 0) return undefined;

    const mediaQuery = window.matchMedia(
      '(prefers-reduced-motion: reduce)'
    );

    let animationFrame;
    let previousTime = 0;

    const animate = (time) => {
      const currentTrack = trackRef.current;
      if (!currentTrack) return;

      if (!previousTime) previousTime = time;

      const deltaTime = Math.min(time - previousTime, 40);
      previousTime = time;

      const firstCard = currentTrack.children[0];
      const duplicateFirstCard =
        currentTrack.children[members.length];

      if (firstCard && duplicateFirstCard) {
        const loopPoint =
          duplicateFirstCard.offsetLeft - firstCard.offsetLeft;

        if (
          !paused &&
          !mediaQuery.matches &&
          loopPoint > 0 &&
          currentTrack.scrollWidth > currentTrack.clientWidth
        ) {
          currentTrack.scrollLeft +=
            (SCROLL_SPEED * deltaTime) / 1000;

          if (currentTrack.scrollLeft >= loopPoint) {
            currentTrack.scrollLeft -= loopPoint;
          }
        }
      }

      animationFrame = window.requestAnimationFrame(animate);
    };

    const handleMotionChange = () => {
      previousTime = 0;
    };

    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handleMotionChange);
    } else {
      mediaQuery.addListener(handleMotionChange);
    }

    animationFrame = window.requestAnimationFrame(animate);

    return () => {
      window.cancelAnimationFrame(animationFrame);

      if (mediaQuery.removeEventListener) {
        mediaQuery.removeEventListener('change', handleMotionChange);
      } else {
        mediaQuery.removeListener(handleMotionChange);
      }
    };
  }, [paused, members]);

  if (loading) {
    return (
      <section className="core-team-section" aria-busy="true">
        <div className="core-team-heading">
          <p className="core-team-eyebrow">
            THE PEOPLE BEHIND CODESPHERE
          </p>
          <h2>Meet Our Core Team</h2>
        </div>
        <p className="core-team-status">Loading our team...</p>
      </section>
    );
  }

  if (error || members.length === 0) {
    return (
      <section className="core-team-section">
        <div className="core-team-heading">
          <p className="core-team-eyebrow">
            THE PEOPLE BEHIND CODESPHERE
          </p>
          <h2>Meet Our Core Team</h2>
        </div>
        <p className="core-team-status">
          {error || 'Our team profiles will be available soon.'}
        </p>
        <div className="core-team-footer">
          <Link to="/team" className="core-team-view-all">
            <span>Meet the entire team</span>
            <i className="bi bi-arrow-right" aria-hidden="true" />
          </Link>
        </div>
      </section>
    );
  }

  return (
    <section
      className="core-team-section"
      aria-labelledby="core-team-title"
    >
      <div className="core-team-heading">
        <div className="core-team-heading-content">
          <p className="core-team-eyebrow">
            THE PEOPLE BEHIND CODESPHERE
          </p>

          <h2 id="core-team-title">
            Meet Our <span>Core Team</span>
          </h2>

          <p className="core-team-description">
            The people bringing ideas to life and building our community.
          </p>
        </div>
      </div>

      <div
        className="core-team-viewport"
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
        onFocus={() => setPaused(true)}
        onBlur={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget)) {
            setPaused(false);
          }
        }}
      >
        <div
          className="core-team-track"
          ref={trackRef}
          role="region"
          aria-label="Core team members"
          aria-roledescription="carousel"
          tabIndex={0}
        >
          {displayMembers.map((member, index) => {
            const isDuplicate = index >= members.length;

            return (
              <article
                className="core-member-slide"
                key={`${member._id}-${index}`}
                aria-hidden={isDuplicate ? true : undefined}
                inert={isDuplicate ? true : undefined}
              >
                <div className="core-member-photo-wrap">
                  {member.image?.url ? (
                    <img
                      className="core-member-photo"
                      src={member.image.url}
                      alt={isDuplicate ? '' : `Portrait of ${member.name}`}
                      loading={index < 4 ? 'eager' : 'lazy'}
                      decoding="async"
                      draggable={false}
                    />
                  ) : (
                    <div
                      className="core-member-photo-fallback"
                      aria-hidden="true"
                    >
                      {member.name?.trim().charAt(0)?.toUpperCase() || '?'}
                    </div>
                  )}

                  <div className="core-member-socials">
                    {member.instagramLink && (
                      <a
                        href={member.instagramLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label={`${member.name} on Instagram`}
                        tabIndex={isDuplicate ? -1 : undefined}
                      >
                        <i className="bi bi-instagram" aria-hidden="true" />
                      </a>
                    )}

                    {member.linkedinLink && (
                      <a
                        href={member.linkedinLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label={`${member.name} on LinkedIn`}
                        tabIndex={isDuplicate ? -1 : undefined}
                      >
                        <i className="bi bi-linkedin" aria-hidden="true" />
                      </a>
                    )}
                  </div>
                </div>

                <div className="core-member-info">
                  <h3>{member.name}</h3>
                  <p className="core-member-role">{member.role}</p>
                </div>
              </article>
            );
          })}
        </div>
      </div>

      <div className="core-team-footer">
        <Link to="/team" className="core-team-view-all">
          <span>Meet the entire team</span>
          <i className="bi bi-arrow-right" aria-hidden="true" />
        </Link>
      </div>
    </section>
  );
}

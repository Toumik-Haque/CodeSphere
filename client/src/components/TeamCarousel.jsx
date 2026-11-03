
import { useEffect, useRef, useState } from 'react';
import { apiRequest } from '../lib/api';
import '../css/CoreMembers.css';

export default function TeamCarousel() {
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isAutoScrolling, setIsAutoScrolling] = useState(true);

  const trackRef = useRef(null);
  const isPausedRef = useRef(false);

  // Load core team members.
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
        if (active) {
          setLoading(false);
        }
      }
    }

    loadMembers();

    return () => {
      active = false;
    };
  }, []);

  // Automatically scroll horizontally in a seamless continuous loop.
  useEffect(() => {
    const track = trackRef.current;

    if (!track || members.length < 2 || !isAutoScrolling) return;

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      return;
    }

    let animationFrame;
    let previousTime = 0;

    const speed = 50; // Pixels per second.

    const animate = (time) => {
      if (!previousTime) previousTime = time;

      const deltaTime = previousTime
        ? Math.min((time - previousTime) / 1000, 0.1)
        : 0;

      previousTime = time;

      if (!isPausedRef.current) {
        // Width of the original set of cards, including the gap.
        const loopWidth = track.scrollWidth / 2;

        if (loopWidth > 0) {
          track.scrollLeft += speed * deltaTime;

          // Seamlessly restart from the beginning of the duplicated set.
          if (track.scrollLeft >= loopWidth) {
            track.scrollLeft -= loopWidth;
          }
        }
      }

      animationFrame = requestAnimationFrame(animate);
    };

    animationFrame = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(animationFrame);
    };
  }, [members.length, isAutoScrolling]);

  // Manual carousel navigation.
  function scrollTrack(direction) {
    const track = trackRef.current;

    if (!track) return;

    const card = track.querySelector('.core-member-slide');
    const styles = window.getComputedStyle(track);
    const gap = parseFloat(styles.columnGap) || 20;

    const distance = card
      ? card.getBoundingClientRect().width + gap
      : track.clientWidth;

    const maxScroll = track.scrollWidth - track.clientWidth;

    const nextPosition = Math.max(
      0,
      Math.min(maxScroll, track.scrollLeft + direction * distance)
    );

    track.scrollTo({
      left: nextPosition,
      behavior: 'smooth',
    });
  }

  if (loading) {
    return (
      <section className="core-team-section" aria-busy="true">
        <div className="core-team-heading">
          <p className="core-team-eyebrow">
            <span className="core-team-eyebrow-line" />
            THE PEOPLE BEHIND
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
            <span className="core-team-eyebrow-line" />
            THE PEOPLE BEHIND
          </p>
          <h2>Meet Our Core Team</h2>
        </div>

        <p className="core-team-status">
          {error || 'Our team profiles will be available soon.'}
        </p>
      </section>
    );
  }

  return (
    <section
      className="core-team-section bg-info"
      aria-labelledby="core-team-title"
    >
      <div className="core-team-heading">
        <div>
          <p className="core-team-eyebrow">
            <span className="core-team-eyebrow-line" />
            THE PEOPLE BEHIND
          </p>

          <h2 id="core-team-title">
            Meet Our{' '}
            <span className="gold-text">Core Team.</span>
          </h2>

          <p className="core-team-description">
            The people bringing ideas to life and building our community.
          </p>
        </div>

        <div className="core-team-controls">
          <button
            type="button"
            className="core-team-arrow"
            onClick={() => {
              setIsAutoScrolling((current) => !current);
            }}
            aria-label={
              isAutoScrolling
                ? 'Pause automatic scrolling'
                : 'Resume automatic scrolling'
            }
            title={isAutoScrolling ? 'Pause scrolling' : 'Resume scrolling'}
          >
            <i
              className={`bi ${isAutoScrolling ? 'bi-pause-fill' : 'bi-play-fill'
                }`}
              aria-hidden="true"
            />
          </button>
        </div>
      </div>

      <div
        className="core-team-track"
        ref={trackRef}
        onMouseEnter={() => {
          isPausedRef.current = true;
        }}
        onMouseLeave={() => {
          isPausedRef.current = false;
        }}
        onFocusCapture={() => {
          isPausedRef.current = true;
        }}
        onBlurCapture={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget)) {
            isPausedRef.current = false;
          }
        }}
      >
        {[...members, ...members].map((member, index) => (
          <article
            className="core-member-slide"
            key={`${member._id}-${index}`}
            aria-hidden={index >= members.length ? 'true' : undefined}
          >
            <div className="core-member-photo-wrap">
              {member.image?.url ? (
                <img
                  className="core-member-photo"
                  src={member.image.url}
                  alt={index < members.length ? member.name : ''}
                  loading="lazy"
                />
              ) : (
                <div className="core-member-photo-fallback" aria-hidden="true">
                  {member.name?.trim().charAt(0)?.toUpperCase() || '?'}
                </div>
              )}

              <div className="core-member-socials">
                {member.linkedinLink && (
                  <a
                    href={member.linkedinLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={`${member.name} on LinkedIn`}
                    title="LinkedIn"
                    tabIndex={index >= members.length ? -1 : undefined}
                  >
                    <i className="bi bi-linkedin" aria-hidden="true" />
                  </a>
                )}

                {member.instagramLink && (
                  <a
                    href={member.instagramLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={`${member.name} on Instagram`}
                    title="Instagram"
                    tabIndex={index >= members.length ? -1 : undefined}
                  >
                    <i className="bi bi-instagram" aria-hidden="true" />
                  </a>
                )}

                {member.githubLink && (
                  <a
                    href={member.githubLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={`${member.name} on GitHub`}
                    title="GitHub"
                    tabIndex={index >= members.length ? -1 : undefined}
                  >
                    <i className="bi bi-github" aria-hidden="true" />
                  </a>
                )}
              </div>
            </div>

            <div className="core-member-info">
              <h3>{member.name}</h3>
              <p className="core-member-role">{member.role}</p>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiRequest } from '../lib/api';
import '../css/CoreMembers.css';

export default function TeamCarousel() {
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
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

  function scrollTrack(direction) {
    if (!trackRef.current) return;

    const track = trackRef.current;
    const card = track.querySelector('.core-member-slide');
    const gap = 20;
    const distance = card ? card.getBoundingClientRect().width + gap : track.clientWidth;

    track.scrollBy({
      left: direction * distance,
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
    <section className="core-team-section bg-info" aria-labelledby="core-team-title">
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
            onClick={() => scrollTrack(-1)}
            aria-label="Previous team members"
          >
            <i className="bi bi-arrow-left" aria-hidden="true" />
          </button>
          <button
            type="button"
            className="core-team-arrow"
            onClick={() => scrollTrack(1)}
            aria-label="Next team members"
          >
            <i className="bi bi-arrow-right" aria-hidden="true" />
          </button>
        </div>
      </div>

      <div className="core-team-track" ref={trackRef}>
        {members.map((member) => (
          <article className="core-member-slide" key={member._id}>

            <div className="core-member-photo-wrap">
              {member.image?.url ? (
                <img
                  className="core-member-photo"
                  src={member.image.url}
                  alt={member.name}
                  loading="lazy"
                />
              ) : (
                <div className="core-member-photo-fallback" aria-hidden="true">
                  {member.name?.trim().charAt(0)?.toUpperCase() || '?'}
                </div>
              )}

              <div className="core-member-socials">
                <a
                    href={member.instagram}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={`${member.name} on Instagram`}
                    title="Instagram"
                  >
                    <i className="bi bi-instagram" aria-hidden="true" />
                  </a>
                  <a
                    href={member.instagram}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={`${member.name} on Instagram`}
                    title="Instagram"
                  >
                    <i className="bi bi-linkedin" aria-hidden="true" />
                  </a>
                  {member.instagram && (
                  <a
                    href={member.instagram}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={`${member.name} on Instagram`}
                    title="Instagram"
                  >
                    <i className="bi bi-instagram" aria-hidden="true" />
                  </a>
                )}

                {member.linkedin && (
                  <a
                    href={member.linkedin}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={`${member.name} on LinkedIn`}
                    title="LinkedIn"
                  >
                    <i className="bi bi-linkedin" aria-hidden="true" />
                  </a>
                )}
              </div>
            </div>


            <div className="core-member-info">
              <h3>{member.name}</h3>
              <p className="core-member-role">{member.role}</p>

              {/* {member.link && (
                <a
                  className="core-member-link"
                  href={member.link}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Check out
                  <i className="bi bi-arrow-up-right" aria-hidden="true" />
                </a>
              )} */}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

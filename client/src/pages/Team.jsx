import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiRequest } from '../lib/api';
import '../css/CoreMembers.css';

export default function Team() {
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

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
          setError(err.message || 'Unable to load the team.');
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

  return (
    <main className="team-page">
      <header className="team-page-hero">
        <Link to="/" className="team-back-link">
          <i className="bi bi-arrow-left" aria-hidden="true" />
          Back to Home
        </Link>

        <p className="core-team-eyebrow">THE PEOPLE BEHIND CODESPHERE</p>
        <h1>Meet Our <span>Core Team</span></h1>
        <p className="team-page-intro">
          Meet the people who collaborate, create, and help our community grow.
        </p>
      </header>

      <section className="team-directory" aria-label="Core team members">
        {loading ? (
          <p className="core-team-status" aria-live="polite">
            Loading our team...
          </p>
        ) : error ? (
          <p className="team-error" role="alert">{error}</p>
        ) : members.length === 0 ? (
          <p className="core-team-status">
            Our team profiles will be available soon.
          </p>
        ) : (
          <div className="team-directory-grid">
            {members.map((member) => (
              <article className="team-directory-card" key={member._id}>
                <div className="team-directory-photo-wrap">
                  {member.image?.url ? (
                    <img
                      src={member.image.url}
                      alt={member.name}
                      className="team-directory-photo"
                      loading="lazy"
                    />
                  ) : (
                    <div
                      className="team-directory-photo-fallback"
                      aria-hidden="true"
                    >
                      {member.name?.trim().charAt(0)?.toUpperCase() || '?'}
                    </div>
                  )}
                </div>

                <div className="team-directory-info">
                  <h2>{member.name}</h2>
                  <p className="core-member-role">{member.role}</p>

                  {/* {member.link && (
                    <a
                      href={member.link}
                      className="core-member-link"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Supporting link
                      <i className="bi bi-arrow-up-right" aria-hidden="true" />
                    </a>
                  )} */}
                  <div className="core-member-socials">
                <a
                  href={member.linkedin}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={`${member.name} on LinkedIn`}
                  title="LinkedIn"
                >
                  <i className="bi bi-linkedin" aria-hidden="true" />
                </a>
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

                <a
                    href={member.instagram}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={`${member.name} on Instagram`}
                    title="Instagram"
                  >
                    <i className="bi bi-instagram" aria-hidden="true" />
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

                <a
                    href={member.github}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={`${member.name} on GitHub`}
                    title="GitHub"
                  >
                    <i className="bi bi-github" aria-hidden="true" />
                  </a>
                {member.github && (
                  <a
                    href={member.github}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={`${member.name} on GitHub`}
                    title="GitHub"
                  >
                    <i className="bi bi-github" aria-hidden="true" />
                  </a>
                )}
              </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}

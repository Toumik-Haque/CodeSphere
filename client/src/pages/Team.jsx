import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
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
    <>
      <Navbar />

      <main className="team-page">
        <div className='container'>
          <header className="team-page-hero">
            <p className="core-team-eyebrow">
              <span className="core-team-eyebrow-line" />
              THE PEOPLE BEHIND
            </p>
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
            )}
          </section>
        </div>
      </main>

      <Footer />
    </>
  );
}

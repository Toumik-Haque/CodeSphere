
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { apiRequest } from '../lib/api';
import { sortCoreMembers } from '../utils/coreMemberRoleOrder';
import '../css/CoreMembers.css';

function TeamMemberCard({ member }) {
  return (
    <article className="team-member-slide">
      <div className="team-member-photo-wrap">
        {member.image?.url ? (
          <img
            className="team-member-photo"
            src={member.image.url}
            alt={member.name}
            loading="lazy"
          />
        ) : (
          <div className="team-member-photo-fallback" aria-hidden="true">
            {member.name?.trim().charAt(0)?.toUpperCase() || '?'}
          </div>
        )}

        <div className="team-member-socials">
          {member.linkedinLink && (
            <a
              href={member.linkedinLink}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`${member.name} on LinkedIn`}
              title="LinkedIn"
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
            >
              <i className="bi bi-github" aria-hidden="true" />
            </a>
          )}
        </div>
      </div>

      <div className="team-member-info">
        <h3>{member.name}</h3>
        <p className="team-member-role">{member.role}</p>
      </div>
    </article>
  );
}

export default function Team() {
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;

    async function loadMembers() {
      try {
        const data = await apiRequest('/team-members');

        if (active) {
          const list = Array.isArray(data)
            ? data
            : Array.isArray(data?.members)
              ? data.members
              : [];

          setMembers(sortCoreMembers(list));
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

  // Faculty Coordinators only
  const facultyMembers = members.filter(
    (member) => member.role === 'Faculty Coordinator'
  );

  // Everyone except Faculty Coordinators
  const studentMembers = members.filter(
    (member) => member.role !== 'Faculty Coordinator'
  );

  return (
    <>
      <Navbar />

      <main className="team-page">
        <div className="container">
          <header className="team-page-hero">
            <p className="team-eyebrow">
              <span className="team-eyebrow-line" />
              THE PEOPLE BEHIND
            </p>

            <h1>
              Meet Our <span>Team</span>
            </h1>

            <p className="team-page-intro">
              Meet the people who collaborate, create, and help our community grow.
            </p>
          </header>

          <section className="team-directory" aria-label="Team members">
            {loading ? (
              <p className="team-status" aria-live="polite">
                Loading our team...
              </p>
            ) : error ? (
              <p className="team-error" role="alert">
                {error}
              </p>
            ) : members.length === 0 ? (
              <p className="team-status">
                Our team profiles will be available soon.
              </p>
            ) : (
              <>
                {/* Faculty Members Section */}
                {facultyMembers.length > 0 && (
                  <div className="team-category">
                    <h2 className="team-category-title">
                      Faculty Members
                    </h2>

                    <div className="team-directory-grid">
                      {facultyMembers.map((member) => (
                        <TeamMemberCard
                          key={member._id}
                          member={member}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {/* Student Members Section */}
                {studentMembers.length > 0 && (
                  <div className="team-category">
                    <h2 className="team-category-title">
                      Student Members
                    </h2>

                    <div className="team-directory-grid">
                      {studentMembers.map((member) => (
                        <TeamMemberCard
                          key={member._id}
                          member={member}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </section>
        </div>
      </main>

      <Footer />
    </>
  );
}

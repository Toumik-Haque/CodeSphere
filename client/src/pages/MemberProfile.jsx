import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { apiRequest } from '../lib/api';
import Navbar from '../components/Navbar';
import '../css/MemberProfile.css';

function getInitials(name = '') {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase();
}

function ProfileSection({ title, children }) {
  return (
    <section className="member-profile-section">
      <h3>{title}</h3>
      {children}
    </section>
  );
}

function TagList({ items }) {
  if (!items?.length) {
    return <p className="member-profile-empty">Nothing added yet.</p>;
  }

  return (
    <div className="member-profile-tags">
      {items.map((item, index) => (
        <span key={`${item}-${index}`}>{item}</span>
      ))}
    </div>
  );
}

export default function MemberProfile() {
  const { username } = useParams();

  const [member, setMember] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;

    const fetchMember = async () => {
      try {
        setLoading(true);
        setError('');
        setMember(null);

        const response = await apiRequest(
          `/users/profile/${encodeURIComponent(username)}`
        );

        if (active) {
          setMember(response.member);
        }
      } catch (err) {
        if (active) {
          setError(err.message || 'Unable to load this profile.');
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    fetchMember();

    return () => {
      active = false;
    };
  }, [username]);

  const openExternalLink = (url) => {
    if (!url) return null;

    const safeUrl = /^https?:\/\//i.test(url)
      ? url
      : `https://${url}`;

    return safeUrl;
  };

  return (
    <div className="member-profile-page">
      <Navbar />

      <main className="member-profile-container">
        <Link to="/dashboard" className="member-profile-back">
          ← Back to Dashboard
        </Link>

        {loading ? (
          <div className="member-profile-state">
            <div className="member-profile-spinner" />
            <p>Loading member profile...</p>
          </div>
        ) : error || !member ? (
          <div className="member-profile-state">
            <div className="member-profile-error-icon">!</div>
            <h2>Profile unavailable</h2>
            <p>
              {error ||
                'This profile does not exist or is not available to you.'}
            </p>
            <Link to="/dashboard" className="member-profile-home-button">
              Go to Dashboard
            </Link>
          </div>
        ) : (
          <>
            <section className="member-profile-card">
              <div className="member-profile-cover" />

              <div className="member-profile-header">
                <div className="member-profile-avatar">
                  {member.profileImage?.url ? (
                    <img
                      src={member.profileImage.url}
                      alt={member.name}
                    />
                  ) : (
                    <span>{getInitials(member.name)}</span>
                  )}
                </div>

                <div className="member-profile-identity">
                  <h1>{member.name}</h1>
                  <p className="member-profile-badge">@{member.username}</p>
                </div>
              </div>

              <div className="member-profile-content">
                <ProfileSection title="About me">
                  <p className="member-profile-bio">
                    {member.bio || 'This member has not added a bio yet.'}
                  </p>
                </ProfileSection>

                <ProfileSection title="Academic information">
                  <div className="member-profile-details">
                    <div>
                      <span>College / Institution</span>
                      <strong>{member.collegeName || 'Not added'}</strong>
                    </div>

                    <div>
                      <span>Year of study</span>
                      <strong>{member.yearOfStudy || 'Not added'}</strong>
                    </div>
                  </div>
                </ProfileSection>

                <ProfileSection title="Technical interests">
                  <TagList items={member.technicalInterests} />
                </ProfileSection>

                <ProfileSection title="Skills">
                  <TagList items={member.skills} />
                </ProfileSection>

                <ProfileSection title="Learning goals">
                  <TagList items={member.learningGoals} />
                </ProfileSection>

                <ProfileSection title="Connect">
                  <div className="member-profile-links">
                    {member.github && (
                      <a
                        href={openExternalLink(member.github)}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        GitHub ↗
                      </a>
                    )}

                    {member.linkedin && (
                      <a
                        href={openExternalLink(member.linkedin)}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        LinkedIn ↗
                      </a>
                    )}

                    {member.portfolio && (
                      <a
                        href={openExternalLink(member.portfolio)}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        Portfolio ↗
                      </a>
                    )}

                    {!member.github &&
                      !member.linkedin &&
                      !member.portfolio && (
                        <p className="member-profile-empty">
                          No professional links added yet.
                        </p>
                      )}
                  </div>
                </ProfileSection>
              </div>
            </section>
          </>
        )}
      </main>
    </div>
  );
}

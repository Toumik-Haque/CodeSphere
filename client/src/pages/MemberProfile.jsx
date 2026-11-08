import { useEffect, useState } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
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

export default function MemberProfile({
  profileUsername,
  embedded = false,
  onReturn,
}) {
  const { username: routeUsername } = useParams();
  const location = useLocation();
  const username = profileUsername || routeUsername;

  const [member, setMember] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [shareMessage, setShareMessage] = useState('');
  const profileMatchesRoute =
    member?.username?.toLowerCase() === username?.toLowerCase();

  useEffect(() => {
    let active = true;
    const controller = new AbortController();

    const fetchMember = async () => {
      try {
        setLoading(true);
        setError('');
        setMember(null);

        const response = await apiRequest(
          `/users/profile/${encodeURIComponent(username)}`,
          { signal: controller.signal }
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
      controller.abort();
    };
  }, [username]);

  const openExternalLink = (url) => {
    if (!url) return null;

    const safeUrl = /^https?:\/\//i.test(url)
      ? url
      : `https://${url}`;

    return safeUrl;
  };

  const shareProfile = async () => {
    const profileUrl = `${window.location.origin}/user/${encodeURIComponent(username)}`;

    try {
      if (navigator.share) {
        await navigator.share({
          title: `${member.name} on CodeSphere`,
          text: `View ${member.name}'s CodeSphere profile`,
          url: profileUrl,
        });
        setShareMessage('Profile shared.');
      } else if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(profileUrl);
        setShareMessage('Profile link copied.');
      } else {
        window.prompt('Copy this profile link:', profileUrl);
        setShareMessage('Copy the profile link to share it.');
      }
    } catch (shareError) {
      if (shareError.name !== 'AbortError') {
        setShareMessage('Unable to share this profile. Please try again.');
      }
    }
  };

  return (
    <div className={`member-profile-page${embedded ? ' dashboard-member-profile-embedded' : ''}`}>
      {!embedded && <Navbar />}

      <main className="member-profile-container">
        {!embedded && (
          <Link
            to={
              location.state?.from === '/user/discover'
                ? '/user/discover'
                : '/user'
            }
            className="member-profile-back"
          >
            <i
              className={`bi ${
                location.state?.from === '/user/discover'
                  ? 'bi-arrow-left'
                  : 'bi-grid-1x2'
              }`}
              aria-hidden="true"
            />
            {location.state?.from === '/user/discover'
              ? 'Back to Search'
              : 'Back to Dashboard'}
          </Link>
        )}

        {loading || (!error && !profileMatchesRoute) ? (
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
            {embedded && onReturn ? (
              <button
                type="button"
                className="member-profile-home-button"
                onClick={onReturn}
              >
                Back to my profile
              </button>
            ) : (
              <Link
                to={
                  location.state?.from === '/user/discover'
                    ? '/user/discover'
                    : '/user'
                }
                className="member-profile-home-button"
              >
                {location.state?.from === '/user/discover'
                  ? 'Back to Search'
                  : 'Go to Dashboard'}
              </Link>
            )}
          </div>
        ) : (
          <>
            <section className="member-profile-card">
              <div className="member-profile-header">
                <div className="member-profile-avatar">
                  {(member.profileImage?.url || member.avatarUrl) ? (
                    <img
                      src={member.profileImage?.url || member.avatarUrl}
                      alt={member.name}
                    />
                  ) : (
                    <span>{getInitials(member.name)}</span>
                  )}
                </div>

                <div className="member-profile-identity">
                  <h1>{member.name}</h1>
                  <p className="member-profile-badge">@{member.username}</p>
                  {(member.collegeName || member.degree) && (
                    <div className="member-profile-meta">
                      {member.collegeName && (
                        <span>
                          <i className="bi bi-mortarboard" aria-hidden="true" />
                          {member.collegeName}
                        </span>
                      )}
                      {member.degree && (
                        <span>
                          <i className="bi bi-book" aria-hidden="true" />
                          {member.degree}
                        </span>
                      )}
                    </div>
                  )}
                </div>
                <div className="member-profile-share">
                  <button
                    className="member-profile-share-button"
                    type="button"
                    onClick={shareProfile}
                    aria-label={`Share ${member.name}'s public profile`}
                  >
                    <i className="bi bi-share" aria-hidden="true" />
                    <span>Share profile</span>
                  </button>
                  {shareMessage && (
                    <span className="member-profile-share-message" role="status">
                      {shareMessage}
                    </span>
                  )}
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
                      <span>Degree</span>
                      <strong>{member.degree || 'Not added'}</strong>
                    </div>

                    <div>
                      <span>Department / Branch</span>
                      <strong>{member.department || 'Not added'}</strong>
                    </div>

                    <div>
                      <span>Year of study</span>
                      <strong>{member.yearOfStudy || 'Not added'}</strong>
                    </div>

                    <div>
                      <span>Expected graduation</span>
                      <strong>{member.graduationYear || 'Not added'}</strong>
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

                {member.codingProfiles?.length > 0 && (
                  <ProfileSection title="Coding profiles">
                    <div className="member-profile-links">
                      {member.codingProfiles.map((profile) => (
                        <a
                          key={`${profile.platform}-${profile.url}`}
                          href={openExternalLink(profile.url)}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          {profile.platform} ↗
                        </a>
                      ))}
                    </div>
                  </ProfileSection>
                )}

                {member.projects?.length > 0 && (
                  <ProfileSection title="Projects">
                    <div className="member-profile-projects">
                      {member.projects.map((project) => (
                        <article
                          className="member-profile-project"
                          key={project._id}
                        >
                          <h4>{project.title}</h4>
                          <p>{project.description}</p>
                          {project.technologies?.length > 0 && (
                            <TagList items={project.technologies} />
                          )}
                          <div className="member-profile-links">
                            {project.githubUrl && (
                              <a
                                href={openExternalLink(project.githubUrl)}
                                target="_blank"
                                rel="noopener noreferrer"
                              >
                                Source code ↗
                              </a>
                            )}
                            {project.liveUrl && (
                              <a
                                href={openExternalLink(project.liveUrl)}
                                target="_blank"
                                rel="noopener noreferrer"
                              >
                                Live demo ↗
                              </a>
                            )}
                          </div>
                        </article>
                      ))}
                    </div>
                  </ProfileSection>
                )}

                {member.achievements?.length > 0 && (
                  <ProfileSection title="Achievements & certifications">
                    <div className="member-profile-projects">
                      {member.achievements.map((achievement, index) => (
                        <article
                          className="member-profile-project"
                          key={`${achievement.title}-${index}`}
                        >
                          <h4>{achievement.title}</h4>
                          <p>
                            {[achievement.category, achievement.issuer, achievement.year]
                              .filter(Boolean)
                              .join(' · ') || 'Achievement'}
                          </p>
                          {achievement.link && (
                            <a
                              href={openExternalLink(achievement.link)}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              View proof ↗
                            </a>
                          )}
                        </article>
                      ))}
                    </div>
                  </ProfileSection>
                )}

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

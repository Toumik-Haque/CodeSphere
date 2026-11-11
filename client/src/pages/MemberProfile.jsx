import { useEffect, useState } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import { apiRequest } from '../lib/api';
import Navbar from '../components/Navbar';
import BadgeStrip from '../components/BadgeStrip';
import CodingStats from '../components/CodingStats';
import '../css/MemberProfile.css';

const CODING_ICONS = {
  GitHub: 'bi-github',
  LeetCode: 'bi-code-square',
  Codeforces: 'bi-bar-chart-line',
  CodeChef: 'bi-cup-hot',
  AtCoder: 'bi-trophy',
  GeeksforGeeks: 'bi-journal-code',
  HackerRank: 'bi-award',
};

function getInitials(name = '') {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase();
}

function skillLevelClass(level = '') {
  const key = level.toLowerCase();
  if (key.startsWith('begin')) return 'is-beginner';
  if (key.startsWith('adv')) return 'is-advanced';
  if (key.startsWith('exp')) return 'is-expert';
  return 'is-intermediate';
}

function openExternalLink(url) {
  if (!url) return '';
  return /^https?:\/\//i.test(url) ? url : `https://${url}`;
}

function Section({ title, icon, className = '', children }) {
  return (
    <section className={`member-profile-section ${className}`.trim()}>
      <header className="member-profile-section-head">
        <span className="member-profile-section-icon" aria-hidden="true">
          <i className={`bi ${icon}`} />
        </span>
        <h2>{title}</h2>
      </header>
      {children}
    </section>
  );
}

function ChipList({ items, emptyText = 'Nothing added yet.' }) {
  if (!items?.length) {
    return <p className="member-profile-empty">{emptyText}</p>;
  }

  return (
    <div className="member-profile-chips">
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

  const joinedDate = member?.createdAt
    ? new Date(member.createdAt).toLocaleDateString('en-IN', {
        month: 'long',
        year: 'numeric',
      })
    : '';

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

  const skills = member
    ? (member.skillDetails?.length
        ? member.skillDetails.map((skill) =>
            typeof skill === 'string' ? { name: skill, level: '' } : skill
          )
        : (member.skills || []).map((skill) =>
            typeof skill === 'string' ? { name: skill, level: '' } : skill
          )
      ).filter((skill) => skill?.name)
    : [];

  const codingProfiles = member?.codingProfiles || [];
  const projects = member?.projects || [];
  const achievements = member?.achievements || [];
  const socialLinks = member
    ? [
        member.github && { key: 'github', href: member.github, icon: 'bi-github', label: 'GitHub' },
        member.linkedin && { key: 'linkedin', href: member.linkedin, icon: 'bi-linkedin', label: 'LinkedIn' },
        member.portfolio && { key: 'portfolio', href: member.portfolio, icon: 'bi-globe2', label: 'Portfolio' },
      ].filter(Boolean)
    : [];

  const backTarget =
    location.state?.from === '/user/discover' ? '/user/discover' : '/user';
  const backLabel =
    location.state?.from === '/user/discover' ? 'Back to Search' : 'Back to Dashboard';

  return (
    <div className={`member-profile-page${embedded ? ' dashboard-member-profile-embedded' : ''}`}>
      {!embedded && <Navbar />}

      <main className="member-profile-container">
        {!embedded && (
          <Link to={backTarget} className="member-profile-back">
            <i
              className={`bi ${
                location.state?.from === '/user/discover'
                  ? 'bi-arrow-left'
                  : 'bi-grid-1x2'
              }`}
              aria-hidden="true"
            />
            {backLabel}
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
              <Link to={backTarget} className="member-profile-home-button">
                {backLabel}
              </Link>
            )}
          </div>
        ) : (
          <>
            <section className="member-profile-hero">
              <div className="member-profile-hero-body">
                <div className="member-profile-avatar">
                  {member.profileImage?.url ? (
                    <img src={member.profileImage.url} alt={member.name} />
                  ) : (
                    <span>{getInitials(member.name)}</span>
                  )}
                </div>

                <div className="member-profile-identity">
                  <h1>{member.name}</h1>
                  <div className="member-profile-handle-row">
                    <span className="member-profile-handle">
                      @{member.username}
                    </span>
                    {joinedDate && (
                      <span className="member-profile-joined">
                        <i className="bi bi-calendar3" aria-hidden="true" />
                        Joined {joinedDate}
                      </span>
                    )}
                  </div>
                  {[member.degree, member.department].filter(Boolean).length > 0 && (
                    <p className="member-profile-headline">
                      {[member.degree, member.department].filter(Boolean).join(' · ')}
                    </p>
                  )}
                </div>

                <div className="member-profile-hero-actions">
                  {socialLinks.length > 0 && (
                    <div className="member-profile-social">
                      {socialLinks.map((link) => (
                        <a
                          key={link.key}
                          href={openExternalLink(link.href)}
                          target="_blank"
                          rel="noopener noreferrer"
                          aria-label={link.label}
                          title={link.label}
                          className="member-profile-social-link"
                        >
                          <i className={`bi ${link.icon}`} aria-hidden="true" />
                        </a>
                      ))}
                    </div>
                  )}

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

              <div className="member-profile-stats">
                <div>
                  <strong>{projects.length}</strong>
                  <span>Projects</span>
                </div>
                <div>
                  <strong>{skills.length}</strong>
                  <span>Skills</span>
                </div>
                <div>
                  <strong>{achievements.length}</strong>
                  <span>Achievements</span>
                </div>
                <div>
                  <strong>{codingProfiles.length}</strong>
                  <span>Coding profiles</span>
                </div>
              </div>
            </section>

            <div className="member-profile-layout">
              <div className="member-profile-main">
                <Section title="About" icon="bi-person-lines-fill">
                  <p className="member-profile-bio">
                    {member.bio || 'This member has not added a bio yet.'}
                  </p>
                </Section>

                <CodingStats username={member.username} />

                {skills.length > 0 && (
                  <Section title="Skills" icon="bi-stars">
                    <div className="member-profile-skill-list">
                      {skills.map((skill, index) => (
                        <span
                          className={`member-profile-skill ${skillLevelClass(skill.level)}`}
                          key={`${skill.name}-${index}`}
                          title={skill.level ? `${skill.name} · ${skill.level}` : skill.name}
                        >
                          <i className="member-profile-skill-dot" aria-hidden="true" />
                          <span className="member-profile-skill-name">{skill.name}</span>
                          {skill.level && (
                            <span className="member-profile-skill-level">{skill.level}</span>
                          )}
                        </span>
                      ))}
                    </div>
                  </Section>
                )}

                <Section title="Academic information" icon="bi-mortarboard-fill">
                  <div className="member-profile-facts">
                    <div className="member-profile-fact">
                      <i className="bi bi-building" aria-hidden="true" />
                      <div>
                        <span>College / Institution</span>
                        <strong>{member.collegeName || 'Not added'}</strong>
                      </div>
                    </div>

                    <div className="member-profile-fact">
                      <i className="bi bi-book" aria-hidden="true" />
                      <div>
                        <span>Degree</span>
                        <strong>{member.degree || 'Not added'}</strong>
                      </div>
                    </div>

                    <div className="member-profile-fact">
                      <i className="bi bi-diagram-3" aria-hidden="true" />
                      <div>
                        <span>Department / Branch</span>
                        <strong>{member.department || 'Not added'}</strong>
                      </div>
                    </div>

                    <div className="member-profile-fact">
                      <i className="bi bi-calendar-check" aria-hidden="true" />
                      <div>
                        <span>Year of study</span>
                        <strong>{member.yearOfStudy || 'Not added'}</strong>
                      </div>
                    </div>

                    <div className="member-profile-fact">
                      <i className="bi bi-award" aria-hidden="true" />
                      <div>
                        <span>Expected graduation</span>
                        <strong>{member.graduationYear || 'Not added'}</strong>
                      </div>
                    </div>
                  </div>
                </Section>

                {projects.length > 0 && (
                  <Section title="Projects" icon="bi-kanban">
                    <div className="member-profile-project-grid">
                      {projects.map((project) => (
                        <article className="member-profile-project" key={project._id}>
                          <div className="member-profile-project-top">
                            <span className="member-profile-project-icon" aria-hidden="true">
                              <i className="bi bi-code-slash" />
                            </span>
                            {project.type && (
                              <span className="member-profile-project-type">{project.type}</span>
                            )}
                          </div>

                          <h4>{project.title}</h4>
                          {project.description && <p>{project.description}</p>}

                          {project.technologies?.length > 0 && (
                            <ChipList items={project.technologies} />
                          )}

                          {(project.githubUrl || project.liveUrl) && (
                            <div className="member-profile-project-links">
                              {project.githubUrl && (
                                <a
                                  href={openExternalLink(project.githubUrl)}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                >
                                  <i className="bi bi-github" aria-hidden="true" /> Source
                                </a>
                              )}
                              {project.liveUrl && (
                                <a
                                  href={openExternalLink(project.liveUrl)}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                >
                                  <i className="bi bi-box-arrow-up-right" aria-hidden="true" /> Live
                                </a>
                              )}
                            </div>
                          )}
                        </article>
                      ))}
                    </div>
                  </Section>
                )}

                {achievements.length > 0 && (
                  <Section title="Achievements & certifications" icon="bi-trophy-fill">
                    <div className="member-profile-achievement-list">
                      {achievements.map((achievement, index) => (
                        <article
                          className="member-profile-achievement"
                          key={`${achievement.title}-${index}`}
                        >
                          <span className="member-profile-achievement-icon" aria-hidden="true">
                            <i className="bi bi-trophy-fill" />
                          </span>
                          <div className="member-profile-achievement-copy">
                            <h4>{achievement.title}</h4>
                            <p>
                              {[achievement.category, achievement.issuer, achievement.year]
                                .filter(Boolean)
                                .join(' · ') || 'Achievement'}
                            </p>
                          </div>
                          {achievement.link && (
                            <a
                              className="member-profile-achievement-link"
                              href={openExternalLink(achievement.link)}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              View <i className="bi bi-arrow-up-right" aria-hidden="true" />
                            </a>
                          )}
                        </article>
                      ))}
                    </div>
                  </Section>
                )}
              </div>

              <aside className="member-profile-rail">
                <section className="member-profile-section member-profile-badge-card">
                  <BadgeStrip username={member.username} />
                </section>

                <Section title="Connect" icon="bi-link-45deg">
                  <div className="member-profile-link-list">
                    {socialLinks.map((link) => (
                      <a
                        key={link.key}
                        href={openExternalLink(link.href)}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <i className={`bi ${link.icon}`} aria-hidden="true" />
                        <span>{link.label}</span>
                        <i className="bi bi-arrow-up-right" aria-hidden="true" />
                      </a>
                    ))}

                    {codingProfiles.map((profile) => (
                      <a
                        key={`${profile.platform}-${profile.url}`}
                        href={openExternalLink(profile.url)}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <i
                          className={`bi ${
                            CODING_ICONS[profile.platform] || 'bi-code-slash'
                          }`}
                          aria-hidden="true"
                        />
                        <span>{profile.platform}</span>
                        <i className="bi bi-arrow-up-right" aria-hidden="true" />
                      </a>
                    ))}

                    {socialLinks.length === 0 && codingProfiles.length === 0 && (
                      <p className="member-profile-empty">
                        No professional links added yet.
                      </p>
                    )}
                  </div>
                </Section>

                {member.technicalInterests?.length > 0 && (
                  <Section title="Technical interests" icon="bi-lightbulb">
                    <ChipList items={member.technicalInterests} />
                  </Section>
                )}

                {member.learningGoals?.length > 0 && (
                  <Section title="Learning goals" icon="bi-bullseye">
                    <ChipList items={member.learningGoals} />
                  </Section>
                )}
              </aside>
            </div>
          </>
        )}
      </main>
    </div>
  );
}

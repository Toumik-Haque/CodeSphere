import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiRequest } from '../lib/api';
import '../css/TeamPage.css';

const socialPlatforms = [
  { key: 'linkedin', label: 'LinkedIn', icon: 'bi-linkedin' },
  { key: 'github', label: 'GitHub', icon: 'bi-github' },
  { key: 'instagram', label: 'Instagram', icon: 'bi-instagram' },
];

// Temporary mock data for frontend development.
// Real API data will be used whenever the request succeeds.
const MOCK_TEAM_MEMBERS = [
  {
    id: 'mock-1',
    name: 'Arnab Kr Dey',
    role: 'Core Team Member',
    order: 1,
    imageUrl: '',
  },
  {
    id: 'mock-2',
    name: 'Sayan Singha',
    role: 'UI/UX Lead',
    order: 2,
    imageUrl: '',
  },
  {
    id: 'mock-3',
    name: 'Toumik Haq',
    role: 'Frontend Lead',
    order: 3,
    imageUrl: '',
  },
  {
    id: 'mock-4',
    name: 'Saikat Tunga',
    role: 'Core Team Member',
    order: 4,
    imageUrl: '',
  },
  {
    id: 'mock-5',
    name: 'Sovan Rajbanshi',
    role: 'Core Team Member',
    order: 5,
    imageUrl: '',
  },
  {
    id: 'mock-6',
    name: 'Soumitra Paul',
    role: 'Core Team Member',
    order: 6,
    imageUrl: '',
  },
  {
    id: 'mock-7',
    name: 'Subharanjjar Pramanik',
    role: 'Core Team Member',
    order: 7,
    imageUrl: '',
  },
  {
    id: 'mock-8',
    name: 'Sohini Paul',
    role: 'Core Team Member',
    order: 8,
    imageUrl: '',
  },
];
  

function getSocialUrl(member, platform) {
  const value = member.socials?.[platform] ?? member[platform] ?? '';

  if (typeof value !== 'string' || !value.trim()) return '';

  try {
    const url = new URL(value.trim());
    return ['https:', 'http:'].includes(url.protocol) ? url.href : '';
  } catch {
    return '';
  }
}

function getMemberImage(member) {
  if (typeof member.image === 'string') return member.image;
  return member.image?.url || member.imageUrl || '';
}

function SocialLinks({ member }) {
  return (
    <nav
      className="team-page-socials"
      aria-label={`${member.name} social profiles`}
    >
      {socialPlatforms.map((platform) => {
        const url = getSocialUrl(member, platform.key);

        return url ? (
          <a
            key={platform.key}
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`${member.name} on ${platform.label}`}
            title={platform.label}
          >
            <i className={`bi ${platform.icon}`} aria-hidden="true" />
          </a>
        ) : (
          <span
            key={platform.key}
            className="team-social-unavailable"
            aria-label={`${platform.label} profile not added`}
            title={`${platform.label} profile not added`}
          >
            <i className={`bi ${platform.icon}`} aria-hidden="true" />
          </span>
        );
      })}
    </nav>
  );
}

function ContactSection() {
  const [form, setForm] = useState({
    name: '',
    email: '',
    message: '',
  });

  const [status, setStatus] = useState('');

  function handleChange(event) {
    const { name, value } = event.target;

    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));

    setStatus('');
  }

  function handleSubmit(event) {
    event.preventDefault();

    setStatus(
      'The form is ready, but message delivery needs a backend or email service.'
    );
  }

  return (
    <section className="team-contact" id="contact">
      <div className="team-contact-inner">
        <div className="team-contact-copy">
          <p className="team-kicker">LET'S CONNECT</p>

          <h2>
            Have an idea?
            <br />
            <span>Let's build it.</span>
          </h2>

          <p>
            Want to collaborate, organize an event, or become part of
            CodeSphere? Tell us what you have in mind.
          </p>

          <div className="team-contact-note">
            <i className="bi bi-code-slash" aria-hidden="true" />
            <span>Ideas become better when we build together.</span>
          </div>
        </div>

        <form className="team-contact-form" onSubmit={handleSubmit}>
          <p className="team-contact-form-heading">Send us a message</p>

          <label htmlFor="team-contact-name">Name</label>
          <input
            id="team-contact-name"
            name="name"
            type="text"
            placeholder="Enter your name"
            autoComplete="name"
            value={form.name}
            onChange={handleChange}
            required
          />

          <label htmlFor="team-contact-email">Email ID</label>
          <input
            id="team-contact-email"
            name="email"
            type="email"
            placeholder="you@example.com"
            autoComplete="email"
            value={form.email}
            onChange={handleChange}
            required
          />

          <label htmlFor="team-contact-message">Your Message</label>
          <textarea
            id="team-contact-message"
            name="message"
            rows={5}
            placeholder="Tell us what you have in mind..."
            value={form.message}
            onChange={handleChange}
            required
          />

          <button className="team-contact-submit" type="submit">
            Send Message
            <i className="bi bi-arrow-up-right" aria-hidden="true" />
          </button>

          {status && (
            <p className="team-contact-status" role="status">
              {status}
            </p>
          )}
        </form>
      </div>
    </section>
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
        const data = await apiRequest('/core-members');

        if (!active) return;

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

        setError('');
      } catch (err) {
        if (active) {
          // Use mock profiles only when the API request fails.
          setMembers(MOCK_TEAM_MEMBERS);
          setError('');

          console.warn(
            'Team API unavailable. Using temporary mock data.',
            err
          );
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
      <div className="team-page-background" aria-hidden="true">
        <span className="team-code team-code-one">{'{ }'}</span>
        <span className="team-code team-code-two">{'</>'}</span>
        <span className="team-code team-code-three">{'01'}</span>
        <span className="team-code team-code-four">{'&&'}</span>
      </div>

      <section className="team-page-hero">
        <div className="team-page-hero-inner">
          <Link to="/" className="team-back-link">
            <i className="bi bi-arrow-left" aria-hidden="true" />
            Back to Home
          </Link>

          <p className="team-kicker">THE PEOPLE BEHIND CODESPHERE</p>

          <h1>
            Meet the Minds
            <br />
            Behind the <span>Code.</span>
          </h1>

          <p className="team-page-intro">
            Developers, problem-solvers, and innovators learning,
            creating, and building our coding community together.
          </p>

          <div className="team-hero-caption">
            <span />
            PEOPLE. IDEAS. CODE.
          </div>
        </div>
      </section>

      <section
        className="team-directory"
        id="team-members"
        aria-label="Core team members"
      >
        {loading ? (
          <p className="team-page-status" aria-live="polite">
            Loading our team...
          </p>
        ) : error ? (
          <p className="team-page-error" role="alert">
            {error}
          </p>
        ) : members.length === 0 ? (
          <p className="team-page-status">
            Our team profiles will be available soon.
          </p>
        ) : (
          <div className="team-directory-grid">
            {members.map((member, index) => {
              const image = getMemberImage(member);

              return (
                <article
                  className="team-directory-card"
                  key={member._id || member.id || member.name || index}
                >
                  <div className="team-directory-photo-wrap">
                    {image ? (
                      <img
                        src={image}
                        alt={`Portrait of ${member.name || 'CodeSphere team member'}`}
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
                    <span className="team-photo-corner" aria-hidden="true" />
                  </div>

                  <div className="team-directory-info">
                    <p className="team-card-kicker">CODESPHERE · TEAM</p>
                    <h3>{member.name || 'Team Member'}</h3>
                    <p className="team-member-role">
                      {member.role || 'Core Team Member'}
                    </p>

                    <SocialLinks member={member} />
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      <ContactSection />

      <footer className="team-page-footer">
        <Link to="/" className="team-footer-brand">
          <i className="bi bi-code-slash" aria-hidden="true" />
          CodeSphere
        </Link>

        <p>Built with curiosity. Driven by code.</p>

        <a href="#team-members">Back to team ↑</a>
      </footer>
    </main>
  );
}
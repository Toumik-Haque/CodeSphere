
import React from 'react';
import { Link } from 'react-router-dom';
import '../css/Hero.css';

const socialLinks = [
  {
    name: 'LinkedIn',
    icon: 'bi-linkedin',
    url: 'https://www.linkedin.com/company/codesphereagemc/',
  },
  {
    name: 'Instagram',
    icon: 'bi-instagram',
    url: 'https://www.instagram.com/codesphereagemc/',
  },
  {
    name: 'GitHub',
    icon: 'bi-github',
    url: 'https://github.com/codesphere-agemc',
  },
];

const Hero = () => {
  return (
    <section className="hero-section" id="home">
      <div className="container hero-container">
        <div className="hero-content">
          <div className="hero-eyebrow">
            <span>OFFICIAL CODING COMMUNITY OF AGEMC</span>
            <i
              className="bi bi-patch-check-fill verify"
              style={{ fontSize: '1rem' }}
            />
          </div>

          <h1 className="hero-title">
            Where Ideas
            <br />
            Become
            <span> </span>
            <span className="hero-title-highlight">
              Innovation.
            </span>
          </h1>

          <p className="hero-description">
            A community of curious minds, passionate developers, and
            future innovators. Learn new technologies, build real-world
            projects, and create something extraordinary together.
          </p>

          <div className="hero-actions">
            <a
              className="hero-btn hero-btn-primary"
              href="#events"
            >
              <i className="bi bi-calendar-event" aria-hidden="true" />
              Explore Events
              <i className="bi bi-arrow-up-right" aria-hidden="true" />
            </a>

            <Link
              className="hero-btn hero-btn-secondary"
              to="/open-source"
            >
              <i className="bi bi-code-slash" aria-hidden="true" />
              Contribute to Open Source
              <i className="bi bi-arrow-up-right" aria-hidden="true" />
            </Link>
          </div>

          <div className="hero-socials" aria-label="Follow CodeSphere">
            <span className="hero-socials-label">FOLLOW US</span>

            {socialLinks.map((social) => (
              <a
                key={social.name}
                href={social.url}
                className="hero-social-link"
                target="_blank"
                rel="noopener noreferrer"
                aria-label={social.name}
              >
                <i className={`bi ${social.icon}`} aria-hidden="true" />
              </a>
            ))}
          </div>
        </div>

        <a
          className="hero-scroll-indicator"
          href="#about"
          aria-label="Scroll to Events section"
        >
          <span>SCROLL TO EXPLORE</span>
          <i className="bi bi-arrow-down" aria-hidden="true" />
        </a>
      </div>
    </section>
  );
};

export default Hero;

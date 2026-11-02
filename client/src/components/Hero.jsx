import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import '../css/Hero.css';

const Hero = () => {
  return (
    <section className="hero-section" id="home">

      {/* Hero content */}
      <div className="container hero-container">
        <div className="hero-content">
          <div className="hero-eyebrow">
            <span>OFFICIAL CODING COMMUNITY OF AGEMC</span>
            <i className="bi bi-patch-check-fill verify" style={{ fontSize: '1rem' }} />
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
            <Link className="hero-btn hero-btn-primary" to="/register">
              Let's Start Now
              <i
                className="bi bi-arrow-up-right"
                aria-hidden="true"
              />
            </Link>

            <a
              className="hero-btn hero-btn-secondary"
              href="#events"
            >
              <i className="bi bi-code-slash" aria-hidden="true" />
              Explore Events
            </a>
          </div>

          {/* Social media links */}
          <div className="hero-socials" aria-label="Follow CodeSphere">
            <span className="hero-socials-label">FOLLOW US</span>

            <a
              href="https://github.com/YOUR-USERNAME"
              className="hero-social-link"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="GitHub"
            >
              <i className="bi bi-github" aria-hidden="true" />
            </a>

            <a
              href="https://www.linkedin.com/company/YOUR-PAGE"
              className="hero-social-link"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="LinkedIn"
            >
              <i className="bi bi-linkedin" aria-hidden="true" />
            </a>

            <a
              href="https://www.instagram.com/YOUR-USERNAME"
              className="hero-social-link"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Instagram"
            >
              <i className="bi bi-instagram" aria-hidden="true" />
            </a>
          </div>


        </div>

        {/* Bottom scroll indicator */}
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

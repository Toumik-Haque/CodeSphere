import React from 'react';
import campusVideo from '../assets/campusVideo.mp4';
import '../css/Hero.css';

const Hero = () => {
  return (
    <section className="hero-section" id="home">
      {/* Campus video background */}
      <div className="hero-video-wrapper">
        <video
          className="hero-video"
          autoPlay
          muted
          loop
          playsInline
          preload="metadata"
          aria-hidden="true"
        >
          <source src={campusVideo} type="video/mp4" />
        </video>
      </div>

      {/* Dark overlays */}
      <div className="hero-overlay" />
      <div className="hero-glow hero-glow-one" />
      <div className="hero-glow hero-glow-two" />

      {/* Hero content */}
      <div className="container hero-container">
        <div className="hero-content">
          <div className="hero-eyebrow">
            <span>OFFICIAL CODING CLUB OF AGEMC</span>
            <i className="bi bi-patch-check-fill" style={{ fontSize: '1rem'}}/>
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
            <a className="hero-btn hero-btn-primary" href="#join">
              Join CodeSphere
              <i
                className="bi bi-arrow-up-right"
                aria-hidden="true"
              />
            </a>

            <a
              className="hero-btn hero-btn-secondary"
              href="#events"
            >
              <i className="bi bi-code-slash" aria-hidden="true" />
              Explore Events
            </a>
          </div>

          {/* Community highlights */}
          <div className="hero-highlights">
            <div className="hero-highlight-item">
              <i className="bi bi-code-square" aria-hidden="true" />
              <span>Build Together</span>
            </div>

            <span className="hero-highlight-divider" />

            <div className="hero-highlight-item">
              <i className="bi bi-lightbulb" aria-hidden="true" />
              <span>Learn Together</span>
            </div>

            <span className="hero-highlight-divider" />

            <div className="hero-highlight-item">
              <i className="bi bi-rocket-takeoff" aria-hidden="true" />
              <span>Grow Together</span>
            </div>
          </div>
        </div>

        {/* Bottom scroll indicator */}
        <a
          className="hero-scroll-indicator"
          href="#events"
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

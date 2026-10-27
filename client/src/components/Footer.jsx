import React from 'react';
import logo from '../assets/codesphere-logo-light.svg';
import '../css/Footer.css';

const Footer = () => {
  return (
    <footer className="codesphere-footer">
      <div className="container">
        <div className="footer-main">
          <div className="footer-branding">
            <a href="#home" className="footer-brand">
              <img src={logo} alt="CodeSphere logo" />
              <span>Code<span className="gold-text">Sphere</span></span>
            </a>

            <p className="footer-tagline">
              Learn together. Build together. Grow together.
            </p>
          </div>

          <nav className="footer-links" aria-label="Footer navigation">
            <a href="/">Home</a>
            <a href="/events">Events</a>
            <a href="/#join">Join Us</a>
            <a href="/#about">About</a>
          </nav>

          <div className="footer-socials">
            <a href="http://" target="_blank" rel="noopener noreferrer" className='social-icon-btn'>
              <i className="bi bi-linkedin" aria-hidden="true" />
            </a>

            <a href="http://" target="_blank" rel="noopener noreferrer" className='social-icon-btn'>
              <i className="bi bi-instagram" aria-hidden="true" />
            </a>

            <a href="http://" target="_blank" rel="noopener noreferrer" className='social-icon-btn'>
              <i className="bi bi-github" aria-hidden="true" />
            </a>
          </div>
        </div>

        <div className="footer-bottom">
          <span>
            © {new Date().getFullYear()} CodeSphere. All rights reserved.
          </span>

          <a
            href="https://chat.whatsapp.com/FDGLH2yMpFuDJJBx448afz"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Join CodeSphere on WhatsApp"
          >
            <i className="bi bi-whatsapp" aria-hidden="true" />
            <span>Join our community</span>
          </a>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
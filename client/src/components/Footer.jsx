
import React from 'react';
import { Link } from 'react-router-dom';
import logo from '../assets/brand-dark.png';
import '../css/Footer.css';

const navLinks = [
  { label: 'Home', path: '/' },
  { label: 'Events', path: '/events' },
  { label: 'Materials', path: '/materials' },
  { label: 'Team', path: '/team' },
  { label: 'Contact Us', path: '/contact' },
];

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

const WHATSAPP_LINK = 'https://chat.whatsapp.com/FDGLH2yMpFuDJJBx448afz';
const CONTACT_LOCATION = 'Alipurduar Government Engineering and Management College, West Bengal, 736202';

const mapUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
  CONTACT_LOCATION
)}`;

const Footer = () => {
  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      left: 0,
      behavior: 'smooth',
    });
  };

  return (
    <footer className="codesphere-footer">
      <div className="container">

        <div className="footer-main">

          {/* Brand Section */}
          <div className="footer-branding">
            <Link
              to="/"
              className="footer-brand"
              onClick={scrollToTop}
              aria-label="CodeSphere Home"
            >
              <img
                src={logo}
                alt="CodeSphere - Coding Community"
                className="footer-logo-img"
              />
            </Link>

            <p className="footer-tagline">
              Learn together. Build together. Grow together.
            </p>

            <p className="footer-description">
              A coding community where curious minds connect,
              share knowledge, explore technology, and turn
              ideas into reality.
            </p>

            <div className='footer-email-location'>
            <a
              href="mailto:codesphere@agemc.ac.in"
              className="footer-email"
            >
              <i className="bi bi-envelope" aria-hidden="true" />
              codesphere@agemc.ac.in
            </a>

            <a
              className="footer-location"
              href={mapUrl}
              target="_blank"
              rel="noopener noreferrer"
            >
              <i className="bi bi-geo-alt" aria-hidden="true" />
              {CONTACT_LOCATION}
            </a>
            </div>
          </div>

          {/* Navigation */}
          <div className="footer-navigation">
            <h3>Quick Links</h3>

            <ul>
              {navLinks.map((link) => (
                <li key={link.path}>
                  <Link to={link.path}>
                    <i
                      className="bi bi-arrow-up-right"
                      aria-hidden="true"
                    />
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Community */}
          <div className="footer-community">
            <h3>Be Part of Our Community</h3>

            <p>
              Connect with fellow developers, exchange ideas,
              collaborate on projects, and grow together
              with CodeSphere.
            </p>

            <a
              href={WHATSAPP_LINK}
              target="_blank"
              rel="noopener noreferrer"
              className="footer-cta"
            >
              <i className="bi bi-whatsapp" aria-hidden="true" />
              Join On WhatsApp
              <i
                className="bi bi-arrow-up-right"
                aria-hidden="true"
              />
            </a>

            {/* Social Links */}
            <div className="footer-socials">
              {socialLinks.map((social) => (
                <a
                  key={social.name}
                  href={social.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="social-icon-btn"
                  aria-label={`CodeSphere on ${social.name}`}
                  title={social.name}
                >
                  <i
                    className={`bi ${social.icon}`}
                    aria-hidden="true"
                  />
                </a>
              ))}
            </div>
          </div>

        </div>

        {/* Bottom Bar */}
        <div className="footer-bottom">
          <span>
            © {new Date().getFullYear()} CodeSphere.
            All rights reserved.
          </span>

          <span className="footer-made">
            Made for the community
            <i className="bi bi-heart-fill" aria-hidden="true" />
          </span>
        </div>

      </div>
    </footer>
  );
};

export default Footer;

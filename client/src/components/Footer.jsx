import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import logo from '../assets/brand-dark.png';
import '../css/Footer.css';

const navLinks = [
  { label: 'Home', path: '/' },
  { label: 'Events', path: '/events' },
  { label: 'Materials', path: '/materials' },
  { label: 'Team', path: '/team' },
  { label: 'Contact Us', path: '/contact' },
];

const Footer = () => {
  return (
    <footer className="codesphere-footer">
      <div className="container">
        <div className="footer-main">
          <div className="footer-branding">
            <Link
              className="footer-brand"
              to="/"
              onClick={() => {
                closeMenu();
                window.scrollTo({
                  top: 0,
                  left: 0,
                  behavior: 'auto',
                });
              }}
            >
              <img
                src={logo}
                alt="CodeSphere Logo"
                className="navbar-logo-img"
              />

            </Link>

            <p className="footer-tagline">
              Learn together. Build together. Grow together.
            </p>
          </div>

          <div>
            <ul className="footer-links align-items-center gap-4">
              {navLinks.map((link) => (
                <li className="nav-item" key={link.label}>
                  <Link className="nav-link" to={link.path}>
                    {link.label}
                  </Link>
                </li>
              ))}

            </ul>
          </div>

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
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import logo from '../assets/codesphere-logo-light.svg';
import '../css/Navbar.css';

const navLinks = [
  { label: 'Home', path: '/' },
  { label: 'Events', path: '/events' },
  { label: 'Team', path: '/team' },
  { label: 'Join Community', path: '/join' },
];

const Navbar = () => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const { user } = useAuth();
  const isAuthenticated = Boolean(user);
  const isAdmin = user?.role?.toLowerCase() === 'admin';

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();

    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  // Close the drawer with Escape and prevent background scrolling.
  useEffect(() => {
    if (!isMenuOpen) return;

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        setIsMenuOpen(false);
      }
    };

    const previousOverflow = document.body.style.overflow;

    document.body.style.overflow = 'hidden';
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isMenuOpen]);

  const closeMenu = () => setIsMenuOpen(false);

  return (
    <>
      {/* Main Navbar */}
      <nav
        className={`navbar navbar-expand-lg py-3 sticky-top codesphere-navbar ${isScrolled ? 'navbar-scrolled' : ''
          }`}
        aria-label="Main navigation"
      >
        <div className="container">

          {/* Brand: Existing logo and wordmark */}
          <Link
            className="navbar-brand d-flex align-items-center"
            to="/"
            onClick={closeMenu}
          >
            <img
              src={logo}
              alt="CodeSphere Logo"
              className="navbar-logo-img"
            />

          </Link>

          {/* Mobile Hamburger */}
          <button
            className="navbar-toggler border-0 shadow-none p-0 d-lg-none codesphere-menu-toggle"
            type="button"
            onClick={() => setIsMenuOpen(true)}
            aria-label="Open navigation menu"
            aria-expanded={isMenuOpen}
            aria-controls="codesphere-mobile-menu"
          >
            <i
              className="bi bi-filter-right"
              aria-hidden="true"
            />
          </button>

          {/* Desktop Navigation */}
          <div className="desktop-navigation d-none d-lg-flex">
            <ul className="navbar-nav align-items-center gap-4">
              {navLinks.map((link) => (
                <li className="nav-item" key={link.label}>
                  <Link className="nav-link" to={link.path}>
                    {link.label}
                  </Link>
                </li>
              ))}

              <li className="nav-item ms-lg-2">
                <Link
                  to={
                    isAuthenticated
                      ? (isAdmin ? '/admin' : '/profile')
                      : '/login'
                  }
                  className="btn btn-gold navbar-login-button"
                >
                  {isAuthenticated
                    ? (isAdmin ? 'Admin Dashboard' : 'Profile')
                    : 'Sign In'}

                  <i
                    className={`bi ${isAuthenticated
                      ? (isAdmin ? 'bi-speedometer2' : 'bi-person-circle')
                      : 'bi-box-arrow-in-right'
                      }`}
                    aria-hidden="true"
                  />
                </Link>
              </li>

            </ul>
          </div>
        </div>
      </nav>

      {/* Mobile Overlay */}
      <div
        className={`codesphere-menu-overlay ${isMenuOpen ? 'active' : ''
          }`}
        onClick={closeMenu}
        aria-hidden="true"
      />

      {/* Right-Side Mobile Drawer */}
      <aside
        id="codesphere-mobile-menu"
        className={`codesphere-mobile-menu ${isMenuOpen ? 'active' : ''
          }`}
        aria-label="Mobile navigation"
        aria-hidden={!isMenuOpen}
        inert={!isMenuOpen}
      >
        {/* Drawer Header */}
        <div className="mobile-menu-header">
          <Link
            to="/"
            className="mobile-menu-brand"
            onClick={closeMenu}
          >
            <img src={logo} alt="CodeSphere Logo" />

          </Link>

          <button
            type="button"
            className="mobile-menu-close"
            onClick={closeMenu}
            aria-label="Close navigation menu"
          >
            <i className="bi bi-x-lg" aria-hidden="true" />
          </button>
        </div>

        {/* Drawer Label */}
        <p className="mobile-menu-caption">
          EXPLORE CODESPHERE
        </p>

        {/* Navigation Links */}
        <ul className="mobile-menu-links">
          {navLinks.map((link, index) => (
            <li key={link.label}>
              <Link to={link.path} onClick={closeMenu}>
                <span className="mobile-menu-number">
                  {String(index + 1).padStart(2, '0')}
                </span>

                <span className="mobile-menu-link-label">
                  {link.label}
                </span>

                <i
                  className="bi bi-arrow-up-right"
                  aria-hidden="true"
                />
              </Link>
            </li>
          ))}
        </ul>

        {/* Drawer Footer */}
        <div className="mobile-menu-footer">
          <p>Learn. Build. Grow.</p>

          <Link
            className="btn btn-gold mobile-menu-join"
            to={
              isAuthenticated
                ? (isAdmin ? '/admin' : '/profile')
                : '/login'
            }
            onClick={closeMenu}
          >
            <span>
              <i
                className={`bi ${isAuthenticated
                    ? (isAdmin ? 'bi-speedometer2' : 'bi-person-circle')
                    : 'bi-box-arrow-in-right'
                  } me-3`}
                aria-hidden="true"
              />
              {isAuthenticated
                ? (isAdmin ? 'Admin Dashboard' : 'Profile')
                : 'Sign In'}
            </span>

            <i className="bi bi-arrow-up-right" aria-hidden="true" />
          </Link>

          <span className="mobile-menu-tagline">
            BUILD SOMETHING AMAZING.
          </span>
        </div>
      </aside>
    </>
  );
};

export default Navbar;

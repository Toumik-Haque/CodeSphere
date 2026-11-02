
import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import logo from '../assets/logo.svg';
import '../css/Navbar.css';

const navLinks = [
  { label: 'Home', path: '/' },
  { label: 'Events', path: '/events' },
  { label: 'Materials', path: '/materials' },
  { label: 'Team', path: '/team' },
  { label: 'Contact Us', path: '/contact' },
];

const Navbar = () => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);

  const profileRef = useRef(null);
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const isAuthenticated = Boolean(user);
  const isAdmin = user?.role?.toLowerCase() === 'admin';

  const userName = user?.name || 'Student';
  const userEmail = user?.email || '';

  // Navbar scroll effect
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();

    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Close profile dropdown when clicking outside or pressing Escape
  useEffect(() => {
    const handleOutsideClick = (event) => {
      if (
        profileRef.current &&
        !profileRef.current.contains(event.target)
      ) {
        setIsProfileOpen(false);
      }
    };

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        setIsProfileOpen(false);
        setIsMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleOutsideClick);
    document.addEventListener('touchstart', handleOutsideClick);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('touchstart', handleOutsideClick);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  // Mobile drawer scroll lock
  useEffect(() => {
    if (!isMenuOpen) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isMenuOpen]);

  const closeMenu = () => setIsMenuOpen(false);

  const handleLogout = () => {
    logout();
    setIsProfileOpen(false);
    closeMenu();
    navigate('/login', { replace: true });
  };

  const profileInitial = userName.charAt(0).toUpperCase();

  const accountLink = isAuthenticated
    ? (isAdmin ? '/admin' : '/profile')
    : '/login';

  const accountLabel = isAuthenticated
    ? (isAdmin ? 'Admin Dashboard' : 'Profile')
    : 'Sign In';

  return (
    <>
      <nav
        className={`navbar navbar-expand-lg py-3 sticky-top codesphere-navbar ${
          isScrolled ? 'navbar-scrolled' : ''
        }`}
        aria-label="Main navigation"
      >
        <div className="container">

          {/* Brand */}
          <Link
            className="navbar-brand d-flex align-items-center"
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

          {/* Mobile Hamburger */}
          <button
            className="navbar-toggler border-0 shadow-none p-0 d-lg-none codesphere-menu-toggle"
            type="button"
            onClick={() => setIsMenuOpen(true)}
            aria-label="Open navigation menu"
            aria-expanded={isMenuOpen}
            aria-controls="codesphere-mobile-menu"
          >
            <i className="bi bi-filter-right" aria-hidden="true" />
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
            </ul>
          </div>

          {/* Desktop Account Area */}
          <div className="desktop-navigation d-none d-lg-flex">
            <ul className="navbar-nav align-items-center gap-4">

              {isAuthenticated && !isAdmin ? (
                <li
                  className="nav-item profile-dropdown-wrapper"
                  ref={profileRef}
                  onMouseEnter={() => setIsProfileOpen(true)}
                  onMouseLeave={() => setIsProfileOpen(false)}
                >
                  <button
                    type="button"
                    className={`profile-trigger ${
                      isProfileOpen ? 'active' : ''
                    }`}
                    onClick={() => setIsProfileOpen((prev) => !prev)}
                    aria-expanded={isProfileOpen}
                    aria-haspopup="true"
                  >
                    <span className="profile-trigger-avatar">
                      {profileInitial}
                    </span>

                    <span className="profile-trigger-name">
                      {userName}
                    </span>

                    <i
                      className={`bi bi-chevron-down profile-chevron ${
                        isProfileOpen ? 'rotated' : ''
                      }`}
                      aria-hidden="true"
                    />
                  </button>

                  <div
                    className={`profile-dropdown ${
                      isProfileOpen ? 'show' : ''
                    }`}
                  >
                    <div className="profile-dropdown-user">
                      <span className="profile-dropdown-avatar">
                        {profileInitial}
                      </span>

                      <div className="profile-dropdown-user-info">
                        <strong>{userName}</strong>
                        <span>{userEmail}</span>
                      </div>
                    </div>

                    <div className="profile-dropdown-divider" />

                    <Link
                      to="/profile"
                      className="profile-dropdown-link"
                      onClick={() => setIsProfileOpen(false)}
                    >
                      <i className="bi bi-person-circle" />
                      <span>View Profile</span>
                      <i className="bi bi-arrow-up-right profile-link-arrow" />
                    </Link>

                    <button
                      type="button"
                      className="profile-dropdown-link logout-link"
                      onClick={handleLogout}
                    >
                      <i className="bi bi-box-arrow-right" />
                      <span>Logout</span>
                    </button>
                  </div>
                </li>
              ) : (
                <li className="nav-item ms-lg-2">
                  <Link
                    to={accountLink}
                    className="btn btn-gold navbar-login-button"
                  >
                    {accountLabel}
                    <i
                      className={`bi ${
                        isAuthenticated
                          ? 'bi-speedometer2'
                          : 'bi-arrow-up-right'
                      }`}
                      aria-hidden="true"
                    />
                  </Link>
                </li>
              )}

            </ul>
          </div>
        </div>
      </nav>

      {/* Mobile Overlay */}
      <div
        className={`codesphere-menu-overlay ${
          isMenuOpen ? 'active' : ''
        }`}
        onClick={closeMenu}
        aria-hidden="true"
      />

      {/* Mobile Drawer */}
      <aside
        id="codesphere-mobile-menu"
        className={`codesphere-mobile-menu ${
          isMenuOpen ? 'active' : ''
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
            onClick={() => {
              closeMenu();
              window.scrollTo({
                top: 0,
                left: 0,
                behavior: 'auto',
              });
            }}
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

        <p className="mobile-menu-caption">EXPLORE CODESPHERE</p>

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

                <i className="bi bi-arrow-up-right" aria-hidden="true" />
              </Link>
            </li>
          ))}
        </ul>

        {/* Mobile Account Footer */}
        <div className="mobile-menu-footer">
          <p>Learn. Build. Grow.</p>

          {isAuthenticated && !isAdmin ? (
            <div className="mobile-account-card">
              <div className="mobile-account-user">
                <span className="profile-trigger-avatar">
                  {profileInitial}
                </span>

                <div className="mobile-account-info">
                  <strong>{userName}</strong>
                  <span>{userEmail}</span>
                </div>
              </div>

              <Link
                to="/profile"
                className="mobile-account-link"
                onClick={closeMenu}
              >
                <i className="bi bi-person-circle" />
                View Profile
                <i className="bi bi-arrow-up-right ms-auto" />
              </Link>

              <button
                type="button"
                className="mobile-account-link mobile-logout-link"
                onClick={handleLogout}
              >
                <i className="bi bi-box-arrow-right" />
                Logout
              </button>
            </div>
          ) : (
            <Link
              className="btn btn-gold mobile-menu-join"
              to={accountLink}
              onClick={closeMenu}
            >
              <span>
                <i
                  className={`bi ${
                    isAuthenticated
                      ? 'bi-speedometer2'
                      : 'bi-box-arrow-in-right'
                  } me-3`}
                  aria-hidden="true"
                />
                {accountLabel}
              </span>

              <i className="bi bi-arrow-up-right" aria-hidden="true" />
            </Link>
          )}

          <span className="mobile-menu-tagline">
            BUILD SOMETHING AMAZING.
          </span>
        </div>
      </aside>
    </>
  );
};

export default Navbar;

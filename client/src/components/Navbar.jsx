
import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
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
  const navigate = useNavigate();
  const location = useLocation();

  const isAdminPage = location.pathname.startsWith('/admin');

  const [isScrolled, setIsScrolled] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  // Separate refs for desktop and mobile dropdowns.
  const desktopDropdownRef = useRef(null);
  const mobileDropdownRef = useRef(null);

  const { user, logout } = useAuth();

  const isAuthenticated = Boolean(user);
  const isAdmin = user?.role?.toLowerCase() === 'admin';

  const dashboardPath = isAdmin ? '/admin' : '/profile';
  const dashboardLabel = isAdmin ? 'Admin Dashboard' : 'Dashboard';

  // Navbar scroll effect.
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

  // Close dropdown when clicking outside both desktop and mobile menus.
  useEffect(() => {
    const handleClickOutside = (event) => {
      const clickedInsideDesktop =
        desktopDropdownRef.current?.contains(event.target);

      const clickedInsideMobile =
        mobileDropdownRef.current?.contains(event.target);

      if (!clickedInsideDesktop && !clickedInsideMobile) {
        setIsDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, []);

  // Close the mobile drawer with Escape and prevent background scrolling.
  useEffect(() => {
    if (!isMenuOpen) return;

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        setIsMenuOpen(false);
        setIsDropdownOpen(false);
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

  // Close dropdown and mobile drawer after navigation.
  useEffect(() => {
    setIsDropdownOpen(false);
    setIsMenuOpen(false);
  }, [location.pathname]);

  // Close all menus.
  const closeMenu = () => {
    setIsMenuOpen(false);
    setIsDropdownOpen(false);
  };

  // Logout handler.
  const handleLogout = async () => {
    try {
      await logout();
      closeMenu();
      navigate('/login', { replace: true });
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  // Authentication menu for desktop and mobile.
  const AuthMenu = ({ mobile = false }) => {
    // Not logged in: Show Sign In.
    if (!isAuthenticated) {
      return (
        <Link
          to="/login"
          className={`btn btn-gold ${
            mobile ? 'mobile-menu-join' : 'navbar-login-button'
          }`}
          onClick={mobile ? closeMenu : undefined}
        >
          <span>
            <i
              className="bi bi-box-arrow-in-right me-2"
              aria-hidden="true"
            />
            Sign In
          </span>

          {!mobile && (
            <i
              className="bi bi-arrow-up-right"
              aria-hidden="true"
            />
          )}
        </Link>
      );
    }

    return (
      <div
        className={`navbar-user-dropdown ${
          mobile ? 'mobile-user-dropdown' : ''
        }`}
        ref={mobile ? mobileDropdownRef : desktopDropdownRef}
      >
        {/* Account Dropdown Button */}
        <button
          type="button"
          className={`btn btn-gold navbar-user-button ${
            mobile ? 'mobile-menu-join' : 'navbar-login-button'
          }`}
          onClick={() => setIsDropdownOpen((prev) => !prev)}
          aria-expanded={isDropdownOpen}
          aria-haspopup="true"
        >
          <span>
            <i
              className={`bi ${
                isAdmin ? 'bi-shield-lock' : 'bi-person-circle'
              } me-2`}
              aria-hidden="true"
            />
            {isAdmin ? 'Admin' : 'My Account'}
          </span>

          <i
            className={`bi bi-chevron-down dropdown-chevron ${
              isDropdownOpen ? 'rotated' : ''
            }`}
            aria-hidden="true"
          />
        </button>

        {/* Dropdown Items */}
        {isDropdownOpen && (
          <div className="navbar-dropdown-menu">
            <Link
              to={dashboardPath}
              className="navbar-dropdown-item"
              onClick={closeMenu}
            >
              <i
                className="bi bi-speedometer2"
                aria-hidden="true"
              />
              <span>{dashboardLabel}</span>
            </Link>

            <button
              type="button"
              className="navbar-dropdown-item navbar-dropdown-logout"
              onClick={handleLogout}
            >
              <i
                className="bi bi-box-arrow-right"
                aria-hidden="true"
              />
              <span>Logout</span>
            </button>
          </div>
        )}
      </div>
    );
  };

  return (
    <>
      {/* Main Navbar */}
      <nav
        className={`navbar navbar-expand-lg py-3 sticky-top codesphere-navbar ${
          isScrolled ? 'navbar-scrolled' : ''
        }`}
        aria-label="Main navigation"
      >
        <div className={isAdminPage ? 'container-fluid navbar-admin-container' : 'container'}>

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
            <i
              className="bi bi-filter-right"
              aria-hidden="true"
            />
          </button>

          {/* Desktop Navigation Links */}
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

          {/* Desktop Authentication */}
          <div className="desktop-navigation d-none d-lg-flex">
            <ul className="navbar-nav align-items-center">
              <li className="nav-item ms-lg-2">
                <AuthMenu />
              </li>
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

      {/* Mobile Side Navigation Drawer */}
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
            <img
              src={logo}
              alt="CodeSphere Logo"
            />
          </Link>

          <button
            type="button"
            className="mobile-menu-close"
            onClick={closeMenu}
            aria-label="Close navigation menu"
          >
            <i
              className="bi bi-x-lg"
              aria-hidden="true"
            />
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
              <Link
                to={link.path}
                onClick={closeMenu}
              >
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

          {/* Mobile Authentication Dropdown */}
          <AuthMenu mobile />

          <span className="mobile-menu-tagline">
            BUILD SOMETHING AMAZING.
          </span>
        </div>
      </aside>
    </>
  );
};

export default Navbar;

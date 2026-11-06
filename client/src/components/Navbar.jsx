
import { useState, useEffect, useRef } from 'react';
import { Link, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import logo from '../assets/logo.svg';
import '../css/Navbar.css';

const navLinks = [
  { label: 'Home', path: '/' },
  { label: 'Events', path: '/events' },
  { label: 'Playground', path: '/playground' },
  { label: 'Leaderboard', path: '/leaderboard' },
  { label: 'Materials', path: '/materials' },
  { label: 'Open Source', path: '/open-source' },
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

  const desktopDropdownRef = useRef(null);
  const mobileDropdownRef = useRef(null);
  const menuToggleRef = useRef(null);

  const { user, logout } = useAuth();

  const isAuthenticated = Boolean(user);
  const isAdmin = user?.role?.toLowerCase() === 'admin';

  const dashboardPath = isAdmin ? '/admin' : '/profile';
  const dashboardLabel = isAdmin ? 'Admin Dashboard' : 'Dashboard';

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();

    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

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

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        setIsMenuOpen(false);
        setIsDropdownOpen(false);
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  useEffect(() => {
    if (!isMenuOpen) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isMenuOpen]);

  // Close open menus whenever the current route changes.
  useEffect(() => {
    setIsDropdownOpen(false);
    setIsMenuOpen(false);
  }, [location.pathname]);

  const closeMenu = () => {
    const drawer = document.getElementById('codesphere-mobile-menu');

    if (drawer?.contains(document.activeElement)) {
      menuToggleRef.current?.focus();
    }

    setIsMenuOpen(false);
    setIsDropdownOpen(false);
  };

  const handleLogout = async () => {
    try {
      await logout();
      closeMenu();
      navigate('/login', { replace: true });
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  const renderAuthMenu = (mobile = false) => {
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
            <i className="bi bi-arrow-up-right" aria-hidden="true" />
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

        {isDropdownOpen && (
          <div className="navbar-dropdown-menu">
            <Link
              to={dashboardPath}
              className="navbar-dropdown-item"
              onClick={closeMenu}
            >
              <i className="bi bi-speedometer2" aria-hidden="true" />
              <span>{dashboardLabel}</span>
            </Link>

            <button
              type="button"
              className="navbar-dropdown-item navbar-dropdown-logout"
              onClick={handleLogout}
            >
              <i className="bi bi-box-arrow-right" aria-hidden="true" />
              <span>Logout</span>
            </button>
          </div>
        )}
      </div>
    );
  };

  return (
    <>
      <nav
        className={`navbar navbar-expand-lg py-3 sticky-top codesphere-navbar ${
          isScrolled ? 'navbar-scrolled' : ''
        }`}
        aria-label="Main navigation"
      >
        <div
          className={
            isAdminPage
              ? 'container-fluid navbar-admin-container'
              : 'container'
          }
        >
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

          <button
            ref={menuToggleRef}
            className="navbar-toggler border-0 shadow-none p-0 d-lg-none codesphere-menu-toggle"
            type="button"
            onClick={() => setIsMenuOpen(true)}
            aria-label="Open navigation menu"
            aria-expanded={isMenuOpen}
            aria-controls="codesphere-mobile-menu"
          >
            <i className="bi bi-filter-right" aria-hidden="true" />
          </button>

          <div className="desktop-navigation d-none d-lg-flex">
            <ul className="navbar-nav align-items-center gap-4">
              {navLinks.map((link) => (
                <li className="nav-item" key={link.label}>
                  <NavLink
                    className="nav-link"
                    to={link.path}
                    end={link.path === '/'}
                  >
                    {link.label}
                  </NavLink>
                </li>
              ))}
            </ul>
          </div>

          <div className="desktop-navigation d-none d-lg-flex">
            <ul className="navbar-nav align-items-center">
              <li className="nav-item ms-lg-2">
                {renderAuthMenu()}
              </li>
            </ul>
          </div>
        </div>
      </nav>

      <div
        className={`codesphere-menu-overlay ${
          isMenuOpen ? 'active' : ''
        }`}
        onClick={closeMenu}
        aria-hidden="true"
      />

      <aside
        id="codesphere-mobile-menu"
        className={`codesphere-mobile-menu ${
          isMenuOpen ? 'active' : ''
        }`}
        aria-label="Mobile navigation"
        inert={!isMenuOpen}
      >
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

        <ul className="mobile-menu-links">
          {navLinks.map((link, index) => (
            <li key={link.label}>
              <NavLink
                to={link.path}
                end={link.path === '/'}
                onClick={closeMenu}
              >
                <span className="mobile-menu-number">
                  {String(index + 1).padStart(2, '0')}
                </span>

                <span className="mobile-menu-link-label">
                  {link.label}
                </span>

                <i className="bi bi-arrow-up-right" aria-hidden="true" />
              </NavLink>
            </li>
          ))}
        </ul>

        <div className="mobile-menu-footer">
          <p>Learn. Build. Grow.</p>

          {renderAuthMenu(true)}

          <span className="mobile-menu-tagline">
            BUILD SOMETHING AMAZING.
          </span>
        </div>
      </aside>
    </>
  );
};

export default Navbar;

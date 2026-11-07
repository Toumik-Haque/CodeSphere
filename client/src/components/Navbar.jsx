
import { useState, useEffect, useRef } from 'react';
import { Link, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import logo from '../assets/logo.svg';
import NotificationBell from './NotificationBell';
import '../css/Navbar.css';

// Top-level links and grouped sections (Learn / Discover / Community).
const navItems = [
  { label: 'Home', path: '/' },
  {
    label: 'Learn',
    children: [
      { label: 'Coding Playground', path: '/playground', icon: 'bi-terminal', description: 'Code in 70+ languages in your browser' },
      { label: 'Reverse Coding', path: '/reverse-coding', icon: 'bi-arrow-repeat', description: 'See the output, rebuild the code' },
      { label: 'Materials', path: '/materials', icon: 'bi-journal-bookmark', description: 'Study guides and resources' },
    ],
  },
  {
    label: 'Discover',
    children: [
      { label: 'Project Hub', path: '/projects', icon: 'bi-rocket-takeoff', description: 'Build, import from GitHub and showcase' },
      { label: 'Hackathons', path: '/hackathons', icon: 'bi-trophy', description: 'Club hackathons + live ones from the web' },
      { label: 'Events', path: '/events', icon: 'bi-calendar-event', description: 'Workshops, talks and meetups' },
      { label: 'Tech News', path: '/news', icon: 'bi-newspaper', description: 'The weekly CodeSphere Tech Brief' },
      { label: 'Open Source', path: '/open-source', icon: 'bi-github', description: 'Contribute and find programs' },
    ],
  },
  {
    label: 'Community',
    children: [
      { label: 'Discussion Forum', path: '/forum', icon: 'bi-chat-dots', description: 'Ask, share and discuss anything' },
      { label: 'Leaderboard', path: '/leaderboard', icon: 'bi-trophy', description: 'XP, streaks and badges' },
      { label: 'Team', path: '/team', icon: 'bi-people', description: 'The people behind CodeSphere' },
    ],
  },
  { label: 'Contact Us', path: '/contact' },
];

// Mobile drawer: group headings followed by their links.
const mobileEntries = navItems.flatMap((item) => (item.children
  ? [{ heading: item.label }, ...item.children]
  : [item]));

// Desktop dropdown for a group of links.
function NavGroup({ item, pathname }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const active = item.children.some((c) => pathname.startsWith(c.path));

  useEffect(() => {
    if (!open) return undefined;
    const onClick = (e) => !ref.current?.contains(e.target) && setOpen(false);
    const onKey = (e) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', onClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <li
      className={`nav-item nav-group ${open ? 'is-open' : ''}`}
      ref={ref}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <button
        type="button"
        className={`nav-link nav-group-toggle ${active ? 'active' : ''}`}
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
      >
        {item.label} <i className="bi bi-chevron-down" aria-hidden="true" />
      </button>
      {open && (
        <div className="nav-group-menu">
          {item.children.map((child) => (
            <NavLink key={child.path} to={child.path} className="nav-group-link" onClick={() => setOpen(false)}>
              <i className={`bi ${child.icon}`} aria-hidden="true" />
              <span>
                <strong>{child.label}</strong>
                <small>{child.description}</small>
              </span>
            </NavLink>
          ))}
        </div>
      )}
    </li>
  );
}

// Is the first solid background under (x, y), ignoring the header, dark?
// Returns null when nothing solid is behind it.
function isDarkAt(x, y, nav) {
  for (const el of document.elementsFromPoint(x, y)) {
    if (nav.contains(el)) continue;
    // Elements can declare their tone (e.g. the code editor's current theme).
    if (el.dataset?.navTone) return el.dataset.navTone === 'dark';
    // Media (editor iframe, video, images): judge by the container behind it.
    if (['VIDEO', 'IMG', 'CANVAS', 'IFRAME'].includes(el.tagName)) continue;
    const m = getComputedStyle(el).backgroundColor.match(/rgba?\(([\d.]+),\s*([\d.]+),\s*([\d.]+)(?:,\s*([\d.]+))?/);
    if (!m) continue;
    const alpha = m[4] === undefined ? 1 : Number(m[4]);
    if (alpha < 0.5) continue;
    const [r, g, b] = [m[1], m[2], m[3]].map(Number);
    return 0.2126 * r + 0.7152 * g + 0.0722 * b < 110;
  }
  return null;
}

const Navbar = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const isAdminPage = location.pathname.startsWith('/admin') || location.pathname.startsWith('/user');

  const [isScrolled, setIsScrolled] = useState(false);
  const [isHidden, setIsHidden] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const desktopDropdownRef = useRef(null);
  const mobileDropdownRef = useRef(null);
  const menuToggleRef = useRef(null);

  const { user, logout } = useAuth();

  const isAuthenticated = Boolean(user);
  const isAdmin = user?.role?.toLowerCase() === 'admin';

  // Staff tools for students who hold a staff role (admins use the dashboard).
  const staffLinks = isAdmin ? [] : [
    { role: 'moderator', path: '/admin/forum', icon: 'bi-shield-lock', label: 'Forum moderation' },
    { role: 'news-editor', path: '/admin/news', icon: 'bi-newspaper', label: 'Tech News editor' },
    { role: 'challenge-editor', path: '/admin/reverse-coding', icon: 'bi-arrow-repeat', label: 'Reverse Coding editor' },
    { role: 'challenge-editor', path: '/admin/materials', icon: 'bi-journal-bookmark', label: 'Study Guide editor' },
    { role: 'hackathon-organizer', path: '/admin/hackathons', icon: 'bi-trophy', label: 'Hackathon organizer' },
    { role: 'project-reviewer', path: '/admin/projects', icon: 'bi-kanban', label: 'Review projects' },
    { role: 'hackathon-organizer', path: '/admin/review', icon: 'bi-inbox', label: 'Review hosted hackathons' },
  ].filter((link) => user?.staffRoles?.includes(link.role));

  const dashboardPath = isAdmin ? '/admin' : '/profile';
  const dashboardLabel = isAdmin ? 'Admin Dashboard' : 'Dashboard';

  useEffect(() => {
    let lastY = window.scrollY;
    const handleScroll = () => {
      const y = window.scrollY;
      setIsScrolled(y > 20);
      // Hide while scrolling down, show again on scroll up (small moves ignored).
      if (y < 80) setIsHidden(false);
      else if (y > lastY + 8) setIsHidden(true);
      else if (y < lastY - 8) setIsHidden(false);
      if (Math.abs(y - lastY) > 8 || y < 80) lastY = y;
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();

    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Let sticky page toolbars hide/show together with the header.
  const headerHidden = isHidden && !isMenuOpen && !isDropdownOpen;
  useEffect(() => {
    document.documentElement.dataset.navHidden = headerHidden ? 'true' : 'false';
  }, [headerHidden]);

  // Light text when the (transparent) header sits over a dark section.
  const navRef = useRef(null);
  const [onDark, setOnDark] = useState(false);
  useEffect(() => {
    let frame = 0;
    const check = () => {
      frame = 0;
      const nav = navRef.current;
      if (!nav) return;
      const y = Math.round(nav.getBoundingClientRect().height / 2);
      const votes = [0.3, 0.45, 0.6]
        .map((f) => isDarkAt(Math.round(window.innerWidth * f), y, nav))
        .filter((v) => v !== null);
      setOnDark(votes.length > 0 && votes.filter(Boolean).length * 2 > votes.length);
    };
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(check);
    };
    schedule();
    const late = setTimeout(schedule, 400); // after page content renders
    window.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', schedule);
    return () => {
      cancelAnimationFrame(frame);
      clearTimeout(late);
      window.removeEventListener('scroll', schedule);
      window.removeEventListener('resize', schedule);
    };
  }, [location.pathname]);

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

  // Close open menus whenever the current route changes (adjusting state
  // during render avoids an extra effect pass).
  const [lastPathname, setLastPathname] = useState(location.pathname);
  if (lastPathname !== location.pathname) {
    setLastPathname(location.pathname);
    setIsDropdownOpen(false);
    setIsMenuOpen(false);
  }

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

            <Link to="/host" className="navbar-dropdown-item" onClick={closeMenu}>
              <i className="bi bi-megaphone" aria-hidden="true" />
              <span>My hosted listings</span>
            </Link>

            {staffLinks.map((link) => (
              <Link key={link.path} to={link.path} className="navbar-dropdown-item" onClick={closeMenu}>
                <i className={`bi ${link.icon}`} aria-hidden="true" />
                <span>{link.label}</span>
              </Link>
            ))}

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
        ref={navRef}
        className={`navbar navbar-expand-lg py-3 sticky-top codesphere-navbar ${onDark ? 'navbar-on-dark' : ''} ${headerHidden ? 'navbar-hidden' : ''} ${
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

          {isAuthenticated && (
            <div className="d-lg-none ms-auto me-2">
              <NotificationBell compact />
            </div>
          )}

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
              {navItems.map((item) => (item.children ? (
                <NavGroup key={`${item.label}-${location.pathname}`} item={item} pathname={location.pathname} />
              ) : (
                <li className="nav-item" key={item.label}>
                  <NavLink
                    className="nav-link"
                    to={item.path}
                    end={item.path === '/'}
                  >
                    {item.label}
                  </NavLink>
                </li>
              )))}
            </ul>
          </div>

          <div className="desktop-navigation d-none d-lg-flex">
            <ul className="navbar-nav align-items-center">
              {isAuthenticated && (
                <li className="nav-item">
                  <NotificationBell />
                </li>
              )}
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
          {mobileEntries.map((link) => (link.heading ? (
            <li key={`heading-${link.heading}`} className="mobile-menu-group">{link.heading}</li>
          ) : (
            <li key={link.path}>
              <NavLink
                to={link.path}
                end={link.path === '/'}
                onClick={closeMenu}
              >
                <span className="mobile-menu-number">
                  <i className={`bi ${link.icon || (link.path === '/' ? 'bi-house' : 'bi-envelope')}`} aria-hidden="true" />
                </span>

                <span className="mobile-menu-link-label">
                  {link.label}
                </span>

                <i className="bi bi-arrow-up-right" aria-hidden="true" />
              </NavLink>
            </li>
          )))}
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

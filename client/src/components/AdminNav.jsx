import { useEffect, useState } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import logo from '../assets/logo.svg';
import { WORKSPACE, TOOLS } from '../lib/adminNav';
import '../css/Admin.css';

// Admin navigation shared by the dashboard (/admin) and every staff tool page
// (/admin/forum, /admin/hackathons, …): a sidebar on desktop, and a bottom bar
// with a "Tools" sheet on phones.

const SOCIALS = [
  { href: 'https://www.linkedin.com/company/codesphereagemc/', icon: 'bi-linkedin', label: 'LinkedIn' },
  { href: 'https://www.instagram.com/codesphereagemc/', icon: 'bi-instagram', label: 'Instagram' },
  { href: 'https://github.com/codesphere-agemc', icon: 'bi-github', label: 'GitHub' },
  { href: 'https://chat.whatsapp.com/FDGLH2yMpFuDJJBx448afz', icon: 'bi-whatsapp', label: 'WhatsApp' },
];

// On the dashboard, sections switch in place (onSelect). Elsewhere they link
// back to the dashboard and open that section.
function useGoToSection(onSelect) {
  const navigate = useNavigate();
  return (section) => (onSelect ? onSelect(section) : navigate('/admin', { state: { activeSection: section } }));
}

export function AdminSidebar({ active = null, onSelect }) {
  const goTo = useGoToSection(onSelect);

  return (
    <aside className="admin-sidebar">
      <Link to="/">
        <img src={logo} alt="Codesphere Logo" />
      </Link>

      <div className="admin-sidebar-label">WORKSPACE</div>
      <nav className="admin-navigation" aria-label="Admin workspace">
        {WORKSPACE.map((item) => (
          <button
            key={item.section}
            type="button"
            className={`admin-nav-item ${active === item.section ? 'active' : ''}`}
            onClick={() => goTo(item.section)}
            aria-current={active === item.section ? 'page' : undefined}
          >
            <i className={`bi ${item.icon}`} aria-hidden="true" />
            <span>{item.label}</span>
          </button>
        ))}
      </nav>

      <div className="admin-sidebar-label admin-sidebar-label-gap">COMMUNITY TOOLS</div>
      <nav className="admin-navigation" aria-label="Community tools">
        {TOOLS.map((tool) => (
          <NavLink
            key={tool.to}
            to={tool.to}
            className={({ isActive }) => `admin-nav-item ${isActive ? 'active' : ''}`}
            title={tool.hint}
          >
            <i className={`bi ${tool.icon}`} aria-hidden="true" />
            <span>{tool.label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="admin-sidebar-bottom">
        <div className="admin-social-section">
          <h6>CodeSphere Socials</h6>
          <p>Manage social account of your community</p>
          <div className="admin-social-links">
            {SOCIALS.map((s) => (
              <a key={s.label} href={s.href} target="_blank" rel="noopener noreferrer" aria-label={s.label} title={s.label}>
                <i className={`bi ${s.icon}`} />
              </a>
            ))}
          </div>
        </div>
        <div className="admin-sidebar-footer">© {new Date().getFullYear()} CodeSphere</div>
      </div>
    </aside>
  );
}

export function AdminMobileNav({ active = null, onSelect }) {
  const goTo = useGoToSection(onSelect);
  const { pathname } = useLocation();
  const [toolsOpen, setToolsOpen] = useState(false);
  const onTool = TOOLS.some((t) => pathname.startsWith(t.to));

  // Close the sheet after navigating, and on Escape.
  useEffect(() => {
    if (!toolsOpen) return undefined;
    const onKey = (e) => e.key === 'Escape' && setToolsOpen(false);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [toolsOpen]);

  return (
    <>
      {toolsOpen && (
        <div className="admin-tools-sheet" role="dialog" aria-modal="true" aria-label="Community tools">
          <button type="button" className="admin-tools-sheet-backdrop" aria-label="Close tools" onClick={() => setToolsOpen(false)} />
          <div className="admin-tools-sheet-panel">
            <div className="admin-tools-sheet-head">
              <strong>Community tools</strong>
              <button type="button" onClick={() => setToolsOpen(false)} aria-label="Close"><i className="bi bi-x-lg" aria-hidden="true" /></button>
            </div>
            {TOOLS.map((tool) => (
              <NavLink
                key={tool.to}
                to={tool.to}
                className={({ isActive }) => `admin-tools-sheet-item ${isActive ? 'active' : ''}`}
                onClick={() => setToolsOpen(false)}
              >
                <i className={`bi ${tool.icon}`} aria-hidden="true" />
                <span><strong>{tool.label}</strong><small>{tool.hint}</small></span>
              </NavLink>
            ))}
          </div>
        </div>
      )}

      <nav className="admin-mobile-nav admin-mobile-nav-6" aria-label="Mobile admin navigation">
        {WORKSPACE.map((item) => (
          <button
            key={item.section}
            type="button"
            className={active === item.section ? 'active' : ''}
            onClick={() => goTo(item.section)}
            aria-current={active === item.section ? 'page' : undefined}
          >
            <i className={`bi ${item.icon}`} />
            <span>{item.short}</span>
          </button>
        ))}
        <button
          type="button"
          className={onTool || toolsOpen ? 'active' : ''}
          onClick={() => setToolsOpen((v) => !v)}
          aria-expanded={toolsOpen}
        >
          <i className="bi bi-grid-3x3-gap-fill" />
          <span>Tools</span>
        </button>
      </nav>
    </>
  );
}

// Wraps a staff tool page so admins keep the sidebar. Students who hold a
// staff role (not admins) see the page as before.
export function AdminToolLayout({ children }) {
  const { user } = useAuth();
  if (user?.role !== 'admin') return children;
  return (
    <div className="admin-tool-layout">
      <AdminSidebar />
      <div className="admin-tool-content">{children}</div>
      <AdminMobileNav />
    </div>
  );
}

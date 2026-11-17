import { useState } from 'react';
import { apiRequest } from '../lib/api';
import { useNotice } from '../context/NoticeContext';

const ROLES = [
  { id: 'moderator', label: 'Moderator', icon: 'bi-shield-lock', help: 'Forum reports and moderation' },
  { id: 'news-editor', label: 'News editor', icon: 'bi-newspaper', help: 'Tech News review and digests' },
  { id: 'challenge-editor', label: 'Challenge editor', icon: 'bi-arrow-repeat', help: 'Reverse Coding authoring' },
  { id: 'project-reviewer', label: 'Project reviewer', icon: 'bi-kanban', help: 'Review Project Hub submissions' },
  { id: 'hackathon-organizer', label: 'Hackathon organizer', icon: 'bi-trophy', help: 'Run club hackathons and judge submissions' },
];

// Admin: grant or revoke a student's staff roles.
export default function AdminStaffRoles({ userId, initial = [] }) {
  const { showNotice } = useNotice();
  const [roles, setRoles] = useState(initial);
  const [saving, setSaving] = useState('');
  const [open, setOpen] = useState(false);

  const toggle = async (role) => {
    const roleLabel = ROLES.find((item) => item.id === role)?.label || 'Staff role';
    const next = roles.includes(role) ? roles.filter((r) => r !== role) : [...roles, role];
    setSaving(role);
    try {
      const r = await apiRequest(`/users/admin/${userId}/staff-roles`, { method: 'PUT', body: JSON.stringify({ staffRoles: next }) });
      setRoles(r.staffRoles);
      showNotice({
        tone: 'success',
        kicker: 'Staff roles',
        title: roles.includes(role) ? `${roleLabel} removed` : `${roleLabel} granted`,
        message: 'The staff roles for this student have been updated.',
      });
    } catch (e) {
      showNotice({
        tone: 'error',
        kicker: 'Staff roles',
        title: "Couldn't update staff roles",
        message: e.message || 'Please try again.',
      });
    } finally {
      setSaving('');
    }
  };

  return (
    <div className={`adm-staff ${open ? 'is-open' : ''}`} aria-label="Staff roles">
      <button
        type="button"
        className="adm-badges-toggle adm-staff-toggle"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
      >
        <i className="bi bi-person-badge" aria-hidden="true" /> Staff roles
        <i className={`bi ${open ? 'bi-chevron-up' : 'bi-chevron-down'}`} aria-hidden="true" />
      </button>
      {open && (
        <div className="adm-badges-panel adm-staff-panel">
          {ROLES.map((role) => (
            <button
              key={role.id}
              type="button"
              className={`adm-staff-chip ${roles.includes(role.id) ? 'is-on' : ''}`}
              onClick={() => toggle(role.id)}
              disabled={saving === role.id}
              aria-pressed={roles.includes(role.id)}
              title={role.help}
            >
              <i className={`bi ${roles.includes(role.id) ? 'bi-check-circle-fill' : role.icon}`} aria-hidden="true" /> {role.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

import React, { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { apiRequest } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import logo from '../assets/logo.png';
import '../css/Admin.css';

const initialForm = {
  title: '',
  category: 'Workshop',
  description: '',
  date: '',
  endDate: '',
  venue: '',
  mode: 'In-person',
  meetingLink: '',
  status: 'draft',
};

const categories = [
  'Workshop',
  'Hackathon',
  'Community Meetup',
];

function toDateTimeLocal(value) {
  if (!value) return '';

  const date = new Date(value);
  const offset = date.getTimezoneOffset() * 60000;

  return new Date(date.getTime() - offset)
    .toISOString()
    .slice(0, 16);
}

export default function Admin() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState(initialForm);
  const [events, setEvents] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [showEventForm, setShowEventForm] = useState(false);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const [selectedImage, setSelectedImage] = useState(null);
  const [imagePreview, setImagePreview] = useState('');
  const [activeSection, setActiveSection] = useState('home');

  const initialCoreMemberForm = {
    name: '',
    role: '',
    link: '',
  };

  const [coreMembers, setCoreMembers] = useState([]);
  const [showCoreMemberForm, setShowCoreMemberForm] = useState(false);
  const [coreMemberForm, setCoreMemberForm] = useState(initialCoreMemberForm);
  const [editingCoreMemberId, setEditingCoreMemberId] = useState(null);
  const [coreMemberImage, setCoreMemberImage] = useState(null);
  const [coreMemberImagePreview, setCoreMemberImagePreview] = useState('');
  const [coreMembersLoading, setCoreMembersLoading] = useState(false);
  const [coreMemberSaving, setCoreMemberSaving] = useState(false);
  const [coreMemberSearch, setCoreMemberSearch] = useState('');

  const [summary, setSummary] = useState({
    totalMembers: 0,
    totalEvents: 0,
    upcomingEvents: 0,
    pastEvents: 0,
  });

  const [members, setMembers] = useState([]);
  const [memberSearch, setMemberSearch] = useState('');
  const [membersLoading, setMembersLoading] = useState(false);

  const [selectedAttendanceEvent, setSelectedAttendanceEvent] = useState('');
  const [attendanceRows, setAttendanceRows] = useState([]);
  const [attendanceLoading, setAttendanceLoading] = useState(false);
  const [attendanceSavingId, setAttendanceSavingId] = useState('');

  const [eventSearch, setEventSearch] = useState('');
  const [eventCategory, setEventCategory] = useState('all');

  const loadSummary = useCallback(async () => {
    try {
      const data = await apiRequest('/events/admin/summary');
      setSummary((current) => ({ ...current, ...data }));
    } catch (err) {
      console.error('Unable to load dashboard summary:', err.message);
    }
  }, []);

  const loadEvents = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      const data = await apiRequest('/events/admin/all');
      setEvents(Array.isArray(data.events) ? data.events : []);
      await loadSummary();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [loadSummary]);

  const loadMembers = useCallback(async () => {
    setMembersLoading(true);

    try {
      const query = memberSearch.trim()
        ? `?search=${encodeURIComponent(memberSearch.trim())}`
        : '';

      const data = await apiRequest(`/events/admin/members${query}`);
      setMembers(data.members || []);
    } catch (err) {
      setError(err.message || 'Unable to load members.');
    } finally {
      setMembersLoading(false);
    }
  }, [memberSearch]);


  const loadCoreMembers = useCallback(async () => {
    setCoreMembersLoading(true);

    try {
      const data = await apiRequest('/core-members');
      setCoreMembers(Array.isArray(data.members) ? data.members : []);
    } catch (err) {
      setError(err.message || 'Unable to load core members.');
    } finally {
      setCoreMembersLoading(false);
    }
  }, []);

  useEffect(() => {
    if (activeSection === 'coreMembers' || activeSection === 'home') {
      loadCoreMembers();
    }
  }, [activeSection, loadCoreMembers]);

  function updateCoreMemberField(event) {
    const { name, value } = event.target;

    setCoreMemberForm((current) => ({
      ...current,
      [name]: value,
    }));
  }

  function resetCoreMemberForm() {
    setCoreMemberForm(initialCoreMemberForm);
    setEditingCoreMemberId(null);
    setCoreMemberImage(null);
    setCoreMemberImagePreview('');

    const input = document.getElementById('core-member-image');
    if (input) input.value = '';
  }

  function openCreateCoreMemberForm() {
    resetCoreMemberForm();
    setError('');
    setMessage('');
    setShowCoreMemberForm(true);
  }

  function cancelCoreMemberEditing() {
    resetCoreMemberForm();
    setError('');
    setMessage('');
    setShowCoreMemberForm(false);
  }

  function editCoreMember(member) {
    setCoreMemberForm({
      name: member.name || '',
      role: member.role || '',
      link: member.link || member.linkedin || member.github || '',
    });

    setEditingCoreMemberId(member._id);
    setShowCoreMemberForm(true);
    setCoreMemberImage(null);
    setCoreMemberImagePreview(member.image?.url || '');
    setError('');
    setMessage('');

    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async function saveCoreMember(event) {
    event.preventDefault();
    setError('');
    setMessage('');

    if (!coreMemberForm.name.trim() || !coreMemberForm.role.trim()) {
      setError('Please enter the member name and role.');
      return;
    }

    if (!editingCoreMemberId && !coreMemberImage) {
      setError('Please upload a profile image.');
      return;
    }

    if (coreMemberForm.link.trim()) {
      try {
        const url = new URL(coreMemberForm.link.trim());

        if (!['http:', 'https:'].includes(url.protocol)) {
          throw new Error();
        }
      } catch {
        setError('Please enter a valid supporting link starting with https://');
        return;
      }
    }

    setCoreMemberSaving(true);

    try {
      const formData = new FormData();

      formData.append('name', coreMemberForm.name.trim());
      formData.append('role', coreMemberForm.role.trim());
      formData.append('link', coreMemberForm.link.trim());

      if (coreMemberImage) {
        formData.append('image', coreMemberImage);
      }

      const result = editingCoreMemberId
        ? await apiRequest(`/core-members/${editingCoreMemberId}`, {
          method: 'PATCH',
          body: formData,
        })
        : await apiRequest('/core-members', {
          method: 'POST',
          body: formData,
        });

      setMessage(result.message || 'Core member saved successfully.');
      resetCoreMemberForm();
      setShowCoreMemberForm(false);
      await loadCoreMembers();
    } catch (err) {
      setError(err.message || 'Unable to save core member.');
    } finally {
      setCoreMemberSaving(false);
    }
  }

  async function deleteCoreMember(member) {
    const confirmed = window.confirm(
      `Delete "${member.name}" from Core Members?`
    );

    if (!confirmed) return;

    setError('');
    setMessage('');

    try {
      const result = await apiRequest(`/core-members/${member._id}`, {
        method: 'DELETE',
      });

      setMessage(result.message || 'Core member deleted successfully.');

      if (editingCoreMemberId === member._id) {
        resetCoreMemberForm();
      }

      await loadCoreMembers();
    } catch (err) {
      setError(err.message || 'Unable to delete core member.');
    }
  }

  const loadAttendance = useCallback(async () => {
    if (!selectedAttendanceEvent) {
      setAttendanceRows([]);
      return;
    }

    setAttendanceLoading(true);
    setAttendanceRows([]);

    try {
      const data = await apiRequest(
        `/events/admin/${selectedAttendanceEvent}/attendance`
      );

      setAttendanceRows(data.attendance || []);
    } catch (err) {
      setError(err.message || 'Unable to load attendance.');
    } finally {
      setAttendanceLoading(false);
    }
  }, [selectedAttendanceEvent]);

  useEffect(() => {
    loadEvents();
  }, [loadEvents]);

  // Start each dashboard section at the top, even if the home page was scrolled.
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [activeSection]);

  useEffect(() => {
    if (activeSection === 'attendance') {
      loadMembers();
    }
  }, [activeSection, loadMembers]);

  useEffect(() => {
    if (activeSection === 'attendance' && selectedAttendanceEvent) {
      loadAttendance();
    }
  }, [activeSection, selectedAttendanceEvent, loadAttendance]);

  useEffect(() => {
    if (activeSection !== 'attendance' || events.length === 0) {
      return;
    }

    if (!selectedAttendanceEvent) {
      setSelectedAttendanceEvent(
        events.find((event) => event.status === 'published')?._id ||
        events[0]._id
      );
    }
  }, [activeSection, events, selectedAttendanceEvent]);

  function updateField(event) {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  }

  function openCreateForm() {
    setEditingId(null);
    setForm(initialForm);
    setSelectedImage(null);
    setImagePreview('');
    setError('');
    setMessage('');
    setShowEventForm(true);
  }

  function startEditing(event) {
    setEditingId(event._id);

    setForm({
      title: event.title || '',
      category: event.category || 'Workshop',
      description: event.description || '',
      date: toDateTimeLocal(event.date),
      endDate: toDateTimeLocal(event.endDate),
      venue: event.venue || '',
      mode: event.mode || 'In-person',
      meetingLink: event.meetingLink || '',
      status: event.status || 'draft',
    });

    setSelectedImage(null);
    setImagePreview(event.bannerImage || '');
    setMessage('');
    setError('');
    setShowEventForm(true);

    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function cancelEditing() {
    setShowEventForm(false);
    setEditingId(null);
    setForm(initialForm);
    setSelectedImage(null);
    setImagePreview('');
    setError('');
    setMessage('');

    const imageInput = document.getElementById('bannerImage');
    if (imageInput) imageInput.value = '';
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');
    setMessage('');
    if (!form.date || Number.isNaN(new Date(form.date).getTime())) {
      setError('Please provide a valid event start date and time.');
      return;
    }

    if (form.endDate && new Date(form.endDate) < new Date(form.date)) {
      setError('The end date and time must be after the start date.');
      return;
    }

    setSaving(true);

    try {
      const formData = new FormData();

      formData.append('title', form.title);
      formData.append('category', form.category);
      formData.append('description', form.description);
      formData.append('date', new Date(form.date).toISOString());
      formData.append(
        'endDate',
        form.endDate ? new Date(form.endDate).toISOString() : ''
      );
      formData.append('venue', form.venue);
      formData.append('mode', form.mode);
      formData.append('meetingLink', form.meetingLink);
      formData.append('status', form.status);

      if (selectedImage) {
        formData.append('bannerImage', selectedImage);
      }

      const result = editingId
        ? await apiRequest(`/events/${editingId}`, {
          method: 'PATCH',
          body: formData,
        })
        : await apiRequest('/events', {
          method: 'POST',
          body: formData,
        });

      setMessage(result.message || 'Event saved successfully.');
      setForm(initialForm);
      setEditingId(null);
      setSelectedImage(null);
      setImagePreview('');
      setShowEventForm(false);

      const imageInput = document.getElementById('bannerImage');
      if (imageInput) imageInput.value = '';

      await loadEvents();
    } catch (err) {
      setError(err.message || 'Unable to save event.');
    } finally {
      setSaving(false);
    }
  }

  async function togglePublish(event) {
    setError('');
    setMessage('');

    try {
      const status =
        event.status === 'published' ? 'draft' : 'published';

      const result = await apiRequest(`/events/${event._id}`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      });

      setMessage(result.message);
      await loadEvents();
    } catch (err) {
      setError(err.message);
    }
  }

  async function deleteEvent(event) {
    const confirmed = window.confirm(
      `Delete "${event.title}" permanently?`
    );

    if (!confirmed) return;

    setError('');
    setMessage('');

    try {
      const result = await apiRequest(`/events/${event._id}`, {
        method: 'DELETE',
      });

      setMessage(result.message);

      if (editingId === event._id) {
        cancelEditing();
      }

      await loadEvents();
    } catch (err) {
      setError(err.message);
    }
  }

  async function updateAttendance(userId, status) {
    if (!selectedAttendanceEvent) {
      setError('Select an event first.');
      return;
    }

    setError('');
    setMessage('');
    setAttendanceSavingId(userId);

    try {
      const result = await apiRequest(
        `/events/admin/${selectedAttendanceEvent}/attendance/${userId}`,
        {
          method: 'PATCH',
          body: JSON.stringify({ status }),
        }
      );

      setMessage(result.message || 'Attendance updated successfully.');
      await loadAttendance();
    } catch (err) {
      setError(err.message || 'Unable to update attendance.');
    } finally {
      setAttendanceSavingId('');
    }
  }

  function handleLogout() {
    logout();
    navigate('/login', { replace: true });
  }

  const presentCount = members.filter((member) => {
    const record = attendanceRows.find(
      (row) => String(row._id ?? row.userId ?? row.memberId) === String(member._id)
    );

    return record?.status === 'present';
  }).length;

  const absentCount = Math.max(0, members.length - presentCount);

  const filteredEvents = events.filter((event) => {
    const matchesSearch = `${event.title || ''} ${event.venue || ''}`
      .toLowerCase()
      .includes(eventSearch.trim().toLowerCase());
    const matchesCategory = eventCategory === 'all' ||
      (event.category || '').toLowerCase() === eventCategory.toLowerCase();
    return matchesSearch && matchesCategory;
  });

  function goBackToDashboard() {
    if (showEventForm) {
      setShowEventForm(false);
      setEditingId(null);
      setForm(initialForm);
      setSelectedImage(null);
      setImagePreview('');
    } else if (showCoreMemberForm) {
      cancelCoreMemberEditing();
    } else {
      setActiveSection('home');
    }

    setError('');
    setMessage('');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  return (
    <main className="admin-page">
      <header className="admin-topbar">

        <Link
          className="navbar-brand d-flex align-items-center"
          to="/"
        >
          <img
            src={logo}
            alt="CodeSphere Logo"
            className="navbar-logo-img"
          />

          <div className="d-flex flex-column ms-2">
            <span className="textLogo-code">
              Code<span className="textLogo-sphere">Sphere</span>
            </span>
            <span className="textLogo-tag">
              — CODING COMMUNITY —
            </span>
          </div>
        </Link>

        <div className="admin-topbar-actions">
          <span>{user?.name}</span>
          <button
            type="button"
            className="admin-logout"
            onClick={handleLogout}
          >
            <span className="smallDisplayNone">Sign Out</span>
            <i className="bi bi-box-arrow-right m-0" />
          </button>
        </div>
      </header>

      <div className="admin-container">
        {activeSection === 'home' && (
          <section className="admin-home">
            <div className="admin-heading">
              <div>
                <p className="auth-eyebrow">ADMINISTRATION</p>
                <p>
                  Manage CodeSphere events, members attendance and publish
                  updates for members.
                </p>
              </div>
            </div>
            <div className="admin-section-buttons">
              <button
                type="button"
                className="admin-section-button"
                onClick={() => {
                  setActiveSection('events');
                  setShowEventForm(false);
                  setEditingId(null);
                  setForm(initialForm);
                  setSelectedImage(null);
                  setImagePreview('');
                  setError('');
                  setMessage('');
                }}
              >
                <span className="admin-section-icon"><i className="bi bi-calendar-event" aria-hidden="true" /></span>
                <span className="admin-section-copy">
                  <strong>Events</strong>
                  <small>Manage events</small>
                </span>
                <i className="bi bi-arrow-up-right admin-section-arrow" aria-hidden="true" />
              </button>

              <button
                type="button"
                className="admin-section-button"
                onClick={() => setActiveSection('attendance')}
              >
                <span className="admin-section-icon"><i className="bi bi-clipboard-check" aria-hidden="true" /></span>
                <span className="admin-section-copy">
                  <strong>Attendance</strong>
                  <small>Track attendance</small>
                </span>
                <i className="bi bi-arrow-up-right admin-section-arrow" aria-hidden="true" />
              </button>

              <button
                type="button"
                className="admin-section-button"
                onClick={() => setActiveSection('coreMembers')}
              >
                <span className="admin-section-icon"><i className="bi bi-people" aria-hidden="true" /></span>
                <span className="admin-section-copy">
                  <strong>Core Members</strong>
                  <small>Manage team</small>
                </span>
                <i className="bi bi-arrow-up-right admin-section-arrow" aria-hidden="true" />
              </button>
            </div>
            <div className="admin-dashboard-heading">
              <div>
                <h2>Dashboard Overview</h2>
                <p className="admin-panel-subtitle">
                  Here's what's happening in your CodeSphere community.
                </p>
              </div>
            </div>
            <div className="admin-stats-grid admin-stats-compact">
              <article className="admin-stat-card">
                <div className="admin-stat-icon">
                  <i className="bi bi-easel" aria-hidden="true" />
                </div>
                <p>Total Workshops</p>
                <strong>
                  {events.filter(
                    (event) =>
                      event.category?.toLowerCase() === 'workshop'
                  ).length}
                </strong>
              </article>

              <article className="admin-stat-card">
                <div className="admin-stat-icon">
                  <i className="bi bi-code-square" aria-hidden="true" />
                </div>
                <p>Total Hackathons</p>
                <strong>
                  {events.filter(
                    (event) =>
                      event.category?.toLowerCase() === 'hackathon'
                  ).length}
                </strong>
              </article>

              <article className="admin-stat-card">
                <div className="admin-stat-icon">
                  <i className="bi bi-person-badge" aria-hidden="true" />
                </div>
                <p>Core Members</p>
                <strong>{coreMembers.length}</strong>
              </article>

              <article className="admin-stat-card">
                <div className="admin-stat-icon">
                  <i className="bi bi-people" aria-hidden="true" />
                </div>
                <p>Registered Members</p>
                <strong>{summary.totalMembers}</strong>
              </article>
            </div>
          </section>
        )}

        {activeSection === 'events' && (
          <>
            {error && (
              <div className="auth-error" role="alert">
                {error}
              </div>
            )}

            {message && (
              <div className="admin-success" role="status">
                {message}
              </div>
            )}

            {showEventForm ? (
              <section className="admin-panel">
                <button
                  type="button"
                  className="admin-back-arrow mb-3"
                  onClick={goBackToDashboard}
                  aria-label="Back to dashboard"
                >
                  <i className="bi bi-arrow-left" aria-hidden="true" />
                </button>

                <h2>{editingId ? 'Edit Event' : 'Create an Event'}</h2>

                <p className="admin-panel-subtitle">
                  Save a draft first or publish an event for visitors.
                </p>

                <form className="admin-event-form" onSubmit={handleSubmit}>
                  <div className="admin-form-field admin-field-full">
                    <label htmlFor="event-title">Event title</label>
                    <input
                      id="event-title"
                      name="title"
                      value={form.title}
                      onChange={updateField}
                      maxLength={120}
                      required
                    />
                  </div>

                  <div className="admin-form-field">
                    <label htmlFor="event-category">Category</label>
                    <select
                      id="event-category"
                      name="category"
                      value={form.category}
                      onChange={updateField}
                      required
                    >
                      {categories.map((category) => (
                        <option key={category} value={category}>
                          {category}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="admin-form-field">
                    <label htmlFor="event-mode">Event format</label>
                    <select
                      id="event-mode"
                      name="mode"
                      value={form.mode}
                      onChange={updateField}
                    >
                      <option>In-person</option>
                      <option>Online</option>
                      <option>Hybrid</option>
                    </select>
                  </div>

                  <div className="admin-form-field">
                    <label htmlFor="event-date">Start date and time</label>
                    <input
                      id="event-date"
                      name="date"
                      type="datetime-local"
                      value={form.date}
                      onChange={updateField}
                      required
                    />
                  </div>

                  <div className="admin-form-field">
                    <label htmlFor="event-end-date">
                      End date and time (optional)
                    </label>
                    <input
                      id="event-end-date"
                      name="endDate"
                      type="datetime-local"
                      min={form.date || undefined}
                      value={form.endDate}
                      onChange={updateField}
                    />
                  </div>

                  <div className="admin-form-field admin-field-full">
                    <label htmlFor="event-description">Description</label>
                    <textarea
                      id="event-description"
                      name="description"
                      value={form.description}
                      onChange={updateField}
                      maxLength={5000}
                      rows={4}
                      required
                    />
                  </div>

                  <div className="admin-form-field">
                    <label htmlFor="event-venue">Venue</label>
                    <input
                      id="event-venue"
                      name="venue"
                      value={form.venue}
                      onChange={updateField}
                      maxLength={200}
                      placeholder="Campus hall or online"
                    />
                  </div>

                  <div className="admin-form-field">
                    <label htmlFor="event-meeting-link">
                      Meeting link (optional)
                    </label>
                    <input
                      id="event-meeting-link"
                      name="meetingLink"
                      type="url"
                      value={form.meetingLink}
                      onChange={updateField}
                      placeholder="https://..."
                    />
                  </div>

                  <div className="admin-form-field">
                    <label htmlFor="event-status">Initial status</label>
                    <select
                      id="event-status"
                      name="status"
                      value={form.status}
                      onChange={updateField}
                    >
                      <option value="draft">Draft — not public</option>
                      <option value="published">
                        Published — visible to visitors
                      </option>
                    </select>
                  </div>

                  <div className="mb-3 admin-form-field admin-field-full">
                    <label htmlFor="bannerImage" className="form-label">
                      Event Banner (optional)
                    </label>

                    <input
                      id="bannerImage"
                      type="file"
                      className="form-control"
                      accept="image/png,image/jpeg,image/webp"
                      onChange={(e) => {
                        const file = e.target.files?.[0];

                        if (!file) {
                          setSelectedImage(null);
                          return;
                        }

                        if (imagePreview.startsWith('blob:')) {
                          URL.revokeObjectURL(imagePreview);
                        }

                        setSelectedImage(file);
                        setImagePreview(URL.createObjectURL(file));
                      }}
                    />

                    {imagePreview && (
                      <div className="mt-3">
                        <img
                          src={imagePreview}
                          alt="Event banner preview"
                          style={{
                            width: '100%',
                            maxHeight: '220px',
                            objectFit: 'contain',
                            borderRadius: '8px',
                          }}
                        />
                      </div>
                    )}

                    <small className="text-secondary">
                      PNG, JPG, or WebP. Maximum file size: 5 MB.
                    </small>
                  </div>

                  <div className="admin-form-actions admin-field-full">
                    <button
                      className="auth-submit"
                      type="submit"
                      disabled={saving}
                    >
                      {saving
                        ? 'Saving...'
                        : editingId
                          ? 'Save Changes'
                          : 'Create Event'}
                    </button>

                    <button
                      className="admin-secondary-button"
                      type="button"
                      onClick={cancelEditing}
                      disabled={saving}
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              </section>
            ) : (
              <section className="admin-events-section">
                <div className="admin-section-heading admin-events-dashboard-heading">
                  <div>
                    <button
                      type="button"
                      className="admin-back-arrow"
                      onClick={goBackToDashboard}
                      aria-label="Back to dashboard"
                    >
                      <i className="bi bi-arrow-left" aria-hidden="true" />
                    </button>
                    <h2>Manage Events</h2>
                  </div>

                  <div className="admin-event-actions">
                    <button
                      type="button"
                      className="admin-secondary-button"
                      onClick={loadEvents}
                      disabled={loading}
                    >
                      <i
                        className="bi bi-arrow-clockwise"
                        aria-hidden="true"
                      />
                      <span className="smallDisplayNone">Refresh</span>
                    </button>

                    <button
                      type="button"
                      className="auth-submit"
                      onClick={openCreateForm}
                    >
                      <i className="bi bi-plus-lg" aria-hidden="true" />
                      <span className="smallDisplayNone">Create Event</span>
                    </button>
                  </div>
                </div>

                <div className="admin-event-filters">
                  <label className="admin-event-search">
                    <i className="bi bi-search" aria-hidden="true" />
                    <input
                      type="search"
                      value={eventSearch}
                      onChange={(e) => setEventSearch(e.target.value)}
                      placeholder="Search events"
                      aria-label="Search events"
                    />
                  </label>
                  <select
                    value={eventCategory}
                    onChange={(e) => setEventCategory(e.target.value)}
                    aria-label="Filter events by category"
                  >
                    <option value="all">All categories</option>
                    {categories.map((category) => (
                      <option key={category} value={category}>{category}</option>
                    ))}
                  </select>
                </div>

                {loading ? (
                  <p className="admin-empty">Loading events...</p>
                ) : events.length === 0 ? (
                  <p className="admin-empty">
                    No events yet. Click Create Event to add your first event.
                  </p>
                ) : filteredEvents.length === 0 ? (
                  <p className="admin-empty">No events match these filters.</p>
                ) : (
                  <div className="admin-event-list">
                    {filteredEvents.map((event) => (
                      <article className="admin-event-item" key={event._id}>
                        <div className="admin-event-info">
                          <div className="admin-event-meta">
                            <span>{event.category}</span>
                            <span className={`admin-status ${event.status}`}>
                              {event.status}
                            </span>
                          </div>

                          <h3>{event.title}</h3>
                          <p>{new Date(event.date).toLocaleString()}</p>
                          <p>{event.venue || event.mode}</p>
                          <p className="admin-event-description">
                            {event.description}
                          </p>
                        </div>

                        <div className="admin-event-actions">
                          <button
                            type="button"
                            onClick={() => startEditing(event)}
                          >
                            Edit
                          </button>

                          <button
                            type="button"
                            onClick={() => togglePublish(event)}
                          >
                            {event.status === 'published'
                              ? 'Unpublish'
                              : 'Publish'}
                          </button>

                          <button
                            type="button"
                            className="admin-delete-button"
                            onClick={() => deleteEvent(event)}
                          >
                            Delete
                          </button>
                        </div>
                      </article>
                    ))}
                  </div>
                )}
              </section>
            )}
          </>
        )}

        {activeSection === 'attendance' && (
          <section className="admin-members-panel">
            <div className="admin-section-heading">
              <div>
                <button
                  type="button"
                  className="admin-back-arrow"
                  onClick={goBackToDashboard}
                  aria-label="Back to dashboard"
                >
                  <i className="bi bi-arrow-left mt-1" aria-hidden="true" />
                </button>
                <h2><span className='smallDisplayNone'>Manage</span> Attendance</h2>
              </div>

              <div className='admin-event-actions'>
                <button
                  type="button"
                  className="admin-secondary-button"
                  onClick={() => {
                    loadMembers();
                    loadAttendance();
                  }}
                  disabled={membersLoading || attendanceLoading}
                >
                  <i className="bi bi-arrow-clockwise" aria-hidden="true" />{' '}
                  <span className="smallDisplayNone">Refresh</span>
                </button>
              </div>
            </div>

            {error && (
              <div className="auth-error" role="alert">
                {error}
              </div>
            )}

            {message && (
              <div className="admin-success" role="status">
                {message}
              </div>
            )}

            <div className="admin-members-toolbar">
              <div className="admin-form-field mb-2">
                <label htmlFor="attendance-event">Select event</label>
                <select
                  id="attendance-event"
                  value={selectedAttendanceEvent}
                  onChange={(e) => setSelectedAttendanceEvent(e.target.value)}
                >
                  <option value="">Choose an event</option>
                  {events.map((event) => (
                    <option key={event._id} value={event._id}>
                      {event.title}
                    </option>
                  ))}
                </select>
              </div>

              <div className="attendance-stats-card">
                <div className="attendance-stats-left">
                  <h3>Attendance Stats</h3>

                  <div className="attendance-stat-row">
                    <span>Total</span>
                    <strong>{members.length}</strong>
                  </div>

                  <div className="attendance-stat-row">
                    <span>Present</span>
                    <strong>{presentCount}</strong>
                  </div>

                  <div className="attendance-stat-row">
                    <span>Absent</span>
                    <strong>{absentCount}</strong>
                  </div>
                </div>

                <div
                  className="attendance-percentage-circle"
                  style={{
                    "--attendance-percent": `${members.length > 0
                      ? Math.round((presentCount / members.length) * 100)
                      : 0
                      }%`
                  }}
                >
                  <div className="attendance-circle-inner">
                    <strong>
                      {members.length > 0
                        ? Math.round((presentCount / members.length) * 100)
                        : 0}%
                    </strong>
                    <span>Present</span>
                  </div>
                </div>
              </div>
            </div>

            <div className='members-list d-flex flex-column gap-4'>
              <div className="admin-form-field">
                <label htmlFor="member-search">Search members</label>
                <input
                  id="member-search"
                  type="search"
                  placeholder="Search by name or email"
                  value={memberSearch}
                  onChange={(e) => setMemberSearch(e.target.value)}
                />
              </div>

              {!selectedAttendanceEvent ? (
                <p className="admin-empty">
                  Create an event first, then select it to manage attendance.
                </p>
              ) : membersLoading || attendanceLoading ? (
                <p className="admin-empty">
                  Loading members and attendance...
                </p>
              ) : members.length === 0 ? (
                <p className="admin-empty">
                  No members match your search.
                </p>
              ) : (
                <div className="admin-member-list">
                  {members.map((member) => {
                    const record = attendanceRows.find(
                      (row) => String(row._id ?? row.userId ?? row.memberId) === String(member._id)
                    );

                    const status = record?.status || 'absent';
                    const savingRow = attendanceSavingId === member._id;

                    return (
                      <article
                        className="admin-member-item"
                        key={member._id}
                      >
                        <div className="admin-member-info">
                          <div
                            className="admin-member-avatar"
                            aria-hidden="true"
                          >
                            {member.name?.trim().charAt(0).toUpperCase() || '?'}
                          </div>

                          <div className="admin-member-details">
                            <h3>{member.name}</h3>
                            <p>{member.email}</p>
                          </div>
                        </div>

                        <div className="admin-attendance-actions">
                          <div
                            className={`admin-attendance-toggle ${status}`}
                            role="group"
                            aria-label={`Attendance for ${member.name}`}
                          >
                            <button
                              type="button"
                              className={`admin-toggle-option present-option ${status === 'present' ? 'active' : ''
                                }`}
                              onClick={() =>
                                updateAttendance(member._id, 'present')
                              }
                              disabled={savingRow || status === 'present'}
                              aria-pressed={status === 'present'}
                            >
                              <span className="toggle-indicator">✓</span>
                              Present
                            </button>

                            <button
                              type="button"
                              className={`admin-toggle-option absent-option ${status === 'absent' ? 'active' : ''
                                }`}
                              onClick={() =>
                                updateAttendance(member._id, 'absent')
                              }
                              disabled={savingRow || status === 'absent'}
                              aria-pressed={status === 'absent'}
                            >
                              <span className="toggle-indicator">—</span>
                              Absent
                            </button>
                          </div>

                          {savingRow && (
                            <span
                              className="admin-attendance-saving"
                              role="status"
                            >
                              Saving…
                            </span>
                          )}
                        </div>
                      </article>
                    );
                  })}
                </div>
              )}
            </div>

          </section>
        )}

        {activeSection === 'coreMembers' && (
          <>
            {error && <div className="auth-error" role="alert">{error}</div>}
            {message && <div className="auth-success" role="status">{message}</div>}

            {showCoreMemberForm ? (
              <section className='admin-panel'>
                <button
                  type="button"
                  className="admin-back-arrow mb-3"
                  onClick={goBackToDashboard}
                  aria-label="Back to dashboard"
                >
                  <i className="bi bi-arrow-left" aria-hidden="true" />
                </button>

                <h2>{editingCoreMemberId ? 'Edit Core Member' : 'Add Core Member'}</h2>

                <p className="admin-panel-subtitle">
                  Save a draft first or publish an event for visitors.
                </p>

                <form className="admin-event-form" onSubmit={saveCoreMember}>

                  <div className="admin-form-grid">
                    <div className="admin-form-field">
                      <label htmlFor="core-member-name">Full name *</label>
                      <input
                        id="core-member-name"
                        name="name"
                        value={coreMemberForm.name}
                        onChange={updateCoreMemberField}
                        maxLength={100}
                        required
                      />
                    </div>

                    <div className="admin-form-field">
                      <label htmlFor="core-member-role">Role / position *</label>
                      <input
                        id="core-member-role"
                        name="role"
                        value={coreMemberForm.role}
                        onChange={updateCoreMemberField}
                        maxLength={100}
                        placeholder="e.g. Technical Lead"
                        required
                      />
                    </div>

                    <div className="admin-form-field admin-form-field-full">
                      <label htmlFor="core-member-link">Supporting link</label>
                      <input
                        id="core-member-link"
                        name="link"
                        type="url"
                        value={coreMemberForm.link}
                        onChange={updateCoreMemberField}
                        maxLength={500}
                        placeholder="https://linkedin.com/in/... or your portfolio"
                      />
                      <small className="text-secondary">
                        LinkedIn, GitHub, portfolio, or another profile.
                      </small>
                    </div>

                    <div className="admin-form-field admin-form-field-full">
                      <label htmlFor="core-member-image">
                        Profile image {editingCoreMemberId ? '(optional when editing)' : '*'}
                      </label>

                      <input
                        id="core-member-image"
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        required={!editingCoreMemberId && !coreMemberImage}
                        onChange={(event) => {
                          const file = event.target.files?.[0];
                          if (!file) return;

                          if (file.size > 5 * 1024 * 1024) {
                            setError('Image must be 5 MB or smaller.');
                            event.target.value = '';
                            return;
                          }

                          if (coreMemberImagePreview.startsWith('blob:')) {
                            URL.revokeObjectURL(coreMemberImagePreview);
                          }

                          setError('');
                          setCoreMemberImage(file);
                          setCoreMemberImagePreview(URL.createObjectURL(file));
                        }}
                      />
                    </div>
                  </div>

                  {coreMemberImagePreview && (
                    <div className="core-member-image-preview">
                      <img
                        src={coreMemberImagePreview}
                        alt="Core member preview"
                      />

                      <button
                        type="button"
                        className="admin-secondary-button"
                        onClick={() => {
                          if (coreMemberImagePreview.startsWith('blob:')) {
                            URL.revokeObjectURL(coreMemberImagePreview);
                          }

                          setCoreMemberImage(null);

                          // Restore the existing image when editing a member.
                          setCoreMemberImagePreview(
                            editingCoreMemberId
                              ? coreMembers.find(
                                (member) => member._id === editingCoreMemberId
                              )?.image?.url || ''
                              : ''
                          );

                          const input = document.getElementById('core-member-image');
                          if (input) input.value = '';
                        }}
                      >
                        Remove image
                      </button>
                    </div>
                  )}

                  <div className="admin-form-actions admin-field-full">
                    <button
                      type="button"
                      className="admin-secondary-button"
                      onClick={cancelCoreMemberEditing}
                      disabled={coreMemberSaving}
                    >
                      Cancel
                    </button>

                    <button
                      type="submit"
                      className="auth-submit"
                      disabled={coreMemberSaving}
                    >
                      {coreMemberSaving
                        ? 'Saving...'
                        : editingCoreMemberId
                          ? 'Update Member'
                          : 'Add Member'}
                    </button>
                  </div>
                </form>
              </section>
            ) : (
              <section className="admin-events-section admin-core-members-list">
                <div className="admin-section-heading admin-events-dashboard-heading">
                  <div className='flex-column align-items-start'>
                    <button
                      type="button"
                      className="admin-back-arrow"
                      onClick={goBackToDashboard}
                      aria-label="Back to dashboard"
                    >
                      <i className="bi bi-arrow-left" aria-hidden="true" />
                    </button>
                    <h2><span className='smallDisplayNone'>Manage</span> Core Members</h2>
                  </div>

                  <div className="admin-event-actions">
                    <button
                      type="button"
                      className="admin-secondary-button mt-auto"
                      onClick={loadCoreMembers}
                      disabled={coreMembersLoading}
                    >
                      <i
                        className="bi bi-arrow-clockwise"
                        aria-hidden="true"
                      />
                      <span className="smallDisplayNone">Refresh</span>
                    </button>

                    <button
                      type="button"
                      className="auth-submit"
                      onClick={openCreateCoreMemberForm}
                    >
                      <i className="bi bi-plus-lg" aria-hidden="true" />
                      <span className="smallDisplayNone">Add New</span>
                    </button>
                  </div>
                </div>

                <div className="admin-event-filters">
                  <label className="admin-event-search">
                    <i className="bi bi-search" aria-hidden="true" />
                    <input
                      id="core-member-search"
                      type="search"
                      value={coreMemberSearch}
                      onChange={(event) => setCoreMemberSearch(event.target.value)}
                      placeholder="Search core members"
                      aria-label="Search core members"
                    />
                  </label>
                </div>

                {coreMembersLoading ? (
                  <p className="admin-empty">Loading core members...</p>
                ) : coreMembers.filter((member) => {
                  const query = coreMemberSearch.trim().toLowerCase();
                  return (
                    member.name?.toLowerCase().includes(query) ||
                    member.role?.toLowerCase().includes(query)
                  );
                }).length === 0 ? (
                  <p className="admin-empty">
                    {coreMembers.length === 0
                      ? 'No core members added yet.'
                      : 'No members match your search.'}
                  </p>
                ) : (
                  <div className="admin-event-list admin-core-member-list">
                    {coreMembers
                      .filter((member) => {
                        const query = coreMemberSearch.trim().toLowerCase();
                        return (
                          member.name?.toLowerCase().includes(query) ||
                          member.role?.toLowerCase().includes(query)
                        );
                      })
                      .map((member) => (
                        <article className="admin-event-item admin-core-member-item" key={member._id}>
                          {member.image?.url ? (
                            <img
                              className="admin-core-member-avatar"
                              src={member.image.url}
                              alt={member.name}
                            />
                          ) : (
                            <div className="admin-core-member-avatar admin-core-member-fallback">
                              {member.name?.charAt(0)?.toUpperCase() || '?'}
                            </div>
                          )}

                          <div className="admin-core-member-card-content">
                            <h3>{member.name}</h3>
                            <p className="core-member-role">{member.role}</p>

                            {member.link && (
                              <a
                                className="core-member-supporting-link"
                                href={member.link}
                                target="_blank"
                                rel="noopener noreferrer"
                              >
                                <i className="bi bi-box-arrow-up-right" aria-hidden="true" />
                                <span>View profile</span>
                              </a>
                            )}

                            <div className="admin-event-actions admin-core-member-actions">
                              <button
                                type="button"
                                className="admin-secondary-button"
                                onClick={() => editCoreMember(member)}
                              >
                                <i className="bi bi-pencil" aria-hidden="true" /> Edit
                              </button>
                              <button
                                type="button"
                                className="admin-secondary-button"
                                onClick={() => deleteCoreMember(member)}
                              >
                                <i className="bi bi-trash" aria-hidden="true" /> Delete
                              </button>
                            </div>
                          </div>
                        </article>
                      ))}
                  </div>
                )}
              </section>
            )}
          </>
        )}

      </div>
    </main>
  );
}

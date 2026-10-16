
import React, { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { apiRequest } from '../lib/api';
import { useAuth } from '../context/AuthContext';

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

  const now = new Date();

  const publishedEvents = events.filter(
    (event) => event.status === 'published'
  );

  const upcomingEvents = publishedEvents.filter(
    (event) => new Date(event.date) >= now
  );

  const pastEvents = publishedEvents.filter(
    (event) => new Date(event.endDate || event.date) < now
  );

  const loadSummary = useCallback(async () => {
    try {
      const data = await apiRequest('/events/admin/summary');
      setSummary(data);
    } catch (err) {
      console.error('Unable to load dashboard summary:', err.message);
    }
  }, []);

  const loadEvents = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      const data = await apiRequest('/events/admin/all');
      setEvents(data.events);
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

  const loadAttendance = useCallback(async () => {
    if (!selectedAttendanceEvent) {
      setAttendanceRows([]);
      return;
    }

    setAttendanceLoading(true);

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

  useEffect(() => {
    if (activeSection === 'members') {
      loadMembers();
    }
  }, [activeSection, loadMembers]);

  useEffect(() => {
    if (activeSection === 'members' && selectedAttendanceEvent) {
      loadAttendance();
    }
  }, [activeSection, selectedAttendanceEvent, loadAttendance]);

  useEffect(() => {
    if (activeSection !== 'members' || events.length === 0) {
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
      (row) => String(row._id) === String(member._id)
    );

    return record?.status === 'present';
  }).length;

  const absentCount = members.length - presentCount;

  return (
    <main className="admin-page">
      <header className="admin-topbar">
        <Link to="/" className="auth-brand">
          Code<span>Sphere</span>
        </Link>

        <div className="admin-topbar-actions">
          <span>{user?.name}</span>
          <button
            type="button"
            className="admin-logout"
            onClick={handleLogout}
          >
            Sign Out
          </button>
        </div>
      </header>

      <div className="admin-container">
        <div className="admin-heading">
          <div>
            <p className="auth-eyebrow">ADMINISTRATION</p>
            <p>
              Manage CodeSphere events, members attendance and publish
              updates for members.
            </p>
          </div>
        </div>

        <nav className="admin-section-nav" aria-label="Admin sections">
          <button
            type="button"
            className={activeSection === 'home' ? 'active' : ''}
            onClick={() => setActiveSection('home')}
            aria-current={activeSection === 'home' ? 'page' : undefined}
          >
            <i className="bi bi-house-door" aria-hidden="true" />
            Home
          </button>

          <button
            type="button"
            className={activeSection === 'events' ? 'active' : ''}
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
            aria-current={activeSection === 'events' ? 'page' : undefined}
          >
            <i className="bi bi-calendar-event" aria-hidden="true" />
            Events
          </button>

          <button
            type="button"
            className={activeSection === 'members' ? 'active' : ''}
            onClick={() => setActiveSection('members')}
            aria-current={activeSection === 'members' ? 'page' : undefined}
          >
            <i className="bi bi-check2-square" aria-hidden="true" />
            Attendance
          </button>
        </nav>

        {activeSection === 'home' && (
          <section className="admin-home">
            <div className="admin-section-heading">
              <div>
                <h2>Dashboard Overview</h2>
                <p className="admin-panel-subtitle">
                  Here's what's happening in your CodeSphere community.
                </p>
              </div>
            </div>

            <div className="admin-stats-grid">
              <article className="admin-stat-card">
                <div className="admin-stat-icon">
                  <i className="bi bi-calendar-event" aria-hidden="true" />
                </div>
                <p>Total Events</p>
                <strong>{summary.totalEvents}</strong>
                <span>Including drafts</span>
              </article>

              <article className="admin-stat-card">
                <div className="admin-stat-icon">
                  <i className="bi bi-calendar-check" aria-hidden="true" />
                </div>
                <p>Upcoming Events</p>
                <strong>{summary.upcomingEvents}</strong>
                <span>Published events</span>
              </article>

              <article className="admin-stat-card">
                <div className="admin-stat-icon">
                  <i className="bi bi-calendar-x" aria-hidden="true" />
                </div>
                <p>Past Events</p>
                <strong>{summary.pastEvents}</strong>
                <span>Published events</span>
              </article>

              <article className="admin-stat-card">
                <div className="admin-stat-icon">
                  <i className="bi bi-people" aria-hidden="true" />
                </div>
                <p>Registered Members</p>
                <strong>{summary.totalMembers}</strong>
                <span>Registered Members</span>
              </article>
            </div>

            <section className="admin-panel admin-home-events">
              <div className="admin-section-heading">
                <h2>Upcoming Events</h2>
                <button
                  type="button"
                  className="admin-secondary-button"
                  onClick={() => setActiveSection('events')}
                >
                  Manage Events
                  <i className="bi bi-arrow-right ms-2" aria-hidden="true" />
                </button>
              </div>

              {loading ? (
                <p className="admin-empty">Loading events...</p>
              ) : upcomingEvents.length === 0 ? (
                <p className="admin-empty">
                  No upcoming published events.
                </p>
              ) : (
                <div className="admin-event-list">
                  {[...upcomingEvents]
                    .sort((a, b) => new Date(a.date) - new Date(b.date))
                    .slice(0, 5)
                    .map((event) => (
                      <article className="admin-event-item" key={event._id}>
                        <div className="admin-event-info">
                          <div className="admin-event-meta">
                            <span>{event.category}</span>
                            <span className="admin-status published">
                              Published
                            </span>
                          </div>
                          <h3>{event.title}</h3>
                          <p>{new Date(event.date).toLocaleString()}</p>
                          <p>{event.venue || event.mode}</p>
                        </div>
                      </article>
                    ))}
                </div>
              )}
            </section>
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
                <div className="admin-section-heading">
                  <h2>Manage Events</h2>

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
                      />{' '}
                      Refresh
                    </button>

                    <button
                      type="button"
                      className="auth-submit"
                      onClick={openCreateForm}
                    >
                      <i className="bi bi-plus-lg" aria-hidden="true" />{' '}
                      Create Event
                    </button>
                  </div>
                </div>

                {loading ? (
                  <p className="admin-empty">Loading events...</p>
                ) : events.length === 0 ? (
                  <p className="admin-empty">
                    No events yet. Click Create Event to add your first event.
                  </p>
                ) : (
                  <div className="admin-event-list">
                    {events.map((event) => (
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

        {activeSection === 'members' && (
          <section className="admin-panel admin-members-panel">
            <div className="admin-section-heading">
              <div>
                <h2>Member Attendance</h2>
                <p className="admin-panel-subtitle">
                  Manage  attendance
                  records for individual events.
                </p>
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
              <div className="admin-form-field">
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

              <button
                type="button"
                className="admin-secondary-button mt-5"
                onClick={() => {
                  loadMembers();
                  loadAttendance();
                }}
                disabled={membersLoading || attendanceLoading}
              >
                <i className="bi bi-arrow-clockwise" aria-hidden="true" />{' '}
                Refresh
              </button>
            </div>

            <div className="admin-attendance-summary">
              <article className="admin-attendance-stat">
                <span>Total</span>
                <strong>{members.length}</strong>
              </article>

              <article className="admin-attendance-stat">
                <span>Present</span>
                <strong>{presentCount}</strong>
              </article>

              <article className="admin-attendance-stat">
                <span>Absent</span>
                <strong>{absentCount}</strong>
              </article>
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
                    (row) => String(row._id) === String(member._id)
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
                            className={`admin-toggle-option present-option ${
                              status === 'present' ? 'active' : ''
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
                            className={`admin-toggle-option absent-option ${
                              status === 'absent' ? 'active' : ''
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
          </section>
        )}
      </div>
    </main>
  );
}

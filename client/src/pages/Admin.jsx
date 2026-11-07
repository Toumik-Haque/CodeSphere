import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { apiRequest } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import Navbar from '../components/Navbar';
import logo from '../assets/logo.svg';
import '../css/Admin.css';
import { Editor } from '@tinymce/tinymce-react';
import AdminBadgeAwards from '../components/AdminBadgeAwards';
import AdminStaffRoles from '../components/AdminStaffRoles';

const initialForm = {
  title: '',
  category: 'Workshop',
  description: '',
  date: '',
  endDate: '',
  venue: '',
  mode: 'In-person',
  meetingLink: '',
  registrationLink: '',
  linkedinPostLink: '',
  instagramPostLink: '',
  status: 'draft',
};

const initialCoreMemberForm = {
  name: '',
  role: '',
  githubLink: '',
  linkedinLink: '',
  instagramLink: '',
};

const categories = [
  'Workshop',
  'Hackathon',
  'Community Meetup',
];

const MAX_IMAGE_SIZE = 5 * 1024 * 1024;

function toDateTimeLocal(value) {
  if (!value) return '';

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return '';

  const offset = date.getTimezoneOffset() * 60000;

  return new Date(date.getTime() - offset)
    .toISOString()
    .slice(0, 16);
}

function isValidOptionalUrl(value) {
  if (!value.trim()) return true;

  try {
    const url = new URL(value.trim());
    return ['http:', 'https:'].includes(url.protocol);
  } catch {
    return false;
  }
}

function getInitial(name) {
  return name?.trim()?.charAt(0)?.toUpperCase() || 'A';
}

function formatDate(value) {
  if (!value) return 'Date unavailable';

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return 'Date unavailable';

  return date.toLocaleString(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export default function Admin() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  // --------------------------------------------------
  // MAIN NAVIGATION
  // --------------------------------------------------

  const [activeSection, setActiveSection] = useState('home');
  const [activeEventTab, setActiveEventTab] = useState('manage');

  // --------------------------------------------------
  // GLOBAL FEEDBACK
  // --------------------------------------------------

  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  function clearFeedback() {
    setError('');
    setMessage('');
  }

  // --------------------------------------------------
  // EVENTS
  // --------------------------------------------------

  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState(initialForm);
  const [editingId, setEditingId] = useState(null);

  const [selectedImage, setSelectedImage] = useState(null);
  const [imagePreview, setImagePreview] = useState('');
  const [removeEventImage, setRemoveEventImage] = useState(false);

  const eventImageInputRef = useRef(null);
  const eventPreviewUrlRef = useRef(null);

  const [eventSearch, setEventSearch] = useState('');
  const [eventCategory, setEventCategory] = useState('all');

  const [summary, setSummary] = useState({
    totalMembers: 0,
    totalEvents: 0,
    upcomingEvents: 0,
    pastEvents: 0,
  });

  const clearEventImagePreview = useCallback(() => {
    if (eventPreviewUrlRef.current) {
      URL.revokeObjectURL(eventPreviewUrlRef.current);
      eventPreviewUrlRef.current = null;
    }

    setSelectedImage(null);
    setImagePreview('');
  }, []);

  const createEventPreview = useCallback((file) => {
    if (eventPreviewUrlRef.current) {
      URL.revokeObjectURL(eventPreviewUrlRef.current);
    }

    const url = URL.createObjectURL(file);

    eventPreviewUrlRef.current = url;
    setImagePreview(url);
  }, []);

  const loadSummary = useCallback(async () => {
    try {
      const data = await apiRequest('/events/admin/summary');

      setSummary((current) => ({
        ...current,
        ...data,
      }));
    } catch (err) {
      console.error('Unable to load dashboard summary:', err.message);
    }
  }, []);

  const loadEvents = useCallback(async () => {
    setLoading(true);

    try {
      const data = await apiRequest('/events/admin/all');

      setEvents(Array.isArray(data.events) ? data.events : []);

      await loadSummary();
    } catch (err) {
      setError(err.message || 'Unable to load events.');
    } finally {
      setLoading(false);
    }
  }, [loadSummary]);

  function updateField(event) {
    const { name, value } = event.target;

    setForm((current) => ({
      ...current,
      [name]: value,
    }));
  }

  function resetEventForm() {
    clearEventImagePreview();

    setForm(initialForm);
    setEditingId(null);
    setRemoveEventImage(false);

    if (eventImageInputRef.current) {
      eventImageInputRef.current.value = '';
    }
  }

  function openCreateForm() {
    resetEventForm();
    clearFeedback();
    setActiveEventTab('form');
  }

  function startEditing(event) {
    clearEventImagePreview();

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
      registrationLink: event.registrationLink || '',
      linkedinPostLink: event.linkedinPostLink || '',
      instagramPostLink: event.instagramPostLink || '',
      status: event.status || 'draft',
    });

    setSelectedImage(null);
    setImagePreview(event.bannerImage?.url || '');
    setRemoveEventImage(false);

    if (eventImageInputRef.current) {
      eventImageInputRef.current.value = '';
    }

    clearFeedback();
    setActiveEventTab('form');

    window.scrollTo({
      top: 0,
      behavior: 'smooth',
    });
  }

  function handleEventImageChange(event) {
    const file = event.target.files?.[0];

    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setError('Please select a valid image.');
      event.target.value = '';
      return;
    }

    if (file.size > MAX_IMAGE_SIZE) {
      setError('Image must be 5 MB or smaller.');
      event.target.value = '';
      return;
    }

    setError('');
    setSelectedImage(file);
    createEventPreview(file);
    setRemoveEventImage(false);
  }

  function removeCurrentEventImage() {
    clearEventImagePreview();

    setRemoveEventImage(Boolean(editingId));

    if (eventImageInputRef.current) {
      eventImageInputRef.current.value = '';
    }
  }

  function cancelEditing() {
    resetEventForm();
    clearFeedback();
    setActiveEventTab('manage');
  }

  async function handleSubmit(event) {
    event.preventDefault();
    clearFeedback();

    if (!form.title.trim()) {
      setError('Please enter an event title.');
      return;
    }

    if (!form.date || Number.isNaN(new Date(form.date).getTime())) {
      setError('Please provide a valid event start date and time.');
      return;
    }

    if (
      form.endDate &&
      new Date(form.endDate) < new Date(form.date)
    ) {
      setError('The end date and time must be after the start date.');
      return;
    }

    if (form.mode === 'In-person' && !form.venue.trim()) {
      setError('Please enter the event venue.');
      return;
    }

    if (form.mode === 'Online' && !form.meetingLink.trim()) {
      setError('Please enter the meeting link.');
      return;
    }

    if (
      form.mode !== 'In-person' &&
      form.meetingLink.trim() &&
      !isValidOptionalUrl(form.meetingLink)
    ) {
      setError('Meeting link must be a valid HTTP or HTTPS URL.');
      return;
    }

    const optionalLinks = [
      ['Registration link', form.registrationLink],
      ['LinkedIn post link', form.linkedinPostLink],
      ['Instagram post link', form.instagramPostLink],
    ];

    for (const [label, value] of optionalLinks) {
      if (!isValidOptionalUrl(value)) {
        setError(`${label} must be a valid HTTP or HTTPS URL.`);
        return;
      }
    }

    setSaving(true);

    try {
      const formData = new FormData();

      formData.append('title', form.title.trim());
      formData.append('category', form.category);
      formData.append('description', form.description);
      formData.append('date', new Date(form.date).toISOString());

      formData.append(
        'endDate',
        form.endDate
          ? new Date(form.endDate).toISOString()
          : ''
      );

      formData.append('venue', form.venue.trim());
      formData.append('mode', form.mode);
      formData.append('meetingLink', form.meetingLink.trim());
      formData.append('registrationLink', form.registrationLink.trim());
      formData.append('linkedinPostLink', form.linkedinPostLink.trim());
      formData.append('instagramPostLink', form.instagramPostLink.trim());
      formData.append('status', form.status);

      if (selectedImage) {
        formData.append('bannerImage', selectedImage);
      }

      if (editingId && removeEventImage) {
        formData.append('removeBannerImage', 'true');
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

      resetEventForm();
      setActiveEventTab('manage');

      setMessage(result.message || 'Event saved successfully.');

      await loadEvents();
    } catch (err) {
      setError(err.message || 'Unable to save event.');
    } finally {
      setSaving(false);
    }
  }

  async function togglePublish(event) {
    clearFeedback();

    try {
      const status =
        event.status === 'published'
          ? 'draft'
          : 'published';

      const result = await apiRequest(`/events/${event._id}`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      });

      setMessage(result.message || 'Event status updated.');

      await loadEvents();
    } catch (err) {
      setError(err.message || 'Unable to update event status.');
    }
  }

  async function deleteEvent(event) {
    const confirmed = window.confirm(
      `Delete "${event.title}" permanently?`
    );

    if (!confirmed) return;

    clearFeedback();

    try {
      const result = await apiRequest(`/events/${event._id}`, {
        method: 'DELETE',
      });

      if (editingId === event._id) {
        resetEventForm();
        setActiveEventTab('manage');
      }

      setMessage(result.message || 'Event deleted successfully.');

      await loadEvents();
    } catch (err) {
      setError(err.message || 'Unable to delete event.');
    }
  }

  const filteredEvents = useMemo(() => {
    const query = eventSearch.trim().toLowerCase();

    return events.filter((event) => {
      const matchesSearch =
        `${event.title || ''} ${event.venue || ''}`
          .toLowerCase()
          .includes(query);

      const matchesCategory =
        eventCategory === 'all' ||
        (event.category || '').toLowerCase() ===
        eventCategory.toLowerCase();

      return matchesSearch && matchesCategory;
    });
  }, [events, eventSearch, eventCategory]);

  // --------------------------------------------------
  // CORE MEMBERS
  // --------------------------------------------------

  const [coreMembers, setCoreMembers] = useState([]);
  const [coreMembersLoading, setCoreMembersLoading] = useState(false);
  const [coreMemberSaving, setCoreMemberSaving] = useState(false);

  const [activeCoreMemberTab, setActiveCoreMemberTab] = useState('manage');
  const showCoreMemberForm = activeCoreMemberTab === 'form';
  const [coreMemberForm, setCoreMemberForm] = useState(initialCoreMemberForm);
  const [editingCoreMemberId, setEditingCoreMemberId] = useState(null);

  const [coreMemberImage, setCoreMemberImage] = useState(null);
  const [coreMemberImagePreview, setCoreMemberImagePreview] = useState('');
  const [removeCoreMemberImage, setRemoveCoreMemberImage] = useState(false);

  const [coreMemberSearch, setCoreMemberSearch] = useState('');

  const coreMemberImageInputRef = useRef(null);
  const coreMemberPreviewUrlRef = useRef(null);

  const clearCoreMemberImagePreview = useCallback(() => {
    if (coreMemberPreviewUrlRef.current) {
      URL.revokeObjectURL(coreMemberPreviewUrlRef.current);
      coreMemberPreviewUrlRef.current = null;
    }

    setCoreMemberImage(null);
    setCoreMemberImagePreview('');
  }, []);

  const createCoreMemberPreview = useCallback((file) => {
    if (coreMemberPreviewUrlRef.current) {
      URL.revokeObjectURL(coreMemberPreviewUrlRef.current);
    }

    const url = URL.createObjectURL(file);

    coreMemberPreviewUrlRef.current = url;
    setCoreMemberImagePreview(url);
  }, []);

  const loadCoreMembers = useCallback(async () => {
    setCoreMembersLoading(true);

    try {
      const data = await apiRequest('/core-members');

      setCoreMembers(
        Array.isArray(data.members) ? data.members : []
      );
    } catch (err) {
      setError(err.message || 'Unable to load core members.');
    } finally {
      setCoreMembersLoading(false);
    }
  }, []);

  function updateCoreMemberField(event) {
    const { name, value } = event.target;

    setCoreMemberForm((current) => ({
      ...current,
      [name]: value,
    }));
  }

  function resetCoreMemberForm() {
    clearCoreMemberImagePreview();

    setCoreMemberForm(initialCoreMemberForm);
    setEditingCoreMemberId(null);
    setRemoveCoreMemberImage(false);

    if (coreMemberImageInputRef.current) {
      coreMemberImageInputRef.current.value = '';
    }
  }

  function openCreateCoreMemberForm() {
    resetCoreMemberForm();
    clearFeedback();
    setActiveCoreMemberTab('form');
  }

  function cancelCoreMemberEditing() {
    resetCoreMemberForm();
    clearFeedback();
    setActiveCoreMemberTab('manage');
  }

  function editCoreMember(member) {
    clearCoreMemberImagePreview();

    setCoreMemberForm({
      name: member.name || '',
      role: member.role || '',
      githubLink: member.githubLink || '',
      linkedinLink: member.linkedinLink || '',
      instagramLink: member.instagramLink || '',
    });

    setEditingCoreMemberId(member._id);
    setCoreMemberImage(null);
    setCoreMemberImagePreview(member.image?.url || '');
    setRemoveCoreMemberImage(false);
    setActiveCoreMemberTab('form');

    if (coreMemberImageInputRef.current) {
      coreMemberImageInputRef.current.value = '';
    }

    clearFeedback();

    window.scrollTo({
      top: 0,
      behavior: 'smooth',
    });
  }

  function handleCoreMemberImageChange(event) {
    const file = event.target.files?.[0];

    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setError('Please select a valid image.');
      event.target.value = '';
      return;
    }

    if (file.size > MAX_IMAGE_SIZE) {
      setError('Image must be 5 MB or smaller.');
      event.target.value = '';
      return;
    }

    setError('');
    setCoreMemberImage(file);
    createCoreMemberPreview(file);
    setRemoveCoreMemberImage(false);
  }

  function removeCurrentCoreMemberImage() {
    clearCoreMemberImagePreview();

    setRemoveCoreMemberImage(Boolean(editingCoreMemberId));

    if (coreMemberImageInputRef.current) {
      coreMemberImageInputRef.current.value = '';
    }
  }

  async function saveCoreMember(event) {
    event.preventDefault();
    clearFeedback();

    if (
      !coreMemberForm.name.trim() ||
      !coreMemberForm.role.trim()
    ) {
      setError('Please enter the member name and role.');
      return;
    }

    if (!editingCoreMemberId && !coreMemberImage) {
      setError('Please upload a profile image.');
      return;
    }

    const optionalLinks = [
      ['GitHub profile link', coreMemberForm.githubLink],
      ['LinkedIn profile link', coreMemberForm.linkedinLink],
      ['Instagram profile link', coreMemberForm.instagramLink],
    ];

    for (const [label, value] of optionalLinks) {
      if (!isValidOptionalUrl(value)) {
        setError(`${label} must be a valid HTTP or HTTPS URL.`);
        return;
      }
    }

    setCoreMemberSaving(true);

    try {
      const formData = new FormData();

      formData.append('name', coreMemberForm.name.trim());
      formData.append('role', coreMemberForm.role.trim());
      formData.append('githubLink', coreMemberForm.githubLink.trim());
      formData.append('linkedinLink', coreMemberForm.linkedinLink.trim());
      formData.append('instagramLink', coreMemberForm.instagramLink.trim());

      if (coreMemberImage) {
        formData.append('image', coreMemberImage);
      }

      if (editingCoreMemberId && removeCoreMemberImage) {
        formData.append('removeImage', 'true');
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

      resetCoreMemberForm();
      setActiveCoreMemberTab('manage');

      setMessage(result.message || 'Core member saved successfully.');

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

    clearFeedback();

    try {
      const result = await apiRequest(`/core-members/${member._id}`, {
        method: 'DELETE',
      });

      if (editingCoreMemberId === member._id) {
        resetCoreMemberForm();
        setActiveCoreMemberTab('manage');
      }

      setMessage(result.message || 'Core member deleted successfully.');

      await loadCoreMembers();
    } catch (err) {
      setError(err.message || 'Unable to delete core member.');
    }
  }

  const filteredCoreMembers = useMemo(() => {
    const query = coreMemberSearch.trim().toLowerCase();

    return coreMembers.filter((member) => (
      (member.name || '').toLowerCase().includes(query) ||
      (member.role || '').toLowerCase().includes(query)
    ));
  }, [coreMembers, coreMemberSearch]);

  // --------------------------------------------------
  // USERS
  // --------------------------------------------------

  const [users, setUsers] = useState([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [userSearch, setUserSearch] = useState('');

  const loadUsers = useCallback(async () => {
    setUsersLoading(true);

    try {
      const query = userSearch.trim()
        ? `?search=${encodeURIComponent(userSearch.trim())}`
        : '';

      const data = await apiRequest(`/users/admin/all${query}`);

      setUsers(Array.isArray(data.users) ? data.users : []);
    } catch (err) {
      setError(err.message || 'Unable to load registered users.');
    } finally {
      setUsersLoading(false);
    }
  }, [userSearch]);

  // --------------------------------------------------
  // ATTENDANCE
  // --------------------------------------------------

  const [members, setMembers] = useState([]);
  const [memberSearch, setMemberSearch] = useState('');
  const [membersLoading, setMembersLoading] = useState(false);

  const [selectedAttendanceEvent, setSelectedAttendanceEvent] = useState('');
  const [attendanceRows, setAttendanceRows] = useState([]);
  const [attendanceLoading, setAttendanceLoading] = useState(false);
  const [attendanceSavingId, setAttendanceSavingId] = useState('');

  const loadMembers = useCallback(async () => {
    setMembersLoading(true);

    try {
      const query = memberSearch.trim()
        ? `?search=${encodeURIComponent(memberSearch.trim())}`
        : '';

      const data = await apiRequest(
        `/events/admin/members${query}`
      );

      setMembers(Array.isArray(data.members) ? data.members : []);
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

      setAttendanceRows(
        Array.isArray(data.attendance) ? data.attendance : []
      );
    } catch (err) {
      setError(err.message || 'Unable to load attendance.');
    } finally {
      setAttendanceLoading(false);
    }
  }, [selectedAttendanceEvent]);

  async function updateAttendance(userId, status) {
    if (!selectedAttendanceEvent) {
      setError('Select an event first.');
      return;
    }

    clearFeedback();
    setAttendanceSavingId(userId);

    try {
      const result = await apiRequest(
        `/events/admin/${selectedAttendanceEvent}/attendance/${userId}`,
        {
          method: 'PATCH',
          body: JSON.stringify({ status }),
        }
      );

      setMessage(
        result.message || 'Attendance updated successfully.'
      );

      await loadAttendance();
    } catch (err) {
      setError(err.message || 'Unable to update attendance.');
    } finally {
      setAttendanceSavingId('');
    }
  }

  const getAttendanceStatus = useCallback((member) => {
    const record = attendanceRows.find(
      (row) =>
        String(row._id ?? row.userId ?? row.memberId) ===
        String(member._id)
    );

    return record?.status || 'absent';
  }, [attendanceRows]);

  const presentCount = useMemo(() => {
    return members.filter(
      (member) => getAttendanceStatus(member) === 'present'
    ).length;
  }, [members, getAttendanceStatus]);

  const absentCount = Math.max(0, members.length - presentCount);

  const attendancePercentage = members.length
    ? Math.round((presentCount / members.length) * 100)
    : 0;

  // --------------------------------------------------
  // EFFECTS
  // --------------------------------------------------

  useEffect(() => {
    loadEvents();
  }, [loadEvents]);

  useEffect(() => {
    if (activeSection === 'users') {
      loadUsers();
    }
  }, [activeSection, loadUsers]);

  useEffect(() => {
    if (activeSection === 'home' || activeSection === 'coreMembers') {
      loadCoreMembers();
    }
  }, [activeSection, loadCoreMembers]);

  useEffect(() => {
    if (activeSection === 'attendance') {
      loadMembers();
    }
  }, [activeSection, loadMembers]);

  useEffect(() => {
    if (activeSection === 'attendance' && selectedAttendanceEvent) {
      loadAttendance();
    } else if (!selectedAttendanceEvent) {
      setAttendanceRows([]);
    }
  }, [activeSection, selectedAttendanceEvent, loadAttendance]);

  useEffect(() => {
    if (activeSection !== 'attendance' || events.length === 0) {
      return;
    }

    if (!selectedAttendanceEvent) {
      const firstEvent =
        events.find((event) => event.status === 'published') ||
        events[0];

      setSelectedAttendanceEvent(firstEvent._id);
    }
  }, [activeSection, events, selectedAttendanceEvent]);

  useEffect(() => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth',
    });
  }, [activeSection]);

  // Revoke temporary image URLs when the component unmounts.
  useEffect(() => {
    return () => {
      if (eventPreviewUrlRef.current) {
        URL.revokeObjectURL(eventPreviewUrlRef.current);
      }

      if (coreMemberPreviewUrlRef.current) {
        URL.revokeObjectURL(coreMemberPreviewUrlRef.current);
      }
    };
  }, []);

  // --------------------------------------------------
  // NAVIGATION HELPERS
  // --------------------------------------------------

  function handleLogout() {
    logout();
    navigate('/login', { replace: true });
  }

  function goToSection(section) {
    clearFeedback();

    if (section !== 'events' && activeEventTab === 'form') {
      resetEventForm();
      setActiveEventTab('manage');
    }

    if (section !== 'coreMembers' && activeCoreMemberTab === 'form') {
      resetCoreMemberForm();
      setActiveCoreMemberTab('manage');
    }

    setActiveSection(section);
  }

  function goBackToDashboard() {
    if (activeSection === 'events' && activeEventTab === 'form') {
      cancelEditing();
      return;
    }

    if (activeSection === 'coreMembers' && activeCoreMemberTab === 'form') {
      cancelCoreMemberEditing();
      return;
    }

    goToSection('home');
  }

  // --------------------------------------------------
  // REUSABLE NAVIGATION BUTTON
  // --------------------------------------------------

  function NavigationButton({ section, icon, children }) {
    return (
      <button
        type="button"
        className={`admin-nav-item ${activeSection === section ? 'active' : ''
          }`}
        onClick={() => goToSection(section)}
        aria-current={activeSection === section ? 'page' : undefined}
      >
        <i className={icon} aria-hidden="true" />
        <span>{children}</span>
      </button>
    );
  }

  // --------------------------------------------------
  // RENDER
  // --------------------------------------------------

  const pageTitle = {
    home: 'Dashboard',
    events:
      activeEventTab === 'form'
        ? editingId
          ? 'Edit Event'
          : 'Create Event'
        : 'Events',
    users: 'Users',
    attendance: 'Attendance',
    coreMembers: showCoreMemberForm
      ? editingCoreMemberId
        ? 'Edit Core Member'
        : 'Add Core Member'
      : 'Core Members',
  }[activeSection];

  return (
    <>
      <Navbar />

      <main className="admin-page">
        {/* ================================================
          DESKTOP SIDEBAR
         ================================================ */}
        <aside className="admin-sidebar">
          <Link to="/">
            <img src={logo} alt="Codesphere Logo" />
          </Link>

          <div className="admin-sidebar-label">
            WORKSPACE
          </div>

          <nav
            className="admin-navigation"
            aria-label="Admin navigation"
          >
            <NavigationButton
              section="home"
              icon="bi bi-grid-1x2-fill"
            >
              Dashboard
            </NavigationButton>

            <NavigationButton
              section="events"
              icon="bi bi-calendar-event"
            >
              Events
            </NavigationButton>

            <NavigationButton
              section="users"
              icon="bi bi-person-lines-fill"
            >
              Users
            </NavigationButton>

            <NavigationButton
              section="attendance"
              icon="bi bi-clipboard-check"
            >
              Attendance
            </NavigationButton>

            <NavigationButton
              section="coreMembers"
              icon="bi bi-people"
            >
              Core Members
            </NavigationButton>
          </nav>

          <div className="admin-sidebar-bottom">
            <div className="admin-profile">
              <div className="admin-profile-avatar">
                {getInitial(user?.name)}
              </div>

              <div className="admin-profile-info">
                <strong>{user?.name || 'Administrator'}</strong>
                <span>Administrator</span>
              </div>
            </div>

            <button
              type="button"
              className="admin-sidebar-logout"
              onClick={handleLogout}
            >
              <i className="bi bi-box-arrow-right" aria-hidden="true" />
              <span>Sign Out</span>
            </button>
          </div>
        </aside>

        {/* ================================================
          MAIN WORKSPACE
      ================================================ */}
        <div className="admin-main">

          <div className="admin-container">

            {/* GLOBAL FEEDBACK */}
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

            {/* ============================================
                DASHBOARD
            ============================================ */}
            {activeSection === 'home' && (
              <section className="admin-home">

                <div className="admin-heading">
                  <div>
                    <p className="auth-eyebrow">
                      CODESPHERE ADMIN
                    </p>

                    <h2>Welcome back, {user?.name?.split(' ')[0] || 'Admin'}!</h2>

                    <p>
                      Manage your events, members and community activity
                      from one place.
                    </p>
                  </div>
                </div>

                {/* COMMUNITY TOOLS (separate staff pages) */}
                <div className="admin-tools" aria-label="Community tools">
                  <Link to="/admin/forum" className="admin-tool">
                    <i className="bi bi-shield-lock" aria-hidden="true" />
                    <span><strong>Forum moderation</strong><small>Report queue, actions and audit trail</small></span>
                  </Link>
                  <Link to="/admin/news" className="admin-tool">
                    <i className="bi bi-newspaper" aria-hidden="true" />
                    <span><strong>Tech News editor</strong><small>Review stories, sources and weekly digests</small></span>
                  </Link>
                  <Link to="/admin/projects" className="admin-tool">
                    <i className="bi bi-kanban" aria-hidden="true" />
                    <span><strong>Project submissions</strong><small>Review, publish and feature Project Hub entries</small></span>
                  </Link>
                  <Link to="/admin/review" className="admin-tool">
                    <i className="bi bi-inbox" aria-hidden="true" />
                    <span><strong>Review hosted listings</strong><small>Approve or reject events and hackathons from students</small></span>
                  </Link>
                  <Link to="/admin/hackathons" className="admin-tool">
                    <i className="bi bi-trophy" aria-hidden="true" />
                    <span><strong>Hackathons</strong><small>Run club hackathons and judge projects</small></span>
                  </Link>
                  <Link to="/admin/materials" className="admin-tool">
                    <i className="bi bi-journal-bookmark" aria-hidden="true" />
                    <span><strong>Study Guide</strong><small>Write and publish learning materials</small></span>
                  </Link>
                  <Link to="/admin/reverse-coding" className="admin-tool">
                    <i className="bi bi-arrow-repeat" aria-hidden="true" />
                    <span><strong>Reverse Coding</strong><small>Author, validate and publish challenges</small></span>
                  </Link>
                </div>

                {/* OVERVIEW */}
                <div className="admin-dashboard-heading">
                  <div>
                    <h2>Overview</h2>

                    <p className="admin-panel-subtitle">
                      A quick look at your CodeSphere community.
                    </p>
                  </div>
                </div>

                <div className="admin-stats-grid admin-stats-compact">

                  <article className="admin-stat-card">
                    <div className="admin-stat-icon">
                      <i className="bi bi-calendar-event" aria-hidden="true" />
                    </div>

                    <p>Total Events</p>
                    <strong>{summary.totalEvents}</strong>
                  </article>

                  <article className="admin-stat-card">
                    <div className="admin-stat-icon">
                      <i className="bi bi-calendar-check" aria-hidden="true" />
                    </div>

                    <p>Upcoming Events</p>
                    <strong>{summary.upcomingEvents}</strong>
                  </article>

                  <article className="admin-stat-card">
                    <div className="admin-stat-icon">
                      <i className="bi bi-people" aria-hidden="true" />
                    </div>

                    <p>Registered Users</p>
                    <strong>{summary.totalMembers}</strong>
                  </article>

                  <article className="admin-stat-card">
                    <div className="admin-stat-icon">
                      <i className="bi bi-person-badge" aria-hidden="true" />
                    </div>

                    <p>Core Members</p>
                    <strong>{coreMembers.length}</strong>
                  </article>

                </div>

                {/* RECENT EVENTS */}
                <div className="admin-dashboard-heading mt-4">
                  <div>
                    <h2>Recent Events</h2>

                    <p className="admin-panel-subtitle">
                      Your latest event activity.
                    </p>
                  </div>

                  <button
                    type="button"
                    className="admin-secondary-button"
                    onClick={() => goToSection('events')}
                  >
                    View all events
                    <i className="bi bi-arrow-right" aria-hidden="true" />
                  </button>
                </div>

                {loading ? (
                  <p className="admin-empty">Loading events...</p>
                ) : events.length === 0 ? (
                  <div className="admin-empty">
                    <i className="bi bi-calendar-plus" aria-hidden="true" />
                    <p>No events have been created yet.</p>

                    <button
                      type="button"
                      className="auth-submit"
                      onClick={() => {
                        goToSection('events');
                        openCreateForm();
                      }}
                    >
                      <i className="bi bi-plus-lg" aria-hidden="true" />
                      Create your first event
                    </button>
                  </div>
                ) : (
                  <div className="admin-event-list">
                    {events.slice(0, 3).map((event) => (
                      <article
                        className="admin-event-item"
                        key={event._id}
                      >
                        {event.bannerImage?.url ? (
                          <img
                            className="admin-event-image"
                            src={event.bannerImage.url}
                            alt={`${event.title} banner`}
                            loading="lazy"
                          />
                        ) : (
                          <div className="admin-event-image admin-event-image-placeholder">
                            <i className="bi bi-calendar-event" />
                          </div>
                        )}

                        <div className="admin-event-info">
                          <div className="admin-event-meta">
                            <span>{event.category}</span>

                            <span className={`admin-status ${event.status}`}>
                              {event.status}
                            </span>
                          </div>

                          <h3>{event.title}</h3>

                          <p>
                            <i className="bi bi-calendar3 me-2" />
                            {formatDate(event.date)}
                          </p>

                          <p>
                            <i className="bi bi-geo-alt me-2" />
                            {event.venue || event.mode}
                          </p>
                        </div>

                        <div className="admin-event-actions">
                          <Link
                            to={`/events/${event.slug}`}
                            className="admin-view-button"
                          >
                            <i className="bi bi-eye" aria-hidden="true" />
                            View
                          </Link>

                          <button
                            type="button"
                            onClick={() => {
                              goToSection('events');
                              startEditing(event);
                            }}
                          >
                            <i className="bi bi-pencil" aria-hidden="true" />
                            Edit
                          </button>
                        </div>
                      </article>
                    ))}
                  </div>
                )}

              </section>
            )}

            {/* ============================================
                EVENTS
            ============================================ */}
            {activeSection === 'events' && (
              <section className="admin-events-section">

                <div className="admin-section-heading">
                  <div>
                    <h2>Event Management</h2>

                    <p className="admin-panel-subtitle">
                      Create, update and publish your CodeSphere events.
                    </p>
                  </div>
                </div>

                {/* TABS */}
                <div
                  className="admin-event-tabs"
                  role="tablist"
                  aria-label="Event management"
                >
                  <button
                    type="button"
                    role="tab"
                    id="manage-events-tab"
                    aria-selected={activeEventTab === 'manage'}
                    aria-controls="manage-events-panel"
                    className={`admin-event-tab ${activeEventTab === 'manage' ? 'active' : ''
                      }`}
                    onClick={() => {
                      setActiveEventTab('manage');
                      clearFeedback();
                    }}
                  >
                    <i className="bi bi-calendar-event" />
                    Manage Events
                  </button>

                  <button
                    type="button"
                    role="tab"
                    id="event-form-tab"
                    aria-selected={activeEventTab === 'form'}
                    aria-controls="event-form-panel"
                    className={`admin-event-tab ${activeEventTab === 'form' ? 'active' : ''
                      }`}
                    onClick={() => {
                      if (activeEventTab !== 'form') {
                        openCreateForm();
                      }
                    }}
                  >
                    <i className={`bi bi-${editingId ? 'pencil' : 'plus-circle'}`} />
                    {editingId ? 'Edit Event' : 'Create Event'}
                  </button>
                </div>

                {/* MANAGE EVENTS */}
                {activeEventTab === 'manage' && (
                  <div
                    role="tabpanel"
                    id="manage-events-pane"
                    aria-labelledby="manage-events-tab"
                  >

                    <div className="admin-event-filters">
                      <div className="admin-event-category">
                        <i className="bi bi-filter" aria-hidden="true" />

                        <select
                          className="admin-form-select"
                          value={eventCategory}
                          onChange={(event) => setEventCategory(event.target.value)}
                          aria-label="Filter events by category"
                        >
                          <option value="all">All categories</option>

                          {categories.map((category) => (
                            <option key={category} value={category}>
                              {category}
                            </option>
                          ))}
                        </select>
                      </div>

                      <label className="admin-event-search">
                        <i className="bi bi-search" />

                        <input
                          type="search"
                          value={eventSearch}
                          onChange={(event) => setEventSearch(event.target.value)}
                          placeholder="Search events..."
                          aria-label="Search events"
                        />
                      </label>
                    </div>

                    {loading ? (
                      <p className="admin-empty">Loading events...</p>
                    ) : events.length === 0 ? (
                      <div className="admin-empty">
                        <i className="bi bi-calendar-plus" />
                        <p>No events have been created yet.</p>

                        <button
                          type="button"
                          className="auth-submit"
                          onClick={openCreateForm}
                        >
                          Create your first event
                        </button>
                      </div>
                    ) : filteredEvents.length === 0 ? (
                      <p className="admin-empty">
                        No events match your search.
                      </p>
                    ) : (
                      <div className="admin-event-list">
                        {filteredEvents.map((event) => (
                          <article
                            className="admin-event-item"
                            key={event._id}
                          >
                            {event.bannerImage?.url ? (
                              <img
                                className="admin-event-image"
                                src={event.bannerImage.url}
                                alt={`${event.title} banner`}
                                loading="lazy"
                              />
                            ) : (
                              <div className="admin-event-image admin-event-image-placeholder">
                                <i className="bi bi-calendar-event" />
                              </div>
                            )}

                            <div className="admin-event-info">
                              <div className="admin-event-meta">
                                <span>{event.category}</span>

                                <span className={`admin-status ${event.status}`}>
                                  {event.status}
                                </span>
                              </div>

                              <h3>{event.title}</h3>

                              <p>
                                <i className="bi bi-calendar3 me-2" />
                                {formatDate(event.date)}
                              </p>

                              <p>
                                <i className="bi bi-geo-alt me-2" />
                                {event.venue || event.mode}
                              </p>
                            </div>

                            <div className="admin-event-actions">
                              <Link
                                to={`/events/${event.slug}`}
                                className="admin-view-button"
                              >
                                <i className="bi bi-eye" aria-hidden="true" />
                                View
                              </Link>

                              <button
                                type="button"
                                onClick={() => startEditing(event)}
                              >
                                <i className="bi bi-pencil" />
                                Edit
                              </button>

                              <button
                                type="button"
                                onClick={() => togglePublish(event)}
                              >
                                <i
                                  className={`bi ${event.status === 'published'
                                    ? 'bi-eye-slash'
                                    : 'bi-eye'
                                    }`}
                                />

                                {event.status === 'published'
                                  ? 'Unpublish'
                                  : 'Publish'}
                              </button>

                              <button
                                type="button"
                                className="admin-delete-button"
                                onClick={() => deleteEvent(event)}
                              >
                                <i className="bi bi-trash" />
                                Delete
                              </button>
                            </div>
                          </article>
                        ))}
                      </div>
                    )}

                  </div>
                )}

                {/* CREATE / EDIT EVENT */}
                {activeEventTab === 'form' && (
                  <div
                    role="tabpanel"
                    id="event-form-pane"
                    aria-labelledby="event-form-tab"
                  >

                    <form
                      className="admin-event-form"
                      onSubmit={handleSubmit}
                    >

                      <div className="admin-form-field admin-field-full">
                        <label htmlFor="event-title">
                          Event title *
                        </label>

                        <input
                          id="event-title"
                          name="title"
                          value={form.title}
                          onChange={updateField}
                          maxLength={120}
                          placeholder="Enter event name"
                          required
                        />
                      </div>

                      <div className="admin-form-field">
                        <label htmlFor="event-category">
                          Category *
                        </label>

                        <select
                          className="admin-form-select"
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
                        <label htmlFor="event-mode">
                          Format *
                        </label>

                        <select
                          className="admin-form-select"
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
                        <label htmlFor="event-date">
                          Start date and time *
                        </label>

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
                          End date and time
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
                        <label htmlFor="event-description">
                          Description *
                        </label>

                        <Editor
                          apiKey={import.meta.env.VITE_TINYMCE_API_KEY}
                          value={form.description}
                          onEditorChange={(content) => {
                            updateField({
                              target: {
                                name: 'description',
                                value: content,
                              },
                            });
                          }}
                          init={{
                            height: 350,
                            menubar: false,
                            branding: false,
                            promotion: false,
                            statusbar: true,
                            resize: true,

                            plugins: [
                              'lists',
                              'link',
                              'table',
                              'wordcount',
                              'code',
                            ],

                            toolbar:
                              'undo redo | blocks | ' +
                              'bold italic underline strikethrough | ' +
                              'forecolor backcolor | ' +
                              'alignleft aligncenter alignright alignjustify | ' +
                              'bullist numlist | ' +
                              'link table blockquote | ' +
                              'removeformat',

                            color_map: [
                              '#F07868', 'CodeSphere Coral',
                              '#142D45', 'Navy',
                              '#183047', 'Dark Text',
                              '#647589', 'Muted',
                              '#FFFFFF', 'White',
                              '#000000', 'Black',
                              '#FF0000', 'Red',
                              '#008000', 'Green',
                              '#0000FF', 'Blue',
                              '#FFFF00', 'Yellow',
                              '#800080', 'Purple',
                            ],

                            custom_colors: true,

                            content_style: `
                             body {
                               font-family: Arial, sans-serif;
                               font-size: 14px;
                               color: #183047;
                               line-height: 1.7;
                               padding: 8px;
                             }
                     
                             h1, h2, h3 {
                               color: #142D45;
                             }
                     
                             a {
                               color: #F07868;
                             }
                           `,
                          }}
                        />

                        <small>
                          Format your event description using headings, colours, highlights,
                          lists, links and other formatting options.
                        </small>
                      </div>

                      {form.mode !== 'Online' && (
                        <div className="admin-form-field">
                          <label htmlFor="event-venue">
                            Venue {form.mode === 'In-person' ? '*' : ''}
                          </label>

                          <input
                            id="event-venue"
                            name="venue"
                            value={form.venue}
                            onChange={updateField}
                            maxLength={200}
                            placeholder="Enter event venue"
                            required={form.mode === 'In-person'}
                          />
                        </div>
                      )}

                      {form.mode !== 'In-person' && (
                        <div className="admin-form-field">
                          <label htmlFor="event-meeting-link">
                            Meeting link {form.mode === 'Online' ? '*' : ''}
                          </label>

                          <input
                            id="event-meeting-link"
                            name="meetingLink"
                            type="url"
                            value={form.meetingLink}
                            onChange={updateField}
                            placeholder="https://..."
                            required={form.mode === 'Online'}
                          />
                        </div>
                      )}

                      <div className="admin-form-field">
                        <label htmlFor="event-registration-link">
                          Registration link
                        </label>

                        <input
                          id="event-registration-link"
                          name="registrationLink"
                          type="url"
                          value={form.registrationLink}
                          onChange={updateField}
                          placeholder="https://..."
                        />
                      </div>

                      <div className="admin-form-field">
                        <label htmlFor="event-status">
                          Visibility
                        </label>

                        <select
                          className="admin-form-select"
                          id="event-status"
                          name="status"
                          value={form.status}
                          onChange={updateField}
                        >
                          <option value="draft">
                            Draft — hidden from visitors
                          </option>

                          <option value="published">
                            Published — visible to visitors
                          </option>
                        </select>
                      </div>

                      {/* EVENT BANNER */}
                      <div className="admin-form-field admin-field-full">
                        <label htmlFor="bannerImage">
                          Event banner
                        </label>

                        <input
                          className="admin-file-input"
                          ref={eventImageInputRef}
                          id="bannerImage"
                          type="file"
                          accept="image/png,image/jpeg,image/webp"
                          onChange={handleEventImageChange}
                        />

                        {imagePreview && (
                          <div className="mt-3">
                            <img
                              src={imagePreview}
                              alt="Event banner preview"
                              style={{
                                width: '100%',
                                maxHeight: '240px',
                                objectFit: 'contain',
                                borderRadius: '12px',
                                background: '#f5f8fc',
                              }}
                            />

                            <button
                              type="button"
                              className="admin-secondary-button mt-2"
                              onClick={removeCurrentEventImage}
                            >
                              <i className="bi bi-trash" />
                              Remove image
                            </button>
                          </div>
                        )}

                        <small>
                          PNG, JPG or WebP. Maximum size: 5 MB.
                        </small>
                      </div>

                      {/* SOCIAL LINKS */}
                      <div className="admin-form-field mt-3">
                        <label htmlFor="event-linkedin-post">
                          LinkedIn post
                        </label>

                        <input
                          id="event-linkedin-post"
                          name="linkedinPostLink"
                          type="url"
                          value={form.linkedinPostLink}
                          onChange={updateField}
                          placeholder="https://www.linkedin.com/..."
                        />
                      </div>

                      <div className="admin-form-field mt-3">
                        <label htmlFor="event-instagram-post">
                          Instagram post
                        </label>

                        <input
                          id="event-instagram-post"
                          name="instagramPostLink"
                          type="url"
                          value={form.instagramPostLink}
                          onChange={updateField}
                          placeholder="https://www.instagram.com/..."
                        />
                      </div>

                      <div className="admin-form-actions admin-field-full">
                        <button
                          className="admin-secondary-button admin-cancel-button"
                          type="button"
                          onClick={cancelEditing}
                          disabled={saving}
                        >
                          Cancel
                        </button>

                        <button
                          className="auth-submit m-0"
                          type="submit"
                          disabled={saving}
                        >
                          {saving ? (
                            <>
                              <span
                                className="spinner-border spinner-border-sm"
                                aria-hidden="true"
                              />
                              Saving...
                            </>
                          ) : (
                            <>
                              <i className="bi bi-check-lg" />
                              {editingId ? 'Save Changes' : 'Create Event'}
                            </>
                          )}
                        </button>
                      </div>

                    </form>
                  </div>
                )}

              </section>
            )}

            {/* ============================================
                USERS
            ============================================ */}
            {activeSection === 'users' && (
              <section className="admin-members-panel">

                <div className="admin-section-heading">
                  <div>
                    <h2>Registered Users</h2>

                    <p className="admin-panel-subtitle">
                      View and manage all registered CodeSphere accounts.
                    </p>
                  </div>

                  <button
                    type="button"
                    className="admin-secondary-button"
                    onClick={loadUsers}
                    disabled={usersLoading}
                  >
                    <i className="bi bi-arrow-clockwise" />
                    Refresh
                  </button>
                </div>

                {/* SEARCH */}
                <div className="admin-event-filters">
                  <label className="admin-event-search">
                    <i className="bi bi-search" aria-hidden="true" />

                    <input
                      type="search"
                      value={userSearch}
                      onChange={(event) => setUserSearch(event.target.value)}
                      placeholder="Search by name, email, college or year..."
                      aria-label="Search registered users"
                    />
                  </label>
                </div>

                {/* USER LIST */}
                {usersLoading ? (
                  <p className="admin-empty">
                    Loading registered users...
                  </p>
                ) : users.length === 0 ? (
                  <div className="admin-empty">
                    <i className="bi bi-people" />

                    <p>No registered users found.</p>
                  </div>
                ) : (
                  <div className="admin-member-list">

                    {users.map((registeredUser) => (
                      <article
                        className="admin-member-item admin-user-item"
                        key={registeredUser._id}
                      >

                        <div className="admin-member-info">
                          <div className="admin-member-avatar">
                            {getInitial(registeredUser.name)}
                          </div>

                          <div className="admin-member-details">
                            <h3>{registeredUser.name}</h3>

                            <p>{registeredUser.email}</p>

                            <div className="admin-user-meta">
                              <span>
                                <i className="bi bi-building" />
                                {registeredUser.collegeName || 'College not specified'}
                              </span>

                              <span>
                                <i className="bi bi-mortarboard" />
                                {registeredUser.yearOfStudy || 'Year not specified'}
                              </span>

                              <span>
                                <i className="bi bi-calendar3" />
                                Joined {formatDate(registeredUser.createdAt)}
                              </span>
                            </div>
                          </div>
                        </div>

                        {registeredUser.role !== 'admin' && (
                          <>
                            <AdminStaffRoles userId={registeredUser._id} initial={registeredUser.staffRoles || []} />
                            <AdminBadgeAwards userId={registeredUser._id} userName={registeredUser.name} />
                          </>
                        )}

                      </article>
                    ))}

                  </div>
                )}

              </section>
            )}

            {/* ============================================
                ATTENDANCE
            ============================================ */}
            {activeSection === 'attendance' && (
              <section className="admin-members-panel">

                <div className="admin-section-heading">
                  <div>

                    <h2>Manage Attendance</h2>

                    <p className="admin-panel-subtitle">
                      Select an event and update member attendance.
                    </p>
                  </div>

                  <button
                    type="button"
                    className="admin-secondary-button"
                    onClick={() => {
                      loadMembers();
                      loadAttendance();
                    }}
                    disabled={membersLoading || attendanceLoading}
                  >
                    <i className="bi bi-arrow-clockwise" />
                    Refresh
                  </button>
                </div>

                <div className="admin-members-toolbar">

                  <div className="admin-form-field">
                    <label htmlFor="attendance-event">
                      Select event
                    </label>

                    <select
                      className="admin-form-select"
                      id="attendance-event"
                      value={selectedAttendanceEvent}
                      onChange={(event) =>
                        setSelectedAttendanceEvent(event.target.value)
                      }
                    >
                      <option value="">Select an event</option>

                      {events.map((event) => (
                        <option key={event._id} value={event._id}>
                          {event.title}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="attendance-stats-card">
                    <div className="attendance-stats-left">
                      <h3>Attendance summary</h3>

                      <div className="attendance-stat-row">
                        <span>Matching members</span>
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
                        '--attendance-percent': `${attendancePercentage}%`,
                      }}
                    >
                      <div className="attendance-circle-inner">
                        <strong>{attendancePercentage}%</strong>
                        <span>Present</span>
                      </div>
                    </div>
                  </div>

                </div>

                <div className="members-list">

                  <div className="admin-form-field">
                    <label htmlFor="member-search">
                      Find a member
                    </label>

                    <label className="admin-event-search">
                      <i className="bi bi-search" aria-hidden="true" />

                      <input
                        id="member-search"
                        type="search"
                        placeholder="Search by name or email..."
                        value={memberSearch}
                        onChange={(event) => setMemberSearch(event.target.value)}
                        aria-label="Search members by name or email"
                      />
                    </label>
                  </div>

                  {!selectedAttendanceEvent ? (
                    <p className="admin-empty">
                      Select an event to manage its attendance.
                    </p>
                  ) : membersLoading || attendanceLoading ? (
                    <p className="admin-empty">
                      Loading attendance...
                    </p>
                  ) : members.length === 0 ? (
                    <p className="admin-empty">
                      No members found.
                    </p>
                  ) : (
                    <div className="admin-member-list">

                      {members.map((member) => {
                        const status = getAttendanceStatus(member);
                        const savingRow =
                          attendanceSavingId === member._id;

                        return (
                          <article
                            className="admin-member-item"
                            key={member._id}
                          >

                            <div className="admin-member-info">
                              <div className="admin-member-avatar">
                                {getInitial(member.name)}
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
                                  Saving...
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

            {/* ============================================
              CORE MEMBERS
          ============================================ */}
            {activeSection === 'coreMembers' && (
              <>
                <section className="admin-events-section">
                  <div className="admin-section-heading">
                    <div>
                      <h2>Core Members Management</h2>
                      <p className="admin-panel-subtitle">
                        Add, edit and manage your CodeSphere team.
                      </p>
                    </div>
                  </div>

                  <div
                    className="admin-event-tabs"
                    role="tablist"
                    aria-label="Core member management"
                  >
                    <button
                      type="button"
                      role="tab"
                      aria-selected={activeCoreMemberTab === 'manage'}
                      className={`admin-event-tab ${activeCoreMemberTab === 'manage' ? 'active' : ''
                        }`}
                      onClick={cancelCoreMemberEditing}
                    >
                      <i className="bi bi-people" />
                      Manage Member
                    </button>

                    <button
                      type="button"
                      role="tab"
                      aria-selected={activeCoreMemberTab === 'form'}
                      className={`admin-event-tab ${activeCoreMemberTab === 'form' ? 'active' : ''
                        }`}
                      onClick={() => {
                        if (activeCoreMemberTab !== 'form') {
                          openCreateCoreMemberForm();
                        }
                      }}
                    >
                      <i className={`bi bi-${editingCoreMemberId ? 'pencil' : 'plus-circle'}`} />
                      {editingCoreMemberId ? 'Edit Member' : 'Add Member'}
                    </button>
                  </div>
                </section>

                {showCoreMemberForm ? (

                  /* ADD / EDIT CORE MEMBER */
                  <section className="admin-panel">

                    <form
                      className="admin-event-form"
                      onSubmit={saveCoreMember}
                    >

                      <div className="admin-form-field">
                        <label htmlFor="core-member-name">
                          Full name *
                        </label>

                        <input
                          id="core-member-name"
                          name="name"
                          value={coreMemberForm.name}
                          onChange={updateCoreMemberField}
                          maxLength={100}
                          placeholder="Enter full name"
                          required
                        />
                      </div>

                      <div className="admin-form-field">
                        <label htmlFor="core-member-role">
                          Position *
                        </label>

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

                      <div className="admin-form-field admin-field-full">
                        <label htmlFor="core-member-image">
                          Profile image {editingCoreMemberId ? '(optional)' : '*'}
                        </label>

                        <input
                          className="admin-file-input"
                          ref={coreMemberImageInputRef}
                          id="core-member-image"
                          type="file"
                          accept="image/jpeg,image/png,image/webp"
                          required={!editingCoreMemberId && !coreMemberImage}
                          onChange={handleCoreMemberImageChange}
                        />

                        {coreMemberImagePreview && (
                          <div className="core-member-image-preview">
                            <img
                              src={coreMemberImagePreview}
                              alt="Core member preview"
                            />

                            <button
                              type="button"
                              className="admin-secondary-button"
                              onClick={removeCurrentCoreMemberImage}
                            >
                              <i className="bi bi-trash" />
                              Remove image
                            </button>
                          </div>
                        )}

                        <small>
                          PNG, JPG or WebP. Maximum size: 5 MB.
                        </small>
                      </div>

                      <div className="admin-form-field mt-3">
                        <label htmlFor="core-member-github">
                          GitHub profile
                        </label>

                        <input
                          id="core-member-github"
                          name="githubLink"
                          type="url"
                          value={coreMemberForm.githubLink}
                          onChange={updateCoreMemberField}
                          maxLength={500}
                          placeholder="https://github.com/username"
                        />
                      </div>

                      <div className="admin-form-field mt-3">
                        <label htmlFor="core-member-linkedin">
                          LinkedIn profile
                        </label>

                        <input
                          id="core-member-linkedin"
                          name="linkedinLink"
                          type="url"
                          value={coreMemberForm.linkedinLink}
                          onChange={updateCoreMemberField}
                          maxLength={500}
                          placeholder="https://www.linkedin.com/in/..."
                        />
                      </div>

                      <div className="admin-form-field mt-3">
                        <label htmlFor="core-member-instagram">
                          Instagram profile
                        </label>

                        <input
                          id="core-member-instagram"
                          name="instagramLink"
                          type="url"
                          value={coreMemberForm.instagramLink}
                          onChange={updateCoreMemberField}
                          maxLength={500}
                          placeholder="https://www.instagram.com/..."
                        />
                      </div>

                      <div className="admin-form-actions admin-field-full">
                        <button
                          type="button"
                          className="admin-secondary-button admin-cancel-button"
                          onClick={cancelCoreMemberEditing}
                          disabled={coreMemberSaving}
                        >
                          Cancel
                        </button>

                        <button
                          type="submit"
                          className="auth-submit m-0"
                          disabled={coreMemberSaving}
                        >
                          {coreMemberSaving
                            ? 'Saving...'
                            : editingCoreMemberId
                              ? 'Save Changes'
                              : 'Add Member'}
                        </button>
                      </div>

                    </form>
                  </section>

                ) : (

                  /* CORE MEMBER DIRECTORY */
                  <section className="admin-events-section admin-core-members-list">
                    <div className="admin-event-filters">
                      <label className="admin-event-search">
                        <i className="bi bi-search" />

                        <input
                          id="core-member-search"
                          type="search"
                          value={coreMemberSearch}
                          onChange={(event) =>
                            setCoreMemberSearch(event.target.value)
                          }
                          placeholder="Search by name or position..."
                          aria-label="Search core members"
                        />
                      </label>
                    </div>

                    {coreMembersLoading ? (
                      <p className="admin-empty">
                        Loading core members...
                      </p>
                    ) : filteredCoreMembers.length === 0 ? (
                      <div className="admin-empty">
                        <i className="bi bi-people" />

                        <p>
                          {coreMembers.length === 0
                            ? 'No core members added yet.'
                            : 'No members match your search.'}
                        </p>

                        {coreMembers.length === 0 && (
                          <button
                            type="button"
                            className="auth-submit"
                            onClick={openCreateCoreMemberForm}
                          >
                            <i className="bi bi-plus-lg" />
                            Add First Member
                          </button>
                        )}
                      </div>
                    ) : (
                      <div className="admin-event-list admin-core-member-list">

                        {filteredCoreMembers.map((member) => (
                          <article
                            className="admin-event-item admin-core-member-item"
                            key={member._id}
                          >

                            {member.image?.url ? (
                              <img
                                className="admin-core-member-avatar"
                                src={member.image.url}
                                alt={member.name}
                                loading="lazy"
                              />
                            ) : (
                              <div className="admin-core-member-avatar admin-core-member-fallback">
                                {getInitial(member.name)}
                              </div>
                            )}

                            <div className="admin-core-member-card-content">
                              <h3>{member.name}</h3>

                              <p className="core-member-role">
                                {member.role}
                              </p>

                              <div className="admin-core-member-social-links">

                                {member.githubLink && (
                                  <a
                                    href={member.githubLink}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    aria-label={`GitHub profile of ${member.name}`}
                                  >
                                    <i className="bi bi-github" />
                                    <span>GitHub</span>
                                  </a>
                                )}

                                {member.linkedinLink && (
                                  <a
                                    href={member.linkedinLink}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    aria-label={`LinkedIn profile of ${member.name}`}
                                  >
                                    <i className="bi bi-linkedin" />
                                    <span>LinkedIn</span>
                                  </a>
                                )}

                                {member.instagramLink && (
                                  <a
                                    href={member.instagramLink}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    aria-label={`Instagram profile of ${member.name}`}
                                  >
                                    <i className="bi bi-instagram" />
                                    <span>Instagram</span>
                                  </a>
                                )}

                              </div>

                              <div className="admin-event-actions admin-core-member-actions">
                                <button
                                  type="button"
                                  onClick={() => editCoreMember(member)}
                                >
                                  <i className="bi bi-pencil" />
                                  Edit
                                </button>

                                <button
                                  type="button"
                                  className="admin-delete-button"
                                  onClick={() => deleteCoreMember(member)}
                                >
                                  <i className="bi bi-trash" />
                                  Delete
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
        </div>

        {/* ================================================
          MOBILE BOTTOM NAVIGATION
      ================================================ */}
        <nav
          className="admin-mobile-nav"
          aria-label="Mobile admin navigation"
        >
          <button
            type="button"
            className={activeSection === 'home' ? 'active' : ''}
            onClick={() => goToSection('home')}
            aria-current={activeSection === 'home' ? 'page' : undefined}
          >
            <i className="bi bi-grid-1x2-fill" />
            <span>Home</span>
          </button>

          <button
            type="button"
            className={activeSection === 'events' ? 'active' : ''}
            onClick={() => goToSection('events')}
            aria-current={activeSection === 'events' ? 'page' : undefined}
          >
            <i className="bi bi-calendar-event" />
            <span>Events</span>
          </button>

          <button
            type="button"
            className={activeSection === 'users' ? 'active' : ''}
            onClick={() => goToSection('users')}
            aria-current={activeSection === 'users' ? 'page' : undefined}
          >
            <i className="bi bi-person-lines-fill" />
            <span>Users</span>
          </button>

          <button
            type="button"
            className={activeSection === 'attendance' ? 'active' : ''}
            onClick={() => goToSection('attendance')}
            aria-current={activeSection === 'attendance' ? 'page' : undefined}
          >
            <i className="bi bi-clipboard-check" />
            <span>Attendance</span>
          </button>

          <button
            type="button"
            className={activeSection === 'coreMembers' ? 'active' : ''}
            onClick={() => goToSection('coreMembers')}
            aria-current={activeSection === 'coreMembers' ? 'page' : undefined}
          >
            <i className="bi bi-people" />
            <span>Team</span>
          </button>
        </nav>

      </main>
    </>
  );
}

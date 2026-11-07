
import React, { useEffect, useState, useRef } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';

import { useAuth } from '../context/AuthContext';
import { apiRequest } from '../lib/api';
import Navbar from '../components/Navbar';
import logo from '../../assets/logo.svg';
import '../css/UserDashboard.css';

const navigation = [
  { label: 'Overview', path: '/dashboard', icon: 'grid' },
  { label: 'My Profile', path: '/dashboard/profile', icon: 'user' },
  { label: 'My Projects', path: '/dashboard/projects', icon: 'code' },
  { label: 'Skills & Learning', path: '/dashboard/skills', icon: 'layers' },
  { label: 'My Activities', path: '/dashboard/activities', icon: 'calendar' },
];

const accountNavigation = [
  { label: 'Settings', path: '/dashboard/settings', icon: 'settings' },
];

const sectionDetails = {
  '/dashboard/profile': {
    title: 'My Profile',
    description: 'Build and manage your professional developer identity.',
    icon: 'user',
  },
  '/dashboard/projects': {
    title: 'My Projects',
    description: 'Showcase your development projects and technical work.',
    icon: 'code',
  },
  '/dashboard/skills': {
    title: 'Skills & Learning',
    description: 'Manage your technical skills and learning goals.',
    icon: 'layers',
  },
  '/dashboard/activities': {
    title: 'My Activities',
    description: 'Keep track of your CodeSphere participation and events.',
    icon: 'calendar',
  },
  '/dashboard/settings': {
    title: 'Settings',
    description: 'Manage your account and security preferences.',
    icon: 'settings',
  },
};

function getInitials(name = '') {
  return (
    name
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() || '')
      .join('') || 'U'
  );
}

function SidebarLink({ item, pathname }) {
  const isOverview = item.path === '/dashboard';

  const isActive = isOverview
    ? pathname === '/dashboard' || pathname === '/dashboard/'
    : pathname.startsWith(item.path);

  return (
    <NavLink
      to={item.path}
      end={isOverview}
      className={`user-sidebar-link ${isActive ? 'active' : ''}`}
    >
      <span className="user-sidebar-icon" aria-hidden="true">
        {item.icon === 'grid' && '▦'}
        {item.icon === 'user' && '♙'}
        {item.icon === 'code' && '</>'}
        {item.icon === 'layers' && '▤'}
        {item.icon === 'calendar' && '▦'}
        {item.icon === 'settings' && '⚙'}
      </span>

      <span>{item.label}</span>
    </NavLink>
  );
}

function Overview({ user }) {
  const firstName = user?.name?.trim().split(/\s+/)[0] || 'Developer';

  return (
    <>
      <div className="user-dashboard-heading m-0">
        <div>
          <p className="user-dashboard-eyebrow">YOUR WORKSPACE</p>
          <h1>Welcome back, {firstName}!</h1>
          <p>
            Your developer journey continues here. Manage your profile,
            showcase your work and keep growing.
          </p>
        </div>
      </div>


      {user?.username && (
        <Link
          to={`/${user.username}`}
          className="user-profile-edit-button user-public-profile-button mb-5"
        >
          <i className="bi bi-box-arrow-up-right me-2" />
          View Public Profile
        </Link>
      )}

      <section className="user-welcome-card">
        <div className="user-welcome-content">
          <span className="user-welcome-label">CODESPHERE MEMBER</span>
          <h2>Build. Learn. Connect.</h2>
          <p>
            Your personal space to showcase your skills, projects and
            participation in the CodeSphere community.
          </p>

          <Link to="/dashboard/profile" className="user-primary-button">
            Complete your profile <span aria-hidden="true">→</span>
          </Link>
        </div>

        <div className="user-welcome-decoration" aria-hidden="true">
          {'</>'}
        </div>
      </section>

      <section className="user-dashboard-section">
        <div className="user-section-heading">
          <div>
            <h2>Your workspace</h2>
            <p>Everything you need to manage your developer journey.</p>
          </div>
        </div>

        <div className="user-workspace-grid">
          <Link to="/dashboard/profile" className="user-workspace-card">
            <span className="user-workspace-icon coral">♙</span>
            <h3>Developer Profile</h3>
            <p>Manage your personal details and professional links.</p>
            <span className="user-card-action">Manage profile →</span>
          </Link>

          <Link to="/dashboard/projects" className="user-workspace-card">
            <span className="user-workspace-icon purple">&lt;/&gt;</span>
            <h3>My Projects</h3>
            <p>Showcase your projects, repositories and live demos.</p>
            <span className="user-card-action">Manage projects →</span>
          </Link>

          <Link to="/dashboard/skills" className="user-workspace-card">
            <span className="user-workspace-icon blue">✧</span>
            <h3>Skills & Learning</h3>
            <p>Track your technical skills and learning goals.</p>
            <span className="user-card-action">Explore skills →</span>
          </Link>

          <Link to="/dashboard/activities" className="user-workspace-card">
            <span className="user-workspace-icon green">▦</span>
            <h3>My Activities</h3>
            <p>Keep track of your events and community participation.</p>
            <span className="user-card-action">View activities →</span>
          </Link>
        </div>
      </section>

      <section className="user-dashboard-section">
        <div className="user-section-heading">
          <div>
            <h2>Account information</h2>
            <p>Your current CodeSphere account details.</p>
          </div>

          <Link to="/dashboard/profile" className="user-text-link">
            Edit profile →
          </Link>
        </div>

        <div className="user-account-card">
          <div className="user-account-row">
            <span className="user-account-label">Full name</span>
            <strong>{user?.name || 'Not available'}</strong>
          </div>

          <div className="user-account-row">
            <span className="user-account-label">Email address</span>
            <strong>{user?.email || 'Not available'}</strong>
          </div>

          <div className="user-account-row">
            <span className="user-account-label">College</span>
            <strong>{user?.collegeName || 'Not available'}</strong>
          </div>

          <div className="user-account-row">
            <span className="user-account-label">Year of study</span>
            <strong>{user?.yearOfStudy || 'Not available'}</strong>
          </div>

          <div className="user-account-row">
            <span className="user-account-label">Member since</span>
            <strong>
              {user?.createdAt
                ? new Date(user.createdAt).toLocaleDateString('en-IN', {
                  month: 'long',
                  year: 'numeric',
                })
                : 'Not available'}
            </strong>
          </div>
        </div>
      </section>
    </>
  );
}

function ProfileSection() {
  const [profile, setProfile] = useState(null);
  const [formData, setFormData] = useState({});
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const fileInputRef = useRef(null);
  const [imagePreview, setImagePreview] = useState('');
  const [uploadingImage, setUploadingImage] = useState(false);
  const [imageError, setImageError] = useState('');

  const fetchProfile = async () => {
    try {
      setLoading(true);
      setError('');

      const response = await apiRequest('/users/profile');
      setProfile(response.user);
      setFormData({
        name: response.user.name || '',
        username: response.user.username || '',
        bio: response.user.bio || '',
        collegeName: response.user.collegeName || '',
        yearOfStudy: response.user.yearOfStudy || '',
        github: response.user.github || '',
        linkedin: response.user.linkedin || '',
        portfolio: response.user.portfolio || '',
        technicalInterests: (response.user.technicalInterests || []).join(', '),
        skills: (response.user.skills || []).join(', '),
        learningGoals: (response.user.learningGoals || []).join(', '),
        profileVisibility: response.user.profileVisibility || 'members',
      });
    } catch (err) {
      setError(err.message || 'Unable to load your profile.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;

    setFormData((previous) => ({
      ...previous,
      [name]: value,
    }));
  };

  const convertToArray = (value) =>
    value
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean);

  const handleSave = async (e) => {
    e.preventDefault();

    setError('');
    setSuccess('');

    if (!formData.name.trim()) {
      setError('Name is required.');
      return;
    }

    if (
      formData.username &&
      !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(formData.username.trim())
    ) {
      setError('Username can contain lowercase letters, numbers and hyphens only.');
      return;
    }

    const updatedData = {
      ...formData,
      name: formData.name.trim(),
      username: formData.username.trim().toLowerCase(),
      technicalInterests: convertToArray(formData.technicalInterests),
      skills: convertToArray(formData.skills),
      learningGoals: convertToArray(formData.learningGoals),
    };

    try {
      setSaving(true);

      const response = await apiRequest('/users/profile', {
        method: 'PATCH',
        body: JSON.stringify(updatedData),
      });

      setProfile(response.user);
      setEditing(false);
      setSuccess('Your profile has been updated successfully.');

      await fetchProfile();
    } catch (err) {
      setError(err.message || 'Unable to update your profile.');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setEditing(false);
    setError('');
    setSuccess('');
    fetchProfile();
  };

  const handleImageSelect = async (e) => {
    const file = e.target.files?.[0];

    if (!file) return;

    setImageError('');

    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];

    if (!allowedTypes.includes(file.type)) {
      setImageError('Please select a JPG, PNG, or WebP image.');
      e.target.value = '';
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setImageError('Image size must be less than 5 MB.');
      e.target.value = '';
      return;
    }

    const previewUrl = URL.createObjectURL(file);
    setImagePreview(previewUrl);

    try {
      setUploadingImage(true);

      const formData = new FormData();
      formData.append('profileImage', file);

      await apiRequest('/users/profile/image', {
        method: 'POST',
        body: formData,
      });

      await fetchProfile();
      setImagePreview('');
    } catch (err) {
      setImageError(err.message || 'Unable to upload profile picture.');
      setImagePreview('');
    } finally {
      URL.revokeObjectURL(previewUrl);
      setUploadingImage(false);

      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleRemoveImage = async () => {
    if (!profile.profileImage?.url) return;

    const confirmed = window.confirm(
      'Are you sure you want to remove your profile picture?'
    );

    if (!confirmed) return;

    try {
      setImageError('');
      setUploadingImage(true);

      await apiRequest('/users/profile/image', {
        method: 'DELETE',
      });

      await fetchProfile();
    } catch (err) {
      setImageError(err.message || 'Unable to remove profile picture.');
    } finally {
      setUploadingImage(false);
    }
  };

  if (loading) {
    return (
      <div className="user-profile-state">
        <div className="user-profile-spinner" />
        <p>Loading your profile...</p>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="user-profile-state">
        <h2>Unable to load profile</h2>
        <p>{error || 'Please try again later.'}</p>
        <button type="button" onClick={fetchProfile}>
          Retry
        </button>
      </div>
    );
  }

  const initials = getInitials(profile.name);

  const renderTags = (items) => (
    <div className="user-profile-tags">
      {items?.length ? (
        items.map((item, index) => (
          <span key={`${item}-${index}`}>{item}</span>
        ))
      ) : (
        <p>Nothing added yet.</p>
      )}
    </div>
  );

  const renderField = (label, name, placeholder = '', type = 'text') => (
    <div className="user-profile-form-group">
      <label htmlFor={name}>{label}</label>
      <input
        id={name}
        name={name}
        type={type}
        value={formData[name] || ''}
        onChange={handleChange}
        placeholder={placeholder}
      />
    </div>
  );

  return (
    <>
      <div className="user-dashboard-heading user-profile-heading">
        <div>
          <p className="user-dashboard-eyebrow">YOUR DEVELOPER IDENTITY</p>
          <h1>My Profile</h1>
          <p>Build and manage your professional identity in CodeSphere.</p>
        </div>

        {!editing && (
          <button
            type="button"
            className="user-profile-edit-button"
            onClick={() => {
              setError('');
              setSuccess('');
              setEditing(true);
            }}
          >
            Edit Profile
          </button>
        )}
      </div>

      {error && <div className="user-profile-alert error">{error}</div>}
      {success && <div className="user-profile-alert success">{success}</div>}

      <section className="user-profile-card">
        <div className="user-profile-header">
          <div className="user-profile-photo-wrapper">
            <div className="user-profile-avatar">
              {imagePreview || profile.profileImage?.url ? (
                <img
                  src={imagePreview || profile.profileImage.url}
                  alt={profile.name}
                />
              ) : (
                <span>{initials}</span>
              )}

              {uploadingImage && (
                <div className="user-profile-photo-overlay">
                  Uploading...
                </div>
              )}
            </div>

            <button
              type="button"
              className="user-profile-photo-edit"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadingImage}
              title="Change profile picture"
            >
              {uploadingImage ? '...' : <i className="bi bi-camera fs-6" aria-hidden="true" />}
            </button>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              hidden
              onChange={handleImageSelect}
            />
          </div>

          <div className="user-profile-identity">
            <h2>{profile.name}</h2>
            <p className="user-profile-member-badge">
              {profile.username ? `@${profile.username}` : 'Username not set'}
            </p>
          </div>
        </div>

        {imageError && (
          <div className="user-profile-alert error">{imageError}</div>
        )}

        {profile.profileImage?.url && (
          <div className="user-profile-photo-actions">
            <button
              type="button"
              onClick={handleRemoveImage}
              disabled={uploadingImage}
            >
              Remove profile picture
            </button>
          </div>
        )}

        {editing ? (
          <form className="user-profile-form" onSubmit={handleSave}>
            <div className="user-profile-form-section">
              <h3>Basic information</h3>
              <div className="user-profile-form-grid">
                {renderField('Full name', 'name', 'Your name')}
                {renderField('Username', 'username', 'e.g. toumik-haque')}
              </div>

              <div className="user-profile-form-group">
                <label htmlFor="bio">Bio</label>
                <textarea
                  id="bio"
                  name="bio"
                  value={formData.bio}
                  onChange={handleChange}
                  placeholder="Tell the community about yourself..."
                  maxLength={500}
                  rows={4}
                />
                <small>{formData.bio.length}/500 characters</small>
              </div>
            </div>

            <div className="user-profile-form-section">
              <h3>Academic information</h3>
              <div className="user-profile-form-grid">
                {renderField('College / Institution', 'collegeName', 'Your college')}

                <div className="user-profile-form-group">
                  <label htmlFor="yearOfStudy">Year of study</label>
                  <select
                    id="yearOfStudy"
                    name="yearOfStudy"
                    value={formData.yearOfStudy}
                    onChange={handleChange}
                  >
                    <option value="">Select year</option>
                    <option value="1st Year">1st Year</option>
                    <option value="2nd Year">2nd Year</option>
                    <option value="3rd Year">3rd Year</option>
                    <option value="4th Year">4th Year</option>
                    <option value="Graduate">Graduate</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="user-profile-form-section">
              <h3>Professional links</h3>
              <div className="user-profile-form-grid">
                {renderField('GitHub URL', 'github', 'https://github.com/username', 'url')}
                {renderField('LinkedIn URL', 'linkedin', 'https://linkedin.com/in/username', 'url')}
                {renderField('Portfolio URL', 'portfolio', 'https://yourportfolio.com', 'url')}
              </div>
            </div>

            <div className="user-profile-form-section">
              <h3>Technical interests and development</h3>
              <p className="user-profile-form-hint">
                Separate multiple entries with commas.
              </p>

              {renderField('Technical interests', 'technicalInterests', 'Web Development, AI, Cybersecurity')}
              {renderField('Skills', 'skills', 'React, JavaScript, C++, Node.js')}
              {renderField('Learning goals', 'learningGoals', 'Data Structures, Backend Development')}
            </div>

            <div className="user-profile-form-section">
              <h3>Privacy</h3>
              <div className="user-profile-form-group">
                <label htmlFor="profileVisibility">Profile visibility</label>
                <select
                  id="profileVisibility"
                  name="profileVisibility"
                  value={formData.profileVisibility}
                  onChange={handleChange}
                >
                  <option value="members">Visible to CodeSphere members</option>
                  <option value="private">Private</option>
                </select>
                <small>
                  Private profiles are not visible to other members.
                </small>
              </div>
            </div>

            <div className="user-profile-form-actions">
              <button
                type="button"
                className="user-profile-cancel-button"
                onClick={handleCancel}
                disabled={saving}
              >
                Cancel
              </button>

              <button
                type="submit"
                className="user-profile-edit-button"
                disabled={saving}
              >
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </form>
        ) : (
          <div className="user-profile-content">
            <div className="user-profile-section">
              <h3>About me</h3>
              <p>{profile.bio || 'You haven’t added a bio yet.'}</p>
            </div>

            <div className="user-profile-section">
              <h3>Academic information</h3>
              <div className="user-profile-details">
                <div>
                  <span>College</span>
                  <strong>{profile.collegeName || 'Not added'}</strong>
                </div>
                <div>
                  <span>Year of study</span>
                  <strong>{profile.yearOfStudy || 'Not added'}</strong>
                </div>
              </div>
            </div>

            <div className="user-profile-section">
              <h3>Professional links</h3>
              <div className="user-profile-details">
                <div>
                  <span>GitHub</span>
                  <strong>{profile.github || 'Not added'}</strong>
                </div>
                <div>
                  <span>LinkedIn</span>
                  <strong>{profile.linkedin || 'Not added'}</strong>
                </div>
                <div>
                  <span>Portfolio</span>
                  <strong>{profile.portfolio || 'Not added'}</strong>
                </div>
              </div>
            </div>

            <div className="user-profile-section">
              <h3>Technical interests</h3>
              {renderTags(profile.technicalInterests)}
            </div>

            <div className="user-profile-section">
              <h3>Skills</h3>
              {renderTags(profile.skills)}
            </div>

            <div className="user-profile-section">
              <h3>Learning goals</h3>
              {renderTags(profile.learningGoals)}
            </div>

            <div className="user-profile-section">
              <h3>Profile visibility</h3>
              <span className="user-profile-visibility">
                {profile.profileVisibility === 'private'
                  ? 'Private'
                  : 'Visible to CodeSphere members'}
              </span>
            </div>
          </div>
        )}
      </section>
    </>
  );
}

function ProjectsSection() {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState(null);

  const initialForm = {
    title: '',
    description: '',
    technologies: '',
    githubUrl: '',
    liveUrl: '',
    status: 'Completed',
    featured: false,
  };

  const [formData, setFormData] = useState(initialForm);

  const fetchProjects = async () => {
    try {
      setLoading(true);
      setError('');

      const response = await apiRequest('/projects');
      setProjects(response.projects || []);
    } catch (err) {
      setError(err.message || 'Unable to load projects.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProjects();
  }, []);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;

    setFormData((previous) => ({
      ...previous,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const resetForm = () => {
    setFormData(initialForm);
    setEditingId(null);
    setShowForm(false);
    setError('');
  };

  const handleAdd = () => {
    resetForm();
    setSuccess('');
    setShowForm(true);
  };

  const handleEdit = (project) => {
    setFormData({
      title: project.title || '',
      description: project.description || '',
      technologies: (project.technologies || []).join(', '),
      githubUrl: project.githubUrl || '',
      liveUrl: project.liveUrl || '',
      status: project.status || 'Completed',
      featured: Boolean(project.featured),
    });

    setEditingId(project._id);
    setError('');
    setSuccess('');
    setShowForm(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();

    setError('');
    setSuccess('');

    if (!formData.title.trim() || !formData.description.trim()) {
      setError('Project title and description are required.');
      return;
    }

    const payload = {
      ...formData,
      title: formData.title.trim(),
      description: formData.description.trim(),
      technologies: formData.technologies
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean),
      githubUrl: formData.githubUrl.trim(),
      liveUrl: formData.liveUrl.trim(),
    };

    try {
      setSaving(true);

      const endpoint = editingId ? `/projects/${editingId}` : '/projects';

      const response = await apiRequest(endpoint, {
        method: editingId ? 'PATCH' : 'POST',
        body: JSON.stringify(payload),
      });

      setSuccess(response.message || 'Project saved successfully.');
      resetForm();
      await fetchProjects();
    } catch (err) {
      setError(err.message || 'Unable to save project.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (project) => {
    const confirmed = window.confirm(
      `Are you sure you want to delete "${project.title}"?`
    );

    if (!confirmed) return;

    try {
      setError('');
      setSuccess('');

      await apiRequest(`/projects/${project._id}`, {
        method: 'DELETE',
      });

      setSuccess('Project deleted successfully.');
      await fetchProjects();
    } catch (err) {
      setError(err.message || 'Unable to delete project.');
    }
  };

  const getStatusClass = (status) => {
    if (status === 'Completed') return 'completed';
    if (status === 'In Progress') return 'in-progress';
    return 'planning';
  };

  if (loading) {
    return (
      <div className="user-profile-state">
        <div className="user-profile-spinner" />
        <p>Loading your projects...</p>
      </div>
    );
  }

  return (
    <>
      <div className="user-dashboard-heading user-projects-heading">
        <div>
          <p className="user-dashboard-eyebrow">YOUR DEVELOPMENT WORK</p>
          <h1>My Projects</h1>
          <p>
            Showcase your development work, repositories and live projects.
          </p>
        </div>

        <button
          type="button"
          className="user-profile-edit-button"
          onClick={handleAdd}
        >
          + Add Project
        </button>
      </div>

      {error && <div className="user-profile-alert error">{error}</div>}
      {success && <div className="user-profile-alert success">{success}</div>}

      {showForm && (
        <section className="user-project-form-card">
          <div className="user-project-form-heading">
            <div>
              <h2>{editingId ? 'Edit Project' : 'Add New Project'}</h2>
              <p>
                Share details about a project you've built or are working on.
              </p>
            </div>
          </div>

          <form onSubmit={handleSave} className="user-profile-form">
            <div className="user-profile-form-section">
              <div className="user-profile-form-group">
                <label htmlFor="project-title">Project title *</label>
                <input
                  id="project-title"
                  name="title"
                  value={formData.title}
                  onChange={handleChange}
                  placeholder="e.g. CodeSphere"
                  maxLength={100}
                  required
                />
              </div>

              <div className="user-profile-form-group">
                <label htmlFor="project-description">Description *</label>
                <textarea
                  id="project-description"
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  placeholder="Describe your project, its features and purpose..."
                  maxLength={1000}
                  rows={4}
                  required
                />
                <small>{formData.description.length}/1000 characters</small>
              </div>

              <div className="user-profile-form-group">
                <label htmlFor="project-technologies">Technologies used</label>
                <input
                  id="project-technologies"
                  name="technologies"
                  value={formData.technologies}
                  onChange={handleChange}
                  placeholder="React, Node.js, MongoDB"
                />
                <small>Separate technologies with commas.</small>
              </div>
            </div>

            <div className="user-profile-form-section">
              <h3>Project links</h3>

              <div className="user-profile-form-grid">
                <div className="user-profile-form-group">
                  <label htmlFor="project-github">GitHub repository</label>
                  <input
                    id="project-github"
                    name="githubUrl"
                    type="url"
                    value={formData.githubUrl}
                    onChange={handleChange}
                    placeholder="https://github.com/username/project"
                  />
                </div>

                <div className="user-profile-form-group">
                  <label htmlFor="project-live">Live demo</label>
                  <input
                    id="project-live"
                    name="liveUrl"
                    type="url"
                    value={formData.liveUrl}
                    onChange={handleChange}
                    placeholder="https://your-project.com"
                  />
                </div>
              </div>
            </div>

            <div className="user-profile-form-section">
              <h3>Project settings</h3>

              <div className="user-profile-form-group">
                <label htmlFor="project-status">Project status</label>
                <select
                  id="project-status"
                  name="status"
                  value={formData.status}
                  onChange={handleChange}
                >
                  <option value="Completed">Completed</option>
                  <option value="In Progress">In Progress</option>
                  <option value="Planning">Planning</option>
                </select>
              </div>

              <label className="user-project-featured-option">
                <input
                  type="checkbox"
                  name="featured"
                  checked={formData.featured}
                  onChange={handleChange}
                />
                <span>
                  <strong>Feature this project</strong>
                  <small>Highlight this project on your profile.</small>
                </span>
              </label>
            </div>

            <div className="user-profile-form-actions">
              <button
                type="button"
                className="user-profile-cancel-button"
                onClick={resetForm}
                disabled={saving}
              >
                Cancel
              </button>

              <button
                type="submit"
                className="user-profile-edit-button"
                disabled={saving}
              >
                {saving
                  ? 'Saving...'
                  : editingId
                    ? 'Update Project'
                    : 'Add Project'}
              </button>
            </div>
          </form>
        </section>
      )}

      <section className="user-dashboard-section user-projects-section">
        <div className="user-section-heading">
          <div>
            <h2>Your projects ({projects.length})</h2>
            <p>All the projects you've added to your developer profile.</p>
          </div>
        </div>

        {projects.length === 0 ? (
          <div className="user-projects-empty">
            <div className="user-coming-icon">&lt;/&gt;</div>
            <h2>No projects yet</h2>
            <p>
              Start showcasing your development work. Add your first project
              to let the CodeSphere community explore what you've built.
            </p>
            <button
              type="button"
              className="user-profile-edit-button"
              onClick={handleAdd}
            >
              + Add Your First Project
            </button>
          </div>
        ) : (
          <div className="user-projects-grid">
            {projects.map((project) => (
              <article className="user-project-card" key={project._id}>
                <div className="user-project-card-top">
                  <div className="user-project-code-icon">&lt;/&gt;</div>

                  <div className="user-project-card-actions">
                    {project.featured && (
                      <span className="user-project-featured-badge">
                        <i className="bi bi-star-fill" /> Featured
                      </span>
                    )}

                    <button
                      type="button"
                      onClick={() => handleEdit(project)}
                      aria-label={`Edit ${project.title}`}
                      title="Edit project"
                    >
                      <i className="bi bi-pencil" />
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDelete(project)}
                      aria-label={`Delete ${project.title}`}
                      title="Delete project"
                      className="delete"
                    >
                      <i className="bi bi-trash" />
                    </button>
                  </div>
                </div>

                <div className="user-project-card-content">
                  <div className="user-project-title-row">
                    <h3>{project.title}</h3>
                    <span
                      className={`user-project-status ${getStatusClass(project.status)}`}
                    >
                      {project.status}
                    </span>
                  </div>

                  <p className="user-project-description">
                    {project.description}
                  </p>

                  <div className="user-project-technologies">
                    {project.technologies?.length ? (
                      project.technologies.map((technology, index) => (
                        <span key={`${technology}-${index}`}>
                          {technology}
                        </span>
                      ))
                    ) : (
                      <small>No technologies added.</small>
                    )}
                  </div>
                </div>

                {(project.githubUrl || project.liveUrl) && (
                  <div className="user-project-links">
                    {project.githubUrl && (
                      <a
                        href={project.githubUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <i className="bi bi-github" /> GitHub
                      </a>
                    )}

                    {project.liveUrl && (
                      <a
                        href={project.liveUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <i className="bi bi-box-arrow-up-right" /> Live Demo
                      </a>
                    )}
                  </div>
                )}
              </article>
            ))}
          </div>
        )}
      </section>
    </>
  );
}

function SkillsSection() {
  const [formData, setFormData] = useState({
    skills: '',
    technicalInterests: '',
    learningGoals: '',
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const fetchProfile = async () => {
    try {
      setLoading(true);
      setError('');

      const response = await apiRequest('/users/profile');
      const user = response.user;

      setFormData({
        skills: (user.skills || []).join(', '),
        technicalInterests: (user.technicalInterests || []).join(', '),
        learningGoals: (user.learningGoals || []).join(', '),
      });
    } catch (err) {
      setError(err.message || 'Unable to load your skills.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;

    setFormData((previous) => ({
      ...previous,
      [name]: value,
    }));
  };

  const convertToArray = (value) => [
    ...new Set(
      value
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean)
    ),
  ];

  const handleSave = async (e) => {
    e.preventDefault();

    setError('');
    setSuccess('');

    const payload = {
      skills: convertToArray(formData.skills),
      technicalInterests: convertToArray(formData.technicalInterests),
      learningGoals: convertToArray(formData.learningGoals),
    };

    try {
      setSaving(true);

      const response = await apiRequest('/users/profile', {
        method: 'PATCH',
        body: JSON.stringify(payload),
      });

      const user = response.user;

      setFormData({
        skills: (user.skills || []).join(', '),
        technicalInterests: (user.technicalInterests || []).join(', '),
        learningGoals: (user.learningGoals || []).join(', '),
      });

      setSuccess('Your skills and learning goals have been updated.');
    } catch (err) {
      setError(err.message || 'Unable to save your changes.');
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    setError('');
    setSuccess('');
    fetchProfile();
  };

  if (loading) {
    return (
      <div className="user-profile-state">
        <div className="user-profile-spinner" />
        <p>Loading your skills and learning goals...</p>
      </div>
    );
  }

  return (
    <>
      <div className="user-dashboard-heading">
        <div>
          <p className="user-dashboard-eyebrow">YOUR DEVELOPMENT JOURNEY</p>
          <h1>Skills & Learning</h1>
          <p>
            Showcase what you know, explore your interests and plan what
            you want to learn next.
          </p>
        </div>
      </div>

      {error && <div className="user-profile-alert error">{error}</div>}
      {success && <div className="user-profile-alert success">{success}</div>}

      <section className="user-profile-card user-skills-card">
        <div className="user-profile-content">
          <div className="user-profile-section">
            <h3>My development journey</h3>
            <p>
              Keep your technical profile updated. Your skills and interests
              help other CodeSphere members understand your strengths and
              areas of interest.
            </p>
          </div>

          <form className="user-profile-form" onSubmit={handleSave}>
            <div className="user-profile-form-section">
              <h3>
                <i className="bi bi-code-slash" /> Technical skills
              </h3>
              <p className="user-profile-form-hint">
                Add programming languages, frameworks, tools and technologies
                you know.
              </p>

              <div className="user-profile-form-group">
                <label htmlFor="skills">Your skills</label>
                <textarea
                  id="skills"
                  name="skills"
                  value={formData.skills}
                  onChange={handleChange}
                  placeholder="C++, JavaScript, React, Node.js, MongoDB..."
                  rows={4}
                />
                <small>Separate multiple skills with commas.</small>
              </div>

              <div className="user-profile-tags">
                {convertToArray(formData.skills).map((skill, index) => (
                  <span key={`${skill}-${index}`}>{skill}</span>
                ))}
              </div>
            </div>

            <div className="user-profile-form-section">
              <h3>
                <i className="bi bi-lightbulb" /> Technical interests
              </h3>
              <p className="user-profile-form-hint">
                Which areas of technology interest you?
              </p>

              <div className="user-profile-form-group">
                <label htmlFor="technicalInterests">Areas of interest</label>
                <textarea
                  id="technicalInterests"
                  name="technicalInterests"
                  value={formData.technicalInterests}
                  onChange={handleChange}
                  placeholder="Web Development, Artificial Intelligence, Cybersecurity..."
                  rows={3}
                />
                <small>Separate multiple interests with commas.</small>
              </div>

              <div className="user-profile-tags">
                {convertToArray(formData.technicalInterests).map(
                  (interest, index) => (
                    <span key={`${interest}-${index}`}>{interest}</span>
                  )
                )}
              </div>
            </div>

            <div className="user-profile-form-section">
              <h3>
                <i className="bi bi-bullseye" /> Learning goals
              </h3>
              <p className="user-profile-form-hint">
                Add the technologies, concepts or skills you want to learn.
              </p>

              <div className="user-profile-form-group">
                <label htmlFor="learningGoals">What do you want to learn?</label>
                <textarea
                  id="learningGoals"
                  name="learningGoals"
                  value={formData.learningGoals}
                  onChange={handleChange}
                  placeholder="Data Structures, Backend Development, Machine Learning..."
                  rows={3}
                />
                <small>Separate multiple goals with commas.</small>
              </div>

              <div className="user-profile-tags">
                {convertToArray(formData.learningGoals).map(
                  (goal, index) => (
                    <span key={`${goal}-${index}`}>{goal}</span>
                  )
                )}
              </div>
            </div>

            <div className="user-profile-form-actions">
              <button
                type="button"
                className="user-profile-cancel-button"
                onClick={handleReset}
                disabled={saving}
              >
                Reset
              </button>

              <button
                type="submit"
                className="user-profile-edit-button"
                disabled={saving}
              >
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </form>
        </div>
      </section>
    </>
  );
}

function ActivitiesSection() {
  const [registrations, setRegistrations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchActivities = async () => {
    try {
      setLoading(true);
      setError('');

      const response = await apiRequest('/events/my-registrations');
      setRegistrations(response.registrations || []);
    } catch (err) {
      setError(err.message || 'Unable to load your activities.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchActivities();
  }, []);

  const formatEventDate = (date) => {
    if (!date) return 'Date to be announced';

    const parsedDate = new Date(date);

    if (Number.isNaN(parsedDate.getTime())) {
      return 'Date to be announced';
    }

    return parsedDate.toLocaleDateString('en-IN', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  const activeRegistrations = registrations.filter(
    (item) => item.status === 'registered'
  );

  const cancelledRegistrations = registrations.filter(
    (item) => item.status === 'cancelled'
  );

  if (loading) {
    return (
      <div className="user-profile-state">
        <div className="user-profile-spinner" />
        <p>Loading your activities...</p>
      </div>
    );
  }

  return (
    <>
      <div className="user-dashboard-heading">
        <div>
          <p className="user-dashboard-eyebrow">YOUR CODESPHERE JOURNEY</p>
          <h1>My Activities</h1>
          <p>
            Track your event registrations and participation in the
            CodeSphere community.
          </p>
        </div>
      </div>

      {error && (
        <div className="user-profile-alert error">
          {error}
          <button
            type="button"
            className="user-profile-edit-button mt-3"
            onClick={fetchActivities}
          >
            Try Again
          </button>
        </div>
      )}

      {!error && (
        <>
          <div className="user-workspace-grid user-activities-summary">
            <div className="user-workspace-card">
              <span className="user-workspace-icon green">
                <i className="bi bi-calendar-check" />
              </span>
              <h3>{activeRegistrations.length}</h3>
              <p>Active registrations</p>
            </div>

            <div className="user-workspace-card">
              <span className="user-workspace-icon coral">
                <i className="bi bi-calendar-x" />
              </span>
              <h3>{cancelledRegistrations.length}</h3>
              <p>Cancelled registrations</p>
            </div>

            <div className="user-workspace-card">
              <span className="user-workspace-icon purple">
                <i className="bi bi-calendar-event" />
              </span>
              <h3>{registrations.length}</h3>
              <p>Total registrations</p>
            </div>
          </div>

          <section className="user-dashboard-section">
            <div className="user-section-heading">
              <div>
                <h2>Your event registrations</h2>
                <p>
                  Events you have registered for through your CodeSphere
                  account.
                </p>
              </div>

              <Link to="/events" className="user-text-link">
                Explore events →
              </Link>
            </div>

            {registrations.length === 0 ? (
              <div className="user-projects-empty">
                <div className="user-coming-icon">
                  <i className="bi bi-calendar-event" />
                </div>

                <h2>No activities yet</h2>

                <p>
                  You haven't registered for any CodeSphere events yet.
                  Explore upcoming events and join the community.
                </p>

                <Link to="/events" className="user-profile-edit-button">
                  Explore Events →
                </Link>
              </div>
            ) : (
              <div className="user-projects-grid">
                {registrations.map((registration) => {
                  const event = registration.event;
                  const isActive = registration.status === 'registered';

                  return (
                    <article
                      className="user-project-card"
                      key={registration._id}
                    >
                      <div className="user-project-card-top">
                        <div className="user-project-code-icon">
                          <i className="bi bi-calendar-event" />
                        </div>

                        <span
                          className={`user-project-status ${isActive ? 'completed' : 'planning'
                            }`}
                        >
                          {isActive ? 'Registered' : 'Cancelled'}
                        </span>
                      </div>

                      <div className="user-project-card-content">
                        <span className="user-dashboard-eyebrow">
                          {event?.category || 'CodeSphere Event'}
                        </span>

                        <h3>{event?.title || 'Event unavailable'}</h3>

                        <p className="user-project-description">
                          {event?.description
                            ? event.description
                              .replace(/<[^>]*>/g, ' ')
                              .slice(0, 160)
                            : 'Event details are not available.'}
                        </p>

                        <div className="user-activity-details">
                          <p>
                            <i className="bi bi-calendar3" />
                            {formatEventDate(event?.date)}
                          </p>

                          <p>
                            <i className="bi bi-geo-alt" />
                            {event?.venue || event?.mode || 'Venue to be announced'}
                          </p>

                          <p>
                            <i className="bi bi-clock-history" />
                            Registered: {formatEventDate(registration.registeredAt)}
                          </p>
                        </div>
                      </div>

                      {event?.slug && (
                        <div className="user-project-links">
                          <Link to={`/events/${event.slug}`}>
                            View Event Details →
                          </Link>
                        </div>
                      )}
                    </article>
                  );
                })}
              </div>
            )}
          </section>
        </>
      )}
    </>
  );
}

function ComingSoonSection({ details }) {
  return (
    <section className="user-coming-soon">
      <div className="user-coming-icon">
        {details.icon === 'code' ? '</>' : '✧'}
      </div>
      <p className="user-dashboard-eyebrow">YOUR WORKSPACE</p>
      <h2>{details.title}</h2>
      <p>{details.description}</p>
      <span className="user-coming-badge">
        Coming in the next development phase
      </span>
    </section>
  );
}

export default function UserDashboard() {
  const { user, logout } = useAuth();
  const location = useLocation();

  const pathname = location.pathname.replace(/\/+$/, '') || '/dashboard';

  const details = sectionDetails[pathname];

  return (
    <>
      <Navbar />

      <main className="user-dashboard-page">
        <aside className="user-sidebar">
          <Link to="/">
            <img src={logo} alt="Codesphere Logo" />
          </Link>

          <div className="user-sidebar-label">WORKSPACE</div>

          <nav
            className="user-sidebar-navigation"
            aria-label="Dashboard navigation"
          >
            {navigation.map((item) => (
              <SidebarLink
                key={item.path}
                item={item}
                pathname={pathname}
              />
            ))}
          </nav>

          <div className="user-sidebar-label user-account-label-heading">
            ACCOUNT
          </div>

          <nav
            className="user-sidebar-navigation"
            aria-label="Account navigation"
          >
            {accountNavigation.map((item) => (
              <SidebarLink
                key={item.path}
                item={item}
                pathname={pathname}
              />
            ))}
          </nav>
        </aside>

        <div className="user-dashboard-main">
          <div className="user-dashboard-container">
            {pathname === '/dashboard/profile' ? (
              <ProfileSection />
            ) : pathname === '/dashboard/projects' ? (
              <ProjectsSection />
            ) : pathname === '/dashboard/skills' ? (
              <SkillsSection />
            ) : pathname === '/dashboard/activities' ? (
              <ActivitiesSection />
            ) : details ? (
              <ComingSoonSection details={details} />
            ) : (
              <Overview user={user} />
            )}
          </div>
        </div>
      </main>

      <nav className="user-mobile-nav" aria-label="Mobile dashboard navigation">
        {navigation.slice(0, 5).map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            end={item.path === '/dashboard'}
            className={() => {
              const active =
                item.path === '/dashboard'
                  ? pathname === '/dashboard'
                  : pathname.startsWith(item.path);

              return `user-mobile-nav-link ${active ? 'active' : ''}`;
            }}
          >
            <span aria-hidden="true">
              {item.icon === 'grid' && '▦'}
              {item.icon === 'user' && '♙'}
              {item.icon === 'code' && '</>'}
              {item.icon === 'layers' && '▤'}
              {item.icon === 'calendar' && '▦'}
            </span>
            <small>
              {item.label === 'Skills & Learning'
                ? 'Skills'
                : item.label.replace('My ', '')}
            </small>
          </NavLink>
        ))}
      </nav>
    </>
  );
}

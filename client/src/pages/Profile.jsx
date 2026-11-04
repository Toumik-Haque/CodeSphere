
import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { apiRequest } from '../lib/api';
import Navbar from '../components/Navbar';
import '../css/Profile.css';

const previewUser = {
  name: 'Alex Morgan',
  email: 'alex.morgan@example.com',
  role: 'student',
  createdAt: '2025-08-15T00:00:00.000Z',
  collegeName: 'Alipurduar Government Engineering and Management College',
  department: 'Artificial Intelligence',
  yearOfStudy: '2nd Year',
};

const departments = [
  'Artificial Intelligence',
  'Computer Science and Engineering',
  'Information Technology',
  'Electronics and Communication Engineering',
  'Electrical Engineering',
  'Mechanical Engineering',
  'Civil Engineering',
  'Other',
];

const skillOptions = [
  'Java', 'C', 'C++', 'Python', 'JavaScript', 'TypeScript',
  'HTML', 'CSS', 'React', 'Node.js', 'Express.js', 'MongoDB',
  'MySQL', 'Git', 'GitHub', 'Data Structures', 'Algorithms',
  'Machine Learning', 'Artificial Intelligence', 'Data Science',
  'Problem Solving', 'Figma', 'Linux',
];

const emptyProfile = {
  phone: '',
  city: '',
  bio: '',
  gender: '',
  dateOfBirth: '',
  collegeName: '',
  degree: 'B.Tech',
  department: '',
  yearOfStudy: '',
  graduationYear: '',
  skills: [],
  codingProfiles: [],
  projects: [],
  achievements: [],
  activities: [],
};

const sectionConfig = [
  {
    id: 'education',
    title: 'Education',
    subtitle: 'Your academic background',
    icon: 'bi-mortarboard',
    fields: [
      { name: 'collegeName', label: 'College / University', placeholder: 'Enter your college name', full: true },
      { name: 'degree', label: 'Degree', type: 'select', options: ['B.Tech', 'B.E.', 'BCA', 'B.Sc', 'M.Tech', 'MCA', 'M.Sc', 'Diploma', 'Other'] },
      { name: 'department', label: 'Department / Branch', type: 'select', options: departments },
      { name: 'yearOfStudy', label: 'Current year', type: 'select', options: ['1st Year', '2nd Year', '3rd Year', '4th Year'] },
      { name: 'graduationYear', label: 'Expected graduation year', type: 'select', options: Array.from({ length: 9 }, (_, i) => String(new Date().getFullYear() + i)) },
    ],
  },
  {
    id: 'codingProfiles',
    title: 'Coding Profiles',
    subtitle: 'Your coding and developer accounts',
    icon: 'bi-terminal',
    collection: 'codingProfiles',
    fields: [
      { name: 'platform', label: 'Platform', type: 'select', options: ['GitHub', 'LeetCode', 'CodeChef', 'Codeforces', 'HackerRank', 'GeeksforGeeks', 'HackerEarth', 'Other'] },
      { name: 'url', label: 'Profile URL', type: 'url', placeholder: 'https://...' },
    ],
  },
  {
    id: 'projects',
    title: 'Projects',
    subtitle: 'Showcase what you have built',
    icon: 'bi-kanban',
    collection: 'projects',
    fields: [
      { name: 'title', label: 'Project title', placeholder: 'e.g. Student Management System' },
      { name: 'type', label: 'Project type', type: 'select', options: ['Web Development', 'App Development', 'AI / ML', 'Data Science', 'Competitive Programming', 'Other'] },
      { name: 'technologies', label: 'Technologies used', placeholder: 'Java, React, MongoDB' },
      { name: 'github', label: 'GitHub repository', type: 'url', placeholder: 'https://github.com/...' },
      { name: 'demo', label: 'Live demo (optional)', type: 'url', placeholder: 'https://...' },
      { name: 'description', label: 'Project description', type: 'textarea', full: true, placeholder: 'What does your project do?' },
    ],
  },
  {
    id: 'achievements',
    title: 'Achievements & Certifications',
    subtitle: 'Your milestones, awards and courses',
    icon: 'bi-trophy',
    collection: 'achievements',
    fields: [
      { name: 'title', label: 'Achievement / Certificate title', placeholder: 'Enter title' },
      { name: 'category', label: 'Category', type: 'select', options: ['Coding Contest', 'Hackathon', 'Certification', 'Academic Achievement', 'Award', 'Other'] },
      { name: 'issuer', label: 'Issued by', placeholder: 'Organisation / Platform' },
      { name: 'year', label: 'Year', type: 'select', options: Array.from({ length: 12 }, (_, i) => String(new Date().getFullYear() - i)) },
      { name: 'link', label: 'Certificate / proof link (optional)', type: 'url', placeholder: 'https://...' },
    ],
  },
  {
    id: 'activities',
    title: 'Club Activities',
    subtitle: 'Your CodeSphere participation',
    icon: 'bi-people',
    collection: 'activities',
    fields: [
      { name: 'title', label: 'Activity / Event name', placeholder: 'e.g. CodeSphere Hackathon' },
      { name: 'role', label: 'Your role', type: 'select', options: ['Participant', 'Volunteer', 'Organizer', 'Team Lead', 'Core Team Member', 'Coordinator', 'Other'] },
      { name: 'year', label: 'Year', type: 'select', options: Array.from({ length: 8 }, (_, i) => String(new Date().getFullYear() - i)) },
      { name: 'description', label: 'Description (optional)', type: 'textarea', full: true, placeholder: 'What did you do or learn?' },
    ],
  },
];

function Field({ field, value, onChange }) {
  const common = {
    id: field.name,
    name: field.name,
    value: value || '',
    onChange: (event) => onChange(field.name, event.target.value),
    placeholder: field.placeholder || `Enter ${field.label.toLowerCase()}`,
  };

  return (
    <div className={`profile-form-field ${field.full ? 'profile-form-full' : ''}`}>
      <label htmlFor={field.name}>{field.label}</label>

      {field.type === 'select' ? (
        <select {...common}>
          <option value="">Select {field.label}</option>
          {field.options.map((option) => (
            <option key={option} value={option}>{option}</option>
          ))}
        </select>
      ) : field.type === 'textarea' ? (
        <textarea {...common} rows={4} />
      ) : (
        <input
          {...common}
          type={field.type === 'url' ? 'url' : 'text'}
        />
      )}
    </div>
  );
}

function ProfileSection({ section, profile, onSave, onAdd, onDelete }) {
  const [expanded, setExpanded] = useState(false);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({});
  const [editingIndex, setEditingIndex] = useState(null);

  const isCollection = Boolean(section.collection);
  const savedItems = isCollection && Array.isArray(profile[section.collection])
    ? profile[section.collection]
    : [];

  const hasEducation = section.id === 'education';
  const hasPersonal = section.id === 'personal';

  const startEdit = (item = {}, index = null) => {
    setForm({ ...item });
    setEditingIndex(index);
    setEditing(true);
    setExpanded(true);
  };

  const cancelEdit = () => {
    setEditing(false);
    setEditingIndex(null);
    setForm({});
  };

  const handleSave = (event) => {
    event.preventDefault();

    if (isCollection) {
      if (editingIndex === null) {
        onAdd(section.collection, form);
      } else {
        onSave(section.collection, editingIndex, form);
      }
    } else {
      onSave(section.id, form);
    }

    cancelEdit();
  };

  const updateField = (name, value) => {
    setForm((previous) => ({ ...previous, [name]: value }));
  };

  const summary = hasPersonal
    ? [profile.phone, profile.city].filter(Boolean).join(' · ')
    : hasEducation
      ? [profile.collegeName, profile.department, profile.yearOfStudy].filter(Boolean).join(' · ')
      : `${savedItems.length} ${savedItems.length === 1 ? 'entry' : 'entries'} added`;

  return (
    <section className={`profile-builder-section ${expanded ? 'is-expanded' : ''}`}>
      <button
        type="button"
        className="profile-builder-heading"
        onClick={() => {
          setExpanded((value) => !value);
          if (editing) cancelEdit();
        }}
        aria-expanded={expanded}
      >
        <span className="profile-builder-icon">
          <i className={`bi ${section.icon}`} />
        </span>

        <span className="profile-builder-heading-text">
          <strong>{section.title}</strong>
          <small>{summary || section.subtitle}</small>
        </span>

        <span className="profile-builder-heading-actions">
          {isCollection && (
            <span className="profile-entry-count">{savedItems.length}</span>
          )}
          <i className={`bi ${expanded ? 'bi-chevron-up' : 'bi-chevron-down'}`} />
        </span>
      </button>

      {expanded && (
        <div className="profile-builder-content">
          {editing ? (
            <form className="profile-edit-form" onSubmit={handleSave}>
              {section.fields.map((field) => (
                <Field
                  key={field.name}
                  field={field}
                  value={form[field.name]}
                  onChange={updateField}
                />
              ))}

              <div className="profile-form-actions">
                <button
                  type="button"
                  className="profile-action-button"
                  onClick={cancelEdit}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="profile-action-button profile-primary-button"
                >
                  <i className="bi bi-check2" /> Save details
                </button>
              </div>
            </form>
          ) : (
            <>
              {isCollection && savedItems.length > 0 && (
                <div className="profile-saved-entries">
                  {savedItems.map((item, index) => (
                    <article className="profile-saved-entry" key={`${section.id}-${index}`}>
                      <div className="profile-saved-entry-info">
                        <strong>{item.title || item.platform || 'Profile entry'}</strong>
                        <p>
                          {item.description || item.url || item.role ||
                            item.category || item.technologies || item.issuer ||
                            'Added to your profile'}
                        </p>
                        {(item.url || item.github || item.demo || item.link) && (
                          <div className="profile-entry-links">
                            {[
                              ['Profile', item.url],
                              ['GitHub', item.github],
                              ['Demo', item.demo],
                              ['Proof', item.link],
                            ].filter(([, url]) => url).map(([label, url]) => (
                              <a key={label} href={url} target="_blank" rel="noreferrer">
                                {label} <i className="bi bi-box-arrow-up-right" />
                              </a>
                            ))}
                          </div>
                        )}
                      </div>

                      <div className="profile-entry-actions">
                        <button
                          type="button"
                          className="profile-icon-button"
                          title="Edit"
                          aria-label="Edit entry"
                          onClick={() => startEdit(item, index)}
                        >
                          <i className="bi bi-pencil" />
                        </button>
                        <button
                          type="button"
                          className="profile-icon-button profile-delete-button"
                          title="Remove"
                          aria-label="Remove entry"
                          onClick={() => onDelete(section.collection, index)}
                        >
                          <i className="bi bi-trash3" />
                        </button>
                      </div>
                    </article>
                  ))}
                </div>
              )}

              {!isCollection && hasPersonal && (
                <div className="profile-information-grid">
                  {[
                    ['Phone number', profile.phone],
                    ['City', profile.city],
                    ['Gender', profile.gender],
                    ['Date of birth', profile.dateOfBirth],
                  ].map(([label, value]) => (
                    <div key={label}>
                      <span>{label}</span>
                      <strong>{value || 'Not added yet'}</strong>
                    </div>
                  ))}
                  {profile.bio && (
                    <div className="profile-bio-display">
                      <span>About me</span>
                      <strong>{profile.bio}</strong>
                    </div>
                  )}
                </div>
              )}

              {!isCollection && hasEducation && (
                <div className="profile-information-grid">
                  {[
                    ['College / University', profile.collegeName],
                    ['Degree', profile.degree],
                    ['Department', profile.department],
                    ['Current year', profile.yearOfStudy],
                    ['Graduation year', profile.graduationYear],
                  ].map(([label, value]) => (
                    <div key={label}>
                      <span>{label}</span>
                      <strong>{value || 'Not added yet'}</strong>
                    </div>
                  ))}
                </div>
              )}

              {isCollection && savedItems.length === 0 && (
                <div className="profile-empty-state">
                  <i className={`bi ${section.icon}`} />
                  <h3>Nothing added yet</h3>
                  <p>{section.subtitle}</p>
                </div>
              )}

              <div className="profile-section-bottom">
                <button
                  type="button"
                  className="profile-action-button profile-primary-button"
                  onClick={() => startEdit()}
                >
                  <i className={`bi ${isCollection ? 'bi-plus-lg' : 'bi-pencil'}`} />
                  {isCollection ? `Add ${section.title}` : 'Edit details'}
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </section>
  );
}

export default function Profile({ preview = false }) {
  const { user } = useAuth();

  const [profile, setProfile] = useState(() => (
    preview
      ? {
          ...emptyProfile,
          ...previewUser,
          skills: ['Java', 'Python', 'HTML', 'CSS', 'JavaScript'],
        }
      : { ...emptyProfile, ...(user || {}) }
  ));

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(!preview);
  const [skillSearch, setSkillSearch] = useState('');
  const [skillLevel, setSkillLevel] = useState('Intermediate');

  useEffect(() => {
    if (preview) {
      setProfile({
        ...emptyProfile,
        ...previewUser,
        skills: ['Java', 'Python', 'HTML', 'CSS', 'JavaScript'],
      });
      setLoading(false);
      return;
    }

    let active = true;

    async function loadProfile() {
      try {
        const data = await apiRequest('/auth/me');

        if (active && data.user) {
          setProfile((previous) => ({
            ...emptyProfile,
            ...previous,
            ...data.user,
            skills: Array.isArray(data.user.skills) ? data.user.skills : [],
            codingProfiles: Array.isArray(data.user.codingProfiles) ? data.user.codingProfiles : [],
            projects: Array.isArray(data.user.projects) ? data.user.projects : [],
            achievements: Array.isArray(data.user.achievements) ? data.user.achievements : [],
            activities: Array.isArray(data.user.activities) ? data.user.activities : [],
          }));
        }
      } catch (err) {
        if (active) setError(err.message || 'Unable to load your profile.');
      } finally {
        if (active) setLoading(false);
      }
    }

    loadProfile();

    return () => {
      active = false;
    };
  }, [preview]);

  const currentUser = preview ? profile : { ...user, ...profile };
  const name = currentUser?.name || 'CodeSphere Member';
  const email = currentUser?.email || '';
  const initial = name.charAt(0).toUpperCase();

  const joinedDate = currentUser?.createdAt
    ? new Date(currentUser.createdAt).toLocaleDateString('en-IN', {
        month: 'long',
        year: 'numeric',
      })
    : 'CodeSphere Member';

  const completion = useMemo(() => {
    const checks = [
      Boolean(profile.name),
      Boolean(profile.phone),
      Boolean(profile.city),
      Boolean(profile.bio),
      Boolean(profile.collegeName),
      Boolean(profile.department),
      Boolean(profile.yearOfStudy),
      Array.isArray(profile.skills) && profile.skills.length > 0,
      Array.isArray(profile.codingProfiles) && profile.codingProfiles.length > 0,
      Array.isArray(profile.projects) && profile.projects.length > 0,
      Array.isArray(profile.achievements) && profile.achievements.length > 0,
      Array.isArray(profile.activities) && profile.activities.length > 0,
    ];

    return Math.round((checks.filter(Boolean).length / checks.length) * 100);
  }, [profile]);

  const updateSimpleSection = (_section, values) => {
    setProfile((previous) => ({ ...previous, ...values }));
  };

  const addEntry = (section, item) => {
    setProfile((previous) => ({
      ...previous,
      [section]: [...(previous[section] || []), item],
    }));
  };

  const updateEntry = (section, index, item) => {
    setProfile((previous) => ({
      ...previous,
      [section]: (previous[section] || []).map((entry, i) =>
        i === index ? item : entry
      ),
    }));
  };

  const deleteEntry = (section, index) => {
    setProfile((previous) => ({
      ...previous,
      [section]: (previous[section] || []).filter((_, i) => i !== index),
    }));
  };

  const addSkill = (skill) => {
    if (!skill || profile.skills.some((item) => (item.name || item) === skill)) return;

    setProfile((previous) => ({
      ...previous,
      skills: [...previous.skills, { name: skill, level: skillLevel }],
    }));

    setSkillSearch('');
  };

  const removeSkill = (index) => {
    setProfile((previous) => ({
      ...previous,
      skills: previous.skills.filter((_, i) => i !== index),
    }));
  };

  const filteredSkills = skillOptions.filter((skill) =>
    skill.toLowerCase().includes(skillSearch.toLowerCase()) &&
    !profile.skills.some((item) => (item.name || item) === skill)
  );

  const personalSection = {
    id: 'personal',
    title: 'Personal details',
    subtitle: 'Your basic information',
    icon: 'bi-person-vcard',
    fields: [
      { name: 'name', label: 'Full name', placeholder: 'Enter your full name' },
      { name: 'phone', label: 'Phone number', placeholder: 'Enter phone number' },
      { name: 'city', label: 'City', placeholder: 'Enter your city' },
      { name: 'gender', label: 'Gender', type: 'select', options: ['Male', 'Female', 'Prefer not to say', 'Other'] },
      { name: 'dateOfBirth', label: 'Date of birth', placeholder: 'DD/MM/YYYY' },
      { name: 'bio', label: 'About me', type: 'textarea', full: true, placeholder: 'Tell the community about yourself...' },
    ],
  };

  return (
    <>
      <Navbar />

      <main className="student-profile-page">
        <div className="student-profile-container">
          {preview && (
            <div className="profile-message">
              <i className="bi bi-eye" />
              Preview mode — sample data. Changes are temporary.
            </div>
          )}

          <div className="student-profile-breadcrumb">
            <Link to="/">Home</Link>
            <i className="bi bi-chevron-right" />
            <span>My Profile</span>
          </div>

          <div className="student-profile-heading">
            <div>
              <p className="student-profile-eyebrow">CODESPHERE COMMUNITY</p>
              <h1>My Profile</h1>
              <p>Showcase your skills, projects and coding journey.</p>
            </div>
            <Link to="/" className="profile-back-link">
              <i className="bi bi-arrow-left" /> Back to website
            </Link>
          </div>

          {loading && <div className="profile-message">Loading your profile...</div>}

          {error && (
            <div className="profile-message profile-message-error" role="alert">
              {error}
            </div>
          )}

          <div className="student-profile-layout">
            <aside className="student-profile-sidebar">
              <section className="student-identity-card">
                <div className="student-cover" />
                <div className="student-avatar">{initial}</div>

                <div className="student-identity-content">
                  <h2>{name}</h2>
                  <p>{email}</p>
                  <span className="student-member-badge">
                    <i className="bi bi-patch-check-fill" /> CodeSphere Member
                  </span>
                </div>

                <div className="student-identity-footer">
                  <span><i className="bi bi-calendar3" /> Member since</span>
                  <strong>{joinedDate}</strong>
                </div>
              </section>

              <section className="profile-sidebar-card">
                <h3>Profile completion</h3>
                <div className="profile-completion-top">
                  <span>Complete your profile</span>
                  <strong>{completion}%</strong>
                </div>
                <div
                  className="profile-progress-track"
                  role="progressbar"
                  aria-valuenow={completion}
                  aria-valuemin="0"
                  aria-valuemax="100"
                  aria-label="Profile completion"
                >
                  <div className="profile-progress-fill" style={{ width: `${completion}%` }} />
                </div>
                <p>A complete profile helps the community discover your work.</p>
              </section>
            </aside>

            <div className="student-profile-main">
              <section className="profile-welcome-card">
                <div>
                  <span className="profile-welcome-label">YOUR STUDENT SPACE</span>
                  <h2>Welcome, {name.split(' ')[0]}!</h2>
                  <p>Showcase your skills, projects and achievements to the community.</p>
                </div>
                <div className="profile-welcome-icon">
                  <i className="bi bi-code-square" />
                </div>
              </section>

              <section className="profile-section-card profile-builder-card">
                <div className="profile-section-heading">
                  <div>
                    <h2>Build your profile</h2>
                    <p>Open a section to add or update your information.</p>
                  </div>
                  <span className="profile-section-icon">
                    <i className="bi bi-person-gear" />
                  </span>
                </div>

                <ProfileSection
                  section={personalSection}
                  profile={profile}
                  onSave={updateSimpleSection}
                />

                <ProfileSection
                  section={sectionConfig[0]}
                  profile={profile}
                  onSave={updateSimpleSection}
                />

                <div className="profile-builder-section">
                  <div className="profile-builder-static-heading">
                    <span className="profile-builder-icon">
                      <i className="bi bi-code-slash" />
                    </span>
                    <span className="profile-builder-heading-text">
                      <strong>Technical skills</strong>
                      <small>{profile.skills.length} skills added</small>
                    </span>
                  </div>

                  <div className="profile-builder-content">
                    <div className="profile-skills-list">
                      {profile.skills.map((skill, index) => (
                        <span className="profile-skill-tag" key={`${skill.name || skill}-${index}`}>
                          {skill.name || skill}
                          {skill.level && <small>{skill.level}</small>}
                          <button
                            type="button"
                            onClick={() => removeSkill(index)}
                            aria-label={`Remove ${skill.name || skill}`}
                          >
                            <i className="bi bi-x" />
                          </button>
                        </span>
                      ))}
                      {profile.skills.length === 0 && (
                        <p className="profile-no-skills">No skills added yet.</p>
                      )}
                    </div>

                    <div className="profile-skill-adder">
                      <div className="profile-form-field">
                        <label htmlFor="skill-search">Search or select a skill</label>
                        <input
                          id="skill-search"
                          list="codesphere-skills"
                          value={skillSearch}
                          onChange={(event) => setSkillSearch(event.target.value)}
                          placeholder="Start typing, e.g. Java..."
                        />
                        <datalist id="codesphere-skills">
                          {filteredSkills.map((skill) => (
                            <option key={skill} value={skill} />
                          ))}
                        </datalist>
                      </div>

                      <div className="profile-form-field">
                        <label htmlFor="skill-level">Proficiency</label>
                        <select
                          id="skill-level"
                          value={skillLevel}
                          onChange={(event) => setSkillLevel(event.target.value)}
                        >
                          <option>Beginner</option>
                          <option>Intermediate</option>
                          <option>Advanced</option>
                        </select>
                      </div>

                      <button
                        type="button"
                        className="profile-action-button profile-primary-button"
                        onClick={() => addSkill(skillSearch.trim())}
                        disabled={!skillSearch.trim()}
                      >
                        <i className="bi bi-plus-lg" /> Add skill
                      </button>
                    </div>
                  </div>
                </div>

                {sectionConfig.slice(1).map((section) => (
                  <ProfileSection
                    key={section.id}
                    section={section}
                    profile={profile}
                    onSave={updateEntry}
                    onAdd={addEntry}
                    onDelete={deleteEntry}
                  />
                ))}
              </section>

              <section className="profile-sidebar-card profile-help-card">
                <div className="profile-help-content">
                  <h3>Need help?</h3>
                  <p>Questions about your account? Our team is here to help.</p>
                </div>
                <Link to="/team">
                  Meet the team <i className="bi bi-arrow-up-right" />
                </Link>
              </section>

              <div className="profile-page-footer">
                <span>
                  <i className="bi bi-shield-lock" /> Your profile is part of the CodeSphere community.
                </span>
                <Link to="/">Explore CodeSphere</Link>
              </div>
            </div>
          </div>
        </div>
      </main>
    </>
  );
}

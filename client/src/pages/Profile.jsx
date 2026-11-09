
import { Fragment, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { apiRequest } from '../lib/api';
import Navbar from '../components/Navbar';
import DashboardProfileSidebar from '../components/DashboardProfileSidebar';
import BadgeLeaderboard from '../components/BadgeLeaderboard';
import '../css/Profile.css';
import { calculateProfileCompletion } from '../lib/profileCompletion';

import * as pdfjsLib from 'pdfjs-dist';
import pdfWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import ProfileBadges from '../components/ProfileBadges';
import { parseResumeText as parseResume, itemsToLines } from '../lib/resumeParser';

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;

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

const codingPlatforms = [
  'LeetCode',
  'CodeChef',
  'Codeforces',
  'HackerRank',
  'GeeksforGeeks',
  'HackerEarth',
  'Other',
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
  technicalInterests: [],
  learningGoals: [],
  codingProfiles: [],
  projects: [],
  achievements: [],
};

const IMAGE_SIZE_LIMIT = 5 * 1024 * 1024;
// Default profile banner (client/public), used until a student uploads one.
const DEFAULT_BANNER = '/default-profile-banner.webp';
const RESUME_SIZE_LIMIT = 5 * 1024 * 1024;

const normalizeProject = (project) => ({
  ...project,
  featured: Boolean(project.featured),
  status: project.status || 'Completed',
  technologies: Array.isArray(project.technologies)
    ? project.technologies.join(', ')
    : '',
  github: project.githubUrl || '',
  demo: project.liveUrl || '',
  description: project.description || '',
});

const normalizeProfile = (source = {}) => {
  const skillDetails = Array.isArray(source.skillDetails) ? source.skillDetails : [];
  const legacySkills = Array.isArray(source.skills) ? source.skills : [];
  const skillsByName = new Map();
  [...skillDetails, ...legacySkills].forEach((skill) => {
    const rawName = typeof skill === 'string' ? skill : skill?.name;
    const name = typeof rawName === 'string' ? rawName.trim() : '';
    if (!name) return;
    const key = name.toLowerCase();
    const level = ['Beginner', 'Intermediate', 'Advanced'].includes(skill?.level)
      ? skill.level
      : 'Intermediate';
    const current = skillsByName.get(key);
    if (!current || (current.level === 'Intermediate' && level !== 'Intermediate')) {
      skillsByName.set(key, { name, level });
    }
  });
  const profile = { ...emptyProfile, ...source };
  delete profile.skillDetails;
  delete profile.skills;
  const codingProfiles = Array.isArray(source.codingProfiles)
    ? source.codingProfiles
    : [];
  const legacyGithubProfile = codingProfiles.find(
    (profile) => profile.platform?.toLowerCase() === 'github'
  );

  return {
    ...profile,
    github: (typeof source.github === 'string' ? source.github : '') || legacyGithubProfile?.url || '',
    skills: [...skillsByName.values()],
    technicalInterests: Array.isArray(source.technicalInterests)
      ? source.technicalInterests
      : [],
    learningGoals: Array.isArray(source.learningGoals) ? source.learningGoals : [],
    codingProfiles: codingProfiles.filter(
      (profile) => profile.platform?.toLowerCase() !== 'github'
    ),
    projects: Array.isArray(source.projects)
      ? source.projects.map(normalizeProject)
      : [],
    achievements: Array.isArray(source.achievements) ? source.achievements : [],
  };
};

const readImageFile = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error('Unable to read this image.'));
    reader.readAsDataURL(file);
  });

const sectionConfig = [
  {
    id: 'education',
    title: 'Education',
    subtitle: 'Your academic background',
    icon: 'bi-mortarboard',
    fields: [
      { name: 'collegeName', label: 'College / University', placeholder: 'Enter your college name', required: true, full: true },
      { name: 'degree', label: 'Degree', type: 'select', options: ['B.Tech', 'B.E.', 'BCA', 'B.Sc', 'M.Tech', 'MCA', 'M.Sc', 'Diploma', 'Other'] },
      { name: 'department', label: 'Department / Branch', type: 'select', options: departments },
      { name: 'yearOfStudy', label: 'Current year', type: 'select', options: ['1st Year', '2nd Year', '3rd Year', '4th Year'] },
      { name: 'graduationYear', label: 'Expected graduation year', type: 'select', options: Array.from({ length: 9 }, (_, i) => String(new Date().getFullYear() + i)) },
    ],
  },
  {
    id: 'learning',
    title: 'Skills & Learning',
    subtitle: 'Your interests and learning goals',
    icon: 'bi-lightbulb',
    fields: [
      { name: 'technicalInterests', label: 'Technical interests', type: 'textarea', placeholder: 'Web development, AI, cybersecurity' },
      { name: 'learningGoals', label: 'Learning goals', type: 'textarea', placeholder: 'Data structures, backend development' },
    ],
  },
  {
    id: 'codingProfiles',
    title: 'Coding Profiles',
    subtitle: 'Your coding and developer accounts',
    icon: 'bi-terminal',
    collection: 'codingProfiles',
    fields: [
      { name: 'platform', label: 'Platform', type: 'select', options: codingPlatforms },
      { name: 'url', label: 'Profile URL', type: 'url', placeholder: 'https://...', required: true },
    ],
  },
  {
    id: 'professionalLinks',
    title: 'Professional links',
    subtitle: 'Connect your professional accounts',
    icon: 'bi-link-45deg',
    fields: [
      { name: 'github', label: 'GitHub profile', type: 'url', placeholder: 'https://github.com/username' },
      { name: 'linkedin', label: 'LinkedIn profile', type: 'url', placeholder: 'https://linkedin.com/in/username' },
      { name: 'portfolio', label: 'Portfolio website', type: 'url', placeholder: 'https://yourportfolio.com' },
    ],
  },
  {
    id: 'projects',
    title: 'Projects',
    subtitle: 'Showcase what you have built',
    icon: 'bi-kanban',
    collection: 'projects',
    fields: [
      { name: 'title', label: 'Project title', placeholder: 'e.g. Student Management System', required: true },
      { name: 'type', label: 'Project type', type: 'select', options: ['Web Development', 'App Development', 'AI / ML', 'Data Science', 'Competitive Programming', 'Other'] },
      { name: 'technologies', label: 'Technologies used', placeholder: 'Java, React, MongoDB' },
      { name: 'github', label: 'GitHub repository', type: 'url', placeholder: 'https://github.com/...' },
      { name: 'demo', label: 'Live demo (optional)', type: 'url', placeholder: 'https://...' },
      { name: 'status', label: 'Project status', type: 'select', options: ['Completed', 'In Progress', 'Planning'] },
      { name: 'featured', label: 'Feature this project on my profile', type: 'checkbox', full: true },
      { name: 'description', label: 'Project description', type: 'textarea', full: true, placeholder: 'What does your project do?', required: true },
    ],
  },
  {
    id: 'achievements',
    title: 'Achievements & Certifications',
    subtitle: 'Your milestones, awards and courses',
    icon: 'bi-trophy',
    collection: 'achievements',
    fields: [
      { name: 'title', label: 'Achievement / Certificate title', placeholder: 'Enter title', required: true },
      { name: 'category', label: 'Category', type: 'select', options: ['Coding Contest', 'Hackathon', 'Certification', 'Academic Achievement', 'Award', 'Other'] },
      { name: 'issuer', label: 'Issued by', placeholder: 'Organisation / Platform' },
      { name: 'year', label: 'Year', type: 'select', options: Array.from({ length: 12 }, (_, i) => String(new Date().getFullYear() - i)) },
      { name: 'link', label: 'Certificate / proof link (optional)', type: 'url', placeholder: 'https://...' },
    ],
  },
];

/* =========================================
   RESUME TEXT EXTRACTION & PARSING
========================================= */

// Parsing lives in lib/resumeParser.js (sections, college, projects, links).

const renderPdfPageToCanvas = async (page) => {
  const viewport = page.getViewport({ scale: 1.6 });
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d');

  canvas.width = viewport.width;
  canvas.height = viewport.height;

  await page.render({
    canvasContext: context,
    viewport,
  }).promise;

  return canvas;
};

async function recognizeCanvas(canvas, onProgress) {
  const { createWorker } = await import('tesseract.js');

  const worker = await createWorker('eng', 1, {
    logger: (message) => {
      if (message.status === 'recognizing text') {
        onProgress?.(
          Math.round((message.progress || 0) * 100)
        );
      }
    },
  });

  try {
    const result = await worker.recognize(canvas);
    return result.data.text || '';
  } finally {
    await worker.terminate();
  }
}

const extractResumeText = async (file, onProgress) => {
  if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) {
    const buffer = await file.arrayBuffer();

    const pdf = await pdfjsLib.getDocument({
      data: new Uint8Array(buffer),
    }).promise;

    let extractedText = '';

    for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
      const page = await pdf.getPage(pageNumber);
      const content = await page.getTextContent();

      // Rebuild real lines from text positions (not one long line per page).
      extractedText += `${itemsToLines(content.items)}\n`;

      onProgress?.({
        stage: 'Reading PDF',
        progress: Math.round((pageNumber / pdf.numPages) * 30),
      });
    }

    if (extractedText.trim().length > 30) {
      return extractedText;
    }

    // Scanned PDF fallback: OCR the first five pages.
    let ocrText = '';
    const pagesToScan = Math.min(pdf.numPages, 5);

    for (let pageNumber = 1; pageNumber <= pagesToScan; pageNumber += 1) {
      const page = await pdf.getPage(pageNumber);
      const canvas = await renderPdfPageToCanvas(page);

      ocrText += await recognizeCanvas(canvas, (progress) => {
        onProgress?.({
          stage: `Reading scanned page ${pageNumber}`,
          progress: 30 + Math.round(
            ((pageNumber - 1 + progress / 100) / pagesToScan) * 65
          ),
        });
      });

      canvas.width = 0;
      canvas.height = 0;
    }

    return ocrText;
  }

  // Image resume OCR.
  const imageUrl = URL.createObjectURL(file);

  try {
    const image = new Image();

    await new Promise((resolve, reject) => {
      image.onload = resolve;
      image.onerror = () => reject(new Error('Unable to open this image.'));
      image.src = imageUrl;
    });

    const canvas = document.createElement('canvas');
    const maxWidth = 1800;
    const scale = Math.min(1, maxWidth / image.width);

    canvas.width = image.width * scale;
    canvas.height = image.height * scale;

    const context = canvas.getContext('2d');
    context.drawImage(image, 0, 0, canvas.width, canvas.height);

    const text = await recognizeCanvas(canvas, (progress) => {
      onProgress?.({
        stage: 'Recognizing text',
        progress,
      });
    });

    canvas.width = 0;
    canvas.height = 0;

    return text;
  } finally {
    URL.revokeObjectURL(imageUrl);
  }
};

/* =========================================
   TOAST
========================================= */

function Toast({ toast, onClose }) {
  if (!toast) return null;

  const styles = {
    success: { icon: 'bi-check-circle-fill', color: '#16834a', background: '#edf9f1', border: '#b9e6c9' },
    error: { icon: 'bi-x-circle-fill', color: '#c0392b', background: '#fff0ef', border: '#f2c4c0' },
    warning: { icon: 'bi-exclamation-triangle-fill', color: '#a66a00', background: '#fff8e8', border: '#f0dba8' },
    info: { icon: 'bi-info-circle-fill', color: '#245b83', background: '#edf6fc', border: '#c7dfef' },
  };

  const style = styles[toast.type] || styles.info;

  return (
    <div
      role="status"
      aria-live="polite"
      style={{
        position: 'fixed',
        right: '24px',
        bottom: '24px',
        zIndex: 99999,
        width: 'min(390px, calc(100vw - 32px))',
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        padding: '15px 16px',
        border: `1px solid ${style.border}`,
        borderRadius: '12px',
        background: style.background,
        color: '#243447',
        boxShadow: '0 8px 30px rgba(15, 35, 55, 0.16)',
        animation: 'codesphereToastIn 220ms ease-out',
      }}
    >
      <i className={`bi ${style.icon}`} style={{ color: style.color, fontSize: '21px', flexShrink: 0 }} />
      <span style={{ flex: 1, fontSize: '14px', lineHeight: 1.5 }}>{toast.message}</span>
      <button
        type="button"
        onClick={onClose}
        aria-label="Dismiss notification"
        style={{
          border: 0,
          background: 'transparent',
          color: '#64748b',
          cursor: 'pointer',
          padding: '3px',
          fontSize: '18px',
          lineHeight: 1,
        }}
      >
        <i className="bi bi-x-lg" />
      </button>
    </div>
  );
}

/* =========================================
   RESUME UPLOAD COMPONENT
========================================= */

function ResumeUpload({ profile, onApply, showToast, preview = false }) {
  const inputRef = useRef(null);
  // The resume file saved on the server (survives refreshes).
  const [savedResume, setSavedResume] = useState(null);
  const [savingResume, setSavingResume] = useState(false);

  useEffect(() => {
    if (preview) return undefined;
    let cancelled = false;
    apiRequest('/users/me/resume').then((r) => !cancelled && setSavedResume(r.resume)).catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [preview]);

  const saveResumeFile = async (file) => {
    if (preview) return;
    setSavingResume(true);
    try {
      const form = new FormData();
      form.append('resume', file, file.name);
      const { resume } = await apiRequest('/users/me/resume', { method: 'PUT', body: form });
      setSavedResume(resume);
    } catch (error) {
      showToast(`Your resume was read, but saving the file failed: ${error.message}`, 'warning');
    } finally {
      setSavingResume(false);
    }
  };

  const deleteSavedResume = async () => {
    if (!window.confirm('Delete your saved resume? You can upload it again any time.')) return;
    try {
      await apiRequest('/users/me/resume', { method: 'DELETE' });
      setSavedResume(null);
      showToast('Saved resume deleted.', 'success');
    } catch (error) {
      showToast(error.message, 'error');
    }
  };
  const [resumeOpen, setResumeOpen] = useState(() => {
    try {
      return localStorage.getItem('cs_profile_resume_open') === '1';
    } catch {
      return false;
    }
  });
  useEffect(() => {
    try {
      localStorage.setItem('cs_profile_resume_open', resumeOpen ? '1' : '0');
    } catch {
      /* ignore */
    }
  }, [resumeOpen]);

  const [fileName, setFileName] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [progressLabel, setProgressLabel] = useState('');
  const [draft, setDraft] = useState(null);
  const [selectedFields, setSelectedFields] = useState({});

  const fieldLabels = {
    name: 'Full name',
    phone: 'Phone number',
    collegeName: 'College / University',
    degree: 'Degree',
    department: 'Department',
    yearOfStudy: 'Current year',
    graduationYear: 'Graduation year',
  };

  const handleFile = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';

    if (!file) return;

    const isPdf =
      file.type === 'application/pdf' ||
      file.name.toLowerCase().endsWith('.pdf');

    const isImage = ['image/jpeg', 'image/png', 'image/jpg', 'image/webp']
      .includes(file.type);

    if (!isPdf && !isImage) {
      showToast('Please select a PDF, JPG, JPEG or PNG resume.', 'warning');
      return;
    }

    if (file.size > RESUME_SIZE_LIMIT) {
      showToast('Please select a resume smaller than 5 MB.', 'warning');
      return;
    }

    setFileName(file.name);
    saveResumeFile(file);
    setDraft(null);
    setProgress(0);
    setProgressLabel('');
    setIsProcessing(true);

    try {
      const text = await extractResumeText(file, (status) => {
        if (typeof status === 'object') {
          setProgressLabel(status.stage);
          setProgress(status.progress);
        } else {
          setProgress(status);
        }
      });

      if (!text.trim()) {
        throw new Error('No readable text was found in this resume.');
      }

      const extracted = parseResume(text, { departments, skillOptions });

      if (Object.keys(extracted).length === 0) {
        throw new Error(
          'We could not identify profile details. Try a clearer PDF or image.'
        );
      }

      setDraft(extracted);

      // Projects and coding profiles are picked one by one.
      setSelectedFields({
        ...Object.fromEntries(
          Object.keys(extracted)
            .filter((key) => key !== 'projects' && key !== 'codingProfiles')
            .map((key) => [key, true])
        ),
        ...Object.fromEntries((extracted.projects || []).map((_, i) => [`project:${i}`, true])),
        ...Object.fromEntries((extracted.codingProfiles || []).map((_, i) => [`profile:${i}`, true])),
      });

      showToast('Resume processed. Review the extracted information.', 'success');
    } catch (error) {
      console.error('Resume processing failed:', error);
      showToast(
        error.message || 'Unable to process this resume.',
        'error'
      );
    } finally {
      setIsProcessing(false);
    }
  };

  const updateDraft = (field, value) => {
    setDraft((previous) => ({
      ...previous,
      [field]: value,
    }));
  };

  const toggleField = (field) => {
    setSelectedFields((previous) => ({
      ...previous,
      [field]: !previous[field],
    }));
  };

  const applyExtractedDetails = async () => {
    if (!draft) return;

    const selected = Object.entries(selectedFields)
      .filter(([, checked]) => checked)
      .map(([field]) => field);

    if (selected.length === 0) {
      showToast('Select at least one detail to apply.', 'warning');
      return;
    }

    const updates = {};

    selected.forEach((field) => {
      if (field === 'skills') {
        const existingSkills = profile.skills || [];
        const existingNames = existingSkills.map((skill) =>
          (skill.name || skill).toLowerCase()
        );

        const newSkills = (draft.skills || [])
          .filter((skill) => !existingNames.includes(skill.toLowerCase()))
          .map((skill) => ({
            name: skill,
            level: 'Intermediate',
          }));

        updates.skills = [...existingSkills, ...newSkills];
      } else if (!field.includes(':')) {
        updates[field] = draft[field];
      }
    });

    // Projects: add the ticked ones whose title isn't on the profile yet.
    const pickedProjects = (draft.projects || []).filter((_, i) => selectedFields[`project:${i}`]);
    if (pickedProjects.length) {
      const existing = profile.projects || [];
      const titles = new Set(existing.map((p) => (p.title || '').toLowerCase().trim()));
      updates.projects = [...existing, ...pickedProjects.filter((p) => !titles.has(p.title.toLowerCase().trim()))];
    }

    // Coding profiles: one per platform.
    const pickedProfiles = (draft.codingProfiles || []).filter((_, i) => selectedFields[`profile:${i}`]);
    if (pickedProfiles.length) {
      const existing = profile.codingProfiles || [];
      const platforms = new Set(existing.map((p) => p.platform));
      updates.codingProfiles = [...existing, ...pickedProfiles.filter((p) => !platforms.has(p.platform))];
    }

    const saved = await onApply(updates);
    if (saved) {
      setDraft(null);
      setFileName('');
      setSelectedFields({});
    }
  };

  const discardResume = () => {
    setDraft(null);
    setFileName('');
    setSelectedFields({});
    setProgress(0);
    setProgressLabel('');
  };

  return (
    <section className={`profile-section-card resume-upload-card ${resumeOpen ? '' : 'is-collapsed'}`}>
      <button type="button" className="profile-section-heading profile-collapse-head" onClick={() => setResumeOpen(!resumeOpen)} aria-expanded={resumeOpen}>
        <div>
          <h2>Resume & CV</h2>
          <p>{savedResume ? `Saved: ${savedResume.name}` : 'Upload your resume and let us help complete your profile.'}</p>
        </div>
        <span className="profile-section-icon">
          <i className={`bi ${resumeOpen ? 'bi-chevron-up' : 'bi-chevron-down'}`} />
        </span>
      </button>

      {resumeOpen && (
      <>
      {savedResume && (
        <div className="resume-saved">
          <span className="resume-file-icon">
            <i className={`bi ${savedResume.type === 'application/pdf' ? 'bi-file-earmark-pdf' : 'bi-file-earmark-image'}`} />
          </span>
          <div className="resume-file-info">
            <strong>{savedResume.name}</strong>
            <small>
              Saved {new Date(savedResume.uploadedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
              {' · '}{Math.max(1, Math.round(savedResume.size / 1024))} KB
            </small>
          </div>
          <div className="resume-saved-actions">
            <a href={savedResume.url} target="_blank" rel="noopener noreferrer" className="profile-action-button">
              <i className="bi bi-eye" /> View
            </a>
            <a href={`${savedResume.url}?ik-attachment=true`} className="profile-icon-button" title="Download" aria-label="Download resume">
              <i className="bi bi-download" />
            </a>
            <button type="button" className="profile-icon-button" onClick={deleteSavedResume} title="Delete" aria-label="Delete saved resume">
              <i className="bi bi-trash" />
            </button>
          </div>
        </div>
      )}

      <div className="resume-upload-area">
        <input
          ref={inputRef}
          type="file"
          accept=".pdf,.jpg,.jpeg,.png,.webp,application/pdf,image/jpeg,image/png,image/webp"
          hidden
          onChange={handleFile}
        />

        <div className="resume-upload-icon">
          <i className="bi bi-cloud-arrow-up" />
        </div>

        <div className="resume-upload-copy">
          <h3>{savedResume ? 'Upload a new version' : 'Upload your resume'}</h3>
          <p>
            Choose a PDF or image file. We'll extract details that can help
            complete your CodeSphere profile.
          </p>
          <small>PDF, JPG, JPEG or PNG · Maximum 5 MB</small>
        </div>

        <button
          type="button"
          className="profile-action-button profile-primary-button"
          onClick={() => inputRef.current?.click()}
          disabled={isProcessing}
        >
          <i className="bi bi-upload" /> Choose file
        </button>
      </div>

      {fileName && (
        <div className="resume-file-row">
          <span className="resume-file-icon">
            <i className="bi bi-file-earmark-pdf" />
          </span>
          <div className="resume-file-info">
            <strong>{fileName}</strong>
            <small>{isProcessing ? 'Reading your resume...' : savingResume ? 'Saving to your account...' : 'Selected resume'}</small>
          </div>
          {!isProcessing && (
            <button
              type="button"
              className="profile-icon-button"
              onClick={discardResume}
              aria-label="Remove selected resume"
              title="Remove"
            >
              <i className="bi bi-x-lg" />
            </button>
          )}
        </div>
      )}

      {isProcessing && (
        <div className="resume-processing">
          <div className="resume-processing-heading">
            <span><i className="bi bi-cpu" /> {progressLabel || 'Preparing resume...'}</span>
            <strong>{progress}%</strong>
          </div>
          <div className="resume-progress-track">
            <div
              className="resume-progress-fill"
              style={{ width: `${progress}%` }}
            />
          </div>
          <small>
            Please keep this page open while your resume is being processed.
          </small>
        </div>
      )}

      {draft && (
        <div className="resume-review">
          <div className="resume-review-heading">
            <div>
              <span className="resume-review-label">REVIEW BEFORE APPLYING</span>
              <h3>We found these details</h3>
              <p>Check the information carefully. You can edit it before adding it to your profile.</p>
            </div>
            <span className="resume-found-count">
              {Object.keys(draft).length} fields
            </span>
          </div>

          <div className="resume-review-fields">
            {Object.entries(fieldLabels).map(([field, label]) => {
              if (!draft[field]) return null;

              return (
                <div className="resume-review-field" key={field}>
                  <label className="resume-review-check">
                    <input
                      type="checkbox"
                      checked={Boolean(selectedFields[field])}
                      onChange={() => toggleField(field)}
                    />
                    <span>{label}</span>
                  </label>

                  {field === 'department' ? (
                    <select
                      value={draft[field]}
                      onChange={(event) => updateDraft(field, event.target.value)}
                    >
                      <option value="">Select department</option>
                      {departments.map((department) => (
                        <option key={department} value={department}>{department}</option>
                      ))}
                    </select>
                  ) : field === 'degree' ? (
                    <select
                      value={draft[field]}
                      onChange={(event) => updateDraft(field, event.target.value)}
                    >
                      {['B.Tech', 'B.E.', 'BCA', 'B.Sc', 'M.Tech', 'MCA', 'M.Sc', 'Diploma', 'Other'].map((degree) => (
                        <option key={degree} value={degree}>{degree}</option>
                      ))}
                    </select>
                  ) : field === 'yearOfStudy' ? (
                    <select
                      value={draft[field]}
                      onChange={(event) => updateDraft(field, event.target.value)}
                    >
                      {['1st Year', '2nd Year', '3rd Year', '4th Year'].map((year) => (
                        <option key={year} value={year}>{year}</option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type="text"
                      value={draft[field]}
                      onChange={(event) => updateDraft(field, event.target.value)}
                    />
                  )}
                </div>
              );
            })}

            {Array.isArray(draft.skills) && draft.skills.length > 0 && (
              <div className="resume-review-skills">
                <label className="resume-review-check">
                  <input
                    type="checkbox"
                    checked={Boolean(selectedFields.skills)}
                    onChange={() => toggleField('skills')}
                  />
                  <span>Technical skills ({draft.skills.length})</span>
                </label>

                <div className="resume-detected-skills">
                  {draft.skills.map((skill) => (
                    <span key={skill}>{skill}</span>
                  ))}
                </div>
              </div>
            )}

            {Array.isArray(draft.projects) && draft.projects.length > 0 && (
              <div className="resume-review-list">
                <h4><i className="bi bi-kanban" /> Projects ({draft.projects.length})</h4>
                {draft.projects.map((project, i) => (
                  <label key={`${project.title}-${i}`} className="resume-review-item">
                    <input
                      type="checkbox"
                      checked={Boolean(selectedFields[`project:${i}`])}
                      onChange={() => toggleField(`project:${i}`)}
                    />
                    <span>
                      <strong>{project.title}</strong>
                      <small>
                        {[project.type, project.technologies].filter(Boolean).join(' · ')}
                        {project.github && <> · <i className="bi bi-github" /> repo</>}
                        {project.demo && <> · <i className="bi bi-box-arrow-up-right" /> demo</>}
                      </small>
                      {project.description && <em>{project.description}</em>}
                    </span>
                  </label>
                ))}
                <p className="resume-review-hint">You can edit each project in the Projects section after adding.</p>
              </div>
            )}

            {Array.isArray(draft.codingProfiles) && draft.codingProfiles.length > 0 && (
              <div className="resume-review-list">
                <h4><i className="bi bi-terminal" /> Coding profiles ({draft.codingProfiles.length})</h4>
                {draft.codingProfiles.map((item, i) => (
                  <label key={item.url} className="resume-review-item">
                    <input
                      type="checkbox"
                      checked={Boolean(selectedFields[`profile:${i}`])}
                      onChange={() => toggleField(`profile:${i}`)}
                    />
                    <span>
                      <strong>{item.platform}</strong>
                      <small>{item.url}</small>
                    </span>
                  </label>
                ))}
              </div>
            )}
          </div>

          <div className="resume-review-actions">
            <button
              type="button"
              className="profile-action-button"
              onClick={discardResume}
            >
              Discard
            </button>

            <button
              type="button"
              className="profile-action-button profile-primary-button"
              onClick={applyExtractedDetails}
            >
              <i className="bi bi-check2-circle" /> Apply selected details
            </button>
          </div>
        </div>
      )}

      <div className="resume-privacy-note">
        <i className="bi bi-shield-lock" />
        <span>
          Your resume is read in your browser and saved to your account so you
          can view it any time. Only you can see it here; delete it whenever you like.
        </span>
      </div>
      </>
      )}
    </section>
  );
}

/* =========================================
   PROFILE FORM COMPONENTS
========================================= */

function normalizeDateInput(value) {
  if (typeof value !== 'string') return '';

  const isoDate = value.match(/^(\d{4}-\d{2}-\d{2})/);
  if (isoDate) return isoDate[1];

  const legacyDate = value.match(/^(\d{1,2})[./-](\d{1,2})[./-](\d{4})$/);
  if (!legacyDate) return '';

  const [, day, month, year] = legacyDate;
  const date = new Date(Number(year), Number(month) - 1, Number(day));

  if (
    date.getFullYear() !== Number(year) ||
    date.getMonth() !== Number(month) - 1 ||
    date.getDate() !== Number(day)
  ) {
    return '';
  }

  return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
}

function Field({ field, value, onChange }) {
  const common = {
    id: field.name,
    name: field.name,
    value: value || '',
    onChange: (event) => {
      if (field.name === 'customPlatform') {
        event.currentTarget.setCustomValidity('');
      }
      onChange(field.name, event.target.value);
    },
    placeholder: field.placeholder || `Enter ${field.label.toLowerCase()}`,
    required: Boolean(field.required),
  };

  return (
    <div className={`profile-form-field ${field.full ? 'profile-form-full' : ''}`}>
      {field.type === 'checkbox' ? (
        <label className="profile-form-checkbox" htmlFor={field.name}>
          <input
            id={field.name}
            name={field.name}
            type="checkbox"
            checked={Boolean(value)}
            onChange={(event) => onChange(field.name, event.target.checked)}
          />
          {field.label}
        </label>
      ) : (
        <>
          <label htmlFor={field.name}>{field.label}</label>
          {field.type === 'select' ? (
            <select {...common}>
              <option value="">Select {field.label}</option>
              {field.options.map((option) => (
                <option key={option} value={option}>
                  {field.optionLabels?.[option] || option}
                </option>
              ))}
            </select>
          ) : field.type === 'textarea' ? (
            <textarea {...common} rows={4} />
          ) : (
            <input
              {...common}
              type={['url', 'date'].includes(field.type) ? field.type : 'text'}
            />
          )}
        </>
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
  const hasLearning = section.id === 'learning';
  const hasProfessionalLinks = section.id === 'professionalLinks';
  const startEdit = (item = {}, index = null) => {
    const form = isCollection
      ? { ...item }
      : Object.fromEntries(
          section.fields.map((field) => [
            field.name,
            field.type === 'date'
              ? normalizeDateInput(profile[field.name])
              : profile[field.name] ?? '',
          ])
      );
    if (section.id === 'codingProfiles') {
      if (!codingPlatforms.includes(form.platform)) {
      form.customPlatform = form.platform || '';
      form.platform = 'Other';
      } else {
      form.customPlatform = '';
      }
    }

    if (!isCollection) {
      section.fields.forEach((field) => {
        if (Array.isArray(form[field.name])) {
          form[field.name] = form[field.name].join(', ');
        }
      });
    }
    setForm(form);
    setEditingIndex(index);
    setEditing(true);
    setExpanded(true);
  };

  const cancelEdit = () => {
    setEditing(false);
    setEditingIndex(null);
    setForm({});
  };

  const handleSave = async (event) => {
    event.preventDefault();
    const values = { ...form };

    if (section.id === 'codingProfiles') {
      if (values.platform === 'Other') {
        if (!values.customPlatform.trim()) {
          const platformField = event.currentTarget.elements.namedItem('customPlatform');
          platformField.setCustomValidity('Enter the coding platform name.');
          platformField.reportValidity();
          return;
        }
        values.platform = values.customPlatform.trim();
      }
      delete values.customPlatform;
    }

    const saved = isCollection
      ? editingIndex === null
        ? await onAdd(section.collection, values)
        : await onSave(section.collection, editingIndex, values)
      : await onSave(section.id, values);

    if (saved) cancelEdit();
  };

  const updateField = (name, value) => {
    setForm((previous) => ({ ...previous, [name]: value }));
  };

  const summary = hasPersonal
    ? [
        profile.username ? `@${profile.username}` : '',
        profile.phone,
        profile.city,
      ].filter(Boolean).join(' · ')
    : hasEducation
      ? [profile.collegeName, profile.department, profile.yearOfStudy].filter(Boolean).join(' · ')
      : hasLearning
        ? [profile.technicalInterests?.join(', '), profile.learningGoals?.join(', ')]
          .filter(Boolean)
          .join(' · ')
        : hasProfessionalLinks
          ? [profile.github, profile.linkedin, profile.portfolio].filter(Boolean).length
            ? `${[profile.github, profile.linkedin, profile.portfolio].filter(Boolean).length} links added`
            : section.subtitle
        : isCollection
          ? `${savedItems.length} ${savedItems.length === 1 ? 'entry' : 'entries'} added`
          : section.subtitle;

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
          {isCollection && <span className="profile-entry-count">{savedItems.length}</span>}
          <i className={`bi ${expanded ? 'bi-chevron-up' : 'bi-chevron-down'}`} />
        </span>
      </button>

      {expanded && (
        <div className="profile-builder-content">
          {editing ? (
            <form className="profile-edit-form" onSubmit={handleSave}>
              {section.fields.map((field) => (
                <Fragment key={field.name}>
                  {section.id === 'codingProfiles' &&
                    field.name === 'url' &&
                    form.platform === 'Other' && (
                      <Field
                        field={{
                          name: 'customPlatform',
                          label: 'Platform name',
                          placeholder: 'Enter the coding platform name',
                          required: true,
                        }}
                        value={form.customPlatform}
                        onChange={updateField}
                      />
                    )}
                  <Field
                    field={field}
                    value={form[field.name]}
                    onChange={updateField}
                  />
                </Fragment>
              ))}

              <div className="profile-form-actions">
                <button type="button" className="profile-action-button" onClick={cancelEdit}>
                  Cancel
                </button>
                <button type="submit" className="profile-action-button profile-primary-button">
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

                        {section.id === 'projects' && (
                          <>
                            {item.technologies && (
                              <small>{item.technologies}</small>
                            )}
                            <small>
                              {item.status}
                              {item.featured ? ' · Featured' : ''}
                            </small>
                          </>
                        )}

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
                    ['Full name', profile.name],
                    ['Username', profile.username ? `@${profile.username}` : ''],
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
                  <div className="profile-bio-display">
                    <span>About me</span>
                    <strong>{profile.bio || 'Not added yet'}</strong>
                  </div>
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

              {!isCollection && hasLearning && (
                <div className="profile-information-grid">
                  {section.fields.map((field) => (
                    <div key={field.name}>
                      <span>{field.label}</span>
                      <strong>
                        {profile[field.name]?.join(', ') || 'Not added yet'}
                      </strong>
                    </div>
                  ))}
                </div>
              )}

              {!isCollection && hasProfessionalLinks && (
                <div className="profile-information-grid">
                  {section.fields.map((field) => (
                    <div key={field.name}>
                      <span>{field.label}</span>
                      {profile[field.name] ? (
                        <a href={profile[field.name]} target="_blank" rel="noreferrer">
                          {profile[field.name]}
                        </a>
                      ) : (
                        <strong>Not added yet</strong>
                      )}
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

/* =========================================
   MAIN PROFILE PAGE
========================================= */

export default function Profile({
  preview = false,
  embedded = false,
  view = 'profile',
}) {
  const isMilestoneView = view === 'milestone';
  const navigate = useNavigate();
  const { user, updateUser, logout } = useAuth();

  const [profile, setProfile] = useState(() => {
    if (preview) {
      return normalizeProfile({
        ...previewUser,
        skills: ['Java', 'Python', 'HTML', 'CSS', 'JavaScript'],
      });
    }

    return normalizeProfile(user || {});
  });

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(!preview);
  const [saveStatus, setSaveStatus] = useState('');
  const [toast, setToast] = useState(null);
  const [skillSearch, setSkillSearch] = useState('');
  const [skillLevel, setSkillLevel] = useState('Intermediate');

  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  const photoInputRef = useRef(null);
  const bannerInputRef = useRef(null);
  const toastTimerRef = useRef(null);
  const toastIdRef = useRef(0);

  const showToast = (message, type = 'success') => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);

    toastIdRef.current += 1;
    setToast({ id: toastIdRef.current, message, type });

    toastTimerRef.current = setTimeout(() => {
      setToast(null);
    }, 3500);
  };

  const closeToast = () => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    setToast(null);
  };

  useEffect(() => {
    return () => {
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    };
  }, []);

  const persistProfile = async (updatedProfile, successMessage, fields) => {
    if (preview) {
      setProfile(updatedProfile);
      showToast('Preview updated. Changes are temporary.', 'info');
      return true;
    }

    const payload = {};
    for (const field of fields || Object.keys(updatedProfile)) {
      if (field === 'projects') continue;
      if (field === 'skills') {
        payload.skillDetails = updatedProfile.skills.map((skill) => ({
          name: skill.name || skill,
          level: skill.level || 'Intermediate',
        }));
      } else if (field === 'codingProfiles' || field === 'achievements') {
        // Drop database ids; the server allows only the entry's own fields.
        payload[field] = (updatedProfile[field] || []).map((entry) => Object.fromEntries(Object.entries(entry).filter(([key]) => key !== '_id')));
      } else {
        payload[field] = updatedProfile[field];
      }
    }

    if (Object.keys(payload).length === 0) return true;

    setError('');
    setSaveStatus('');

    try {
      const response = await apiRequest('/users/profile', {
        method: 'PATCH',
        body: JSON.stringify(payload),
      });

      setProfile(normalizeProfile({
        ...response.user,
        projects: updatedProfile.projects,
      }));
      updateUser(response.user);
      setSaveStatus(successMessage);
      showToast(successMessage);
      return true;
    } catch (saveError) {
      setError(saveError.message || 'Unable to save your profile.');
      showToast(saveError.message || 'Unable to save your profile.', 'error');
      return false;
    }
  };

  const handleImageChange = async (event, imageLabel, kind = 'profile') => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      showToast('Please select a JPG, PNG, or WebP image.', 'warning');
      event.target.value = '';
      return;
    }

    if (file.size > IMAGE_SIZE_LIMIT) {
      showToast('Please select an image smaller than 5 MB.', 'warning');
      event.target.value = '';
      return;
    }

    try {
      if (preview) {
        const imageData = await readImageFile(file);
        setProfile((current) => ({ ...current, [kind === 'banner' ? 'bannerImage' : 'profileImage']: { url: imageData } }));
      } else {
        const body = new FormData();
        body.append('profileImage', file);
        await apiRequest(`/users/profile/image${kind === 'banner' ? '?type=banner' : ''}`, { method: 'POST', body });
        const refreshed = await loadProfile();
        if (!refreshed) {
          showToast('Image uploaded, but your profile could not be refreshed.', 'error');
          return;
        }
      }
      setError('');
      showToast(`${imageLabel} updated successfully.`);
    } catch (uploadError) {
      setError(uploadError.message || `Unable to upload ${imageLabel.toLowerCase()}.`);
      showToast(uploadError.message || `Unable to upload ${imageLabel.toLowerCase()}.`, 'error');
    } finally {
      event.target.value = '';
    }
  };

  const loadProfile = async (signal) => {
    setLoading(true);
    setError('');

    try {
      const [profileResponse, projectsResponse] = await Promise.all([
        apiRequest('/users/profile', { signal }),
        apiRequest('/portfolio-projects', { signal }),
      ]);

      setProfile(normalizeProfile({
        ...profileResponse.user,
        projects: projectsResponse.projects || [],
      }));
      return true;
    } catch (loadError) {
      if (signal?.aborted) return false;
      setError(loadError.message || 'Unable to load your profile.');
      return false;
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  };

  useEffect(() => {
    if (preview) return undefined;

    const controller = new AbortController();
    loadProfile(controller.signal);

    return () => controller.abort();
  }, [preview, user?._id]);

  const currentUser = preview ? profile : { ...user, ...profile };
  const completion = useMemo(
    () => calculateProfileCompletion(profile),
    [profile]
  );

  const updateSimpleSection = async (_section, values) => {
    const updatedValues = { ...values };
    for (const field of ['technicalInterests', 'learningGoals']) {
      if (typeof updatedValues[field] === 'string') {
        updatedValues[field] = updatedValues[field]
          .split(',')
          .map((item) => item.trim())
          .filter(Boolean);
      }
    }

    return persistProfile(
      { ...profile, ...updatedValues },
      'Your profile details were saved successfully!',
      Object.keys(updatedValues)
    );
  };

  const applyResumeDetails = async ({ projects, ...updates }) => {
    // Projects live in their own collection (/portfolio-projects), so the
    // new ones are created one by one rather than saved on the profile.
    const existingIds = new Set((profile.projects || []).map((p) => p._id).filter(Boolean));
    const newProjects = (projects || []).filter((p) => !p._id || !existingIds.has(p._id));

    // The server accepts only { platform, url } per coding profile (no _id).
    // GitHub is stored in its own field.
    if (updates.codingProfiles) {
      const github = updates.codingProfiles.find((p) => p.platform?.toLowerCase() === 'github');
      if (github && !profile.github) updates.github = github.url;
      updates.codingProfiles = updates.codingProfiles
        .filter((p) => p.platform?.toLowerCase() !== 'github')
        .map(({ platform, url }) => ({ platform, url }));
    }

    let ok = true;
    if (Object.keys(updates).length) {
      ok = await persistProfile(
        { ...profile, ...updates },
        'Resume details have been added to your profile!',
        Object.keys(updates)
      );
    }
    if (!ok) return false;

    if (preview) {
      if (newProjects.length) setProfile((current) => ({ ...current, projects: [...current.projects, ...newProjects] }));
      return true;
    }
    for (const project of newProjects) {
      if (!(await saveProjectEntry(project))) return false;
    }
    return true;
  };

  const saveProjectEntry = async (item, projectId) => {
    const payload = {
      title: (item.title || '').trim(),
      description: (item.description || '').trim(),
      type: (item.type || '').trim(),
      technologies: Array.isArray(item.technologies)
        ? item.technologies
        : (item.technologies || '').split(',').map((technology) => technology.trim()).filter(Boolean),
      githubUrl: (item.github || '').trim(),
      liveUrl: (item.demo || '').trim(),
      status: item.status || 'Completed',
      featured: Boolean(item.featured),
    };

    try {
      const response = await apiRequest(
        projectId ? `/portfolio-projects/${projectId}` : '/portfolio-projects',
        {
          method: projectId ? 'PATCH' : 'POST',
          body: JSON.stringify(payload),
        }
      );
      const savedProject = normalizeProject(response.project);

      setProfile((current) => {
        const projects = projectId
          ? current.projects.map((project) =>
              project._id === projectId ? savedProject : project
            )
          : [...current.projects, savedProject];
        return { ...current, projects };
      });
      setSaveStatus(response.message);
      showToast(response.message);
      return true;
    } catch (saveError) {
      setError(saveError.message || 'Unable to save this project.');
      showToast(saveError.message || 'Unable to save this project.', 'error');
      return false;
    }
  };

  const addEntry = (section, item) => {
    const messages = {
      codingProfiles: 'Coding profile added successfully!',
      projects: 'Project added successfully!',
      achievements: 'Achievement added successfully!',
    };

    if (section === 'projects') return saveProjectEntry(item);

    return persistProfile(
      {
        ...profile,
        [section]: [...(profile[section] || []), item],
      },
      messages[section] || 'Entry added successfully!',
      [section]
    );
  };

  const updateEntry = (section, index, item) => {
    if (section === 'projects') {
      return saveProjectEntry(item, profile.projects[index]?._id);
    }

    return persistProfile(
      {
        ...profile,
        [section]: (profile[section] || []).map((entry, i) =>
          i === index ? item : entry
        ),
      },
      'Entry updated successfully!',
      [section]
    );
  };

  const deleteEntry = async (section, index) => {
    if (section === 'projects') {
      const projectId = profile.projects[index]?._id;
      if (!projectId) return false;

      try {
        const response = await apiRequest(`/portfolio-projects/${projectId}`, {
          method: 'DELETE',
        });
        setProfile((current) => ({
          ...current,
          projects: current.projects.filter((project) => project._id !== projectId),
        }));
        setSaveStatus(response.message);
        showToast(response.message);
        return true;
      } catch (deleteError) {
        setError(deleteError.message || 'Unable to remove this project.');
        showToast(deleteError.message || 'Unable to remove this project.', 'error');
        return false;
      }
    }

    return persistProfile(
      {
        ...profile,
        [section]: (profile[section] || []).filter((_, i) => i !== index),
      },
      'Entry removed from your profile.',
      [section]
    );
  };

  const addSkill = async (skill) => {
    if (!skill || profile.skills.some((item) => (item.name || item) === skill)) {
      if (skill) showToast('This skill is already in your profile.', 'warning');
      return;
    }

    const saved = await persistProfile(
      {
        ...profile,
        skills: [...profile.skills, { name: skill, level: skillLevel }],
      },
      `${skill} added to your skills!`,
      ['skills']
    );

    if (saved) setSkillSearch('');
  };

  const removeSkill = async (index) => {
    const removedSkill = profile.skills[index];
    const skillName = removedSkill?.name || removedSkill || 'Skill';

    return persistProfile(
      {
        ...profile,
        skills: profile.skills.filter((_, i) => i !== index),
      },
      `${skillName} removed from your skills.`,
      ['skills']
    );
  };

  const filteredSkills = skillOptions.filter((skill) =>
    skill.toLowerCase().includes(skillSearch.toLowerCase()) &&
    !profile.skills.some((item) => (item.name || item) === skill)
  );

  const handleDeleteAccount = async () => {
    if (preview) {
      showToast('Account deletion is disabled in preview mode.', 'info');
      return;
    }

    const expected = (currentUser?.username || 'DELETE').trim().toLowerCase();
    const typed = deleteConfirmText.trim().toLowerCase();

    if (typed !== expected && typed !== 'delete') {
      setDeleteError(`Please type "${currentUser?.username || 'DELETE'}" to confirm.`);
      return;
    }

    setDeleteLoading(true);
    setDeleteError('');

    try {
      await apiRequest('/users/profile', {
        method: 'DELETE',
      });

      showToast('Your account has been deleted successfully.', 'success');
      await logout();
      navigate('/login', { replace: true });
    } catch (err) {
      console.error('Delete account error:', err);
      setDeleteError(err.message || 'Unable to delete account. Please try again.');
      setDeleteLoading(false);
    }
  };

  const personalSection = {
    id: 'personal',
    title: 'Personal details',
    subtitle: 'Your basic information',
    icon: 'bi-person-vcard',
    fields: [
      { name: 'name', label: 'Full name', placeholder: 'Enter your full name' },
      { name: 'username', label: 'Username', placeholder: 'your-username' },
      { name: 'phone', label: 'Phone number', placeholder: 'Enter phone number' },
      { name: 'city', label: 'City', placeholder: 'Enter your city' },
      { name: 'gender', label: 'Gender', type: 'select', options: ['Male', 'Female', 'Prefer not to say', 'Other'] },
      { name: 'dateOfBirth', label: 'Date of birth', type: 'date' },
      { name: 'bio', label: 'About me', type: 'textarea', full: true, placeholder: 'Tell the community about yourself...' },
    ],
  };

  return (
    <>
      {!embedded && <Navbar />}

      <style>
        {`
          @keyframes codesphereToastIn {
            from { opacity: 0; transform: translateY(12px); }
            to { opacity: 1; transform: translateY(0); }
          }
        `}
      </style>

      <Toast toast={toast} onClose={closeToast} />

      <main className={`student-profile-page${embedded ? ' dashboard-profile-embed' : ''}`}>
        <div className="student-profile-container">
          {preview && (
            <div className="profile-message">
              <i className="bi bi-eye" />
              Preview mode — sample data. Changes are temporary.
            </div>
          )}

          {!embedded && (
            <div className="student-profile-breadcrumb">
              <Link to="/">Home</Link>
              <i className="bi bi-chevron-right" />
              <span>{isMilestoneView ? 'My Badges' : 'My Profile'}</span>
            </div>
          )}

          <div className="student-profile-heading">
            <div>
              <p className="student-profile-eyebrow">
                {isMilestoneView ? 'YOUR CODESPHERE JOURNEY' : 'CODESPHERE COMMUNITY'}
              </p>
              <h1>{isMilestoneView ? 'My Badges' : 'My Profile'}</h1>
              <p>
                {isMilestoneView
                  ? 'Explore your earned badges and CodeSphere progress.'
                  : 'Add your resume details, skills, projects and coding journey.'}
              </p>
            </div>

            {!isMilestoneView && currentUser?.username ? (
              <Link
                to={`/user/${encodeURIComponent(currentUser.username)}`}
                className="profile-back-link profile-public-link"
              >
                <i className="bi bi-box-arrow-up-right" /> View Public Profile
              </Link>
            ) : !embedded && !isMilestoneView ? (
              <Link to="/" className="profile-back-link">
                <i className="bi bi-arrow-left" /> Back to website
              </Link>
            ) : null}
          </div>

          {loading && (
            <div className="profile-message" role="status">
              <i className="bi bi-arrow-repeat" /> Loading your profile...
            </div>
          )}

          {error && (
            <div className="profile-message profile-message-error" role="alert">
              <i className="bi bi-exclamation-circle" /> {error}
            </div>
          )}

          {saveStatus && !error && (
            <div className="profile-message" role="status">
              <i className="bi bi-check-circle" /> {saveStatus}
            </div>
          )}

          <div className={`student-profile-layout dashboard-section-layout${isMilestoneView ? ' dashboard-badges-view' : ''}`}>
            {isMilestoneView ? (
              <>
                <div className="dashboard-badges-main">
                  <ProfileBadges preview={preview} completion={completion} />
                </div>
                {!preview && <BadgeLeaderboard />}
              </>
            ) : (
              <>
                <DashboardProfileSidebar
                  user={currentUser}
                  completion={completion}
                  photoInputRef={photoInputRef}
                  onPhotoChange={(event) => handleImageChange(event, 'Profile photo')}
                  bannerInputRef={bannerInputRef}
                  onBannerChange={(event) => handleImageChange(event, 'Banner image', 'banner')}
                  defaultBanner={DEFAULT_BANNER}
                  showBadges={!preview}
                />

                <div className="student-profile-main">
                  <ResumeUpload
                    profile={profile}
                    onApply={applyResumeDetails}
                    showToast={showToast}
                    preview={preview}
                  />

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
                            <span
                              className="profile-skill-tag"
                              key={`${skill.name || skill}-${index}`}
                            >
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
                            <p className="profile-no-skills">Not added yet</p>
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

                  {/* Self-service account deletion control - hidden for admins */}
                  {currentUser?.role !== 'admin' && (
                    <section className="profile-section-card profile-danger-card">
                      <div className="profile-section-heading">
                        <div>
                          <h2>Delete Account</h2>
                          <p>Permanently remove your CodeSphere account and owned data.</p>
                        </div>
                        <span className="profile-section-icon">
                          <i className="bi bi-exclamation-triangle" />
                        </span>
                      </div>

                      <div className="profile-danger-body">
                        <p className="profile-danger-warning">
                          Once you delete your account, there is no going back. This will permanently remove your profile, photo, banner, resume, earned badges, and personal project showcase entries.
                        </p>

                        {!deleteConfirmOpen ? (
                          <div className="profile-danger-actions">
                            <button
                              type="button"
                              className="profile-delete-account-btn"
                              onClick={() => {
                                setDeleteConfirmOpen(true);
                                setDeleteConfirmText('');
                                setDeleteError('');
                              }}
                            >
                              <i className="bi bi-trash3" /> Delete My Account
                            </button>
                          </div>
                        ) : (
                          <div className="profile-delete-confirm-box">
                            <p>
                              Are you absolutely sure? To confirm, please type <strong>{currentUser?.username || 'DELETE'}</strong> below:
                            </p>

                            <input
                              type="text"
                              className="profile-delete-confirm-input"
                              value={deleteConfirmText}
                              onChange={(e) => {
                                setDeleteConfirmText(e.target.value);
                                if (deleteError) setDeleteError('');
                              }}
                              placeholder={`Type ${currentUser?.username || 'DELETE'} to confirm`}
                              disabled={deleteLoading}
                              autoFocus
                            />

                            {deleteError && (
                              <div className="profile-delete-error">
                                <i className="bi bi-exclamation-circle" /> {deleteError}
                              </div>
                            )}

                            <div className="profile-delete-confirm-btns">
                              <button
                                type="button"
                                className="profile-delete-account-btn"
                                onClick={handleDeleteAccount}
                                disabled={deleteLoading || !deleteConfirmText.trim()}
                              >
                                <i className={`bi ${deleteLoading ? 'bi-hourglass-split' : 'bi-trash3'}`} />
                                {deleteLoading ? 'Deleting Account...' : 'Permanently Delete Account'}
                              </button>

                              <button
                                type="button"
                                className="profile-delete-cancel-btn"
                                onClick={() => {
                                  setDeleteConfirmOpen(false);
                                  setDeleteConfirmText('');
                                  setDeleteError('');
                                }}
                                disabled={deleteLoading}
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    </section>
                  )}

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
              </>
            )}
          </div>
        </div>
      </main>
    </>
  );
}

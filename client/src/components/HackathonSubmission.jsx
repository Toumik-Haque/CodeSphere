import { useRef, useState } from 'react';
import SafeText from './SafeText';
import { apiRequest } from '../lib/api';
import { countdown, isPast } from '../lib/hackathons';

// Team project submission for a CodeSphere hackathon, modelled on SIH,
// Devfolio and Unstop: a structured write-up, a pitch deck, a prototype and
// screenshots. Teams save drafts, then hand in a final version (still editable
// until the deadline).

const fmt = (d) => new Date(d).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });
const size = (bytes) => (bytes >= 1048576 ? `${(bytes / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`);

const EMPTY = {
  title: '', tagline: '', track: '', techStack: '', problem: '', solution: '', challenges: '', impact: '',
  description: '', repoUrl: '', demoUrl: '', videoUrl: '', deckUrl: '',
};

const UPLOADS = {
  deck: { accept: '.pdf,.ppt,.pptx', hint: 'PPT, PPTX or PDF · up to 20 MB' },
  prototype: { accept: '.zip,.apk,.pdf,.pptx,.png,.jpg,.jpeg,.webp', hint: 'ZIP, APK, PDF, PPTX or image · up to 25 MB' },
  screenshot: { accept: '.png,.jpg,.jpeg,.webp', hint: 'PNG, JPG or WebP · up to 5 MB each · max 5' },
};

const fromSubmission = (s) => (s
  ? { ...EMPTY, ...Object.fromEntries(Object.keys(EMPTY).map((k) => [k, s[k] ?? ''])), techStack: (s.techStack || []).join(', ') }
  : EMPTY);

// Deck, prototype and project links.
export function SubmissionLinks({ s }) {
  return (
    <div className="hk-project-links">
      {(s.deckFile || s.deckUrl) && (
        <a href={s.deckFile?.url || s.deckUrl} target="_blank" rel="noopener noreferrer nofollow"><i className="bi bi-file-earmark-slides" aria-hidden="true" /> Pitch deck</a>
      )}
      {s.prototypeFile && (
        <a href={s.prototypeFile.url} target="_blank" rel="noopener noreferrer nofollow"><i className="bi bi-box-seam" aria-hidden="true" /> Prototype file</a>
      )}
      {s.repoUrl && <a href={s.repoUrl} target="_blank" rel="noopener noreferrer nofollow"><i className="bi bi-github" aria-hidden="true" /> Code</a>}
      {s.demoUrl && <a href={s.demoUrl} target="_blank" rel="noopener noreferrer nofollow"><i className="bi bi-play-circle" aria-hidden="true" /> Live demo</a>}
      {s.videoUrl && <a href={s.videoUrl} target="_blank" rel="noopener noreferrer nofollow"><i className="bi bi-camera-video" aria-hidden="true" /> Video</a>}
    </div>
  );
}

// Read-only view of a submission: write-up, files and links.
export function SubmissionDetails({ s, withLinks = true }) {
  const sections = [
    ['Problem', s.problem],
    ['Solution', s.solution],
    ['Challenges we ran into', s.challenges],
    ['Impact', s.impact],
    ['More details', s.description],
  ].filter(([, text]) => text);
  return (
    <div className="hk-sub-details">
      {sections.map(([title, text]) => (
        <section key={title}>
          <h4>{title}</h4>
          <SafeText text={text} />
        </section>
      ))}
      {s.screenshots?.length > 0 && (
        <div className="hk-shots">
          {s.screenshots.map((f) => (
            <a key={f.url} href={f.url} target="_blank" rel="noopener noreferrer"><img src={f.url} alt={`Screenshot of ${s.title}`} loading="lazy" /></a>
          ))}
        </div>
      )}
      {withLinks && <SubmissionLinks s={s} />}
    </div>
  );
}

function FileSlot({ kind, label, file, busy, onUpload, onRemove, disabled }) {
  const input = useRef(null);
  const [drag, setDrag] = useState(false);
  const pick = (files) => files?.[0] && onUpload(kind, files[0]);
  return (
    <div className="hk-file-slot">
      {file ? (
        <div className="hk-file-chip">
          <i className={`bi ${kind === 'deck' ? 'bi-file-earmark-slides' : 'bi-box-seam'}`} aria-hidden="true" />
          <a href={file.url} target="_blank" rel="noopener noreferrer">{file.name || 'Uploaded file'}</a>
          {file.size > 0 && <span>{size(file.size)}</span>}
          <button type="button" className="hk-link-btn" onClick={() => input.current?.click()} disabled={disabled || busy}>Replace</button>
          <button type="button" className="hk-link-btn danger" onClick={() => onRemove(kind)} disabled={disabled || busy}>Remove</button>
        </div>
      ) : (
        <button
          type="button"
          className={`hk-drop ${drag ? 'is-drag' : ''}`}
          onClick={() => input.current?.click()}
          onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
          onDragLeave={() => setDrag(false)}
          onDrop={(e) => { e.preventDefault(); setDrag(false); if (!disabled) pick(e.dataTransfer.files); }}
          disabled={disabled || busy}
        >
          <i className={`bi ${busy ? 'bi-arrow-repeat hk-spin' : 'bi-cloud-arrow-up'}`} aria-hidden="true" />
          <strong>{busy ? 'Uploading…' : `Upload ${label}`}</strong>
          <span>Drag and drop, or click to choose · {UPLOADS[kind].hint}</span>
        </button>
      )}
      <input ref={input} type="file" accept={UPLOADS[kind].accept} hidden onChange={(e) => { pick(e.target.files); e.target.value = ''; }} />
    </div>
  );
}

export default function HackathonSubmission({ h, team, submission, slug, reload, ProjectCard }) {
  const [form, setForm] = useState(() => fromSubmission(submission));
  const [files, setFiles] = useState(() => ({
    deckFile: submission?.deckFile || null,
    prototypeFile: submission?.prototypeFile || null,
    screenshots: submission?.screenshots || [],
  }));
  const [status, setStatus] = useState(submission?.status || null);
  const [editing, setEditing] = useState(!submission || submission.status === 'draft');
  const [msg, setMsg] = useState({ text: '', tone: '' });
  const [busy, setBusy] = useState('');
  const shotInput = useRef(null);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const isFinal = status === 'submitted';

  if (!team) return null;

  // Handed in and not editing: show the project.
  if (submission && isFinal && !editing) {
    return (
      <section className="hk-panel hk-submitted">
        <div className="hk-sub-status ok">
          <i className="bi bi-check-circle-fill" aria-hidden="true" />
          <div>
            <strong>Final submission received</strong>
            <span>{submission.submittedAt ? `Submitted ${fmt(submission.submittedAt)}` : 'Submitted'}{h.canSubmit ? ` · you can edit until ${fmt(h.submissionEnd)}` : ''}</span>
          </div>
        </div>
        <ProjectCard s={submission} showAward={h.resultsPublished} />
        {h.canSubmit && <button type="button" className="hk-btn" onClick={() => setEditing(true)}><i className="bi bi-pencil" aria-hidden="true" /> Edit submission</button>}
      </section>
    );
  }

  if (!h.canSubmit) {
    return (
      <section className="hk-panel">
        <h2><i className="bi bi-upload" aria-hidden="true" /> Submission</h2>
        <p>
          {!isPast(h.submissionStart)
            ? `Submissions open ${fmt(h.submissionStart)}. Start building!`
            : submission?.status === 'draft'
              ? 'Submissions are closed. Your draft was not handed in.'
              : 'Submissions are closed.'}
        </p>
      </section>
    );
  }

  const tooSmall = team.members.length < h.teamMin;
  const checklist = [
    { label: 'Project name', done: form.title.trim().length >= 3 },
    { label: 'Problem statement', done: form.problem.trim().length >= 30 },
    { label: 'Your solution', done: form.solution.trim().length >= 30 },
    { label: 'Pitch deck', done: Boolean(files.deckFile || form.deckUrl.trim()) },
    { label: 'Prototype', done: Boolean(files.prototypeFile || form.demoUrl.trim() || form.repoUrl.trim() || form.videoUrl.trim()) },
  ];
  const ready = checklist.every((c) => c.done) && !tooSmall;
  const doneCount = checklist.filter((c) => c.done).length;

  const applyServer = (s) => {
    setFiles({ deckFile: s.deckFile || null, prototypeFile: s.prototypeFile || null, screenshots: s.screenshots || [] });
    setStatus(s.status);
  };

  const save = async (action) => {
    setBusy(action);
    setMsg({ text: '', tone: '' });
    try {
      const r = await apiRequest(`/hackathons/${slug}/submission`, { method: 'PUT', body: JSON.stringify({ ...form, action }) });
      setStatus(r.status);
      setMsg({ text: r.message, tone: 'ok' });
      if (r.status === 'submitted') {
        setEditing(false);
        reload();
      }
    } catch (err) {
      setMsg({ text: err.message, tone: 'error' });
    } finally {
      setBusy('');
    }
  };

  const upload = async (kind, file) => {
    setBusy(kind);
    setMsg({ text: '', tone: '' });
    try {
      const body = new FormData();
      body.append('file', file, file.name);
      const r = await apiRequest(`/hackathons/${slug}/submission/files/${kind}`, { method: 'POST', body });
      applyServer(r.submission);
      setMsg({ text: `${file.name} uploaded.`, tone: 'ok' });
    } catch (err) {
      setMsg({ text: err.message, tone: 'error' });
    } finally {
      setBusy('');
    }
  };

  const remove = async (kind, url = '') => {
    if (!window.confirm('Remove this file?')) return;
    setBusy(kind);
    try {
      const r = await apiRequest(`/hackathons/${slug}/submission/files/${kind}${url ? `?url=${encodeURIComponent(url)}` : ''}`, { method: 'DELETE' });
      applyServer(r.submission);
    } catch (err) {
      setMsg({ text: err.message, tone: 'error' });
    } finally {
      setBusy('');
    }
  };

  return (
    <form className="hk-panel hk-submit-form hk-submission" onSubmit={(e) => { e.preventDefault(); save('submit'); }}>
      <div className="hk-sub-top">
        <div>
          <h2><i className="bi bi-rocket-takeoff" aria-hidden="true" /> {isFinal ? 'Edit your submission' : 'Submit your project'}</h2>
          <p className="hk-muted">Closes {fmt(h.submissionEnd)} ({countdown(h.submissionEnd)}). Any team member can edit until then.</p>
        </div>
        <span className={`hk-chip ${isFinal ? 'ok' : ''}`}>{isFinal ? 'Submitted' : status === 'draft' ? 'Draft saved' : 'Not started'}</span>
      </div>

      {tooSmall && <p className="hk-error">Your team needs at least {h.teamMin} members before you can submit.</p>}

      <div className="hk-sub-layout">
        <div className="hk-sub-steps">
          <fieldset className="hk-sub-step">
            <legend><span>1</span> Basics</legend>
            <div className="hk-form-grid">
              <label>Project name *<input value={form.title} onChange={set('title')} maxLength={100} placeholder="e.g. CampusConnect" /></label>
              <label>One-line pitch<input value={form.tagline} onChange={set('tagline')} maxLength={200} placeholder="What does it do, in one sentence?" /></label>
              {h.tracks.length > 0 && (
                <label>Track / problem statement
                  <select value={form.track} onChange={set('track')}>
                    <option value="">Choose a track</option>
                    {h.tracks.map((t) => <option key={t}>{t}</option>)}
                  </select>
                </label>
              )}
              <label>Tech stack<input value={form.techStack} onChange={set('techStack')} placeholder="React, Node, MongoDB" /></label>
            </div>
          </fieldset>

          <fieldset className="hk-sub-step">
            <legend><span>2</span> Project write-up</legend>
            <div className="hk-form-grid">
              <label className="wide">The problem *
                <textarea value={form.problem} onChange={set('problem')} rows={4} maxLength={3000} placeholder="What problem are you solving, and for whom?" />
                <small>{form.problem.trim().length}/3000 · at least 30</small>
              </label>
              <label className="wide">Your solution *
                <textarea value={form.solution} onChange={set('solution')} rows={5} maxLength={3000} placeholder="How does your project solve it? What is the technical approach?" />
                <small>{form.solution.trim().length}/3000 · at least 30</small>
              </label>
              <label>Challenges you ran into
                <textarea value={form.challenges} onChange={set('challenges')} rows={4} maxLength={3000} placeholder="What was hard, and how did you get past it?" />
              </label>
              <label>Impact &amp; what&apos;s next
                <textarea value={form.impact} onChange={set('impact')} rows={4} maxLength={3000} placeholder="Who benefits? How would you take it further?" />
              </label>
              <label className="wide">Anything else (optional)
                <textarea value={form.description} onChange={set('description')} rows={3} maxLength={8000} placeholder="Architecture, setup steps, team roles, credits…" />
              </label>
            </div>
          </fieldset>

          <fieldset className="hk-sub-step">
            <legend><span>3</span> Pitch deck (PPT) *</legend>
            <FileSlot kind="deck" label="pitch deck" file={files.deckFile} busy={busy === 'deck'} onUpload={upload} onRemove={remove} />
            <label className="hk-or">…or link to it
              <input type="url" value={form.deckUrl} onChange={set('deckUrl')} placeholder="https://docs.google.com/presentation/… or Canva link" />
            </label>
          </fieldset>

          <fieldset className="hk-sub-step">
            <legend><span>4</span> Prototype *</legend>
            <p className="hk-muted">Upload a build (ZIP, APK, PDF) and/or add links. At least one is needed.</p>
            <FileSlot kind="prototype" label="prototype" file={files.prototypeFile} busy={busy === 'prototype'} onUpload={upload} onRemove={remove} />
            <div className="hk-form-grid">
              <label>Live demo / Figma<input type="url" value={form.demoUrl} onChange={set('demoUrl')} placeholder="https://… (Vercel, Netlify, Figma)" /></label>
              <label>GitHub / code<input type="url" value={form.repoUrl} onChange={set('repoUrl')} placeholder="https://github.com/…" /></label>
              <label className="wide">Demo video<input type="url" value={form.videoUrl} onChange={set('videoUrl')} placeholder="https://youtu.be/… (2–3 minutes is ideal)" /></label>
            </div>
          </fieldset>

          <fieldset className="hk-sub-step">
            <legend><span>5</span> Screenshots <small>(optional)</small></legend>
            <div className="hk-shots editable">
              {files.screenshots.map((f) => (
                <figure key={f.url}>
                  <img src={f.url} alt="Project screenshot" />
                  <button type="button" onClick={() => remove('screenshot', f.url)} aria-label="Remove screenshot" disabled={Boolean(busy)}><i className="bi bi-x-lg" aria-hidden="true" /></button>
                </figure>
              ))}
              {files.screenshots.length < 5 && (
                <button type="button" className="hk-shot-add" onClick={() => shotInput.current?.click()} disabled={Boolean(busy)}>
                  <i className={`bi ${busy === 'screenshot' ? 'bi-arrow-repeat hk-spin' : 'bi-image'}`} aria-hidden="true" />
                  <span>{busy === 'screenshot' ? 'Uploading…' : 'Add screenshot'}</span>
                </button>
              )}
            </div>
            <small className="hk-muted">{UPLOADS.screenshot.hint}</small>
            <input ref={shotInput} type="file" accept={UPLOADS.screenshot.accept} hidden onChange={(e) => { if (e.target.files?.[0]) upload('screenshot', e.target.files[0]); e.target.value = ''; }} />
          </fieldset>
        </div>

        <aside className="hk-sub-check">
          <h3>Ready to submit?</h3>
          <div className="hk-sub-progress"><span style={{ width: `${(doneCount / checklist.length) * 100}%` }} /></div>
          <ul>
            {checklist.map((c) => (
              <li key={c.label} className={c.done ? 'done' : ''}>
                <i className={`bi ${c.done ? 'bi-check-circle-fill' : 'bi-circle'}`} aria-hidden="true" /> {c.label}
              </li>
            ))}
          </ul>
          <div className="hk-form-actions">
            {!isFinal && (
              <button type="button" className="hk-btn" onClick={() => save('draft')} disabled={Boolean(busy)}>
                {busy === 'draft' ? 'Saving…' : 'Save draft'}
              </button>
            )}
            <button type="submit" className="btn btn-gold" disabled={Boolean(busy) || !ready}>
              {busy === 'submit' ? 'Submitting…' : isFinal ? 'Save changes' : 'Submit final'}
            </button>
            {isFinal && <button type="button" className="hk-btn" onClick={() => setEditing(false)}>Cancel</button>}
          </div>
          {!isFinal && <p className="hk-muted small">Files upload straight away. Save a draft to keep your text, then submit when it&apos;s ready.</p>}
        </aside>
      </div>

      {msg.text && <p className={msg.tone === 'ok' ? 'hk-ok' : 'hk-error'} role={msg.tone === 'ok' ? 'status' : 'alert'}>{msg.text}</p>}
    </form>
  );
}

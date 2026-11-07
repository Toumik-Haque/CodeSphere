import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { apiRequest } from '../lib/api';
import '../css/Host.css';

const toLocal = (d) => {
  if (!d) return '';
  const date = new Date(d);
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
};
const fromLocal = (s) => (s ? new Date(s).toISOString() : '');

const COMMON = {
  title: '', description: '', rules: '', hostName: '', contactEmail: '', contactPhone: '', websiteLink: '',
  linkedinPostLink: '', instagramPostLink: '',
};
const EMPTY = {
  event: { ...COMMON, category: 'Workshop', mode: 'In-person', date: '', endDate: '', venue: '', meetingLink: '', registrationLink: '' },
  hackathon: {
    ...COMMON, tagline: '', mode: 'online', venue: '', regStart: '', regEnd: '', submissionStart: '', submissionEnd: '',
    teamMin: 1, teamMax: 4, tracks: '', prizes: [{ title: 'Winner', reward: '' }],
  },
};
const DATE_KEYS = ['date', 'endDate', 'regStart', 'regEnd', 'submissionStart', 'submissionEnd'];

const isUrl = (v) => /^https?:\/\/\S+$/i.test(v || '');
const LINKEDIN = /^https:\/\/([a-z0-9-]+\.)?linkedin\.com\//i;
const INSTAGRAM = /^https:\/\/(www\.)?instagram\.com\//i;

// Required items, shown as a live checklist.
function checklist(kind, f, hasBanner) {
  const items = [
    { label: 'Title', ok: f.title.trim().length >= 3 },
    { label: 'Banner image', ok: hasBanner },
    { label: 'Description (50+ characters)', ok: f.description.trim().length >= 50 },
    { label: 'Rules / guidelines', ok: f.rules.trim().length >= 20 },
  ];
  if (kind === 'event') {
    items.push(
      { label: 'Date & time', ok: Boolean(f.date) },
      { label: f.mode === 'Online' ? 'Meeting link' : f.mode === 'Hybrid' ? 'Venue + meeting link' : 'Venue', ok: (f.mode === 'Online' || f.venue.trim()) && (f.mode === 'In-person' || isUrl(f.meetingLink)) },
      { label: 'Registration link', ok: isUrl(f.registrationLink) },
    );
  } else {
    items.push(
      { label: 'All four dates', ok: ['regStart', 'regEnd', 'submissionStart', 'submissionEnd'].every((k) => f[k]) },
      { label: 'At least one prize', ok: f.prizes.some((p) => p.title.trim()) },
    );
  }
  items.push(
    { label: 'LinkedIn post', ok: LINKEDIN.test(f.linkedinPostLink) },
    { label: 'Instagram post', ok: INSTAGRAM.test(f.instagramPostLink) },
    { label: 'Organiser name', ok: f.hostName.trim().length >= 2 },
    { label: 'Contact email', ok: /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.contactEmail) },
  );
  return items;
}

function Field({ label, hint, required, wide, children }) {
  return (
    <label className={`host-field ${wide ? 'wide' : ''}`}>
      <span>{label}{required && <em aria-hidden="true"> *</em>}</span>
      {children}
      {hint && <small>{hint}</small>}
    </label>
  );
}

export default function HostSubmit() {
  const { kind: kindParam, id } = useParams();
  const kind = kindParam === 'hackathon' ? 'hackathon' : 'event';
  const navigate = useNavigate();
  const [form, setForm] = useState(EMPTY[kind]);
  const [existing, setExisting] = useState(null);
  const [banner, setBanner] = useState(null);
  const [preview, setPreview] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(Boolean(id));

  useEffect(() => {
    if (!id) return undefined;
    let cancelled = false;
    apiRequest(`/host/${kind}/${id}`)
      .then(({ item }) => {
        if (cancelled) return;
        setExisting(item);
        const next = { ...EMPTY[kind] };
        Object.keys(next).forEach((k) => {
          if (item[k] !== undefined && item[k] !== null) next[k] = item[k];
        });
        DATE_KEYS.forEach((k) => {
          if (k in next) next[k] = toLocal(item[k]);
        });
        if (kind === 'hackathon') {
          next.tracks = (item.tracks || []).join(', ');
          next.prizes = item.prizes?.length ? item.prizes : EMPTY.hackathon.prizes;
        }
        setForm(next);
        setPreview(item.bannerUrl);
      })
      .catch((e) => !cancelled && setError(e.message))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [id, kind]);

  useEffect(() => () => {
    if (preview.startsWith('blob:')) URL.revokeObjectURL(preview);
  }, [preview]);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const setPrize = (i, k, v) => setForm((f) => ({ ...f, prizes: f.prizes.map((p, j) => (j === i ? { ...p, [k]: v } : p)) }));
  const items = useMemo(() => checklist(kind, form, Boolean(banner || preview)), [kind, form, banner, preview]);
  const done = items.filter((i) => i.ok).length;

  const pickBanner = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) return setError('The banner must be a JPEG, PNG or WebP image.');
    if (file.size > 5 * 1024 * 1024) return setError('The banner must be 5 MB or smaller.');
    setError('');
    setBanner(file);
    setPreview(URL.createObjectURL(file));
    return undefined;
  };

  const submit = async (e) => {
    e.preventDefault();
    const missing = items.filter((i) => !i.ok);
    if (missing.length) {
      setError(`Still needed: ${missing.map((m) => m.label).join(', ')}.`);
      return;
    }
    setBusy(true);
    setError('');
    const fd = new FormData();
    Object.entries(form).forEach(([k, v]) => {
      if (k === 'prizes') fd.append(k, JSON.stringify(v.filter((p) => p.title.trim())));
      else if (k === 'tracks') fd.append(k, JSON.stringify(v.split(',').map((t) => t.trim()).filter(Boolean)));
      else if (DATE_KEYS.includes(k)) fd.append(k, fromLocal(v));
      else fd.append(k, v);
    });
    if (banner) fd.append('banner', banner);
    try {
      const r = await apiRequest(id ? `/host/${kind}/${id}` : `/host/${kind}`, { method: id ? 'PUT' : 'POST', body: fd });
      navigate('/host', { state: { message: r.message } });
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const noun = kind === 'event' ? 'event' : 'hackathon';

  return (
    <>
      <Navbar />
      <main className="host-page">
        <div className="container">
          <Link to={kind === 'event' ? '/events' : '/hackathons'} className="host-back"><i className="bi bi-arrow-left" aria-hidden="true" /> Back to {noun}s</Link>
          <header className="host-head">
            <span className="host-eyebrow"><i className={`bi ${kind === 'event' ? 'bi-calendar-plus' : 'bi-trophy'}`} aria-hidden="true" /> Community hosting</span>
            <h1>{id ? `Update your ${noun}` : `Host your ${noun} on CodeSphere`}</h1>
            <p>Fill in everything below. Our team reviews each listing (usually within 48 hours). Once approved it goes live on the {noun}s page and you&apos;ll get a notification.</p>
          </header>

          {existing?.reviewStatus === 'rejected' && (
            <div className="host-review-note rejected" role="alert">
              <strong><i className="bi bi-exclamation-triangle" aria-hidden="true" /> Changes requested</strong>
              <p>{existing.reviewNote}</p>
              <small>Fix the points above and resubmit. It goes back into the review queue.</small>
            </div>
          )}
          {existing?.reviewStatus === 'approved' && (
            <div className="host-review-note approved">
              <strong><i className="bi bi-info-circle" aria-hidden="true" /> This listing is live</strong>
              <p>Saving changes takes it offline until an admin approves the update.</p>
            </div>
          )}

          {loading ? <div className="host-skeleton" /> : (
            <form className="host-layout" onSubmit={submit} noValidate>
              <div className="host-sections">
                {/* 1. Basics */}
                <section className="host-card">
                  <h2><span>1</span> Basics</h2>
                  <div className="host-grid">
                    <Field label={`${kind === 'event' ? 'Event' : 'Hackathon'} title`} required wide>
                      <input value={form.title} onChange={set('title')} maxLength={120} placeholder={kind === 'event' ? 'Intro to Git & GitHub' : 'HackTheCampus 2.0'} />
                    </Field>
                    {kind === 'event' ? (
                      <Field label="Category" required>
                        <select value={form.category} onChange={set('category')}>
                          <option>Workshop</option>
                          <option>Hackathon</option>
                          <option>Community Meetup</option>
                        </select>
                      </Field>
                    ) : (
                      <Field label="Tagline" hint="One line that sells it." wide>
                        <input value={form.tagline} onChange={set('tagline')} maxLength={200} placeholder="36 hours to build for your campus" />
                      </Field>
                    )}
                  </div>
                </section>

                {/* 2. Banner */}
                <section className="host-card">
                  <h2><span>2</span> Banner</h2>
                  <label className={`host-banner ${preview ? 'has-image' : ''}`}>
                    {preview ? <img src={preview} alt="Banner preview" /> : (
                      <span><i className="bi bi-image" aria-hidden="true" /><strong>Upload a banner</strong><small>JPEG, PNG or WebP · up to 5 MB · 1600×900 works best</small></span>
                    )}
                    <input type="file" accept="image/jpeg,image/png,image/webp" onChange={pickBanner} />
                    {preview && <em>Change image</em>}
                  </label>
                </section>

                {/* 3. Schedule & place */}
                <section className="host-card">
                  <h2><span>3</span> When & where</h2>
                  <div className="host-grid">
                    {kind === 'event' ? (
                      <>
                        <Field label="Starts" required><input type="datetime-local" value={form.date} onChange={set('date')} /></Field>
                        <Field label="Ends"><input type="datetime-local" value={form.endDate} onChange={set('endDate')} /></Field>
                        <Field label="Mode" required>
                          <select value={form.mode} onChange={set('mode')}>
                            <option>In-person</option>
                            <option>Online</option>
                            <option>Hybrid</option>
                          </select>
                        </Field>
                        {form.mode !== 'Online' && <Field label="Venue" required><input value={form.venue} onChange={set('venue')} maxLength={200} placeholder="Room 204, Block A" /></Field>}
                        {form.mode !== 'In-person' && <Field label="Meeting / stream link" required><input type="url" value={form.meetingLink} onChange={set('meetingLink')} placeholder="https://meet.google.com/…" /></Field>}
                        <Field label="Registration link" required wide hint="Google Form, Luma, Unstop, etc."><input type="url" value={form.registrationLink} onChange={set('registrationLink')} placeholder="https://…" /></Field>
                      </>
                    ) : (
                      <>
                        <Field label="Registration opens" required><input type="datetime-local" value={form.regStart} onChange={set('regStart')} /></Field>
                        <Field label="Registration closes" required><input type="datetime-local" value={form.regEnd} onChange={set('regEnd')} /></Field>
                        <Field label="Submissions open" required><input type="datetime-local" value={form.submissionStart} onChange={set('submissionStart')} /></Field>
                        <Field label="Submissions close" required><input type="datetime-local" value={form.submissionEnd} onChange={set('submissionEnd')} /></Field>
                        <Field label="Mode" required>
                          <select value={form.mode} onChange={set('mode')}>
                            <option value="online">Online</option>
                            <option value="offline">In person</option>
                            <option value="hybrid">Hybrid</option>
                          </select>
                        </Field>
                        {form.mode !== 'online' && <Field label="Venue"><input value={form.venue} onChange={set('venue')} maxLength={200} /></Field>}
                        <Field label="Min team size"><input type="number" min="1" max="10" value={form.teamMin} onChange={set('teamMin')} /></Field>
                        <Field label="Max team size"><input type="number" min="1" max="10" value={form.teamMax} onChange={set('teamMax')} /></Field>
                      </>
                    )}
                  </div>
                  {kind === 'hackathon' && <p className="host-note"><i className="bi bi-info-circle" aria-hidden="true" /> Teams register and submit projects right here on CodeSphere, and you can judge them once approved.</p>}
                </section>

                {/* 4. Details */}
                <section className="host-card">
                  <h2><span>4</span> Details</h2>
                  <div className="host-grid">
                    <Field label="Description" required wide hint={`${form.description.trim().length} characters · who it's for, what they'll learn or build, agenda, speakers.`}>
                      <textarea rows={8} value={form.description} onChange={set('description')} maxLength={kind === 'event' ? 5000 : 20000} />
                    </Field>
                    <Field label="Rules & guidelines" required wide hint="Eligibility, code of conduct, what to bring, judging criteria…">
                      <textarea rows={6} value={form.rules} onChange={set('rules')} maxLength={10000} />
                    </Field>
                    {kind === 'hackathon' && (
                      <Field label="Tracks / themes" wide hint="Comma separated"><input value={form.tracks} onChange={set('tracks')} placeholder="AI for Good, FinTech, Open Innovation" /></Field>
                    )}
                  </div>
                  {kind === 'hackathon' && (
                    <>
                      <h3>Prizes <em aria-hidden="true">*</em></h3>
                      {form.prizes.map((p, i) => (
                        <div key={i} className="host-prize-row">
                          <input value={p.title} onChange={(e) => setPrize(i, 'title', e.target.value)} placeholder="Winner" maxLength={80} aria-label="Prize title" />
                          <input value={p.reward} onChange={(e) => setPrize(i, 'reward', e.target.value)} placeholder="₹10,000 + swag" maxLength={120} aria-label="Reward" />
                          <button type="button" aria-label="Remove prize" onClick={() => setForm((f) => ({ ...f, prizes: f.prizes.filter((_, j) => j !== i) }))}><i className="bi bi-x-lg" aria-hidden="true" /></button>
                        </div>
                      ))}
                      <button type="button" className="host-add" onClick={() => setForm((f) => ({ ...f, prizes: [...f.prizes, { title: '', reward: '' }] }))}><i className="bi bi-plus" aria-hidden="true" /> Add prize</button>
                    </>
                  )}
                </section>

                {/* 5. Promotion */}
                <section className="host-card">
                  <h2><span>5</span> Promotion posts</h2>
                  <p className="host-note">Share your official posts so students can verify and spread the word.</p>
                  <div className="host-grid">
                    <Field label="LinkedIn post" required><span className="host-input-icon"><i className="bi bi-linkedin" aria-hidden="true" /><input type="url" value={form.linkedinPostLink} onChange={set('linkedinPostLink')} placeholder="https://www.linkedin.com/posts/…" /></span></Field>
                    <Field label="Instagram post" required><span className="host-input-icon"><i className="bi bi-instagram" aria-hidden="true" /><input type="url" value={form.instagramPostLink} onChange={set('instagramPostLink')} placeholder="https://www.instagram.com/p/…" /></span></Field>
                    <Field label="Website" wide><span className="host-input-icon"><i className="bi bi-globe2" aria-hidden="true" /><input type="url" value={form.websiteLink} onChange={set('websiteLink')} placeholder="https://…" /></span></Field>
                  </div>
                </section>

                {/* 6. Organiser */}
                <section className="host-card">
                  <h2><span>6</span> Organiser</h2>
                  <div className="host-grid">
                    <Field label="Organiser / club name" required><input value={form.hostName} onChange={set('hostName')} maxLength={120} placeholder="GDG On Campus, ACM Student Chapter…" /></Field>
                    <Field label="Contact email" required hint="Only visible to the CodeSphere team."><input type="email" value={form.contactEmail} onChange={set('contactEmail')} maxLength={200} /></Field>
                    <Field label="Contact phone" hint="Optional · only visible to the team."><input type="tel" value={form.contactPhone} onChange={set('contactPhone')} maxLength={30} /></Field>
                  </div>
                </section>
              </div>

              <aside className="host-side">
                <div className="host-card host-check">
                  <div className="host-progress" style={{ '--p': `${(done / items.length) * 100}%` }}><span>{done}/{items.length}</span></div>
                  <h2>Checklist</h2>
                  <ul>
                    {items.map((i) => (
                      <li key={i.label} className={i.ok ? 'ok' : ''}>
                        <i className={`bi ${i.ok ? 'bi-check-circle-fill' : 'bi-circle'}`} aria-hidden="true" /> {i.label}
                      </li>
                    ))}
                  </ul>
                  {error && <p className="host-error" role="alert">{error}</p>}
                  <button type="submit" className="btn btn-gold host-submit" disabled={busy}>
                    {busy ? 'Sending…' : id ? 'Resubmit for review' : 'Submit for review'}
                  </button>
                  <p className="host-fine">By submitting you confirm the details are accurate and you&apos;re authorised to promote this {noun}.</p>
                </div>
              </aside>
            </form>
          )}
        </div>
      </main>
      <Footer />
    </>
  );
}

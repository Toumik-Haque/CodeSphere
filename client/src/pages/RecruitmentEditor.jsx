import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import BroadcastOptions from '../components/BroadcastOptions';
import { useAuth } from '../context/AuthContext';
import { apiRequest } from '../lib/api';
import { toInputValue } from '../lib/recruitments';
import '../css/Recruitments.css';

const EMPTY = {
  title: '', organization: '', type: 'recruitment', summary: '', description: '', eligibility: '',
  mode: 'In-person', venue: '', platform: '', applyBy: '', oneClick: true, formUrl: '',
  contactName: '', contactEmail: '',
  roles: [{ title: '', description: '', openings: '' }],
  process: [{ title: 'Apply', detail: '', date: '' }],
};

// Post or edit a recruitment drive / interview session. Admin posts go live
// right away; members' posts are reviewed by an admin first.
export default function RecruitmentEditor() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const isAdmin = user?.role === 'admin';
  const [form, setForm] = useState(id ? null : EMPTY);
  const [banner, setBanner] = useState(null);
  const [bannerPreview, setBannerPreview] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [broadcast, setBroadcast] = useState({ sendNotification: true, sendEmail: true });

  // Editing: load the post (the API takes its slug or id).
  useEffect(() => {
    if (!id) return undefined;
    let cancelled = false;
    apiRequest('/recruitments/mine')
      .then(async (mine) => {
        const own = mine.posted.find((p) => p.id === id);
        let slug = own?.slug;
        if (!slug && isAdmin) slug = (await apiRequest('/recruitments/admin/all')).recruitments.find((p) => p.id === id)?.slug;
        if (!slug) throw new Error('You can only edit your own posts.');
        const { recruitment: r } = await apiRequest(`/recruitments/${slug}`);
        if (cancelled) return;
        setForm({
          ...EMPTY,
          ...Object.fromEntries(Object.keys(EMPTY).map((k) => [k, r[k] ?? EMPTY[k]])),
          formUrl: r.formUrl || '',
          applyBy: toInputValue(r.applyBy),
          roles: r.rolesDetail.length ? r.rolesDetail.map((x) => ({ ...x, openings: x.openings || '' })) : EMPTY.roles,
          process: r.process.length ? r.process.map((p) => ({ ...p, date: toInputValue(p.date) })) : EMPTY.process,
        });
        setBannerPreview(r.banner || '');
      })
      .catch((e) => !cancelled && setError(e.message));
    return () => {
      cancelled = true;
    };
  }, [id, isAdmin]);

  if (!form) {
    return <><Navbar /><main className="rec-page"><p className="container rec-body rec-muted">{error || 'Loading…'}</p></main></>;
  }

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }));
  const setRow = (list, i, key) => (e) => setForm((f) => ({ ...f, [list]: f[list].map((row, j) => (j === i ? { ...row, [key]: e.target.value } : row)) }));
  const addRow = (list, row) => setForm((f) => ({ ...f, [list]: [...f[list], row] }));
  const removeRow = (list, i) => setForm((f) => ({ ...f, [list]: f[list].filter((_, j) => j !== i) }));

  const pickBanner = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setBanner(file);
    setBannerPreview(URL.createObjectURL(file));
  };

  const submit = async (publish) => {
    setBusy(true);
    setError('');
    try {
      const body = new FormData();
      Object.entries(form).forEach(([k, v]) => {
        if (k === 'roles' || k === 'process') return;
        body.append(k, k === 'applyBy' && v ? new Date(v).toISOString() : String(v ?? ''));
      });
      body.append('roles', JSON.stringify(form.roles.filter((r) => r.title.trim())));
      body.append('process', JSON.stringify(form.process
        .filter((p) => p.title.trim())
        .map((p) => ({ ...p, date: p.date ? new Date(p.date).toISOString() : '' }))));
      body.append('publish', String(publish));
      body.append('sendNotification', String(broadcast.sendNotification));
      body.append('sendEmail', String(broadcast.sendEmail));
      if (banner) body.append('banner', banner, banner.name);
      const res = await apiRequest(id ? `/recruitments/${id}` : '/recruitments', { method: id ? 'PUT' : 'POST', body });
      navigate(`/recruitments/${res.slug}`, { replace: true, state: { message: res.message } });
    } catch (e) {
      setError(e.message);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <Navbar />
      <main className="rec-page">
        <div className="container rec-body rec-editor">
          <Link to="/recruitments" className="rec-back"><i className="bi bi-arrow-left" aria-hidden="true" /> All recruitments</Link>
          <h1>{id ? 'Edit recruitment' : 'Post a recruitment or interview'}</h1>
          <p className="rec-muted">
            {isAdmin
              ? 'Posted as CodeSphere. It goes live as soon as you publish.'
              : 'An admin reviews every post before it goes live. You\'ll get a notification when it\'s approved.'}
          </p>
          {error && <p className="rec-error" role="alert">{error}</p>}

          <form onSubmit={(e) => { e.preventDefault(); submit(true); }}>
            <fieldset className="rec-fieldset">
              <legend>Basics</legend>
              <div className="rec-type-pick" role="radiogroup" aria-label="Type">
                {[['recruitment', 'bi-people', 'Recruitment drive', 'Hiring members for a team or club'], ['interview', 'bi-chat-square-quote', 'Interview session', 'Interviews for shortlisted or registered people']].map(([value, icon, label, hint]) => (
                  <label key={value} className={form.type === value ? 'on' : ''}>
                    <input type="radio" name="type" value={value} checked={form.type === value} onChange={set('type')} />
                    <i className={`bi ${icon}`} aria-hidden="true" />
                    <span><strong>{label}</strong><small>{hint}</small></span>
                  </label>
                ))}
              </div>
              <div className="rec-grid-2">
                <label>Organisation *<input value={form.organization} onChange={set('organization')} maxLength={100} placeholder="e.g. GDG on Campus AGEMC" required /></label>
                <label>Title *<input value={form.title} onChange={set('title')} maxLength={120} placeholder="e.g. Core Team Recruitment 2026" required /></label>
                <label className="wide">One-line summary<input value={form.summary} onChange={set('summary')} maxLength={300} placeholder="What it is, in one sentence" /></label>
                <label className="wide">Description *
                  <textarea value={form.description} onChange={set('description')} rows={6} maxLength={8000} required placeholder="About the organisation, what members do, what you are looking for…" />
                </label>
                <label className="wide">Who can apply
                  <textarea value={form.eligibility} onChange={set('eligibility')} rows={3} maxLength={1500} placeholder="e.g. 1st–3rd year students of any branch. Basic programming knowledge." />
                </label>
              </div>
            </fieldset>

            <fieldset className="rec-fieldset">
              <legend>Roles</legend>
              {form.roles.map((role, i) => (
                <div key={i} className="rec-row">
                  <input value={role.title} onChange={setRow('roles', i, 'title')} placeholder="Role, e.g. Web Developer" maxLength={80} aria-label="Role title" />
                  <input value={role.openings} onChange={setRow('roles', i, 'openings')} type="number" min="1" max="500" placeholder="Openings" aria-label="Openings" />
                  <input className="grow" value={role.description} onChange={setRow('roles', i, 'description')} placeholder="What this role does (optional)" maxLength={400} aria-label="Role description" />
                  <button type="button" className="rec-icon-btn" onClick={() => removeRow('roles', i)} aria-label="Remove role"><i className="bi bi-x-lg" /></button>
                </div>
              ))}
              {form.roles.length < 10 && <button type="button" className="rec-btn" onClick={() => addRow('roles', { title: '', description: '', openings: '' })}><i className="bi bi-plus" aria-hidden="true" /> Add role</button>}
            </fieldset>

            <fieldset className="rec-fieldset">
              <legend>How it will be conducted</legend>
              <p className="rec-muted small">List the steps in order, e.g. Apply → Online test → Technical interview → Results.</p>
              {form.process.map((step, i) => (
                <div key={i} className="rec-row">
                  <span className="rec-step-num">{i + 1}</span>
                  <input value={step.title} onChange={setRow('process', i, 'title')} placeholder="Step, e.g. Technical interview" maxLength={80} aria-label="Step" />
                  <input type="datetime-local" value={step.date} onChange={setRow('process', i, 'date')} aria-label="Date (optional)" />
                  <input className="grow" value={step.detail} onChange={setRow('process', i, 'detail')} placeholder="Details (optional), e.g. 15 min on Google Meet" maxLength={400} aria-label="Details" />
                  <button type="button" className="rec-icon-btn" onClick={() => removeRow('process', i)} aria-label="Remove step"><i className="bi bi-x-lg" /></button>
                </div>
              ))}
              {form.process.length < 8 && <button type="button" className="rec-btn" onClick={() => addRow('process', { title: '', detail: '', date: '' })}><i className="bi bi-plus" aria-hidden="true" /> Add step</button>}
              <div className="rec-grid-2">
                <label>Mode
                  <select value={form.mode} onChange={set('mode')}>
                    <option>In-person</option><option>Online</option><option>Hybrid</option>
                  </select>
                </label>
                {form.mode !== 'Online' && <label>Venue *<input value={form.venue} onChange={set('venue')} maxLength={200} placeholder="e.g. Seminar Hall, AGEMC" /></label>}
                {form.mode !== 'In-person' && <label>Platform<input value={form.platform} onChange={set('platform')} maxLength={120} placeholder="e.g. Google Meet" /></label>}
              </div>
            </fieldset>

            <fieldset className="rec-fieldset">
              <legend>Registration</legend>
              <div className="rec-grid-2">
                <label>Last date to apply *<input type="datetime-local" value={form.applyBy} onChange={set('applyBy')} required /></label>
              </div>
              <label className="rec-check">
                <input type="checkbox" checked={form.oneClick} onChange={set('oneClick')} />
                <span><strong>One-click registration on CodeSphere</strong><small>Members apply with their profile; you manage applicants on the page.</small></span>
              </label>
              <label>Google Form link {form.oneClick ? '(optional)' : '*'}
                <input type="url" value={form.formUrl} onChange={set('formUrl')} placeholder="https://forms.gle/…" />
              </label>
            </fieldset>

            <fieldset className="rec-fieldset">
              <legend>Banner &amp; contact</legend>
              <label className="rec-banner-pick">
                {bannerPreview ? <img src={bannerPreview} alt="Banner preview" /> : <span><i className="bi bi-image" aria-hidden="true" /> Add a banner (JPG, PNG or WebP, up to 5 MB)</span>}
                <input type="file" accept="image/jpeg,image/png,image/webp" onChange={pickBanner} hidden />
              </label>
              <div className="rec-grid-2">
                <label>Contact name<input value={form.contactName} onChange={set('contactName')} maxLength={80} /></label>
                <label>Contact email<input type="email" value={form.contactEmail} onChange={set('contactEmail')} maxLength={200} /></label>
              </div>
            </fieldset>

            {isAdmin && <BroadcastOptions value={broadcast} onChange={setBroadcast} />}

            <div className="rec-form-actions">
              <button type="submit" className="rec-btn rec-btn-primary" disabled={busy}>
                {busy ? 'Saving…' : isAdmin ? 'Publish' : id ? 'Save & send for review' : 'Submit for review'}
              </button>
              {isAdmin && <button type="button" className="rec-btn" onClick={() => submit(false)} disabled={busy}>Save as draft</button>}
              <Link to="/recruitments" className="rec-btn">Cancel</Link>
            </div>
          </form>
        </div>
      </main>
      <Footer />
    </>
  );
}

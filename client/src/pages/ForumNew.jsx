import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import SafeText from '../components/SafeText';
import { useAuth } from '../context/AuthContext';
import { apiRequest } from '../lib/api';
import { loadForumConfig } from '../lib/forum';
import { celebrateBadges } from '../lib/badges';
import MentionTextarea from '../components/MentionTextarea';
import '../css/Forum.css';

export default function ForumNew() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [config, setConfig] = useState(null);
  const [form, setForm] = useState({
    category: params.get('category') || '',
    postType: params.get('type') || 'question',
    title: '',
    body: '',
    tags: '',
  });
  const [agreed, setAgreed] = useState(false);
  const [preview, setPreview] = useState(false);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [images, setImages] = useState([]); // [{ id, url }]
  const [uploading, setUploading] = useState(false);

  const addImage = async (file) => {
    if (!file) return;
    if (images.length >= 3) return setError('Up to 3 images per post.');
    if (file.size > 2 * 1024 * 1024) return setError('Images must be 2 MB or smaller.');
    setUploading(true);
    setError('');
    try {
      const data = new FormData();
      data.append('image', file);
      const r = await apiRequest('/forum/uploads', { method: 'POST', body: data });
      setImages((list) => [...list, r]);
    } catch (err) {
      setError(err.message);
    } finally {
      setUploading(false);
    }
    return undefined;
  };

  useEffect(() => {
    let cancelled = false;
    loadForumConfig().then((c) => !cancelled && setConfig(c)).catch((e) => !cancelled && setError(e.message));
    return () => {
      cancelled = true;
    };
  }, []);

  const isStaff = user?.role === 'admin';
  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));
  const limits = config?.limits;

  const submit = async (e) => {
    e.preventDefault();
    if (!agreed) {
      setError('Please confirm you\'ve read the community guidelines.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const result = await apiRequest('/forum/threads', {
        method: 'POST',
        body: JSON.stringify({
          ...form,
          tags: form.tags.split(/[,\s]+/).filter(Boolean),
          attachments: images.map((img) => img.id),
        }),
      });
      celebrateBadges(result.newBadges);
      navigate(`/forum/${result.id}`);
    } catch (err) {
      setError(err.message);
      setSaving(false);
    }
  };

  return (
    <>
      <Navbar />
      <main className="forum-page">
        <div className="container forum-narrow">
          <Link to="/forum" className="forum-back"><i className="bi bi-arrow-left" aria-hidden="true" /> Back to the forum</Link>
          <h1 className="forum-page-title">Start a discussion</h1>

          <form className="forum-form" onSubmit={submit}>
            <div className="forum-form-row">
              <label>
                <span>Category</span>
                <select value={form.category} onChange={set('category')} required>
                  <option value="" disabled>Choose a category</option>
                  {config?.categories.filter((c) => !c.staffOnly || isStaff).map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </label>
              <label>
                <span>Post type</span>
                <select value={form.postType} onChange={set('postType')} required>
                  {config?.postTypes.filter((t) => !t.staffOnly || isStaff).map((t) => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
              </label>
            </div>
            {config && (
              <p className="forum-hint">
                {config.postTypes.find((t) => t.id === form.postType)?.description}
              </p>
            )}

            <label>
              <span>Title</span>
              <input
                type="text"
                value={form.title}
                onChange={set('title')}
                placeholder="e.g. Why does my Python loop skip the last item?"
                minLength={limits?.titleMin}
                maxLength={limits?.titleMax}
                required
              />
              {limits && <small>{form.title.length}/{limits.titleMax}</small>}
            </label>

            <div className="forum-editor-head">
              <span>Details</span>
              <div className="forum-editor-tabs">
                <button type="button" className={!preview ? 'active' : ''} onClick={() => setPreview(false)}>Write</button>
                <button type="button" className={preview ? 'active' : ''} onClick={() => setPreview(true)}>Preview</button>
              </div>
            </div>
            {preview ? (
              <div className="forum-preview">
                {form.body ? <SafeText text={form.body} /> : <p className="forum-muted">Nothing to preview yet.</p>}
              </div>
            ) : (
              <MentionTextarea
                value={form.body}
                onChange={(body) => setForm((f) => ({ ...f, body }))}
                rows={10}
                placeholder="Explain your question or idea. Wrap code in ``` (three backticks) on their own lines."
                minLength={limits?.bodyMin}
                maxLength={limits?.threadBodyMax}
                required
                aria-label="Details"
              />
            )}
            <div className="forum-images">
              {images.map((img) => (
                <figure key={img.id}>
                  <img src={img.url} alt="Attached" />
                  <button type="button" onClick={() => setImages((list) => list.filter((x) => x.id !== img.id))} aria-label="Remove image">
                    <i className="bi bi-x" aria-hidden="true" />
                  </button>
                </figure>
              ))}
              {images.length < 3 && (
                <label className="forum-image-add">
                  <input type="file" accept="image/jpeg,image/png,image/webp,image/gif" onChange={(e) => { addImage(e.target.files[0]); e.target.value = ''; }} disabled={uploading} />
                  <i className={`bi ${uploading ? 'bi-hourglass-split' : 'bi-image'}`} aria-hidden="true" />
                  {uploading ? 'Uploading…' : 'Add image'}
                </label>
              )}
            </div>
            <small className="forum-hint">
              Formatting: ```code blocks```, `inline code`, **bold**, links, and @name to mention someone. Up to 3 images (2 MB each). {limits && `${form.body.length}/${limits.threadBodyMax}`}
            </small>

            <label>
              <span>Tags <em>(optional, up to {limits?.maxTags || 5})</em></span>
              <input type="text" value={form.tags} onChange={set('tags')} placeholder="python, dsa, internship" />
            </label>

            <section className="forum-guidelines-box" aria-labelledby="guidelines-title">
              <h2 id="guidelines-title"><i className="bi bi-shield-check" aria-hidden="true" /> Before you post</h2>
              <ul>{config?.guidelines.map((g) => <li key={g}>{g}</li>)}</ul>
              <label className="forum-agree">
                <input type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} />
                I&apos;ve read the guidelines and my post follows them.
              </label>
              {limits && <p className="forum-hint">You can edit your post for {limits.editWindowMinutes} minutes after posting.</p>}
            </section>

            {error && <p className="forum-error" role="alert">{error}</p>}

            <div className="forum-form-actions">
              <Link to="/forum" className="forum-btn-ghost">Cancel</Link>
              <button type="submit" className="btn btn-gold" disabled={saving}>
                {saving ? 'Posting…' : 'Post discussion'}
              </button>
            </div>
          </form>
        </div>
      </main>
      <Footer />
    </>
  );
}

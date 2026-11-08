import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import SafeText from '../components/SafeText';
import BroadcastOptions from '../components/BroadcastOptions';
import { apiRequest } from '../lib/api';
import '../css/Materials.css';

const EMPTY = { title: '', slug: '', topic: '', level: 'Beginner', summary: '', body: '', tags: '', estMinutes: 10, order: 100, status: 'draft', resources: [] };

const toForm = (g) => ({ ...EMPTY, ...g, tags: (g.tags || []).join(', '), resources: g.resources || [] });
const toPayload = (f) => ({ ...f, tags: f.tags.split(',').map((t) => t.trim()).filter(Boolean), resources: f.resources.filter((r) => r.title || r.url) });

export default function AdminMaterials() {
  const [data, setData] = useState(null);
  const [form, setForm] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [preview, setPreview] = useState(false);
  const [message, setMessage] = useState('');
  const [version, setVersion] = useState(0);
  const [broadcastOptions, setBroadcastOptions] = useState({ sendNotification: true, sendEmail: true });
  const reload = useCallback(() => setVersion((v) => v + 1), []);

  useEffect(() => {
    let cancelled = false;
    apiRequest('/guides/admin/all').then((r) => !cancelled && setData(r)).catch((e) => !cancelled && setMessage(e.message));
    return () => {
      cancelled = true;
    };
  }, [version]);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const setResource = (i, k, v) => setForm((f) => ({ ...f, resources: f.resources.map((r, j) => (j === i ? { ...r, [k]: v } : r)) }));

  const open = (g) => {
    setForm(g ? toForm(g) : { ...EMPTY });
    setEditingId(g?.id || null);
    setBroadcastOptions({ sendNotification: true, sendEmail: true });
    setPreview(false);
    setMessage('');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const save = async (status) => {
    try {
      const body = JSON.stringify({ ...toPayload(form), status: status || form.status, ...broadcastOptions });
      if (editingId) await apiRequest(`/guides/admin/${editingId}`, { method: 'PUT', body });
      else setEditingId((await apiRequest('/guides/admin', { method: 'POST', body })).id);
      setForm((f) => ({ ...f, status: status || f.status }));
      setMessage(status === 'published' ? 'Published.' : 'Saved.');
      reload();
    } catch (e) {
      setMessage(e.message);
    }
  };

  const remove = async () => {
    if (!window.confirm('Delete this guide permanently?')) return;
    try {
      await apiRequest(`/guides/admin/${editingId}`, { method: 'DELETE' });
      setForm(null);
      setEditingId(null);
      setMessage('Deleted.');
      reload();
    } catch (e) {
      setMessage(e.message);
    }
  };

  return (
    <>
      <Navbar />
      <main className="mat-page">
        <div className="container">
          <Link to="/admin" className="mat-back"><i className="bi bi-arrow-left" aria-hidden="true" /> Admin dashboard</Link>
          <div className="mat-admin-head">
            <h1><i className="bi bi-journal-bookmark" aria-hidden="true" /> Study Guide editor</h1>
            {!form && <button type="button" className="btn btn-gold" onClick={() => open(null)}><i className="bi bi-plus-lg" aria-hidden="true" /> New guide</button>}
          </div>
          {message && <p className="mat-note" role="status">{message}</p>}

          {form && (
            <section className="mat-form">
              <h2>{editingId ? `Edit: ${form.title || 'guide'}` : 'New guide'} <span className="mat-pill">{form.status}</span></h2>
              <div className="mat-form-grid">
                <label><span>Title</span><input value={form.title} onChange={set('title')} maxLength={120} /></label>
                <label><span>URL slug</span><input value={form.slug} onChange={set('slug')} placeholder="loops-and-patterns" /></label>
                <label><span>Topic (matches Reverse Coding topics)</span><input value={form.topic} onChange={set('topic')} placeholder="Loops" /></label>
                <label><span>Level</span><select value={form.level} onChange={set('level')}>{(data?.levels || ['Beginner']).map((l) => <option key={l}>{l}</option>)}</select></label>
                <label><span>Read time (min)</span><input type="number" min={1} value={form.estMinutes} onChange={set('estMinutes')} /></label>
                <label><span>Order</span><input type="number" value={form.order} onChange={set('order')} /></label>
                <label className="wide"><span>Summary</span><input value={form.summary} onChange={set('summary')} maxLength={300} /></label>
                <label className="wide"><span>Tags (comma separated)</span><input value={form.tags} onChange={set('tags')} /></label>
              </div>

              <div className="mat-editor-head">
                <span>Content</span>
                <div>
                  <button type="button" className={!preview ? 'active' : ''} onClick={() => setPreview(false)}>Write</button>
                  <button type="button" className={preview ? 'active' : ''} onClick={() => setPreview(true)}>Preview</button>
                </div>
              </div>
              {preview
                ? <div className="mat-preview"><SafeText text={form.body} className="mat-body" /></div>
                : <textarea className="mat-textarea" rows={16} value={form.body} onChange={set('body')} placeholder={'Use ``` on their own lines for code, **bold**, and links.'} />}

              <h3>Resources</h3>
              {form.resources.map((r, i) => (
                <div key={i} className="mat-resource-row">
                  <input value={r.title} onChange={(e) => setResource(i, 'title', e.target.value)} placeholder="Title" aria-label="Resource title" />
                  <input value={r.url} onChange={(e) => setResource(i, 'url', e.target.value)} placeholder="https://…" aria-label="Resource link" />
                  <select value={r.kind || 'docs'} onChange={(e) => setResource(i, 'kind', e.target.value)} aria-label="Resource type">
                    {(data?.kinds || ['docs']).map((k) => <option key={k}>{k}</option>)}
                  </select>
                  <button type="button" onClick={() => setForm((f) => ({ ...f, resources: f.resources.filter((_, j) => j !== i) }))} aria-label="Remove resource"><i className="bi bi-trash" aria-hidden="true" /></button>
                </div>
              ))}
              <button type="button" className="mat-btn" onClick={() => setForm((f) => ({ ...f, resources: [...f.resources, { title: '', url: '', kind: 'docs' }] }))}>
                <i className="bi bi-plus" aria-hidden="true" /> Add resource
              </button>

              <div className="mat-form-actions">
                <BroadcastOptions value={broadcastOptions} onChange={setBroadcastOptions} />
                <button type="button" className="mat-btn" onClick={() => { setForm(null); setEditingId(null); }}>Close</button>
                <button type="button" className="mat-btn" onClick={() => save()}>Save</button>
                {form.status !== 'published'
                  ? <button type="button" className="btn btn-gold" onClick={() => save('published')}>Publish</button>
                  : <button type="button" className="mat-btn" onClick={() => save('draft')}>Unpublish</button>}
                {editingId && <button type="button" className="mat-btn danger" onClick={remove}>Delete</button>}
                {editingId && form.status === 'published' && <Link to={`/materials/${form.slug}`} target="_blank">View</Link>}
              </div>
            </section>
          )}

          <div className="mat-admin-list">
            {!data && <p>Loading…</p>}
            {data?.guides.length === 0 && <p className="mat-note">No guides yet. Run <code>node scripts/seedStudyGuides.js</code> to add the starter set.</p>}
            {data?.guides.map((g) => (
              <article key={g.id} className="mat-admin-row">
                <strong>{g.title}</strong>
                <span>{g.topic} · {g.level}</span>
                <span className={`mat-pill ${g.status === 'published' ? 'level-beginner' : ''}`}>{g.status}</span>
                <button type="button" className="mat-btn" onClick={() => open(g)}><i className="bi bi-pencil" aria-hidden="true" /> Edit</button>
              </article>
            ))}
          </div>
        </div>
      </main>
    </>
  );
}

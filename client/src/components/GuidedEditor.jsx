import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiRequest } from '../lib/api';
import { CATEGORIES, LEVELS } from '../lib/projects';

const EMPTY = {
  title: '', slug: '', summary: '', level: 'Beginner', category: 'web', estHours: 8, order: 100, status: 'published',
  prerequisites: '', stack: '', outcomes: '', problem: '', starterRepo: '', submissionCriteria: '',
  milestones: [{ title: '', description: '', tasks: '', resources: [] }],
};
const lines = (a) => (a || []).join('\n');
const toForm = (g) => ({
  ...EMPTY,
  ...g,
  prerequisites: lines(g.prerequisites), stack: lines(g.stack), outcomes: lines(g.outcomes), submissionCriteria: lines(g.submissionCriteria),
  milestones: g.milestones.map((m) => ({ ...m, tasks: lines(m.tasks), resources: m.resources || [] })),
});

// Create and edit guided projects (admins + project reviewers).
export default function GuidedEditor() {
  const [items, setItems] = useState(null);
  const [form, setForm] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [msg, setMsg] = useState('');
  const [version, setVersion] = useState(0);
  const reload = useCallback(() => setVersion((v) => v + 1), []);

  useEffect(() => {
    let cancelled = false;
    apiRequest('/projects/admin/guided').then((r) => !cancelled && setItems(r.items)).catch((e) => !cancelled && setMsg(e.message));
    return () => {
      cancelled = true;
    };
  }, [version]);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const setM = (i, k, v) => setForm((f) => ({ ...f, milestones: f.milestones.map((m, j) => (j === i ? { ...m, [k]: v } : m)) }));
  const setR = (i, ri, k, v) => setM(i, 'resources', form.milestones[i].resources.map((r, j) => (j === ri ? { ...r, [k]: v } : r)));

  const save = async (e) => {
    e.preventDefault();
    setMsg('');
    try {
      const body = JSON.stringify({ ...form, milestones: form.milestones.map((m) => ({ ...m, tasks: m.tasks.split('\n') })) });
      if (editingId) await apiRequest(`/projects/admin/guided/${editingId}`, { method: 'PUT', body });
      else setEditingId((await apiRequest('/projects/admin/guided', { method: 'POST', body })).id);
      setMsg('Saved.');
      reload();
    } catch (err) {
      setMsg(err.message);
    }
  };

  const remove = async () => {
    if (!window.confirm('Delete this guided project? Students\' progress on it is removed; their showcase projects stay.')) return;
    await apiRequest(`/projects/admin/guided/${editingId}`, { method: 'DELETE' });
    setForm(null);
    setEditingId(null);
    reload();
  };

  return (
    <div>
      <div className="pa-head">
        <h2>Guided projects</h2>
        <button type="button" className="btn btn-gold" onClick={() => { setForm({ ...EMPTY }); setEditingId(null); setMsg(''); }}><i className="bi bi-plus-lg" aria-hidden="true" /> New guided project</button>
      </div>
      {msg && <p className="ph-ok" role="status">{msg}</p>}

      {form && (
        <form className="pe-card" onSubmit={save}>
          <div className="pe-grid">
            <label className="pe-field"><span>Title</span><input value={form.title} onChange={set('title')} maxLength={100} required /></label>
            <label className="pe-field"><span>URL slug</span><input value={form.slug} onChange={set('slug')} placeholder="auto from title" /></label>
            <label className="pe-field wide"><span>Summary</span><input value={form.summary} onChange={set('summary')} maxLength={300} /></label>
            <label className="pe-field"><span>Level</span><select value={form.level} onChange={set('level')}>{LEVELS.map((l) => <option key={l}>{l}</option>)}</select></label>
            <label className="pe-field"><span>Domain</span><select value={form.category} onChange={set('category')}>{CATEGORIES.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}</select></label>
            <label className="pe-field"><span>Estimated hours</span><input type="number" min="1" max="200" value={form.estHours} onChange={set('estHours')} /></label>
            <label className="pe-field"><span>Order</span><input type="number" value={form.order} onChange={set('order')} /></label>
            <label className="pe-field"><span>Status</span><select value={form.status} onChange={set('status')}><option value="published">Published</option><option value="draft">Draft</option></select></label>
            <label className="pe-field"><span>Starter repository</span><input type="url" value={form.starterRepo} onChange={set('starterRepo')} placeholder="https://github.com/…" /></label>
            <label className="pe-field wide"><span>The brief</span><textarea rows={3} value={form.problem} onChange={set('problem')} maxLength={3000} /></label>
            <label className="pe-field"><span>Prerequisites (one per line)</span><textarea rows={3} value={form.prerequisites} onChange={set('prerequisites')} /></label>
            <label className="pe-field"><span>Tech stack (one per line)</span><textarea rows={3} value={form.stack} onChange={set('stack')} /></label>
            <label className="pe-field"><span>Learning outcomes (one per line)</span><textarea rows={3} value={form.outcomes} onChange={set('outcomes')} /></label>
            <label className="pe-field"><span>Submission criteria (one per line)</span><textarea rows={3} value={form.submissionCriteria} onChange={set('submissionCriteria')} /></label>
          </div>

          <h3>Milestones</h3>
          {form.milestones.map((m, i) => (
            <div key={i} className="ge-milestone">
              <div className="pe-grid">
                <label className="pe-field"><span>Milestone {i + 1} title</span><input value={m.title} onChange={(e) => setM(i, 'title', e.target.value)} maxLength={100} /></label>
                <label className="pe-field"><span>Description</span><input value={m.description} onChange={(e) => setM(i, 'description', e.target.value)} maxLength={500} /></label>
                <label className="pe-field wide"><span>Tasks (one per line)</span><textarea rows={3} value={m.tasks} onChange={(e) => setM(i, 'tasks', e.target.value)} /></label>
              </div>
              {m.resources.map((r, ri) => (
                <div key={ri} className="pe-contrib">
                  <input value={r.title} onChange={(e) => setR(i, ri, 'title', e.target.value)} placeholder="Resource title" aria-label="Resource title" />
                  <input value={r.url} onChange={(e) => setR(i, ri, 'url', e.target.value)} placeholder="https://…" aria-label="Resource link" />
                  <button type="button" aria-label="Remove resource" onClick={() => setM(i, 'resources', m.resources.filter((_, j) => j !== ri))}><i className="bi bi-x-lg" /></button>
                </div>
              ))}
              <div className="ap-actions">
                <button type="button" className="ph-btn" onClick={() => setM(i, 'resources', [...m.resources, { title: '', url: '' }])}><i className="bi bi-link-45deg" aria-hidden="true" /> Add resource</button>
                {form.milestones.length > 1 && <button type="button" className="ph-btn danger" onClick={() => setForm((f) => ({ ...f, milestones: f.milestones.filter((_, j) => j !== i) }))}>Remove milestone</button>}
              </div>
            </div>
          ))}
          <button type="button" className="ph-btn" onClick={() => setForm((f) => ({ ...f, milestones: [...f.milestones, { title: '', description: '', tasks: '', resources: [] }] }))}><i className="bi bi-plus" aria-hidden="true" /> Add milestone</button>

          <div className="ap-actions">
            <button type="submit" className="btn btn-gold">Save</button>
            {editingId && <button type="button" className="ph-btn danger" onClick={remove}>Delete</button>}
            <button type="button" className="ph-btn" onClick={() => setForm(null)}>Close</button>
          </div>
        </form>
      )}

      <div className="ap-list">
        {items?.map((g) => (
          <div key={g.id} className="ge-row">
            <div>
              <strong>{g.title}</strong>
              <span className="ph-muted"> · {g.level} · {g.milestones.length} milestones · {g.started} started{g.status === 'draft' ? ' · Draft' : ''}</span>
            </div>
            <div className="ap-actions">
              <Link to={`/projects/guided/${g.slug}`} className="ph-btn">Open</Link>
              <button type="button" className="ph-btn" onClick={() => { setForm(toForm(g)); setEditingId(g.id); setMsg(''); window.scrollTo({ top: 0, behavior: 'smooth' }); }}><i className="bi bi-pencil" aria-hidden="true" /> Edit</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

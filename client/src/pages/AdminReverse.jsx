import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import { apiRequest } from '../lib/api';
import { formatDate } from '../lib/time';
import '../css/Reverse.css';

const EMPTY = {
  slug: '',
  title: '',
  format: 'io',
  level: 'Beginner',
  topic: '',
  tags: '',
  points: 15,
  estMinutes: 10,
  languages: ['python'],
  statement: '',
  inputFormat: '',
  outputFormat: '',
  constraints: '',
  examples: [{ input: '', output: '', explanation: '' }],
  tests: [{ input: '', output: '', hidden: false }, { input: '', output: '', hidden: true }],
  hints: [''],
  editorial: '',
  starterPython: '',
  referenceLanguage: 'python',
  referenceCode: '',
  outputPolicy: 'trim',
  timeLimit: 2,
  memoryLimitKb: 128000,
  featured: false,
};

function toForm(c) {
  return {
    ...EMPTY,
    ...c,
    tags: (c.tags || []).join(', '),
    hints: c.hints?.length ? c.hints : [''],
    examples: c.examples?.length ? c.examples : EMPTY.examples,
    starterPython: c.starterCode?.python || '',
    referenceLanguage: c.referenceSolution?.language || 'python',
    referenceCode: c.referenceSolution?.code || '',
  };
}

function toPayload(f) {
  return {
    slug: f.slug,
    title: f.title,
    format: f.format,
    level: f.level,
    topic: f.topic,
    tags: f.tags.split(',').map((t) => t.trim()).filter(Boolean),
    points: Number(f.points),
    estMinutes: Number(f.estMinutes),
    languages: f.languages,
    statement: f.statement,
    inputFormat: f.inputFormat,
    outputFormat: f.outputFormat,
    constraints: f.constraints,
    examples: f.examples.filter((e) => e.output !== ''),
    tests: f.tests,
    hints: f.hints.filter(Boolean),
    editorial: f.editorial,
    starterCode: f.starterPython ? { python: f.starterPython } : {},
    referenceSolution: { language: f.referenceLanguage, code: f.referenceCode },
    outputPolicy: f.outputPolicy,
    timeLimit: Number(f.timeLimit),
    memoryLimitKb: Number(f.memoryLimitKb),
    featured: f.featured,
  };
}

function RowsEditor({ rows, onChange, fields, addLabel, min = 1 }) {
  const set = (i, key, value) => onChange(rows.map((r, j) => (j === i ? { ...r, [key]: value } : r)));
  return (
    <div className="rc-rows">
      {rows.map((row, i) => (
        <div key={i} className="rc-row">
          <span className="rc-row-num">{i + 1}</span>
          {fields.map((f) => (f.type === 'checkbox' ? (
            <label key={f.key} className="rc-check">
              <input type="checkbox" checked={Boolean(row[f.key])} onChange={(e) => set(i, f.key, e.target.checked)} /> {f.label}
            </label>
          ) : (
            <label key={f.key}>
              <span>{f.label}</span>
              <textarea rows={f.rows || 2} value={row[f.key] ?? ''} onChange={(e) => set(i, f.key, e.target.value)} spellCheck={false} />
            </label>
          )))}
          <button type="button" className="rc-ghost" disabled={rows.length <= min} onClick={() => onChange(rows.filter((_, j) => j !== i))} aria-label="Remove row">
            <i className="bi bi-trash" aria-hidden="true" />
          </button>
        </div>
      ))}
      <button type="button" className="rc-ghost" onClick={() => onChange([...rows, Object.fromEntries(fields.map((f) => [f.key, f.type === 'checkbox' ? true : '']))])}>
        <i className="bi bi-plus" aria-hidden="true" /> {addLabel}
      </button>
    </div>
  );
}

export default function AdminReverse() {
  const [data, setData] = useState(null);
  const [form, setForm] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [message, setMessage] = useState('');
  const [validation, setValidation] = useState(null);
  const [publishAt, setPublishAt] = useState('');
  const [version, setVersion] = useState(0);

  const reload = useCallback(() => setVersion((v) => v + 1), []);

  useEffect(() => {
    let cancelled = false;
    apiRequest('/reverse/admin/all').then((r) => !cancelled && setData(r)).catch((e) => !cancelled && setMessage(e.message));
    return () => {
      cancelled = true;
    };
  }, [version]);

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }));

  const open = (c) => {
    setForm(c ? toForm(c) : { ...EMPTY });
    setEditingId(c?.id || null);
    setValidation(null);
    setMessage('');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const save = async () => {
    setMessage('');
    try {
      if (editingId) {
        const r = await apiRequest(`/reverse/admin/${editingId}`, { method: 'PUT', body: JSON.stringify(toPayload(form)) });
        setMessage(r.needsValidation ? 'Saved. Tests or limits changed, so validate again before publishing.' : 'Saved.');
      } else {
        const r = await apiRequest('/reverse/admin', { method: 'POST', body: JSON.stringify(toPayload(form)) });
        setEditingId(r.id);
        setMessage('Draft created. Validate the reference solution next.');
      }
      reload();
    } catch (e) {
      setMessage(e.message);
    }
  };

  const run = async (path, body, success) => {
    setMessage('');
    try {
      const r = await apiRequest(`/reverse/admin/${editingId}/${path}`, { method: 'POST', body: JSON.stringify(body || {}) });
      if (path === 'validate') setValidation(r);
      setMessage(success || r.note || 'Done.');
      reload();
    } catch (e) {
      setMessage(e.message);
    }
  };

  const current = data?.challenges.find((c) => c.id === editingId);

  return (
    <>
      <Navbar />
      <main className="rc-page">
        <div className="container">
          <Link to="/admin" className="rc-back"><i className="bi bi-arrow-left" aria-hidden="true" /> Admin dashboard</Link>
          <div className="rc-admin-head">
            <h1><i className="bi bi-arrow-repeat" aria-hidden="true" /> Reverse Coding authoring</h1>
            {!form && <button type="button" className="btn btn-gold" onClick={() => open(null)}><i className="bi bi-plus-lg" aria-hidden="true" /> New challenge</button>}
          </div>

          {data && !data.judgeReady && (
            <p className="rc-notice"><i className="bi bi-info-circle" aria-hidden="true" /> Code running is turned off (CODE_RUNNER=off), so challenges can&apos;t be validated or published from here.</p>
          )}
          {data?.judgeReady && (
            <p className="rc-runner">
              <i className="bi bi-cpu" aria-hidden="true" /> Code runner:{' '}
              <strong>{data.runner === 'judge0' ? 'Judge0' : 'Wandbox (free, public)'}</strong>
              {data.runner === 'wandbox' && <span> · set JUDGE0_URL or JUDGE0_API_KEY to switch to Judge0</span>}
            </p>
          )}
          {message && <p className="rc-notice" role="status">{message}</p>}

          {form && (
            <section className="rc-admin-form">
              <div className="rc-admin-form-head">
                <h2>{editingId ? `Edit: ${form.title || 'challenge'}` : 'New challenge'}</h2>
                {current && (
                  <span className={`rc-pill ${current.status === 'published' ? 'level-beginner' : ''}`}>
                    {current.status}{current.validatedAt ? ' · validated' : ' · not validated'}
                  </span>
                )}
              </div>

              <div className="rc-admin-grid">
                <label><span>Title</span><input value={form.title} onChange={set('title')} maxLength={120} /></label>
                <label><span>URL slug</span><input value={form.slug} onChange={set('slug')} placeholder="sum-of-two" /></label>
                <label>
                  <span>Format</span>
                  <select value={form.format} onChange={set('format')}>
                    {data && Object.entries(data.formats).map(([id, label]) => <option key={id} value={id}>{label}</option>)}
                  </select>
                </label>
                <label>
                  <span>Level</span>
                  <select value={form.level} onChange={set('level')}>{data?.levels.map((l) => <option key={l}>{l}</option>)}</select>
                </label>
                <label><span>Topic</span><input value={form.topic} onChange={set('topic')} placeholder="Strings" /></label>
                <label><span>Tags (comma separated)</span><input value={form.tags} onChange={set('tags')} /></label>
                <label><span>Points</span><input type="number" min={5} max={200} value={form.points} onChange={set('points')} /></label>
                <label><span>Estimated minutes</span><input type="number" min={1} value={form.estMinutes} onChange={set('estMinutes')} /></label>
                <label>
                  <span>Output comparison</span>
                  <select value={form.outputPolicy} onChange={set('outputPolicy')}>
                    <option value="trim">Trim (ignore trailing spaces; leading spaces matter)</option>
                    <option value="exact">Exact</option>
                    <option value="tokens">Tokens (any whitespace)</option>
                  </select>
                </label>
                <label><span>Time limit (s)</span><input type="number" min={1} max={10} value={form.timeLimit} onChange={set('timeLimit')} /></label>
                <label><span>Memory limit (KB)</span><input type="number" min={16000} max={512000} value={form.memoryLimitKb} onChange={set('memoryLimitKb')} /></label>
                <label className="rc-check"><input type="checkbox" checked={form.featured} onChange={set('featured')} /> Challenge of the week</label>
              </div>

              <fieldset className="rc-langs">
                <legend>Accepted languages</legend>
                {data?.languages.map((l) => (
                  <label key={l} className="rc-check">
                    <input
                      type="checkbox"
                      checked={form.languages.includes(l)}
                      onChange={(e) => setForm((f) => ({ ...f, languages: e.target.checked ? [...f.languages, l] : f.languages.filter((x) => x !== l) }))}
                    /> {l}
                  </label>
                ))}
              </fieldset>

              <label><span>Statement (what the student sees)</span><textarea rows={4} value={form.statement} onChange={set('statement')} /></label>
              <div className="rc-admin-grid">
                <label><span>Input format</span><textarea rows={2} value={form.inputFormat} onChange={set('inputFormat')} /></label>
                <label><span>Output format</span><textarea rows={2} value={form.outputFormat} onChange={set('outputFormat')} /></label>
                <label><span>Constraints</span><textarea rows={2} value={form.constraints} onChange={set('constraints')} /></label>
              </div>

              <h3>Examples (shown in the statement)</h3>
              <RowsEditor rows={form.examples} onChange={(examples) => setForm((f) => ({ ...f, examples }))} addLabel="Add example" min={1}
                fields={[{ key: 'input', label: 'Input' }, { key: 'output', label: 'Output' }, { key: 'explanation', label: 'Explanation' }]} />

              <h3>Test cases <small>(at least one public sample and one hidden test)</small></h3>
              <RowsEditor rows={form.tests} onChange={(tests) => setForm((f) => ({ ...f, tests }))} addLabel="Add test" min={2}
                fields={[{ key: 'input', label: 'Input', rows: 3 }, { key: 'output', label: 'Expected output', rows: 3 }, { key: 'hidden', label: 'Hidden', type: 'checkbox' }]} />

              <h3>Hints (revealed one at a time)</h3>
              <RowsEditor rows={form.hints.map((h) => ({ text: h }))} onChange={(rows) => setForm((f) => ({ ...f, hints: rows.map((r) => r.text) }))} addLabel="Add hint" min={1}
                fields={[{ key: 'text', label: 'Hint' }]} />

              <div className="rc-admin-grid">
                <label><span>Starter code (Python, optional; required for bug-to-behaviour)</span><textarea className="rc-mono" rows={6} value={form.starterPython} onChange={set('starterPython')} spellCheck={false} /></label>
                <label>
                  <span>Reference solution ({form.referenceLanguage}, never shown to students)</span>
                  <textarea className="rc-mono" rows={6} value={form.referenceCode} onChange={set('referenceCode')} spellCheck={false} />
                </label>
              </div>
              <label><span>Editorial (unlocks after solving)</span><textarea rows={4} value={form.editorial} onChange={set('editorial')} /></label>

              <div className="rc-admin-actions">
                <button type="button" className="rc-ghost" onClick={() => { setForm(null); setEditingId(null); }}>Close</button>
                <button type="button" className="btn btn-gold" onClick={save}>{editingId ? 'Save changes' : 'Create draft'}</button>
                {editingId && (
                  <>
                    <button type="button" className="rc-run" onClick={() => run('validate')} disabled={!data?.judgeReady}><i className="bi bi-patch-check" aria-hidden="true" /> Validate</button>
                    <input type="datetime-local" value={publishAt} onChange={(e) => setPublishAt(e.target.value)} aria-label="Publish at (optional)" />
                    <button type="button" className="rc-submit" onClick={() => run('publish', publishAt ? { publishAt: new Date(publishAt).toISOString() } : {}, publishAt ? 'Scheduled.' : 'Published.')} disabled={!current?.validatedAt}>
                      <i className="bi bi-broadcast" aria-hidden="true" /> {publishAt ? 'Schedule' : 'Publish now'}
                    </button>
                    {current?.status === 'published' && <button type="button" className="rc-ghost" onClick={() => run('retire', null, 'Retired.')}>Retire</button>}
                  </>
                )}
              </div>
              {current?.validationNote && <p className="rc-muted">{current.validationNote}</p>}
              {validation && (
                <ol className="rc-tests">
                  {validation.results.map((t) => (
                    <li key={t.index} className={`status-${t.status}`}>
                      <div className="rc-test-head"><strong>Test {t.index}</strong><span>{t.status}</span></div>
                      {t.status !== 'passed' && t.actual !== undefined && <pre className="rc-error-output">{t.error || `Got:\n${t.actual}`}</pre>}
                    </li>
                  ))}
                </ol>
              )}
            </section>
          )}

          <div className="rc-admin-list">
            {!data && <p className="rc-muted">Loading…</p>}
            {data?.challenges.map((c) => (
              <article key={c.id} className="rc-admin-item">
                <div>
                  <strong>{c.title}</strong>
                  <span className="rc-muted"> /{c.slug} · {c.level} · {c.points} pts · {c.tests.length} tests ({c.tests.filter((t) => t.hidden).length} hidden)</span>
                </div>
                <div className="rc-admin-item-meta">
                  <span className={`rc-pill ${c.status === 'published' ? 'level-beginner' : c.status === 'retired' ? 'level-advanced' : ''}`}>{c.status}</span>
                  {c.publishedAt && new Date(c.publishedAt) > new Date() && <span className="rc-pill">scheduled {formatDate(c.publishedAt)}</span>}
                  <span className="rc-muted">{c.validatedAt ? '✔ validated' : '✘ not validated'}</span>
                  <span className="rc-muted">{c.stats.accepted}/{c.stats.attempts} accepted</span>
                  <button type="button" className="rc-ghost" onClick={() => open(c)}><i className="bi bi-pencil" aria-hidden="true" /> Edit</button>
                </div>
              </article>
            ))}
          </div>
        </div>
      </main>
    </>
  );
}

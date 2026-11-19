import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { CATEGORIES, GROUPS, PICKS, STAGES, RESOURCES } from '../data/studyResources';

// The CodeSphere Study Guide resource library: curated external links shown on
// Learn → Materials next to the written guides. Everything is client-side.

const LEVELS = ['beginner', 'intermediate', 'advanced'];
const KINDS = { video: 'Video', github: 'GitHub', web: 'Docs / Web' };
const KIND_ICONS = { video: 'bi-play-btn-fill', github: 'bi-github', web: 'bi-globe2' };
const SAVED_KEY = 'cs_library_saved';

const catById = Object.fromEntries(CATEGORIES.map((c) => [c.id, c]));
const resById = Object.fromEntries(RESOURCES.map((r) => [r.id, r]));
const hostOf = (url) => {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return '';
  }
};
const HOSTS = Object.fromEntries(RESOURCES.map((r) => [r.id, hostOf(r.url)]));
const HAYSTACK = Object.fromEntries(
  RESOURCES.map((r) => {
    const c = catById[r.cat];
    return [r.id, [r.title, r.desc, r.format, r.levelLabel, c.name, c.sub, HOSTS[r.id], r.lang || ''].join(' ').toLowerCase()];
  }),
);
const STATS = [
  [RESOURCES.length, 'resources'],
  [CATEGORIES.length, 'categories'],
  [new Set(RESOURCES.filter((r) => r.kind === 'video').map((r) => r.url)).size, 'video channels'],
  [STAGES.length, 'stage path'],
];
const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
const toWords = (q) => q.toLowerCase().split(/\s+/).filter(Boolean);
const reEscape = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

function Highlight({ text, words }) {
  if (!words.length) return text;
  const parts = String(text).split(new RegExp(`(${words.map(reEscape).join('|')})`, 'ig'));
  return parts.map((p, i) => (i % 2 ? <mark key={i}>{p}</mark> : p));
}

function loadSaved() {
  try {
    const v = JSON.parse(localStorage.getItem(SAVED_KEY));
    return Array.isArray(v) ? v.filter((id) => resById[id]) : [];
  } catch {
    return [];
  }
}

function ResourceCard({ r, words = [], note, saved, onToggleSave, showCategory }) {
  return (
    <article className="mat-card lib-card">
      <div className="mat-meta">
        {r.levels.map((l) => <span key={l} className={`mat-pill level-${l}`}>{cap(l)}</span>)}
        <span className="mat-pill"><i className={`bi ${KIND_ICONS[r.kind]}`} aria-hidden="true" />&nbsp;{KINDS[r.kind]}</span>
        {r.lang && <span className="mat-pill lib-lang"><Highlight text={r.lang} words={words} /></span>}
      </div>
      {showCategory && <span className="lib-cat">{catById[r.cat].name}</span>}
      <h3>
        <a href={r.url} target="_blank" rel="noopener noreferrer" className="mat-card-link">
          <Highlight text={r.title} words={words} />
          <span className="visually-hidden"> (opens in a new tab)</span>
        </a>
      </h3>
      <p><Highlight text={r.desc} words={words} /></p>
      {note && <p className="lib-note"><strong>Where it fits:</strong> {note}</p>}
      <div className="lib-foot">
        <span className="lib-host">
          <Highlight text={HOSTS[r.id]} words={words} /> · <Highlight text={r.format} words={words} /> · {r.cost}
        </span>
        <button
          type="button"
          className={`lib-save${saved ? ' active' : ''}`}
          aria-pressed={saved}
          aria-label={`Save ${r.title}`}
          title={saved ? 'Remove from saved' : 'Save for later'}
          onClick={() => onToggleSave(r.id)}
        >
          <i className={`bi ${saved ? 'bi-bookmark-fill' : 'bi-bookmark'}`} aria-hidden="true" />
        </button>
      </div>
    </article>
  );
}

export default function ResourceLibrary() {
  const [params, setParams] = useSearchParams();
  const [saved, setSaved] = useState(loadSaved);
  const view = params.get('lib') || 'browse';
  const urlQ = params.get('lq') || '';
  // Typing is kept locally and pushed to the URL after a pause, so fast typing never drops keys.
  const [q, setQ] = useState(urlQ);
  const [lastUrlQ, setLastUrlQ] = useState(urlQ);
  const [pushedQ, setPushedQ] = useState(urlQ);
  if (urlQ !== lastUrlQ) {
    setLastUrlQ(urlQ);
    // Adopt only changes made elsewhere (back button, Clear, Browse links), not our own push.
    if (urlQ !== pushedQ) setQ(urlQ);
  }
  const level = params.get('lvl') || '';
  const kind = params.get('fmt') || '';
  const cat = params.get('cat') || '';
  const words = useMemo(() => toWords(q), [q]);

  const update = (changes, replace = false) => {
    const next = new URLSearchParams(params);
    Object.entries(changes).forEach(([k, v]) => (v ? next.set(k, v) : next.delete(k)));
    setParams(next, { replace });
  };

  useEffect(() => {
    if (q === urlQ) return undefined;
    const timer = setTimeout(() => {
      setPushedQ(q);
      setParams((prev) => {
        const next = new URLSearchParams(prev);
        if (q) next.set('lq', q);
        else next.delete('lq');
        return next;
      }, { replace: true });
    }, 250);
    return () => clearTimeout(timer);
  }, [q, urlQ, setParams]);

  const toggleSave = (id) => {
    setSaved((prev) => {
      const next = prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id];
      try {
        localStorage.setItem(SAVED_KEY, JSON.stringify(next));
      } catch {
        /* storage unavailable: keep in memory only */
      }
      return next;
    });
  };

  const matches = (r) =>
    (!level || r.levels.includes(level)) &&
    (!kind || r.kind === kind) &&
    words.every((w) => HAYSTACK[r.id].includes(w));

  const filtered = useMemo(
    () => RESOURCES.filter((r) => (!cat || r.cat === cat) && matches(r)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [cat, level, kind, words],
  );
  const filtering = Boolean(q || level || kind || cat);

  const cardProps = (r) => ({ r, words, saved: saved.includes(r.id), onToggleSave: toggleSave });
  const tabs = [
    ['browse', 'Browse library', 'bi-collection'],
    ['path', 'Learning path', 'bi-signpost-split'],
    ['picks', 'CodeSphere picks', 'bi-star'],
    ['saved', `Saved (${saved.length})`, 'bi-bookmark'],
  ];

  return (
    <section aria-labelledby="lib-title">
      <header className="mat-hero">
        <h1 id="lib-title">Study Guide <span className="gold-text">Resource Library</span></h1>
        <p>A curated library for the CodeSphere community of AGEMC. Pick one path, finish the exercises, build something small, then go deeper.</p>
        <ul className="lib-stats">
          {STATS.map(([n, label]) => <li key={label}><strong>{n}</strong> {label}</li>)}
        </ul>
      </header>
      <p className="mat-note lib-howto">
        <strong>How to use:</strong> start with one learning path, not ten tabs. Some platforms have optional paid plans, certificates, usage limits or account requirements. Links go to the original creators.
      </p>

      <div className="mat-chips lib-tabs" role="tablist" aria-label="Library sections">
        {tabs.map(([id, label, icon]) => (
          <button key={id} type="button" role="tab" aria-selected={view === id} className={view === id ? 'active' : ''} onClick={() => update({ lib: id === 'browse' ? '' : id })}>
            <i className={`bi ${icon}`} aria-hidden="true" /> {label}
          </button>
        ))}
      </div>

      {view === 'browse' && (
        <>
          <div className="lib-filters" role="group" aria-label="Filter resources">
            <div className="mat-search lib-search" role="search">
              <i className="bi bi-search" aria-hidden="true" />
              <input
                type="search"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder={`Search ${RESOURCES.length} resources (python, DSA, docker, hindi…)`}
                aria-label="Search resources"
                maxLength={80}
              />
            </div>
            <select value={cat} onChange={(e) => update({ cat: e.target.value })} aria-label="Category">
              <option value="">All categories</option>
              {GROUPS.map((g) => (
                <optgroup key={g.id} label={g.name}>
                  {g.catIds.map((id) => <option key={id} value={id}>{id} · {catById[id].name}</option>)}
                </optgroup>
              ))}
            </select>
            <select value={level} onChange={(e) => update({ lvl: e.target.value })} aria-label="Level">
              <option value="">All levels</option>
              {LEVELS.map((l) => <option key={l} value={l}>{cap(l)}</option>)}
            </select>
            <select value={kind} onChange={(e) => update({ fmt: e.target.value })} aria-label="Format">
              <option value="">All formats</option>
              {Object.entries(KINDS).map(([k, label]) => <option key={k} value={k}>{label}</option>)}
            </select>
            {filtering && (
              <button type="button" className="mat-btn" onClick={() => update({ lq: '', lvl: '', fmt: '', cat: '' })}>
                <i className="bi bi-x-lg" aria-hidden="true" /> Clear
              </button>
            )}
          </div>
          <p className="lib-count" aria-live="polite">
            {filtering ? `${filtered.length} of ${RESOURCES.length} resources match.` : `${RESOURCES.length} resources across ${CATEGORIES.length} categories, grouped by theme.`}
          </p>

          {filtered.length === 0 ? (
            <div className="mat-empty">
              <span aria-hidden="true">🔎</span>
              <h2>No resources match</h2>
              <p>Try a different word or clear the filters.</p>
            </div>
          ) : (
            GROUPS.map((g) => {
              const sections = g.catIds
                .map((id) => ({ c: catById[id], list: filtered.filter((r) => r.cat === id) }))
                .filter((s) => s.list.length);
              if (!sections.length) return null;
              return (
                <div key={g.id} className="lib-group">
                  <h2 className="lib-group-title">{g.name}</h2>
                  {sections.map(({ c, list }) => (
                    <section key={c.id} className="lib-section" aria-labelledby={`lib-cat-${c.id}`}>
                      <div className="lib-section-head">
                        <span className="lib-num" aria-hidden="true">{c.id}</span>
                        <div>
                          <h3 id={`lib-cat-${c.id}`}>{c.name}</h3>
                          <span>{c.sub}</span>
                        </div>
                        <span className="mat-pill">{list.length}{filtering ? ` / ${RESOURCES.filter((r) => r.cat === c.id).length}` : ''}</span>
                      </div>
                      {c.note && <p className="mat-note lib-study-note"><strong>Study note:</strong> {c.note}</p>}
                      <div className="mat-grid">
                        {list.map((r) => <ResourceCard key={r.id} {...cardProps(r)} />)}
                      </div>
                    </section>
                  ))}
                </div>
              );
            })
          )}
        </>
      )}

      {view === 'path' && (
        <>
          <p className="lib-count">Seven stages. Every path should end with a deliverable: a program, project, solved problem set, pull request, or a short recorded explanation.</p>
          <ol className="lib-path">
            {STAGES.map((s) => (
              <li key={s.n} className="mat-card lib-stage">
                <span className="lib-stage-badge">{s.n}<small>{s.w}</small></span>
                <div>
                  <h3>{s.t}</h3>
                  <p>{s.d}</p>
                  <div className="lib-stage-links">
                    <span>Try</span>
                    {s.res.map((id) => resById[id]).map((r) => (
                      <a key={r.id} href={r.url} target="_blank" rel="noopener noreferrer">
                        {r.title}<span className="visually-hidden"> (opens in a new tab)</span> <i className="bi bi-box-arrow-up-right" aria-hidden="true" />
                      </a>
                    ))}
                  </div>
                  <div className="lib-stage-links">
                    <span>Browse</span>
                    {s.browse.map((id) => (
                      <button key={id} type="button" onClick={() => update({ lib: '', cat: id, lq: '', lvl: '', fmt: '' })}>
                        {catById[id].name} <i className="bi bi-arrow-right" aria-hidden="true" />
                      </button>
                    ))}
                  </div>
                </div>
              </li>
            ))}
          </ol>
        </>
      )}

      {view === 'picks' && (
        <>
          <p className="lib-count">Club-requested picks and where they fit best.</p>
          <div className="mat-grid">
            {PICKS.map((p) => <ResourceCard key={p.id} {...cardProps(resById[p.id])} note={p.note} showCategory />)}
          </div>
        </>
      )}

      {view === 'saved' && (
        saved.length ? (
          <>
            <p className="lib-count">Saved on this device.</p>
            <div className="mat-grid">
              {saved.map((id) => <ResourceCard key={id} {...cardProps(resById[id])} showCategory />)}
            </div>
          </>
        ) : (
          <div className="mat-empty">
            <span aria-hidden="true">🔖</span>
            <h2>Nothing saved yet</h2>
            <p>Use the bookmark button on any resource to keep it here.</p>
          </div>
        )
      )}
    </section>
  );
}

import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import CodeEditor from '../components/CodeEditor';
import SafeText from '../components/SafeText';
import { LevelPill } from './ReverseCoding';
import { useAuth } from '../context/AuthContext';
import { apiRequest } from '../lib/api';
import { celebrateBadges } from '../lib/badges';
import { LANGUAGES, STARTERS } from '../data/playground';
import { timeAgo } from '../lib/time';
import '../css/Reverse.css';

const LANG_LABEL = Object.fromEntries(LANGUAGES.map((l) => [l.id, l.label]));

const VERDICTS = {
  accepted: { label: 'Accepted', icon: 'bi-check-circle-fill', tone: 'ok', text: 'Every test passed. Great work!' },
  wrong: { label: 'Wrong answer', icon: 'bi-x-circle-fill', tone: 'bad', text: 'Your program ran, but some output didn\'t match. Compare the expected and actual output below.' },
  'compile-error': { label: 'Compile error', icon: 'bi-exclamation-octagon-fill', tone: 'bad', text: 'Your code couldn\'t be compiled. Check the error message.' },
  'runtime-error': { label: 'Runtime error', icon: 'bi-bug-fill', tone: 'bad', text: 'Your program crashed while running.' },
  timeout: { label: 'Time limit exceeded', icon: 'bi-hourglass-split', tone: 'warn', text: 'Your program took too long. Look for an infinite loop or a slow approach.' },
  'system-error': { label: 'System error', icon: 'bi-cloud-slash', tone: 'warn', text: 'The code runner had a problem. Your code isn\'t necessarily wrong; try again.' },
};

const TEST_STATUS = {
  passed: { icon: 'bi-check-circle-fill', label: 'Passed' },
  wrong: { icon: 'bi-x-circle-fill', label: 'Wrong answer' },
  'compile-error': { icon: 'bi-exclamation-octagon-fill', label: 'Compile error' },
  'runtime-error': { icon: 'bi-bug-fill', label: 'Runtime error' },
  timeout: { icon: 'bi-hourglass-split', label: 'Too slow' },
  'system-error': { icon: 'bi-cloud-slash', label: 'System error' },
  skipped: { icon: 'bi-dash-circle', label: 'Not run' },
};

function Block({ label, value }) {
  return (
    <div className="rc-io">
      <span>{label}</span>
      <pre>{value === '' ? <em>(no input)</em> : value}</pre>
    </div>
  );
}

function Results({ result, kind }) {
  const verdict = VERDICTS[result.verdict] || VERDICTS['system-error'];
  const firstError = result.results.find((r) => r.error)?.error;
  return (
    <div className={`rc-result tone-${verdict.tone}`} role="status">
      <div className="rc-result-head">
        <i className={`bi ${verdict.icon}`} aria-hidden="true" />
        <div>
          <strong>{kind === 'run' ? 'Sample run: ' : ''}{verdict.label}</strong>
          <span>{result.passed}/{result.total} tests passed{result.runtimeMs ? ` · ${result.runtimeMs} ms` : ''}</span>
        </div>
        {kind === 'submit' && <span className="rc-score">{result.score} pts</span>}
      </div>
      <p>{verdict.text}</p>
      {kind === 'submit' && result.verdict !== 'accepted' && result.score > 0 && (
        <p className="rc-muted">Partial credit: {result.score} points for the tests you passed. Your best score counts.</p>
      )}
      {kind === 'submit' && result.xpGained > 0 && <p className="rc-xp">+{result.xpGained} XP {result.firstSolve ? '· first solve! 🎉' : ''}</p>}
      {firstError && <pre className="rc-error-output">{firstError}</pre>}

      <ol className="rc-tests">
        {result.results.map((t) => {
          const s = TEST_STATUS[t.status] || TEST_STATUS['system-error'];
          return (
            <li key={t.index} className={`status-${t.status}`}>
              <div className="rc-test-head">
                <i className={`bi ${s.icon}`} aria-hidden="true" />
                <strong>{t.hidden ? `Hidden test ${t.index}` : `Sample test ${t.index}`}</strong>
                <span>{s.label}</span>
              </div>
              {!t.hidden && t.status === 'wrong' && (
                <div className="rc-diff">
                  <Block label="Input" value={t.input} />
                  <Block label="Expected" value={t.expected} />
                  <Block label="Your output" value={t.actual} />
                </div>
              )}
            </li>
          );
        })}
      </ol>
      {result.results.some((t) => t.hidden) && <p className="rc-muted">Hidden tests check other inputs. Their details stay hidden so the challenge stays fair.</p>}
    </div>
  );
}

export default function ReverseChallenge() {
  const { slug } = useParams();
  const { user, token } = useAuth();
  const isLoggedIn = Boolean(user && token);
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [language, setLanguage] = useState('');
  const [code, setCode] = useState('');
  const [hintsShown, setHintsShown] = useState(0);
  const [busy, setBusy] = useState('');
  const [result, setResult] = useState(null);
  const [panel, setPanel] = useState('results');
  const [notice, setNotice] = useState('');
  const [editorial, setEditorial] = useState(null);

  const storageKey = (lang) => `codesphere_rc_${slug}_${lang}`;
  const starterFor = (challenge, lang) => challenge.starterCode?.[lang] || STARTERS[lang] || '';

  const load = () => apiRequest(`/reverse/${slug}`);

  useEffect(() => {
    let cancelled = false;
    load()
      .then((r) => {
        if (cancelled) return;
        setData(r);
        setEditorial(r.challenge.editorial);
        const lang = r.challenge.languages[0];
        setLanguage(lang);
        setCode(localStorage.getItem(storageKey(lang)) ?? starterFor(r.challenge, lang));
      })
      .catch((e) => !cancelled && setError(e.message));
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug]);

  const changeCode = (value) => {
    setCode(value);
    localStorage.setItem(storageKey(language), value);
  };

  const changeLanguage = (lang) => {
    setLanguage(lang);
    setCode(localStorage.getItem(storageKey(lang)) ?? starterFor(data.challenge, lang));
  };

  const reset = () => {
    if (!window.confirm('Reset the editor to the starter code? Your current code will be lost.')) return;
    localStorage.removeItem(storageKey(language));
    setCode(starterFor(data.challenge, language));
  };

  const send = async (kind) => {
    setBusy(kind);
    setNotice('');
    try {
      const r = await apiRequest(`/reverse/${slug}/${kind}`, { method: 'POST', body: JSON.stringify({ language, code }) });
      setResult({ ...r, kind });
      setPanel('results');
      if (kind === 'submit') {
        if (r.editorial) setEditorial(r.editorial);
        celebrateBadges(r.newBadges);
        load().then((fresh) => setData((d) => ({ ...d, challenge: { ...fresh.challenge, editorial: fresh.challenge.editorial || r.editorial }, history: fresh.history }))).catch(() => {});
      }
    } catch (e) {
      setNotice(e.message);
    } finally {
      setBusy('');
    }
  };

  const toggleBookmark = async () => {
    try {
      const r = await apiRequest(`/reverse/${slug}/bookmark`, { method: 'POST' });
      setData((d) => ({ ...d, challenge: { ...d.challenge, bookmarked: r.bookmarked } }));
    } catch (e) {
      setNotice(e.message);
    }
  };

  if (error) {
    return (
      <>
        <Navbar />
        <main className="rc-page"><div className="container rc-empty"><span aria-hidden="true">🔍</span><h1>{error}</h1><Link to="/reverse-coding" className="btn btn-gold">All challenges</Link></div></main>
        <Footer />
      </>
    );
  }

  if (!data) {
    return (
      <>
        <Navbar />
        <main className="rc-page"><div className="container"><div className="rc-card rc-skeleton" style={{ height: 400 }} /></div></main>
        <Footer />
      </>
    );
  }

  const c = data.challenge;
  const canRun = isLoggedIn && data.judgeReady;

  return (
    <>
      <Navbar />
      <main className="rc-page">
        <div className="container">
          <Link to="/reverse-coding" className="rc-back"><i className="bi bi-arrow-left" aria-hidden="true" /> All challenges</Link>

          <header className="rc-detail-head">
            <div>
              <h1>{c.title}</h1>
              <div className="rc-card-meta">
                <LevelPill level={c.level} />
                <span className="rc-pill">{c.formatLabel}</span>
                <span><i className="bi bi-star-fill" aria-hidden="true" /> {c.points} pts</span>
                <span><i className="bi bi-clock" aria-hidden="true" /> ~{c.estMinutes} min</span>
                <span><i className="bi bi-tag" aria-hidden="true" /> {c.topic}</span>
                <span><i className="bi bi-code-slash" aria-hidden="true" /> {c.languages.map((l) => LANG_LABEL[l] || l).join(', ')}</span>
                {c.solved && <span className="rc-status solved"><i className="bi bi-check-circle-fill" aria-hidden="true" /> Solved</span>}
              </div>
            </div>
            {isLoggedIn && (
              <button type="button" className={`rc-ghost ${c.bookmarked ? 'is-on' : ''}`} onClick={toggleBookmark}>
                <i className={`bi ${c.bookmarked ? 'bi-bookmark-fill' : 'bi-bookmark'}`} aria-hidden="true" /> {c.bookmarked ? 'Bookmarked' : 'Bookmark'}
              </button>
            )}
          </header>

          {!data.judgeReady && (
            <p className="rc-notice" role="status">
              <i className="bi bi-info-circle" aria-hidden="true" /> Run and Submit are turned off until the code runner (Judge0) is connected. You can still read the challenge and draft your solution; it saves in this browser.
            </p>
          )}

          <div className="rc-workspace">
            <section className="rc-problem" aria-label="Problem">
              <SafeText text={c.statement} />
              {c.inputFormat && <><h2>Input</h2><p>{c.inputFormat}</p></>}
              {c.outputFormat && <><h2>Output</h2><p>{c.outputFormat}</p></>}
              {c.constraints && <><h2>Constraints</h2><p>{c.constraints}</p></>}

              <h2>Examples</h2>
              {c.examples.map((ex, i) => (
                <div key={i} className="rc-example">
                  <div className="rc-example-io">
                    <Block label="Input" value={ex.input} />
                    <Block label="Output" value={ex.output} />
                  </div>
                  {ex.explanation && <p className="rc-muted">{ex.explanation}</p>}
                </div>
              ))}
              <p className="rc-muted">
                <i className="bi bi-eye-slash" aria-hidden="true" /> {c.publicTests.length} sample test{c.publicTests.length === 1 ? '' : 's'} for Run, plus {c.hiddenTestCount} hidden test{c.hiddenTestCount === 1 ? '' : 's'} on Submit.
                {c.outputPolicy === 'trim' && ' Trailing spaces are ignored; leading spaces matter.'}
                {c.outputPolicy === 'exact' && ' Output must match exactly.'}
                {c.outputPolicy === 'tokens' && ' Extra spaces and line breaks are ignored.'}
              </p>

              {c.hints.length > 0 && (
                <div className="rc-hints">
                  <h2><i className="bi bi-lightbulb" aria-hidden="true" /> Hints</h2>
                  {c.hints.slice(0, hintsShown).map((h, i) => <p key={i} className="rc-hint"><strong>Hint {i + 1}:</strong> {h}</p>)}
                  {hintsShown < c.hints.length && (
                    <button type="button" className="rc-ghost" onClick={() => setHintsShown((n) => n + 1)}>
                      Show hint {hintsShown + 1} of {c.hints.length}
                    </button>
                  )}
                  <p className="rc-muted">Hints never reduce your score.</p>
                </div>
              )}
            </section>

            <section className="rc-editor-panel" aria-label="Your solution">
              <div className="rc-editor-bar">
                <select value={language} onChange={(e) => changeLanguage(e.target.value)} aria-label="Language">
                  {c.languages.map((l) => <option key={l} value={l}>{LANG_LABEL[l] || l}</option>)}
                </select>
                <button type="button" className="rc-ghost" onClick={reset}><i className="bi bi-arrow-counterclockwise" aria-hidden="true" /> Reset</button>
                <span className="rc-spacer" />
                {isLoggedIn ? (
                  <>
                    <button type="button" className="rc-run" onClick={() => send('run')} disabled={!canRun || Boolean(busy)}>
                      {busy === 'run' ? <span className="spinner-border spinner-border-sm" aria-hidden="true" /> : <i className="bi bi-play-fill" aria-hidden="true" />} Run samples
                    </button>
                    <button type="button" className="rc-submit" onClick={() => send('submit')} disabled={!canRun || Boolean(busy)}>
                      {busy === 'submit' ? <span className="spinner-border spinner-border-sm" aria-hidden="true" /> : <i className="bi bi-send-fill" aria-hidden="true" />} Submit
                    </button>
                  </>
                ) : (
                  <Link to="/login" className="rc-submit">Sign in to run</Link>
                )}
              </div>
              <CodeEditor value={code} onChange={changeCode} language={language} height={430} />
              <p className="rc-muted rc-editor-note">Read input with input() (Python) and print the answer. Your code autosaves in this browser.</p>
              {notice && <p className="rc-error" role="alert">{notice}</p>}
            </section>
          </div>

          <section className="rc-bottom">
            <div className="rc-tabs" role="tablist">
              <button type="button" role="tab" aria-selected={panel === 'results'} className={panel === 'results' ? 'active' : ''} onClick={() => setPanel('results')}>Results</button>
              {isLoggedIn && <button type="button" role="tab" aria-selected={panel === 'history'} className={panel === 'history' ? 'active' : ''} onClick={() => setPanel('history')}>My submissions ({data.history.length})</button>}
              <button type="button" role="tab" aria-selected={panel === 'editorial'} className={panel === 'editorial' ? 'active' : ''} onClick={() => setPanel('editorial')}>
                {editorial ? 'Editorial' : <><i className="bi bi-lock-fill" aria-hidden="true" /> Editorial</>}
              </button>
            </div>

            {panel === 'results' && (result
              ? <Results result={result} kind={result.kind} />
              : <p className="rc-muted">Run your code on the sample tests, then Submit to check it against the hidden tests.</p>)}

            {panel === 'history' && (
              data.history.length ? (
                <ul className="rc-history">
                  {data.history.map((h) => {
                    const v = VERDICTS[h.verdict] || VERDICTS['system-error'];
                    return (
                      <li key={h.id} className={`tone-${v.tone}`}>
                        <i className={`bi ${v.icon}`} aria-hidden="true" />
                        <strong>{v.label}</strong>
                        <span>{h.passed}/{h.total} · {h.score} pts · {LANG_LABEL[h.language] || h.language}</span>
                        <small>{timeAgo(h.createdAt)}</small>
                        <button type="button" className="rc-ghost" onClick={() => { changeLanguage(h.language); changeCode(h.code); }}>Load code</button>
                      </li>
                    );
                  })}
                </ul>
              ) : <p className="rc-muted">No submissions yet.</p>
            )}

            {panel === 'editorial' && (editorial
              ? <div className="rc-editorial"><SafeText text={editorial} /></div>
              : <p className="rc-muted"><i className="bi bi-lock-fill" aria-hidden="true" /> The editorial unlocks after you solve this challenge. Try the hints first!</p>)}
          </section>
        </div>
      </main>
      <Footer />
    </>
  );
}

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
// import { Link } from 'react-router-dom'; // Judge0 checker
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import DebugArena from '../components/DebugArena';
import { useAuth } from '../context/AuthContext';
import { apiRequest } from '../lib/api';
import { celebrateBadges } from '../lib/badges';
import { LANGUAGES, EXAMPLES, STARTERS, CHALLENGES, TIPS } from '../data/playground';
import '../css/Playground.css';

const EDITOR_ORIGIN = 'https://onecompiler.com';
const SAVE_KEY = (lang) => `codesphere_playground_${lang}`;
const SOLVED_KEY = 'codesphere_playground_solved';

function editorUrl(language, theme) {
  const params = new URLSearchParams({
    hideNew: 'true',
    hideNewFileOption: 'true',
    hideTitle: 'true',
    listenToEvents: 'true',
    codeChangeEvent: 'true',
    theme,
  });
  return `${EDITOR_ORIGIN}/embed/${language}?${params}`;
}

function commentPrefix(language) {
  if (language === 'python') return '#';
  if (language === 'mysql') return '--';
  return '//';
}

function challengeTemplate(challenge, language) {
  const c = commentPrefix(language);
  return (
    `${c} Challenge: ${challenge.title} (${challenge.level}, +${challenge.xp} XP)\n` +
    `${c} ${challenge.description}\n` +
    `${c} Expected output:\n` +
    challenge.example.split('\n').map((line) => `${c}   ${line}`).join('\n') +
    `\n\n${STARTERS[language] || ''}`
  );
}

// Judge0 answer checking: disabled until a RapidAPI key is set up.
// const FAIL_HEADLINES = {
  // 'compile-error': '❌ Your code didn\'t compile.',
  // 'runtime-error': '❌ Your code crashed while running.',
  // timeout: '⏱️ Your code took too long.',
  // 'service-error': '⚠️ The checker had a problem.',
  // 'request-error': '⚠️ Couldn\'t check your code.',
// };

// function resultHeadline(result) {
  // if (result.passed) {
    // return result.alreadySolved
      // ? '✅ Correct! You already solved this one.'
      // : `✅ Correct! +${result.xp} XP earned.`;
  // }
  // return FAIL_HEADLINES[result.status] || '❌ Not quite. The output doesn\'t match yet.';
// }

function loadSolved() {
  try {
    return JSON.parse(localStorage.getItem(SOLVED_KEY)) || [];
  } catch {
    return [];
  }
}

const Playground = () => {
  const [language, setLanguage] = useState(LANGUAGES[0]);
  const [activeExample, setActiveExample] = useState(0);
  const [theme, setTheme] = useState('dark');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [toast, setToast] = useState('');
  const [tipIndex, setTipIndex] = useState(0);
  const challenges = CHALLENGES;
  const [solved, setSolved] = useState(loadSolved);

  // Signed-in students' solved challenges live on their account (they count
  // on the leaderboard); guests keep them in this browser.
  const { user, token } = useAuth();
  const isLoggedIn = Boolean(user && token);
  const [openHint, setOpenHint] = useState(null);
  const [highlighted, setHighlighted] = useState(null);
  const [activeChallenge, setActiveChallenge] = useState(null);
  // Judge0 checker:
  // const [checking, setChecking] = useState(false);
  // const [checkResult, setCheckResult] = useState(null);

  const iframeRef = useRef(null);
  const workspaceRef = useRef(null);
  // Latest code in the editor, kept in a ref so typing doesn't re-render the page.
  const codeRef = useRef('');
  const toastTimer = useRef(null);

  const examples = EXAMPLES[language.id] || [];
  const totalXp = useMemo(() => challenges.reduce((sum, c) => sum + c.xp, 0), [challenges]);
  const earnedXp = useMemo(
    () => challenges.filter((c) => solved.includes(c.id)).reduce((s, c) => s + c.xp, 0),
    [challenges, solved],
  );

  const showToast = useCallback((message) => {
    setToast(message);
    window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToast(''), 2200);
  }, []);

  const sendToEditor = useCallback(
    (code) => {
      codeRef.current = code;
      iframeRef.current?.contentWindow?.postMessage(
        {
          eventType: 'populateCode',
          language: language.id,
          files: [{ name: language.file, content: code }],
        },
        EDITOR_ORIGIN,
      );
    },
    [language],
  );

  // When the editor (re)loads, restore the saved draft or the first example.
  const handleEditorLoad = () => {
    const code =
      codeRef.current ||
      (activeChallenge ? challengeTemplate(activeChallenge, language.id) : '') ||
      localStorage.getItem(SAVE_KEY(language.id)) ||
      examples[0]?.code ||
      '';
    // Give the embedded editor a moment to initialise before sending code.
    window.setTimeout(() => sendToEditor(code), 800);
  };

  // Track edits from the editor and autosave them per language.
  useEffect(() => {
    const handleMessage = (event) => {
      if (event.origin !== EDITOR_ORIGIN || !event.data?.files) return;
      const content = event.data.files[0]?.content;
      if (typeof content !== 'string') return;
      codeRef.current = content;
      localStorage.setItem(SAVE_KEY(language.id), content);
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [language]);

  // Support links like /playground#debugging-arena (after the page renders).
  const { hash } = useLocation();
  useEffect(() => {
    if (!hash) return undefined;
    const id = window.setTimeout(() => {
      document.getElementById(hash.slice(1))?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 150);
    return () => window.clearTimeout(id);
  }, [hash]);

  // Rotate the coding tips.
  useEffect(() => {
    const id = window.setInterval(
      () => setTipIndex((i) => (i + 1) % TIPS.length),
      6000,
    );
    return () => window.clearInterval(id);
  }, []);

  // Escape leaves fullscreen; lock page scroll while fullscreen.
  useEffect(() => {
    if (!isFullscreen) return;
    const onKey = (e) => e.key === 'Escape' && setIsFullscreen(false);
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener('keydown', onKey);
    };
  }, [isFullscreen]);

  // Judge0 answer checking: disabled until a RapidAPI key is set up.
  // // Challenges are public; solved status comes from the student's account.
  // useEffect(() => {
    // let cancelled = false;
    // apiRequest('/challenges')
      // .then((data) => !cancelled && setChallenges(data.challenges))
      // .catch(() => !cancelled && setChallenges([]));
    // return () => {
      // cancelled = true;
    // };
  // }, []);

  // useEffect(() => {
    // if (!isLoggedIn) return undefined;
    // let cancelled = false;
    // apiRequest('/challenges/progress')
      // .then((data) => !cancelled && setSolved(data.solved.map((item) => item.challengeId)))
      // .catch(() => {});
    // return () => {
      // cancelled = true;
    // };
  // }, [isLoggedIn]);

  useEffect(() => {
    if (!isLoggedIn) return undefined;
    let cancelled = false;
    apiRequest('/challenges/progress')
      .then((data) => !cancelled && setSolved(data.solved.map((item) => item.challengeId)))
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [isLoggedIn]);

  useEffect(() => {
    if (!isLoggedIn) localStorage.setItem(SOLVED_KEY, JSON.stringify(solved));
  }, [solved, isLoggedIn]);

  const switchLanguage = (next) => {
    if (next.id === language.id) return;
    codeRef.current = '';
    setActiveExample(0);
    setLanguage(next);
  };

  const loadExample = (index) => {
    setActiveExample(index);
    sendToEditor(examples[index].code);
    showToast(`Loaded "${examples[index].title}"`);
  };

  const runCode = () => {
    iframeRef.current?.contentWindow?.postMessage(
      { eventType: 'triggerRun' },
      EDITOR_ORIGIN,
    );
  };

  const resetCode = () => {
    localStorage.removeItem(SAVE_KEY(language.id));
    sendToEditor(examples[activeExample]?.code || '');
    showToast('Editor reset to the example');
  };

  const copyCode = async () => {
    try {
      await navigator.clipboard.writeText(codeRef.current);
      showToast('Code copied to clipboard');
    } catch {
      showToast('Could not copy. Select the code and press Ctrl+C.');
    }
  };

  const downloadCode = () => {
    const blob = new Blob([codeRef.current], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = language.file;
    link.click();
    URL.revokeObjectURL(url);
  };

  const toggleTheme = () => {
    // Changing the theme reloads the iframe; codeRef keeps the current code.
    setTheme((t) => (t === 'dark' ? 'light' : 'dark'));
  };

  const solveChallenge = (challenge) => {
    setActiveChallenge(challenge);
    // setCheckResult(null); // Judge0 checker
    sendToEditor(challengeTemplate(challenge, language.id));
    workspaceRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    showToast(`Challenge loaded in ${language.label}. Go!`);
  };

  // Judge0 answer checking: disabled until a RapidAPI key is set up.
  // const exitChallenge = () => {
    // setActiveChallenge(null);
    // setCheckResult(null);
  // };

  // // The server runs the code and marks the challenge solved only if the
  // // output is correct.
  // const checkAnswer = async () => {
    // if (!activeChallenge || checking) return;
    // setChecking(true);
    // setCheckResult(null);
    // try {
      // const result = await apiRequest(`/challenges/${activeChallenge.id}/check`, {
        // method: 'POST',
        // body: JSON.stringify({ language: language.id, code: codeRef.current }),
      // });
      // setCheckResult(result);
      // if (result.passed) {
        // setSolved((prev) => (prev.includes(activeChallenge.id) ? prev : [...prev, activeChallenge.id]));
        // showToast(result.alreadySolved ? 'Correct again! Already solved.' : `Solved! +${result.xp} XP 🎉`);
      // }
    // } catch (err) {
      // setCheckResult({ passed: false, status: 'request-error', error: err.message, output: '' });
    // } finally {
      // setChecking(false);
    // }
  // };

  const toggleSolved = async (id) => {
    if (!isLoggedIn) {
      setSolved((prev) =>
        prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
      );
      showToast('Sign in to save your XP to the leaderboard');
      return;
    }

    const isSolved = solved.includes(id);
    try {
      const data = await apiRequest(`/challenges/${id}/done`, {
        method: isSolved ? 'DELETE' : 'POST',
        body: JSON.stringify({ language: language.id }),
      });
      setSolved(data.solved.map((item) => item.challengeId));
      celebrateBadges(data.newBadges);
      if (!isSolved) {
        const xp = challenges.find((c) => c.id === id)?.xp;
        showToast(`Nice! +${xp} XP added to your account`);
      }
    } catch (err) {
      showToast(err.message);
    }
  };

  const surpriseMe = () => {
    if (!challenges.length) return;
    const pending = challenges.filter((c) => !solved.includes(c.id));
    const pool = pending.length ? pending : challenges;
    const pick = pool[Math.floor(Math.random() * pool.length)];
    setHighlighted(pick.id);
    document
      .getElementById(`challenge-${pick.id}`)
      ?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    window.setTimeout(() => setHighlighted(null), 2500);
  };

  return (
    <>
      <Navbar />

      <main className="playground-page">
        {/* Hero */}
        <section className="container playground-hero">
          <span className="section-eyebrow">
            <span className="section-eyebrow-line" />
            CODESPHERE PLAYGROUND
          </span>

          <h1 className="playground-title">
            Code anything. <span className="gold-text">Install nothing.</span>
          </h1>

          <p className="playground-subtitle">
            A full coding lab in your browser. Pick a language, load an example
            or take on a challenge, then hit Run. Works on any laptop, lab
            computer or phone.
          </p>

          <div className="playground-stats">
            <div>
              <strong>70+</strong>
              <span>languages</span>
            </div>
            <div>
              <strong>0</strong>
              <span>downloads</span>
            </div>
            <div>
              <strong>{challenges.length}</strong>
              <span>challenges</span>
            </div>
            <div>
              <strong>∞</strong>
              <span>free runs</span>
            </div>
          </div>
        </section>

        {/* Language picker */}
        <section className="container" aria-label="Choose a language">
          <div className="playground-languages" role="tablist">
            {LANGUAGES.map((lang) => (
              <button
                key={lang.id}
                type="button"
                role="tab"
                aria-selected={lang.id === language.id}
                className={`playground-lang ${lang.id === language.id ? 'active' : ''}`}
                style={{ '--lang-color': lang.color }}
                onClick={() => switchLanguage(lang)}
              >
                <i className={`bi ${lang.icon}`} aria-hidden="true" />
                {lang.label}
              </button>
            ))}
          </div>
          <p className="playground-lang-tagline">
            <strong>{language.label}:</strong> {language.tagline}{' '}
            <span className="playground-muted">
              Need another language? Use the language menu inside the editor.
            </span>
          </p>
        </section>

        {/* Workspace */}
        <section
          ref={workspaceRef}
          className={`container playground-workspace ${isFullscreen ? 'is-fullscreen' : ''}`}
          aria-label="Code editor"
        >
          <aside className="playground-examples">
            <h2>
              <i className="bi bi-collection-play" aria-hidden="true" /> Examples
            </h2>
            <ul>
              {examples.map((example, index) => (
                <li key={example.title}>
                  <button
                    type="button"
                    className={`playground-example ${index === activeExample ? 'active' : ''}`}
                    onClick={() => loadExample(index)}
                  >
                    <span className="playground-example-top">
                      <span className="playground-example-title">{example.title}</span>
                      <span className={`playground-level level-${example.level.toLowerCase()}`}>
                        {example.level}
                      </span>
                    </span>
                    <span className="playground-example-desc">{example.description}</span>
                  </button>
                </li>
              ))}
            </ul>

            <div className="playground-tip" aria-live="polite">
              <i className="bi bi-lightbulb" aria-hidden="true" />
              <p key={tipIndex}>{TIPS[tipIndex]}</p>
            </div>
          </aside>

          <div className="playground-editor">
            {/* Judge0 answer checking: disabled until a RapidAPI key is set up.
            {activeChallenge && (
              <div className="playground-check" aria-live="polite">
                <div className="playground-check-head">
                  <div className="playground-check-title">
                    <i className="bi bi-flag-fill" aria-hidden="true" />
                    <span>
                      <small>Solving</small>
                      {activeChallenge.title}
                    </span>
                  </div>

                  <div className="playground-check-actions">
                    {isLoggedIn ? (
                      <button
                        type="button"
                        className="playground-check-btn"
                        onClick={checkAnswer}
                        disabled={checking}
                      >
                        {checking ? (
                          <><span className="spinner-border spinner-border-sm" aria-hidden="true" /> Checking…</>
                        ) : (
                          <><i className="bi bi-check2-circle" aria-hidden="true" /> Check answer</>
                        )}
                      </button>
                    ) : (
                      <Link to="/login" className="playground-check-btn">
                        <i className="bi bi-box-arrow-in-right" aria-hidden="true" /> Sign in to check
                      </Link>
                    )}
                    <button
                      type="button"
                      className="playground-check-exit"
                      onClick={exitChallenge}
                      aria-label="Exit challenge"
                      title="Exit challenge"
                    >
                      <i className="bi bi-x-lg" aria-hidden="true" />
                    </button>
                  </div>
                </div>

                {!checkResult && !checking && (
                  <p className="playground-check-note">
                    Write your solution, press Run to test it, then Check answer.
                    It&apos;s marked solved only if the output is correct.
                  </p>
                )}

                {checkResult && (
                  <div className={`playground-check-result ${checkResult.passed ? 'pass' : 'fail'}`}>
                    <strong>{resultHeadline(checkResult)}</strong>
                    {!checkResult.passed && checkResult.status === 'ok' && (
                      <p>Compare your output with the expected output in the challenge.</p>
                    )}
                    {(checkResult.error || checkResult.output) && (
                      <pre>{checkResult.error || checkResult.output}</pre>
                    )}
                  </div>
                )}
              </div>
            )}
            */}

            <div className="playground-toolbar">
              <div className="playground-file">
                <span className="playground-dots" aria-hidden="true">
                  <span /><span /><span />
                </span>
                <i className={`bi ${language.icon}`} aria-hidden="true" />
                {language.file}
              </div>

              <div className="playground-actions">
                <button type="button" className="playground-run" onClick={runCode}>
                  <i className="bi bi-play-fill" aria-hidden="true" /> Run
                </button>
                <button type="button" onClick={resetCode} title="Reset to example" aria-label="Reset to example">
                  <i className="bi bi-arrow-counterclockwise" aria-hidden="true" />
                </button>
                <button type="button" onClick={copyCode} title="Copy code" aria-label="Copy code">
                  <i className="bi bi-clipboard" aria-hidden="true" />
                </button>
                <button type="button" onClick={downloadCode} title="Download file" aria-label="Download file">
                  <i className="bi bi-download" aria-hidden="true" />
                </button>
                <button
                  type="button"
                  onClick={toggleTheme}
                  title="Toggle editor theme"
                  aria-label="Toggle editor theme"
                >
                  <i className={`bi ${theme === 'dark' ? 'bi-sun' : 'bi-moon-stars'}`} aria-hidden="true" />
                </button>
                <button
                  type="button"
                  onClick={() => setIsFullscreen((f) => !f)}
                  title={isFullscreen ? 'Exit focus mode (Esc)' : 'Focus mode'}
                  aria-label={isFullscreen ? 'Exit focus mode' : 'Focus mode'}
                >
                  <i
                    className={`bi ${isFullscreen ? 'bi-fullscreen-exit' : 'bi-arrows-fullscreen'}`}
                    aria-hidden="true"
                  />
                </button>
              </div>
            </div>

            <iframe
              key={`${language.id}-${theme}`}
              ref={iframeRef}
              title={`${language.label} code editor`}
              src={editorUrl(language.id, theme)}
              onLoad={handleEditorLoad}
              className="playground-iframe"
              allow="clipboard-read; clipboard-write"
            />

            <p className="playground-footnote">
              Your code autosaves in this browser. Editor powered by{' '}
              <a href="https://onecompiler.com" target="_blank" rel="noreferrer">
                OneCompiler
              </a>
              .
            </p>
          </div>
        </section>

        {/* Challenges */}
        <section className="container playground-challenges">
          <div className="playground-challenges-head">
            <div>
              <span className="section-eyebrow">
                <span className="section-eyebrow-line" />
                LEVEL UP
              </span>
              <h2>Coding Challenges</h2>
              <p className="playground-muted">
                Solve them in any language. Mark a challenge done to earn XP.
              </p>
            </div>

            <div className="playground-progress">
              <div className="playground-progress-label">
                <span>
                  <i className="bi bi-trophy-fill" aria-hidden="true" /> {earnedXp} / {totalXp} XP
                </span>
                <span>
                  {solved.length}/{challenges.length} solved
                </span>
              </div>
              <div
                className="playground-progress-bar"
                role="progressbar"
                aria-valuemin={0}
                aria-valuemax={totalXp}
                aria-valuenow={earnedXp}
              >
                <span style={{ width: `${totalXp ? (earnedXp / totalXp) * 100 : 0}%` }} />
              </div>
              <button type="button" className="btn btn-gold playground-surprise" onClick={surpriseMe}>
                <i className="bi bi-shuffle" aria-hidden="true" /> Surprise me
              </button>
            </div>
          </div>

          <div className="playground-challenge-grid">
            {challenges.map((challenge) => {
              const isSolved = solved.includes(challenge.id);
              return (
                <article
                  key={challenge.id}
                  id={`challenge-${challenge.id}`}
                  className={`playground-challenge ${isSolved ? 'solved' : ''} ${
                    highlighted === challenge.id ? 'highlight' : ''
                  }`}
                >
                  <div className="playground-challenge-top">
                    <span className={`playground-level level-${challenge.level.toLowerCase()}`}>
                      {challenge.level}
                    </span>
                    <span className="playground-xp">+{challenge.xp} XP</span>
                  </div>

                  <h3>{challenge.title}</h3>
                  <p>{challenge.description}</p>
                  <pre className="playground-sample">{challenge.example}</pre>

                  {openHint === challenge.id && (
                    <p className="playground-hint">
                      <i className="bi bi-lightbulb-fill" aria-hidden="true" /> {challenge.hint}
                    </p>
                  )}

                  <div className="playground-challenge-actions">
                    <button type="button" className="playground-solve" onClick={() => solveChallenge(challenge)}>
                      <i className="bi bi-code-slash" aria-hidden="true" /> {isSolved ? 'Solve again' : 'Solve it'}
                    </button>
                    <button
                      type="button"
                      className="playground-ghost"
                      onClick={() => setOpenHint(openHint === challenge.id ? null : challenge.id)}
                      aria-expanded={openHint === challenge.id}
                    >
                      Hint
                    </button>
                    <button
                      type="button"
                      className={`playground-ghost playground-done ${isSolved ? 'active' : ''}`}
                      onClick={() => toggleSolved(challenge.id)}
                      aria-pressed={isSolved}
                    >
                      <i className={`bi ${isSolved ? 'bi-check-circle-fill' : 'bi-circle'}`} aria-hidden="true" />
                      {isSolved ? 'Solved' : 'Done?'}
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        </section>

        <DebugArena />

        {/* How it works */}
        <section className="container playground-steps">
          {[
            ['bi-translate', 'Pick a language', 'Python, C, Java, SQL and 70+ more, all ready in one click.'],
            ['bi-pencil-square', 'Write or load code', 'Start from an example, a challenge or a blank page.'],
            ['bi-play-circle', 'Run and experiment', 'See output instantly. Break things, fix them, learn faster.'],
          ].map(([icon, title, text], index) => (
            <div className="playground-step" key={title}>
              <span className="playground-step-num">{index + 1}</span>
              <i className={`bi ${icon}`} aria-hidden="true" />
              <h3>{title}</h3>
              <p>{text}</p>
            </div>
          ))}
        </section>
      </main>

      {toast && (
        <div className="playground-toast" role="status">
          <i className="bi bi-check2-circle" aria-hidden="true" /> {toast}
        </div>
      )}

      <Footer />
    </>
  );
};

export default Playground;

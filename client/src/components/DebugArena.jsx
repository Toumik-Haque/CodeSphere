import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { apiRequest } from '../lib/api';
import '../css/DebugArena.css';

const LETTERS = ['A', 'B', 'C', 'D'];
const CATEGORY_ICONS = {
  python: 'bi-filetype-py',
  javascript: 'bi-filetype-js',
  c: 'bi-cpu',
  logic: 'bi-diagram-3',
  git: 'bi-git',
};

// Dates match the server: YYYY-MM-DD in India time.
function dateInIndia(date) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(date);
}

function lastSevenDays() {
  return Array.from({ length: 7 }, (_, i) => {
    const date = new Date(Date.now() - (6 - i) * 86400000);
    return {
      key: dateInIndia(date),
      label: new Intl.DateTimeFormat('en-IN', { weekday: 'narrow', timeZone: 'Asia/Kolkata' }).format(date),
    };
  });
}

function formatDate(dateString) {
  return new Date(`${dateString}T12:00:00+05:30`).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function Countdown({ target, onExpire }) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);

  const remaining = Math.max(0, new Date(target).getTime() - now);

  useEffect(() => {
    if (remaining === 0) onExpire();
  }, [remaining, onExpire]);

  const pad = (n) => String(n).padStart(2, '0');
  const h = Math.floor(remaining / 3600000);
  const m = Math.floor((remaining % 3600000) / 60000);
  const s = Math.floor((remaining % 60000) / 1000);

  return (
    <div className="debug-arena-countdown">
      <i className="bi bi-hourglass-split" aria-hidden="true" />
      Next bug unlocks in <strong>{pad(h)}:{pad(m)}:{pad(s)}</strong>
    </div>
  );
}

function CodeWindow({ code, shake = false }) {
  return (
    <div className="debug-arena-code-wrap">
      <div className="debug-arena-code-bar">
        <span className="playground-dots" aria-hidden="true"><span /><span /><span /></span>
        buggy_code
      </div>
      <pre className={`debug-arena-code ${shake ? 'shake' : ''}`}>
        <code>{code}</code>
      </pre>
    </div>
  );
}

function Options({ bug, picked, onPick, revealed }) {
  return (
    <div className="debug-arena-options">
      {bug.options.map((option, i) => {
        let state = '';
        if (revealed && i === bug.answer) state = 'correct';
        else if (revealed && i === bug.picked) state = 'wrong';
        else if (revealed) state = 'faded';
        else if (i === picked) state = 'selected';

        return (
          <button
            key={option}
            type="button"
            className={`debug-arena-option ${state}`}
            onClick={() => onPick?.(i)}
            disabled={revealed}
            aria-pressed={!revealed ? i === picked : undefined}
          >
            <span className="letter">{LETTERS[i]}</span>
            <span>{option}</span>
            {state === 'correct' && <i className="bi bi-check-circle-fill ms-auto" aria-hidden="true" />}
            {state === 'wrong' && <i className="bi bi-x-circle-fill ms-auto" aria-hidden="true" />}
          </button>
        );
      })}
    </div>
  );
}

function Feedback({ result }) {
  return (
    <div className={`debug-arena-feedback ${result.correct ? 'is-correct' : 'is-wrong'}`} role="status">
      <div className="debug-arena-feedback-text">
        <h4>
          {result.correct
            ? '✅ Bug squashed!'
            : `❌ Not quite. The answer is ${LETTERS[result.answer]}.`}
        </h4>
        <p>{result.explanation}</p>
      </div>

      <figure className="debug-arena-meme">
        <div className="debug-arena-meme-face" aria-hidden="true">
          {result.correct ? '😎' : '🤦'}
        </div>
        <figcaption>{result.meme}</figcaption>
      </figure>
    </div>
  );
}

function BugMeta({ bug }) {
  return (
    <div className="debug-arena-meta">
      <span className="debug-arena-tag">
        <i className={`bi ${CATEGORY_ICONS[bug.category] || 'bi-bug'}`} aria-hidden="true" />{' '}
        {bug.categoryLabel}
      </span>
      <span className={`playground-level level-${bug.level.toLowerCase()}`}>{bug.level}</span>
    </div>
  );
}

const DebugArena = () => {
  const { user, token } = useAuth();
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [picked, setPicked] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [justSubmitted, setJustSubmitted] = useState(false);
  const [openHistory, setOpenHistory] = useState(null);

  const isLoggedIn = Boolean(user && token);

  const load = useCallback(async () => {
    try {
      const today = await apiRequest('/debug/today');
      setError('');
      setPicked(null);
      setJustSubmitted(false);
      setData(today);
    } catch (err) {
      setError(err.message);
    }
  }, []);

  useEffect(() => {
    if (!isLoggedIn) return undefined;
    let cancelled = false;
    apiRequest('/debug/today')
      .then((today) => !cancelled && setData(today))
      .catch((err) => !cancelled && setError(err.message));
    return () => {
      cancelled = true;
    };
  }, [isLoggedIn]);

  const submit = async () => {
    if (picked === null || submitting) return;
    setSubmitting(true);
    try {
      const result = await apiRequest('/debug/submit', {
        method: 'POST',
        body: JSON.stringify({ bugId: data.challenge.id, picked }),
      });
      setData(result);
      setJustSubmitted(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  // Keyboard: A-D or 1-4 to pick, Enter to submit.
  useEffect(() => {
    if (data?.status !== 'open') return undefined;
    const onKey = (event) => {
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(event.target.tagName)) return;
      const key = event.key.toUpperCase();
      const count = data.challenge.options.length;
      const letter = LETTERS.indexOf(key);
      const number = Number(key) - 1;
      if (letter >= 0 && letter < count) setPicked(letter);
      else if (number >= 0 && number < count) setPicked(number);
      else if (event.key === 'Enter' && picked !== null) submit();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const header = (
    <div className="debug-arena-head">
      <div>
        <span className="section-eyebrow">
          <span className="section-eyebrow-line" />
          DEBUGGING ARENA · DAILY
        </span>
        <h2>
          Find the Bug! <span aria-hidden="true">🐞</span>
        </h2>
        <p className="playground-muted">
          One new bug every day. Solve it to keep your streak alive.
          Solved bugs move to your completed list.
        </p>
      </div>

      {isLoggedIn && data && (
        <div className="debug-arena-scoreboard" aria-label="Your stats">
          <div className={data.stats.streak >= 3 ? 'on-fire' : ''}>
            <strong>{data.stats.streak} 🔥</strong>
            <span>day streak</span>
          </div>
          <div>
            <strong>{data.stats.bestStreak}</strong>
            <span>best streak</span>
          </div>
          <div>
            <strong>{data.stats.completedCount}/{data.stats.totalBugs}</strong>
            <span>bugs done</span>
          </div>
          <div>
            <strong>
              {data.stats.completedCount
                ? Math.round((data.stats.correctCount / data.stats.completedCount) * 100)
                : 0}%
            </strong>
            <span>accuracy</span>
          </div>
        </div>
      )}
    </div>
  );

  if (!isLoggedIn) {
    return (
      <section className="container debug-arena" id="debugging-arena">
        {header}
        <div className="debug-arena-card debug-arena-locked">
          <div className="debug-arena-summary-emoji" aria-hidden="true">🔒🐞</div>
          <h3>Your daily bug is waiting</h3>
          <p className="playground-muted">
            Sign in to get a fresh debugging challenge every day, build your
            streak and track every bug you've squashed.
          </p>
          <div className="debug-arena-locked-actions">
            <Link to="/login" className="btn btn-gold">
              <i className="bi bi-box-arrow-in-right" aria-hidden="true" /> Sign in
            </Link>
            <Link to="/register" className="playground-ghost">Create an account</Link>
          </div>
        </div>
      </section>
    );
  }

  const active = new Set(data?.stats.activeDates || []);

  return (
    <section className="container debug-arena" id="debugging-arena">
      {header}

      {data && (
        <div className="debug-arena-week" aria-label="Last 7 days">
          {lastSevenDays().map((day) => (
            <div
              key={day.key}
              className={`debug-arena-day ${active.has(day.key) ? 'done' : ''} ${
                day.key === data.today ? 'today' : ''
              }`}
              title={`${formatDate(day.key)}${active.has(day.key) ? ': solved' : ''}`}
            >
              <span className="dot">{active.has(day.key) ? '🔥' : ''}</span>
              <span className="label">{day.label}</span>
            </div>
          ))}
        </div>
      )}

      {error && (
        <div className="debug-arena-card debug-arena-error" role="alert">
          <p>{error}</p>
          <button type="button" className="playground-ghost" onClick={load}>
            <i className="bi bi-arrow-clockwise" aria-hidden="true" /> Try again
          </button>
        </div>
      )}

      {!data && !error && (
        <div className="debug-arena-card debug-arena-loading">Loading today's bug…</div>
      )}

      {data?.status === 'open' && (
        <div className="debug-arena-card">
          <div className="debug-arena-today-label">
            <i className="bi bi-calendar-event" aria-hidden="true" /> Today's challenge ·{' '}
            {formatDate(data.today)}
          </div>
          <BugMeta bug={data.challenge} />

          <div className="debug-arena-body">
            <CodeWindow code={data.challenge.code} />

            <div className="debug-arena-question">
              <h3>What's wrong with this code?</h3>
              <Options bug={data.challenge} picked={picked} onPick={setPicked} />

              <button
                type="button"
                className="btn btn-gold debug-arena-submit"
                onClick={submit}
                disabled={picked === null || submitting}
              >
                {submitting ? 'Checking…' : 'Submit answer'}
                <i className="bi bi-send" aria-hidden="true" />
              </button>
              <p className="debug-arena-keys playground-muted">
                One attempt per day. Press <kbd>A</kbd>–<kbd>D</kbd> to pick, <kbd>Enter</kbd> to submit.
              </p>
            </div>
          </div>
        </div>
      )}

      {data?.status === 'done' && (
        <div className="debug-arena-card">
          <div className="debug-arena-today-label">
            <i className="bi bi-check2-circle" aria-hidden="true" />{' '}
            {justSubmitted ? 'Submitted! Here\'s how you did' : 'You\'ve done today\'s challenge'}
          </div>
          <BugMeta bug={data.result} />

          <div className="debug-arena-body">
            <CodeWindow code={data.result.code} shake={justSubmitted && !data.result.correct} />
            <div className="debug-arena-question">
              <h3>What's wrong with this code?</h3>
              <Options bug={data.result} revealed />
            </div>
          </div>

          <Feedback result={data.result} />
          <Countdown target={data.nextUnlockAt} onExpire={load} />
        </div>
      )}

      {data?.status === 'all-done' && (
        <div className="debug-arena-card debug-arena-summary">
          <div className="debug-arena-summary-emoji" aria-hidden="true">🏆</div>
          <h3>Bug Exterminator!</h3>
          <p className="playground-muted">
            You've solved every bug in the arena. New bugs are on the way.
            Check back soon and keep that streak going.
          </p>
        </div>
      )}

      {data?.history.length > 0 && (
        <div className="debug-arena-history">
          <h3>
            <i className="bi bi-journal-check" aria-hidden="true" /> Completed bugs
            <span className="count">{data.history.length}</span>
          </h3>

          <ul>
            {data.history.map((bug) => {
              const isOpen = openHistory === bug.id;
              return (
                <li key={bug.id} className={isOpen ? 'open' : ''}>
                  <button
                    type="button"
                    className="debug-arena-history-row"
                    onClick={() => setOpenHistory(isOpen ? null : bug.id)}
                    aria-expanded={isOpen}
                  >
                    <span className={`result ${bug.correct ? 'ok' : 'miss'}`}>
                      <i className={`bi ${bug.correct ? 'bi-check-lg' : 'bi-x-lg'}`} aria-hidden="true" />
                    </span>
                    <span className="title">
                      <i className={`bi ${CATEGORY_ICONS[bug.category] || 'bi-bug'}`} aria-hidden="true" />{' '}
                      {bug.categoryLabel}
                      <span className={`playground-level level-${bug.level.toLowerCase()}`}>{bug.level}</span>
                    </span>
                    <span className="date">{formatDate(bug.date)}</span>
                    <i className={`bi ${isOpen ? 'bi-chevron-up' : 'bi-chevron-down'}`} aria-hidden="true" />
                  </button>

                  {isOpen && (
                    <div className="debug-arena-history-detail">
                      <CodeWindow code={bug.code} />
                      <p>
                        <strong>Answer: {LETTERS[bug.answer]}. {bug.options[bug.answer]}</strong>
                        {!bug.correct && (
                          <> (you picked {LETTERS[bug.picked]})</>
                        )}
                      </p>
                      <p className="playground-muted">{bug.explanation}</p>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </section>
  );
};

export default DebugArena;

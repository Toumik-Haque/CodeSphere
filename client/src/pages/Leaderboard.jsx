import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { apiRequest } from '../lib/api';
import OpenSourceContributors from '../components/OpenSourceContributors';
import '../css/Leaderboard.css';

const YEARS = ['1st Year', '2nd Year', '3rd Year', '4th Year'];
const AVATAR_COLORS = ['#F05A36', '#2875A8', '#16A34A', '#7C3AED', '#D97706', '#0891B2', '#DB2777', '#4F46E5'];
const MEDALS = { 1: '🥇', 2: '🥈', 3: '🥉' };

// Keep in sync with server/utils/progress.js.
const BUG_XP = [
  ['Beginner', 10],
  ['Easy', 15],
  ['Medium', 20],
  ['Hard', 30],
];
const STREAK_BONUS_PER_DAY = 2;
const STREAK_BONUS_CAP = 20;

// Badges are earned from leaderboard stats.
const BADGES = [
  { id: 'first-fix', emoji: '🐞', name: 'First Fix', rule: 'Fix your first daily bug', earned: (r) => r.bugsFixed >= 1 },
  { id: 'on-fire', emoji: '🔥', name: 'On Fire', rule: 'Reach a 3-day streak', earned: (r) => r.bestStreak >= 3 },
  { id: 'week', emoji: '⚡', name: 'Week Warrior', rule: 'Reach a 7-day streak', earned: (r) => r.bestStreak >= 7 },
  { id: 'month', emoji: '🏅', name: 'Month Master', rule: 'Reach a 30-day streak', earned: (r) => r.bestStreak >= 30 },
  { id: 'sharp', emoji: '🎯', name: 'Sharpshooter', rule: '80%+ accuracy over 10+ daily bugs', earned: (r) => r.bugsAnswered >= 10 && r.accuracy >= 80 },
  { id: 'solver', emoji: '🧩', name: 'Problem Solver', rule: 'Solve 3 coding challenges', earned: (r) => r.challengesSolved >= 3 },
  { id: 'master', emoji: '👑', name: 'Challenge Master', rule: 'Solve all 8 coding challenges', earned: (r) => r.challengesSolved >= 8 },
  { id: 'century', emoji: '💯', name: 'Century', rule: 'Earn 100 XP', earned: (r) => r.xp >= 100 },
  { id: 'rocket', emoji: '🚀', name: 'XP Rocket', rule: 'Earn 500 XP', earned: (r) => r.xp >= 500 },
];

function avatarColor(text) {
  let hash = 0;
  for (const char of text) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  return AVATAR_COLORS[hash % AVATAR_COLORS.length];
}

function memberSince(date) {
  return date
    ? new Date(date).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })
    : '—';
}

function Avatar({ row, size = 'md' }) {
  return (
    <span
      className={`lb-avatar lb-avatar-${size}`}
      style={{ background: avatarColor(row.initials + row.year) }}
      aria-hidden="true"
    >
      {row.initials}
    </span>
  );
}

function Metric({ sort, row }) {
  return sort === 'streak' ? (
    <>
      <strong>{row.streak} 🔥</strong>
      <span>{row.xp} XP</span>
    </>
  ) : (
    <>
      <strong>{row.xp} XP</strong>
      <span>{row.streak} 🔥 streak</span>
    </>
  );
}

function Podium({ rows, sort, onOpen }) {
  // Visual order: 2nd, 1st, 3rd.
  const order = [rows[1], rows[0], rows[2]].filter(Boolean);
  return (
    <div className="lb-podium">
      {order.map((row, i) => (
        <button
          type="button"
          key={`${i}-${row.name}`}
          className={`lb-podium-spot place-${row.rank} ${row.isMe ? 'is-me' : ''}`}
          onClick={() => onOpen(row)}
          aria-label={`View ${row.name}'s profile, rank ${row.rank}`}
        >
          <span className="lb-medal" aria-hidden="true">{MEDALS[row.rank] || `#${row.rank}`}</span>
          <Avatar row={row} size="lg" />
          <strong className="lb-podium-name">{row.name}</strong>
          <span className="lb-podium-year">{row.year}</span>
          <div className="lb-podium-metric">
            <Metric sort={sort} row={row} />
          </div>
          <div className="lb-podium-block">
            <span>#{row.rank}</span>
          </div>
        </button>
      ))}
    </div>
  );
}

function Spotlight({ spotlight, onOpen }) {
  const cards = [
    { key: 'xp', title: 'XP Champion', icon: 'bi-trophy-fill', value: (r) => `${r.xp} XP` },
    { key: 'streak', title: 'Streak Leader', icon: 'bi-fire', value: (r) => `${r.streak}-day streak 🔥` },
    { key: 'bestStreak', title: 'All-time Best Streak', icon: 'bi-award-fill', value: (r) => `${r.bestStreak} days in a row` },
  ].filter((card) => spotlight?.[card.key]);

  if (!cards.length) return null;

  return (
    <section className="lb-spotlight" aria-label="Spotlight">
      {cards.map((card) => {
        const row = spotlight[card.key];
        return (
          <button
            type="button"
            key={card.key}
            className={`lb-spot lb-spot-${card.key}`}
            onClick={() => onOpen(row)}
            aria-label={`${card.title}: ${row.name}. View profile`}
          >
            <span className="lb-spot-title">
              <i className={`bi ${card.icon}`} aria-hidden="true" /> {card.title}
            </span>
            <span className="lb-spot-body">
              <Avatar row={row} />
              <span className="lb-spot-who">
                <strong>{row.name}{row.isMe ? ' (You)' : ''}</strong>
                <span>{row.year}</span>
              </span>
            </span>
            <span className="lb-spot-value">{card.value(row)}</span>
          </button>
        );
      })}
    </section>
  );
}

function ProfileModal({ row, onClose }) {
  const closeRef = useRef(null);

  useEffect(() => {
    closeRef.current?.focus();
    const onKey = (e) => e.key === 'Escape' && onClose();
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener('keydown', onKey);
    };
  }, [onClose]);

  const earned = BADGES.filter((b) => b.earned(row));
  const bugShare = row.xp ? Math.round((row.debugXp / row.xp) * 100) : 0;

  return (
    <div className="lb-modal-backdrop" onClick={onClose} role="presentation">
      <div
        className="lb-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="lb-modal-name"
        onClick={(e) => e.stopPropagation()}
      >
        <button ref={closeRef} type="button" className="lb-modal-close" onClick={onClose} aria-label="Close profile">
          <i className="bi bi-x-lg" aria-hidden="true" />
        </button>

        <div className="lb-modal-head">
          <Avatar row={row} size="lg" />
          <div>
            <h2 id="lb-modal-name">
              {row.name}
              {row.isMe && <span className="lb-you">You</span>}
            </h2>
            <p>{row.year} · {row.college}</p>
            <p className="lb-modal-since">
              <i className="bi bi-calendar3" aria-hidden="true" /> Member since {memberSince(row.memberSince)}
            </p>
          </div>
        </div>

        <div className="lb-modal-ranks">
          <div>
            <span>XP rank</span>
            <strong>#{row.ranks?.xp}</strong>
          </div>
          <div>
            <span>Streak rank</span>
            <strong>#{row.ranks?.streak}</strong>
          </div>
        </div>

        <div className="lb-modal-stats">
          <div><strong>{row.xp}</strong><span>total XP</span></div>
          <div><strong>{row.streak} 🔥</strong><span>current streak</span></div>
          <div><strong>{row.bestStreak}</strong><span>best streak</span></div>
          <div><strong>{row.bugsFixed}</strong><span>bugs fixed</span></div>
          <div><strong>{row.accuracy}%</strong><span>bug accuracy</span></div>
          <div><strong>{row.challengesSolved}</strong><span>challenges</span></div>
        </div>

        <div className="lb-modal-xp">
          <div className="lb-modal-xp-label">
            <span><i className="bi bi-bug-fill" aria-hidden="true" /> Daily bugs {row.debugXp} XP</span>
            <span><i className="bi bi-code-square" aria-hidden="true" /> Challenges {row.challengeXp} XP</span>
          </div>
          <div className="lb-modal-xp-bar" aria-hidden="true">
            <span style={{ width: `${bugShare}%` }} />
          </div>
        </div>

        <div className="lb-modal-badges">
          <h3>Badges <span>{earned.length}/{BADGES.length}</span></h3>
          {earned.length ? (
            <ul>
              {earned.map((badge) => (
                <li key={badge.id} title={badge.rule}>
                  <span aria-hidden="true">{badge.emoji}</span> {badge.name}
                </li>
              ))}
            </ul>
          ) : (
            <p>No badges yet. Fix a daily bug to earn the first one!</p>
          )}
        </div>
      </div>
    </div>
  );
}

// Styled replacement for <select>: button + listbox, keyboard accessible.
function YearDropdown({ value, onChange }) {
  const options = [{ value: '', label: 'All years' }, ...YEARS.map((y) => ({ value: y, label: y }))];
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const wrapRef = useRef(null);
  const selected = options.find((o) => o.value === value) || options[0];

  useEffect(() => {
    if (!open) return undefined;
    const onClick = (e) => !wrapRef.current?.contains(e.target) && setOpen(false);
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [open]);

  const openMenu = () => {
    setActive(Math.max(0, options.indexOf(selected)));
    setOpen(true);
  };

  const choose = (option) => {
    onChange(option.value);
    setOpen(false);
  };

  const onKeyDown = (e) => {
    if (!open && ['ArrowDown', 'ArrowUp', 'Enter', ' '].includes(e.key)) {
      e.preventDefault();
      openMenu();
      return;
    }
    if (!open) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActive((i) => (i + 1) % options.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((i) => (i - 1 + options.length) % options.length);
    } else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      choose(options[active]);
    } else if (e.key === 'Escape' || e.key === 'Tab') {
      setOpen(false);
    }
  };

  return (
    <div className={`lb-dropdown ${open ? 'is-open' : ''}`} ref={wrapRef}>
      <button
        type="button"
        className="lb-dropdown-toggle"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={`Filter by year: ${selected.label}`}
        onClick={() => (open ? setOpen(false) : openMenu())}
        onKeyDown={onKeyDown}
      >
        <i className="bi bi-mortarboard" aria-hidden="true" />
        {selected.label}
        <i className="bi bi-chevron-down lb-dropdown-chevron" aria-hidden="true" />
      </button>

      {open && (
        <ul className="lb-dropdown-menu" role="listbox" aria-label="Year of study">
          {options.map((option, i) => (
            <li
              key={option.label}
              role="option"
              aria-selected={option.value === value}
              className={`lb-dropdown-option ${i === active ? 'is-active' : ''}`}
              onMouseEnter={() => setActive(i)}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => choose(option)}
            >
              {option.label}
              {option.value === value && <i className="bi bi-check2" aria-hidden="true" />}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function Rules() {
  return (
    <section className="lb-rules-guide" aria-labelledby="lb-rules-title">
      <h2 id="lb-rules-title">
        <i className="bi bi-journal-text" aria-hidden="true" /> How the leaderboard works
      </h2>

      <details open>
        <summary><span>1</span> How to get on the board</summary>
        <ul>
          <li>Create an account and sign in. Admin accounts aren&apos;t ranked.</li>
          <li>
            Fix the <Link to="/playground#debugging-arena">daily bug</Link> or solve a{' '}
            <Link to="/playground">coding challenge</Link>. As soon as you have any XP or a streak,
            you appear on the board.
          </li>
          <li>The board shows the top 100 players. Your own rank is always shown in the &quot;Your rank&quot; card.</li>
        </ul>
      </details>

      <details>
        <summary><span>2</span> How XP is calculated</summary>
        <p><strong>Total XP = Daily bug XP + Coding challenge XP</strong></p>
        <h4>Daily bug</h4>
        <p>
          A <strong>correct</strong> fix earns XP for the bug&apos;s difficulty <strong>plus a streak bonus</strong> of
          +{STREAK_BONUS_PER_DAY} XP for each day of your streak (counting today), up to +{STREAK_BONUS_CAP} XP.
          A wrong answer earns 0 XP.
        </p>
        <table className="lb-table">
          <thead>
            <tr><th>Difficulty</th><th>Base XP</th><th>Day 1 of streak</th><th>Day 10+ of streak</th></tr>
          </thead>
          <tbody>
            {BUG_XP.map(([level, xp]) => (
              <tr key={level}>
                <td>{level}</td>
                <td>{xp}</td>
                <td>{xp + STREAK_BONUS_PER_DAY}</td>
                <td>{xp + STREAK_BONUS_CAP}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="lb-example">
          Example: on day 4 of your streak you fix a Medium bug → 20 + (4 × {STREAK_BONUS_PER_DAY}) = <strong>28 XP</strong>.
        </p>
        <h4>Coding challenges</h4>
        <p>
          Each challenge gives its XP once: Beginner 10, Easy 20, Medium 30, Hard 50 (170 XP for all 8).
          Solving the same challenge again doesn&apos;t add more.
        </p>
      </details>

      <details>
        <summary><span>3</span> How streaks work</summary>
        <ul>
          <li>Your streak is the number of <strong>days in a row</strong> you fixed the daily bug <strong>correctly</strong>.</li>
          <li>You get one new bug each day and <strong>one attempt</strong>. A wrong answer doesn&apos;t add to your streak.</li>
          <li>If a whole day passes without a correct fix, your streak goes back to <strong>0</strong>.</li>
          <li>Days change at <strong>midnight India time (IST)</strong>.</li>
          <li>Your <strong>best streak</strong> is the longest streak you&apos;ve ever had. It never goes down.</li>
        </ul>
      </details>

      <details>
        <summary><span>4</span> How your rank is decided</summary>
        <ul>
          <li><strong>Top XP:</strong> most XP first. Equal XP → longer current streak first.</li>
          <li><strong>Longest streak:</strong> longest current streak first. Equal streak → higher best streak, then more XP.</li>
          <li>Players with the same main score <strong>share a rank</strong> (for example 1, 1, 3).</li>
          <li>The <strong>year filter</strong> ranks you only against students in that year.</li>
          <li>Ranks are recalculated every time the leaderboard loads, so new XP shows up right away.</li>
        </ul>
      </details>

      <details>
        <summary><span>5</span> Badges</summary>
        <ul className="lb-badge-list">
          {BADGES.map((badge) => (
            <li key={badge.id}>
              <span aria-hidden="true">{badge.emoji}</span>
              <strong>{badge.name}</strong> {badge.rule}
            </li>
          ))}
        </ul>
      </details>

      <details>
        <summary><span>6</span> Fair play &amp; privacy</summary>
        <ul>
          <li>Daily bug answers are checked on the server. The answer is never sent to your browser before you submit.</li>
          <li>Coding challenges are currently marked done by you, on trust. Only mark a challenge done when your code really works.</li>
          <li>Admins may remove points or players who cheat.</li>
          <li>Visitors who aren&apos;t signed in see short names (like &quot;Asha R.&quot;). Emails are never shown.</li>
        </ul>
      </details>
    </section>
  );
}

const BOARD_FROM_HASH = { '#students': 'students', '#open-source': 'opensource' };
const HASH_FOR_BOARD = { students: '#students', opensource: '#open-source' };
const COMPACT_ROWS = 10;

const Leaderboard = () => {
  const [sort, setSort] = useState('xp');
  const [year, setYear] = useState('');
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [profile, setProfile] = useState(null);
  // Which board: both side by side (default), students only, or open
  // source only. /leaderboard#students and #open-source open one directly.
  const [board, setBoard] = useState(() => BOARD_FROM_HASH[window.location.hash] || 'both');

  const switchBoard = (next) => {
    setBoard(next);
    window.history.replaceState(null, '', HASH_FOR_BOARD[next] || window.location.pathname);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  const closeProfile = useCallback(() => setProfile(null), []);

  useEffect(() => {
    let cancelled = false;
    const params = new URLSearchParams({ sort, ...(year ? { year } : {}) });
    apiRequest(`/leaderboard?${params}`)
      .then((result) => {
        if (cancelled) return;
        setError('');
        setData(result);
      })
      .catch((err) => !cancelled && setError(err.message));
    return () => {
      cancelled = true;
    };
  }, [sort, year]);

  const loading = !data && !error;
  const rows = data?.rows || [];
  const podium = rows.filter((row) => row.rank <= 3).slice(0, 3);
  const rest = rows.slice(podium.length);

  return (
    <>
      <Navbar />

      <main className="lb-page">
        <div className="container">
          <header className="lb-hero">
            <span className="section-eyebrow">
              <span className="section-eyebrow-line" />
              HALL OF FAME
            </span>
            <h1 className="lb-title">
              The <span className="gold-text">Leaderboard.</span>
            </h1>

            <div className="lb-board-switch" role="tablist" aria-label="Choose a leaderboard">
              <button
                type="button"
                role="tab"
                aria-selected={board === 'both'}
                className={board === 'both' ? 'active' : ''}
                onClick={() => switchBoard('both')}
              >
                <i className="bi bi-layout-split" aria-hidden="true" /> Both
                <small>Side by side</small>
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={board === 'students'}
                className={board === 'students' ? 'active' : ''}
                onClick={() => switchBoard('students')}
              >
                <i className="bi bi-mortarboard-fill" aria-hidden="true" /> Students
                <small>XP &amp; streaks</small>
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={board === 'opensource'}
                className={board === 'opensource' ? 'active' : ''}
                onClick={() => switchBoard('opensource')}
              >
                <i className="bi bi-github" aria-hidden="true" /> Open Source
                <small>GitHub contributors</small>
              </button>
            </div>

            {board !== 'opensource' && (
            <>
            <p className="lb-subtitle">
              Fix the daily bug, solve coding challenges, keep your streak alive.
              Every day counts.
            </p>

            <ul className="lb-rules">
              <li>
                <i className="bi bi-bug-fill" aria-hidden="true" />
                <span><strong>Daily bug</strong> +10–30 XP, plus a streak bonus</span>
              </li>
              <li>
                <i className="bi bi-code-square" aria-hidden="true" />
                <span><strong>Coding challenges</strong> +10–50 XP each</span>
              </li>
              <li>
                <i className="bi bi-fire" aria-hidden="true" />
                <span><strong>Streak</strong> = days in a row you fixed the daily bug</span>
              </li>
            </ul>
            <a href="#rules" className="lb-rules-link">
              <i className="bi bi-info-circle" aria-hidden="true" /> Read all the rules
            </a>
            </>
            )}
          </header>

          {board === 'opensource' && <OpenSourceContributors />}

          {board === 'both' && (
            <>
              <div className="lb-split">
                <section className="lb-panel" aria-labelledby="lb-panel-students">
                  <div className="lb-panel-head">
                    <h2 id="lb-panel-students">
                      <i className="bi bi-mortarboard-fill" aria-hidden="true" /> Students
                    </h2>
                    <span>XP &amp; daily-bug streaks</span>
                  </div>

                  <div className="lb-panel-controls">
                    <div className="lb-tabs lb-tabs-sm" role="tablist" aria-label="Rank students by">
                      <button
                        type="button"
                        role="tab"
                        aria-selected={sort === 'xp'}
                        className={sort === 'xp' ? 'active' : ''}
                        onClick={() => setSort('xp')}
                      >
                        <i className="bi bi-trophy-fill" aria-hidden="true" /> Top XP
                      </button>
                      <button
                        type="button"
                        role="tab"
                        aria-selected={sort === 'streak'}
                        className={sort === 'streak' ? 'active' : ''}
                        onClick={() => setSort('streak')}
                      >
                        <i className="bi bi-fire" aria-hidden="true" /> Streak
                      </button>
                    </div>
                    <YearDropdown value={year} onChange={setYear} />
                  </div>

                  {data?.me && (
                    <button type="button" className="lb-panel-me" onClick={() => setProfile(data.me)}>
                      <span>Your rank</span>
                      <strong>#{data.me.rank}</strong>
                      <span>{data.me.xp} XP · {data.me.streak} 🔥</span>
                      <i className="bi bi-chevron-right" aria-hidden="true" />
                    </button>
                  )}

                  {error && <p className="lb-panel-empty" role="alert">{error}</p>}

                  {loading && (
                    <div className="lb-list" aria-busy="true">
                      {Array.from({ length: 4 }, (_, i) => (
                        <div key={i} className="lb-row lb-skeleton" />
                      ))}
                    </div>
                  )}

                  {data && rows.length === 0 && (
                    <div className="lb-panel-empty">
                      <span aria-hidden="true">🏁</span>
                      <p>No students ranked yet. Fix today&apos;s bug to be first!</p>
                      <Link to="/playground#debugging-arena" className="btn btn-gold">Today&apos;s bug</Link>
                    </div>
                  )}

                  {rows.length > 0 && (
                    <ol className="lb-list lb-list-compact">
                      {rows.slice(0, COMPACT_ROWS).map((row, i) => (
                        <li key={`${i}-${row.name}`}>
                          <button
                            type="button"
                            className={`lb-row ${row.isMe ? 'is-me' : ''}`}
                            onClick={() => setProfile(row)}
                            aria-label={`View ${row.name}'s profile, rank ${row.rank}`}
                          >
                            <span className="lb-rank">{MEDALS[row.rank] || `#${row.rank}`}</span>
                            <Avatar row={row} />
                            <span className="lb-who">
                              <strong>
                                {row.name}
                                {row.isMe && <span className="lb-you">You</span>}
                              </strong>
                              <span>{row.year}</span>
                            </span>
                            <span className="lb-metric">
                              <Metric sort={sort} row={row} />
                            </span>
                          </button>
                        </li>
                      ))}
                    </ol>
                  )}

                  <button type="button" className="lb-panel-more" onClick={() => switchBoard('students')}>
                    View full student board
                    {data?.totalPlayers > COMPACT_ROWS && ` (${data.totalPlayers} players)`}
                    <i className="bi bi-arrow-right" aria-hidden="true" />
                  </button>
                </section>

                <section className="lb-panel" aria-label="Open-source contributors">
                  <OpenSourceContributors compact />
                  <button type="button" className="lb-panel-more" onClick={() => switchBoard('opensource')}>
                    View full open-source board <i className="bi bi-arrow-right" aria-hidden="true" />
                  </button>
                </section>
              </div>

              <div id="rules">
                <Rules />
              </div>
            </>
          )}

          {board === 'students' && (
          <>
          {data && <Spotlight spotlight={data.spotlight} onOpen={setProfile} />}

          {/* Controls */}
          <div className="lb-controls">
            <div className="lb-tabs" role="tablist" aria-label="Rank by">
              <button
                type="button"
                role="tab"
                aria-selected={sort === 'xp'}
                className={sort === 'xp' ? 'active' : ''}
                onClick={() => setSort('xp')}
              >
                <i className="bi bi-trophy-fill" aria-hidden="true" /> Top XP
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={sort === 'streak'}
                className={sort === 'streak' ? 'active' : ''}
                onClick={() => setSort('streak')}
              >
                <i className="bi bi-fire" aria-hidden="true" /> Longest streak
              </button>
            </div>

            <YearDropdown value={year} onChange={setYear} />
          </div>

          {/* Your rank */}
          {data && (
            <div className="lb-me">
              {!data.signedIn ? (
                <>
                  <p>
                    <strong>Want to see your name here?</strong> Sign in, fix today&apos;s bug and start climbing.
                  </p>
                  <Link to="/login" className="btn btn-gold">Sign in</Link>
                </>
              ) : data.me ? (
                <>
                  <button type="button" className="lb-me-rank" onClick={() => setProfile(data.me)}>
                    <span>Your rank</span>
                    <strong>#{data.me.rank}</strong>
                    <small>of {data.totalPlayers} · view profile</small>
                  </button>
                  <div className="lb-me-stats">
                    <div><strong>{data.me.xp}</strong><span>XP</span></div>
                    <div><strong>{data.me.streak} 🔥</strong><span>streak</span></div>
                    <div><strong>{data.me.bestStreak}</strong><span>best streak</span></div>
                    <div><strong>{data.me.bugsFixed}</strong><span>bugs fixed</span></div>
                    <div><strong>{data.me.challengesSolved}</strong><span>challenges</span></div>
                  </div>
                  <Link to="/playground#debugging-arena" className="lb-me-cta">
                    Today&apos;s bug <i className="bi bi-arrow-right" aria-hidden="true" />
                  </Link>
                </>
              ) : (
                <>
                  <p>
                    <strong>You&apos;re not on the board yet.</strong> Fix today&apos;s bug or solve a challenge to get ranked.
                  </p>
                  <Link to="/playground#debugging-arena" className="btn btn-gold">Start now</Link>
                </>
              )}
            </div>
          )}

          {error && (
            <div className="lb-empty" role="alert">
              <p>{error}</p>
            </div>
          )}

          {loading && (
            <div className="lb-list" aria-busy="true">
              {Array.from({ length: 5 }, (_, i) => (
                <div key={i} className="lb-row lb-skeleton" />
              ))}
            </div>
          )}

          {data && rows.length === 0 && (
            <div className="lb-empty">
              <div className="lb-empty-emoji" aria-hidden="true">🏁</div>
              <h2>The race hasn&apos;t started yet</h2>
              <p>Be the first on the board: fix today&apos;s bug in the Playground.</p>
              <Link to="/playground#debugging-arena" className="btn btn-gold">Go to the Debugging Arena</Link>
            </div>
          )}

          {podium.length > 0 && <Podium rows={podium} sort={sort} onOpen={setProfile} />}

          {rest.length > 0 && (
            <ol className="lb-list">
              {rest.map((row, i) => (
                <li key={`${i}-${row.name}`}>
                  <button
                    type="button"
                    className={`lb-row ${row.isMe ? 'is-me' : ''}`}
                    onClick={() => setProfile(row)}
                    aria-label={`View ${row.name}'s profile, rank ${row.rank}`}
                  >
                    <span className="lb-rank">#{row.rank}</span>
                    <Avatar row={row} />
                    <span className="lb-who">
                      <strong>
                        {row.name}
                        {row.isMe && <span className="lb-you">You</span>}
                      </strong>
                      <span>{row.year}</span>
                    </span>
                    <span className="lb-detail">
                      <span title="Bugs fixed"><i className="bi bi-bug" aria-hidden="true" /> {row.bugsFixed}</span>
                      <span title="Challenges solved"><i className="bi bi-code-square" aria-hidden="true" /> {row.challengesSolved}</span>
                    </span>
                    <span className="lb-metric">
                      <Metric sort={sort} row={row} />
                    </span>
                  </button>
                </li>
              ))}
            </ol>
          )}

          {data && data.totalPlayers > rows.length && (
            <p className="lb-footnote">Showing the top {rows.length} of {data.totalPlayers} players.</p>
          )}

          <div id="rules">
            <Rules />
          </div>
          </>
          )}
        </div>
      </main>

      {profile && <ProfileModal row={profile} onClose={closeProfile} />}

      <Footer />
    </>
  );
};

export default Leaderboard;

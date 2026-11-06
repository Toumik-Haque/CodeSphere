import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { apiRequest } from '../lib/api';
import '../css/Leaderboard.css';

const YEARS = ['1st Year', '2nd Year', '3rd Year', '4th Year'];
const AVATAR_COLORS = ['#F05A36', '#2875A8', '#16A34A', '#7C3AED', '#D97706', '#0891B2', '#DB2777', '#4F46E5'];
const MEDALS = { 1: '🥇', 2: '🥈', 3: '🥉' };

function avatarColor(text) {
  let hash = 0;
  for (const char of text) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  return AVATAR_COLORS[hash % AVATAR_COLORS.length];
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

function Podium({ rows, sort }) {
  // Visual order: 2nd, 1st, 3rd.
  const order = [rows[1], rows[0], rows[2]].filter(Boolean);
  return (
    <div className="lb-podium">
      {order.map((row) => (
        <div
          key={`${row.rank}-${row.initials}-${row.name}`}
          className={`lb-podium-spot place-${row.rank} ${row.isMe ? 'is-me' : ''}`}
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
        </div>
      ))}
    </div>
  );
}

const Leaderboard = () => {
  const [sort, setSort] = useState('xp');
  const [year, setYear] = useState('');
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

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
          </header>

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

            <label className="lb-year">
              <i className="bi bi-mortarboard" aria-hidden="true" />
              <select value={year} onChange={(e) => setYear(e.target.value)} aria-label="Filter by year">
                <option value="">All years</option>
                {YEARS.map((y) => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </label>
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
                  <div className="lb-me-rank">
                    <span>Your rank</span>
                    <strong>#{data.me.rank}</strong>
                    <small>of {data.totalPlayers}</small>
                  </div>
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

          {podium.length > 0 && <Podium rows={podium} sort={sort} />}

          {rest.length > 0 && (
            <ol className="lb-list">
              {rest.map((row) => (
                <li key={`${row.rank}-${row.initials}-${row.name}`} className={`lb-row ${row.isMe ? 'is-me' : ''}`}>
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
                </li>
              ))}
            </ol>
          )}

          {data && data.totalPlayers > rows.length && (
            <p className="lb-footnote">Showing the top {rows.length} of {data.totalPlayers} players.</p>
          )}
        </div>
      </main>

      <Footer />
    </>
  );
};

export default Leaderboard;

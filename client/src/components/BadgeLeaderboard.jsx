import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiRequest } from '../lib/api';
import '../css/BadgeLeaderboard.css';

function LeaderboardRow({ member, currentUser = false }) {
  const content = (
    <>
      <span className="badge-leaderboard-rank">{member.rank}</span>
      {member.profileImage ? (
        <img className="badge-leaderboard-avatar" src={member.profileImage} alt="" />
      ) : (
        <span className="badge-leaderboard-avatar badge-leaderboard-avatar-fallback" aria-hidden="true">
          {member.name?.trim()?.[0]?.toUpperCase() || '?'}
        </span>
      )}
      <span className="badge-leaderboard-member">
        <strong>{member.name}{currentUser ? ' (You)' : ''}</strong>
        <small>{member.level?.emoji} {member.level?.name}</small>
      </span>
      <span className="badge-leaderboard-score">
        <strong>{member.xp.toLocaleString()}</strong>
        <small>XP · {member.badgeCount} badges</small>
      </span>
    </>
  );

  return member.username && !currentUser ? (
    <Link className={`badge-leaderboard-row${currentUser ? ' is-current-user' : ''}`} to={`/user/${encodeURIComponent(member.username)}`}>
      {content}
    </Link>
  ) : (
    <div className={`badge-leaderboard-row${currentUser ? ' is-current-user' : ''}`} aria-current={currentUser ? 'true' : undefined}>
      {content}
    </div>
  );
}

export default function BadgeLeaderboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadLeaderboard = async (signal) => {
    try {
      const result = await apiRequest('/badges/leaderboard', { signal });
      if (signal?.aborted) return;
      setData(result);
      setError('');
    } catch (loadError) {
      if (!signal?.aborted) {
        setError(loadError.message || 'Unable to load the leaderboard.');
      }
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  };

  useEffect(() => {
    const controller = new AbortController();
    let active = true;

    apiRequest('/badges/leaderboard', { signal: controller.signal })
      .then((result) => {
        if (active) {
          setData(result);
          setError('');
        }
      })
      .catch((loadError) => {
        if (active && !controller.signal.aborted) {
          setError(loadError.message || 'Unable to load the leaderboard.');
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
      controller.abort();
    };
  }, []);

  return (
    <aside className="badge-leaderboard" aria-labelledby="badge-leaderboard-title">
      <header className="badge-leaderboard-heading">
        <span className="badge-leaderboard-icon"><i className="bi bi-trophy" aria-hidden="true" /></span>
        <div>
          <h2 id="badge-leaderboard-title">Leaderboard</h2>
          <p>Ranked by XP, then badges</p>
        </div>
      </header>

      {loading ? (
        <div className="badge-leaderboard-state" role="status">
          <span className="dashboard-loading-spinner" />
          <span>Loading rankings...</span>
        </div>
      ) : error ? (
        <div className="badge-leaderboard-state is-error" role="alert">
          <span>{error}</span>
          <button
            type="button"
            className="badge-leaderboard-retry"
            onClick={() => {
              setLoading(true);
              loadLeaderboard();
            }}
          >
            Try again
          </button>
        </div>
      ) : data?.leaderboard?.length ? (
        <>
          <ol className="badge-leaderboard-list">
            {data.leaderboard.map((member) => (
              <li key={member.id}>
                <LeaderboardRow member={member} currentUser={member.isCurrentUser} />
              </li>
            ))}
          </ol>
          {data.currentUser && (
            <div className="badge-leaderboard-own-rank">
              <span className="badge-leaderboard-own-label">YOUR RANK</span>
              <LeaderboardRow member={data.currentUser} currentUser />
            </div>
          )}
        </>
      ) : (
        <p className="badge-leaderboard-state">No member rankings yet.</p>
      )}
    </aside>
  );
}

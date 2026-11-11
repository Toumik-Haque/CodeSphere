import { useEffect, useState } from 'react';
import { apiRequest } from '../lib/api';
import '../css/Badges.css';

const MAX_SHOWN = 12;

// Earned badges as small round icons (like GitHub achievements), shown on the
// profile card under the name. Pinned showcase badges come first.
// Pass `username` to show another member's badges read-only.
export default function BadgeStrip({ username }) {
  const [data, setData] = useState(null);
  const readOnly = Boolean(username);

  useEffect(() => {
    let cancelled = false;
    const path = username
      ? `/badges/username/${encodeURIComponent(username)}`
      : '/badges/me';

    apiRequest(path)
      .then((r) => !cancelled && setData(r))
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, [username]);

  if (!Array.isArray(data?.badges)) return null;
  const earned = readOnly
    ? [...data.badges]
    : data.badges.filter((b) => b.earned);
  const pinned = new Set(data.showcase || []);
  earned.sort((a, b) => (pinned.has(b.id) - pinned.has(a.id)) || new Date(b.earnedAt) - new Date(a.earnedAt));
  const shown = earned.slice(0, MAX_SHOWN);

  const openAll = () => {
    window.dispatchEvent(new Event('cs:open-progress'));
    document.getElementById('codesphere-progress')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const itemClass = (badge) =>
    `badge-strip-item ${pinned.has(badge.id) ? 'is-pinned' : ''}`;

  const badgeTitle = (badge) =>
    badge.how ? `${badge.name}: ${badge.how}` : badge.name;

  return (
    <div className="badge-strip">
      <div className="badge-strip-head">
        <span>Community Badges</span>
        {readOnly ? (
          <span className="badge-strip-count">{earned.length}/{data.totalCount}</span>
        ) : (
          <button type="button" onClick={openAll}>{earned.length}/{data.totalCount}</button>
        )}
      </div>
      {earned.length === 0 ? (
        <p className="badge-strip-empty">
          {readOnly
            ? 'No badges earned yet.'
            : 'Fix today\u2019s bug to earn your first badge.'}
        </p>
      ) : (
        <ul>
          {shown.map((b) => (
            <li key={b.id}>
              {readOnly ? (
                <span
                  className={itemClass(b)}
                  title={badgeTitle(b)}
                  aria-label={b.name}
                  role="img"
                >
                  <span aria-hidden="true">{b.emoji}</span>
                </span>
              ) : (
                <button
                  type="button"
                  className={itemClass(b)}
                  title={badgeTitle(b)}
                  aria-label={b.name}
                  onClick={openAll}
                >
                  <span aria-hidden="true">{b.emoji}</span>
                </button>
              )}
            </li>
          ))}
          {earned.length > MAX_SHOWN && (
            <li>
              {readOnly ? (
                <span
                  className="badge-strip-item more"
                  title={`${earned.length - MAX_SHOWN} more achievements`}
                >
                  +{earned.length - MAX_SHOWN}
                </span>
              ) : (
                <button type="button" className="badge-strip-item more" onClick={openAll}>
                  +{earned.length - MAX_SHOWN}
                </button>
              )}
            </li>
          )}
        </ul>
      )}
    </div>
  );
}

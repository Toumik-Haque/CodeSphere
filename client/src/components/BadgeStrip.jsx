import { useEffect, useState } from 'react';
import { apiRequest } from '../lib/api';

const MAX_SHOWN = 12;

// Earned badges as small round icons (like GitHub achievements), shown on the
// profile card under the name. Pinned showcase badges come first.
export default function BadgeStrip() {
  const [data, setData] = useState(null);

  useEffect(() => {
    let cancelled = false;
    apiRequest('/badges/me').then((r) => !cancelled && setData(r)).catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  if (!data) return null;
  const earned = data.badges.filter((b) => b.earned);
  const pinned = new Set(data.showcase || []);
  earned.sort((a, b) => (pinned.has(b.id) - pinned.has(a.id)) || new Date(b.earnedAt) - new Date(a.earnedAt));
  const shown = earned.slice(0, MAX_SHOWN);

  const openAll = () => {
    window.dispatchEvent(new Event('cs:open-progress'));
    document.getElementById('codesphere-progress')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <div className="badge-strip">
      <div className="badge-strip-head">
        <span>Achievements</span>
        <button type="button" onClick={openAll}>{earned.length}/{data.totalCount}</button>
      </div>
      {earned.length === 0 ? (
        <p className="badge-strip-empty">Fix today&apos;s bug to earn your first badge.</p>
      ) : (
        <ul>
          {shown.map((b) => (
            <li key={b.id}>
              <button
                type="button"
                className={`badge-strip-item ${pinned.has(b.id) ? 'is-pinned' : ''}`}
                title={b.how ? `${b.name}: ${b.how}` : b.name}
                aria-label={b.name}
                onClick={openAll}
              >
                <span aria-hidden="true">{b.emoji}</span>
              </button>
            </li>
          ))}
          {earned.length > MAX_SHOWN && (
            <li><button type="button" className="badge-strip-item more" onClick={openAll}>+{earned.length - MAX_SHOWN}</button></li>
          )}
        </ul>
      )}
    </div>
  );
}

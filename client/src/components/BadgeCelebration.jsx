import { useEffect, useState } from 'react';
import { onBadgesEarned } from '../lib/badges';
import '../css/Badges.css';

// Site-wide "🎉 New badge!" toasts. Mounted once in App.
export default function BadgeCelebration() {
  const [queue, setQueue] = useState([]);

  useEffect(() => onBadgesEarned((badges) => {
    const stamp = Date.now();
    setQueue((q) => [...q, ...badges.map((b, i) => ({ ...b, key: `${b.id}-${stamp}-${i}` }))]);
  }), []);

  // Each toast stays ~4.5s; they leave one after another.
  useEffect(() => {
    if (!queue.length) return undefined;
    const id = window.setTimeout(() => setQueue((q) => q.slice(1)), 4500);
    return () => window.clearTimeout(id);
  }, [queue]);

  if (!queue.length) return null;

  return (
    <div className="badge-toasts" role="status" aria-live="polite">
      {queue.slice(0, 3).map((badge) => (
        <div className="badge-toast" key={badge.key}>
          <span className="badge-toast-emoji" aria-hidden="true">{badge.emoji}</span>
          <span>
            <small>🎉 New badge unlocked!</small>
            <strong>{badge.name}</strong>
          </span>
          <button
            type="button"
            aria-label="Dismiss"
            onClick={() => setQueue((q) => q.filter((b) => b.key !== badge.key))}
          >
            <i className="bi bi-x-lg" aria-hidden="true" />
          </button>
        </div>
      ))}
    </div>
  );
}

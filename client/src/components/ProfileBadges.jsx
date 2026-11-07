import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiRequest } from '../lib/api';
import { celebrateBadges, loadBadgeCatalog, TIER_LABELS } from '../lib/badges';
import '../css/Badges.css';

const TYPE_TAGS = {
  self: { label: 'Self-reported', icon: 'bi-person-check' },
  admin: { label: 'Awarded by admins', icon: 'bi-award' },
  'coming-soon': { label: 'Coming soon', icon: 'bi-hourglass-split' },
};

// Remember open/closed sections in this browser.
function useStoredToggle(key, initial = false) {
  const [open, setOpen] = useState(() => {
    try {
      const v = localStorage.getItem(key);
      return v === null ? initial : v === '1';
    } catch {
      return initial;
    }
  });
  const toggle = (next) => setOpen((cur) => {
    const value = typeof next === 'boolean' ? next : !cur;
    try {
      localStorage.setItem(key, value ? '1' : '0');
    } catch {
      /* ignore */
    }
    return value;
  });
  return [open, toggle];
}

function formatDate(date) {
  return new Date(date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

function BadgeTile({ badge, onOpen, picking, pinned }) {
  const progress = badge.progress;
  const percent = progress ? Math.round((progress.current / progress.target) * 100) : 0;
  const state = badge.earned ? 'earned' : badge.type === 'coming-soon' ? 'soon' : 'locked';

  return (
    <button
      type="button"
      className={`bdg-tile is-${state} ${badge.tier ? `tier-${badge.tier}` : ''} ${pinned ? 'is-pinned' : ''}`}
      onClick={() => onOpen(badge)}
      aria-label={`${badge.name}: ${badge.earned ? 'earned' : 'locked'}. ${badge.how}`}
      aria-pressed={picking ? pinned : undefined}
    >
      {pinned && <span className="bdg-pin" aria-hidden="true"><i className="bi bi-pin-angle-fill" /></span>}
      <span className="bdg-emoji" aria-hidden="true">{badge.earned ? badge.emoji : state === 'soon' ? '🔜' : '🔒'}</span>
      <strong>{badge.name}</strong>
      {badge.earned ? (
        <small>{formatDate(badge.earnedAt)}</small>
      ) : progress ? (
        <>
          <span className="bdg-bar" aria-hidden="true"><span style={{ width: `${percent}%` }} /></span>
          <small>{progress.current}/{progress.target}</small>
        </>
      ) : (
        <small>{TYPE_TAGS[badge.type]?.label || 'Locked'}</small>
      )}
    </button>
  );
}

function BadgeDetail({ badge, onClose, canPin, pinned, onTogglePin }) {
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const tag = TYPE_TAGS[badge.type];

  return (
    <div className="bdg-modal-backdrop" onClick={onClose} role="presentation">
      <div className="bdg-modal" role="dialog" aria-modal="true" aria-labelledby="bdg-modal-title" onClick={(e) => e.stopPropagation()}>
        <button type="button" className="bdg-modal-close" onClick={onClose} aria-label="Close">
          <i className="bi bi-x-lg" aria-hidden="true" />
        </button>
        <span className={`bdg-modal-emoji ${badge.earned ? '' : 'is-locked'}`} aria-hidden="true">{badge.emoji}</span>
        <h3 id="bdg-modal-title">{badge.name}</h3>
        <div className="bdg-modal-tags">
          {badge.tier && <span className={`bdg-tag tier-${badge.tier}`}>{TIER_LABELS[badge.tier]}</span>}
          {tag && <span className="bdg-tag"><i className={`bi ${tag.icon}`} aria-hidden="true" /> {tag.label}</span>}
        </div>
        <p>{badge.how}</p>

        {badge.earned ? (
          <p className="bdg-modal-earned">
            <i className="bi bi-check-circle-fill" aria-hidden="true" /> Earned on {formatDate(badge.earnedAt)}
            {badge.note && <span>“{badge.note}”</span>}
          </p>
        ) : badge.progress ? (
          <div className="bdg-modal-progress">
            <span className="bdg-bar"><span style={{ width: `${(badge.progress.current / badge.progress.target) * 100}%` }} /></span>
            <small>{badge.progress.current} of {badge.progress.target}. Keep going!</small>
          </div>
        ) : null}

        {badge.earned && canPin && (
          <button type="button" className="bdg-modal-pin" onClick={() => onTogglePin(badge.id)}>
            <i className={`bi ${pinned ? 'bi-pin-angle' : 'bi-pin-angle-fill'}`} aria-hidden="true" />
            {pinned ? 'Unpin from showcase' : 'Pin to showcase'}
          </button>
        )}
      </div>
    </div>
  );
}

export default function ProfileBadges({
  preview = false,
  completion = 0,
  compact = false,
}) {
  const [data, setData] = useState(null);
  const [catalog, setCatalog] = useState(null);
  const [error, setError] = useState('');
  const [group, setGroup] = useState('all');
  const [open, setOpen] = useState(null);
  const [showcase, setShowcase] = useState([]);
  const [saving, setSaving] = useState(false);
  const [expanded, setExpanded] = useStoredToggle('cs_profile_progress_open', false);

  // The badge strip on the profile card can ask this section to open.
  useEffect(() => {
    const openUp = () => setExpanded(true);
    window.addEventListener('cs:open-progress', openUp);
    return () => window.removeEventListener('cs:open-progress', openUp);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (preview) return undefined;
    let cancelled = false;
    Promise.all([apiRequest('/badges/me'), loadBadgeCatalog()])
      .then(([me, cat]) => {
        if (cancelled) return;
        setData(me);
        setCatalog(cat);
        setShowcase(me.showcase);
        // Celebrate badges earned while away (e.g. event attendance).
        if (me.unseen.length) {
          celebrateBadges(me.unseen);
          apiRequest('/badges/me/seen', { method: 'POST' }).catch(() => {});
        }
      })
      .catch((err) => !cancelled && setError(err.message));
    return () => {
      cancelled = true;
    };
  }, [preview]);

  // Report a 100% profile once; profile completion is persisted on the user.
  useEffect(() => {
    if (preview || !data || completion < 100 || data.stats.profileComplete) return;
    apiRequest('/badges/me/profile-complete', { method: 'POST', body: JSON.stringify({ complete: true }) })
      .then(({ newBadges }) => {
        celebrateBadges(newBadges);
        return apiRequest('/badges/me');
      })
      .then((me) => setData(me))
      .catch(() => {});
  }, [preview, data, completion]);

  const badges = useMemo(() => data?.badges || [], [data]);
  const recent = useMemo(
    () => badges.filter((b) => b.earned).sort((a, b) => new Date(b.earnedAt) - new Date(a.earnedAt)).slice(0, 3),
    [badges],
  );
  const shown = group === 'all' ? badges : badges.filter((b) => b.group === group);
  const maxShowcase = catalog?.maxShowcase || 3;

  const togglePin = async (id) => {
    const next = showcase.includes(id)
      ? showcase.filter((x) => x !== id)
      : [...showcase, id].slice(-maxShowcase);
    setShowcase(next);
    setSaving(true);
    try {
      const result = await apiRequest('/badges/me/showcase', { method: 'PUT', body: JSON.stringify({ badgeIds: next }) });
      setShowcase(result.showcase);
    } catch {
      setShowcase(showcase);
    } finally {
      setSaving(false);
    }
  };

  if (preview) {
    return (
      <section className="bdg-section bdg-section-empty">
        <h2><i className="bi bi-award" aria-hidden="true" /> CodeSphere progress</h2>
        <p>Badges, levels and XP appear here for signed-in students.</p>
      </section>
    );
  }

  if (error) {
    return (
      <section className="bdg-section bdg-section-empty" role="alert">
        <h2><i className="bi bi-award" aria-hidden="true" /> CodeSphere progress</h2>
        <p>{error}</p>
      </section>
    );
  }

  if (!data || !catalog) {
    return <section className="bdg-section bdg-skeleton" aria-busy="true" />;
  }

  const { stats, level } = data;
  const byId = new Map(badges.map((b) => [b.id, b]));
  if (compact) {
    return (
      <Link
        to="/user/milestone"
        className="bdg-overview-link"
        aria-label={`View My Badges. Current level ${level.name}; ${data.earnedCount} of ${data.totalCount} badges earned.`}
      >
        <section className="bdg-overview-preview">
          <div className="bdg-hero">
            <div className="bdg-overview-heading">
              <span className="bdg-kicker">BADGE PROGRESS</span>
              <span className="bdg-overview-view">View My Badges <i className="bi bi-arrow-up-right" aria-hidden="true" /></span>
            </div>
            <div className="bdg-level">
              <span className="bdg-level-emoji" aria-hidden="true">{level.emoji}</span>
              <div>
                <h2>{level.name}</h2>
                <div className="bdg-xp">
                  <span className="bdg-bar bdg-bar-lg" aria-hidden="true">
                    <span style={{ width: `${Math.round(level.progress * 100)}%` }} />
                  </span>
                  <small>
                    {level.next
                      ? <>{stats.xp} / {level.next.minXp} XP → {level.next.emoji} {level.next.name}</>
                      : <>{stats.xp} XP · Highest level reached 👑</>}
                  </small>
                </div>
              </div>
            </div>
            <div className="bdg-overview-stats">
              <span><strong>{data.earnedCount}/{data.totalCount}</strong> badges earned</span>
              <span><strong>{stats.eventsAttended}</strong> events attended</span>
              <span><strong>{stats.bestStreak}</strong> best streak</span>
            </div>
            {recent.length > 0 && (
              <div className="bdg-overview-recent" aria-label="Recently earned badges">
                {recent.map((badge) => (
                  <span className="bdg-overview-badge" key={badge.id}>
                    <span aria-hidden="true">{badge.emoji}</span> {badge.name}
                  </span>
                ))}
              </div>
            )}
          </div>
        </section>
      </Link>
    );
  }

  const groupCounts = Object.fromEntries(catalog.groups.map((g) => {
    const inGroup = badges.filter((b) => b.group === g.id);
    return [g.id, `${inGroup.filter((b) => b.earned).length}/${inGroup.length}`];
  }));

  if (!expanded) {
    return (
      <section className="bdg-section bdg-compact" id="codesphere-progress" aria-labelledby="bdg-title">
        <button type="button" className="bdg-compact-bar" onClick={() => setExpanded(true)} aria-expanded="false">
          <span className="bdg-compact-emoji" aria-hidden="true">{level.emoji}</span>
          <span className="bdg-compact-main">
            <span className="bdg-kicker">CODESPHERE PROFILE</span>
            <strong id="bdg-title">{level.name}</strong>
            <span className="bdg-bar" aria-hidden="true"><span style={{ width: `${Math.round(level.progress * 100)}%` }} /></span>
          </span>
          <span className="bdg-compact-stats">
            <span><strong>{stats.xp}</strong> XP</span>
            <span><strong>{data.earnedCount}/{data.totalCount}</strong> 🏅</span>
            <span><strong>{stats.bestStreak}</strong> 🔥</span>
          </span>
          <span className="bdg-compact-toggle">Show details <i className="bi bi-chevron-down" aria-hidden="true" /></span>
        </button>
      </section>
    );
  }

  return (
    <section className="bdg-section" id="codesphere-progress" aria-labelledby="bdg-title">
      {/* Level + XP */}
      <div className="bdg-hero">
        <button type="button" className="bdg-collapse" onClick={() => setExpanded(false)} aria-expanded="true">
          Hide details <i className="bi bi-chevron-up" aria-hidden="true" />
        </button>
        <div className="bdg-level">
          <span className="bdg-level-emoji" aria-hidden="true">{level.emoji}</span>
          <div>
            <span className="bdg-kicker">CODESPHERE PROFILE</span>
            <h2 id="bdg-title">{level.name}</h2>
            <div className="bdg-xp">
              <span className="bdg-bar bdg-bar-lg" aria-hidden="true">
                <span style={{ width: `${Math.round(level.progress * 100)}%` }} />
              </span>
              <small>
                {level.next
                  ? <>{stats.xp} / {level.next.minXp} XP → {level.next.emoji} {level.next.name}</>
                  : <>{stats.xp} XP · Highest level reached 👑</>}
              </small>
            </div>
          </div>
        </div>

        <div className="bdg-stats">
          <div><strong>{stats.bugsFixed}</strong><span>🐞 bugs fixed</span></div>
          <div><strong>{stats.challengesSolved}</strong><span>💻 challenges</span></div>
          <div><strong>{stats.reverseSolved}</strong><span>🔄 reverse solved</span></div>
          <div><strong>{stats.eventsAttended}</strong><span>🎟️ events</span></div>
          <div><strong>{stats.bestStreak}</strong><span>🔥 best streak</span></div>
          <div><strong>{data.earnedCount}/{data.totalCount}</strong><span>🏅 badges</span></div>
        </div>

        <p className="bdg-gentle">
          <i className="bi bi-heart-fill" aria-hidden="true" /> Every day you code counts. Missed a day? No problem: badges are never taken away.
        </p>
      </div>

      {/* Showcase + recent */}
      <div className="bdg-row">
        <div className="bdg-panel">
          <h3>
            <i className="bi bi-pin-angle-fill" aria-hidden="true" /> Showcase
            <small>{saving ? 'Saving…' : `${showcase.length}/${maxShowcase} · shown on the leaderboard`}</small>
          </h3>
          {showcase.length ? (
            <div className="bdg-showcase">
              {showcase.map((id) => byId.get(id)).filter(Boolean).map((badge) => (
                <button type="button" key={badge.id} className="bdg-chip" onClick={() => setOpen(badge)}>
                  <span aria-hidden="true">{badge.emoji}</span> {badge.name}
                </button>
              ))}
            </div>
          ) : (
            <p className="bdg-muted">Open any earned badge and choose &quot;Pin to showcase&quot;.</p>
          )}
        </div>

        <div className="bdg-panel">
          <h3><i className="bi bi-stars" aria-hidden="true" /> Recently earned</h3>
          {recent.length ? (
            <div className="bdg-showcase">
              {recent.map((badge) => (
                <button type="button" key={badge.id} className="bdg-chip" onClick={() => setOpen(badge)}>
                  <span aria-hidden="true">{badge.emoji}</span> {badge.name}
                  <small>{formatDate(badge.earnedAt)}</small>
                </button>
              ))}
            </div>
          ) : (
            <p className="bdg-muted">
              No badges yet. <Link to="/playground#debugging-arena">Fix today&apos;s bug</Link> to earn your first!
            </p>
          )}
        </div>
      </div>

      {/* All badges */}
      <div className="bdg-tabs" role="tablist" aria-label="Badge groups">
        <button type="button" role="tab" aria-selected={group === 'all'} className={group === 'all' ? 'active' : ''} onClick={() => setGroup('all')}>
          <i className="bi bi-grid" aria-hidden="true" /> All <small>{data.earnedCount}/{badges.length}</small>
        </button>
        {catalog.groups.map((g) => (
          <button key={g.id} type="button" role="tab" aria-selected={group === g.id} className={group === g.id ? 'active' : ''} onClick={() => setGroup(g.id)}>
            <i className={`bi ${g.icon}`} aria-hidden="true" /> {g.label} <small>{groupCounts[g.id]}</small>
          </button>
        ))}
      </div>

      <div className="bdg-grid">
        {shown.map((badge) => (
          <BadgeTile key={badge.id} badge={badge} onOpen={setOpen} pinned={showcase.includes(badge.id)} />
        ))}
      </div>

      {open && (
        <BadgeDetail
          badge={open}
          onClose={() => setOpen(null)}
          canPin
          pinned={showcase.includes(open.id)}
          onTogglePin={togglePin}
        />
      )}
    </section>
  );
}

import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiRequest } from '../lib/api';
import '../css/ExplorePlatform.css';

// Landing page map of everything on CodeSphere: a 3D "solar system" where each
// orbiting planet is a level (Learn, Build, Compete, Connect). Picking a planet
// (or a tab) shows that level's features with live counts.
const LEVELS = [
  {
    id: 'learn',
    name: 'Learn',
    color: '#4fb3ff',
    icon: 'bi-book-half',
    tagline: 'Pick up a skill',
    blurb: 'Guides, a browser playground and a daily tech digest to keep you sharp.',
    reward: 'Scholar badges',
    quests: [
      { title: 'Study Materials', text: 'Curated guides and roadmaps', icon: 'bi-journal-bookmark', to: '/materials', stat: 'guides', unit: 'guides' },
      { title: 'Playground', text: 'Run 70+ languages, zero installs', icon: 'bi-terminal', to: '/playground' },
      { title: 'Guided Projects', text: 'Build real apps step by step', icon: 'bi-signpost-split', to: '/projects', stat: 'guidedProjects', unit: 'paths' },
      { title: 'Tech News', text: 'The day in tech, in minutes', icon: 'bi-newspaper', to: '/news', stat: 'digests', unit: 'digests' },
    ],
  },
  {
    id: 'build',
    name: 'Build',
    color: '#ff8568',
    icon: 'bi-hammer',
    tagline: 'Ship something real',
    blurb: 'Show off your projects, find teammates and make your first open-source pull request.',
    reward: 'Builder badges',
    quests: [
      { title: 'Project Hub', text: 'Showcase work, find teammates', icon: 'bi-kanban', to: '/projects', stat: 'projects', unit: 'projects' },
      { title: 'Open Source', text: 'Your first PR, guided', icon: 'bi-git', to: '/open-source' },
      { title: 'Host on CodeSphere', text: 'Run an event or a challenge', icon: 'bi-megaphone', to: '/host' },
    ],
  },
  {
    id: 'compete',
    name: 'Compete',
    color: '#b69cff',
    icon: 'bi-trophy',
    tagline: 'Test your skills',
    blurb: 'Squash a bug every day, crack reverse-coding puzzles and climb the leaderboard.',
    reward: 'XP, streaks & badges',
    quests: [
      { title: "Today's Bug", text: 'One bug a day, keep the streak', icon: 'bi-bug', to: '/playground#debugging-arena', stat: 'bugsSolved', unit: 'fixes' },
      { title: 'Reverse Coding', text: 'Guess the code from the output', icon: 'bi-arrow-repeat', to: '/reverse-coding', stat: 'challenges', unit: 'puzzles' },
      { title: 'Hackathons', text: 'Ours and the best ones outside', icon: 'bi-lightning-charge', to: '/hackathons', stat: 'hackathons', unit: 'listed' },
      { title: 'Leaderboard', text: 'XP, streaks and badges', icon: 'bi-bar-chart-steps', to: '/leaderboard', stat: 'badges', unit: 'badges won' },
    ],
  },
  {
    id: 'connect',
    name: 'Connect',
    color: '#3ddc97',
    icon: 'bi-people',
    tagline: 'Find your people',
    blurb: 'Meet developers at events, ask anything in the forum and get to know the team.',
    reward: 'Community badges',
    quests: [
      { title: 'Events', text: 'Workshops, talks and meetups', icon: 'bi-calendar-event', to: '/events', stat: 'upcomingEvents', unit: 'upcoming' },
      { title: 'Forum', text: 'Ask, answer, share', icon: 'bi-chat-square-text', to: '/forum', stat: 'threads', unit: 'threads' },
      { title: 'Core Team', text: 'The people behind CodeSphere', icon: 'bi-stars', to: '/team' },
    ],
  },
];

// Headline numbers; ones that are zero are left out.
const HEADLINE = [
  { key: 'challenges', label: 'Coding puzzles', icon: 'bi-puzzle' },
  { key: 'hackathons', label: 'Hackathons listed', icon: 'bi-lightning-charge' },
  { key: 'guides', label: 'Study guides', icon: 'bi-journal-bookmark' },
  { key: 'guidedProjects', label: 'Guided projects', icon: 'bi-signpost-split' },
  { key: 'members', label: 'Members', icon: 'bi-people' },
  { key: 'badges', label: 'Badges earned', icon: 'bi-award' },
];

const reducedMotion = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

function CountUp({ value }) {
  const [shown, setShown] = useState(0);
  const ref = useRef(null);
  const still = reducedMotion();

  useEffect(() => {
    const node = ref.current;
    if (!node || still) return undefined;
    let frame;
    const observer = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return;
      observer.disconnect();
      const start = performance.now();
      const tick = (time) => {
        const progress = Math.min(1, (time - start) / 1400);
        setShown(Math.round(value * (1 - (1 - progress) ** 3)));
        if (progress < 1) frame = requestAnimationFrame(tick);
      };
      frame = requestAnimationFrame(tick);
    });
    observer.observe(node);
    return () => {
      observer.disconnect();
      cancelAnimationFrame(frame);
    };
  }, [value, still]);

  return <span ref={ref}>{(still ? value : shown).toLocaleString('en-IN')}</span>;
}

// The 3D scene. three.js is loaded only when this mounts; if WebGL is
// unavailable the stage falls back to a CSS orbit drawing.
function OrbitStage({ active, onPick }) {
  const canvasRef = useRef(null);
  const labelRefs = useRef([]);
  const sceneRef = useRef(null);
  const activeRef = useRef(active);
  const pickRef = useRef(onPick);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    pickRef.current = onPick;
  }, [onPick]);

  useEffect(() => {
    let cancelled = false;
    import('./exploreScene')
      .then(({ createExploreScene }) => {
        if (cancelled || !canvasRef.current) return;
        sceneRef.current = createExploreScene(canvasRef.current, {
          colors: LEVELS.map((level) => level.color),
          labels: labelRefs.current,
          active: activeRef.current,
          onPick: (index) => pickRef.current(index),
          still: reducedMotion(),
        });
      })
      .catch((error) => {
        console.error('3D scene unavailable:', error);
        if (!cancelled) setFailed(true);
      });
    return () => {
      cancelled = true;
      sceneRef.current?.dispose();
      sceneRef.current = null;
    };
  }, []);

  useEffect(() => {
    activeRef.current = active;
    sceneRef.current?.setActive(active);
  }, [active]);

  return (
    <div className={`explore-stage ${failed ? 'is-fallback' : ''}`}>
      <canvas ref={canvasRef} aria-hidden="true" />
      {LEVELS.map((level, index) => (
        <button
          key={level.id}
          ref={(node) => { labelRefs.current[index] = node; }}
          type="button"
          className={`explore-planet-label ${index === active ? 'is-active' : ''}`}
          style={{ '--accent': level.color }}
          onClick={() => onPick(index)}
          tabIndex={-1}
          aria-hidden="true"
        >
          {level.name}
        </button>
      ))}
      <span className="explore-stage-hint"><i className="bi bi-hand-index" aria-hidden="true" /> Tap a planet</span>
    </div>
  );
}

export default function ExplorePlatform() {
  const [active, setActive] = useState(0);
  const [stats, setStats] = useState({});
  const tabRefs = useRef([]);

  useEffect(() => {
    apiRequest('/stats/landing').then((r) => setStats(r.stats || {})).catch(() => {});
  }, []);

  const level = LEVELS[active];
  const headline = HEADLINE.filter((h) => stats[h.key] > 0).slice(0, 4);

  // Arrow keys move between the level tabs.
  const onKeyDown = (event) => {
    const step = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[event.key];
    if (!step) return;
    event.preventDefault();
    const next = (active + step + LEVELS.length) % LEVELS.length;
    setActive(next);
    tabRefs.current[next]?.focus();
  };

  return (
    <section className="explore" aria-labelledby="explore-title">
      <div className="container">
        <div className="explore-space" style={{ '--accent': level.color }}>
          <div className="explore-aurora" aria-hidden="true"><span /><span /><span /></div>

          <header className="explore-head">
            <span className="explore-eyebrow"><i className="bi bi-stars" aria-hidden="true" /> Explore the universe</span>
            <h2 id="explore-title">Choose your path. <span>Level up.</span></h2>
            <p>Four worlds, one community. Pick a planet to see what&apos;s waiting there.</p>
          </header>

          <div className="explore-grid">
            <OrbitStage active={active} onPick={setActive} />

            <div className="explore-side">
              <div className="explore-tabs" role="tablist" aria-label="Levels" onKeyDown={onKeyDown}>
                {LEVELS.map((item, index) => (
                  <button
                    key={item.id}
                    ref={(node) => { tabRefs.current[index] = node; }}
                    type="button"
                    role="tab"
                    id={`explore-tab-${item.id}`}
                    aria-selected={index === active}
                    aria-controls="explore-quests"
                    tabIndex={index === active ? 0 : -1}
                    className={`explore-tab ${index === active ? 'is-active' : ''}`}
                    style={{ '--tab': item.color }}
                    onClick={() => setActive(index)}
                  >
                    <i className={`bi ${item.icon}`} aria-hidden="true" />
                    <span>{item.name}</span>
                  </button>
                ))}
              </div>

              <div
                className="explore-level-card"
                id="explore-quests"
                role="tabpanel"
                aria-labelledby={`explore-tab-${level.id}`}
                key={level.id}
              >
                <div className="explore-level-top">
                  <span className="explore-level-num">0{active + 1}</span>
                  <div>
                    <span className="explore-level-tag">{level.tagline}</span>
                    <p>{level.blurb}</p>
                  </div>
                </div>

                <ul className="explore-quests">
                  {level.quests.map((quest, index) => (
                    <li key={quest.title} style={{ '--delay': `${index * 70}ms` }}>
                      <Link to={quest.to} className="explore-quest">
                        <span className="explore-quest-icon"><i className={`bi ${quest.icon}`} aria-hidden="true" /></span>
                        <span className="explore-quest-text">
                          <strong>{quest.title}</strong>
                          <span>{quest.text}</span>
                        </span>
                        {quest.stat && stats[quest.stat] > 0 ? (
                          <span className="explore-quest-chip">{stats[quest.stat].toLocaleString('en-IN')} {quest.unit}</span>
                        ) : (
                          <i className="bi bi-arrow-up-right explore-quest-go" aria-hidden="true" />
                        )}
                      </Link>
                    </li>
                  ))}
                </ul>

                <div className="explore-reward">
                  <i className="bi bi-gem" aria-hidden="true" />
                  <span>Rewards here: <strong>{level.reward}</strong></span>
                  <div className="explore-reward-bar"><span style={{ width: `${((active + 1) / LEVELS.length) * 100}%` }} /></div>
                </div>
              </div>
            </div>
          </div>

          {headline.length > 0 && (
            <dl className="explore-stats">
              {headline.map((item) => (
                <div key={item.key}>
                  <i className={`bi ${item.icon}`} aria-hidden="true" />
                  <dt>{item.label}</dt>
                  <dd><CountUp value={stats[item.key]} /></dd>
                </div>
              ))}
            </dl>
          )}
        </div>
      </div>
    </section>
  );
}

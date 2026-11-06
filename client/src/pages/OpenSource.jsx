
import { useEffect, useMemo, useState } from 'react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import '../css/OpenSource.css';

const GITHUB_REPO = 'https://github.com/Toumik-Haque/CodeSphere';

const programs = [
  {
    id: 'gsoc',
    number: '01',
    shortName: 'GSoC',
    name: 'Google Summer of Code',
    category: 'GLOBAL MENTORSHIP PROGRAM',
    tone: 'blue',
    icon: 'bi-google',
    description:
      'A global program that brings new contributors into open-source software development through real projects and experienced mentors.',
    intro:
      'GSoC is a proposal-driven program. Explore participating organizations, understand their projects, connect with mentors, and prepare a thoughtful proposal.',
    steps: [
      'Explore the participating organizations and shortlist projects that match your interests.',
      'Read the project ideas and understand the expected skills and deliverables.',
      'Join the organization community and introduce yourself to potential mentors.',
      'Discuss your approach and prepare a clear project proposal.',
      'Submit your proposal and follow the official program timeline.',
    ],
    resources: [
      { label: 'Official website', url: 'https://summerofcode.withgoogle.com/' },
      { label: 'How it works', url: 'https://summerofcode.withgoogle.com/how-it-works' },
      { label: 'Get started', url: 'https://summerofcode.withgoogle.com/get-started' },
    ],
  },
  {
    id: 'jwoc',
    number: '02',
    shortName: 'JWoC',
    name: 'JGEC Winter of Code',
    category: 'COMMUNITY-DRIVEN PROGRAM',
    tone: 'cyan',
    icon: 'bi-snow2',
    description:
      'A winter open-source initiative that encourages students to collaborate, learn development workflows and contribute to real projects.',
    intro:
      'JWoC is a practical opportunity to learn by contributing. Follow the official announcements for the current season, project list and contribution rules.',
    steps: [
      'Visit the official website and read the current season announcements.',
      'Explore the participating projects and choose one that interests you.',
      'Set up the project locally and understand its contribution guidelines.',
      'Start with a suitable issue and discuss your approach with maintainers.',
      'Submit clean pull requests and follow the program leaderboard and updates.',
    ],
    resources: [
      { label: 'Official website', url: 'https://www.jwoc.in/' },
      { label: 'JWoC GitHub', url: 'https://github.com/JWoC' },
    ],
  },
  {
    id: 'gssoc',
    number: '03',
    shortName: 'GSSoC',
    name: 'GirlScript Summer of Code',
    category: 'OPEN-SOURCE INITIATIVE',
    tone: 'pink',
    icon: 'bi-code-slash',
    description:
      'A collaborative open-source program where contributors learn through issues, pull requests and working with project communities.',
    intro:
      'Use the official guide to understand the contribution workflow, project expectations and program rules. Always check the latest season announcements.',
    steps: [
      'Read the official open-source guide and program announcements.',
      'Explore the available projects and select one that fits your skills.',
      'Read the repository README and contribution guidelines carefully.',
      'Find an issue, communicate with the maintainers and work on a solution.',
      'Submit your pull request and respond constructively to review feedback.',
    ],
    resources: [
      { label: 'Official website', url: 'https://gssoc.girlscript.org/' },
      { label: 'Open-source guide', url: 'https://gssoc.girlscript.org/open-source-guide' },
      { label: 'GitHub organization', url: 'https://github.com/GSSoC26' },
    ],
  },
  {
    id: 'swoc',
    number: '04',
    shortName: 'SWoC',
    name: 'Social Winter of Code',
    category: 'WINTER CONTRIBUTION PROGRAM',
    tone: 'purple',
    icon: 'bi-people',
    description:
      'A winter contribution program designed to help students gain practical experience by collaborating on open-source projects.',
    intro:
      'Follow the official website for season dates, registration, project selection and scoring guidelines. Review the rules before making contributions.',
    steps: [
      'Check the official website for the latest season details and registration.',
      'Browse the projects and identify a repository you want to contribute to.',
      'Understand the project setup, issue labels and contribution guidelines.',
      'Work on an issue and submit a well-documented pull request.',
      'Track reviews, improve your contribution and follow the official scoring rules.',
    ],
    resources: [
      { label: 'Official website', url: 'https://www.swoc.in/' },
      { label: 'Contribution guidelines', url: 'https://woc.codesocial.tech/guidelines' },
    ],
  },
];

// More places to contribute, by experience level. (GSoC, JWoC, GSSoC and
// SWoC are featured with full guides in the programs section above.)
const LEVELS = [
  {
    id: 'beginner',
    label: 'Beginner',
    tagline: 'Find your first contribution',
    icon: 'bi-flower1',
    platforms: [
      { name: 'First Contributions', url: 'https://github.com/firstcontributions/first-contributions', icon: 'bi-signpost-split', description: 'A practice repo that walks you through fork, clone, branch and your first pull request.' },
      { name: 'Good First Issue', url: 'https://goodfirstissue.dev', icon: 'bi-flag', description: 'Curated beginner-friendly issues from popular open-source projects.' },
      { name: 'Up For Grabs', url: 'https://up-for-grabs.net', icon: 'bi-hand-index-thumb', description: 'Projects with tasks set aside specifically for newcomers.' },
      { name: 'First Timers Only', url: 'https://www.firsttimersonly.com', icon: 'bi-1-circle', description: 'Issues reserved for people making their very first pull request.' },
      { name: 'CodeTriage', url: 'https://www.codetriage.com', icon: 'bi-envelope-open', description: 'Get a few open issues from repos you choose by email, and learn to read real code.' },
      { name: 'GitHub issue search', url: 'https://github.com/issues?q=is%3Aopen+is%3Aissue+label%3A%22good+first+issue%22', icon: 'bi-github', description: 'Search open issues labelled "good first issue" across all of GitHub.' },
    ],
  },
  {
    id: 'intermediate',
    label: 'Intermediate',
    tagline: 'Structured events and programs',
    icon: 'bi-lightning-charge',
    platforms: [
      { name: 'Hacktoberfest', url: 'https://hacktoberfest.com', icon: 'bi-calendar-event', description: 'Every October: get pull requests accepted in participating repositories.' },
      { name: 'MLH Fellowship', url: 'https://fellowship.mlh.io', icon: 'bi-mortarboard', description: 'A remote fellowship contributing to open source in a small team, with stipends.' },
      { name: 'Season of KDE', url: 'https://season.kde.org', icon: 'bi-window-desktop', description: 'Mentored projects in the KDE desktop and apps ecosystem.' },
      { name: 'Open Source Friday', url: 'https://opensourcefriday.com', icon: 'bi-calendar-week', description: 'A weekly habit: contribute something to open source every Friday.' },
      { name: 'FOSSASIA Codeheat', url: 'https://codeheat.org', icon: 'bi-fire', description: 'Contribute to FOSSASIA projects, with recognition for top contributors.' },
    ],
  },
  {
    id: 'advanced',
    label: 'Advanced',
    tagline: 'Paid, competitive mentorships',
    icon: 'bi-rocket-takeoff',
    platforms: [
      { name: 'LFX Mentorship', url: 'https://mentorship.lfx.linuxfoundation.org', icon: 'bi-hdd-network', description: 'Paid mentorships on Linux Foundation projects such as Kubernetes and CNCF tools.' },
      { name: 'Outreachy', url: 'https://www.outreachy.org', icon: 'bi-heart', description: 'Paid internships for people underrepresented in tech.' },
      { name: 'Summer of Bitcoin', url: 'https://www.summerofbitcoin.org', icon: 'bi-currency-bitcoin', description: 'Paid open-source work on Bitcoin and Lightning projects.' },
      { name: 'Google Season of Docs', url: 'https://developers.google.com/season-of-docs', icon: 'bi-file-earmark-text', description: 'Paid technical writing for open-source projects.' },
    ],
  },
];

const JOURNEY = [
  { title: 'Start', text: 'Do the First Contributions repo, then 2–3 "good first issue" pull requests.' },
  { title: 'Practise', text: 'Join Hacktoberfest, GSSoC or SWoC to get used to reviews and deadlines.' },
  { title: 'Commit', text: 'Pick one organisation and contribute to it regularly for 2–3 months.' },
  { title: 'Apply', text: 'Apply to GSoC, LFX or Outreachy with a proposal for that same organisation.' },
];

const contributors = [
  { name: 'Alex Morgan', handle: '@alexmorgan-dev', initials: 'AM', mergedPRs: 18, points: 950 },
  { name: 'Jamie Wilson', handle: '@jamiewilson', initials: 'JW', mergedPRs: 14, points: 820 },
  { name: 'Taylor Smith', handle: '@taylorsmith-dev', initials: 'TS', mergedPRs: 11, points: 710 },
  { name: 'Jordan Lee', handle: '@jordanlee', initials: 'JL', mergedPRs: 8, points: 560 },
  { name: 'Casey Brown', handle: '@caseybrown', initials: 'CB', mergedPRs: 6, points: 430 },
];

function SectionEyebrow({ children }) {
  return (
    <div className="os-eyebrow">
      <span />
      {children}
    </div>
  );
}

function CodeSphereHero() {
  return (
    <section className="os-hero" aria-labelledby="os-hero-title">
      <div className="os-hero-glow os-hero-glow-one" />
      <div className="os-hero-glow os-hero-glow-two" />
      <div className="os-hero-inner">
        <div className="os-hero-copy">
          <div className="os-hero-badge">
            <i className="bi bi-github" />
            Open Source Community
          </div>

          <h1 id="os-hero-title">
            CodeSphere
            <span className="os-title-period">.</span>
            <br />
            Open Source
          </h1>

          <p className="os-hero-tagline">
            Contribute. Collaborate. <span>Grow.</span>
          </p>

          <p className="os-hero-description">
            Explore our projects, contribute to the codebase, and help us
            build something meaningful together. Your next contribution
            starts here.
          </p>

          <div className="os-hero-primary-action">
            <a
              className="os-hero-contribute"
              href={GITHUB_REPO}
              target="_blank"
              rel="noreferrer"
            >
              <i className="bi bi-github" />
              <span>Contribute to our website</span>
              <i className="bi bi-arrow-up-right" />
            </a>
            <span className="os-hero-action-note">
              Our college coding club, built in the open.
            </span>
          </div>
        </div>

        <div className="os-hero-visual">
          <div className="os-visual-orbit os-orbit-one" />
          <div className="os-visual-orbit os-orbit-two" />

          <div className="os-floating-symbol os-symbol-code">
            <i className="bi bi-code-slash" />
          </div>
          <div className="os-floating-symbol os-symbol-star">
            <i className="bi bi-stars" />
          </div>
          <div className="os-floating-label os-label-community">
            <i className="bi bi-people-fill" />
            <span>
              Open Source
              <small>Build together</small>
            </span>
          </div>
          <div className="os-floating-label os-label-contributors">
            <i className="bi bi-person-hearts" />
            <span>Community powered</span>
          </div>

          <div className="os-repo-card">
            <div className="os-repo-topline">
              <div className="os-repo-identity">
                <span className="os-repo-github">
                  <i className="bi bi-github" />
                </span>
                <span>
                  <strong>CodeSphere</strong>
                  <small>Open Source · Community Driven</small>
                </span>
              </div>
              <span className="os-repo-public">
                <i className="bi bi-bookmark-check" />
                Public
              </span>
            </div>

            <div className="os-repo-divider" />

            <div className="os-repo-tabs">
              <span className="active"><i className="bi bi-code" /> Code</span>
              <span><i className="bi bi-circle" /> Issues</span>
              <span><i className="bi bi-diagram-2" /> Pull requests</span>
            </div>

            <div className="os-repo-file-list">
              <div><i className="bi bi-folder-fill" /><span>client</span><small>Frontend application</small></div>
              <div><i className="bi bi-folder-fill" /><span>server</span><small>Backend services</small></div>
              <div><i className="bi bi-file-earmark-code" /><span>README.md</span><small>Project documentation</small></div>
            </div>

            <div className="os-repo-bottom">
              <span><i className="bi bi-git" /> React · JavaScript · CSS</span>
              <a href={`${GITHUB_REPO}/issues`} target="_blank" rel="noreferrer">
                Find an issue <i className="bi bi-arrow-up-right" />
              </a>
            </div>
          </div>

          <a
            className="os-hero-issue-link"
            href={`${GITHUB_REPO}/issues`}
            target="_blank"
            rel="noreferrer"
          >
            <span className="os-issue-icon"><i className="bi bi-bug" /></span>
            <span>
              <strong>Find an issue</strong>
              <small>Your first contribution awaits</small>
            </span>
            <i className="bi bi-arrow-up-right" />
          </a>

          <div className="os-hero-github-mark">
            <i className="bi bi-github" />
          </div>
        </div>

        <div className="os-hero-trust-strip">
          <div className="os-trust-item">
            <span className="os-trust-icon"><i className="bi bi-github" /></span>
            <span><strong>Open repository</strong><small>Explore the codebase</small></span>
          </div>
          <div className="os-trust-separator" />
          <div className="os-trust-item">
            <span className="os-trust-icon"><i className="bi bi-diagram-3" /></span>
            <span><strong>Collaborative</strong><small>Build as a community</small></span>
          </div>
          <div className="os-trust-separator" />
          <div className="os-trust-item">
            <span className="os-trust-icon"><i className="bi bi-people" /></span>
            <span><strong>Student powered</strong><small>Learn by contributing</small></span>
          </div>
          <div className="os-trust-separator" />
          <div className="os-trust-item">
            <span className="os-trust-icon"><i className="bi bi-rocket-takeoff" /></span>
            <span><strong>Grow together</strong><small>Make an impact</small></span>
          </div>
        </div>
      </div>
    </section>
  );
}

function ContributorTicker() {
  const tickerItems = [...contributors, ...contributors];

  return (
    <section className="os-recognition-section">
      <div className="os-section-heading os-recognition-heading">
        <SectionEyebrow>THE PEOPLE BEHIND THE CODE</SectionEyebrow>
        <h2>
          Every contribution
          <br />
          <span>moves us forward.</span>
        </h2>
        <p>
          Open source is built by people who share, review, improve and
          support one another.
        </p>
      </div>

      <div className="os-ticker-shell" aria-label="Community contributor highlights">
        <div className="os-ticker-track">
          {tickerItems.map((person, index) => (
            <div className="os-ticker-person" key={`${person.handle}-${index}`}>
              <span className="os-ticker-avatar">{person.initials}</span>
              <span>
                <strong>{person.name}</strong>
                <small>{person.handle}</small>
              </span>
              <i className="bi bi-stars" />
            </div>
          ))}
        </div>
      </div>
      <p className="os-demo-caption">
        <i className="bi bi-info-circle" /> Contributor names and figures shown
        on this preview page are illustrative sample data.
      </p>
    </section>
  );
}

function GuideModal({ program, onClose }) {
  useEffect(() => {
    if (!program) return undefined;

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') onClose();
    };

    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [program, onClose]);

  if (!program) return null;

  return (
    <div
      className="os-modal-backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        className={`os-guide-modal os-tone-${program.tone}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="os-guide-title"
      >
        <button className="os-modal-close" onClick={onClose} aria-label="Close guide">
          <i className="bi bi-x-lg" />
        </button>

        <div className="os-modal-program-mark">{program.shortName}</div>
        <SectionEyebrow>CONTRIBUTION STARTER GUIDE</SectionEyebrow>
        <h2 id="os-guide-title">{program.name}</h2>
        <p className="os-modal-intro">{program.intro}</p>

        <div className="os-guide-steps">
          {program.steps.map((step, index) => (
            <div className="os-guide-step" key={step}>
              <span>{String(index + 1).padStart(2, '0')}</span>
              <p>{step}</p>
            </div>
          ))}
        </div>

        <div className="os-modal-resources">
          <h3>Useful resources</h3>
          {program.resources.map((resource) => (
            <a key={resource.url} href={resource.url} target="_blank" rel="noreferrer">
              {resource.label}
              <i className="bi bi-arrow-up-right" />
            </a>
          ))}
        </div>

        <a className="os-modal-primary" href={program.website || program.resources[0].url} target="_blank" rel="noreferrer">
          Visit official program <i className="bi bi-arrow-up-right" />
        </a>
      </section>
    </div>
  );
}

function ProgramCard({ program, onOpenGuide }) {
  return (
    <article className={`os-program-card os-tone-${program.tone}`}>
      <div className="os-program-card-top">
        <span className="os-program-number">{program.number}</span>
        <span className="os-program-mark">{program.shortName}</span>
      </div>

      <div className="os-program-icon">
        <i className={`bi ${program.icon}`} />
      </div>

      <span className="os-program-category">{program.category}</span>
      <h3>{program.name}</h3>
      <p>{program.description}</p>

      <div className="os-program-card-actions">
        <a href={program.resources[0].url} target="_blank" rel="noreferrer">
          Official website <i className="bi bi-arrow-up-right" />
        </a>
        <button onClick={() => onOpenGuide(program)}>
          Contribution guide <i className="bi bi-arrow-right" />
        </button>
      </div>
    </article>
  );
}

function ProgramsSection({ onOpenGuide }) {
  return (
    <section className="os-programs-section" id="programs">
      <div className="os-section-heading">
        <SectionEyebrow>YOUR OPEN-SOURCE JOURNEY</SectionEyebrow>
        <h2>
          Explore the world
          <br />
          <span>of open source.</span>
        </h2>
        <p>
          Discover well-known contribution programs, find your starting point
          and learn how to become part of the open-source community.
        </p>
      </div>

      <div className="os-programs-grid">
        {programs.map((program) => (
          <ProgramCard
            key={program.id}
            program={program}
            onOpenGuide={onOpenGuide}
          />
        ))}
      </div>

      <div className="os-program-bottom-note">
        <span className="os-bottom-note-icon"><i className="bi bi-lightbulb" /></span>
        <p>
          New to open source? Start small. Read a README, improve documentation,
          report a bug or help someone solve an issue.
        </p>
        <a href="https://docs.github.com/en/get-started/exploring-projects-on-github/contributing-to-open-source" target="_blank" rel="noreferrer">
          Beginner's guide <i className="bi bi-arrow-up-right" />
        </a>
      </div>
    </section>
  );
}

function PlatformsSection() {
  const [level, setLevel] = useState('all');
  const shown = level === 'all' ? LEVELS : LEVELS.filter((l) => l.id === level);

  return (
    <section className="os-platforms-section" id="platforms">
      <div className="os-section-heading">
        <SectionEyebrow>MORE PLACES TO CONTRIBUTE</SectionEyebrow>
        <h2>
          Open-source platforms,
          <br />
          <span>beginner to advanced.</span>
        </h2>
        <p>
          Not sure where to begin? Pick your level and explore platforms that
          match it. Dates and eligibility change every year, so always check the
          official site.
        </p>
      </div>

      <div className="os-level-tabs" role="tablist" aria-label="Filter by level">
        {[{ id: 'all', label: 'All levels', icon: 'bi-grid' }, ...LEVELS].map((item) => (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={level === item.id}
            className={`os-level-tab os-level-${item.id} ${level === item.id ? 'active' : ''}`}
            onClick={() => setLevel(item.id)}
          >
            <i className={`bi ${item.icon}`} aria-hidden="true" /> {item.label}
          </button>
        ))}
      </div>

      {shown.map((group) => (
        <div className={`os-level-group os-level-${group.id}`} key={group.id}>
          <div className="os-level-head">
            <span className="os-level-badge">
              <i className={`bi ${group.icon}`} aria-hidden="true" /> {group.label}
            </span>
            <span className="os-level-tagline">{group.tagline}</span>
          </div>

          <div className="os-platform-grid">
            {group.platforms.map((platform) => (
              <a
                key={platform.name}
                className="os-platform-card"
                href={platform.url}
                target="_blank"
                rel="noreferrer"
              >
                <span className="os-platform-icon">
                  <i className={`bi ${platform.icon}`} aria-hidden="true" />
                </span>
                <span className="os-platform-body">
                  <strong>
                    {platform.name}
                    <i className="bi bi-arrow-up-right" aria-hidden="true" />
                  </strong>
                  <span>{platform.description}</span>
                </span>
              </a>
            ))}
          </div>
        </div>
      ))}

      <div className="os-journey">
        <h3>
          <i className="bi bi-map" aria-hidden="true" /> A suggested path for CodeSphere members
        </h3>
        <ol>
          {JOURNEY.map((step, index) => (
            <li key={step.title}>
              <span className="os-journey-num">{index + 1}</span>
              <strong>{step.title}</strong>
              <p>{step.text}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

function ContributorAvatar({ person, rank }) {
  return (
    <div className={`os-leader-avatar os-avatar-${rank <= 3 ? rank : 'other'}`}>
      {person.initials}
    </div>
  );
}

function PodiumCard({ person, rank }) {
  const rankLabels = {
    1: 'TOP CONTRIBUTOR',
    2: 'SECOND PLACE',
    3: 'THIRD PLACE',
  };

  return (
    <article className={`os-podium-card os-podium-rank-${rank}`}>
      <div className="os-podium-medal">
        {rank === 1 ? <i className="bi bi-trophy-fill" /> : <i className="bi bi-award-fill" />}
      </div>
      <ContributorAvatar person={person} rank={rank} />
      <span className="os-podium-rank-label">{rankLabels[rank]}</span>
      <h3>{person.name}</h3>
      <span className="os-podium-handle">{person.handle}</span>
      <strong className="os-podium-points">{person.points.toLocaleString('en-IN')}</strong>
      <span className="os-podium-points-label">POINTS</span>
      <span className="os-podium-prs">
        <i className="bi bi-git-pull-request" /> {person.mergedPRs} merged PRs
      </span>
    </article>
  );
}

function Leaderboard() {
  const [search, setSearch] = useState('');

  const rankedContributors = useMemo(
    () => [...contributors].sort((a, b) => b.points - a.points),
    []
  );

  const podium = rankedContributors.slice(0, 3);
  const remaining = rankedContributors.slice(3);

  const filteredRemaining = remaining.filter((person) => {
    const query = search.trim().toLowerCase();
    return (
      person.name.toLowerCase().includes(query) ||
      person.handle.toLowerCase().includes(query)
    );
  });

  const filteredPodium = podium.filter((person) => {
    const query = search.trim().toLowerCase();
    return (
      person.name.toLowerCase().includes(query) ||
      person.handle.toLowerCase().includes(query)
    );
  });

  return (
    <section className="os-leaderboard-section" id="leaderboard">
      <div className="os-leaderboard-heading">
        <SectionEyebrow>COMMUNITY RECOGNITION</SectionEyebrow>
        <h2>
          The CodeSphere
          <br />
          <span>Hall of Contributors.</span>
        </h2>
        <p>
          Celebrating the people who turn ideas into improvements and make
          our community stronger.
        </p>
        <span className="os-leaderboard-demo-label">
          <i className="bi bi-info-circle" /> Preview leaderboard · Sample data
        </span>
      </div>

      <div className="os-leaderboard-summary">
        <div>
          <span className="os-summary-icon"><i className="bi bi-people" /></span>
          <span><strong>{contributors.length}</strong><small>Sample contributors</small></span>
        </div>
        <div>
          <span className="os-summary-icon"><i className="bi bi-git-pull-request" /></span>
          <span><strong>{contributors.reduce((sum, person) => sum + person.mergedPRs, 0)}</strong><small>Sample merged PRs</small></span>
        </div>
        <div>
          <span className="os-summary-icon"><i className="bi bi-stars" /></span>
          <span><strong>{contributors.reduce((sum, person) => sum + person.points, 0).toLocaleString('en-IN')}</strong><small>Sample points</small></span>
        </div>
      </div>

      <div className="os-podium">
        {podium[1] && <PodiumCard person={podium[1]} rank={2} />}
        {podium[0] && <PodiumCard person={podium[0]} rank={1} />}
        {podium[2] && <PodiumCard person={podium[2]} rank={3} />}
      </div>

      <div className="os-ranked-list">
        <div className="os-ranked-list-heading">
          <div>
            <span className="os-ranked-kicker">THE FULL RANKING</span>
            <h3>More contributors. More impact.</h3>
          </div>
          <label className="os-leaderboard-search">
            <i className="bi bi-search" />
            <input
              type="search"
              placeholder="Search contributors..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              aria-label="Search contributors"
            />
          </label>
        </div>

        <div className="os-ranked-table">
          <div className="os-ranked-table-head">
            <span>RANK</span>
            <span>CONTRIBUTOR</span>
            <span>MERGED PRs</span>
            <span>POINTS</span>
          </div>

          {filteredPodium.map((person) => {
            const rank = rankedContributors.indexOf(person) + 1;
            return (
              <div className="os-ranked-row os-ranked-podium-row" key={person.handle}>
                <span className="os-ranked-position">#{rank}</span>
                <span className="os-ranked-person">
                  <ContributorAvatar person={person} rank={rank} />
                  <span><strong>{person.name}</strong><small>{person.handle}</small></span>
                </span>
                <span className="os-ranked-prs">{person.mergedPRs}</span>
                <strong className="os-ranked-points">{person.points.toLocaleString('en-IN')}</strong>
              </div>
            );
          })}

          {filteredRemaining.map((person) => {
            const rank = rankedContributors.indexOf(person) + 1;
            return (
              <div className="os-ranked-row" key={person.handle}>
                <span className="os-ranked-position">#{rank}</span>
                <span className="os-ranked-person">
                  <ContributorAvatar person={person} rank={rank} />
                  <span><strong>{person.name}</strong><small>{person.handle}</small></span>
                </span>
                <span className="os-ranked-prs">{person.mergedPRs}</span>
                <strong className="os-ranked-points">{person.points.toLocaleString('en-IN')}</strong>
              </div>
            );
          })}

          {filteredPodium.length === 0 && filteredRemaining.length === 0 && (
            <div className="os-ranked-empty">
              No contributors match “{search}”.
            </div>
          )}
        </div>
      </div>

      <div className="os-leaderboard-footnote">
        <i className="bi bi-shield-check" />
        <p>
          This is a design preview, not live GitHub data. A production
          leaderboard can rank verified contributions using merged pull
          requests, review quality, documentation, tests and maintainer
          approval—not just raw PR volume.
        </p>
      </div>
    </section>
  );
}

export default function OpenSource() {
  const [selectedProgram, setSelectedProgram] = useState(null);

  return (
    <>
      <Navbar />
      <main className="opensource-page">
        <div className="os-page-background" aria-hidden="true" />
        <div className="os-page-container">
          <CodeSphereHero />
          <ContributorTicker />
          <ProgramsSection onOpenGuide={setSelectedProgram} />
          <PlatformsSection />
          <Leaderboard />
        </div>
      </main>
      <Footer />
      <GuideModal
        program={selectedProgram}
        onClose={() => setSelectedProgram(null)}
      />
    </>
  );
}

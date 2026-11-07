
import { useEffect, useState } from 'react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import IssueGuide from '../components/IssueGuide';
import ContributionGuide from '../components/ContributionGuide';
import '../css/OpenSource.css';

const GITHUB_REPO = 'https://github.com/Toumik-Haque/CodeSphere';

const programs = [
  {
    id: 'gsoc',
    level: 'advanced',
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
    level: 'intermediate',
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
    level: 'intermediate',
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
    level: 'intermediate',
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

// Levels for the "Explore the world of open source" section. Featured
// programs (above) are placed into these levels by their `level` field.
const LEVELS = [
  {
    id: 'beginner',
    label: 'Beginner',
    tagline: 'Find your first contribution',
    icon: 'bi-flower1',
    platforms: [
      { name: 'First Contributions', shortName: 'FC', url: 'https://github.com/firstcontributions/first-contributions', icon: 'bi-signpost-split', description: 'A practice repo that walks you through fork, clone, branch and your first pull request.' },
      { name: 'Good First Issue', shortName: 'GFI', url: 'https://goodfirstissue.dev', icon: 'bi-flag', description: 'Curated beginner-friendly issues from popular open-source projects.' },
      { name: 'Up For Grabs', shortName: 'UFG', url: 'https://up-for-grabs.net', icon: 'bi-hand-index-thumb', description: 'Projects with tasks set aside specifically for newcomers.' },
      { name: 'First Timers Only', shortName: 'FTO', url: 'https://www.firsttimersonly.com', icon: 'bi-1-circle', description: 'Issues reserved for people making their very first pull request.' },
      { name: 'CodeTriage', shortName: 'CT', url: 'https://www.codetriage.com', icon: 'bi-envelope-open', description: 'Get a few open issues from repos you choose by email, and learn to read real code.' },
      { name: 'GitHub issue search', shortName: 'GH', url: 'https://github.com/issues?q=is%3Aopen+is%3Aissue+label%3A%22good+first+issue%22', icon: 'bi-github', description: 'Search open issues labelled "good first issue" across all of GitHub.' },
    ],
  },
  {
    id: 'intermediate',
    label: 'Intermediate',
    tagline: 'Structured events and programs',
    icon: 'bi-lightning-charge',
    platforms: [
      { name: 'Hacktoberfest', shortName: 'HF', url: 'https://hacktoberfest.com', icon: 'bi-calendar-event', description: 'Every October: get pull requests accepted in participating repositories.' },
      { name: 'MLH Fellowship', shortName: 'MLH', url: 'https://fellowship.mlh.io', icon: 'bi-mortarboard', description: 'A remote fellowship contributing to open source in a small team, with stipends.' },
      { name: 'Season of KDE', shortName: 'SoK', url: 'https://season.kde.org', icon: 'bi-window-desktop', description: 'Mentored projects in the KDE desktop and apps ecosystem.' },
      { name: 'Open Source Friday', shortName: 'OSF', url: 'https://opensourcefriday.com', icon: 'bi-calendar-week', description: 'A weekly habit: contribute something to open source every Friday.' },
      { name: 'FOSSASIA Codeheat', shortName: 'FA', url: 'https://codeheat.org', icon: 'bi-fire', description: 'Contribute to FOSSASIA projects, with recognition for top contributors.' },
    ],
  },
  {
    id: 'advanced',
    label: 'Advanced',
    tagline: 'Paid, competitive mentorships',
    icon: 'bi-rocket-takeoff',
    platforms: [
      { name: 'LFX Mentorship', shortName: 'LFX', url: 'https://mentorship.lfx.linuxfoundation.org', icon: 'bi-hdd-network', description: 'Paid mentorships on Linux Foundation projects such as Kubernetes and CNCF tools.' },
      { name: 'Outreachy', shortName: 'OUT', url: 'https://www.outreachy.org', icon: 'bi-heart', description: 'Paid internships for people underrepresented in tech.' },
      { name: 'Summer of Bitcoin', shortName: 'SoB', url: 'https://www.summerofbitcoin.org', icon: 'bi-currency-bitcoin', description: 'Paid open-source work on Bitcoin and Lightning projects.' },
      { name: 'Google Season of Docs', shortName: 'GSoD', url: 'https://developers.google.com/season-of-docs', icon: 'bi-file-earmark-text', description: 'Paid technical writing for open-source projects.' },
    ],
  },
];

const LEVEL_TONES = { beginner: 'green', intermediate: 'amber', advanced: 'orange' };

// Every card in the section, grouped by level: featured programs first.
const CARDS_BY_LEVEL = LEVELS.map((level) => ({
  ...level,
  cards: [
    ...programs.filter((program) => program.level === level.id),
    ...level.platforms.map((platform) => ({
      id: platform.name,
      shortName: platform.shortName,
      name: platform.name,
      category: level.tagline.toUpperCase(),
      tone: LEVEL_TONES[level.id],
      icon: platform.icon,
      description: platform.description,
      resources: [{ label: 'Official website', url: platform.url }],
    })),
  ],
}));

const JOURNEY = [
  { title: 'Start', text: 'Do the First Contributions repo, then 2–3 "good first issue" pull requests.' },
  { title: 'Practise', text: 'Join Hacktoberfest, GSSoC or SWoC to get used to reviews and deadlines.' },
  { title: 'Commit', text: 'Pick one organisation and contribute to it regularly for 2–3 months.' },
  { title: 'Apply', text: 'Apply to GSoC, LFX or Outreachy with a proposal for that same organisation.' },
];

// The developers who built this site (same as the footer).
const developers = [
  { name: 'Toumik Haque', github: 'Toumik-Haque', initials: 'TH' },
  { name: 'Sayan Singha', github: 'Sayan16-code', initials: 'SS' },
  { name: 'Arnab Kumar Dey', github: 'arnab9957', initials: 'AD' },
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
            <a className="os-hero-guide-link" href="#how-to-contribute">
              <i className="bi bi-play-circle" /> New to open source? Watch the step-by-step guide
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
  // The track scrolls by half its width, so both halves must match and be
  // wider than the screen: repeat the short list 4 times per half.
  const half = Array.from({ length: 4 }, () => developers).flat();
  const tickerItems = [...half, ...half];

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
            <a
              className="os-ticker-person"
              key={`${person.github}-${index}`}
              href={`https://github.com/${person.github}`}
              target="_blank"
              rel="noreferrer"
              // Only the first copy is reachable by keyboard / screen readers.
              tabIndex={index < developers.length ? 0 : -1}
              aria-hidden={index < developers.length ? undefined : true}
            >
              <span className="os-ticker-avatar">
                {person.initials}
                <img
                  src={`https://github.com/${person.github}.png?size=96`}
                  alt=""
                  loading="lazy"
                  onError={(event) => { event.currentTarget.style.display = 'none'; }}
                />
              </span>
              <span>
                <strong>{person.name}</strong>
                <small>@{person.github}</small>
              </span>
              <i className="bi bi-github" />
            </a>
          ))}
        </div>
      </div>
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

function ProgramCard({ program, number, onOpenGuide }) {
  return (
    <article className={`os-program-card is-compact os-tone-${program.tone}`}>
      <div className="os-program-card-top">
        <span className="os-program-number">{String(number).padStart(2, '0')}</span>
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
        {program.steps && (
          <button onClick={() => onOpenGuide(program)}>
            Contribution guide <i className="bi bi-arrow-right" />
          </button>
        )}
      </div>
    </article>
  );
}

function ProgramsSection({ onOpenGuide }) {
  const [level, setLevel] = useState('all');
  const shown = level === 'all' ? CARDS_BY_LEVEL : CARDS_BY_LEVEL.filter((l) => l.id === level);

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
          Discover well-known contribution programs and platforms, find your
          starting point and learn how to become part of the open-source
          community. Dates and eligibility change every year, so always check
          the official site.
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
          <div className="os-level-divider">
            <span className="os-level-badge">
              <i className={`bi ${group.icon}`} aria-hidden="true" /> {group.label}
            </span>
            <span className="os-level-tagline">{group.tagline}</span>
            <span className="os-level-line" aria-hidden="true" />
            <span className="os-level-count">{group.cards.length} programs</span>
          </div>

          <div className="os-programs-grid is-compact">
            {group.cards.map((program, index) => (
              <ProgramCard
                key={program.id}
                program={program}
                number={index + 1}
                onOpenGuide={onOpenGuide}
              />
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

export default function OpenSource() {
  const [selectedProgram, setSelectedProgram] = useState(null);

  return (
    <>
      <Navbar />
      <main className="opensource-page">
        <div className="os-page-background" aria-hidden="true" />
        <div className="os-page-container">
          <CodeSphereHero />
          <ContributionGuide repoUrl={GITHUB_REPO} Eyebrow={SectionEyebrow} />
          <IssueGuide repoUrl={GITHUB_REPO} Eyebrow={SectionEyebrow} />
          <ContributorTicker />
          <ProgramsSection onOpenGuide={setSelectedProgram} />
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

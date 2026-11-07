import { useEffect, useRef, useState } from 'react';
import '../css/ContributionGuide.css';

// Where the code lives at each step (for the animated diagram).
// from/to: 'upstream' | 'fork' | 'local'
const STEPS = [
  {
    title: 'Get your tools ready',
    icon: 'bi-tools',
    where: 'local',
    explain:
      'You need three free things: a GitHub account (where the code lives online), Git (a tool that tracks changes to code) and Node.js (runs our website on your computer).',
    tip: 'Install Git from git-scm.com and Node.js (LTS) from nodejs.org. Then check they work with the commands below.',
    commands: ['git --version', 'node -v'],
  },
  {
    title: 'Find an issue to work on',
    icon: 'bi-bug',
    where: 'upstream',
    explain:
      'An "issue" is a task or a bug report on GitHub. Open our Issues tab, pick one labelled "good first issue" and comment that you would like to work on it.',
    tip: 'Wait until a maintainer assigns it to you, so two people don\'t do the same work. Want to add your own idea? Open a new issue first and discuss it.',
    commands: ['# On GitHub: Issues → "good first issue"', '# Comment: "Hi! I\'d like to work on this 🙋"'],
  },
  {
    title: 'Fork the repository',
    icon: 'bi-diagram-2',
    from: 'upstream',
    to: 'fork',
    where: 'fork',
    explain:
      'Click the "Fork" button at the top of our GitHub page. This makes your own copy of CodeSphere under your account, so you can change things without affecting the original.',
    tip: 'The original project is called "upstream". Your copy is called your "fork".',
    commands: ['# On GitHub: click  ⑂ Fork  →  Create fork'],
  },
  {
    title: 'Clone it to your computer',
    icon: 'bi-download',
    from: 'fork',
    to: 'local',
    where: 'local',
    explain:
      'Cloning downloads your fork onto your computer so you can edit it. We also connect the original project as "upstream" so you can get new updates later.',
    tip: 'Replace <your-username> with your GitHub username.',
    commands: [
      'git clone https://github.com/<your-username>/CodeSphere.git',
      'cd CodeSphere',
      'git remote add upstream https://github.com/Toumik-Haque/CodeSphere.git',
    ],
  },
  {
    title: 'Set up and run the project',
    icon: 'bi-play-circle',
    where: 'local',
    explain:
      'One command installs everything and creates your settings files. Then start the backend and the website in two terminals and open it in your browser.',
    tip: 'Fill in the values that setup.js lists in server/.env (the README explains each one). Never share or commit .env files.',
    commands: [
      'node setup.js',
      'cd server && npm run dev      # terminal 1',
      'cd client && npm run dev      # terminal 2 → http://localhost:5173',
    ],
  },
  {
    title: 'Create a branch',
    icon: 'bi-signpost-split',
    where: 'local',
    explain:
      'A branch is a separate workspace for your change. Your work stays apart from the main code until it is reviewed. Name it after what you are doing.',
    tip: 'Use feature/, fix/, docs/, style/, refactor/ or chore/ at the start of the name.',
    commands: ['git checkout main', 'git pull upstream main', 'git checkout -b fix/navbar-mobile-menu'],
  },
  {
    title: 'Make your changes and test',
    icon: 'bi-code-slash',
    where: 'local',
    explain:
      'Edit the code in your editor (VS Code is great). Keep the change small and focused on your issue. Check it in the browser on desktop and mobile.',
    tip: 'Run the linter to catch mistakes before anyone reviews your code.',
    commands: ['cd client', 'npm run lint', '# ✔ No problems found'],
  },
  {
    title: 'Commit your work',
    icon: 'bi-check2-square',
    where: 'local',
    explain:
      'A commit is a saved snapshot of your changes with a short message describing them. We use the format "type: what you did".',
    tip: 'Good: "fix: close mobile menu after choosing a link". Bad: "changes" or "final fix 2".',
    commands: ['git status', 'git add client/src/components/Navbar.jsx', 'git commit -m "fix: close mobile menu after choosing a link"'],
  },
  {
    title: 'Push to your fork',
    icon: 'bi-cloud-upload',
    from: 'local',
    to: 'fork',
    where: 'fork',
    explain:
      'Pushing uploads your branch from your computer to your fork on GitHub.',
    tip: 'If GitHub refuses the push because of a secret (like an API key), remove the file from the commit and tell a maintainer.',
    commands: ['git push origin fix/navbar-mobile-menu'],
  },
  {
    title: 'Open a pull request',
    icon: 'bi-git',
    from: 'fork',
    to: 'upstream',
    where: 'upstream',
    explain:
      'A pull request (PR) asks us to bring your change into the original project. On GitHub, click "Compare & pull request", describe what you changed and why, and link the issue.',
    tip: 'Write "Closes #12" (your issue number) in the description. Add screenshots for any visual change, including mobile.',
    commands: ['# On GitHub: Compare & pull request', '# Title: fix: close mobile menu after choosing a link', '# Description: Closes #12 + screenshots'],
  },
  {
    title: 'Review, merge and celebrate',
    icon: 'bi-trophy',
    where: 'upstream',
    explain:
      'A maintainer reviews your PR and may ask for changes. Just edit, commit and push again: the PR updates automatically. Once approved, it is merged. You are now an open-source contributor! 🎉',
    tip: 'After merging, sync your fork before starting the next contribution.',
    commands: ['git checkout main', 'git pull upstream main', 'git push origin main', '# 🎉 Merged! Pick your next issue.'],
  },
];

const GLOSSARY = [
  ['Repository (repo)', 'bi-folder2-open', 'A project folder on GitHub that holds all the code and its history.'],
  ['Fork', 'bi-diagram-2', 'Your own copy of someone else\'s repo, under your GitHub account.'],
  ['Clone', 'bi-download', 'Downloading a repo from GitHub to your computer.'],
  ['Branch', 'bi-signpost-split', 'A separate line of work, so your changes don\'t touch the main code yet.'],
  ['Commit', 'bi-check2-square', 'A saved snapshot of your changes, with a message describing them.'],
  ['Push', 'bi-cloud-upload', 'Uploading your commits from your computer to GitHub.'],
  ['Pull request (PR)', 'bi-git', 'A request asking the maintainers to add your changes to the project.'],
  ['Merge', 'bi-intersect', 'Combining your approved changes into the main code.'],
  ['Issue', 'bi-bug', 'A task, bug report or idea, tracked on GitHub.'],
  ['Upstream', 'bi-arrow-up-circle', 'The original project you forked from (here: Toumik-Haque/CodeSphere).'],
  ['Maintainer', 'bi-person-badge', 'A person who reviews pull requests and looks after the project.'],
  ['Merge conflict', 'bi-exclamation-diamond', 'When two people changed the same lines. You pick which version to keep.'],
];

const RULES = {
  do: [
    ['Ask to be assigned first', 'Comment on the issue and wait to be assigned. If there\'s no activity for 7 days, it may be reassigned.'],
    ['One issue per pull request', 'Keep each PR small and focused. Unrelated changes go in separate PRs.'],
    ['Name branches by type', 'feature/event-search, fix/otp-timer, docs/setup-guide, style/navbar-mobile.'],
    ['Use clear commit messages', 'Format "type: summary". Types: feat, fix, docs, style, refactor, perf, chore.'],
    ['Test before you push', 'Run the app, check desktop and mobile, run npm run lint in client/.'],
    ['Link the issue and add screenshots', 'Write "Closes #12" in the PR. Show before/after screenshots for visual changes.'],
    ['Keep your branch up to date', 'Pull from upstream main and fix any conflicts yourself.'],
    ['Respond to reviews kindly', 'Feedback is how we all learn. PRs with no reply for 14 days may be closed.'],
  ],
  dont: [
    ['Never commit secrets', '.env files, API keys and passwords must never be committed. They\'re already in .gitignore.'],
    ['Don\'t commit generated files', 'No node_modules/, dist/ or large media you don\'t need (keep videos under 5 MB).'],
    ['Don\'t merge your own PR', 'A maintainer must approve every pull request.'],
    ['No spam pull requests', 'Typo-only, whitespace-only or copied PRs made just to count contributions will be closed.'],
    ['Don\'t submit code you don\'t understand', 'AI tools are fine to learn with, but you must understand, test and explain your changes.'],
    ['Don\'t change package-lock.json randomly', 'Only when you add, remove or update a dependency, and mention it in the PR.'],
  ],
};

const CHECKLIST = [
  'I was assigned to the issue (or discussed my idea in a new issue)',
  'My branch name starts with feature/, fix/, docs/, style/, refactor/ or chore/',
  'The app runs with no new errors in the browser console or server log',
  'npm run lint passes for the files I changed',
  'It works on both mobile and desktop',
  'No .env files, API keys or passwords are included',
  'My commit messages follow "type: summary"',
  'The PR description links the issue ("Closes #...") and has screenshots for UI changes',
];

const STEP_DURATION = 7000;

// Reveals children with a fade/slide when scrolled into view.
function Reveal({ children, className = '', delay = 0 }) {
  const ref = useRef(null);
  // Without IntersectionObserver, just show everything.
  const [visible, setVisible] = useState(() => !('IntersectionObserver' in window));

  useEffect(() => {
    const node = ref.current;
    if (!node || visible) return undefined;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.15 },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [visible]);

  return (
    <div
      ref={ref}
      className={`cg-reveal ${visible ? 'is-visible' : ''} ${className}`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </div>
  );
}

// Types out the step's commands line by line.
function Terminal({ lines, stepKey }) {
  const [typed, setTyped] = useState(['']);

  useEffect(() => {
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduceMotion) {
      const id = window.setTimeout(() => setTyped(lines), 0);
      return () => window.clearTimeout(id);
    }

    let line = 0;
    let char = 0;
    let timer;
    const tick = () => {
      char += 1;
      setTyped([...lines.slice(0, line), lines[line].slice(0, char)]);
      if (char < lines[line].length) {
        timer = window.setTimeout(tick, 22);
      } else if (line < lines.length - 1) {
        line += 1;
        char = 0;
        timer = window.setTimeout(tick, 350);
      }
    };
    timer = window.setTimeout(tick, 250);
    return () => window.clearTimeout(timer);
  }, [lines, stepKey]);

  return (
    <div className="cg-terminal" aria-label="Commands for this step">
      <div className="cg-terminal-bar">
        <span className="cg-dots" aria-hidden="true"><span /><span /><span /></span>
        <span>terminal</span>
        <button
          type="button"
          className="cg-copy"
          onClick={() => navigator.clipboard?.writeText(lines.filter((l) => !l.startsWith('#')).join('\n'))}
          title="Copy commands"
          aria-label="Copy commands"
        >
          <i className="bi bi-clipboard" aria-hidden="true" />
        </button>
      </div>
      <pre>
        {typed.map((line, i) => (
          <div key={i} className={line.startsWith('#') ? 'cg-comment' : ''}>
            {!line.startsWith('#') && <span className="cg-prompt">$ </span>}
            {line}
            {i === typed.length - 1 && <span className="cg-caret" />}
          </div>
        ))}
      </pre>
    </div>
  );
}

function FlowDiagram({ step }) {
  const nodes = [
    { id: 'upstream', label: 'CodeSphere repo', sub: 'original (upstream)', icon: 'bi-github' },
    { id: 'fork', label: 'Your fork', sub: 'your copy on GitHub', icon: 'bi-diagram-2' },
    { id: 'local', label: 'Your computer', sub: 'where you code', icon: 'bi-laptop' },
  ];
  const moving = step.from && step.to ? `${step.from}-${step.to}` : '';

  return (
    <div className={`cg-flow ${moving ? `moving ${moving}` : ''}`} aria-hidden="true">
      {nodes.map((node, i) => (
        <div key={node.id} className="cg-flow-cell">
          <div className={`cg-flow-node ${step.where === node.id ? 'active' : ''}`}>
            <i className={`bi ${node.icon}`} />
            <strong>{node.label}</strong>
            <small>{node.sub}</small>
          </div>
          {i < nodes.length - 1 && (
            <div className={`cg-flow-link link-${i}`}>
              <span className="cg-flow-packet" />
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function Walkthrough() {
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [started, setStarted] = useState(() => !('IntersectionObserver' in window));
  const rootRef = useRef(null);
  const step = STEPS[index];

  // Start playing only once the walkthrough is on screen.
  useEffect(() => {
    const node = rootRef.current;
    if (!node || !('IntersectionObserver' in window)) return undefined;
    const observer = new IntersectionObserver(([entry]) => setStarted(entry.isIntersecting), { threshold: 0.3 });
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!playing || !started) return undefined;
    const id = window.setTimeout(
      () => setIndex((i) => (i + 1) % STEPS.length),
      STEP_DURATION,
    );
    return () => window.clearTimeout(id);
  }, [index, playing, started]);

  const goTo = (i) => {
    setIndex((i + STEPS.length) % STEPS.length);
    setPlaying(false);
  };

  return (
    <div className="cg-walkthrough" ref={rootRef}>
      <ol className="cg-steps-nav" aria-label="Contribution steps">
        {STEPS.map((s, i) => (
          <li key={s.title}>
            <button
              type="button"
              className={`${i === index ? 'active' : ''} ${i < index ? 'done' : ''}`}
              onClick={() => goTo(i)}
              aria-current={i === index ? 'step' : undefined}
            >
              <span className="cg-step-num">{i < index ? <i className="bi bi-check-lg" /> : i + 1}</span>
              <span className="cg-step-label">{s.title}</span>
            </button>
          </li>
        ))}
      </ol>

      <div className="cg-stage">
        <div className="cg-progress" aria-hidden="true">
          <span
            key={`${index}-${playing}-${started}`}
            className={playing && started ? 'running' : ''}
            style={{ animationDuration: `${STEP_DURATION}ms` }}
          />
        </div>

        <div className="cg-stage-head">
          <span className="cg-stage-count">Step {index + 1} of {STEPS.length}</span>
          <div className="cg-controls">
            <button type="button" onClick={() => goTo(index - 1)} aria-label="Previous step">
              <i className="bi bi-chevron-left" aria-hidden="true" />
            </button>
            <button
              type="button"
              className="cg-play"
              onClick={() => setPlaying((p) => !p)}
              aria-label={playing ? 'Pause walkthrough' : 'Play walkthrough'}
            >
              <i className={`bi ${playing ? 'bi-pause-fill' : 'bi-play-fill'}`} aria-hidden="true" />
              {playing ? 'Pause' : 'Play'}
            </button>
            <button type="button" onClick={() => goTo(index + 1)} aria-label="Next step">
              <i className="bi bi-chevron-right" aria-hidden="true" />
            </button>
          </div>
        </div>

        <div className="cg-stage-body" key={index}>
          <div className="cg-stage-text">
            <span className="cg-stage-icon"><i className={`bi ${step.icon}`} aria-hidden="true" /></span>
            <h3>{step.title}</h3>
            <p>{step.explain}</p>
            <p className="cg-tip">
              <i className="bi bi-lightbulb-fill" aria-hidden="true" /> {step.tip}
            </p>
          </div>

          <div className="cg-stage-visual">
            <FlowDiagram step={step} />
            <Terminal lines={step.commands} stepKey={index} />
          </div>
        </div>
      </div>
    </div>
  );
}

function Glossary() {
  const [flipped, setFlipped] = useState(null);
  return (
    <div className="cg-glossary">
      {GLOSSARY.map(([term, icon, meaning], i) => (
        <Reveal key={term} delay={(i % 4) * 70}>
          <button
            type="button"
            className={`cg-flip ${flipped === term ? 'is-flipped' : ''}`}
            onClick={() => setFlipped(flipped === term ? null : term)}
            aria-label={`${term}: ${meaning}`}
          >
            <span className="cg-flip-inner">
              <span className="cg-flip-front">
                <i className={`bi ${icon}`} aria-hidden="true" />
                <strong>{term}</strong>
                <small>Tap to learn</small>
              </span>
              <span className="cg-flip-back">{meaning}</span>
            </span>
          </button>
        </Reveal>
      ))}
    </div>
  );
}

function Rules() {
  return (
    <div className="cg-rules">
      <Reveal className="cg-rules-col cg-do">
        <h4><i className="bi bi-check-circle-fill" aria-hidden="true" /> Do</h4>
        <ul>
          {RULES.do.map(([title, text]) => (
            <li key={title}><strong>{title}</strong><span>{text}</span></li>
          ))}
        </ul>
      </Reveal>
      <Reveal className="cg-rules-col cg-dont" delay={120}>
        <h4><i className="bi bi-x-circle-fill" aria-hidden="true" /> Don&apos;t</h4>
        <ul>
          {RULES.dont.map(([title, text]) => (
            <li key={title}><strong>{title}</strong><span>{text}</span></li>
          ))}
        </ul>
      </Reveal>

      <Reveal className="cg-examples" delay={200}>
        <div>
          <h4><i className="bi bi-chat-square-text" aria-hidden="true" /> Commit message examples</h4>
          <code className="good">feat: add search to events page</code>
          <code className="good">fix: return focus to menu button on close</code>
          <code className="good">docs: add ImageKit setup to README</code>
          <code className="bad">update</code>
          <code className="bad">final final fix</code>
        </div>
        <div>
          <h4><i className="bi bi-signpost-split" aria-hidden="true" /> Branch name examples</h4>
          <code className="good">feature/event-registration</code>
          <code className="good">fix/otp-resend-timer</code>
          <code className="good">style/navbar-mobile</code>
          <code className="bad">my-branch</code>
          <code className="bad">test123</code>
        </div>
      </Reveal>
    </div>
  );
}

function Checklist() {
  const [checked, setChecked] = useState([]);
  const done = checked.length === CHECKLIST.length;
  const toggle = (i) => setChecked((prev) => (prev.includes(i) ? prev.filter((x) => x !== i) : [...prev, i]));

  return (
    <div className={`cg-checklist ${done ? 'is-done' : ''}`}>
      <div className="cg-checklist-head">
        <h4><i className="bi bi-list-check" aria-hidden="true" /> Before you open your pull request</h4>
        <span>{checked.length}/{CHECKLIST.length}</span>
      </div>
      <div className="cg-checklist-bar" aria-hidden="true">
        <span style={{ width: `${(checked.length / CHECKLIST.length) * 100}%` }} />
      </div>
      <ul>
        {CHECKLIST.map((item, i) => (
          <li key={item}>
            <label className={checked.includes(i) ? 'checked' : ''}>
              <input type="checkbox" checked={checked.includes(i)} onChange={() => toggle(i)} />
              <span className="cg-box" aria-hidden="true"><i className="bi bi-check-lg" /></span>
              {item}
            </label>
          </li>
        ))}
      </ul>
      {done && (
        <p className="cg-ready" role="status">
          🎉 You&apos;re ready! Open your pull request and a maintainer will review it soon.
        </p>
      )}
    </div>
  );
}

export default function ContributionGuide({ repoUrl, Eyebrow }) {
  return (
    <section className="cg-section" id="how-to-contribute">
      <div className="os-section-heading">
        <Eyebrow>CONTRIBUTION GUIDE</Eyebrow>
        <h2>
          Never contributed before?
          <br />
          <span>Start here.</span>
        </h2>
        <p>
          Follow these {STEPS.length} steps to make your first open-source contribution to
          CodeSphere. No experience needed. Watch it play, or click any step.
        </p>
      </div>

      <Walkthrough />

      <div className="cg-block">
        <Reveal>
          <h3 className="cg-block-title">
            <i className="bi bi-book" aria-hidden="true" /> Words you&apos;ll hear
          </h3>
          <p className="cg-block-sub">Tap a card to see what it means.</p>
        </Reveal>
        <Glossary />
      </div>

      <div className="cg-block">
        <Reveal>
          <h3 className="cg-block-title">
            <i className="bi bi-shield-check" aria-hidden="true" /> Contribution rules
          </h3>
          <p className="cg-block-sub">
            These keep the project healthy and reviews quick. Full details are in our{' '}
            <a href={`${repoUrl}#contributing`} target="_blank" rel="noreferrer">README</a>.
          </p>
        </Reveal>
        <Rules />
      </div>

      <div className="cg-block">
        <Reveal>
          <Checklist />
        </Reveal>
      </div>

      <Reveal className="cg-cta">
        <div>
          <strong>Ready to make your first contribution?</strong>
          <span>Pick a "good first issue" and say hi in the comments.</span>
        </div>
        <div className="cg-cta-actions">
          <a href={`${repoUrl}/issues?q=is%3Aopen+label%3A%22good+first+issue%22`} target="_blank" rel="noreferrer" className="cg-cta-primary">
            <i className="bi bi-bug" aria-hidden="true" /> Find a good first issue
          </a>
          <a href={`${repoUrl}/fork`} target="_blank" rel="noreferrer" className="cg-cta-secondary">
            <i className="bi bi-diagram-2" aria-hidden="true" /> Fork CodeSphere
          </a>
        </div>
      </Reveal>
    </section>
  );
}

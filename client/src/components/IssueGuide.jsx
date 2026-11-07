import { useEffect, useRef, useState } from 'react';
import '../css/IssueGuide.css';

// "How to raise an issue" guide for the Open Source page, using CodeSphere
// itself as the worked example.

const STEP_DURATION = 7000; // same pace as the contribution walkthrough

const STEPS = [
  {
    icon: 'bi-search',
    title: 'Use the site and spot something',
    text: 'Explore CodeSphere like a normal visitor. Notice anything broken, confusing or missing? That is an issue waiting to be written.',
    example: 'On a phone, the "View on Devpost" bar on a hackathon card covers the prize amount.',
  },
  {
    icon: 'bi-funnel',
    title: 'Check it isn\'t already reported',
    text: 'Open the repository\'s Issues tab and search a few keywords. If it exists, add a 👍 or a helpful comment instead of a duplicate.',
    example: 'Search: is:issue hackathon card mobile',
  },
  {
    icon: 'bi-plus-circle',
    title: 'Open a new issue with a clear title',
    text: 'Click "New issue". Write a title that says what is wrong and where, so anyone understands it in one line.',
    example: '✅ "Hackathon card: prize hidden behind hover bar on mobile"\n❌ "Bug" or "Site not working"',
  },
  {
    icon: 'bi-card-checklist',
    title: 'Describe it so anyone can reproduce it',
    text: 'Add steps to reproduce, what you expected, what actually happened, a screenshot, and your device/browser. For ideas, explain the problem it solves.',
    example: '1. Open /hackathons on a 375px screen\n2. Tap any card\nExpected: prize visible · Actual: hidden',
  },
  {
    icon: 'bi-hand-index-thumb',
    title: 'Ask to work on it, politely',
    text: 'Want to fix it yourself? Comment that you\'d like to take it, with a short plan. Then wait for a maintainer to assign you before you start.',
    example: '"Hi! I\'d like to work on this. I plan to move the bar below the card body on small screens. Could you assign it to me?"',
  },
  {
    icon: 'bi-arrow-repeat',
    title: 'Look after your issue',
    text: 'Reply to questions, share progress, link your pull request with "Fixes #42" so it closes automatically, and say so if you can no longer work on it.',
    example: 'PR description: "Fixes #42: moves the hover bar on mobile."',
  },
];

const TEMPLATES = {
  bug: {
    label: 'Bug report',
    icon: 'bi-bug',
    title: 'Hackathon card: prize hidden behind hover bar on mobile',
    labels: ['bug', 'good first issue'],
    body: `## What happened?
On small screens, the "View on Devpost" bar on hackathon cards covers the prize amount.

## Steps to reproduce
1. Open https://codesphere.example/hackathons on a phone (or DevTools at 375px)
2. Tap any card in "Live around the web"
3. Look at the bottom of the card

## Expected
The prize and "days left" stay visible.

## Actual
The bar slides over them, so the prize can't be read.

## Screenshot
(drag and drop an image here)

## Environment
- Device: Android phone
- Browser: Chrome 130

## I'd like to work on this
Yes. Plan: hide the bar below 768px and keep the link on the card title.`,
  },
  feature: {
    label: 'Feature request',
    icon: 'bi-lightbulb',
    title: 'Add a "Remind me" button for hackathon deadlines',
    labels: ['enhancement'],
    body: `## Problem
Students find a hackathon on CodeSphere but forget to register before the deadline.

## Proposed solution
A "Remind me" button on each hackathon card that sends a notification 24 hours before registration closes.

## Alternatives considered
Adding the date to Google Calendar manually.

## Who benefits?
Every student browsing /hackathons.

## I'd like to work on this
I can take the frontend part if a maintainer agrees with the idea.`,
  },
};

const THREAD = [
  { who: 'riya-dev', role: 'Contributor', when: '2 days ago', text: 'Opened this issue. Screenshot attached from a Pixel 7.', kind: 'open' },
  { who: 'riya-dev', role: 'Contributor', when: '2 days ago', text: 'I\'d like to work on this. Plan: hide the hover bar under 768px and keep the title as the link. Could you assign me?' },
  { who: 'Toumik-Haque', role: 'Maintainer', when: '1 day ago', text: 'Thanks for the clear report! Assigned to you 🎉 Please keep the change small and add a before/after screenshot in the PR.', kind: 'assign' },
  { who: 'riya-dev', role: 'Contributor', when: '5 hours ago', text: 'Opened PR #57 ("Fixes #42"). Ready for review!', kind: 'pr' },
  { who: 'Toumik-Haque', role: 'Maintainer', when: '2 hours ago', text: 'Merged. Thank you! Closing this issue.', kind: 'closed' },
];

const LABELS = [
  ['bug', 'Something is broken', '#D73A4A'],
  ['enhancement', 'A new feature or improvement', '#A2EEEF'],
  ['documentation', 'README, guides, comments', '#0075CA'],
  ['good first issue', 'Small and beginner-friendly', '#7057FF'],
  ['help wanted', 'Maintainers would love help', '#008672'],
  ['duplicate', 'Already reported elsewhere', '#CFD3D7'],
];

const DOS = [
  'One problem per issue',
  'Search before you post',
  'Add screenshots and exact steps',
  'Wait to be assigned before coding',
  'Link your PR with "Fixes #number"',
  'Be kind, maintainers are volunteers too',
];

const DONTS = [
  'Write vague titles like "Help" or "Error"',
  'Ask "any update?" every day',
  'Claim many issues at once',
  'Open a PR for someone else\'s assigned issue',
  'Post passwords, keys or personal data',
  'Go silent: unassign yourself if you stop',
];

const textColor = (hex) => {
  const n = parseInt(hex.slice(1), 16);
  return ((n >> 16) * 0.299 + ((n >> 8) & 255) * 0.587 + (n & 255) * 0.114) > 150 ? '#1F2328' : '#FFFFFF';
};

function Label({ name, color }) {
  return <span className="ig-label" style={{ background: color, color: textColor(color) }}>{name}</span>;
}

export default function IssueGuide({ repoUrl, Eyebrow }) {
  const [step, setStepRaw] = useState(0);
  // Auto-advance like "How to contribute": starts when visible, loops,
  // pauses as soon as someone picks a step themselves.
  const [playing, setPlaying] = useState(() => !window.matchMedia?.('(prefers-reduced-motion: reduce)').matches);
  const [visible, setVisible] = useState(() => !('IntersectionObserver' in window));
  const stepsRef = useRef(null);
  const setStep = (next) => {
    setPlaying(false);
    setStepRaw(next);
  };

  useEffect(() => {
    const node = stepsRef.current;
    if (!node || !('IntersectionObserver' in window)) return undefined;
    const observer = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting), { threshold: 0.3 });
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!playing || !visible) return undefined;
    const id = window.setTimeout(() => setStepRaw((i) => (i + 1) % STEPS.length), STEP_DURATION);
    return () => window.clearTimeout(id);
  }, [step, playing, visible]);
  const [tab, setTab] = useState('bug');
  const [copied, setCopied] = useState(false);
  const template = TEMPLATES[tab];
  const labelColor = (name) => LABELS.find(([n]) => n === name)?.[2] || '#CFD3D7';
  const newIssueUrl = `${repoUrl}/issues/new?${new URLSearchParams({ title: template.title, body: template.body })}`;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(`${template.title}\n\n${template.body}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      /* clipboard blocked */
    }
  };

  return (
    <section className="ig-section" id="raise-an-issue" aria-labelledby="ig-title">
      <div className="os-section-heading">
        {Eyebrow && <Eyebrow>RAISE AN ISSUE</Eyebrow>}
        <h2 id="ig-title">
          Found something?
          <br />
          <span>Turn it into an issue.</span>
        </h2>
        <p>
          An issue is a short note on GitHub that says &quot;this is broken&quot; or &quot;this would be better&quot;.
          It is the easiest first contribution, and the way you ask to work on something.
          Here is how to do it, using CodeSphere as the example.
        </p>
      </div>

      {/* ---------- Steps ---------- */}
      <div className="ig-steps" ref={stepsRef}>
        <ol className="ig-step-list" role="tablist" aria-label="Steps">
          {STEPS.map((s, i) => (
            <li key={s.title}>
              <button
                type="button"
                role="tab"
                aria-selected={step === i}
                className={`${step === i ? 'active' : ''} ${i < step ? 'done' : ''}`}
                onClick={() => setStep(i)}
              >
                <span className="ig-step-num">{i < step ? <i className="bi bi-check-lg" aria-hidden="true" /> : i + 1}</span>
                <span>{s.title}</span>
              </button>
            </li>
          ))}
        </ol>
        <div className="ig-step-panel" role="tabpanel" key={step}>
          <div className="ig-progress" aria-hidden="true">
            <span
              key={`${step}-${playing}-${visible}`}
              className={playing && visible ? 'running' : ''}
              style={{ animationDuration: `${STEP_DURATION}ms` }}
            />
          </div>
          <button
            type="button"
            className="ig-play"
            onClick={() => setPlaying((p) => !p)}
            aria-label={playing ? 'Pause walkthrough' : 'Play walkthrough'}
          >
            <i className={`bi ${playing ? 'bi-pause-fill' : 'bi-play-fill'}`} aria-hidden="true" /> {playing ? 'Pause' : 'Play'}
          </button>
          <span className="ig-step-icon"><i className={`bi ${STEPS[step].icon}`} aria-hidden="true" /></span>
          <span className="ig-step-count">Step {step + 1} of {STEPS.length}</span>
          <h3>{STEPS[step].title}</h3>
          <p>{STEPS[step].text}</p>
          <div className="ig-example">
            <span><i className="bi bi-stars" aria-hidden="true" /> CodeSphere example</span>
            <p>{STEPS[step].example}</p>
          </div>
          <div className="ig-step-nav">
            <button type="button" onClick={() => setStep(Math.max(0, step - 1))} disabled={step === 0}>
              <i className="bi bi-arrow-left" aria-hidden="true" /> Back
            </button>
            {step < STEPS.length - 1 ? (
              <button type="button" className="primary" onClick={() => setStep(step + 1)}>
                Next step <i className="bi bi-arrow-right" aria-hidden="true" />
              </button>
            ) : (
              <a className="primary" href={`${repoUrl}/issues`} target="_blank" rel="noreferrer">
                Go to CodeSphere issues <i className="bi bi-box-arrow-up-right" aria-hidden="true" />
              </a>
            )}
          </div>
        </div>
      </div>

      {/* ---------- Example issue ---------- */}
      <div className="ig-example-wrap">
        <div className="ig-example-head">
          <h3><i className="bi bi-github" aria-hidden="true" /> What a good issue looks like</h3>
          <div className="ig-tabs" role="tablist" aria-label="Template">
            {Object.entries(TEMPLATES).map(([id, t]) => (
              <button key={id} type="button" role="tab" aria-selected={tab === id} className={tab === id ? 'active' : ''} onClick={() => setTab(id)}>
                <i className={`bi ${t.icon}`} aria-hidden="true" /> {t.label}
              </button>
            ))}
          </div>
        </div>

        <div className="ig-issue">
          <div className="ig-issue-main">
            <div className="ig-issue-title">
              <h4>{template.title} <span>#42</span></h4>
              <span className="ig-state open"><i className="bi bi-record-circle" aria-hidden="true" /> Open</span>
            </div>
            <pre className="ig-issue-body">{template.body}</pre>
            <div className="ig-issue-actions">
              <a href={newIssueUrl} target="_blank" rel="noreferrer" className="ig-btn primary">
                <i className="bi bi-pencil-square" aria-hidden="true" /> Use this template on GitHub
              </a>
              <button type="button" className="ig-btn" onClick={copy}>
                <i className={`bi ${copied ? 'bi-check2' : 'bi-clipboard'}`} aria-hidden="true" /> {copied ? 'Copied!' : 'Copy text'}
              </button>
            </div>
            <p className="ig-hint">The button opens a new issue on the CodeSphere repo with this text filled in. Edit it to describe <em>your</em> problem.</p>
          </div>
          <aside className="ig-issue-side">
            <div><strong>Labels</strong><div className="ig-labels">{template.labels.map((l) => <Label key={l} name={l} color={labelColor(l)} />)}</div></div>
            <div><strong>Assignees</strong><span>No one, until a maintainer assigns you</span></div>
            <div><strong>Linked PR</strong><span>Added when you write &quot;Fixes #42&quot;</span></div>
          </aside>
        </div>
      </div>

      {/* ---------- Conversation ---------- */}
      <div className="ig-thread-wrap">
        <h3><i className="bi bi-chat-left-text" aria-hidden="true" /> From issue to merged fix: a real-looking conversation</h3>
        <ol className="ig-thread">
          {THREAD.map((c, i) => (
            <li key={i} className={`ig-comment ${c.kind || ''}`}>
              <img src={`https://github.com/${c.who === 'riya-dev' ? 'ghost' : c.who}.png?size=64`} alt="" loading="lazy" />
              <div>
                <p className="ig-comment-head">
                  <strong>{c.who === 'riya-dev' ? 'you' : c.who}</strong>
                  <span className={`ig-role ${c.role === 'Maintainer' ? 'maint' : ''}`}>{c.role}</span>
                  <span>· {c.when}</span>
                </p>
                <p>{c.text}</p>
                {c.kind === 'assign' && <p className="ig-event"><i className="bi bi-person-check" aria-hidden="true" /> Toumik-Haque assigned you</p>}
                {c.kind === 'pr' && <p className="ig-event"><i className="bi bi-git" aria-hidden="true" /> linked a pull request that will close this issue</p>}
                {c.kind === 'closed' && <p className="ig-event closed"><i className="bi bi-check-circle-fill" aria-hidden="true" /> Closed as completed via #57</p>}
              </div>
            </li>
          ))}
        </ol>
      </div>

      {/* ---------- Labels + do / don't ---------- */}
      <div className="ig-grid">
        <div className="ig-card">
          <h3><i className="bi bi-tags" aria-hidden="true" /> Labels you&apos;ll see</h3>
          <ul className="ig-label-list">
            {LABELS.map(([name, meaning, color]) => (
              <li key={name}><Label name={name} color={color} /> <span>{meaning}</span></li>
            ))}
          </ul>
          <p className="ig-hint">New here? Filter by <strong>good first issue</strong> to find a starting point.</p>
        </div>
        <div className="ig-card ig-do">
          <h3><i className="bi bi-check-circle" aria-hidden="true" /> Do</h3>
          <ul>{DOS.map((d) => <li key={d}><i className="bi bi-check-lg" aria-hidden="true" /> {d}</li>)}</ul>
        </div>
        <div className="ig-card ig-dont">
          <h3><i className="bi bi-x-circle" aria-hidden="true" /> Don&apos;t</h3>
          <ul>{DONTS.map((d) => <li key={d}><i className="bi bi-x-lg" aria-hidden="true" /> {d}</li>)}</ul>
        </div>
      </div>

      <div className="ig-cta">
        <div>
          <strong>Ready to raise your first issue?</strong>
          <p>Browse CodeSphere, find one thing to improve, and tell us about it.</p>
        </div>
        <div className="ig-cta-actions">
          <a href={`${repoUrl}/issues/new`} target="_blank" rel="noreferrer" className="ig-btn primary"><i className="bi bi-plus-lg" aria-hidden="true" /> New issue</a>
          <a href={`${repoUrl}/issues?q=is%3Aopen+label%3A%22good+first+issue%22`} target="_blank" rel="noreferrer" className="ig-btn">Good first issues</a>
        </div>
      </div>
    </section>
  );
}

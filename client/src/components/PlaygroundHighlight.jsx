import { Link } from 'react-router-dom';
import CodeTypingWindow from './CodeTypingWindow';
import '../css/PlaygroundHighlight.css';

const FEATURES = [
  ['bi-cloud-check', 'Zero setup', 'No installs, no .exe, no admin rights. Just open and code.'],
  ['bi-collection', '70+ languages', 'Python, C, C++, Java, JS, Go, Rust, SQL and many more.'],
  ['bi-trophy', 'Coding challenges', 'Earn XP from beginner puzzles to stack problems.'],
  ['bi-bug', 'Daily Debugging Arena', 'A new bug every day. Find it, keep your streak alive.'],
];

const PlaygroundHighlight = () => (
  <section className="playground-highlight" id="playground">
    <div className="container">
      <div className="playground-highlight-panel">
        <div className="playground-highlight-copy">
          <span className="playground-highlight-badge">
            <span className="playground-highlight-live" /> NEW · CODESPHERE PLAYGROUND
          </span>

          <h2>
            Your laptop is enough.
            <br />
            <span>Start coding in seconds.</span>
          </h2>

          <p>
            A browser-based coding lab for every student. Pick a language,
            run real code, try hands-on examples and climb the challenge
            leaderboard, all without installing a single thing.
          </p>

          <ul className="playground-highlight-features">
            {FEATURES.map(([icon, title, text]) => (
              <li key={title}>
                <i className={`bi ${icon}`} aria-hidden="true" />
                <div>
                  <strong>{title}</strong>
                  <span>{text}</span>
                </div>
              </li>
            ))}
          </ul>

          <div className="playground-highlight-actions">
            <Link to="/playground" className="btn btn-gold playground-highlight-cta">
              Open the Playground
              <i className="bi bi-arrow-up-right" aria-hidden="true" />
            </Link>
            <Link to="/playground#debugging-arena" className="playground-highlight-link">
              <i className="bi bi-bug" aria-hidden="true" /> Today's bug
            </Link>
          </div>
        </div>

        <CodeTypingWindow tilt />
      </div>
    </div>
  </section>
);

export default PlaygroundHighlight;

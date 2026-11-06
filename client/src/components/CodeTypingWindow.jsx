import { useEffect, useState } from 'react';
import { LANGUAGES } from '../data/playground';
import '../css/CodeTypingWindow.css';

// Short snippets typed out one after another.
const SNIPPETS = [
  { file: 'main.py', code: 'for dream in ["learn", "build", "ship"]:\n    print(f"Let\'s {dream}! 🚀")' },
  { file: 'main.cpp', code: 'int main() {\n    cout << "Bugs fear us." << endl;\n}' },
  { file: 'index.js', code: 'const you = "future developer";\nconsole.log(`Hello, ${you}!`);' },
];

// Decorative editor window that types code and scrolls a strip of languages.
const CodeTypingWindow = ({ compact = false, tilt = false }) => {
  const [snippetIndex, setSnippetIndex] = useState(0);
  const [typed, setTyped] = useState('');

  const snippet = SNIPPETS[snippetIndex];

  useEffect(() => {
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const nextSnippet = () => setSnippetIndex((i) => (i + 1) % SNIPPETS.length);
    let index = 0;
    let timer;

    const tick = () => {
      index += 1;
      setTyped(snippet.code.slice(0, index));
      timer = index < snippet.code.length
        ? window.setTimeout(tick, 38)
        : window.setTimeout(nextSnippet, 2600);
    };

    if (reduceMotion) {
      timer = window.setTimeout(() => {
        setTyped(snippet.code);
        timer = window.setTimeout(nextSnippet, 4000);
      }, 0);
    } else {
      timer = window.setTimeout(tick, 300);
    }

    return () => window.clearTimeout(timer);
  }, [snippet]);

  return (
    <div
      className={`code-window ${compact ? 'is-compact' : ''} ${tilt ? 'is-tilted' : ''}`}
      aria-hidden="true"
    >
      <div className="code-window-bar">
        <span className="dots"><span /><span /><span /></span>
        <span className="file">{snippet.file}</span>
        <span className="run"><i className="bi bi-play-fill" /> Run</span>
      </div>
      <pre className="code-window-code">
        <code>{typed}</code>
        <span className="caret" />
      </pre>
      <div className="code-window-langs">
        <div className="track">
          {[...LANGUAGES, ...LANGUAGES].map((lang, i) => (
            <span key={`${lang.id}-${i}`} style={{ '--lang-color': lang.color }}>
              <i className={`bi ${lang.icon}`} /> {lang.label}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
};

export default CodeTypingWindow;

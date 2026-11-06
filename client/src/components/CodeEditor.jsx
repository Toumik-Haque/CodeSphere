import { useEffect, useState } from 'react';
import Editor from '@monaco-editor/react';

const MONACO_LANG = {
  python: 'python', c: 'c', cpp: 'cpp', java: 'java', javascript: 'javascript', go: 'go', rust: 'rust', mysql: 'sql',
};

const SMALL_SCREEN = '(max-width: 767.98px)';

// Monaco (the VS Code editor) on larger screens; a plain textarea on phones,
// where Monaco is awkward to use with on-screen keyboards.
export default function CodeEditor({ value, onChange, language, height = 420, label = 'Code editor' }) {
  const [small, setSmall] = useState(() => window.matchMedia(SMALL_SCREEN).matches);

  useEffect(() => {
    const query = window.matchMedia(SMALL_SCREEN);
    const update = () => setSmall(query.matches);
    query.addEventListener('change', update);
    return () => query.removeEventListener('change', update);
  }, []);

  if (small) {
    return (
      <textarea
        className="code-editor-fallback"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        spellCheck={false}
        autoCapitalize="off"
        autoCorrect="off"
        aria-label={label}
        style={{ height }}
        onKeyDown={(e) => {
          // Insert 4 spaces on Tab instead of leaving the editor.
          if (e.key === 'Tab' && !e.shiftKey) {
            e.preventDefault();
            const { selectionStart, selectionEnd } = e.target;
            const next = `${value.slice(0, selectionStart)}    ${value.slice(selectionEnd)}`;
            onChange(next);
            requestAnimationFrame(() => {
              e.target.selectionStart = selectionStart + 4;
              e.target.selectionEnd = selectionStart + 4;
            });
          }
        }}
      />
    );
  }

  return (
    <div className="code-editor" aria-label={label}>
      <Editor
        height={height}
        language={MONACO_LANG[language] || 'plaintext'}
        value={value}
        onChange={(v) => onChange(v ?? '')}
        theme="vs-dark"
        loading={<div className="code-editor-loading">Loading editor…</div>}
        options={{
          fontSize: 14,
          minimap: { enabled: false },
          scrollBeyondLastLine: false,
          tabSize: 4,
          automaticLayout: true,
          wordWrap: 'on',
          ariaLabel: label,
        }}
      />
    </div>
  );
}

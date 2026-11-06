// Renders user-written text with a small, safe formatting subset:
//   ```code blocks```, `inline code`, **bold**, and http(s) links.
// Everything becomes React text nodes, so no HTML from users is ever
// rendered (no scripts, event handlers or unsafe URLs).

const INLINE = /(`[^`\n]+`|\*\*[^*\n]+\*\*|https?:\/\/[^\s<>"')\]]+)/g;

function renderInline(text, keyPrefix) {
  return text.split(INLINE).map((part, i) => {
    const key = `${keyPrefix}-${i}`;
    if (!part) return null;
    if (part.startsWith('`') && part.endsWith('`') && part.length > 2) {
      return <code key={key}>{part.slice(1, -1)}</code>;
    }
    if (part.startsWith('**') && part.endsWith('**') && part.length > 4) {
      return <strong key={key}>{part.slice(2, -2)}</strong>;
    }
    if (/^https?:\/\//.test(part)) {
      // Trailing punctuation usually isn't part of the link.
      const match = part.match(/^(.*?)([.,;:!?]*)$/);
      return (
        <span key={key}>
          <a href={match[1]} target="_blank" rel="noopener noreferrer nofollow ugc">{match[1]}</a>
          {match[2]}
        </span>
      );
    }
    return part;
  });
}

export default function SafeText({ text, className = '' }) {
  const blocks = String(text || '').split(/```/);

  return (
    <div className={`safe-text ${className}`}>
      {blocks.map((block, i) => {
        if (i % 2 === 1) {
          // Code block; an optional language name on the first line is dropped.
          const code = block.replace(/^[a-zA-Z0-9+#-]*\n/, '');
          return <pre key={i}><code>{code.replace(/\n$/, '')}</code></pre>;
        }
        return block
          .split(/\n{2,}/)
          .map((para) => para.trim())
          .filter(Boolean)
          .map((para, j) => (
            <p key={`${i}-${j}`}>
              {para.split('\n').map((line, k, lines) => (
                <span key={k}>
                  {renderInline(line, `${i}-${j}-${k}`)}
                  {k < lines.length - 1 && <br />}
                </span>
              ))}
            </p>
          ));
      })}
    </div>
  );
}

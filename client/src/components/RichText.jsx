import DOMPurify from 'dompurify';

// Shows a rich (HTML) forum post. The server already sanitises it; we
// sanitise again here, and turn @[Name](id) tokens into mention chips.
const MENTION = /@\[([^\]<\n]{1,80})\]\(([a-f0-9]{24})\)/g;

export default function RichText({ html, className = '' }) {
  const withMentions = String(html || '').replace(MENTION, '<span class="mention">@$1</span>');
  const clean = DOMPurify.sanitize(withMentions, {
    ALLOWED_TAGS: ['p', 'br', 'strong', 'b', 'em', 'i', 'u', 's', 'h2', 'h3', 'h4', 'ul', 'ol', 'li', 'a', 'blockquote', 'pre', 'code', 'hr', 'table', 'thead', 'tbody', 'tr', 'th', 'td', 'span'],
    ALLOWED_ATTR: ['href', 'target', 'rel', 'style', 'class', 'colspan', 'rowspan'],
  });
  return <div className={`safe-text rich-text ${className}`} dangerouslySetInnerHTML={{ __html: clean }} />;
}

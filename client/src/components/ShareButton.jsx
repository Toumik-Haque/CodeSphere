import { useEffect, useRef, useState } from 'react';
import '../css/ShareAndPush.css';

// Share a page: the phone's share sheet when available, otherwise a small menu
// with WhatsApp, LinkedIn, X, email and Copy link.
export default function ShareButton({ title, text = '', path, className = '' }) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const ref = useRef(null);
  const url = `${window.location.origin}${path || window.location.pathname}`;
  const message = text ? `${title}: ${text}` : title;

  useEffect(() => {
    if (!open) return undefined;
    const close = (e) => {
      if (e.type === 'keydown' ? e.key === 'Escape' : !ref.current?.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', close);
    document.addEventListener('keydown', close);
    return () => {
      document.removeEventListener('mousedown', close);
      document.removeEventListener('keydown', close);
    };
  }, [open]);

  const share = async () => {
    // Phones: the native share sheet (WhatsApp, Instagram, Telegram…).
    if (navigator.share && window.matchMedia?.('(pointer: coarse)').matches) {
      try {
        await navigator.share({ title, text: message, url });
        return;
      } catch (error) {
        if (error.name === 'AbortError') return;
      }
    }
    setOpen((v) => !v);
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      window.prompt('Copy this link:', url);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const enc = encodeURIComponent;
  const targets = [
    { label: 'WhatsApp', icon: 'bi-whatsapp', href: `https://wa.me/?text=${enc(`${message}\n${url}`)}` },
    { label: 'LinkedIn', icon: 'bi-linkedin', href: `https://www.linkedin.com/sharing/share-offsite/?url=${enc(url)}` },
    { label: 'X', icon: 'bi-twitter-x', href: `https://twitter.com/intent/tweet?text=${enc(message)}&url=${enc(url)}` },
    { label: 'Email', icon: 'bi-envelope', href: `mailto:?subject=${enc(title)}&body=${enc(`${message}\n\n${url}`)}` },
  ];

  return (
    <div className={`share ${className}`} ref={ref}>
      <button type="button" className="share-btn" onClick={share} aria-expanded={open} aria-haspopup="menu">
        <i className="bi bi-share" aria-hidden="true" /> Share
      </button>
      {open && (
        <div className="share-menu" role="menu">
          {targets.map((t) => (
            <a key={t.label} role="menuitem" href={t.href} target="_blank" rel="noopener noreferrer" onClick={() => setOpen(false)}>
              <i className={`bi ${t.icon}`} aria-hidden="true" /> {t.label}
            </a>
          ))}
          <button type="button" role="menuitem" onClick={copy}>
            <i className={`bi ${copied ? 'bi-check2' : 'bi-link-45deg'}`} aria-hidden="true" /> {copied ? 'Link copied' : 'Copy link'}
          </button>
        </div>
      )}
    </div>
  );
}

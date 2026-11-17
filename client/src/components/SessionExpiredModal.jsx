import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import '../css/SessionExpiredModal.css';

export default function SessionExpiredModal({ open, message, onClose, onSignIn }) {
  const signInRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;

    const previousFocus = document.activeElement;
    const previousOverflow = document.body.style.overflow;

    document.body.style.overflow = 'hidden';
    signInRef.current?.focus();

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') onClose();
    };

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', handleKeyDown);
      if (previousFocus instanceof HTMLElement) previousFocus.focus();
    };
  }, [open, onClose]);

  if (!open) return null;

  return createPortal(
    <div
      className="session-expired-backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
      role="presentation"
    >
      <section
        className="session-expired-card"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="session-expired-title"
        aria-describedby="session-expired-message"
      >
        <button
          type="button"
          className="session-expired-close"
          onClick={onClose}
          aria-label="Dismiss session expired message"
        >
          <i className="bi bi-x-lg" aria-hidden="true" />
        </button>

        <div className="session-expired-icon" aria-hidden="true">
          <i className="bi bi-shield-lock-fill" />
        </div>

        <span className="session-expired-kicker">Security notice</span>
        <h2 id="session-expired-title">Your session expired</h2>
        <p id="session-expired-message">
          {message || 'Your sign-in is no longer valid. Please sign in again to continue.'}
        </p>

        <div className="session-expired-actions">
          <button type="button" className="session-expired-secondary" onClick={onClose}>
            Dismiss
          </button>
          <button type="button" className="session-expired-primary" ref={signInRef} onClick={onSignIn}>
            Sign in again
            <i className="bi bi-arrow-right" aria-hidden="true" />
          </button>
        </div>
      </section>
    </div>,
    document.body,
  );
}

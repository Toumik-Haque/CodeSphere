import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import '../css/ActionNotice.css';

const TONES = {
  success: {
    icon: 'bi-check2-circle',
    title: 'All set',
    message: 'Done.',
  },
  error: {
    icon: 'bi-exclamation-triangle-fill',
    title: 'Something went wrong',
    message: 'Please try again.',
  },
  info: {
    icon: 'bi-info-circle-fill',
    title: 'Good to know',
    message: 'Update.',
  },
};

const VISIBLE_FOR = 4500;

function ToastItem({ notice, onClose }) {
  const [paused, setPaused] = useState(false);
  const timerRef = useRef(null);
  const startedRef = useRef(0);
  const remainingRef = useRef(VISIBLE_FOR);

  useEffect(() => {
    if (paused) {
      window.clearTimeout(timerRef.current);
      const elapsed = Date.now() - startedRef.current;
      remainingRef.current = Math.max(0, remainingRef.current - elapsed);
      return undefined;
    }

    startedRef.current = Date.now();
    timerRef.current = window.setTimeout(() => onClose(notice.id), remainingRef.current);
    return () => window.clearTimeout(timerRef.current);
  }, [notice.id, onClose, paused]);

  const toneKey = TONES[notice.tone] ? notice.tone : 'success';
  const tone = TONES[toneKey];

  return (
    <div
      className={`action-notice-toast is-${toneKey}${paused ? ' is-paused' : ''}`}
      role={toneKey === 'error' ? 'alert' : 'status'}
      aria-live={toneKey === 'error' ? 'assertive' : 'polite'}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setPaused(false);
      }}
    >
      <span className="action-notice-icon" aria-hidden="true">
        <i className={`bi ${tone.icon}`} />
      </span>

      <div className="action-notice-copy">
        <strong className="action-notice-title">{notice.title || tone.title}</strong>
        <span className="action-notice-message">
          {notice.message || notice.kicker || tone.message}
        </span>
      </div>

      <button
        type="button"
        className="action-notice-close"
        onClick={() => onClose(notice.id)}
        aria-label="Dismiss notification"
      >
        <i className="bi bi-x-lg" aria-hidden="true" />
      </button>

      <span className="action-notice-progress" aria-hidden="true" />
    </div>
  );
}

export default function ActionNotice({ notices, onClose }) {
  if (!notices.length) return null;

  return createPortal(
    <div className="action-notice-stack" aria-label="Notifications">
      {notices.map((notice) => (
        <ToastItem key={notice.id} notice={notice} onClose={onClose} />
      ))}
    </div>,
    document.body,
  );
}

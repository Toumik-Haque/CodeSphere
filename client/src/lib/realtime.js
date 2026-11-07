// Server-Sent Events helpers for live updates.
import { apiRequest } from './api';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
const supported = typeof window !== 'undefined' && 'EventSource' in window;

/**
 * My private stream (new notifications). Uses a one-time ticket, so on a
 * dropped connection it fetches a new ticket and reconnects with backoff.
 * Returns a function that closes the stream.
 */
export function openUserStream(onNotification) {
  if (!supported) return () => {};
  let source = null;
  let closed = false;
  let retryMs = 3000;
  let timer = null;

  const connect = async () => {
    if (closed) return;
    try {
      const { ticket } = await apiRequest('/realtime/ticket', { method: 'POST' });
      if (closed) return;
      source = new EventSource(`${API_URL}/realtime/me?ticket=${encodeURIComponent(ticket)}`);
      source.addEventListener('open', () => {
        retryMs = 3000;
      });
      source.addEventListener('notification', (e) => {
        try {
          onNotification(JSON.parse(e.data));
        } catch {
          /* ignore malformed events */
        }
      });
      source.addEventListener('error', () => {
        // The ticket was single-use, so reconnect with a fresh one.
        source.close();
        timer = window.setTimeout(connect, retryMs);
        retryMs = Math.min(retryMs * 2, 60000);
      });
    } catch {
      timer = window.setTimeout(connect, retryMs);
      retryMs = Math.min(retryMs * 2, 60000);
    }
  };

  connect();
  return () => {
    closed = true;
    window.clearTimeout(timer);
    source?.close();
  };
}

/** Public stream for one forum thread ('reply' events). Returns a closer. */
export function openThreadStream(threadId, onReply) {
  if (!supported) return () => {};
  const source = new EventSource(`${API_URL}/realtime/threads/${threadId}`);
  source.addEventListener('reply', (e) => {
    try {
      onReply(JSON.parse(e.data));
    } catch {
      /* ignore malformed events */
    }
  });
  return () => source.close();
}

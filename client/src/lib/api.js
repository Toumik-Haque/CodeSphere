const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

export const AUTH_EXPIRED_EVENT = 'codesphere:auth-expired';
const EXPIRED_TOKEN_MESSAGE = /invalid or expired authentication token/i;
let lastExpiredNotice = { token: '', at: 0 };

export function notifyAuthExpired(message, token) {
  if (!EXPIRED_TOKEN_MESSAGE.test(message || '')) return;
  const now = Date.now();
  if (lastExpiredNotice.token === token && now - lastExpiredNotice.at < 2000) return;
  lastExpiredNotice = { token, at: now };
  window.dispatchEvent(new CustomEvent(AUTH_EXPIRED_EVENT, {
    detail: { message, token },
  }));
}

export async function apiRequest(endpoint, options = {}) {
  const token = localStorage.getItem('codesphere_token');
  const isFormData = options.body instanceof FormData;

  const headers = {
    ...(options.body && !isFormData
      ? { 'Content-Type': 'application/json' }
      : {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };

  // Let the browser set Content-Type and the multipart boundary for FormData.
  if (isFormData) {
    delete headers['Content-Type'];
    delete headers['content-type'];
  }

  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers,
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const message = data.message || 'Something went wrong.';
    const error = new Error(message);
    // Extra details (e.g. a list of missing fields) for pages that want them.
    error.status = response.status;
    error.data = data;
    if (response.status === 401) notifyAuthExpired(message, token);
    throw error;
  }

  return data;
}

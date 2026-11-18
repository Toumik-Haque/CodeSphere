// Remembers the last page a visitor was on, so signing in (or creating an
// account) brings them back to it, e.g. the event they were about to register
// for, instead of the dashboard. Kept per browser tab in sessionStorage.

const KEY = 'cs_return_to';
const AUTH_PAGES = ['/login', '/register', '/reset-password'];

// Only same-site paths, never the auth pages themselves.
const isSafe = (path) => typeof path === 'string'
  && path.startsWith('/')
  && !path.startsWith('//')
  && !AUTH_PAGES.some((page) => path === page || path.startsWith(`${page}?`) || path.startsWith(`${page}#`));

export function rememberPage(path) {
  if (!isSafe(path)) return;
  try {
    sessionStorage.setItem(KEY, path);
  } catch {
    // Storage blocked: signing in falls back to the dashboard.
  }
}

// Where to go after signing in: the page they were sent from, else the last
// page they visited, else null (the caller picks the dashboard). The home page
// doesn't count: from there the dashboard is the better place to land.
export function returnPath(fromState) {
  let stored = null;
  try {
    stored = sessionStorage.getItem(KEY);
  } catch {
    stored = null;
  }
  const path = [fromState, stored].find(isSafe);
  return path && path !== '/' ? path : null;
}

export function clearReturnPath() {
  try {
    sessionStorage.removeItem(KEY);
  } catch {
    // ignore
  }
}

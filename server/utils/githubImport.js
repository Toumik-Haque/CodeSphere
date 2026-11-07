// Public GitHub repository import (Project Hub MVP).
//
// Security: the browser only sends a URL. We parse it strictly, accept only
// github.com/{owner}/{repo}, and build a FIXED request to api.github.com:
// no arbitrary hosts, ports, credentials or redirects (SSRF-safe).
// Optional GITHUB_TOKEN (server-side only) raises the rate limit from 60 to 5000/hour.

const sanitizeHtml = require('sanitize-html');

const OWNER = /^[A-Za-z0-9](?:[A-Za-z0-9-]{0,38})$/;
const REPO = /^[A-Za-z0-9._-]{1,100}$/;
const TIMEOUT = 10000;
const CACHE_MS = 10 * 60 * 1000;
const cache = new Map();

class ImportError extends Error {
  constructor(status, message, extra = {}) {
    super(message);
    this.status = status;
    Object.assign(this, extra);
  }
}

/** Returns { owner, repo, url } or throws ImportError(400). */
function parseGithubUrl(input) {
  const raw = String(input || '').trim();
  if (!raw || raw.length > 300) throw new ImportError(400, 'Paste a GitHub repository link like https://github.com/owner/repo');
  // Allow "github.com/owner/repo" without a scheme.
  const withScheme = /^https?:\/\//i.test(raw) ? raw : (/^(www\.)?github\.com\//i.test(raw) ? `https://${raw}` : raw);
  let url;
  try {
    url = new URL(withScheme);
  } catch {
    throw new ImportError(400, 'That is not a valid link. Use https://github.com/owner/repo');
  }
  const host = url.hostname.toLowerCase();
  if (!['https:', 'http:'].includes(url.protocol)) throw new ImportError(400, 'Only https://github.com links are supported.');
  if (host !== 'github.com' && host !== 'www.github.com') throw new ImportError(400, 'Only github.com repository links are supported.');
  if (url.username || url.password) throw new ImportError(400, 'Links with usernames or passwords are not allowed.');
  if (url.port) throw new ImportError(400, 'Links with a custom port are not supported.');
  if (url.search || url.hash) throw new ImportError(400, 'Remove the ?query or #section from the link.');
  const parts = url.pathname.replace(/\/+$/, '').split('/').filter(Boolean);
  if (parts.length !== 2) throw new ImportError(400, 'Use the main repository link: https://github.com/owner/repo');
  const owner = parts[0];
  const repo = parts[1].replace(/\.git$/i, '');
  if (!OWNER.test(owner) || !REPO.test(repo) || repo === '.' || repo === '..') {
    throw new ImportError(400, 'That does not look like a GitHub owner/repository name.');
  }
  return { owner, repo, url: `https://github.com/${owner}/${repo}` };
}

async function gh(path, { accept = 'application/vnd.github+json', text = false } = {}) {
  const headers = { Accept: accept, 'User-Agent': 'CodeSphere-Project-Hub', 'X-GitHub-Api-Version': '2022-11-28' };
  if (process.env.GITHUB_TOKEN) headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
  let response;
  try {
    response = await fetch(`https://api.github.com${path}`, { headers, redirect: 'error', signal: AbortSignal.timeout(TIMEOUT) });
  } catch {
    throw new ImportError(503, 'GitHub is not responding right now. Your details are kept; try again in a minute.');
  }
  if (response.status === 404) return { notFound: true };
  if (response.status === 403 || response.status === 429) {
    const reset = Number(response.headers.get('x-ratelimit-reset'));
    const retryAt = reset ? new Date(reset * 1000) : null;
    throw new ImportError(429, 'GitHub\'s rate limit was reached. Try again a little later.', { retryAt });
  }
  if (!response.ok) throw new ImportError(response.status >= 500 ? 503 : 422, 'GitHub could not process this repository right now.');
  if (text) {
    const body = await response.text();
    return { body: body.slice(0, 200000) };
  }
  return { body: await response.json() };
}

// README → short plain-text preview (no HTML is ever stored or rendered).
function readmePreview(markdown) {
  const text = sanitizeHtml(String(markdown || ''), { allowedTags: [], allowedAttributes: {} })
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/^#{1,6}\s*/gm, '')
    .replace(/[*_`>|]/g, '')
    .replace(/&[a-z#0-9]+;/gi, ' ')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
  return text.length > 1200 ? `${text.slice(0, 1197)}…` : text;
}

/** Fetch a normalized preview for a public repository. */
async function fetchRepoPreview(input) {
  const { owner, repo, url } = parseGithubUrl(input);
  const key = `${owner}/${repo}`.toLowerCase();
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < CACHE_MS) return hit.data;

  const meta = await gh(`/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}`);
  // Private and missing repositories look the same to us: don't reveal which.
  if (meta.notFound) throw new ImportError(404, 'We could not access that repository. Check the link, and make sure it is public.');
  const r = meta.body;
  if (r.private) throw new ImportError(404, 'We could not access that repository. Check the link, and make sure it is public.');

  const [langs, topics, readme] = await Promise.all([
    gh(`/repos/${encodeURIComponent(r.owner.login)}/${encodeURIComponent(r.name)}/languages`).catch(() => ({ body: {} })),
    gh(`/repos/${encodeURIComponent(r.owner.login)}/${encodeURIComponent(r.name)}/topics`).catch(() => ({ body: {} })),
    gh(`/repos/${encodeURIComponent(r.owner.login)}/${encodeURIComponent(r.name)}/readme`, { accept: 'application/vnd.github.raw+json', text: true }).catch(() => ({ notFound: true })),
  ]);

  const languages = Object.entries(langs.body || {}).sort((a, b) => b[1] - a[1]).map(([name]) => name).slice(0, 8);
  const homepage = /^https?:\/\//i.test(r.homepage || '') ? r.homepage.slice(0, 300) : '';
  const data = {
    url: `https://github.com/${r.owner.login}/${r.name}`,
    requestedUrl: url,
    owner: r.owner.login,
    repo: r.name,
    nodeId: r.node_id,
    description: (r.description || '').slice(0, 400),
    defaultBranch: r.default_branch,
    license: r.license?.spdx_id && r.license.spdx_id !== 'NOASSERTION' ? r.license.spdx_id : '',
    licenseName: r.license?.name || '',
    languages,
    topics: (topics.body?.names || []).slice(0, 12),
    stars: r.stargazers_count || 0,
    forks: r.forks_count || 0,
    openIssues: r.open_issues_count || 0,
    pushedAt: r.pushed_at,
    homepage,
    readmePreview: readme.notFound ? '' : readmePreview(readme.body),
    isFork: Boolean(r.fork),
    isArchived: Boolean(r.archived),
    isEmpty: !r.size,
    fetchedAt: new Date().toISOString(),
  };
  const warnings = [];
  if (!data.readmePreview) warnings.push('No README found: add a clear description and screenshots.');
  if (!data.license) warnings.push('No license detected: the project will show "No license detected".');
  if (data.isFork) warnings.push('This is a fork: describe what you changed and credit the original authors.');
  if (data.isArchived) warnings.push('This repository is archived on GitHub.');
  if (data.isEmpty) warnings.push('This repository looks empty.');
  if (r.owner.login.toLowerCase() !== owner.toLowerCase() || r.name.toLowerCase() !== repo.toLowerCase()) {
    warnings.push(`This repository moved to ${data.url}.`);
  }
  warnings.push('Confirm your role and credit every contributor.');
  const result = { repository: data, warnings };
  cache.set(key, { at: Date.now(), data: result });
  return result;
}

module.exports = { parseGithubUrl, fetchRepoPreview, readmePreview, ImportError };

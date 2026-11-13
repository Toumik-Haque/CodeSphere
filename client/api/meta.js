const FALLBACK_TITLE = 'CodeSphere - AGEMC';
const FALLBACK_DESCRIPTION =
  'CodeSphere is the AGEMC student developer community for events, hackathons, projects, study materials, and more.';

const escapeHtml = (value) =>
  String(value ?? '').replace(/[&<>"']/g, (character) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  }[character]));

const safeHttpUrl = (value) => {
  try {
    const url = new URL(value);
    return ['http:', 'https:'].includes(url.protocol) ? url.toString() : '';
  } catch {
    return '';
  }
};

const requestOrigin = (req) => {
  const host = req.headers['x-forwarded-host'] || req.headers.host;
  const protocol = req.headers['x-forwarded-proto'] || 'https';
  return `${protocol}://${host}`;
};

async function loadMeta(path, origin) {
  const fallback = {
    title: FALLBACK_TITLE,
    description: FALLBACK_DESCRIPTION,
    image: `${origin}/email-logo.png`,
    url: `${origin}${path}`,
    siteName: 'CodeSphere',
  };

  const apiBase = (process.env.VITE_API_URL || process.env.API_URL || '').replace(/\/+$/, '');
  if (!apiBase) return fallback;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 4500);

  try {
    const response = await fetch(`${apiBase}/share?path=${encodeURIComponent(path)}`, {
      signal: controller.signal,
    });
    if (!response.ok) return fallback;

    const data = await response.json();
    return {
      title: data.title || fallback.title,
      description: data.description || fallback.description,
      image: safeHttpUrl(data.image) || fallback.image,
      url: safeHttpUrl(data.url) || fallback.url,
      siteName: data.siteName || fallback.siteName,
    };
  } catch {
    return fallback;
  } finally {
    clearTimeout(timeout);
  }
}

export default async function handler(req, res) {
  const rawPath = Array.isArray(req.query.path) ? req.query.path[0] : req.query.path;
  const path = rawPath === '/' ? '/' : `/${String(rawPath || '').replace(/^\/+|\/+$/g, '')}`;
  const origin = requestOrigin(req);
  const meta = await loadMeta(path, origin);

  const title = escapeHtml(meta.title);
  const description = escapeHtml(meta.description);
  const image = escapeHtml(meta.image);
  const url = escapeHtml(meta.url);
  const siteName = escapeHtml(meta.siteName);

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 'public, max-age=0, s-maxage=300, stale-while-revalidate=86400');
  res.status(200).send(`<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${title}</title>
    <meta name="description" content="${description}" />
    <link rel="canonical" href="${url}" />
    <meta property="og:type" content="website" />
    <meta property="og:site_name" content="${siteName}" />
    <meta property="og:title" content="${title}" />
    <meta property="og:description" content="${description}" />
    <meta property="og:url" content="${url}" />
    <meta property="og:image" content="${image}" />
    <meta property="og:image:alt" content="${title}" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${title}" />
    <meta name="twitter:description" content="${description}" />
    <meta name="twitter:image" content="${image}" />
  </head>
  <body>
    <p><a href="${url}">${title}</a></p>
  </body>
</html>`);
}

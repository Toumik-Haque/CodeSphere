// Weekly Tech News ingestion: fetch approved RSS/Atom feeds and store new
// items as *candidates* for editors to review. Nothing is published here.

const sanitizeHtml = require('sanitize-html');
const User = require('../models/User');
const { NewsSource, NewsItem, NewsDigest, NewsFetchLog } = require('../models/News');
const { NEWS_LIMITS } = require('../data/news');
const { notify } = require('./notify');

// ---------- text and URL safety ----------

const ENTITIES = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', '#39': "'" };

function decodeEntities(text) {
  return text.replace(/&(#x[0-9a-f]+|#\d+|[a-z0-9]+);/gi, (match, code) => {
    if (code[0] === '#') {
      const n = code[1].toLowerCase() === 'x' ? parseInt(code.slice(2), 16) : parseInt(code.slice(1), 10);
      return Number.isFinite(n) && n > 0 && n < 0x110000 ? String.fromCodePoint(n) : '';
    }
    return ENTITIES[code.toLowerCase()] ?? match;
  });
}

// Feed content is untrusted: strip every tag (scripts, iframes, images…).
function toPlainText(html, max) {
  const unwrapped = String(html || '').replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1');
  // Decode first: Atom often sends escaped HTML (&lt;b&gt;), which must be
  // stripped as tags too. Decode again after, since stripping re-escapes.
  const stripped = sanitizeHtml(decodeEntities(unwrapped), { allowedTags: [], allowedAttributes: {} });
  const text = decodeEntities(stripped).replace(/\s+/g, ' ').trim();
  return max && text.length > max ? `${text.slice(0, max - 1)}…` : text;
}

const TRACKING = /^(utm_|fbclid$|gclid$|mc_|ref$|ref_src$)/i;

// Normalise for deduplication; only http(s) URLs are accepted.
function canonicalUrl(raw) {
  try {
    const url = new URL(String(raw).trim());
    if (!['http:', 'https:'].includes(url.protocol)) return null;
    url.hash = '';
    url.hostname = url.hostname.toLowerCase();
    [...url.searchParams.keys()].forEach((key) => TRACKING.test(key) && url.searchParams.delete(key));
    let out = url.toString();
    if (url.pathname !== '/' && out.endsWith('/') && !url.search) out = out.slice(0, -1);
    return out;
  } catch {
    return null;
  }
}

// e.g. "blog.example.co.uk" → "example.co.uk"-ish: last two labels.
function baseDomain(host) {
  return host.toLowerCase().split('.').slice(-2).join('.');
}

// ---------- feed parsing (RSS 2.0 and Atom) ----------

function tag(block, names) {
  for (const name of names) {
    const match = block.match(new RegExp(`<${name}(?:\\s[^>]*)?>([\\s\\S]*?)</${name}>`, 'i'));
    if (match) return match[1];
  }
  return '';
}

function atomLink(block) {
  const links = [...block.matchAll(/<link\b([^>]*)\/?>/gi)].map((m) => m[1]);
  const pick = links.find((attrs) => /rel=["']alternate["']/i.test(attrs)) || links.find((attrs) => !/rel=/i.test(attrs)) || links[0];
  return pick ? (pick.match(/href=["']([^"']+)["']/i) || [])[1] || '' : '';
}

function parseFeed(xml) {
  const blocks = [...xml.matchAll(/<(item|entry)\b[\s\S]*?<\/\1>/gi)].map((m) => m[0]);
  return blocks.slice(0, NEWS_LIMITS.maxItemsPerFetch).map((block) => {
    const rssLink = toPlainText(tag(block, ['link']));
    const link = rssLink && /^https?:/i.test(rssLink) ? rssLink : decodeEntities(atomLink(block));
    const dateText = toPlainText(tag(block, ['pubDate', 'published', 'updated', 'dc:date']));
    const date = dateText ? new Date(dateText) : null;
    return {
      title: toPlainText(tag(block, ['title']), NEWS_LIMITS.titleMax),
      link,
      guid: toPlainText(tag(block, ['guid', 'id'])),
      author: toPlainText(tag(block, ['dc:creator', 'author', 'name']), 120),
      publishedAt: date && !Number.isNaN(date.getTime()) ? date : null,
      summary: toPlainText(tag(block, ['description', 'summary', 'content:encoded', 'content']), NEWS_LIMITS.feedSummaryMax),
    };
  });
}

// ---------- fetching ----------

async function fetchFeedText(source) {
  const feedUrl = canonicalUrl(source.feedUrl);
  if (!feedUrl) throw new Error('The feed URL is not a valid http(s) URL.');

  const response = await fetch(feedUrl, {
    headers: { 'User-Agent': 'CodeSphereNewsBot/1.0 (+student coding community digest)', Accept: 'application/rss+xml, application/atom+xml, application/xml, text/xml;q=0.9' },
    redirect: 'follow',
    signal: AbortSignal.timeout(NEWS_LIMITS.fetchTimeoutMs),
  });

  // Redirects must stay on the source's own domain.
  const finalHost = new URL(response.url).hostname;
  const allowed = [new URL(feedUrl).hostname, new URL(source.baseUrl).hostname].map(baseDomain);
  if (!allowed.includes(baseDomain(finalHost))) throw new Error(`Redirected to an unapproved domain (${finalHost}).`);
  if (!response.ok) throw new Error(`HTTP ${response.status}`);

  const declared = Number(response.headers.get('content-length') || 0);
  if (declared > NEWS_LIMITS.maxFeedBytes) throw new Error('Feed is too large.');

  // Read with a hard size cap even if no length was declared.
  const reader = response.body.getReader();
  const chunks = [];
  let size = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.length;
    if (size > NEWS_LIMITS.maxFeedBytes) {
      await reader.cancel();
      throw new Error('Feed is too large.');
    }
    chunks.push(value);
  }
  return Buffer.concat(chunks).toString('utf8');
}

/** Fetch one source and store new candidates. Returns { found, added }. */
async function ingestSource(source, trigger = 'manual') {
  source.lastFetchedAt = new Date();
  try {
    const items = parseFeed(await fetchFeedText(source));
    let added = 0;

    for (const item of items) {
      const url = canonicalUrl(item.link);
      if (!url || !item.title) continue;
      const exists = await NewsItem.exists({
        $or: [{ canonicalUrl: url }, ...(item.guid ? [{ source: source._id, externalId: item.guid }] : [])],
      });
      if (exists) continue;
      try {
        await NewsItem.create({
          source: source._id,
          sourceName: source.name,
          externalId: item.guid,
          canonicalUrl: url,
          title: item.title,
          author: item.author,
          publishedAt: item.publishedAt,
          feedSummary: item.summary,
          category: source.category,
          status: 'candidate',
        });
        added += 1;
      } catch (error) {
        if (error.code !== 11000) throw error; // duplicate URL raced in
      }
    }

    source.lastSuccessAt = new Date();
    source.lastError = '';
    source.lastFetchCount = added;
    await source.save();
    await NewsFetchLog.create({ source: source._id, ok: true, found: items.length, added, trigger });
    return { found: items.length, added };
  } catch (error) {
    const message = error.name === 'TimeoutError' ? 'Timed out' : error.message;
    source.lastError = message.slice(0, 300);
    await source.save();
    await NewsFetchLog.create({ source: source._id, ok: false, error: message.slice(0, 300), trigger });
    throw new Error(message);
  }
}

async function ingestAll(trigger = 'manual') {
  const sources = await NewsSource.find({ isActive: true, feedUrl: { $ne: '' } });
  const results = [];
  for (const source of sources) {
    try {
      results.push({ source: source.name, ok: true, ...(await ingestSource(source, trigger)) });
    } catch (error) {
      results.push({ source: source.name, ok: false, error: error.message });
    }
  }
  return results;
}

// Notify students when a digest goes live (now or at its scheduled time).
async function notifyLiveDigests() {
  const due = await NewsDigest.find({ status: 'published', publishedAt: { $lte: new Date() }, notifiedAt: null });
  if (!due.length) return;
  const students = (await User.find({ role: 'user' }).select('_id').lean()).map((u) => u._id);
  for (const digest of due) {
    await notify(students, {
      type: 'news-digest',
      title: `This week's CodeSphere Tech Brief is ready: ${digest.title}`,
      link: `/news/${digest.slug}`,
    });
    digest.notifiedAt = new Date();
    await digest.save();
  }
}

// Runs hourly: feeds are fetched every NEWS_FETCH_HOURS (default 24) and
// scheduled digests are announced. Set NEWS_SCHEDULER=off to disable.
function startNewsScheduler() {
  if (process.env.NEWS_SCHEDULER === 'off') return;
  const fetchEveryMs = Math.max(1, Number(process.env.NEWS_FETCH_HOURS) || 24) * 3600000;
  let lastFetch = 0;

  const tick = async () => {
    try {
      await notifyLiveDigests();
      if (Date.now() - lastFetch >= fetchEveryMs) {
        lastFetch = Date.now();
        const results = await ingestAll('schedule');
        if (results.length) console.log('News fetch:', results.map((r) => `${r.source}: ${r.ok ? `+${r.added}` : r.error}`).join(' | '));
      }
    } catch (error) {
      console.error('News scheduler error:', error.message);
    }
  };

  setTimeout(tick, 60 * 1000).unref();
  setInterval(tick, 60 * 60 * 1000).unref();
}

module.exports = {
  toPlainText,
  canonicalUrl,
  parseFeed,
  ingestSource,
  ingestAll,
  notifyLiveDigests,
  startNewsScheduler,
};

// Daily tech news, fully automatic.
//
// Key-free sources: Hacker News API, dev.to API and public RSS feeds.
// Optional free-key sources (used only when the key is set):
//   GNEWS_API_KEY     → https://gnews.io (100 requests/day free)
//   NEWSDATA_API_KEY  → https://newsdata.io (200 credits/day free)
//
// Every DAILY_NEWS_SYNC_HOURS (default 3) new stories are collected. Each
// morning at DAILY_BRIEF_HOUR (IST, default 8) a "Today in Tech" top-5 is
// built, students get an in-app notification and daily-email subscribers
// get an email. NEWS_AUTO_DIGEST=on also auto-publishes the weekly Tech
// Brief on Monday mornings if editors haven't published one.

const User = require('../models/User');
const { DailyNews, DailyBrief, DailyNewsSync } = require('../models/DailyNews');
const { NewsItem, NewsDigest } = require('../models/News');
const { parseFeed, canonicalUrl, toPlainText } = require('./newsIngest');
const { notify } = require('./notify');
const { sendDailyBriefEmail } = require('./newsletter');

const UA = 'CodeSphereNewsBot/1.0 (+student coding community)';
const TIMEOUT = 15000;
const MAX_FEED_BYTES = 3 * 1024 * 1024;
const IST_OFFSET_MS = 5.5 * 3600000;
const hours = (name, fallback) => Math.max(1, Number(process.env[name]) || fallback);

// Key-free RSS feeds (all checked to respond).
const FEEDS = [
  { name: 'TechCrunch', url: 'https://techcrunch.com/feed/', category: 'careers' },
  { name: 'The Verge', url: 'https://www.theverge.com/rss/tech/index.xml', category: 'web-mobile' },
  { name: 'Ars Technica', url: 'https://feeds.arstechnica.com/arstechnica/technology-lab', category: 'devtools' },
  { name: 'The New Stack', url: 'https://thenewstack.io/feed/', category: 'cloud' },
  { name: 'freeCodeCamp', url: 'https://www.freecodecamp.org/news/rss/', category: 'careers' },
  { name: 'Stack Overflow Blog', url: 'https://stackoverflow.blog/feed/', category: 'devtools' },
  { name: 'MDN Blog', url: 'https://developer.mozilla.org/en-US/blog/rss.xml', category: 'web-mobile' },
  { name: 'The GitHub Blog', url: 'https://github.blog/feed/', category: 'open-source' },
  { name: 'Cloudflare Blog', url: 'https://blog.cloudflare.com/rss/', category: 'cloud' },
  { name: 'AWS News Blog', url: 'https://aws.amazon.com/blogs/aws/feed/', category: 'cloud' },
  { name: 'Krebs on Security', url: 'https://krebsonsecurity.com/feed/', category: 'security' },
  { name: 'Hugging Face Blog', url: 'https://huggingface.co/blog/feed.xml', category: 'ai' },
  { name: 'OpenAI News', url: 'https://openai.com/news/rss.xml', category: 'ai' },
  { name: 'Google Developers Blog', url: 'https://developers.googleblog.com/feeds/posts/default?alt=rss', category: 'devtools' },
  { name: 'Inc42', url: 'https://inc42.com/feed/', category: 'careers' },
];

// Keyword → category (first match wins); falls back to the source's category.
const RULES = [
  ['security', /\b(security|vulnerab\w*|breach|malware|ransomware|cve-\d+|phishing|exploit|zero[- ]day|hackers|cybersecurity|cyber[- ]?attacks?)\b/i],
  ['ai', /\b(a\.?i\.?|llms?|gpt[-\w]*|openai|anthropic|claude|gemini|machine learning|neural|deepmind|hugging ?face|chatbot|agents?|copilot|diffusion)\b/i],
  ['cloud', /\b(aws|azure|gcp|google cloud|kubernetes|k8s|docker|devops|serverless|cloud|terraform|postgres\w*|database)\b/i],
  ['web-mobile', /\b(javascript|typescript|react|vue|svelte|next\.?js|css|html|browser|chrome|firefox|safari|web ?dev|android|ios|iphone|mobile|flutter|swift|kotlin)\b/i],
  ['open-source', /\b(open[- ]source|github|gitlab|linux|foss|oss|license|maintainers?)\b/i],
  ['careers', /\b(jobs?|careers?|interview\w*|layoffs?|hiring|intern\w*|course|bootcamp|learn\w*|startup\w*|funding|raises?)\b/i],
];
function categorize(text, fallback = 'devtools') {
  const hit = RULES.find(([, re]) => re.test(text));
  return hit ? hit[0] : fallback;
}

const clip = (s, n) => String(s || '').replace(/\s+/g, ' ').trim().slice(0, n);
const httpsUrl = (u) => (/^https?:\/\//i.test(String(u || '')) ? String(u) : '');

async function getJson(url) {
  const r = await fetch(url, { headers: { 'User-Agent': UA, Accept: 'application/json' }, signal: AbortSignal.timeout(TIMEOUT) });
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return r.json();
}

async function getText(url) {
  const r = await fetch(url, { headers: { 'User-Agent': UA, Accept: 'application/rss+xml, application/atom+xml, application/xml, text/xml' }, redirect: 'follow', signal: AbortSignal.timeout(TIMEOUT) });
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  const text = await r.text();
  if (text.length > MAX_FEED_BYTES) throw new Error('Feed is too large.');
  return text;
}

// ---------- sources ----------

async function hackerNews() {
  const ids = (await getJson('https://hacker-news.firebaseio.com/v0/topstories.json')).slice(0, 60);
  const items = await Promise.all(ids.map((id) => getJson(`https://hacker-news.firebaseio.com/v0/item/${id}.json`).catch(() => null)));
  return items
    .filter((h) => h && h.type === 'story' && h.url && h.title && !h.dead && !h.deleted && h.score >= 60)
    .map((h) => ({
      source: 'hackernews',
      sourceName: 'Hacker News',
      externalId: String(h.id),
      url: h.url,
      title: clip(h.title, 200),
      author: clip(h.by, 120),
      score: h.score,
      comments: h.descendants || 0,
      discussionUrl: `https://news.ycombinator.com/item?id=${h.id}`,
      publishedAt: new Date(h.time * 1000),
      category: categorize(h.title),
    }));
}

const SKIP_DEV_TAGS = new Set(['discuss', 'watercooler', 'weeklyretro', 'meta', 'jokes', 'challenge', 'devchallenge']);

async function devTo() {
  const list = await getJson('https://dev.to/api/articles?top=1&per_page=30');
  return list
    // Skip community chat threads (#discuss, weekly retros…): we want articles.
    .filter((a) => a.url && a.title && a.positive_reactions_count >= 15 && !(a.tag_list || []).some((t) => SKIP_DEV_TAGS.has(t)))
    .map((a) => ({
      source: 'devto',
      sourceName: 'DEV Community',
      externalId: String(a.id),
      url: a.url,
      title: clip(a.title, 200),
      summary: clip(a.description, 500),
      image: httpsUrl(a.cover_image),
      author: clip(a.user?.name, 120),
      tags: (a.tag_list || []).slice(0, 5),
      score: a.positive_reactions_count,
      comments: a.comments_count || 0,
      discussionUrl: a.url,
      publishedAt: new Date(a.published_at),
      category: categorize(`${a.title} ${(a.tag_list || []).join(' ')}`),
    }));
}

async function rss() {
  const out = [];
  const errors = [];
  await Promise.all(FEEDS.map(async (feed) => {
    try {
      const xml = await getText(feed.url);
      const blocks = [...xml.matchAll(/<(item|entry)\b[\s\S]*?<\/\1>/gi)].map((m) => m[0]);
      parseFeed(xml).slice(0, 15).forEach((item, i) => {
        if (!item.title || !item.link) return;
        const block = blocks[i] || '';
        const image = (block.match(/<media:(?:content|thumbnail)[^>]+url=["']([^"']+)["']/i) || block.match(/<enclosure[^>]+url=["']([^"']+\.(?:jpe?g|png|webp)[^"']*)["']/i) || [])[1];
        out.push({
          source: 'rss',
          sourceName: feed.name,
          externalId: item.guid,
          url: item.link,
          title: item.title,
          summary: clip(item.summary, 300),
          image: httpsUrl(image && image.replace(/&amp;/g, '&')),
          author: item.author,
          publishedAt: item.publishedAt || new Date(),
          category: categorize(`${item.title} ${item.summary}`, feed.category),
        });
      });
    } catch (e) {
      errors.push(`${feed.name}: ${e.message}`);
    }
  }));
  if (!out.length && errors.length) throw new Error(errors.slice(0, 3).join('; '));
  return out;
}

async function gnews() {
  const key = process.env.GNEWS_API_KEY;
  const data = await getJson(`https://gnews.io/api/v4/top-headlines?category=technology&lang=en&max=25&apikey=${encodeURIComponent(key)}`);
  return (data.articles || []).map((a) => ({
    source: 'gnews',
    sourceName: clip(a.source?.name, 100) || 'GNews',
    url: a.url,
    title: clip(a.title, 200),
    summary: clip(a.description, 500),
    image: httpsUrl(a.image),
    publishedAt: new Date(a.publishedAt),
    category: categorize(`${a.title} ${a.description}`),
  }));
}

async function newsdata() {
  const key = process.env.NEWSDATA_API_KEY;
  const data = await getJson(`https://newsdata.io/api/1/latest?apikey=${encodeURIComponent(key)}&category=technology&language=en`);
  return (data.results || []).map((a) => ({
    source: 'newsdata',
    sourceName: clip(a.source_name || a.source_id, 100) || 'NewsData',
    externalId: a.article_id,
    url: a.link,
    title: clip(a.title, 200),
    summary: clip(toPlainText(a.description || ''), 500),
    image: httpsUrl(a.image_url),
    publishedAt: new Date(a.pubDate ? `${a.pubDate.replace(' ', 'T')}Z` : Date.now()),
    category: categorize(`${a.title} ${a.description}`),
  }));
}

function activeSources() {
  const list = [['hackernews', hackerNews], ['devto', devTo], ['rss', rss]];
  if (process.env.GNEWS_API_KEY) list.push(['gnews', gnews]);
  if (process.env.NEWSDATA_API_KEY) list.push(['newsdata', newsdata]);
  return list;
}

// ---------- sync ----------

async function store(items) {
  let added = 0;
  // Feeds often include older posts: skip anything past the retention window
  // (it would be pruned right away and re-added on every sync).
  const oldest = Date.now() - hours('DAILY_NEWS_KEEP_DAYS', 21) * 86400000;
  for (const raw of items) {
    const url = canonicalUrl(raw.url);
    const published = new Date(raw.publishedAt).getTime();
    if (!url || !raw.title || Number.isNaN(published) || published < oldest) continue;
    const { score = 0, comments = 0, ...rest } = raw;
    // Insert new; refresh popularity numbers (HN points, reactions) for existing.
    const r = await DailyNews.updateOne(
      { url },
      { $setOnInsert: { ...rest, url, fetchedAt: new Date() }, $max: { score, comments } },
      { upsert: true },
    ).catch((e) => (e.code === 11000 ? { upsertedCount: 0 } : Promise.reject(e)));
    if (r.upsertedCount) added += 1;
  }
  return added;
}

let syncing = null;
function syncDailyNews() {
  if (syncing) return syncing;
  syncing = (async () => {
    const results = [];
    for (const [name, fetcher] of activeSources()) {
      try {
        results.push({ source: name, ok: true, added: await store(await fetcher()) });
      } catch (e) {
        results.push({ source: name, ok: false, added: 0, error: clip(e.message, 200) });
      }
    }
    const keepDays = hours('DAILY_NEWS_KEEP_DAYS', 21);
    await DailyNews.deleteMany({ publishedAt: { $lt: new Date(Date.now() - keepDays * 86400000) } });
    await DailyBrief.deleteMany({ createdAt: { $lt: new Date(Date.now() - 90 * 86400000) } });
    await DailyNewsSync.findByIdAndUpdate('daily-news', { lastRunAt: new Date(), results }, { upsert: true });
    return results;
  })().finally(() => {
    syncing = null;
  });
  return syncing;
}

// ---------- ranking ----------

const istDay = (date = new Date()) => new Date(date.getTime() + IST_OFFSET_MS).toISOString().slice(0, 10);
const istHour = (date = new Date()) => new Date(date.getTime() + IST_OFFSET_MS).getUTCHours();

// How "hot" a story is right now: popularity, decayed by age.
function heat(item, now = Date.now()) {
  const base = item.source === 'hackernews' ? item.score
    : item.source === 'devto' ? item.score * 2
      : 70; // editorial sources: no public score
  const ageHours = Math.max(1, (now - new Date(item.publishedAt).getTime()) / 3600000);
  return base / (ageHours + 2) ** 0.8;
}

// Top N, at most `perSource` per publisher, spread over categories.
function pickDiverse(items, n, perSource = 2) {
  const ranked = [...items].sort((a, b) => heat(b) - heat(a));
  const picked = [];
  const bySource = {};
  const byCategory = {};
  for (const pass of [1, 2]) {
    for (const item of ranked) {
      if (picked.length >= n) break;
      if (picked.includes(item)) continue;
      const s = item.sourceName;
      if ((bySource[s] || 0) >= perSource) continue;
      if (pass === 1 && (byCategory[item.category] || 0) >= 2) continue;
      picked.push(item);
      bySource[s] = (bySource[s] || 0) + 1;
      byCategory[item.category] = (byCategory[item.category] || 0) + 1;
    }
  }
  return picked;
}

async function buildTodayBrief() {
  const day = istDay();
  const existing = await DailyBrief.findOne({ day });
  if (existing) return { brief: existing, created: false };
  const recent = await DailyNews.find({ publishedAt: { $gte: new Date(Date.now() - 36 * 3600000) } }).lean();
  if (recent.length < 3) return { brief: null, created: false };
  const top = pickDiverse(recent, 5);
  try {
    const brief = await DailyBrief.create({ day, items: top.map((i) => i._id) });
    return { brief, created: true, items: top };
  } catch (e) {
    if (e.code === 11000) return { brief: await DailyBrief.findOne({ day }), created: false };
    throw e;
  }
}

async function announceBrief(brief, items) {
  if (!brief.notifiedAt) {
    const students = await User.find({ role: 'user' }).select('_id').lean();
    const lead = items[0];
    await notify(students.map((s) => s._id), {
      type: 'news-daily',
      title: `Today in Tech: ${clip(lead.title, 120)}`,
      body: `+${items.length - 1} more top stories for ${new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', timeZone: 'Asia/Kolkata' })}`,
      link: '/news?view=today',
    });
    brief.notifiedAt = new Date();
    await brief.save();
  }
  if (!brief.emailedAt) {
    const result = await sendDailyBriefEmail(brief, items);
    if (!result.skipped) {
      brief.emailedAt = new Date();
      brief.emailCount = result.sent;
      await brief.save();
    }
  }
}

// ---------- optional: auto-publish the weekly Tech Brief ----------

async function autoWeeklyDigest() {
  if (process.env.NEWS_AUTO_DIGEST !== 'on') return null;
  const now = new Date();
  const ist = new Date(now.getTime() + IST_OFFSET_MS);
  if (ist.getUTCDay() !== 1 || ist.getUTCHours() < 9) return null; // Mondays, 9:00 IST
  const recentDigest = await NewsDigest.exists({ status: 'published', publishedAt: { $gte: new Date(now - 6 * 86400000) } });
  if (recentDigest) return null;

  const weekStart = new Date(now - 7 * 86400000);
  const week = await DailyNews.find({ publishedAt: { $gte: weekStart } }).lean();
  // Weekly ranking: popularity without the daily recency decay.
  const ranked = pickDiverse(week.map((w) => ({ ...w, publishedAt: now })), 8, 2);
  if (ranked.length < 4) return null;

  const items = [];
  for (const d of ranked) {
    const item = await NewsItem.findOneAndUpdate(
      { canonicalUrl: d.url },
      {
        $set: { status: 'published', reviewedAt: now, editorSummary: d.summary || '', category: d.category },
        $setOnInsert: { sourceName: d.sourceName, canonicalUrl: d.url, title: d.title, author: d.author, publishedAt: d.publishedAt, feedSummary: d.summary },
      },
      { upsert: true, new: true },
    );
    items.push(item);
  }
  const day = istDay(now);
  const digest = await NewsDigest.create({
    title: `Tech Brief: week of ${new Date(weekStart.getTime() + IST_OFFSET_MS).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}`,
    slug: `week-${day}`,
    weekStart,
    weekEnd: now,
    intro: 'The most-discussed developer stories of the past week, picked automatically from Hacker News, DEV and trusted tech blogs.',
    topStory: items[0]._id,
    items: items.slice(1).map((i) => i._id),
    status: 'published',
    publishedAt: now,
  });
  await NewsItem.updateMany({ _id: { $in: items.map((i) => i._id) } }, { $set: { digest: digest._id } });
  return digest; // notifyLiveDigests() announces + emails it on its next run
}

// ---------- scheduler ----------

async function dailyTick() {
  const state = await DailyNewsSync.findById('daily-news').lean();
  const since = state?.lastRunAt ? Date.now() - state.lastRunAt.getTime() : Infinity;
  if (since >= hours('DAILY_NEWS_SYNC_HOURS', 3) * 3600000 - 60000) {
    const results = await syncDailyNews();
    console.log('Daily news:', results.map((r) => `${r.source}=${r.ok ? `+${r.added}` : 'failed'}`).join(' '));
  }
  if (istHour() >= Math.min(23, Number(process.env.DAILY_BRIEF_HOUR) || 8)) {
    const { brief, created, items } = await buildTodayBrief();
    if (brief && (created || !brief.notifiedAt)) {
      const list = items || await DailyNews.find({ _id: { $in: brief.items } }).lean();
      const ordered = brief.items.map((id) => list.find((i) => String(i._id) === String(id))).filter(Boolean);
      if (ordered.length) await announceBrief(brief, ordered);
    }
  }
  const digest = await autoWeeklyDigest();
  if (digest) console.log('Auto-published weekly digest:', digest.slug);
}

function startDailyNews() {
  if (process.env.NEWS_SCHEDULER === 'off' || process.env.DAILY_NEWS === 'off') return;
  const run = () => dailyTick().catch((e) => console.error('Daily news error:', e.message));
  setTimeout(run, 20000).unref();
  setInterval(run, 15 * 60 * 1000).unref();
}

module.exports = {
  syncDailyNews,
  buildTodayBrief,
  announceBrief,
  autoWeeklyDigest,
  startDailyNews,
  categorize,
  pickDiverse,
  heat,
  istDay,
  FEEDS,
  activeSources,
};

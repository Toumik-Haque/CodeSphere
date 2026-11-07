// Weekly Tech News categories and suggested sources.

const NEWS_CATEGORIES = [
  { id: 'ai', name: 'AI & Machine Learning', icon: 'bi-cpu' },
  { id: 'devtools', name: 'Developer Tools', icon: 'bi-tools' },
  { id: 'web-mobile', name: 'Web & Mobile', icon: 'bi-phone' },
  { id: 'cloud', name: 'Cloud & DevOps', icon: 'bi-cloud' },
  { id: 'security', name: 'Cybersecurity', icon: 'bi-shield-lock' },
  { id: 'open-source', name: 'Open Source', icon: 'bi-github' },
  { id: 'careers', name: 'Careers & Learning', icon: 'bi-mortarboard' },
];

// Suggested sources from the plan. They're added INACTIVE: an editor must
// test each feed URL (Sources → Test fetch) and check the publisher's terms
// before enabling it.
const SUGGESTED_SOURCES = [
  { name: 'Google Developers Blog', baseUrl: 'https://developers.googleblog.com', feedUrl: 'https://developers.googleblog.com/feeds/posts/default?alt=rss', category: 'devtools' },
  { name: 'OpenAI News', baseUrl: 'https://openai.com/news', feedUrl: 'https://openai.com/news/rss.xml', category: 'ai' },
  { name: 'The GitHub Blog', baseUrl: 'https://github.blog', feedUrl: 'https://github.blog/feed/', category: 'open-source' },
  { name: 'Google DeepMind Blog', baseUrl: 'https://deepmind.google/discover/blog', feedUrl: 'https://deepmind.google/blog/rss.xml', category: 'ai' },
  { name: 'Hugging Face Blog', baseUrl: 'https://huggingface.co/blog', feedUrl: 'https://huggingface.co/blog/feed.xml', category: 'ai' },
];

const NEWS_LIMITS = {
  titleMax: 200,
  summaryMax: 600,
  whyMax: 600,
  feedSummaryMax: 500,
  maxFeedBytes: 2 * 1024 * 1024,
  fetchTimeoutMs: 15000,
  maxItemsPerFetch: 30,
};

module.exports = { NEWS_CATEGORIES, SUGGESTED_SOURCES, NEWS_LIMITS };

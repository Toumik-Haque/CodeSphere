// Public stats from a member's coding profiles (GitHub, LeetCode, Codeforces,
// CodeChef, AtCoder, GeeksforGeeks, HackerRank). Each platform is fetched
// separately; a failure only marks that one card as unavailable.
// Results are cached in memory for 30 minutes per platform + handle.

const CACHE_MS = 30 * 60 * 1000;
const cache = new Map();

const HANDLE_PATTERNS = {
  github: /github\.com\/([A-Za-z0-9-]+)/i,
  leetcode: /leetcode\.com\/(?:u\/)?([A-Za-z0-9_-]+)/i,
  codeforces: /codeforces\.com\/profile\/([A-Za-z0-9_.-]+)/i,
  codechef: /codechef\.com\/users\/([A-Za-z0-9_.]+)/i,
  atcoder: /atcoder\.jp\/users\/([A-Za-z0-9_]+)/i,
  geeksforgeeks: /geeksforgeeks\.org\/(?:user|profile)\/([A-Za-z0-9_]+)/i,
  hackerrank: /hackerrank\.com\/(?:profile\/)?([A-Za-z0-9_]+)/i,
};

const NAMES = {
  github: 'GitHub', leetcode: 'LeetCode', codeforces: 'Codeforces', codechef: 'CodeChef',
  atcoder: 'AtCoder', geeksforgeeks: 'GeeksforGeeks', hackerrank: 'HackerRank',
};

const keyFor = (platform = '') => platform.toLowerCase().replace(/[^a-z]/g, '');

const get = async (url, options = {}) => {
  const response = await fetch(url, {
    ...options,
    headers: { 'User-Agent': 'CodeSphere', Accept: 'application/json,text/html', ...options.headers },
    signal: AbortSignal.timeout(10000),
  });
  if (!response.ok) throw new Error(`${response.status} from ${new URL(url).host}`);
  return response;
};
const json = async (url, options) => (await get(url, options)).json();
const text = async (url, options) => (await get(url, options)).text();
const num = (value) => (value === undefined || value === null || value === '' ? null : Number(value));

const fetchers = {
  async github(handle) {
    const headers = process.env.GITHUB_TOKEN ? { Authorization: `Bearer ${process.env.GITHUB_TOKEN}` } : {};
    const [user, contrib] = await Promise.all([
      json(`https://api.github.com/users/${handle}`, { headers }),
      json(`https://github-contributions-api.jogruber.de/v4/${handle}?y=last`).catch(() => null),
    ]);
    const contributions = num(contrib?.total?.lastYear);
    return {
      contributions,
      metrics: [
        { label: 'Contributions (last year)', value: contributions },
        { label: 'Public repos', value: user.public_repos },
        { label: 'Followers', value: user.followers },
      ],
    };
  },

  async leetcode(handle) {
    const query = `query($u: String!) {
      matchedUser(username: $u) { profile { ranking } submitStatsGlobal { acSubmissionNum { difficulty count } } }
      userContestRanking(username: $u) { rating }
    }`;
    const { data } = await json('https://leetcode.com/graphql', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Referer: 'https://leetcode.com' },
      body: JSON.stringify({ query, variables: { u: handle } }),
    });
    if (!data?.matchedUser) throw new Error('LeetCode user not found');
    const counts = Object.fromEntries(
      data.matchedUser.submitStatsGlobal.acSubmissionNum.map((d) => [d.difficulty, d.count])
    );
    const rating = data.userContestRanking?.rating;
    return {
      solved: num(counts.All),
      metrics: [
        { label: 'Solved', value: counts.All },
        { label: 'Easy / Medium / Hard', value: `${counts.Easy ?? 0} / ${counts.Medium ?? 0} / ${counts.Hard ?? 0}` },
        { label: 'Contest rating', value: rating ? Math.round(rating) : null },
        { label: 'Global rank', value: data.matchedUser.profile?.ranking },
      ],
    };
  },

  async codeforces(handle) {
    const [info, status] = await Promise.all([
      json(`https://codeforces.com/api/user.info?handles=${handle}`),
      json(`https://codeforces.com/api/user.status?handle=${handle}`).catch(() => null),
    ]);
    const user = info.result?.[0];
    if (!user) throw new Error('Codeforces user not found');
    let solved = null;
    if (status?.result) {
      solved = new Set(
        status.result
          .filter((s) => s.verdict === 'OK')
          .map((s) => `${s.problem.contestId}-${s.problem.index}`)
      ).size;
    }
    return {
      solved,
      metrics: [
        { label: 'Solved', value: solved },
        { label: 'Rating', value: user.rating },
        { label: 'Max rating', value: user.maxRating },
        { label: 'Rank', value: user.rank },
      ],
    };
  },

  async codechef(handle) {
    const html = await text(`https://www.codechef.com/users/${handle}`);
    const rating = html.match(/class="rating-number"[^>]*>\s*(\d+)/)?.[1];
    const stars = html.match(/>\s*(\d)\s*(?:&#9733;|★)/)?.[1];
    const solved = html.match(/Total Problems Solved:\s*(\d+)/i)?.[1];
    if (!rating && !solved) throw new Error('CodeChef profile not readable');
    return {
      solved: num(solved),
      metrics: [
        { label: 'Solved', value: solved },
        { label: 'Rating', value: rating },
        { label: 'Stars', value: stars ? `${stars}★` : null },
      ],
    };
  },

  async atcoder(handle) {
    const [history, ac] = await Promise.all([
      json(`https://atcoder.jp/users/${handle}/history/json`).catch(() => []),
      json(`https://kenkoooo.com/atcoder/atcoder-api/v3/user/ac_rank?user=${handle}`).catch(() => null),
    ]);
    const rated = history.filter((h) => h.IsRated);
    const rating = rated.length ? rated[rated.length - 1].NewRating : null;
    const max = rated.length ? Math.max(...rated.map((h) => h.NewRating)) : null;
    if (rating === null && !ac) throw new Error('AtCoder user not found');
    return {
      solved: num(ac?.count),
      metrics: [
        { label: 'Solved', value: ac?.count },
        { label: 'Rating', value: rating },
        { label: 'Max rating', value: max },
        { label: 'Rated contests', value: rated.length },
      ],
    };
  },

  async geeksforgeeks(handle) {
    const { data } = await json(`https://authapi.geeksforgeeks.org/api-get/user-profile-info/?handle=${handle}`);
    if (!data) throw new Error('GeeksforGeeks user not found');
    return {
      solved: num(data.total_problems_solved),
      metrics: [
        { label: 'Solved', value: data.total_problems_solved },
        { label: 'Coding score', value: data.score },
        { label: 'Institute rank', value: data.institute_rank },
        { label: 'Longest streak', value: data.pod_solved_longest_streak ? `${data.pod_solved_longest_streak} days` : null },
      ],
    };
  },

  async hackerrank(handle) {
    const { models = [] } = await json(`https://www.hackerrank.com/rest/hackers/${handle}/badges`);
    const earned = models.filter((b) => b.stars > 0);
    const solved = models.reduce((sum, b) => sum + (b.solved || 0), 0);
    return {
      solved: solved || null,
      metrics: [
        { label: 'Solved', value: solved || null },
        { label: 'Badges', value: earned.length },
        { label: 'Stars', value: earned.reduce((sum, b) => sum + b.stars, 0) },
      ],
    };
  },
};

async function statsFor({ platform, url }) {
  const key = keyFor(platform);
  const handle = url?.match(HANDLE_PATTERNS[key])?.[1];
  const base = { platform: NAMES[key] || platform, url, handle: handle || null };
  if (!fetchers[key] || !handle) return { ...base, ok: false, reason: 'Stats are not available for this link.' };

  const cacheKey = `${key}:${handle.toLowerCase()}`;
  const hit = cache.get(cacheKey);
  if (hit && Date.now() - hit.at < CACHE_MS) return hit.value;

  let value;
  try {
    const result = await fetchers[key](handle);
    value = {
      ...base,
      ok: true,
      ...result,
      metrics: result.metrics.filter((m) => m.value !== null && m.value !== undefined && m.value !== ''),
    };
  } catch (error) {
    value = { ...base, ok: false, reason: `Could not load stats right now (${error.message}).` };
  }
  // Failures are cached for 5 minutes so a down site isn't hit on every view.
  cache.set(cacheKey, { at: value.ok ? Date.now() : Date.now() - CACHE_MS + 5 * 60 * 1000, value });
  return value;
}

// Profiles from a user document: codingProfiles plus the canonical GitHub URL.
async function codingStatsForUser(user) {
  const links = [...(user.codingProfiles || [])];
  if (user.github && !links.some((p) => keyFor(p.platform) === 'github')) {
    links.unshift({ platform: 'GitHub', url: user.github });
  }
  const seen = new Set();
  const unique = links.filter((p) => {
    const key = keyFor(p.platform);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  const stats = await Promise.all(unique.map(statsFor));
  return {
    stats,
    totals: {
      solved: stats.reduce((sum, s) => sum + (s.solved || 0), 0),
      contributions: stats.reduce((sum, s) => sum + (s.contributions || 0), 0),
      platforms: stats.filter((s) => s.ok).length,
    },
  };
}

module.exports = { codingStatsForUser };

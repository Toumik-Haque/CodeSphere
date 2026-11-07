// Collects live and upcoming hackathons from public, free listing endpoints
// (no API keys) and caches them in MongoDB. Each card links to the host page.
// Runs every 6 hours; set HACKATHON_SYNC=off to disable.

const { ExternalHackathon, HackathonSync } = require('../models/Hackathon');

const UA = 'Mozilla/5.0 (compatible; CodeSphereBot/1.0; +https://github.com/)';
const TIMEOUT_MS = 20000;
const MAX_PER_SOURCE = 120;

const httpsUrl = (u) => {
  const s = String(u || '').trim();
  if (s.startsWith('//')) return `https:${s}`;
  return /^https?:\/\//i.test(s) ? s : '';
};
const date = (v) => {
  const d = v ? new Date(v) : null;
  return d && !Number.isNaN(d.getTime()) ? d : undefined;
};
const text = (v, max = 200) => String(v ?? '').replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim().slice(0, max);
const inr = (n) => `₹${Number(n).toLocaleString('en-IN')}`;

async function getJson(url, options = {}) {
  const response = await fetch(url, {
    ...options,
    headers: { 'User-Agent': UA, Accept: 'application/json', ...(options.headers || {}) },
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return response.json();
}

// "Oct 01 - Nov 12, 2026" or "Nov 03 - 05, 2026" → { start, end }
function parseDevpostDates(range) {
  const m = String(range || '').match(/^([A-Za-z]{3}) (\d{1,2})(?:, (\d{4}))? - (?:([A-Za-z]{3}) )?(\d{1,2}), (\d{4})$/);
  if (!m) return {};
  const [, m1, d1, y1, m2, d2, y2] = m;
  return { start: date(`${m1} ${d1} ${y1 || y2}`), end: date(`${m2 || m1} ${d2} ${y2} 23:59`) };
}

const SOURCES = {
  devpost: async () => {
    const out = [];
    for (let page = 1; page <= 14 && out.length < MAX_PER_SOURCE; page += 1) {
      const data = await getJson(`https://devpost.com/api/hackathons?status[]=open&status[]=upcoming&page=${page}`);
      for (const h of data.hackathons || []) {
        const { start, end } = parseDevpostDates(h.submission_period_dates);
        const online = h.displayed_location?.icon === 'globe';
        out.push({
          externalId: String(h.id),
          title: text(h.title, 140),
          organizer: text(h.organization_name, 100),
          url: httpsUrl(h.url),
          image: httpsUrl(h.thumbnail_url),
          mode: online ? 'online' : 'offline',
          location: online ? 'Online' : text(h.displayed_location?.location, 120),
          startsAt: start,
          endsAt: end,
          regEndsAt: end,
          prize: text(h.prize_amount, 40).replace(/^\$0$/, ''),
          themes: (h.themes || []).map((t) => text(t.name, 40)).slice(0, 5),
          participants: Number(h.registrations_count) || 0,
        });
      }
      if (!data.hackathons?.length) break;
    }
    return out;
  },

  devfolio: async () => {
    const data = await getJson('https://api.devfolio.co/api/search/hackathons', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'application_open', from: 0, size: 60 }),
    });
    return (data.hits?.hits || []).map(({ _source: h }) => ({
      externalId: h.uuid,
      title: text(h.name, 140),
      organizer: text(h.tagline, 100),
      url: h.slug ? `https://${encodeURIComponent(h.slug)}.devfolio.co/` : '',
      image: httpsUrl(h.cover_img),
      mode: h.is_online ? 'online' : 'offline',
      location: h.is_online ? 'Online' : text(h.city || h.location, 120),
      startsAt: date(h.starts_at),
      endsAt: date(h.ends_at),
      regEndsAt: date(h.hackathon_setting?.reg_ends_at),
      themes: (h.themes || []).map((t) => text(t?.name || t, 40)).filter(Boolean).slice(0, 5),
      participants: Number(h.participants_count) || 0,
    }));
  },

  unstop: async () => {
    const out = [];
    for (let page = 1; page <= 4 && out.length < MAX_PER_SOURCE; page += 1) {
      const data = await getJson(`https://unstop.com/api/public/opportunity/search-result?opportunity=hackathons&oppstatus=open&per_page=30&page=${page}`);
      for (const h of data.data?.data || []) {
        const reg = h.regnRequirements || {};
        const cash = (h.prizes || []).reduce((sum, p) => sum + (Number(p.cash) || 0), 0);
        const mode = ['online', 'offline', 'hybrid'].includes(h.region) ? h.region : 'online';
        out.push({
          externalId: String(h.id),
          title: text(h.title, 140),
          organizer: text(h.organisation?.name, 100),
          url: h.public_url ? `https://unstop.com/${h.public_url}` : '',
          image: httpsUrl(h.logoUrl2),
          mode,
          location: mode === 'online' ? 'Online' : text((h.locations || []).map((l) => l.city).filter(Boolean).join(', '), 120),
          startsAt: date(reg.start_regn_dt),
          endsAt: date(h.end_date),
          regEndsAt: date(reg.end_regn_dt),
          prize: cash > 0 ? inr(cash) : '',
          themes: (h.required_skills || []).map((s) => text(s.skill_name || s.skill, 40)).filter(Boolean).slice(0, 5),
          teamSize: reg.min_team_size ? `${reg.min_team_size}–${reg.max_team_size || reg.min_team_size}` : '',
          participants: Number(h.registerCount) || 0,
        });
      }
      if (page >= (data.data?.last_page || 1)) break;
    }
    return out;
  },

  hack2skill: async () => {
    const data = await getJson('https://hack2skill.com/api/v1/innovator/public/event/list?page=1&limit=100');
    const all = [...(data.data?.flagshipEvents || []), ...(data.data?.communityEvents || [])];
    const modes = { VIRTUAL: 'online', IN_PERSON: 'offline', HYBRID: 'hybrid' };
    return all
      .filter((h) => !h.registrationEnd || new Date(h.registrationEnd) > new Date())
      .map((h) => {
        const mode = modes[h.tags?.mode?.value] || 'online';
        const team = h.tags?.teamSize;
        return {
          externalId: String(h._id),
          title: text(h.title, 140),
          organizer: 'Hack2Skill',
          url: httpsUrl(h.customEventUrl) || (h.eventUrl ? `https://hack2skill.com/event/${encodeURIComponent(h.eventUrl)}` : ''),
          image: httpsUrl(h.thumbnail),
          mode,
          location: mode === 'online' ? 'Online' : '',
          startsAt: date(h.registrationStart),
          regEndsAt: date(h.registrationEnd),
          teamSize: team?.min ? `${team.min}–${team.max}` : '',
          participants: h.tags?.registrations?.isHidden ? 0 : Number(h.tags?.registrations?.value) || 0,
        };
      });
  },

  hackerearth: async () => {
    const data = await getJson('https://www.hackerearth.com/chrome-extension/events/');
    return (data.response || [])
      .filter((h) => /hackathon/i.test(`${h.challenge_type} ${h.url}`))
      .map((h) => ({
        externalId: h.url,
        title: text(h.title, 140),
        organizer: 'HackerEarth',
        url: httpsUrl(h.url),
        image: httpsUrl(h.thumbnail),
        mode: 'online',
        location: 'Online',
        startsAt: date(h.start_utc_tz),
        endsAt: date(h.end_utc_tz),
        regEndsAt: date(h.end_utc_tz),
      }));
  },
};

let running = null;

async function syncSource(name) {
  const startedAt = new Date();
  const items = (await SOURCES[name]()).filter((h) => h.title && h.url);
  const now = new Date();
  // Skip anything already over.
  const live = items.filter((h) => !(h.endsAt && h.endsAt < now) && !(h.regEndsAt && !h.endsAt && h.regEndsAt < now));
  if (live.length) {
    await ExternalHackathon.bulkWrite(live.map((h) => ({
      updateOne: {
        filter: { source: name, externalId: h.externalId },
        update: { $set: { ...h, source: name, lastSeenAt: startedAt } },
        upsert: true,
      },
    })), { ordered: false });
  }
  // Remove listings the platform no longer shows.
  await ExternalHackathon.deleteMany({ source: name, lastSeenAt: { $lt: startedAt } });
  return live.length;
}

// Sync every source; one failing source never blocks the others.
function syncExternalHackathons() {
  if (running) return running;
  running = (async () => {
    const results = [];
    for (const name of Object.keys(SOURCES)) {
      try {
        results.push({ source: name, ok: true, count: await syncSource(name) });
      } catch (error) {
        results.push({ source: name, ok: false, count: 0, error: String(error.message).slice(0, 200) });
      }
    }
    // Safety net: drop anything that has ended.
    await ExternalHackathon.deleteMany({ endsAt: { $lt: new Date(Date.now() - 86400000) } });
    await HackathonSync.findByIdAndUpdate('external-hackathons', { lastRunAt: new Date(), results }, { upsert: true });
    return results;
  })().finally(() => {
    running = null;
  });
  return running;
}

function startHackathonSync() {
  if (process.env.HACKATHON_SYNC === 'off') return;
  const SIX_HOURS = 6 * 60 * 60 * 1000;
  const tick = async () => {
    try {
      const state = await HackathonSync.findById('external-hackathons').lean();
      if (state?.lastRunAt && Date.now() - state.lastRunAt.getTime() < SIX_HOURS - 60000) return;
      const results = await syncExternalHackathons();
      console.log('Hackathon sync:', results.map((r) => `${r.source}=${r.ok ? r.count : 'failed'}`).join(' '));
    } catch (error) {
      console.error('Hackathon sync failed:', error.message);
    }
  };
  setTimeout(tick, 15000).unref();
  setInterval(tick, 30 * 60 * 1000).unref();
}

module.exports = { syncExternalHackathons, startHackathonSync, SOURCE_NAMES: Object.keys(SOURCES) };

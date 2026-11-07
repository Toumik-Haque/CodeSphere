// Shared validation for hackathon details (organiser tools + community hosting).

const clean = (v, max) => String(v ?? '').replace(/\r\n?/g, '\n').trim().slice(0, max);
const safeUrl = (url) => {
  const s = clean(url, 500);
  return /^https?:\/\/[^\s<>"]+$/i.test(s) ? s : '';
};

function validateHackathon(body) {
  const tracks = (Array.isArray(body.tracks) ? body.tracks : []).map((t) => clean(t, 60)).filter(Boolean).slice(0, 12);
  const prizes = (Array.isArray(body.prizes) ? body.prizes : [])
    .map((p) => ({ title: clean(p?.title, 80), reward: clean(p?.reward, 120) }))
    .filter((p) => p.title)
    .slice(0, 12);
  const data = {
    title: clean(body.title, 120),
    slug: clean(body.slug || body.title, 80).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, ''),
    tagline: clean(body.tagline, 200),
    description: clean(body.description, 20000),
    rules: clean(body.rules, 10000),
    tracks,
    prizes,
    mode: ['online', 'offline', 'hybrid'].includes(body.mode) ? body.mode : 'online',
    venue: clean(body.venue, 200),
    bannerUrl: safeUrl(body.bannerUrl),
    regStart: new Date(body.regStart),
    regEnd: new Date(body.regEnd),
    submissionStart: new Date(body.submissionStart),
    submissionEnd: new Date(body.submissionEnd),
    teamMin: Math.min(10, Math.max(1, Number(body.teamMin) || 1)),
    teamMax: Math.min(10, Math.max(1, Number(body.teamMax) || 4)),
    status: body.status === 'published' ? 'published' : 'draft',
  };
  if (data.title.length < 3) return { error: 'Give the hackathon a title.' };
  if (!data.slug) return { error: 'The URL slug is invalid.' };
  if (['regStart', 'regEnd', 'submissionStart', 'submissionEnd'].some((k) => Number.isNaN(data[k].getTime()))) return { error: 'Set all four dates.' };
  if (data.regEnd < data.regStart) return { error: 'Registration must end after it starts.' };
  if (data.submissionEnd <= data.submissionStart) return { error: 'Submissions must close after they open.' };
  if (data.submissionStart < data.regStart) return { error: 'Submissions cannot open before registration.' };
  if (data.teamMax < data.teamMin) return { error: 'Maximum team size must be at least the minimum.' };
  if (body.bannerUrl && !data.bannerUrl) return { error: 'The banner must be an http(s) link.' };
  return { data };
}

module.exports = { validateHackathon, clean, safeUrl };

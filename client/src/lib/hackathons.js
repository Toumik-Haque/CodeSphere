// Shared bits for the hackathon pages.

export const SOURCES = {
  devpost: { name: 'Devpost', color: '#003E54' },
  devfolio: { name: 'Devfolio', color: '#3770FF' },
  unstop: { name: 'Unstop', color: '#1C4980' },
  hack2skill: { name: 'Hack2Skill', color: '#6D28D9' },
  hackerearth: { name: 'HackerEarth', color: '#2C3454' },
};

export const PHASES = {
  upcoming: { label: 'Opens soon', tone: 'blue' },
  registration: { label: 'Registration open', tone: 'green' },
  building: { label: 'Building', tone: 'amber' },
  submission: { label: 'Submissions open', tone: 'green' },
  judging: { label: 'Judging', tone: 'amber' },
  results: { label: 'Results out', tone: 'navy' },
};

// "3 days left" / "5 hours left" / "Closed"
export function countdown(date) {
  if (!date) return '';
  const ms = new Date(date).getTime() - Date.now();
  if (ms < 0) return 'Closed';
  const days = Math.floor(ms / 86400000);
  if (days === 0) {
    const hours = Math.max(1, Math.floor(ms / 3600000));
    return `${hours} hour${hours === 1 ? '' : 's'} left`;
  }
  return `${days} day${days === 1 ? '' : 's'} left`;
}

// True if the date is less than `days` away (and not yet past).
export const closesWithin = (date, days) => {
  if (!date) return false;
  const ms = new Date(date).getTime() - Date.now();
  return ms >= 0 && ms < days * 86400000;
};

export const isPast = (date) => new Date(date).getTime() <= Date.now();

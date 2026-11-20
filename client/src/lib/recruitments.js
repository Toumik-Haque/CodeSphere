// Shared helpers for the Recruitment & Interviews pages.

export const TYPE_LABEL = { recruitment: 'Recruitment drive', interview: 'Interview session' };

export const STATUS_LABEL = {
  applied: 'Applied',
  shortlisted: 'Shortlisted',
  selected: 'Selected',
  rejected: 'Not selected',
};

const TZ = 'Asia/Kolkata';

export const formatDay = (date) => (date
  ? new Date(date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', timeZone: TZ })
  : '');

export const formatDateTime = (date) => (date
  ? new Date(date).toLocaleString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit', timeZone: TZ })
  : '');

// Whole days until the deadline (0 = today, negative = passed).
export function daysLeft(date) {
  const ms = new Date(date).getTime() - Date.now();
  return ms < 0 ? -1 : Math.floor(ms / 86400000);
}

// For <input type="datetime-local">: local time without seconds.
export function toInputValue(date) {
  if (!date) return '';
  const d = new Date(date);
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

// The key facts of an event (date, time, place) for update emails, shown as a
// highlighted box above the description, plus a plain-text version.
const { escapeHtml } = require('./emailTemplates');

const TZ = 'Asia/Kolkata';
const fmt = (date, options) => new Intl.DateTimeFormat('en-IN', { timeZone: TZ, ...options }).format(date);
const dayKey = (date) => fmt(date, { year: 'numeric', month: '2-digit', day: '2-digit' });

function eventFacts(event) {
  const start = event.date ? new Date(event.date) : null;
  const end = event.endDate ? new Date(event.endDate) : null;
  if (!start || Number.isNaN(start.getTime())) return [];

  const longDay = { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' };
  const shortDay = { weekday: 'short', day: 'numeric', month: 'short' };
  const time = { hour: 'numeric', minute: '2-digit', hour12: true };
  const validEnd = end && !Number.isNaN(end.getTime()) && end > start;
  const sameDay = validEnd && dayKey(start) === dayKey(end);

  const facts = [];
  facts.push({
    icon: '📅',
    label: 'Date',
    value: validEnd && !sameDay
      ? `${fmt(start, shortDay)} – ${fmt(end, { ...shortDay, year: 'numeric' })}`
      : fmt(start, longDay),
  });
  facts.push({
    icon: '⏰',
    label: 'Time',
    value: `${fmt(start, time)}${sameDay ? ` – ${fmt(end, time)}` : ''} IST`,
  });

  const mode = event.mode || '';
  const venue = (event.venue || '').trim();
  let place = venue;
  if (mode === 'Online') place = 'Online (link shared with registered members)';
  else if (mode === 'Hybrid') place = venue ? `${venue} + online` : 'Hybrid (in person + online)';
  if (place) facts.push({ icon: '📍', label: mode === 'Online' ? 'Where' : 'Venue', value: place });
  if (event.category) facts.push({ icon: '🏷️', label: 'Type', value: event.category });
  return facts;
}

// Highlighted details box, then the description.
function eventEmailHtml(event, description = '') {
  const facts = eventFacts(event);
  const rows = facts.map((f) => `
      <tr>
        <td style="padding:7px 0;width:28px;font-size:16px;vertical-align:top">${f.icon}</td>
        <td style="padding:7px 10px 7px 0;width:70px;color:#8a5a49;font-size:11px;font-weight:800;letter-spacing:.8px;text-transform:uppercase;vertical-align:top;padding-top:10px">${escapeHtml(f.label)}</td>
        <td style="padding:7px 0;color:#153653;font-size:15px;font-weight:700;line-height:1.45">${escapeHtml(f.value)}</td>
      </tr>`).join('');
  const box = facts.length ? `
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin:4px 0 20px;background:#fff6f2;border:1px solid #ffd9cc;border-left:4px solid #e4572e;border-radius:12px">
    <tr><td style="padding:12px 16px">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">${rows}
      </table>
    </td></tr>
  </table>` : '';
  const text = description ? `<p style="margin:0;color:#34465a">${escapeHtml(description)}</p>` : '';
  return box + text;
}

// "📅 Date: … · ⏰ Time: … · 📍 Venue: …" for the plain-text email and notification.
function eventFactsText(event) {
  return eventFacts(event).map((f) => `${f.label}: ${f.value}`).join(' · ');
}

module.exports = { eventEmailHtml, eventFactsText };

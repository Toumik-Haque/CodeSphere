function toCalendarDate(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';

  return date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
}

export function getCalendarUrl(event) {
  if (!event?.date) return '';

  const start = toCalendarDate(event.date);
  if (!start) return '';

  const end = toCalendarDate(
    event.endDate || new Date(new Date(event.date).getTime() + 60 * 60 * 1000)
  );

  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: event.title || 'CodeSphere Event',
    dates: `${start}/${end || start}`,
    details: event.description || '',
    location: event.venue || event.mode || '',
  });

  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

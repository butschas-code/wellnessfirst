/** Invitation-style schedule line for catalog cards (honours webinar timezone). */
export function formatWebinarScheduleStart(row: {
  starts_at: string;
  timezone: string;
}): string {
  try {
    const d = new Date(row.starts_at);
    return new Intl.DateTimeFormat('en-GB', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZone: row.timezone,
      timeZoneName: 'short',
    }).format(d);
  } catch {
    return row.starts_at;
  }
}

/** ICS-friendly UTC range for Google Calendar `dates` parameter. */
export function googleCalendarUtcRange(startIso: string, endIso: string | null): { start: string; end: string } {
  const start = new Date(startIso);
  const end = endIso
    ? new Date(endIso)
    : new Date(start.getTime() + 90 * 60 * 1000);

  const fmt = (d: Date) =>
    d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '').replace(/Z$/, 'Z');

  return { start: fmt(start), end: fmt(end) };
}

export function googleCalendarTemplateUrl(opts: {
  title: string;
  details: string;
  startIso: string;
  endIso: string | null;
}): string {
  const { start, end } = googleCalendarUtcRange(opts.startIso, opts.endIso);
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: opts.title,
    dates: `${start}/${end}`,
    details: opts.details,
  });
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

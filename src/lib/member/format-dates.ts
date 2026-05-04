/** Format for member-facing webinar lines (London-ish locale, webinar timezone when provided). */
export function formatMemberSessionInstant(iso: string, timeZone: string): string {
  try {
    const d = new Date(iso);
    return new Intl.DateTimeFormat('en-GB', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
      timeZone,
      timeZoneName: 'short',
    }).format(d);
  } catch {
    return iso;
  }
}

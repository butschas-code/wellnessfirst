const defaultLocale = 'en-GB' as const;

export function formatDate(
  d: Date,
  opts: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  },
): string {
  return d.toLocaleDateString(defaultLocale, { ...opts, timeZone: 'UTC' });
}

export function formatTime(d: Date): string {
  return d.toLocaleTimeString(defaultLocale, { hour: '2-digit', minute: '2-digit', timeZone: 'UTC' });
}

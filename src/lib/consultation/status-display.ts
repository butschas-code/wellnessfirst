/** Human-readable consultation workflow labels (matches admin-facing statuses). */

export function consultationStatusLabel(status: string): string {
  switch (status) {
    case 'new':
      return 'With us — not yet read closely';
    case 'reviewed':
      return 'Being considered';
    case 'contacted':
      return 'We have reached out';
    case 'closed':
      return 'Closed this thread';
    default:
      return status;
  }
}

export function formatConsultationIso(iso: string): string {
  try {
    return new Intl.DateTimeFormat('en-GB', {
      dateStyle: 'medium',
      timeStyle: 'short',
      timeZone: 'Europe/Zurich',
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

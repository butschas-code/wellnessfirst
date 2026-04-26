/** Shared server-side validation for Pages Functions. */

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const contactTopics = new Set(['consultation', 'editorial', 'community', 'shop', 'general']);

export function checkEmail(s: string): string | null {
  const t = s.trim();
  if (!t) return 'Email is required';
  if (t.length > 254) return 'Email is too long';
  if (!EMAIL.test(t)) return 'Enter a valid email';
  return null;
}

export function checkName(s: string): string | null {
  const t = s.trim();
  if (!t) return 'Name is required';
  if (t.length > 120) return 'Name is too long';
  return null;
}

export function checkContactMessage(s: string): string | null {
  const t = s.trim();
  if (t.length < 4) return 'Add a few words to your message';
  if (t.length > 12_000) return 'Message is too long (try splitting into two messages)';
  return null;
}

export function checkWebinarMeta(slug: string, title: string): string | null {
  const s = slug.trim();
  const t = title.trim();
  if (!s || !t) return 'Missing session information';
  if (s.length > 200 || t.length > 300) return 'Request could not be sent';
  if (!/^[a-z0-9][a-z0-9-]*$/.test(s)) return 'Request could not be sent';
  return null;
}

export function checkSource(s: string | undefined, max: number): string | null {
  if (!s) return null;
  if (s.length > max) return 'Source is invalid';
  return null;
}

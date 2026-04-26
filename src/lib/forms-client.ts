/**
 * Client-side form handling for static Phase 1: compose mailto instead of POST to a missing API.
 * Copy into inline scripts; keep URLs under ~2000 chars (RFC-adjacent mailto limit).
 */
export const MAILTO_MAX_BODY = 1800;

export function truncateForMailto(s: string, max: number): string {
  if (s.length <= max) return s;
  return `${s.slice(0, max - 30)}\n\n[Message truncated. Send again or continue by email.]`;
}

const topicLabels: Record<string, string> = {
  consultation: 'Private consultation or integration',
  editorial: 'Editorial, articles, or press',
  community: 'Community timing or access',
  shop: 'Shop, objects, or waitlists',
  general: 'Something else',
};

export function buildContactMailto(input: {
  to: string;
  name: string;
  email: string;
  topic: string;
  message: string;
}): string {
  const topicLabel = (topicLabels[input.topic] ?? input.topic) || 'General';
  const subject = `WFG contact · ${topicLabel}`;
  const body = [
    `Name: ${input.name}`,
    `Reply-to: ${input.email}`,
    `Topic: ${topicLabel}`,
    '',
    input.message,
  ].join('\n');
  return buildMailto(input.to, subject, body);
}

export function buildInterestMailto(input: { to: string; name: string; email: string }): string {
  const subject = 'WFG interest list (Phase 1)';
  const body = [
    'Please add me to occasional updates when sessions or cohorts open.',
    '',
    `Name: ${input.name}`,
    `Email: ${input.email}`,
  ].join('\n');
  return buildMailto(input.to, subject, body);
}

export function buildWebinarInterestMailto(input: {
  to: string;
  name: string;
  email: string;
  slug: string;
  title: string;
}): string {
  const subject = `WFG webinar interest · ${input.title}`;
  const body = [
    'Please keep me in mind for this session and related notices/replays.',
    '',
    `Name: ${input.name}`,
    `Email: ${input.email}`,
    `Session: ${input.slug}`,
  ].join('\n');
  return buildMailto(input.to, subject, body);
}

function buildMailto(to: string, subject: string, body: string): string {
  const safeBody = truncateForMailto(body, MAILTO_MAX_BODY);
  return `mailto:${to}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(safeBody)}`;
}

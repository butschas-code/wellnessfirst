/**
 * Optional hook after a consultation row is saved — no secrets in the browser bundle.
 * Set `PUBLIC_CONSULTATION_NOTIFY_URL` to an Edge Function or API route that validates auth server-side.
 */
export async function notifyConsultationSubmitted(payload: {
  requestId: string;
  accessToken?: string;
}): Promise<void> {
  const endpoint =
    typeof import.meta.env !== 'undefined'
      ? (import.meta.env.PUBLIC_CONSULTATION_NOTIFY_URL as string | undefined)
      : undefined;

  const trimmed = typeof endpoint === 'string' ? endpoint.trim() : '';
  if (!trimmed) return;

  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  const token = payload.accessToken?.trim();
  if (token) headers.Authorization = `Bearer ${token}`;

  try {
    await fetch(trimmed, {
      method: 'POST',
      headers,
      body: JSON.stringify({ request_id: payload.requestId }),
      credentials: 'omit',
    });
  } catch {
    /* ignore — submission already persisted */
  }
}

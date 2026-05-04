/**
 * Notify backend to send webinar confirmation email (Edge Function recommended).
 *
 * When `PUBLIC_WEBINAR_BOOKING_NOTIFY_URL` is set (e.g. `…/functions/v1/send-webinar-confirmation`),
 * POST `{ booking_id }` with `Authorization: Bearer <user access_token>`.
 * The Edge Function sends mail and sets `confirmation_sent_at` — do not duplicate that update client-side.
 *
 * When unset, returns `true` so the caller can record `confirmation_sent_at` locally (dev placeholder).
 */
export async function sendWebinarBookingConfirmation(
  bookingId: string,
  options?: { accessToken?: string },
): Promise<boolean> {
  const endpoint =
    typeof import.meta.env !== 'undefined'
      ? (import.meta.env.PUBLIC_WEBINAR_BOOKING_NOTIFY_URL as string | undefined)
      : undefined;

  const trimmed = typeof endpoint === 'string' ? endpoint.trim() : '';
  if (!trimmed) {
    void bookingId;
    void options;
    return true;
  }

  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  const token = options?.accessToken?.trim();
  if (token) headers.Authorization = `Bearer ${token}`;

  try {
    const res = await fetch(trimmed, {
      method: 'POST',
      headers,
      body: JSON.stringify({ booking_id: bookingId }),
      credentials: 'omit',
    });
    return res.ok;
  } catch {
    return false;
  }
}

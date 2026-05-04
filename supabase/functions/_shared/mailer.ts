/**
 * Transactional mail: Resend by default when RESEND_API_KEY is set.
 * If POSTMARK_SERVER_TOKEN is set (and RESEND_API_KEY is empty), uses Postmark instead.
 */

export type MailPayload = {
  to: string;
  subject: string;
  html: string;
  text: string;
};

function provider(): 'resend' | 'postmark' | null {
  const resend = Deno.env.get('RESEND_API_KEY')?.trim();
  const postmark = Deno.env.get('POSTMARK_SERVER_TOKEN')?.trim();
  if (postmark && !resend) return 'postmark';
  if (resend) return 'resend';
  return null;
}

async function sendViaResend(from: string, p: MailPayload): Promise<{ ok: boolean; error?: string }> {
  const key = Deno.env.get('RESEND_API_KEY')!.trim();
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from,
      to: [p.to],
      subject: p.subject,
      html: p.html,
      text: p.text,
    }),
  });
  if (!res.ok) {
    const errText = await res.text().catch(() => '');
    return { ok: false, error: `Resend ${res.status}: ${errText.slice(0, 400)}` };
  }
  return { ok: true };
}

async function sendViaPostmark(from: string, p: MailPayload): Promise<{ ok: boolean; error?: string }> {
  const token = Deno.env.get('POSTMARK_SERVER_TOKEN')!.trim();
  const res = await fetch('https://api.postmarkapp.com/email', {
    method: 'POST',
    headers: {
      'X-Postmark-Server-Token': token,
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      From: from,
      To: p.to,
      Subject: p.subject,
      HtmlBody: p.html,
      TextBody: p.text,
      MessageStream: 'outbound',
    }),
  });
  if (!res.ok) {
    const errText = await res.text().catch(() => '');
    return { ok: false, error: `Postmark ${res.status}: ${errText.slice(0, 400)}` };
  }
  return { ok: true };
}

export async function sendTransactionalMail(p: MailPayload): Promise<{ ok: boolean; error?: string }> {
  const from = Deno.env.get('EMAIL_FROM')?.trim();
  if (!from) return { ok: false, error: 'EMAIL_FROM is not set' };

  const kind = provider();
  if (!kind) {
    return {
      ok: false,
      error:
        'No mail provider: set RESEND_API_KEY (default) or POSTMARK_SERVER_TOKEN (when not using Resend).',
    };
  }

  if (kind === 'resend') return sendViaResend(from, p);
  return sendViaPostmark(from, p);
}

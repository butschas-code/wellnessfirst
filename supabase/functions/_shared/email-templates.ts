/** Calm, invitation-style copy — no urgency hooks. */

export type WebinarMailContext = {
  siteUrl: string;
  recipientName: string | null;
  webinarTitle: string;
  webinarSlug: string;
  /** ISO instant */
  startsAt: string;
  /** IANA zone e.g. Europe/Riga */
  timezone: string;
  replayUrl?: string | null;
};

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function formatSessionWhen(iso: string, timeZone: string): string {
  try {
    const d = new Date(iso);
    return new Intl.DateTimeFormat('en-GB', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZone,
      timeZoneName: 'short',
    }).format(d);
  } catch {
    return iso;
  }
}

function shell(innerHtml: string, innerText: string): { html: string; text: string } {
  const wrap = (body: string) => `
<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"/><meta name="viewport" content="width=device-width"/></head>
<body style="margin:0;background:#f7f5f2;color:#1c1917;font-family:Georgia,'Times New Roman',serif;line-height:1.6;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f7f5f2;padding:32px 16px;">
<tr><td align="center">
<table role="presentation" width="100%" style="max-width:520px;background:#ffffff;border:1px solid #e7e5e4;border-radius:16px;padding:28px 28px 32px;">
<tr><td>${body}</td></tr>
</table>
<p style="max-width:520px;margin:24px auto 0;font-size:13px;color:#78716c;">Wellness First Global · quiet correspondence</p>
</td></tr></table></body></html>`;

  const html = wrap(innerHtml);
  const text = innerText.trim();
  return { html, text };
}

export function confirmationEmail(ctx: WebinarMailContext): { subject: string; html: string; text: string } {
  const when = formatSessionWhen(ctx.startsAt, ctx.timezone);
  const greeting = ctx.recipientName?.trim() ? `Dear ${escapeHtml(ctx.recipientName.trim())},` : 'Hello,';
  const detailUrl = `${ctx.siteUrl.replace(/\/$/, '')}/webinars/${encodeURIComponent(ctx.webinarSlug)}`;
  const replay =
    ctx.replayUrl?.trim() ?
      `<p style="margin:20px 0 0;color:#44403c;font-size:15px;">If you cannot attend live, a replay link may be offered later — we will keep it unhurried.</p>`
    : '';

  const innerHtml = `
<p style="margin:0 0 16px;color:#57534e;font-size:14px;letter-spacing:0.08em;text-transform:uppercase;">Your seat is held</p>
<p style="margin:0 0 16px;font-size:17px;color:#1c1917;">${greeting}</p>
<p style="margin:0 0 12px;color:#44403c;font-size:15px;">Thank you for responding to <strong>${escapeHtml(ctx.webinarTitle)}</strong>.</p>
<p style="margin:0 0 8px;color:#44403c;font-size:15px;"><strong>When</strong><br/>${escapeHtml(when)}</p>
<p style="margin:16px 0 0;"><a href="${escapeHtml(detailUrl)}" style="color:#57534e;text-decoration:underline;">Open your invitation</a></p>
${replay}`;

  const lines = [
    'Your seat is held',
    '',
    ctx.recipientName?.trim() ? `Dear ${ctx.recipientName.trim()},` : 'Hello,',
    '',
    `Thank you for responding to "${ctx.webinarTitle}".`,
    '',
    `When: ${when}`,
    '',
    `Invitation: ${detailUrl}`,
    '',
    ctx.replayUrl?.trim()
      ? 'If you cannot attend live, a replay link may be offered later.'
      : '',
  ].filter(Boolean);

  const { html, text } = shell(innerHtml, lines.join('\n'));
  return { subject: `Confirmed · ${ctx.webinarTitle}`, html, text };
}

export function reminder24hEmail(ctx: WebinarMailContext): { subject: string; html: string; text: string } {
  const when = formatSessionWhen(ctx.startsAt, ctx.timezone);
  const greeting = ctx.recipientName?.trim() ? `Dear ${escapeHtml(ctx.recipientName.trim())},` : 'Hello,';
  const detailUrl = `${ctx.siteUrl.replace(/\/$/, '')}/webinars/${encodeURIComponent(ctx.webinarSlug)}`;

  const innerHtml = `
<p style="margin:0 0 16px;color:#57534e;font-size:14px;letter-spacing:0.08em;text-transform:uppercase;">Tomorrow</p>
<p style="margin:0 0 16px;font-size:17px;color:#1c1917;">${greeting}</p>
<p style="margin:0 0 12px;color:#44403c;font-size:15px;">A gentle note that <strong>${escapeHtml(ctx.webinarTitle)}</strong> draws near.</p>
<p style="margin:0 0 8px;color:#44403c;font-size:15px;"><strong>When</strong><br/>${escapeHtml(when)}</p>
<p style="margin:16px 0 0;"><a href="${escapeHtml(detailUrl)}" style="color:#57534e;text-decoration:underline;">View details</a></p>
<p style="margin:20px 0 0;color:#78716c;font-size:14px;">No need to prepare perfectly — arrive as you are.</p>`;

  const lines = [
    'Tomorrow',
    '',
    ctx.recipientName?.trim() ? `Dear ${ctx.recipientName.trim()},` : 'Hello,',
    '',
    `A gentle note that "${ctx.webinarTitle}" draws near.`,
    '',
    `When: ${when}`,
    '',
    detailUrl,
    '',
    'No need to prepare perfectly — arrive as you are.',
  ];

  const { html, text } = shell(innerHtml, lines.join('\n'));
  return { subject: `Tomorrow · ${ctx.webinarTitle}`, html, text };
}

export function reminder1hEmail(ctx: WebinarMailContext): { subject: string; html: string; text: string } {
  const when = formatSessionWhen(ctx.startsAt, ctx.timezone);
  const greeting = ctx.recipientName?.trim() ? `Dear ${escapeHtml(ctx.recipientName.trim())},` : 'Hello,';
  const detailUrl = `${ctx.siteUrl.replace(/\/$/, '')}/webinars/${encodeURIComponent(ctx.webinarSlug)}`;

  const innerHtml = `
<p style="margin:0 0 16px;color:#57534e;font-size:14px;letter-spacing:0.08em;text-transform:uppercase;">Soon</p>
<p style="margin:0 0 16px;font-size:17px;color:#1c1917;">${greeting}</p>
<p style="margin:0 0 12px;color:#44403c;font-size:15px;"><strong>${escapeHtml(ctx.webinarTitle)}</strong> begins in about an hour.</p>
<p style="margin:0 0 8px;color:#44403c;font-size:15px;"><strong>When</strong><br/>${escapeHtml(when)}</p>
<p style="margin:16px 0 0;"><a href="${escapeHtml(detailUrl)}" style="color:#57534e;text-decoration:underline;">Open invitation</a></p>
<p style="margin:20px 0 0;color:#78716c;font-size:14px;">There is nothing to rush.</p>`;

  const lines = [
    'Soon',
    '',
    ctx.recipientName?.trim() ? `Dear ${ctx.recipientName.trim()},` : 'Hello,',
    '',
    `"${ctx.webinarTitle}" begins in about an hour.`,
    '',
    `When: ${when}`,
    '',
    detailUrl,
    '',
    'There is nothing to rush.',
  ];

  const { html, text } = shell(innerHtml, lines.join('\n'));
  return { subject: `Starting soon · ${ctx.webinarTitle}`, html, text };
}

/** Optional — e.g. after session when replay_url is published. */
export function replayAvailableEmail(ctx: WebinarMailContext): { subject: string; html: string; text: string } {
  const replay = ctx.replayUrl?.trim();
  if (!replay) {
    throw new Error('replayAvailableEmail requires replayUrl');
  }
  const greeting = ctx.recipientName?.trim() ? `Dear ${escapeHtml(ctx.recipientName.trim())},` : 'Hello,';

  const innerHtml = `
<p style="margin:0 0 16px;color:#57534e;font-size:14px;letter-spacing:0.08em;text-transform:uppercase;">Replay</p>
<p style="margin:0 0 16px;font-size:17px;color:#1c1917;">${greeting}</p>
<p style="margin:0 0 12px;color:#44403c;font-size:15px;">The recording for <strong>${escapeHtml(ctx.webinarTitle)}</strong> is available when you have time — no expiry rush implied here.</p>
<p style="margin:16px 0 0;"><a href="${escapeHtml(replay)}" style="color:#57534e;text-decoration:underline;">Open replay</a></p>`;

  const lines = [
    'Replay',
    '',
    ctx.recipientName?.trim() ? `Dear ${ctx.recipientName.trim()},` : 'Hello,',
    '',
    `The recording for "${ctx.webinarTitle}" is available when you have time.`,
    '',
    replay,
  ];

  const { html, text } = shell(innerHtml, lines.join('\n'));
  return { subject: `Replay · ${ctx.webinarTitle}`, html, text };
}

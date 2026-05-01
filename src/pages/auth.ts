import type { APIRoute } from 'astro';

/** GitHub OAuth — start flow (Decap opens this URL). */
export const prerender = false;

function randomStateHex(byteLength = 16): string {
  const bytes = new Uint8Array(byteLength);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

export const GET: APIRoute = async ({ cookies, redirect, request }) => {
  const clientId = process.env.OAUTH_GITHUB_CLIENT_ID;
  if (!clientId) {
    return new Response(
      'Missing OAUTH_GITHUB_CLIENT_ID. Add it in Vercel → Settings → Environment Variables.',
      { status: 500, headers: { 'Content-Type': 'text/plain; charset=utf-8' } }
    );
  }

  const host = request.headers.get('host');
  if (!host) {
    return new Response('Missing Host header', { status: 400 });
  }

  const xfProto = request.headers.get('x-forwarded-proto');
  const proto = xfProto?.split(',')[0]?.trim();
  const scheme = proto === 'http' || proto === 'https' ? proto : 'https';

  const redirectUri = `${scheme}://${host}/callback`;
  const state = randomStateHex();

  cookies.set('decap_oauth_state', state, {
    path: '/',
    httpOnly: true,
    sameSite: 'lax',
    maxAge: 600,
    secure: scheme === 'https',
  });

  const authorize = new URL('https://github.com/login/oauth/authorize');
  authorize.searchParams.set('client_id', clientId);
  authorize.searchParams.set('redirect_uri', redirectUri);
  authorize.searchParams.set('scope', 'repo,user');
  authorize.searchParams.set('state', state);

  return redirect(authorize.toString());
};

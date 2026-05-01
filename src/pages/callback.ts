import type { APIRoute } from 'astro';

/** GitHub OAuth — Decap-compatible callback (posts token to opener). */
export const prerender = false;

const PROVIDER = 'github';

function renderPage(status: 'success' | 'error', body: Record<string, unknown>): string {
  const payload = JSON.stringify(body);
  return `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"/><title>Sign in</title></head><body><script>
(function () {
  var status = ${JSON.stringify(status)};
  var payload = ${JSON.stringify(payload)};
  var provider = ${JSON.stringify(PROVIDER)};
  var receiveMessage = function (message) {
    window.opener.postMessage(
      'authorization:' + provider + ':' + status + ':' + payload,
      message.origin
    );
    window.removeEventListener('message', receiveMessage, false);
  };
  window.addEventListener('message', receiveMessage, false);
  window.opener.postMessage('authorizing:' + provider, '*');
})();
</script></body></html>`;
}

export const GET: APIRoute = async ({ request, cookies }) => {
  const host = request.headers.get('host');
  const xfProto = request.headers.get('x-forwarded-proto');
  const proto = xfProto?.split(',')[0]?.trim();
  const scheme = proto === 'http' || proto === 'https' ? proto : 'https';

  const headers = {
    'Content-Type': 'text/html; charset=utf-8',
    // Drop state cookie once consumed
    'Set-Cookie': 'decap_oauth_state=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0',
  };

  if (!host) {
    return new Response(renderPage('error', { error: 'missing_host', provider: PROVIDER }), {
      status: 200,
      headers,
    });
  }

  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  const expected = cookies.get('decap_oauth_state')?.value;

  if (!code || !state || !expected || state !== expected) {
    return new Response(renderPage('error', { error: 'invalid_oauth_state', provider: PROVIDER }), {
      status: 200,
      headers,
    });
  }

  const clientId = process.env.OAUTH_GITHUB_CLIENT_ID;
  const clientSecret = process.env.OAUTH_GITHUB_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    return new Response(renderPage('error', { error: 'missing_oauth_env', provider: PROVIDER }), {
      status: 200,
      headers,
    });
  }

  const redirectUri = `${scheme}://${host}/callback`;

  const tokenRes = await fetch('https://github.com/login/oauth/access_token', {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      client_id: clientId,
      client_secret: clientSecret,
      code,
      redirect_uri: redirectUri,
    }),
  });

  const tokenJson = (await tokenRes.json()) as {
    access_token?: string;
    error?: string;
    error_description?: string;
  };
  const token = tokenJson.access_token;
  if (!token) {
    return new Response(
      renderPage('error', {
        error: tokenJson.error ?? 'token_exchange_failed',
        details: tokenJson.error_description,
        provider: PROVIDER,
      }),
      { status: 200, headers }
    );
  }

  return new Response(renderPage('success', { token, provider: PROVIDER }), { status: 200, headers });
};

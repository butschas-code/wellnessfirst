import type { FormEnv } from './store';

const MAX_BODY = 24_576;

export function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
  });
}

/**
 * `application/x-www-form-urlencoded` avoids CORS preflight for same-site POSTs.
 */
export async function readUrlEncodedForm(request: Request): Promise<Map<string, string>> {
  const ct = request.headers.get('Content-Type') ?? '';
  if (!ct.toLowerCase().includes('application/x-www-form-urlencoded')) {
    const err: Error & { code?: string } = new Error('unsupported content type');
    err.code = 'content_type';
    throw err;
  }
  const text = await request.text();
  if (text.length > MAX_BODY) {
    const err: Error & { code?: string } = new Error('too large');
    err.code = 'size';
    throw err;
  }
  const params = new URLSearchParams(text);
  const m = new Map<string, string>();
  for (const [k, v] of params) m.set(k, v);
  return m;
}

/**
 * Reject cross-origin POSTs when Origin is present (CSRF against simple bots).
 */
export function assertSameOrigin(request: Request): void {
  const origin = request.headers.get('Origin');
  if (origin == null || origin === '') return;
  if (new URL(request.url).origin !== origin) {
    const err: Error & { code?: string } = new Error('forbidden');
    err.code = 'origin';
    throw err;
  }
}

export function isHoneypotClean(company: string | undefined): boolean {
  return (company ?? '').trim() === '';
}

export async function storeSubmission(
  env: FormEnv,
  kind: string,
  payload: Record<string, string | number | boolean | null>
): Promise<string> {
  const id = crypto.randomUUID();
  const at = new Date().toISOString();
  const key = `form:${at.slice(0, 7)}:${id}`;
  const row = { id, at, kind, ...payload };
  if (env.FORM_KV) {
    await env.FORM_KV.put(key, JSON.stringify(row), {
      expirationTtl: 60 * 60 * 24 * 400,
    });
  }
  // Never log email/name in clear without KV; helps ops see traffic when KV is unset.
  console.log(`[wfg-form] kind=${kind} id=${id} kv=${Boolean(env.FORM_KV)}`);
  return id;
}

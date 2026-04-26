import {
  assertSameOrigin,
  isHoneypotClean,
  json,
  readUrlEncodedForm,
  storeSubmission,
} from '../lib/http';
import { checkEmail, checkName, checkSource, checkWebinarMeta } from '../lib/validate';
import type { PagesFunction } from '@cloudflare/workers-types';
import type { FormEnv } from '../lib/store';

export const onRequestPost: PagesFunction<FormEnv> = async (context) => {
  try {
    assertSameOrigin(context.request);
    const m = await readUrlEncodedForm(context.request);
    if (!isHoneypotClean(m.get('company'))) {
      return json({ ok: false, error: 'invalid' }, 400);
    }
    const name = (m.get('name') ?? '').trim();
    const email = (m.get('email') ?? '').trim();
    const webinar_slug = (m.get('webinar_slug') ?? '').trim();
    const webinar_title = (m.get('webinar_title') ?? '').trim();
    const source = (m.get('source') ?? '').trim() || null;

    const e1 = checkName(name);
    if (e1) return json({ ok: false, error: e1 }, 400);
    const e2 = checkEmail(email);
    if (e2) return json({ ok: false, error: e2 }, 400);
    const e4 = checkWebinarMeta(webinar_slug, webinar_title);
    if (e4) return json({ ok: false, error: e4 }, 400);
    const e3 = checkSource(source ?? undefined, 200);
    if (e3) return json({ ok: false, error: e3 }, 400);

    await storeSubmission(context.env, 'webinar_interest', {
      name,
      email,
      webinar_slug,
      webinar_title,
      source: source ?? '',
    });
    return json({ ok: true });
  } catch (e: unknown) {
    const err = e as { code?: string };
    if (err?.code === 'origin') return json({ ok: false, error: 'forbidden' }, 403);
    if (err?.code === 'content_type') return json({ ok: false, error: 'unsupported' }, 415);
    if (err?.code === 'size') return json({ ok: false, error: 'too_large' }, 413);
    return json({ ok: false, error: 'server' }, 500);
  }
};

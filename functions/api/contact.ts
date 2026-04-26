import {
  assertSameOrigin,
  isHoneypotClean,
  json,
  readUrlEncodedForm,
  storeSubmission,
} from '../lib/http';
import {
  checkContactMessage,
  checkEmail,
  checkName,
  contactTopics,
} from '../lib/validate';
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
    const topic = (m.get('topic') ?? '').trim();
    const message = (m.get('message') ?? '').trim();

    const e1 = checkName(name);
    if (e1) return json({ ok: false, error: e1 }, 400);
    const e2 = checkEmail(email);
    if (e2) return json({ ok: false, error: e2 }, 400);
    if (!contactTopics.has(topic)) return json({ ok: false, error: 'Choose a topic' }, 400);
    const e3 = checkContactMessage(message);
    if (e3) return json({ ok: false, error: e3 }, 400);

    await storeSubmission(context.env, 'contact', {
      name,
      email,
      topic,
      message,
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

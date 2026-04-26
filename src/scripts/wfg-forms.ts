import { buildContactMailto, buildInterestMailto, buildWebinarInterestMailto } from '@/lib/forms-client';
import { FORM_API, isFormApiMode } from '@/lib/forms-config';

function friendlyError(raw: string | undefined, contactEmail: string): string {
  switch (raw) {
    case 'forbidden':
      return 'This request could not be verified. Refresh the page and try again.';
    case 'server':
    case 'invalid':
      return 'We could not send that just now. If it persists, write directly to ' + contactEmail + '.';
    case 'too_large':
      return 'That is a little long. Try a shorter message.';
    case 'unsupported':
      return 'Your browser sent an unexpected format. Please reload and try again.';
    default:
      if (raw && raw.length < 200 && !raw.includes('\n')) {
        return raw;
      }
      return 'Something went wrong. Please try again or write to ' + contactEmail + '.';
  }
}

function setFormMessage(
  statusEl: HTMLElement,
  errorEl: HTMLElement,
  level: 'success' | 'error',
  text: string
) {
  statusEl.classList.add('hidden');
  errorEl.classList.add('hidden');
  const el = level === 'success' ? statusEl : errorEl;
  el.classList.remove('hidden');
  el.textContent = text;
  el.setAttribute('role', level === 'error' ? 'alert' : 'status');
  el.setAttribute('aria-live', level === 'error' ? 'assertive' : 'polite');
}

async function postForm(path: string, body: URLSearchParams): Promise<{ ok: true } | { ok: false; error: string }> {
  let res: Response;
  try {
    res = await fetch(path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8' },
      body: body.toString(),
    });
  } catch {
    return { ok: false, error: 'network' };
  }
  const data = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string };
  if (!res.ok || data.ok === false) {
    return { ok: false, error: data.error ?? 'server' };
  }
  return { ok: true };
}

function getBoxes(form: HTMLFormElement) {
  const id = form.id;
  const status = form.querySelector(`#${CSS.escape(id)}-status`);
  const err = form.querySelector(`#${CSS.escape(id)}-error`);
  return {
    status: status instanceof HTMLElement ? status : null,
    err: err instanceof HTMLElement ? err : null,
  };
}

/**
 * Binds public marketing forms. `data-contact-email` on `body` is used for mailto + copy.
 * API: Cloudflare Pages Functions. Set `PUBLIC_FORM_MODE=mailto` for local mailto without `wrangler pages dev`.
 */
export function initWfgForms(): void {
  const useApi = isFormApiMode();
  const raw = document.body?.dataset.contactEmail?.trim();
  const contactEmail: string = raw ?? 'hello@wellnessfirstglobal.com';

  function bindContact(form: HTMLFormElement) {
    const { status, err } = getBoxes(form);
    if (!status || !err) return;
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const hp = form.querySelector<HTMLInputElement>('[name="company"]');
      if (hp && hp.value.trim() !== '') return;

      const fd = new FormData(form);
      const name = String(fd.get('name') ?? '').trim();
      const email = String(fd.get('email') ?? '').trim();
      const topic = String(fd.get('topic') ?? '').trim();
      const message = String(fd.get('message') ?? '').trim();
      if (!name || !email || !topic || !message) {
        setFormMessage(status, err, 'error', 'Please complete all fields.');
        return;
      }

      const body = new URLSearchParams();
      body.set('name', name);
      body.set('email', email);
      body.set('topic', topic);
      body.set('message', message);
      body.set('company', (fd.get('company') as string) ?? '');

      if (useApi) {
        const result = await postForm(FORM_API.contact, body);
        if (result.ok) {
          setFormMessage(
            status,
            err,
            'success',
            'Sent. We will reply in a few business days; a human, not a funnel.',
          );
          form.reset();
          return;
        }
        if (result.error === 'network') {
          const url = buildContactMailto({ to: contactEmail, name, email, topic, message });
          setFormMessage(
            status,
            err,
            'success',
            'We could not reach the server; opening your email with your message. You can also write to ' +
              contactEmail +
              '.',
          );
          window.location.assign(url);
          return;
        }
        setFormMessage(status, err, 'error', friendlyError(result.error, contactEmail));
        return;
      }

      const url = buildContactMailto({ to: contactEmail, name, email, topic, message });
      setFormMessage(
        status,
        err,
        'success',
        'Opening your email app. If nothing happens, copy your message and write to ' + contactEmail + '.',
      );
      window.location.assign(url);
    });
  }

  function bindNewsletter(form: HTMLFormElement) {
    const { status, err } = getBoxes(form);
    if (!status || !err) return;
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const hp = form.querySelector<HTMLInputElement>('[name="company"]');
      if (hp && hp.value.trim() !== '') return;

      const fd = new FormData(form);
      const name = String(fd.get('name') ?? '').trim();
      const email = String(fd.get('email') ?? '').trim();
      if (!name || !email) {
        setFormMessage(status, err, 'error', 'Please add your name and email.');
        return;
      }
      const source = String(fd.get('source') ?? form.id);

      const body = new URLSearchParams();
      body.set('name', name);
      body.set('email', email);
      body.set('source', source);
      body.set('company', (fd.get('company') as string) ?? '');

      if (useApi) {
        const result = await postForm(FORM_API.newsletter, body);
        if (result.ok) {
          setFormMessage(
            status,
            err,
            'success',
            'Noted. We will only write when something is ready — no noise.',
          );
          form.reset();
          return;
        }
        if (result.error === 'network') {
          const url = buildInterestMailto({ to: contactEmail, name, email });
          setFormMessage(
            status,
            err,
            'success',
            'We could not reach the server; opening your email. Or write to ' + contactEmail + ' (subject: interest list).',
          );
          window.location.assign(url);
          return;
        }
        setFormMessage(status, err, 'error', friendlyError(result.error, contactEmail));
        return;
      }

      const url = buildInterestMailto({ to: contactEmail, name, email });
      setFormMessage(
        status,
        err,
        'success',
        'Opening your email app. If nothing happens, write to ' + contactEmail + ' with the subject “interest list”.',
      );
      window.location.assign(url);
    });
  }

  function bindWebinar(form: HTMLFormElement) {
    const { status, err } = getBoxes(form);
    if (!status || !err) return;
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const hp = form.querySelector<HTMLInputElement>('[name="company"]');
      if (hp && hp.value.trim() !== '') return;

      const fd = new FormData(form);
      const name = String(fd.get('name') ?? '').trim();
      const email = String(fd.get('email') ?? '').trim();
      const webinar_slug = String(fd.get('webinar_slug') ?? '').trim();
      const webinar_title = String(fd.get('webinar_title') ?? '').trim();
      if (!name || !email || !webinar_slug || !webinar_title) {
        setFormMessage(status, err, 'error', 'Please add your name and email.');
        return;
      }
      const source = String(fd.get('source') ?? form.id);
      const body = new URLSearchParams();
      body.set('name', name);
      body.set('email', email);
      body.set('webinar_slug', webinar_slug);
      body.set('webinar_title', webinar_title);
      body.set('source', source);
      body.set('company', (fd.get('company') as string) ?? '');

      if (useApi) {
        const result = await postForm(FORM_API.webinarInterest, body);
        if (result.ok) {
          setFormMessage(
            status,
            err,
            'success',
            'Thank you. We will use this to tune what we send for this session and related replays.',
          );
          form.reset();
          return;
        }
        if (result.error === 'network') {
          const url = buildWebinarInterestMailto({
            to: contactEmail,
            name,
            email,
            slug: webinar_slug,
            title: webinar_title,
          });
          setFormMessage(
            status,
            err,
            'success',
            'We could not reach the server; opening your email. Or write to ' + contactEmail + '.',
          );
          window.location.assign(url);
          return;
        }
        setFormMessage(status, err, 'error', friendlyError(result.error, contactEmail));
        return;
      }

      const url = buildWebinarInterestMailto({
        to: contactEmail,
        name,
        email,
        slug: webinar_slug,
        title: webinar_title,
      });
      setFormMessage(
        status,
        err,
        'success',
        'Opening your email for this session interest. You can also write to ' + contactEmail + '.',
      );
      window.location.assign(url);
    });
  }

  document.querySelectorAll<HTMLFormElement>('[data-wfg-form="contact"]').forEach(bindContact);
  document.querySelectorAll<HTMLFormElement>('[data-wfg-form="interest"]').forEach(bindNewsletter);
  document.querySelectorAll<HTMLFormElement>('[data-wfg-form="webinar"]').forEach(bindWebinar);
}

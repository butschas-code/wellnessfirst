import { guardSessionOrRedirect } from '@/lib/app/guardSession';
import {
  CONSULTATION_TOPIC_OPTIONS,
  CONSULTATION_URGENCY_OPTIONS,
} from '@/lib/consultation/request-options';
import { consultationStatusLabel, formatConsultationIso } from '@/lib/consultation/status-display';
import { notifyConsultationSubmitted } from '@/lib/consultation/notify-submitted';
import { getSupabaseBrowser, isSupabaseConfigured } from '@/lib/supabase/browser';

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');
}

type ConsultationRow = {
  id: string;
  status: string;
  full_name: string | null;
  email: string | null;
  preferred_language: string | null;
  topic: string | null;
  situation: string | null;
  desired_support: string | null;
  urgency: string | null;
  consent_to_contact: boolean;
  created_at: string;
  updated_at: string;
};

export async function initConsultationRequestPage(): Promise<void> {
  const state = document.getElementById('w-co-state');
  const panel = document.getElementById('w-co-panel');
  const form = document.getElementById('w-co-form') as HTMLFormElement | null;
  const err = document.getElementById('w-co-error');
  const confirmPanel = document.getElementById('w-co-confirm');
  const historyMount = document.getElementById('w-co-history');
  const editingHidden = document.getElementById('w-co-editing-id') as HTMLInputElement | null;
  const submitBtn = document.getElementById('w-co-submit') as HTMLButtonElement | null;
  const cancelEditBtn = document.getElementById('w-co-cancel-edit') as HTMLButtonElement | null;
  const formIntro = document.getElementById('w-co-form-intro');

  const emailInput = document.getElementById('w-co-email') as HTMLInputElement | null;
  const nameInput = document.getElementById('w-co-name') as HTMLInputElement | null;

  if (!isSupabaseConfigured() || !form || !historyMount || !editingHidden) {
    if (state) state.textContent = 'Supabase is not configured.';
    return;
  }

  const session = await guardSessionOrRedirect();
  if (!session) return;

  const uid = session.user.id;
  const sessionEmail = session.user.email ?? '';
  const histEl = historyMount;
  const editField = editingHidden;
  const mainForm = form;

  const supabase = getSupabaseBrowser();

  const [{ data: profile }, meta] = await Promise.all([
    supabase.from('profiles').select('full_name, display_name, email').eq('id', uid).maybeSingle(),
    Promise.resolve(session.user.user_metadata as Record<string, unknown> | undefined),
  ]);

  const metaName =
    typeof meta?.full_name === 'string'
      ? meta.full_name
      : typeof meta?.name === 'string'
        ? meta.name
        : '';
  const prefName =
    profile?.display_name?.trim() ||
    profile?.full_name?.trim() ||
    metaName.trim() ||
    '';

  if (emailInput) {
    emailInput.value = profile?.email?.trim() || sessionEmail;
  }
  if (nameInput && prefName) nameInput.value = prefName;

  async function loadHistory(): Promise<void> {
    const { data, error } = await supabase
      .from('consultation_requests')
      .select(
        'id, status, full_name, email, preferred_language, topic, situation, desired_support, urgency, consent_to_contact, created_at, updated_at',
      )
      .eq('user_id', uid)
      .order('created_at', { ascending: false })
      .limit(25);

    if (error) {
      histEl.innerHTML = `<p class="text-sm text-red-800">${esc(error.message)}</p>`;
      return;
    }

    const rows = (data ?? []) as ConsultationRow[];
    if (rows.length === 0) {
      histEl.innerHTML =
        '<p class="text-sm leading-relaxed text-ink-600">When you send a note, it will appear here — one line per thread.</p>';
      return;
    }

    const blocks = rows
      .map((r) => {
        const editable = r.status === 'new';
        const editBtn = editable
          ? `<button type="button" class="mt-4 text-sm font-medium text-secondary underline decoration-line underline-offset-4 hover:text-ink" data-w-co-edit="${esc(r.id)}">Adjust what you shared</button>`
          : `<p class="mt-4 text-sm text-ink-500">Revisions stay closed once we have begun — thank you for your patience.</p>`;

        const lines = [
          r.urgency ? `<p class="mt-3 text-sm text-ink-600">${esc(r.urgency)}</p>` : '',
          r.situation ? `<p class="mt-3 text-sm leading-relaxed text-ink-700">${esc(r.situation)}</p>` : '',
          r.desired_support
            ? `<p class="mt-2 text-sm leading-relaxed text-ink-600"><span class="font-medium text-ink-600">Hoping for</span> — ${esc(r.desired_support)}</p>`
            : '',
        ]
          .filter(Boolean)
          .join('');

        const topicHead = r.topic
          ? `<p class="mt-2 font-display text-xl text-ink">${esc(r.topic)}</p>`
          : `<p class="mt-2 font-display text-xl text-ink">Your note</p>`;

        return `<li class="rounded-2xl border border-ink/10 bg-paper/90 px-5 py-6 sm:px-7 sm:py-8">
          <p class="text-xs font-medium uppercase tracking-wider text-ink-400">${esc(formatConsultationIso(r.created_at))}</p>
          ${topicHead}
          <p class="mt-1 text-sm text-ink-500">${esc(consultationStatusLabel(r.status))}</p>
          ${lines}
          ${editBtn}
        </li>`;
      })
      .join('');

    histEl.innerHTML = `<ul class="mt-8 list-none space-y-6 p-0" role="list">${blocks}</ul>`;

    histEl.querySelectorAll<HTMLButtonElement>('button[data-w-co-edit]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-w-co-edit');
        const row = rows.find((x) => x.id === id);
        if (!row || row.status !== 'new') return;
        editField.value = row.id;
        if (nameInput) nameInput.value = row.full_name?.trim() || prefName;
        if (emailInput) emailInput.value = row.email?.trim() || sessionEmail;
        (document.getElementById('w-co-lang') as HTMLInputElement | null)!.value =
          row.preferred_language?.trim() || '';
        const topicSel = document.getElementById('w-co-topic') as HTMLSelectElement | null;
        if (topicSel) {
          topicSel.querySelectorAll('option[data-w-co-temp-topic]').forEach((o) => o.remove());
          if (row.topic && !(CONSULTATION_TOPIC_OPTIONS as readonly string[]).includes(row.topic)) {
            const opt = document.createElement('option');
            opt.value = row.topic;
            opt.textContent = row.topic;
            opt.dataset.wCoTempTopic = 'true';
            const other = topicSel.querySelector('option[value="Other"]');
            if (other) topicSel.insertBefore(opt, other);
            else topicSel.appendChild(opt);
          }
          topicSel.value = row.topic ?? 'Other';
        }
        (document.getElementById('w-co-situation') as HTMLTextAreaElement | null)!.value =
          row.situation?.trim() || '';
        (document.getElementById('w-co-support') as HTMLTextAreaElement | null)!.value =
          row.desired_support?.trim() || '';
        (document.getElementById('w-co-urgency') as HTMLSelectElement | null)!.value =
          row.urgency && (CONSULTATION_URGENCY_OPTIONS as readonly string[]).includes(row.urgency)
            ? row.urgency
            : CONSULTATION_URGENCY_OPTIONS[0]!;
        (document.getElementById('w-co-consent') as HTMLInputElement | null)!.checked = row.consent_to_contact;
        if (submitBtn) submitBtn.textContent = 'Save changes';
        cancelEditBtn?.classList.remove('hidden');
        formIntro?.classList.add('hidden');
        mainForm.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    });
  }

  cancelEditBtn?.addEventListener('click', () => {
    editField.value = '';
    document.getElementById('w-co-topic')?.querySelectorAll('option[data-w-co-temp-topic]').forEach((o) => o.remove());
    mainForm.reset();
    if (emailInput) emailInput.value = profile?.email?.trim() || sessionEmail;
    if (nameInput && prefName) nameInput.value = prefName;
    if (submitBtn) submitBtn.textContent = 'Send note';
    cancelEditBtn.classList.add('hidden');
    formIntro?.classList.remove('hidden');
  });

  state?.classList.add('hidden');
  panel?.classList.remove('hidden');

  await loadHistory();

  document.getElementById('w-co-new-note')?.addEventListener('click', () => {
    confirmPanel?.classList.add('hidden');
    mainForm.classList.remove('hidden');
    formIntro?.classList.remove('hidden');
    err?.classList.add('hidden');
  });

  mainForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    err?.classList.add('hidden');
    confirmPanel?.classList.add('hidden');

    const fd = new FormData(mainForm);
    const consent = (document.getElementById('w-co-consent') as HTMLInputElement | null)?.checked;
    if (!consent) {
      if (err) {
        err.textContent = 'Please confirm we may reply — we will not chase you with sales.';
        err.classList.remove('hidden');
      }
      return;
    }

    const email = String(fd.get('email') ?? '').trim();
    if (!email) {
      if (err) {
        err.textContent = 'An email helps us answer in the right place.';
        err.classList.remove('hidden');
      }
      return;
    }

    const topicVal = String(fd.get('topic') ?? '').trim();
    if (!topicVal) {
      if (err) {
        err.textContent = 'Choose a thread that best fits — or Other.';
        err.classList.remove('hidden');
      }
      return;
    }

    const payload = {
      full_name: String(fd.get('full_name') ?? '').trim() || null,
      email,
      preferred_language: String(fd.get('preferred_language') ?? '').trim() || null,
      topic: topicVal || null,
      situation: String(fd.get('situation') ?? '').trim() || null,
      desired_support: String(fd.get('desired_support') ?? '').trim() || null,
      urgency: String(fd.get('urgency') ?? '').trim() || null,
      consent_to_contact: true,
    };

    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = editField.value.trim() ? 'Saving…' : 'Sending…';
    }

    const editId = editField.value.trim();
    let requestId: string | null = null;

    if (editId) {
      const { data, error } = await supabase
        .from('consultation_requests')
        .update(payload)
        .eq('id', editId)
        .eq('user_id', uid)
        .eq('status', 'new')
        .select('id')
        .maybeSingle();

      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = editField.value.trim() ? 'Save changes' : 'Send note';
      }

      if (error) {
        if (err) {
          err.textContent =
            error.message.includes('row-level security') || error.code === '42501'
              ? 'This note can no longer be edited — we have already begun to read it.'
              : error.message;
          err.classList.remove('hidden');
        }
        return;
      }
      if (!data?.id) {
        if (err) {
          err.textContent =
            'We could not update that note — it may already be with the team. Send a fresh note if you need to add something.';
          err.classList.remove('hidden');
        }
        return;
      }
      requestId = data.id;
    } else {
      const { data, error } = await supabase
        .from('consultation_requests')
        .insert({ user_id: uid, ...payload })
        .select('id')
        .maybeSingle();

      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Send note';
      }

      if (error) {
        if (err) {
          err.textContent = error.message;
          err.classList.remove('hidden');
        }
        return;
      }
      requestId = data?.id ?? null;
    }

    if (requestId && !editId) {
      void notifyConsultationSubmitted({ requestId, accessToken: session.access_token });
    }

    mainForm.classList.add('hidden');
    cancelEditBtn?.classList.add('hidden');
    formIntro?.classList.add('hidden');
    confirmPanel?.classList.remove('hidden');
    editField.value = '';

    await loadHistory();

    mainForm.reset();
    if (emailInput) emailInput.value = profile?.email?.trim() || sessionEmail;
    if (nameInput && prefName) nameInput.value = prefName;
    if (submitBtn) submitBtn.textContent = 'Send note';

  });
}

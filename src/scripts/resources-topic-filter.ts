/** Topic pills on `/resources` — hides shelves when nothing matches. */

export function initResourcesTopicFilters(): void {
  if (typeof document === 'undefined') return;

  const root = document.querySelector('[data-resource-topic-filters]');
  const noMatch = document.querySelector('[data-resource-no-match]') as HTMLElement | null;
  if (!root) return;

  function applyTopic(raw: string): void {
    document.querySelectorAll('[data-resource-card]').forEach((card) => {
      const topic = (card as HTMLElement).dataset.topic ?? '';
      const show = raw === 'all' || topic === raw;
      (card as HTMLElement).closest('[data-resource-item]')?.classList.toggle('hidden', !show);
    });

    document.querySelectorAll('[data-resource-section]').forEach((sec) => {
      const visible = sec.querySelector('[data-resource-item]:not(.hidden)');
      (sec as HTMLElement).classList.toggle('hidden', !visible);
    });

    let any = false;
    document.querySelectorAll('[data-resource-item]').forEach((li) => {
      if (!li.classList.contains('hidden')) any = true;
    });
    noMatch?.classList.toggle('hidden', any);
  }

  root.querySelectorAll('button[data-resource-topic-filter]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const raw = btn.getAttribute('data-resource-topic-filter') || 'all';
      root.querySelectorAll('button[data-resource-topic-filter]').forEach((b) => b.setAttribute('aria-pressed', 'false'));
      btn.setAttribute('aria-pressed', 'true');
      applyTopic(raw);
    });
  });

  document.querySelector('[data-resource-show-all]')?.addEventListener('click', () => {
    const allBtn = root.querySelector('button[data-resource-topic-filter="all"]') as HTMLButtonElement | null;
    allBtn?.click();
  });
}

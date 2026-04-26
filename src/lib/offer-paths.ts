type WithSlug = { id: string; data: { slug?: string } };

export function offerPath(
  base: 'webinars' | 'consultations' | 'products',
  entry: WithSlug
): string {
  return `/${base}/${entry.data.slug ?? entry.id}`;
}

export function resolveByPublicSlug<T extends WithSlug>(items: T[], paramSlug: string): T | undefined {
  return items.find((e) => (e.data.slug ?? e.id) === paramSlug);
}

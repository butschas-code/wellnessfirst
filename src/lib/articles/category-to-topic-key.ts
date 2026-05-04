/** Maps Astro article `category` frontmatter to `public.articles.topic_key` (matches `is_allowed_topic_key`). */
export function categoryToTopicKey(category: string): string | null {
  const map: Record<string, string> = {
    Clarity: 'clarity',
    Regulation: 'regulation',
    Environment: 'environment',
    'Energy & Frequency': 'energy_frequency',
    'Practices & Rituals': 'practices_rituals',
    'Astrology & Timing': 'astrology_timing',
  };
  return map[category] ?? null;
}

/** Matches `public.is_allowed_topic_key` — labels aligned with My Interests / Overview copy. */
export const TOPIC_KEYS = [
  'clarity',
  'regulation',
  'environment',
  'energy_frequency',
  'practices_rituals',
  'astrology_timing',
  'vastu_place_quality',
  'geopathic_stress',
  'sleep_rhythm',
  'family_home_atmosphere',
] as const;

export type TopicKey = (typeof TOPIC_KEYS)[number];

export const TOPIC_LABELS: Record<TopicKey, string> = {
  clarity: 'Clarity',
  regulation: 'Regulation',
  environment: 'Environment',
  energy_frequency: 'Energy & Frequency',
  practices_rituals: 'Practices & Rituals',
  astrology_timing: 'Astrology & Timing',
  vastu_place_quality: 'Vastu / Place Quality',
  geopathic_stress: 'Geopathic Stress',
  sleep_rhythm: 'Sleep & Rhythm',
  family_home_atmosphere: 'Family / Home Atmosphere',
};

export function topicLabel(key: string | null | undefined): string {
  if (!key || !(key in TOPIC_LABELS)) return key ?? '';
  return TOPIC_LABELS[key as TopicKey];
}

/** Stored `consultation_requests.topic` values — plain language for admins reading rows. */
export const CONSULTATION_TOPIC_OPTIONS = [
  'Personal clarity',
  'Stress regulation',
  'Sleep and rhythm',
  'Home or place quality',
  'Geopathic stress',
  'Astrology and timing',
  'Frequency practices',
  'Family or home atmosphere',
  'Other',
] as const;

export type ConsultationTopicOption = (typeof CONSULTATION_TOPIC_OPTIONS)[number];

export const CONSULTATION_URGENCY_OPTIONS = [
  'Just exploring',
  'I would like guidance soon',
  'This feels important now',
] as const;

export type ConsultationUrgencyOption = (typeof CONSULTATION_URGENCY_OPTIONS)[number];

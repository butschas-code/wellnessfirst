/**
 * Future community / curriculum tracks (Supabase content can reference these by `id`).
 * Phase 2: used for copy and dashboard placeholder only.
 */
export const COMMUNITY_TRACKS = [
  { id: 'astra-basic', label: 'Astra Basic' },
  { id: 'conscious-living', label: 'Conscious Living' },
  { id: 'frq-healing', label: 'FRQ Healing' },
  { id: 'wellness', label: 'Wellness' },
  { id: 'l-rods', label: 'L-rods' },
  { id: 'geopathic-stress', label: 'Geopathic Stress' },
  { id: 'telluric-energy', label: 'Telluric Energy' },
] as const;

export type CommunityTrackId = (typeof COMMUNITY_TRACKS)[number]['id'];

import { COMMUNITY_TRACKS, type CommunityTrackId } from '@/lib/community-tracks';
import type {
  CommunityTrackContent,
  CommunityLesson,
  CommunityResource,
  WebinarReplay,
  DownloadableGuide,
} from '@/lib/community/types';

/**
 * Static scaffold data only. Replace with Supabase (or a CMS) when the library goes live;
 * keep `id` and `trackId` stable for future migrations.
 */
const mkLesson = (
  id: string,
  trackId: CommunityTrackId,
  title: string,
  summary: string,
  durationMinutes: number,
  order: number
): CommunityLesson => ({
  id,
  trackId,
  title,
  summary,
  durationMinutes,
  order,
  state: 'placeholder',
});

const mkResource = (
  id: string,
  trackId: CommunityTrackId,
  title: string,
  kind: CommunityResource['kind'],
  blurb: string
): CommunityResource => ({
  id,
  trackId,
  title,
  kind,
  blurb,
  state: 'placeholder',
});

const mkReplay = (
  id: string,
  trackId: CommunityTrackId,
  title: string,
  sessionLabel: string,
  seasonLabel: string,
  durationMinutes: number
): WebinarReplay => ({
  id,
  trackId,
  title,
  sessionLabel,
  seasonLabel,
  durationMinutes,
  state: 'placeholder',
});

const mkGuide = (
  id: string,
  trackId: CommunityTrackId,
  title: string,
  format: DownloadableGuide['format'],
  fileSizeLabel: string
): DownloadableGuide => ({
  id,
  trackId,
  title,
  format,
  fileSizeLabel,
  state: 'placeholder',
});

function buildTrack(trackId: CommunityTrackId, label: string): CommunityTrackContent {
  return {
    trackId,
    lessons: [mkLesson(`${trackId}-l1`, trackId, `Orientation · ${label}`, 'A quiet entry point. Structure and what to expect as this track fills in.', 12, 1)],
    resources: [
      mkResource(`${trackId}-r1`, trackId, `Field notes`, 'reading', 'Curated context and vocabulary for this thread.'),
    ],
    replays: [
      mkReplay(`${trackId}-w1`, trackId, `Seasonal conversation`, 'Session preview', 'Opening wave', 48),
    ],
    guides: [
      mkGuide(`${trackId}-g1`, trackId, `Practical primer`, 'pdf', '~2.4 MB'),
    ],
  };
}

const byTrack: Record<CommunityTrackId, CommunityTrackContent> = Object.fromEntries(
  COMMUNITY_TRACKS.map((t) => [t.id, buildTrack(t.id, t.label)] as const)
) as Record<CommunityTrackId, CommunityTrackContent>;

export function getCommunityTrackContent(trackId: CommunityTrackId): CommunityTrackContent {
  return byTrack[trackId];
}

export function isCommunityTrackId(id: string): id is CommunityTrackId {
  return COMMUNITY_TRACKS.some((t) => t.id === id);
}

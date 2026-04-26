import type { CommunityTrackId } from '@/lib/community-tracks';

export type CommunityContentState = 'placeholder' | 'available';

export interface CommunityLesson {
  id: string;
  trackId: CommunityTrackId;
  title: string;
  summary: string;
  durationMinutes: number;
  state: CommunityContentState;
  /** Display order within track */
  order: number;
}

export interface CommunityResource {
  id: string;
  trackId: CommunityTrackId;
  title: string;
  kind: 'reading' | 'link' | 'tool';
  blurb: string;
  state: CommunityContentState;
  href?: string;
}

export interface WebinarReplay {
  id: string;
  trackId: CommunityTrackId;
  title: string;
  sessionLabel: string;
  /** Human-readable, e.g. "April" or "2026 · Q1" */
  seasonLabel: string;
  durationMinutes: number;
  state: CommunityContentState;
}

export interface DownloadableGuide {
  id: string;
  trackId: CommunityTrackId;
  title: string;
  format: 'pdf' | 'epub';
  fileSizeLabel: string;
  state: CommunityContentState;
}

export interface CommunityTrackContent {
  trackId: CommunityTrackId;
  lessons: CommunityLesson[];
  resources: CommunityResource[];
  replays: WebinarReplay[];
  guides: DownloadableGuide[];
}

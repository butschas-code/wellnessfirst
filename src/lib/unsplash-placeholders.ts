/**
 * Static Unsplash URLs for layout placeholders. Subject to the Unsplash License:
 * https://unsplash.com/license
 *
 * — calm, bright imagery; not stock-aggro.
 */
export type UnsplashSlotRatio = '16-9' | '3-2' | '4-5' | '1-1' | '21-9' | 'og';

const dimensions: Record<UnsplashSlotRatio, { w: number; h: number }> = {
  '16-9': { w: 1920, h: 1080 },
  '3-2': { w: 1200, h: 800 },
  '4-5': { w: 800, h: 1000 },
  '1-1': { w: 1200, h: 1200 },
  '21-9': { w: 2520, h: 1080 },
  og: { w: 1200, h: 630 },
};

/** `photo-` ID segments (verified 200 on images.unsplash.com). */
const photos = {
  /** Soft light, interior / calm */
  default: '1506126613408-eca07ce68773',
  /** Florals, gentle */
  article: '1490750967868-88aa4486c946',
  /** Meeting, session */
  webinar: '1517245386807-bb43f82c33c4',
  /** Retail / shelf / objects */
  product: '1441986300917-64674bd600d8',
} as const;

export type UnsplashPhotoKey = keyof typeof photos;

export function unsplashPhotoId(key: UnsplashPhotoKey = 'default'): string {
  return photos[key];
}

/** Build a cropped `images.unsplash.com` URL (fit + dimensions). */
export function getUnsplashPlaceholderUrl(
  ratio: UnsplashSlotRatio = '3-2',
  key: UnsplashPhotoKey = 'default',
): string {
  const { w, h } = dimensions[ratio] ?? dimensions['3-2'];
  const id = photos[key] ?? photos.default;
  return `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=${w}&h=${h}&q=80`;
}

/** Smaller image for list thumbs (article river, etc.). */
export function getUnsplashThumbUrl(key: UnsplashPhotoKey = 'article'): string {
  const id = photos[key] ?? photos.default;
  return `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=640&h=480&q=80`;
}

/** Wide marketing hero (home) — 21:9, large crop for overlay text. */
export function getUnsplashHomeHeroUrl(): string {
  return getUnsplashPlaceholderUrl('21-9', 'default');
}

export function keyFromHeroVariant(
  v: 'article' | 'webinar' | 'product',
): UnsplashPhotoKey {
  if (v === 'webinar') return 'webinar';
  if (v === 'product') return 'product';
  return 'article';
}

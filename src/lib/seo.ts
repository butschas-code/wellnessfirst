import { site, socialPreview } from '@/lib/site';

/** Origin from Astro `site` config (used for canonicals, OG, JSON-LD). */
export function getSiteOrigin(): string {
  const s = import.meta.env.SITE;
  if (s) return s.replace(/\/$/, '');
  return 'https://www.wellnessfirstglobal.com';
}

export function absoluteUrl(path: string): string {
  const base = getSiteOrigin();
  if (path.startsWith('http://') || path.startsWith('https://')) return path;
  const p = path.startsWith('/') ? path : `/${path}`;
  return `${base}${p}`;
}

export function organizationId(): string {
  return `${getSiteOrigin()}/#organization`;
}

export function websiteId(): string {
  return `${getSiteOrigin()}/#website`;
}

export function resolveOgImage(path: string | undefined): { url: string; isDefault: boolean } {
  if (!path) {
    return { url: absoluteUrl(socialPreview.defaultOgImage), isDefault: true };
  }
  if (path.startsWith('http://') || path.startsWith('https://')) {
    return { url: path, isDefault: false };
  }
  return { url: absoluteUrl(path), isDefault: false };
}

/** Sitewide Organization + WebSite graph (single script, all pages). */
export function siteGraphJsonLd(): Record<string, unknown> {
  const origin = getSiteOrigin();
  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Organization',
        '@id': organizationId(),
        name: site.name,
        url: origin,
        description: site.description,
        logo: {
          '@type': 'ImageObject',
          url: absoluteUrl(socialPreview.defaultOgImage),
        },
      },
      {
        '@type': 'WebSite',
        '@id': websiteId(),
        name: site.name,
        url: `${origin}/`,
        description: site.description,
        publisher: { '@id': organizationId() },
        inLanguage: 'en-GB',
      },
    ],
  };
}

export function articleJsonLd(input: {
  headline: string;
  description: string;
  url: string;
  datePublished: string;
  dateModified: string;
  authorName: string;
  imageUrls?: string[];
}): Record<string, unknown> {
  const art: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: input.headline,
    description: input.description,
    url: input.url,
    datePublished: input.datePublished,
    dateModified: input.dateModified,
    author: {
      '@type': 'Person',
      name: input.authorName,
    },
    publisher: { '@id': organizationId() },
    isPartOf: { '@id': websiteId() },
    mainEntityOfPage: { '@type': 'WebPage', '@id': input.url },
  };
  if (input.imageUrls?.length) {
    art.image = input.imageUrls.map((u) => absoluteUrl(u));
  }
  return art;
}

const availabilityMap = {
  available: 'https://schema.org/InStock',
  waitlist: 'https://schema.org/PreOrder',
  retired: 'https://schema.org/Discontinued',
} as const;

export function productJsonLd(input: {
  name: string;
  description: string;
  url: string;
  imageUrl?: string;
  availability: keyof typeof availabilityMap;
}): Record<string, unknown> {
  const p: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: input.name,
    description: input.description,
    url: input.url,
    brand: { '@type': 'Brand', name: site.name },
    offers: {
      '@type': 'Offer',
      url: input.url,
      availability: availabilityMap[input.availability],
    },
  };
  if (input.imageUrl) {
    p.image = absoluteUrl(input.imageUrl);
  }
  return p;
}

/** One-on-one or bespoke offerings — consultation detail pages. */
export function serviceJsonLd(input: { name: string; description: string; url: string }): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'Service',
    name: input.name,
    description: input.description,
    url: input.url,
    provider: { '@id': organizationId() },
  };
}

export function webinarEventJsonLd(input: {
  name: string;
  description: string;
  url: string;
  startDate: Date;
  durationMinutes: number;
  imageUrl?: string;
  isOnline: boolean;
}): Record<string, unknown> {
  const end = new Date(+input.startDate + input.durationMinutes * 60_000);
  const ev: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'Event',
    name: input.name,
    description: input.description,
    url: input.url,
    startDate: input.startDate.toISOString(),
    endDate: end.toISOString(),
    eventAttendanceMode: input.isOnline
      ? 'https://schema.org/OnlineEventAttendanceMode'
      : 'https://schema.org/OfflineEventAttendanceMode',
    eventStatus: 'https://schema.org/EventScheduled',
    organizer: { '@id': organizationId() },
  };
  if (input.isOnline) {
    ev.location = {
      '@type': 'VirtualLocation',
      url: input.url,
    };
  }
  if (input.imageUrl) {
    ev.image = absoluteUrl(input.imageUrl);
  }
  return ev;
}

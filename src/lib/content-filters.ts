import { getCollection, type CollectionKey } from 'astro:content';

const includeDrafts = import.meta.env.DEV;

export function publishedOnly({ data }: { data: { draft?: boolean } }) {
  return includeDrafts || !data.draft;
}

/**
 * Fetches a build-time collection with optional draft handling.
 */
export async function getPublished<C extends CollectionKey>(name: C) {
  return getCollection(name, publishedOnly);
}

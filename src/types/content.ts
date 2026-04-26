import type { CollectionEntry } from 'astro:content';

/** Convenience aliases for props and helpers (schema lives in `src/content.config.ts`). */
export type ArticleEntry = CollectionEntry<'articles'>;
export type WebinarEntry = CollectionEntry<'webinars'>;
export type ConsultationEntry = CollectionEntry<'consultations'>;
export type ProductEntry = CollectionEntry<'products'>;
export type PageEntry = CollectionEntry<'pages'>;

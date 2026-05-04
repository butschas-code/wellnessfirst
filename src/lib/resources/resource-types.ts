/** Matches `public.resources.resource_type` CHECK constraint. */
export const RESOURCE_TYPE_KEYS = [
  'guide',
  'worksheet',
  'checklist',
  'ritual',
  'reading_list',
  'webinar_notes',
] as const;

export type ResourceTypeKey = (typeof RESOURCE_TYPE_KEYS)[number];

/** Section titles on `/resources` — calm, curated tone. */
export const RESOURCE_TYPE_SECTION_LABEL: Record<ResourceTypeKey, string> = {
  guide: 'Guides',
  worksheet: 'Worksheets',
  checklist: 'Checklists',
  ritual: 'Rituals',
  reading_list: 'Reading lists',
  webinar_notes: 'Webinar notes',
};

/** Order of shelves on the public library page. */
export const RESOURCE_LIBRARY_SECTION_ORDER: ResourceTypeKey[] = [
  'guide',
  'worksheet',
  'checklist',
  'ritual',
  'reading_list',
  'webinar_notes',
];

export function isResourceTypeKey(v: string | null | undefined): v is ResourceTypeKey {
  return typeof v === 'string' && (RESOURCE_TYPE_KEYS as readonly string[]).includes(v);
}

export function resourceTypeLabel(v: string | null | undefined): string {
  if (!v || !isResourceTypeKey(v)) return 'Library item';
  return RESOURCE_TYPE_SECTION_LABEL[v];
}

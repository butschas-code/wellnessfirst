-- Library taxonomy for published resources (curated shelves in the UI).
ALTER TABLE public.resources
  ADD COLUMN IF NOT EXISTS resource_type text NOT NULL DEFAULT 'guide';

ALTER TABLE public.resources
  DROP CONSTRAINT IF EXISTS resources_resource_type_chk;

ALTER TABLE public.resources
  ADD CONSTRAINT resources_resource_type_chk CHECK (
    resource_type IN (
      'worksheet',
      'checklist',
      'guide',
      'ritual',
      'reading_list',
      'webinar_notes'
    )
  );

CREATE INDEX IF NOT EXISTS idx_resources_published_resource_type ON public.resources (published, resource_type)
  WHERE published = true;

COMMENT ON COLUMN public.resources.resource_type IS
  'Shelf grouping: worksheet, checklist, guide, ritual, reading_list, webinar_notes.';

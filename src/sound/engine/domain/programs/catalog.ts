/**
 * Frequency programs — validated access to the canonical catalog.
 * The generated JSON is produced by scripts/import-legacy-catalog.py from the
 * owner's workbook; never edit it by hand.
 */

import raw from './catalog.generated.json';
import { type CanonicalCatalog, CanonicalCatalogSchema, type CanonicalProgram, type RenderOptions, type RenderPlan } from './types';
import { planFor } from './adaptationPolicy';

let cached: CanonicalCatalog | null = null;

export function catalog(): CanonicalCatalog {
  if (!cached) cached = CanonicalCatalogSchema.parse(raw);
  return cached;
}

export function catalogRef(): RenderPlan['catalog'] {
  const c = catalog();
  return { importVersion: c.importVersion, sha256: c.source.sha256, file: c.source.file };
}

export function programById(id: string): CanonicalProgram | undefined {
  return catalog().programs.find((p) => p.id === id);
}

export function programsInCategory(category: string): CanonicalProgram[] {
  return catalog().programs.filter((p) => p.category === category);
}

export function planForId(id: string, options: Partial<RenderOptions> = {}): RenderPlan | null {
  const p = programById(id);
  return p ? planFor(p, catalogRef(), options) : null;
}

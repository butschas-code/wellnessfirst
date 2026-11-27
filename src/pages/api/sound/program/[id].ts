/**
 * GET /api/sound/program/:id — one program, ready to play. Owner or standard
 * programs only (RLS). Programs are immutable, so this is a frozen copy.
 */
import type { APIRoute } from 'astro';
import { planForComposition, validateComposition } from '@/sound/engine/compose/index';
import { callerFrom, fail, fromRow, json, savedIds, type ProgramRow } from '@/lib/sound/server';

export const prerender = false;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const GET: APIRoute = async ({ params, request }) => {
  const id = params.id ?? '';
  if (!UUID.test(id)) return fail(400, 'bad-id');
  const caller = await callerFrom(request);
  if (!caller) return fail(401, 'sign-in-required');
  const { data, error } = await caller.db.from('sound_programs').select('*').eq('id', id).maybeSingle();
  if (error) return fail(500, 'program-read-failed');
  if (!data) return fail(404, 'not-found');
  const row = data as ProgramRow;
  const problems = validateComposition(row.composition);
  if (problems.length) return fail(409, 'stale-program', problems.join(' '));
  const saved = await savedIds(caller, [id]).catch(() => new Set<string>());
  const plan = planForComposition(row.composition, row.name);
  return json({
    program: fromRow(row, saved.has(id)),
    plan: { programId: plan.programId, passSeconds: plan.passSeconds, sequence: plan.sequence },
  });
};

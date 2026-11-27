/**
 * POST   /api/sound/program/:id/save  { label?, note? }  saves a program (signed in)
 * DELETE /api/sound/program/:id/save                    unsaves it
 * Saving only adds a row to sound_program_saves; the program itself never changes.
 */
import type { APIRoute } from 'astro';
import { z } from 'zod';
import { callerFrom, fail, json, readJson } from '@/lib/sound/server';

export const prerender = false;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const Body = z.object({ label: z.string().max(80).optional(), note: z.string().max(500).optional() });

export const POST: APIRoute = async ({ params, request }) => {
  const id = params.id ?? '';
  if (!UUID.test(id)) return fail(400, 'bad-id');
  const caller = await callerFrom(request);
  if (!caller) return fail(401, 'sign-in-required', 'Create a free account to save programs.');
  let body: z.infer<typeof Body>;
  try {
    body = Body.parse(await readJson(request, 4096));
  } catch {
    return fail(400, 'bad-body');
  }
  const { error } = await caller.db
    .from('sound_program_saves')
    .upsert({ user_id: caller.user.id, program_id: id, label: body.label ?? null, note: body.note ?? null }, { onConflict: 'user_id,program_id' });
  // RLS refuses programs the member can't see; report that as not found.
  if (error) return fail(error.code === '42501' ? 404 : 500, error.code === '42501' ? 'not-found' : 'save-failed');
  return json({ saved: true, programId: id });
};

export const DELETE: APIRoute = async ({ params, request }) => {
  const id = params.id ?? '';
  if (!UUID.test(id)) return fail(400, 'bad-id');
  const caller = await callerFrom(request);
  if (!caller) return fail(401, 'sign-in-required');
  const { error } = await caller.db.from('sound_program_saves').delete().eq('user_id', caller.user.id).eq('program_id', id);
  if (error) return fail(500, 'unsave-failed');
  return json({ saved: false, programId: id });
};

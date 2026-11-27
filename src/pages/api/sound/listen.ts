/**
 * POST /api/sound/listen — logs one stretch of listening (signed in).
 * The player normally writes `sound_listens` directly through RLS (see
 * runtime/siteHost.ts); this endpoint is the server route from §7 for
 * clients that can't, and accepts the program that played.
 */
import type { APIRoute } from 'astro';
import { z } from 'zod';
import { callerFrom, fail, json, readJson } from '@/lib/sound/server';

export const prerender = false;

const Body = z.object({
  clientId: z.string().min(8).max(64),
  recipeId: z.string().min(1).max(64),
  programId: z.string().uuid().nullish(),
  intent: z.string().max(32).nullish(),
  audioMode: z.string().max(32).nullish(),
  startedAt: z.number().int().positive(),
  seconds: z.number().int().min(1).max(86_400),
  endedBy: z.enum(['switch', 'stop', 'timer', 'leave', 'chunk']).nullish(),
  device: z.string().max(32).nullish(),
});

export const POST: APIRoute = async ({ request }) => {
  const caller = await callerFrom(request);
  if (!caller) return fail(401, 'sign-in-required');
  let b: z.infer<typeof Body>;
  try {
    b = Body.parse(await readJson(request, 4096));
  } catch {
    return fail(400, 'bad-body');
  }
  const { error } = await caller.db.from('sound_listens').upsert(
    {
      user_id: caller.user.id,
      client_id: b.clientId,
      recipe_id: b.recipeId,
      program_id: b.programId ?? null,
      intent: b.intent ?? null,
      audio_mode: b.audioMode ?? null,
      started_at: new Date(b.startedAt).toISOString(),
      seconds: b.seconds,
      ended_by: b.endedBy ?? null,
      device: b.device ?? null,
    },
    { onConflict: 'user_id,client_id', ignoreDuplicates: true }
  );
  if (error) return fail(500, 'listen-failed');
  return json({ ok: true });
};

# Onda inside Wellness First: white-label player + chart-based programs

**Status:** Phase 1 (port) and Phase 2 (player on the site) done 2026-11-26, see `src/sound/PORTED_FROM.md` · **Date:** 2026-11-19 · **Updated:** 2026-11-26

### Decisions (2026-11-19)
- **No shared system.** Onda stays Onda: free, marketed separately, own repo, own Supabase, own users. Wellness First gets a **standalone white-label copy** of the player, which is a one-time port into this repo and evolves on its own from then on. No package, no runtime link and no shared accounts with Onda.
- **Player inside the site** as a React island. It's a tool people keep running in their browser **all day** (§3a).
- **Accounts:** Wellness First accounts only. Birth details saved to the account with consent and versioning (§5.1).
- **Program building:** as in §5 (signals → rulebook → composer → frozen, saveable programs).
- Everything else (data model, endpoints, UI touchpoints, phases) as written below.

### Decisions (2026-11-26)
- **No Onda credit.** Working title for the player: **Wellness Waves** (may change later).
- **Rulebook sign-off:** Sascha signs off v1 of the chart → category mapping.
- **Daily set:** 3 slots per day (morning / midday / evening) for now, more later.
- **Personal programs are their own category in the player** (next to Onda's standard categories). Everything else works exactly as in Onda: the member picks a personal program, picks any soundscape and adjusts it as in Onda, and the personal frequencies play underneath. The player never switches programs on its own (no automatic day schedule); the sleep timer stays optional, as in Onda.
- **Program names:** templates only.
- **No program lengths.** Personal programs play exactly like Onda programs: they run continuously, cycling through their frequencies while the soundscape plays on top. A personal program is just a different frequency list under the same sound. Only the per-frequency step time is set; there is no total duration. The sleep timer stays optional, as in Onda.
- **Free for now.** Personal programs are free until the paywall exists. The member system already exists (sign-up, email verification, password reset, My Wellness Space, Resend mailer), so no new auth needs building. Proposed: anyone can hear today's personal programs from browser-stored birth details without an account; saving programs and the "My programs" library need a free account.
- **Licence note:** internal only, nothing on the website.

Still open: final player name (Wellness Waves is the working title). See §10.

## 1. Goal

- Wellness First gets the Onda player in its own look (navy, sage, cream; Newsreader + Inter), with the same soundscapes and standard frequency programs as Onda for every visitor.
- Signed-in members who have saved a birth chart also get **personal programs**: frequency programs put together on the server from their chart. Some support their **challenges**, some build on their **strengths**, and some fit **today**.
- Every personal program has a name, a description and an exact list of frequencies. It is stored on the server and can be **saved and replayed later**, unchanged, even after the daily reading has moved on.

## 2. What exists today

| | Onda (`~/IC Europe SIA/Infinity Sound Web App`) | Wellness First (this repo) |
|---|---|---|
| Stack | React 18 + Vite SPA, Web Audio, zod | Astro 6 (SSR on Cloudflare), Tailwind 4 |
| Data | Supabase `wxindakutxylksuiurfo`, tables `onda_*` | Supabase `ernnivcfkxyejltxsbrn`, member system |
| Programs | 105-program catalog (`src/domain/programs/catalog.generated.json`, 10 categories), adaptation policy, so catalog value → render plan (`adaptationPolicy.ts`), separate audio bus (`audio/frequency/layer.ts`), 4–7 curated pairings per space (`curated.ts`) | — |
| Chart | — | Deterministic engine `src/lib/astro-engine/*`, plain-English layer (`astro-insights.ts`, `astro-today.ts`, `astro-reading.ts`). Birth data lives **only in localStorage** (`wfg_astro_profiles`) |
| Embed | `/embed` iframe widget + postMessage SDK (small 140 px bar) | — |

Constraints we must keep:
- Onda's honesty rules: frequencies come **only from the catalog**, and no medical, PEMF or outcome claims. Wording must come from `docs/frequency-integration/research/claims-register.md`. The same rules apply to the Wellness First tone: timing and pacing, not fate.
- The chart engine needs no LLM. Programs should be **deterministic** too: the same chart, date and rule version always give the same program.

## 3. Architecture: a standalone white-label copy inside this repo

**Decided:** no shared package, no iframe. The Onda code is **copied once** into this repo and from then on belongs to Wellness First. Onda is never imported, linked or called at runtime.

1. **One-time port** from the Onda repo (snapshot the commit hash in `src/sound/PORTED_FROM.md` for reference only):
   - Engine, no UI: `audio/` (engine, ambient, frequency layer, psychoacoustic modes), `domain/programs/` (catalog JSON + sha, types, adaptation policy, curated), `recipes/`, `personalization/`, `sessions/clock.ts`, `lib/rng.ts`. Goes into `src/sound/engine/`.
   - Player UI: ring/scene, immersive player, mini player, program sheet, timer, Feel pad. Goes into `src/sound/player/`.
   - **Leave out:** Studio, lab, listening test, admin, embed, video/shorts/thumbnail renderers, Onda auth/sync, Onda analytics/referrals, Onda SEO pages, the Onda wordmark and copy.
   - Rename every `onda`/`infinity-sound` identifier, storage key, event name and asset to Wellness First names. Player name: "Wellness Waves" (working title; keep it in one constant so it is easy to change).
   - Port the engine's tests too (offline DSP renders, schema, determinism) so the copy stays verified on its own.
2. **New here:** `src/sound/engine/compose/` (§5.4) and a small `host.ts`. It's the only place the player talks to Wellness First (Supabase session, `/api/sound/*`, storage, analytics), so the player UI never imports Supabase directly.
3. **Mounting:** add `@astrojs/react`; the player is a React island. Enable Astro's `<ClientRouter />` site-wide and give the player shell `transition:persist`, so **audio never stops while people browse**. Check pages that set `data-astro-reload` and full-page form posts (login, checkout), since those would cut the audio.
4. **Theme:** Onda's "no cream/beige" rule is an Onda brand rule and doesn't apply here. Keep the *structure* (living scene, ring, sheets, transport). Rebuild the tokens in Wellness First CI: deep navy scene `#0B2738`, sage accent `#8FA295`, cream `#F7F5F0` light sheets, Newsreader headlines, Inter UI. Tokens go in the existing Tailwind/CSS variable setup so the player and the site share one source.
5. **Independence:** fixes or new soundscapes in Onda are **not** pulled in automatically. If something is wanted later, it's copied deliberately.

### 3a. All-day use in the browser
The player should feel like something you leave on from morning to evening.

- **Persistent across the site:** the mini player is pinned (same idea as the floating pill nav) and survives navigation through `transition:persist`. The full player opens as a sheet over any page.
- **Dedicated tab option:** `/sound` also works as a full-screen "room" page, for people who keep it in its own tab or pinned tab. Installable as a PWA (manifest, icons, offline after first load), so it can run as its own window.
- **No automatic day schedule (decided 2026-11-26):** the player plays what the member picked until they change it. The 3 Today slots appear in the personal-programs category, with the current slot highlighted.
- **Long-running robustness:**
  - Resume the `AudioContext` after the browser suspends it (tab hidden, Bluetooth device change, sleep/wake).
  - Media Session controls (lock screen, keyboard media keys).
  - Watch memory and scheduler drift over 8–12 h. Add a soak test: an offline render plus a real-browser run of several hours.
  - Gentle volume reminders, timers optional rather than forced.
  - No autoplay on load: one tap to start, then it stays on.
- **Multiple tabs:** only one tab plays at a time (BroadcastChannel). Opening a second tab hands over or shows "playing in another tab".
- **Listening log** counts real listening time per program in chunks, so a day-long session isn't lost if the tab is closed.

## 4. Accounts and data ownership

- Wellness First members sign in with **Wellness First Supabase only**. There is no link to Onda's project or users.
- Per-user player state (favourites, recents, Sound DNA, feel, program preferences) is stored in a Wellness First table through `host.ts`.
- The catalog JSON (with its version and sha256) lives in `src/sound/engine/`. The server endpoints import the same file, so server-made programs and client playback always use one catalog version.

## 5. Personal programs: the pipeline

```
birth profile ──► chart (engine, server) ──► signals ──► rulebook ──► composer ──► sound_programs row ──► player
   (DB)            deterministic            needs vector   versioned    catalog values    frozen snapshot      plays plan
```

### 5.1 Birth profile on the server (new)
Life Rhythm currently keeps birth data in the browser. Members get an "Save to my account" option. New table `astro_profiles`: `id, user_id, label ('Me', partner, …), birth_date, birth_time, time_unknown, place_name, lat, lon, tz, ayanamsa, is_primary, version, created_at`.
- Editing birth data creates a **new version**. Programs made from the old version keep pointing at it and stay playable.
- This is personal data: explicit consent at save, RLS owner-only, delete-with-account, and an update to the privacy policy.

### 5.2 Signals: the chart as a "needs vector"
A new module, `src/lib/sound/signals.ts`, runs the existing engine and outputs plain, typed numbers. It has no copy and no audio. There are three time layers:

| Layer | Changes | Comes from (existing code) |
|---|---|---|
| **Natal**: strengths and challenges | Never | `allAreas`, `areaExtremes`, `planetCondition`, `naturalStrengths`, `healthFindings` |
| **Chapter**: current period | Every few weeks to months | `phaseBrief`, `chapterInsight`, `slowTransits` (Saturn pressure etc.) |
| **Day**: today | Daily (user's local date) | `dayInsight`, `weekAhead`, Moon nakshatra, `wellness/tempo.ts`, Choghadiya windows |

Output shape (example):
```ts
interface SoundSignals {
  profileId: string; profileVersion: number; date: string /* local YYYY-MM-DD */;
  // one weight per catalog category, split by purpose
  support:  Record<CatalogCategory, number>;   // 0–1, from challenges
  amplify:  Record<CatalogCategory, number>;   // 0–1, from strengths
  dayTempo: 'push' | 'steady' | 'soften' | 'rest';
  windows:  { slot: 'morning' | 'midday' | 'evening'; tempo: string }[];
  reasons:  { ruleId: string; layer: 'natal' | 'chapter' | 'day'; weight: number }[];
}
```

### 5.3 The rulebook: chart → catalog categories (authored, versioned)
`src/lib/sound/rulebook.ts`, `RULEBOOK_VERSION = '1.0.0'`. It is built the same way as Onda's `adaptationPolicy.ts`: explicit, reviewable, every rule has an id and a plain-English reason. **You, or the astrologer, sign off on v1.** Illustrative draft only:

| Chart condition | Catalog category | Use |
|---|---|---|
| Moon low / 4th area low | Emotional Balance | support |
| 12th area low, or day tempo `rest` | Sleep & Night Recovery | support |
| Saturn pressure (Sade Sati, slow transit) | Relaxation & Stress Balance, Daily Balance & Preventive Care | support |
| Mercury low | Mental Focus & Clarity | support |
| Mars or Sun low / 1st area low | Energy & Vitality | support |
| 6th area low | Physical Ease & Recovery | support |
| Mars strong | Movement & Activity Support | amplify |
| Mercury strong | Mental Focus & Clarity | amplify |
| Ketu/12th emphasis, Jupiter strong | Mindfulness & Inner Awareness | amplify |
| Day tempo `push` / `soften` | picks the soundscape space: Focus / Unwind | — |

Copy for each rule (the plain "why") lives next to the rule and is checked against the claims register.

### 5.4 Composer: building the exact program (lives in `src/sound/engine/compose/`)
Input: signals + rulebook + catalog. Output: a **composition**, which is an ordered list of phases. Each phase uses frequency values taken **only from catalog programs**:

```ts
interface Composition {
  schema: 'onda/composition@1';
  intent: 'focus' | 'relax' | 'sleep' | 'meditate';
  recipeId: string;                 // suggested default soundscape; the member can pick any soundscape
  soundDna?: Partial<SoundDna>;     // optional hint, e.g. warmer for 'soften'
  phases: {
    role: 'arrive' | 'support' | 'amplify' | 'integrate';
    sourceProgramId: string;        // e.g. 'rela_004'
    frequencyIndices: number[];     // which catalog values, in order
    stepSeconds: number;            // policy-bounded (20–300 s)
  }[];
  totalSeconds: number;
  versions: { catalog: string; catalogSha: string; policy: string; rulebook: string; composer: string };
}
```
- Selection is deterministic. A seeded RNG (`lib/rng.ts`) uses `hash(userId, date, slot)`, so ties break the same way every time.
- The same band filtering as `curated.ts` applies: Sleep keeps values ≤ 4 Hz, Focus keeps 4–40 Hz, and so on. Values outside the band are dropped.
- New engine function `planForComposition(c) → RenderPlan`. It concatenates the phases through the existing `planFor` policy, adds `sourceProgramId` to each `PlanStep`, and leaves `FrequencyLayer` unchanged.
- **No total length (decided 2026-11-26):** like Onda, a composition loops continuously: when the last phase ends, it cycles back to the first, with the soundscape playing throughout. `totalSeconds` is one cycle, used only for display and listen logging. The soundscape is independent: the member chooses and adjusts it as in Onda, and the composition only decides the frequencies underneath.

### 5.5 Name and description
These are **template-based and deterministic**, with no LLM, matching the zero-LLM engine and keeping the claims safe.
- Name = space + purpose + flavour: *"Steady Morning: settle, then focus"*, *"Evening Soften"*, *"Your Strength: Clear Mind"*.
- Description = 2–3 sentences built from the top `reasons`, written in Life Rhythm Simple-view language: *"Today asks for a slower start. This program settles first, then brings in a steadier pulse for focused work."* There are no planet names in Simple view.
- Pro view adds the exact numbers: catalog programs used, every frequency in order, step length, and the rule ids that fired.
- Template names only (decided 2026-11-26). No hand-written names.

### 5.6 What a member sees (program set)
| Set | Valid for | Regenerated when |
|---|---|---|
| **Today**: up to 3 slots (morning / midday / evening) | The local date | First open each day (lazy), or by cron later |
| **This chapter** | Until the current period ends | The period changes |
| **Your strengths** (1–2) and **Your challenges** (1–2) | Indefinitely | Birth profile edited, or new rulebook version |
| **Saved** | Forever | Never. These are frozen copies |

## 6. Database (Wellness First Supabase, new migration)

```sql
astro_profiles      -- §5.1, RLS owner-only
sound_signals       -- (user_id, profile_id, profile_version, local_date) UNIQUE; signals jsonb; versions jsonb
sound_programs      -- the generated, immutable programs
  id uuid pk, user_id uuid null (null = standard/global), profile_id, profile_version,
  kind text check (kind in ('standard','today','chapter','strength','challenge')),
  slot text null, valid_from date, valid_to date null,
  name text, description text, description_pro text,
  intent text, recipe_id text,
  composition jsonb,           -- §5.4, the exact frequencies
  reasons jsonb,               -- rule ids + weights (the "why")
  versions jsonb,              -- catalog/policy/rulebook/composer
  content_hash text,           -- hash(composition): de-dupes identical programs
  created_at timestamptz
sound_program_saves -- (user_id, program_id) pk, label text, note text, saved_at
sound_listens       -- program_id, recipe_id, started_at, seconds, completed (port of onda_listening_sessions)
sound_user_state    -- favourites, recents, Sound DNA, feel, prefs (port of onda_user_state)
```
- `sound_programs` rows are **never updated**. Saving only adds a row to `sound_program_saves`, which is why a saved program sounds the same a year later.
- Old unsaved daily programs can be pruned after N days (retention job). Saved programs and programs with listens are kept.
- Standard programs (the curated Onda pairings) are inserted as `user_id = null, kind = 'standard'`, so every program is played the same way. They can also stay in code. Either works.

## 7. Server endpoints (Astro SSR on Cloudflare, `src/pages/api/sound/*`, `prerender = false`)

| Endpoint | Does |
|---|---|
| `GET /api/sound/programs?set=today` | Returns today's programs. If the `(user, local date)` row is missing, it computes signals, composes, inserts, and returns. Idempotent through the UNIQUE key |
| `GET /api/sound/programs?set=chapter|strengths|challenges|saved` | Same, for the other sets |
| `GET /api/sound/program/:id` | One program + render-ready composition (owner or standard only) |
| `POST /api/sound/program/:id/save` · `DELETE …/save` | Save / unsave, with optional label |
| `POST /api/sound/listen` | Logs a listening session |
| `POST /api/astro/profile` | Saves or versions the birth profile (with consent flag) |

- The engine is pure TypeScript and computes in under 2 ms, so it runs inside the endpoint with no worker queue.
- The endpoints use the member's JWT with RLS for reads and saves. Program inserts use a server-only key, so clients can't make up programs.
- The member's timezone comes from the profile, or the browser sends it, so "today" means *their* day.
- **Later:** a Cloudflare Cron Trigger pre-builds tomorrow's set and sends "Your programs for today" by email or push.

## 8. Wellness First UI touchpoints

- `/sound`: the themed player. It shows the standard spaces for everyone. Members with a chart also get a "For you today" row above them.
- **Life Rhythm, Today tab:** "Listen to today's program" next to the day reading. It plays in the persistent mini player.
- **Life Rhythm, area tabs:** a strength or challenge card links to its program.
- **My Wellness Space:** a "My programs" library with saved programs, history, and each program's why. There's a Simple/Pro toggle, the same as Life Rhythm.
- **Without a chart:** a quiet invitation to add birth details, never a gate before the first listen. Onda's "no paywall/quiz before first listen" rule carries over.

## 9. Phases

| # | Phase | Main repo | Done when |
|---|---|---|---|
| 0 | Open decisions (§10), rulebook v1 sign-off | — | Answers + signed rule table |
| 1 | One-time port of engine + player into `src/sound/`, renamed, Onda-only parts left out, ported tests green | Wellness First | Tests pass; offline render matches Onda's for the same recipe |
| 2 | `/sound` + persistent mini player: React island, `<ClientRouter />`, Wellness First theme, standard programs, member state tables, all-day robustness (§3a) | Wellness First | Plays across page navigation and through a multi-hour soak; favourites sync to the Wellness First account |
| 3 | Birth profile to account (consent, versioning), Life Rhythm reads from account when signed in | Wellness First | Profile survives device change |
| 4 | Signals + rulebook + composer + `planForComposition` + tables + API | Wellness First | Same input gives the same program (golden tests); every value traces to a catalog row |
| 5 | Program UI: Today / chapter / strengths / challenges / saved, Simple and Pro "why" | Wellness First | Member can play, save and replay a frozen program |
| 6 | Cron pre-build, email/push, analytics (listens per kind), retention job | Wellness First | — |
| 7 (opt.) | Paid tier for personal programs (Paddle) | Wellness First | — |

**Tests to add:** determinism golden files (fixed chart + date → exact composition JSON), "every rendered Hz exists in the catalog", band rules per space, claims-register lint on all copy templates, and RLS tests (one member can't read another's programs).

## 10. Decisions

1. ~~Integration~~: standalone white-label copy, player inside the site.
2. **Branding:** no Onda credit. Working title **Wellness Waves**, may change later. Check trademarks before launch.
3. ~~Rulebook~~: Sascha signs off.
4. ~~Daily set size~~: 3 slots per day, more later.
5. ~~Program length~~: none. Programs loop continuously like Onda (§5.4).
6. ~~Access~~: free until the paywall. Saving needs a free account (existing member system).
7. ~~Naming~~: template names only.
8. ~~Licensing~~: internal note only, nothing on the website.

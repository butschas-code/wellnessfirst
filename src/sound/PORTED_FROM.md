# Wellness Waves: where this code came from

One-time copy of the Onda player (IC Europe SIA, `Infinity Sound Web App`), made on 2026-11-26.
From now on this code belongs to Wellness First and changes independently. Nothing is imported from,
linked to or synced with Onda. If something from Onda is wanted later, copy it over on purpose.

- **Source:** commit `979eb619f800f73aa7c438989b31df5232bda71f` plus the uncommitted working tree at copy time
  (Onda's 78 tests passed on that tree).
- **Plan:** `docs/ONDA_WHITE_LABEL_PLAN.md`.

## Layout

| Here | From Onda `src/` |
|---|---|
| `engine/audio/` | `audio/` (engine, ambient, frequency layer, wellness layer, background, buffer generators) |
| `engine/domain/` | `domain/programs/` (catalog JSON, adaptation policy, curated), `domain/wellness/` |
| `engine/recipes/`, `engine/personalization/`, `engine/types/` | same names |
| `engine/lib/` | `lib/rng.ts`, `lib/storage.ts`, `lib/logger.ts` |
| `engine/sessions/clock.ts` | `sessions/clock.ts` |
| `engine/state/syncState.ts` | `auth/syncState.ts` (pure merge logic only) |
| `player/` | `sessions/playerContext.tsx`, `components/MiniPlayer.tsx`, `features/{home,player,programs,library,explore,soundDna,wellness}`, `ui/` (minus brand), `content/explanations.ts`, `styles/` |
| `player/host.ts` | **new**: the only connection to Wellness First (listens, analytics). Replaces Onda's `auth/listening`, `analytics/funnel` and `analytics/referral` |
| `player/brand.ts` | **new**: player name (`Wellness Waves`, working title) |
| `tests/sound/` | `tests/` minus `listening` and `referral` |

**Left out:** App shell, Onda auth and sync, analytics and referrals, embed, Studio, Lab, listening test, admin,
legal/about/pricing/welcome/account pages, video and shorts renderers, SEO pages, the wordmark,
`wavExporter`, `continuousMaster`, `assetLoader`, `psychoacousticModes`, `artworkManifest`, `featureFlags`.

## Changes made during the copy

- Imports rewritten for the new layout. Type-only imports marked `import type` (the site uses `verbatimModuleSyntax`).
- Onda and Infinity names replaced: header comments, the logger tag (`[WW:…]`), storage prefix
  `wellness_waves_`, audio-direct flag `wellness_waves_audio_direct`, and visible "ONDA" labels (now `PLAYER_NAME`).
  "Infinity programs" is now "frequency programs".
- Partner-referral entry space removed from `HomePage`. `?space=` shortcuts still work.

**Kept on purpose** (they're internal values, not branding):
- The catalog schema literal `infinity-sound/canonical-program-catalog`. The catalog JSON and its sha256 depend on it.
- The RNG default seed `infinity-sound-seed`. Changing it would change every generated sound.

## Verified at copy time

- `npm run test:sound`: 70/70 passing.
- Offline renders of all 21 recipes, with and without a frequency program (`rela_001`), are **bit-identical**
  to Onda's when `Math.random` is seeded the same way. The noise generators use `Math.random`, so unseeded
  renders differ between any two runs, Onda's included.
- `src/sound` type-checks under the site's strict tsconfig.

## Phase 2 changes (2026-11-26)

- `styles/index.css` + `operate.css` were turned into `styles/waves.css` (every rule scoped under `.ww`,
  so nothing touches the site; Onda's cyan/ink swapped for navy, cream and sage; display type in Newsreader)
  plus `styles/theme.css` (tokens, per-space light, cream sheets, the `/sound` room).
- `ui/stage/palette.ts`: water and ring recoloured to match.
- `engine/audio/background.ts`: the media `<audio>` element now lives under `<html>`, not `<body>`, because
  soft navigation swaps `<body>`.
- Listening is logged in 15-minute chunks during long sessions (`ended_by = 'chunk'`).
- New: `WavesShell.tsx` (tiny persistent island) → `WavesPlayerRoot.tsx` (full player, lazy-loaded on first
  visit to `/sound`), `runtime/siteHost.ts` (Supabase sync + listening log), `runtime/singleTab.ts`,
  `runtime/longRun.ts`.

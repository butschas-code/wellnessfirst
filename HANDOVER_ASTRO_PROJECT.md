# Handover Document: Astronomical Timing Engine & UI

**Repository**: `wellnessfirstglobal.com`  
**Date**: November 17, 2026  
**Status**: Backend Engine 100% verified & passing (0 errors, deterministic, zero-LLM). Frontend UI functional but requires design overhaul / redesign to match Wellness First CI.

---

## 1. Executive Summary & Context

The goal of this feature is to deliver a **deterministic, client-side astronomical timing and personal diagnostics tool** for Wellness First Global.
- **Engine**: 100% mathematical physics (Jean Meeus astronomical algorithms, Swiss Ephemeris sidereal offsets Lahiri 23° 51'). **Zero generative LLM hallucination**. Calculations execute in <2ms locally in browser memory.
- **Problem to Solve**: The frontend UI is currently cluttered, feels like "AI slop", has technical jargon in regular views, inconsistent typography/spacing, and needs a **high-end, editorial, calm luxury product design** following Wellness First Global's brand identity.

---

## 2. File Map & Architecture

### A. Engine Backend (`src/lib/astro-engine/`)
Pure TypeScript library with zero external runtime dependencies:
- **`src/lib/astro-engine/core/`**:
  - `coordinates.ts`: Spherical trigonometry, obliquity of ecliptic, Julian centuries.
  - `ephemeris.ts`: Jean Meeus multi-body orbital mechanics (Sun, Moon, Mercury, Venus, Mars, Jupiter, Saturn, Rahu, Ketu).
  - `ayanamsha.ts`: Multi-ayanamsa sidereal offsets (Lahiri J2000 23.8571°, KP 23.7582°, Raman 22.4097°).
  - `ascendant.ts`: High-precision Ascendant and 12-house cusp computation.
  - `vargas.ts`: 16 Shodashvarga divisional harmonic charts (D1 Rashi through D60 Shashtiamsa).
  - `ashtakavarga.ts`: Classical 337-point Sarvashtakavarga (SAV) and Bhinnashtakavarga (BAV) resilience matrix.
  - `shadbala.ts`: Six-fold planetary strength algorithm (Sthana, Dig, Kala, Chesta, Naisargika, Drik).
- **`src/lib/astro-engine/predictive/`**:
  - `dashas.ts`: Vimshottari Dasha 120-year cycle (Mahadashas and Antardashas).
  - `transits.ts`: Real-time Gochara transits overlaid on natal chart with SAV point scoring and Saturn Sade Sati tracking.
  - `prashna.ts`: Horary astrology (exact time and place of asking) with Tajika aspects.
  - `qa-matrix.ts`: Deterministic Q&A matrix answering practical everyday user questions across 10 life domains without any LLM.
- **`src/lib/astro-engine/synastry/`**:
  - `ashtakoota.ts`: Classical 36-point relational compatibility.
  - `cross-chart.ts`: Planetary aspects and mutual Dasha resonance between two charts.
- **`src/lib/astro-engine/remedies/` & `wellness/`**:
  - `sphutas.ts`: Fertility / conception Beeja & Kshetra Sphuta.
  - `tempo-guidance.ts`: Clinical somatic pacing, chronobiology, and nervous system regulation.

### B. Frontend Page & Scripts
- **`src/pages/astro/index.astro`**:
  - Hero section + intake form (City geocoding via Open-Meteo, date, 12-hour AM/PM time picker, unknown time checkbox).
  - Interactive Dossier container (`#astro-results-container`).
  - View mode toggle (`#btn-view-standard` vs `#btn-view-pro`).
  - 10 Functional Tabs:
    1. `today`: Today's Guidance, What to Do/Avoid, Cycle Transition Radar, Travel Radar, Q&A Matrix search.
    2. `blueprint`: Archetype, Element Balance, 3 Pillars (Action/Sun/Saturn), Innate Strengths, Operational Guardrails, Daily Protocol.
    3. `timeline`: Current Chapter & Sprint Runway, 120-year Mahadasha timeline table.
    4. `career-wealth`: Financial capacity, peak pricing windows, investment seasons.
    5. `vitality-health`: Circadian rhythm, burnout vulnerability, somatic recovery.
    6. `daily-timing`: Choghadiya 24-hour hourly timing windows.
    7. `relationship`: Ashtakoota compatibility, cross-chart contacts, partner intake.
    8. `parenting`: Child's derived chart (Bhavat Bhavam), parenting dynamics.
    9. `decision`: Prashna timing engine for active decisions.
    10. `annual-forecast`: 4-quarter yearly forecast.
    11. `crisis-reset`: 4-step decompression protocol for high-stress transits.
  - Expandable Technical Reference Drawer (`#precision-drawer-wrapper`): Planetary coordinates table and 337-point Ashtakavarga matrix.
- **`src/scripts/astro-controller.ts`**:
  - Event listeners, client geocoding, form parsing, local storage caching (`wfg_astro_active_profile`).
  - Dynamic DOM population for all 11 tabs.
  - View mode logic: Standard (plain English, zero jargon) vs. Pro (planetary codes, degrees, nakshatras).
- **`src/lib/astro-icons.ts`**:
  - SVG iconography helper `getAstroIcon(name, classStr)`.
- **`tests/astro-engine.test.ts`**:
  - CLI test harness validating all 12 modules.

---

## 3. Brand & Design System Guidelines (Wellness First CI)

Wellness First Global (`wellnessfirstglobal.com`) uses a refined, quiet-luxury editorial wellness aesthetic:

- **Typography**:
  - Headlines: `font-display` (Newsreader serif, font-weight 400 or 500, generous leading). **Never use technical monospace or harsh geometric sans for primary titles.**
  - Body & UI: `font-sans` (Inter sans-serif, clean, high readability, tracking normal).
  - Numbers & Coordinates: Plain sans or `font-sans tabular-nums` (NOT ugly monospace, except in the Pro Ephemeris metadata strip).
- **Color Palette**:
  - `primary`: Deep Navy `#0B2738` (used for primary headers, authoritative buttons).
  - `secondary`: Sage Green `#8FA295` (used for subtle accents, supportive highlights, green lights).
  - `warm-cream`: `#F7F5F0` / `paper` `#FBF9F5` (used for soft backgrounds, card fills, alternating rows).
  - `line`: Subtle border `#E8E4DC` / `border-ink/10`.
  - `charcoal`: `#333333` / `ink` `#1A1A1A`.
- **Components & Classes**:
  - Containers: `container-wfg max-w-5xl`
  - Cards: `card-wfg`, `card-wfg-elevated`
  - Buttons: `btn-primary`, `btn-secondary`

---

## 4. Current Problems & User Feedback (What Claude Needs to Fix)

The user has explicitly stated:
> *"you cant design for shit! give me a handover doc so claude can pick it up"*
> *"the llok and feel of the whole astro tool still feels like undesign AI slop. give it a real product feel and use the welnness first CI"*
> *"dont know what the headline means. use everywhere plain english, people can understand, unimbigous and actionable. without making claims and promises."*
> *"such language is too technical: Venus Tactical Sub-Phase (Rahu Macro Era). We should have a pro view, where we give all these tehcnical infos.. but not in the regualr view"*

### Specific Design Flaws to Overhaul:
1. **Visual Hierarchy & Information Density**:
   - The results dashboard currently outputs a massive wall of cards and grids that feel overwhelming.
   - It needs whitespace, editorial pacing, clear typographic hierarchy, and visual relief (e.g., subtle dividers, curated highlights).
2. **Tab UI**:
   - 10 horizontally scrolling tabs (`astro-tab-btn`) can feel clunky on mobile and tablet.
   - Consider a cleaner grouping (e.g., Primary categories: `Today & Focus`, `Your Blueprint`, `Life Runway & Future`, `Specialized Tools (Partnership, Decisions, Health)`).
3. **Hero & Intake Form**:
   - The intake form is functional but looks like a generic web form. It should feel like a bespoke diagnostic consultation intake (calm, intentional, beautifully framed).
4. **Copy Tone**:
   - Must remain **plain English, unambiguous, and actionable**.
   - No pseudoscientific buzzwords (*"High-Torque Kinetic Engine"*, *"mesenteric autonomic circulation"*).
   - No astrological superstition or false deterministic claims ("you will suffer", "you will become rich"). Focus strictly on **timing, pacing, focus, and somatic recovery**.
5. **Simple View vs. Pro Technical View**:
   - Keep the toggle switch `[ Simple View | Pro Technical View ]` in the header banner.
   - In **Simple View**: Zero Sanskrit words, zero degree coordinates, zero planetary period codes (`Mahadasha`, `Antardasha`). Only plain English themes (*"Focus on Creative Work & Partnerships"*).
   - In **Pro View**: Expose the exact degrees, Nakshatras, house rulerships, and ephemeris tables for advanced users.

---

## 5. Verification Commands

Before and after making changes, run:
```bash
# 1. Type and lint checks (Astro + TypeScript)
npm run check

# 2. Mathematical engine verification test
node --experimental-strip-types tests/astro-engine.test.ts

# 3. Production build test
npm run build
```

---

## 6. Key State & Storage Details
- Primary user profile is persisted in `localStorage.getItem('wfg_astro_active_profile')`.
- Partner profile is persisted in `localStorage.getItem('wfg_astro_partner_profile')`.
- Demo profile can be triggered via `AstroDashboardController.prototype.loadDemoProfile()`.


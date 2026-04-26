# Image & art direction spec

WFG visual language: **premium editorial, bright, high-contrast** — image-led, textured but minimal, **no generic stock wellness** (no yoga-mat tropes, fake laughter, or “perfect morning routine” tableaus). East-meets-West shows up as **sensibility** (restraint, material honesty, light quality), not as symbolic props.

---

## 1) Where imagery is needed (audit)

| Area | Need | Rationale |
|------|------|-----------|
| **Homepage** | **Hero still** (optional) + **section break** | A single strong frame sets tone; additional strips separate long scroll without feeling like ads. |
| **Article covers** | **Per piece** (recommended for featured + list cards) | Cards and social/OGA read as a journal, not a wall of type. |
| **Webinar covers** | **Per session** | List + detail + event OG share; distinguishes sessions at a glance. |
| **Consultation pages** | **Per offer** (optional but ideal) | Humanizes private work; avoids “service brochure” flatness. |
| **Product pages** | **Hero + 1–2 context** (as available) | Objects on neutral surfaces, honest scale; gallery optional later. |
| **Community** | **One invitation frame** | Suggests room, season, and pace — not “community stock.” |
| **OG / share** | **Derivatives of hero/cover** | Use same crop family as detail hero where possible. |

**Low priority (text-first OK):** legal pages, short utility flows. **Newsletter** uses type-led OG unless you run a dedicated mail art template.

---

## 2) What belongs in each section (subject matter)

### Homepage

- **Hero (optional, wide):** single **still life or interior detail** — paper, wood, stone, soft daylight, a corner of a room, or a tool/object **without** product shouting. Suggests slowness and editorship.
- **“Next session” / calendar block:** same family as **webinar cover** (session identity).
- **Community band (if illustrated):** **gathering space** abstraction — table edge, chairs, lamplight, or season outside a window. No crowd stock.

### Article covers

- **Metaphorical / atmospheric**, not literal illustrations of the title.
- Favour: **material**, **landscape crop**, **architectural detail**, **hands + object** (only if it stays dignified, not “wellness hand models”).
- Match **column** mood where easy (e.g. place & signal → land/line; body & breath → air/light, not gym).

### Webinar covers

- **Event identity**: consistent **frame** (e.g. band, margin, or soft gradient) + **one focal subject** (object, book edge, room corner, or abstract texture).
- Readable at **small list thumbnail**; avoid tiny text in art.

### Consultation pages

- **Calm, adult, spatial**: door light, plan sketch, site line, **instrument (if any)** in context, or abstract earth/light.
- **Not** “therapy couch stock” or clinical sterility.

### Product pages

- **Hero:** product on **linen, stone, oiled wood, or paper**; single clear light direction; show **scale** (hand, ruler, or familiar object) where helpful.
- **Secondary (future):** detail macro, in-use in a real room (no show-home staging).

### Community

- **One** strong image: **room + season** or **small group implied** (empty chairs, table set) — stillness, not event hype.

---

## 3) Ratios & crops

| Use | Ratio | Notes |
|-----|--------|--------|
| **Detail hero** (article, webinar, product, consult) | **3 : 2** (default) or **16 : 9** for very wide stills | Full-bleed within `container-wfg`; cap height ~`min(50vh, 28rem)` on large screens. **Crop:** centre-weighted; keep focal point in **upper-middle** for 16:9. |
| **List / card (articles, products, consults)** | **3 : 2** | Safe for grids; one clear focal point. |
| **Webinar list thumbnail** | **4 : 5** or **1 : 1** | Legible in a sidebar; don’t place critical detail in corners. |
| **Homepage wide still** | **~21 : 9** to **16 : 9** | Cinematic; **crop:** keep horizon/line level or use vertical subject left-third. |
| **Open Graph** | **1.91 : 1** (1200×630) | Safe text margin if you overlay type later; keep subject clear of **bottom 20%** if stacking logo. |
| **Square (optional social)** | **1 : 1** | For campaigns only; not required for v1. |

**Cropping rules (all):**

- Prefer **tight** over **wide empty** — negative space should feel **intentional**, not like missing content.
- **No edge clutter** (cables, plastic, brand noise).
- **Warm white balance**; allow shadow (soft, single source).
- **Grain/texture in camera** is good; **heavy filters** (HDR, Teal-Orange) are out.

---

## 4) Visual tone (brief for photographers/AI)

- **Light:** window light, overcast, or single soft key. No ring-light glamour.
- **Palette:** align with site — ivory, sand, forest cast, quiet brass. Avoid saturated greens/blues and neon.
- **Texture:** paper, wood grain, stone, wool, unglazed ceramic — **not** stock bokeh, not glitter.
- **People:** if used, **real and brief** (hands, profile, back turned) — not smiling-at-salad.
- **Consistency:** one **colour grade** per season across covers helps cohesion.

---

## 5) Implementation (this repo)

- **`EditorialImageSlot`** (`src/components/media/EditorialImageSlot.astro`) — one component for **loaded assets** and **empty placeholders** (textured, minimal). Props: `ratio`, `frame` (`hero` | `card` | `thumb` | `inline`), `src`, `alt`, `showPlaceholderWhenEmpty`, `specNote` (subtle on-placeholder cue for producers), `heroVariant` (`article` | `webinar` | `product`) for detail hero **height caps**.
- **Content fields:** `coverImage` (articles, webinars, **consultations**), `image` (products) — paths under `/public` or full URLs, per `src/content.config.ts`.
- **Visible placeholders (production):** homepage-wide strip (`21:9`), next-session card on the homepage, journal index masthead, community masthead. **List/detail pages** show a hero or card **only when** `src` is set, except the homepage “next session” block which keeps a placeholder until a session cover is assigned.
- **Thumbnails:** webinar index rows show a **4:5** slot when `coverImage` is set. Article, product, and consultation cards show a **3:2** top band when a cover/hero is set in content.

---

## 6) Checklist before publishing an asset

- [ ] Reads at **thumbnail** size (for lists).
- [ ] **Alt text** is specific (not “image for article”).
- [ ] **OG** file under ~200 KB where possible (compress; WebP/AVIF via pipeline if you add one).
- [ ] **No watermarks** or stock logos visible.
- [ ] Crops feel **intentional** at 3:2 and 16:9 for the same file where shared.

---

## 7) What to avoid (explicit)

- Aerial beach yoga, laughing salad-eaters, generic meditation silhouettes, crystals as “spiritual wallpaper,” excessive succulents, “girlboss wellness,” or clinical hospital-white rooms with fake plants.
- **Insincere East Asian** props (random Buddha heads, red paper clichés) unless contextually true to the work.

This document pairs with the live placeholder frames on the homepage, journal index, and community page.

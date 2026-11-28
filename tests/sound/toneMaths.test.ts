/**
 * Tone maths of the day arcs (src/lib/sound/dayArc.ts), checked on hand-made
 * facts so each formula is tested on its own:
 *   chartPosition  u = frac(octavePosition + birth longitude / 360)
 *   blendInBand    circular, weighted mean of the voices' u, mapped as lo·(hi/lo)^u
 */
import { describe, expect, it } from 'vitest';
import { blendInBand, chartPosition, octavePosition, MOON_TODAY, type ArcFacts } from '../../src/lib/sound/dayArc';
import type { Planet } from '../../src/lib/sound/rulebook';

const PLANETS: Planet[] = ['Sun', 'Moon', 'Mars', 'Mercury', 'Jupiter', 'Venus', 'Saturn', 'Rahu', 'Ketu'];

/** Minimal facts: only birth longitudes and today's Moon matter to the tone maths. */
function facts(lon: Partial<Record<Planet, number>>, moonLon = 0): ArcFacts {
  const planets = Object.fromEntries(
    PLANETS.map((p) => [p, { level: 'average', strength: 1, house: 1, dignity: 'Neutral', retro: false, lon: lon[p] ?? 0 }])
  ) as ArcFacts['planets'];
  return { planets, today: { moonLon } } as unknown as ArcFacts;
}

/** Birth longitude that puts planet `p` at octave position `u`. */
const lonFor = (p: Planet, u: number) => ((((u - octavePosition(p)) * 360) % 360) + 360) % 360;

const LO = 12;
const HI = 15;
const at = (u: number) => LO * Math.pow(HI / LO, u);

describe('chartPosition', () => {
  it('turns the orbital tone by the birth degree, 360° = one octave', () => {
    const u0 = octavePosition('Mars');
    expect(chartPosition(facts({ Mars: 0 }), 'Mars')).toBeCloseTo(u0, 12);
    expect(chartPosition(facts({ Mars: 90 }), 'Mars')).toBeCloseTo((u0 + 0.25) % 1, 12);
    // A full turn comes back to the same tone.
    expect(chartPosition(facts({ Mars: 359.999999 }), 'Mars')).toBeCloseTo(u0, 6);
  });

  it("today's Moon uses today's degree, not the birth degree", () => {
    const f = facts({ Moon: 10 }, 200);
    expect(chartPosition(f, MOON_TODAY)).toBeCloseTo((octavePosition('Moon') + 200 / 360) % 1, 12);
    expect(chartPosition(f, 'Moon')).toBeCloseTo((octavePosition('Moon') + 10 / 360) % 1, 12);
  });
});

describe('blendInBand', () => {
  it('one voice maps its position onto the band as lo·(hi/lo)^u', () => {
    for (const u of [0, 0.1, 0.455, 0.5, 0.9]) {
      const f = facts({ Mars: lonFor('Mars', u) });
      expect(blendInBand(f, [{ source: 'Mars', weight: 1 }], LO, HI)).toBeCloseTo(at(u), 2);
    }
  });

  it('band ends: u = 0 gives lo, u just under 1 gives (almost) hi', () => {
    expect(blendInBand(facts({ Mars: lonFor('Mars', 0) }), [{ source: 'Mars', weight: 1 }], LO, HI)).toBeCloseTo(LO, 2);
    expect(blendInBand(facts({ Mars: lonFor('Mars', 0.9999) }), [{ source: 'Mars', weight: 1 }], LO, HI)).toBeCloseTo(HI, 2);
  });

  it('averages on the circle: 0.98 and 0.02 blend to the octave edge, not the middle', () => {
    const f = facts({ Mars: lonFor('Mars', 0.98), Venus: lonFor('Venus', 0.02) });
    const hz = blendInBand(f, [{ source: 'Mars', weight: 1 }, { source: 'Venus', weight: 1 }], LO, HI);
    // u = 0 (≡ 1): either band end, never the plain average 0.5.
    expect(Math.min(Math.abs(hz - LO), Math.abs(hz - HI))).toBeLessThan(0.02);
    expect(Math.abs(hz - at(0.5))).toBeGreaterThan(1);
  });

  it('weights pull the blend towards the heavier voice', () => {
    const f = facts({ Mars: lonFor('Mars', 0.2), Venus: lonFor('Venus', 0.4) });
    const even = blendInBand(f, [{ source: 'Mars', weight: 1 }, { source: 'Venus', weight: 1 }], LO, HI);
    const heavy = blendInBand(f, [{ source: 'Mars', weight: 3 }, { source: 'Venus', weight: 1 }], LO, HI);
    expect(even).toBeCloseTo(at(0.3), 2);
    expect(heavy).toBeLessThan(even);
    expect(heavy).toBeGreaterThan(at(0.2));
  });

  it('opposite voices of equal weight cancel, and the heaviest voice decides', () => {
    const f = facts({ Mars: lonFor('Mars', 0.1), Venus: lonFor('Venus', 0.6) });
    // Equal weights: resultant ≈ 0; sort is by weight, so give Venus a hair more.
    const hz = blendInBand(f, [{ source: 'Mars', weight: 1 }, { source: 'Venus', weight: 1 + 1e-9 }], LO, HI);
    expect(hz).toBeCloseTo(at(0.6), 2);
  });

  it('is octave-equivalent: a planet one full turn away gives the same rate', () => {
    const a = blendInBand(facts({ Saturn: 30 }), [{ source: 'Saturn', weight: 1 }], 4.5, 6.5);
    const b = blendInBand(facts({ Saturn: 30 + 359.9999999 }), [{ source: 'Saturn', weight: 1 }], 4.5, 6.5);
    expect(b).toBeCloseTo(a, 2);
  });
});

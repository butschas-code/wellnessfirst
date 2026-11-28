import { defineConfig } from 'vitest/config';

/** Wellness Waves engine tests (offline DSP renders, catalog, determinism) and astronomy reference checks. */
export default defineConfig({
  test: {
    include: ['tests/sound/**/*.test.ts', 'tests/astro/**/*.test.ts'],
    environment: 'node',
    testTimeout: 60_000,
  },
});

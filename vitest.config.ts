import { defineConfig } from 'vitest/config';

/** Wellness Waves engine tests (offline DSP renders, catalog, determinism). */
export default defineConfig({
  test: {
    include: ['tests/sound/**/*.test.ts'],
    environment: 'node',
    testTimeout: 60_000,
  },
});

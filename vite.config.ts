import { defineConfig } from 'vite';

// base './' makes the build work both locally and under /rush-hour-rigs/ on GitHub Pages.
export default defineConfig({
  base: './',
  server: { host: true },
  test: { include: ['src/**/*.test.ts'] },
});

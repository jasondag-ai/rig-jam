import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import type { Plugin } from 'vite';
import { defineConfig } from 'vitest/config';
import { hashOf, serviceWorkerSource } from './tools/service-worker.ts';

/** Every file under public/, as paths relative to it. */
function publicFiles(dir = 'public', root = dir): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? publicFiles(path, root) : [relative(root, path)];
  });
}

/** Writes dist/sw.js listing every built file, versioned by their content. */
function serviceWorker(): Plugin {
  return {
    name: 'rhr-service-worker',
    apply: 'build',
    generateBundle(_options, bundle) {
      const built = Object.keys(bundle).filter((f) => !f.endsWith('.map'));
      const pub = publicFiles().filter((f) => !f.endsWith('.DS_Store'));
      const fingerprint = [...built, ...pub.map((f) => `${f}:${hashOf(readFileSync(join('public', f), 'latin1'))}`)];
      this.emitFile({
        type: 'asset',
        fileName: 'sw.js',
        source: serviceWorkerSource([...built, ...pub], hashOf(fingerprint.join('|'))),
      });
    },
  };
}

// base './' makes the build work both locally and under /rush-hour-rigs/ on GitHub Pages.
export default defineConfig({
  base: './',
  server: { host: true },
  plugins: [serviceWorker()],
  test: { include: ['src/**/*.test.ts', 'tools/**/*.test.ts'] },
});

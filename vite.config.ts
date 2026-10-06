import { execSync } from 'node:child_process';
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

/** The app's version (package.json) and this build's id: the commit it was built from (the first 7 of its hash; 'dev' if there is none). */
const VERSION: string = JSON.parse(readFileSync('package.json', 'utf8')).version;
const BUILD: string = (() => {
  if (process.env.GITHUB_SHA) return process.env.GITHUB_SHA.slice(0, 7);
  try {
    return execSync('git rev-parse --short=7 HEAD', { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim() || 'dev';
  } catch {
    return 'dev';
  }
})();

/** Writes dist/sw.js listing every built file, versioned by their content, and dist/version.json (what an open copy checks to see if it is out of date: src/ui/update.ts). */
function serviceWorker(): Plugin {
  return {
    name: 'rhr-service-worker',
    apply: 'build',
    generateBundle(_options, bundle) {
      const built = Object.keys(bundle).filter((f) => !f.endsWith('.map'));
      // (Music is fetched only when the player turns it on, never ahead of time: it is not precached.)
      const pub = publicFiles().filter((f) => !f.endsWith('.DS_Store') && !f.startsWith('audio/music/'));
      const fingerprint = [...built, ...pub.map((f) => `${f}:${hashOf(readFileSync(join('public', f), 'latin1'))}`)];
      this.emitFile({ type: 'asset', fileName: 'version.json', source: JSON.stringify({ version: VERSION, build: BUILD }) });
      this.emitFile({
        type: 'asset',
        fileName: 'sw.js',
        // (The page, its script and its styles are the core: the install waits on those; the rest fills in.)
        source: serviceWorkerSource([...built, ...pub], hashOf(fingerprint.join('|')), [...built.filter((f) => /\.(js|css|html)$/.test(f)), 'index.html']),
      });
    },
  };
}

// base './' makes the build work both locally and under /rush-hour-rigs/ on GitHub Pages.
export default defineConfig({
  base: './',
  server: { host: true },
  define: { __APP_VERSION__: JSON.stringify(VERSION), __APP_BUILD__: JSON.stringify(BUILD) },
  plugins: [serviceWorker()],
  test: { include: ['src/**/*.test.ts', 'tools/**/*.test.ts'] },
});

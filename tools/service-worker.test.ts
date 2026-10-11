import { readFileSync, existsSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { hashOf, serviceWorkerSource, cachePrefix } from './service-worker.ts';

const pub = (p: string) => new URL(`../public/${p}`, import.meta.url);

describe('PWA', () => {
  it('has an installable manifest with icons that exist', () => {
    const m = JSON.parse(readFileSync(pub('manifest.webmanifest'), 'utf8'));
    expect(m).toMatchObject({ name: 'Rig Jam', start_url: './', scope: './', display: 'standalone' });
    const sizes = m.icons.map((i: { sizes: string }) => i.sizes);
    expect(sizes).toEqual(expect.arrayContaining(['192x192', '512x512']));
    for (const icon of m.icons) expect(existsSync(pub(icon.src))).toBe(true);
    expect(existsSync(pub('icons/apple-touch-icon-v2.png'))).toBe(true);
    // Versioned names, so a phone that cached the old icons fetches the new ones.
    for (const icon of m.icons) expect(icon.src).toMatch(/icon-v2-/);
  });

  it('links the manifest and iPhone home-screen icon from index.html', () => {
    const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
    expect(html).toContain('rel="manifest"');
    expect(html).toContain('rel="apple-touch-icon"');
    expect(html).toContain('apple-mobile-web-app-capable');
  });

  it("leaves the judges' guide to the browser: its page is never the game's offline copy, its video never cached", () => {
    const src = serviceWorkerSource(['index.html'], 'abc');
    const fetchPart = src.slice(src.indexOf("addEventListener('fetch'"));
    const guide = fetchPart.indexOf("if (url.href.startsWith(at('judges/'))) return;");
    expect(guide).toBeGreaterThan(0);
    // Before anything is answered from, or put into, the cache.
    expect(guide).toBeLessThan(fetchPart.indexOf('respondWith'));
    // The page is the COO's own, with its video and the game's cover as the poster; the video is small enough to stream.
    const html = readFileSync(pub('judges/index.html'), 'utf8');
    expect(html).toContain('<video src="how-to-play.mp4" poster="../cover.webp"');
    expect(existsSync(pub('cover.webp'))).toBe(true);
    const video = readFileSync(pub('judges/how-to-play.mp4'));
    expect(video.length).toBeLessThan(6 * 1024 * 1024);
    // Faststart: the index (moov) comes before the data (mdat), so it plays while it loads.
    expect(video.indexOf('moov')).toBeLessThan(video.indexOf('mdat'));
  });

  it('precaches the given files under a versioned cache', () => {
    const src = serviceWorkerSource(['index.html', 'assets/app.js'], 'abc');
    expect(src).toContain("const PREFIX = 'rhr-';");
    expect(src).toContain("const CACHE = PREFIX + 'g3-abc';");
    expect(src).toContain('["./","index.html","assets/app.js"]');
    expect(hashOf('a')).toBe(hashOf('a'));
    expect(hashOf('a')).not.toBe(hashOf('b'));
  });

  it('the dev copy keeps its own caches: live and dev share one origin, and neither worker may clear the other\'s', () => {
    const dev = serviceWorkerSource(['index.html'], 'abc', ['index.html'], 'dev');
    expect(dev).toContain("const PREFIX = 'next-rhr-';");
    // Each worker clears only what starts with its own prefix...
    expect(dev).toContain('k.startsWith(PREFIX) && k !== CACHE');
    // ...and the live worker's prefix does not match a dev cache's name (nor the other way round).
    expect(cachePrefix('dev').startsWith(cachePrefix('live'))).toBe(false);
    expect(cachePrefix('live').startsWith(cachePrefix('dev'))).toBe(false);
    expect(cachePrefix()).toBe('rhr-');
  });
});

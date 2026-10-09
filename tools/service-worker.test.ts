import { readFileSync, existsSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { hashOf, serviceWorkerSource } from './service-worker.ts';

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

  it('precaches the given files under a versioned cache', () => {
    const src = serviceWorkerSource(['index.html', 'assets/app.js'], 'abc');
    expect(src).toContain("const CACHE = 'rhr-g3-abc';");
    expect(src).toContain('["./","index.html","assets/app.js"]');
    expect(hashOf('a')).toBe(hashOf('a'));
    expect(hashOf('a')).not.toBe(hashOf('b'));
  });
});

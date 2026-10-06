import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { serviceWorkerSource } from '../../tools/service-worker.ts';
import { CHECK_MS, UPDATE_TEXT, fetchLive, isNewer, watchForUpdates } from './update.ts';
import { APP, versionText } from './version.ts';

describe('the version', () => {
  it('is set at build time and reads "Version x.y.z (build)"', () => {
    expect(APP.version).toMatch(/^\d+\.\d+\.\d+$/);
    expect(APP.build.length).toBeGreaterThan(0);
    expect(versionText({ version: '0.9.0', build: 'a1b2c3d' })).toBe('Version 0.9.0 (a1b2c3d)');
    expect(versionText()).toBe(`Version ${APP.version} (${APP.build})`);
  });
});

describe('knowing a new version is out', () => {
  it('a different build on the server is newer; the same build, or nonsense, is not', () => {
    const me = { build: 'aaaaaaa' };
    expect(isNewer(me, { version: '0.9.0', build: 'bbbbbbb' })).toBe(true);
    expect(isNewer(me, { version: '0.9.0', build: 'aaaaaaa' })).toBe(false);
    for (const junk of [null, undefined, {}, { build: '' }, { build: 7 }, 'bbbbbbb', []]) expect(isNewer(me, junk)).toBe(false);
  });

  it('asks the server past every cache, and takes "cannot reach it" quietly', async () => {
    const calls: [string, RequestInit | undefined][] = [];
    const ok = (async (url: string, init?: RequestInit) => { calls.push([url, init]); return { ok: true, json: async () => ({ build: 'x' }) }; }) as unknown as typeof fetch;
    expect(await fetchLive(ok)).toEqual({ build: 'x' });
    expect(calls[0][0]).toMatch(/^\.\/version\.json\?t=\d+$/);
    expect(calls[0][1]).toMatchObject({ cache: 'no-store' });
    expect(await fetchLive((async () => ({ ok: false })) as unknown as typeof fetch)).toBeNull();
    expect(await fetchLive((async () => { throw new Error('offline'); }) as unknown as typeof fetch)).toBeNull();
  });

  describe('watching', () => {
    beforeEach(() => vi.useFakeTimers());
    afterEach(() => vi.useRealTimers());
    const fakeDoc = () => {
      const listeners: (() => void)[] = [];
      return { doc: { visibilityState: 'visible', addEventListener: (_: string, f: () => void) => listeners.push(f), removeEventListener: (_: string, f: () => void) => listeners.splice(listeners.indexOf(f), 1) } as unknown as Document & { visibilityState: string }, front: () => listeners.forEach((f) => f()), count: () => listeners.length };
    };

    it('checks on opening, on coming back to the front and every 15 minutes, and says so ONCE', async () => {
      const d = fakeDoc();
      let build = 'aaaaaaa', asked = 0, told = 0;
      const stop = watchForUpdates(() => told++, { running: { build: 'aaaaaaa' }, live: async () => { asked++; return { build }; }, doc: d.doc });
      await vi.advanceTimersByTimeAsync(0);
      expect([asked, told]).toEqual([1, 0]);
      expect(CHECK_MS).toBe(15 * 60 * 1000);
      await vi.advanceTimersByTimeAsync(CHECK_MS);
      expect([asked, told]).toEqual([2, 0]);
      // A new build is deployed; the player comes back to the app.
      build = 'bbbbbbb';
      d.front();
      await vi.advanceTimersByTimeAsync(0);
      expect([asked, told]).toEqual([3, 1]);
      // Told once: no more asking, no second bar.
      d.front();
      await vi.advanceTimersByTimeAsync(CHECK_MS * 3);
      expect([asked, told]).toEqual([3, 1]);
      stop();
      expect(d.count()).toBe(0);
    });

    it('offline, or hidden in the background: nothing happens, and it tries again later', async () => {
      const d = fakeDoc();
      let live: unknown = null, told = 0;
      const stop = watchForUpdates(() => told++, { running: { build: 'aaaaaaa' }, live: async () => live, doc: d.doc });
      await vi.advanceTimersByTimeAsync(0);
      expect(told).toBe(0);
      (d.doc as { visibilityState: string }).visibilityState = 'hidden';
      live = { build: 'bbbbbbb' };
      d.front();
      await vi.advanceTimersByTimeAsync(0);
      expect(told).toBe(0);
      await vi.advanceTimersByTimeAsync(CHECK_MS);
      expect(told).toBe(1);
      stop();
    });

    it('once stopped it never speaks', async () => {
      const d = fakeDoc();
      let told = 0;
      const stop = watchForUpdates(() => told++, { running: { build: 'a' }, live: async () => ({ build: 'b' }), doc: d.doc, every: 1000 });
      stop();
      await vi.advanceTimersByTimeAsync(5000);
      expect(told).toBe(0);
    });
  });

  it('the bar says what Jay asked for', () => {
    expect(UPDATE_TEXT).toBe('New version, tap to update');
  });

  it('the service worker never answers version.json from its cache, nor keeps a copy of it', () => {
    const sw = serviceWorkerSource(['index.html', 'assets/app.js', 'version.json'], 'abc');
    expect(sw).toContain("pathname.endsWith('/version.json')) return;");
    expect(sw).toContain('"assets/app.js"');
    expect(sw).not.toContain('"version.json"');
    // Pages still load from the network first, so a reload brings the new version.
    expect(sw).toContain("req.mode === 'navigate'");
  });
});

// UPDATES (Job O): when a new version is deployed, a copy that is open or installed shows a small
// bar, "New version, tap to update", and reloads on a tap. It never reloads by itself, and a
// reload never touches saved progress (that is in localStorage, which a reload leaves alone).
//
// How it knows: the build writes `version.json` (its version and build id) next to the app, and
// the service worker never answers that file from its cache. The running copy asks for it when it
// opens, each time it comes back to the front, and every `CHECK_MS` while open; a build id that is
// not its own means a newer one is live. (A new service worker taking over the page says the same.)
import { APP } from './version.ts';

export const CHECK_MS = 15 * 60 * 1000;
export const UPDATE_TEXT = 'New version, tap to update';

/** Is what the server now has a different build from the one running? (Nonsense, or the same build: no.) */
export function isNewer(running: { build: string }, live: unknown): boolean {
  const build = (live as { build?: unknown } | null)?.build;
  return typeof build === 'string' && build !== '' && build !== running.build;
}

/** Asks the server what is live. Null if it cannot be reached (offline: no bar, try again later). */
export async function fetchLive(fetcher: typeof fetch = fetch): Promise<unknown> {
  try {
    const res = await fetcher(`./version.json?t=${Date.now()}`, { cache: 'no-store' });
    return res.ok ? await res.json() : null;
  } catch {
    return null;
  }
}

/**
 * Watches for a new version: checks now, whenever the page comes back to the front, and every
 * `CHECK_MS`; calls `onNew` once, the first time a different build is live. Returns a stop function.
 */
export function watchForUpdates(onNew: () => void, opts: { running?: { build: string }; live?: () => Promise<unknown>; doc?: Document; every?: number } = {}): () => void {
  const running = opts.running ?? APP, live = opts.live ?? (() => fetchLive()), doc = opts.doc ?? document;
  let told = false, stopped = false;
  const check = async (): Promise<void> => {
    if (told || stopped) return;
    if (isNewer(running, await live()) && !told && !stopped) {
      told = true;
      onNew();
    }
  };
  const front = (): void => { if (doc.visibilityState === 'visible') void check(); };
  doc.addEventListener('visibilitychange', front);
  const timer = setInterval(() => void check(), opts.every ?? CHECK_MS);
  void check();
  return () => {
    stopped = true;
    clearInterval(timer);
    doc.removeEventListener('visibilitychange', front);
  };
}

/**
 * The bar: one full-width button at the top of the screen. It keeps out of the way while a level is
 * being played (style.css hides it over the game screen; it is there again on the level list).
 * A tap reloads the page, which loads the new version; progress is untouched.
 */
export function showUpdateBar(reload: () => void = () => location.reload()): HTMLElement {
  const old = document.querySelector<HTMLElement>('.update-bar');
  if (old) return old;
  const bar = document.createElement('button');
  bar.type = 'button';
  bar.className = 'update-bar';
  bar.textContent = UPDATE_TEXT;
  bar.addEventListener('click', () => {
    bar.disabled = true;
    bar.textContent = 'Updating…';
    reload();
  });
  document.body.append(bar);
  return bar;
}

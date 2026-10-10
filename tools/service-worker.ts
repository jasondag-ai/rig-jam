// Builds the service worker source at build time (see vite.config.ts). It precaches every built
// file so the game works offline after the first visit. Pages load network-first so updates
// arrive when online; everything else is served from the cache first.

/** Short stable hash, used to version the cache. */
export function hashOf(text: string): string {
  let h = 5381;
  for (let i = 0; i < text.length; i++) h = (Math.imul(h, 33) ^ text.charCodeAt(i)) >>> 0;
  return h.toString(36);
}

/**
 * The cache's generation. The name already changes with every build (it carries a hash of the
 * built files), so a phone drops the old build by itself; bump this to force every phone to throw
 * its whole cache away whatever the files look like.
 */
export const CACHE_GENERATION = 'g3';

/** Files are fetched this many at a time when the cache is filled, and a file that fails is tried this many times. */
export const PRECACHE_BATCH = 6;
export const PRECACHE_TRIES = 3;

/**
 * The worker's source. `core`: the files the game cannot start without (the page, its script and
 * its styles); `rest`: everything else (sprites, sounds, icons, fonts).
 *
 * EVERY PATH IS RELATIVE TO THE WORKER'S OWN ADDRESS (`self.registration.scope`), so the same
 * worker serves the site at `/` and under `/rig-jam/` on GitHub Pages.
 *
 * THE INSTALL CANNOT BE SUNK BY ONE BAD FETCH. (It used to ask for all two hundred files at once
 * with `cache.addAll`, which fails as a whole if any one of them fails: on a slow line or a host
 * that turns a burst away, the worker never installed, "load failed", and nothing worked offline.)
 * Now the core is fetched first; the rest in small batches, each file retried; a file that still
 * will not come is left for later (it is cached the first time the game asks for it).
 *
 * THE DEV COPY KEEPS ITS OWN CACHES (`channel` 'dev'; `cachePrefix`). The live game (/rig-jam/) and the dev lane's
 * copy (/rig-jam-next/) are on ONE web origin, and an origin's caches are shared: a worker that, on taking over,
 * deletes every cache named `rhr-*` but its own would wipe the other site's offline copy. So the dev copy's caches
 * are named `next-rhr-*`: the live worker (which clears `rhr-*`) never sees them, and the dev worker clears only its own.
 */
export const cachePrefix = (channel: 'live' | 'dev' = 'live'): string => (channel === 'dev' ? 'next-rhr-' : 'rhr-');
export function serviceWorkerSource(files: string[], version: string, core: string[] = files, channel: 'live' | 'dev' = 'live'): string {
  const all = files.filter((f) => f !== 'version.json');
  const first = ['./', ...all.filter((f) => core.includes(f))];
  const rest = all.filter((f) => !core.includes(f));
  return `// Generated at build time. Do not edit.
const PREFIX = '${cachePrefix(channel)}';
const CACHE = PREFIX + '${CACHE_GENERATION}-${version}';
const SCOPE = self.registration.scope;
const at = (path) => new URL(path, SCOPE).href;
const CORE = ${JSON.stringify(first)};
const REST = ${JSON.stringify(rest)};

async function keep(cache, path) {
  for (let i = 0; i < ${PRECACHE_TRIES}; i++) {
    try {
      const res = await fetch(at(path), { cache: 'no-cache' });
      if (res.ok) { await cache.put(at(path), res); return true; }
    } catch (e) { /* try again */ }
    await new Promise((r) => setTimeout(r, 400 * (i + 1)));
  }
  return false;
}
async function fill(cache, paths) {
  let missed = 0;
  for (let i = 0; i < paths.length; i += ${PRECACHE_BATCH}) {
    const got = await Promise.all(paths.slice(i, i + ${PRECACHE_BATCH}).map((p) => keep(cache, p)));
    missed += got.filter((ok) => !ok).length;
  }
  return missed;
}

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    // The game itself must be in: without it there is nothing to show offline.
    if (await fill(cache, CORE)) throw new Error('the page or its script could not be fetched');
    // Everything else: as much as will come now; the rest when it is first asked for.
    await fill(cache, REST);
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith(PREFIX) && k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  const url = new URL(req.url);
  if (req.method !== 'GET' || url.origin !== self.location.origin || !url.href.startsWith(SCOPE)) return;
  // What version is live is always asked of the network (an open copy uses it to see it is out of date).
  if (url.pathname.endsWith('/version.json')) return;
  if (req.mode === 'navigate') {
    // Pages: the network first (so a reload brings the new version), the cached page when there is none.
    event.respondWith((async () => {
      try {
        const res = await fetch(req);
        if (res.ok) { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(at('./'), copy)); return res; }
        return (await caches.match(at('./'))) || res;
      } catch (e) {
        return (await caches.match(at('./'))) || Response.error();
      }
    })());
    return;
  }
  // Everything else: the cache first; what is not in it yet is fetched, and kept for next time.
  event.respondWith((async () => {
    const hit = await caches.match(req, { ignoreSearch: true });
    if (hit) return hit;
    try {
      const res = await fetch(req);
      if (res.ok && res.status === 200) { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(req, copy)); }
      return res;
    } catch (e) {
      return Response.error();
    }
  })());
});
`;
}

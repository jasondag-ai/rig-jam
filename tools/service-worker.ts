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

export function serviceWorkerSource(files: string[], version: string): string {
  return `// Generated at build time. Do not edit.
const CACHE = 'rhr-${CACHE_GENERATION}-${version}';
const FILES = ${JSON.stringify(['./', ...files])};

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((c) => c.addAll(FILES)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith('rhr-') && k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return;
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put('./', copy));
          return res;
        })
        .catch(() => caches.match('./')),
    );
    return;
  }
  event.respondWith(caches.match(req, { ignoreSearch: true }).then((hit) => hit || fetch(req)));
});
`;
}

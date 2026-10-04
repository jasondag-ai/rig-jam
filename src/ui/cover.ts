// The title screen: the roughneck hero image fills the phone, "RUSH HOUR RIGS" slams down into the
// sky with a bounce and a puff of dust, the image slowly pushes in, clouds drift, "TAP TO START"
// pulses. One tap anywhere goes to the level list. Shown once per app open, never between levels.
// If the image isn't in within IMAGE_WAIT_MS, the title shows over a sky gradient instead (the
// image fades in if it turns up later). Reduced motion: everything still, no slam, no pulse.
import { onTap } from './tap.ts';

export const COVER_IMAGE = './cover.webp';
export const IMAGE_WAIT_MS = 1000;

/**
 * Whether this open of the app starts on the cover: yes, unless it's a ?gag= preview link, or an
 * automated test (which opts back in with ?cover=1).
 */
export function shouldShowCover(search: string, webdriver: boolean): boolean {
  const q = new URLSearchParams(search);
  if (q.get('cover') === '1') return true;
  if (q.get('cover') === '0' || q.has('gag')) return false;
  return !webdriver;
}

// A soft painted cloud, to sit with the ones in the hero image's own sky: rounded puffs with no
// outline, a pale blue underside like the image's clouds, and blurred edges.
const CLOUD = (id: string) =>
  `<svg viewBox="-10 -10 140 70" aria-hidden="true"><defs>` +
  `<filter id="cs-${id}" x="-20%" y="-30%" width="140%" height="160%"><feGaussianBlur stdDeviation="2.6"/></filter>` +
  `<linearGradient id="cg-${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0.45" stop-color="#fff"/><stop offset="1" stop-color="#c9dcf3"/></linearGradient></defs>` +
  `<g filter="url(#cs-${id})" fill="url(#cg-${id})"><ellipse cx="60" cy="36" rx="50" ry="10"/><circle cx="34" cy="30" r="13"/><circle cx="54" cy="21" r="17"/><circle cx="76" cy="25" r="14"/><circle cx="93" cy="32" r="10"/><circle cx="20" cy="35" r="8"/></g></svg>`;

/** Puts the cover on screen; `onStart` runs on the first tap (once). Returns the screen element. */
export function showCover(app: HTMLElement, onStart: () => void): HTMLElement {
  const screen = document.createElement('div');
  screen.className = 'screen cover loading';
  screen.innerHTML = `
    <div class="cover-sky" aria-hidden="true"></div>
    <img class="cover-img" alt="" src="${COVER_IMAGE}" decoding="async" fetchpriority="high" />
    <div class="cover-cloud c1" aria-hidden="true">${CLOUD('a')}</div>
    <div class="cover-cloud c2" aria-hidden="true">${CLOUD('b')}</div>
    <h1 class="cover-title"><span>RUSH HOUR</span><span>RIGS</span></h1>
    <div class="cover-dust" aria-hidden="true">${'<i></i>'.repeat(7)}</div>
    <button class="cover-tap" aria-label="Tap to start"><span class="cover-start">TAP TO START</span></button>`;
  const img = screen.querySelector<HTMLImageElement>('.cover-img')!;
  const shown = () => {
    screen.classList.remove('loading', 'no-image');
    screen.classList.add('image');
  };
  if (img.complete && img.naturalWidth) shown();
  else {
    img.addEventListener('load', shown, { once: true });
    // Never hold the game up: after a second, carry on over a plain sky.
    setTimeout(() => {
      if (!screen.classList.contains('image')) screen.classList.replace('loading', 'no-image');
    }, IMAGE_WAIT_MS);
  }
  let started = false;
  onTap(screen, '.cover-tap', () => {
    if (started) return;
    started = true;
    onStart();
  });
  app.replaceChildren(screen);
  return screen;
}

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

const CLOUD = `<svg viewBox="0 0 120 50" aria-hidden="true"><path d="M14 44 Q2 44 4 34 Q6 24 18 26 Q20 12 36 13 Q44 2 60 6 Q74 0 82 14 Q98 10 102 24 Q118 24 116 36 Q114 46 100 44 Z" fill="#fff"/><path d="M14 44 Q40 38 60 42 Q84 46 100 44" fill="none" stroke="#dbe9f7" stroke-width="5" stroke-linecap="round"/></svg>`;

/** Puts the cover on screen; `onStart` runs on the first tap (once). Returns the screen element. */
export function showCover(app: HTMLElement, onStart: () => void): HTMLElement {
  const screen = document.createElement('div');
  screen.className = 'screen cover loading';
  screen.innerHTML = `
    <div class="cover-sky" aria-hidden="true"></div>
    <img class="cover-img" alt="" src="${COVER_IMAGE}" decoding="async" fetchpriority="high" />
    <div class="cover-cloud c1" aria-hidden="true">${CLOUD}</div>
    <div class="cover-cloud c2" aria-hidden="true">${CLOUD}</div>
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

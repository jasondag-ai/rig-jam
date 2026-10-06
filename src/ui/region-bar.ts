// The region bar on the level list: ONE row of full-size tabs that the player swipes left and
// right (Jay, Oct 6), so regions can keep being added without shrinking anything. Native momentum
// scrolling with a snap at each tab and no scrollbar (style.css "Region bar"); two and a third
// tabs show, so the next one always peeks in at the right edge; an edge fades where there is more
// that way. Pure helpers first (tested), then the small piece that runs on the page.
import { regionOpen, type RegionLike } from './unlocks.ts';

/** How many tabs show at once: two whole ones and about a third of the next (the peek). */
export const TABS_IN_VIEW = 2.34;

/** A tab is never squeezed narrower than this (px): the width "Mannville" and its hard hats need at full size. */
export const TAB_MIN = 96;
/**
 * Do ALL the tabs fit side by side at full size (a desktop window)? Then they are all shown, with
 * no swipe. On a phone they never do, and the bar stays a swipeable strip. `viewW` is the strip's
 * width on screen, `gap` the space between tabs, `pad` the strip's padding each side.
 */
export const allFit = (count: number, viewW: number, gap = 6, pad = 5): boolean => count > 0 && viewW >= count * TAB_MIN + (count - 1) * gap + pad * 2;

/** The furthest region the player has unlocked (0 = the first, always open). */
export function furthestOpen(regions: RegionLike[], best: Record<string, number>, demo: boolean): number {
  let last = 0;
  for (let i = 0; i < regions.length; i++) if (regionOpen(regions, i, best, demo)) last = i;
  return last;
}

/**
 * Where the bar should be scrolled so tab `active` is wholly in view: where it was (`now`) if the
 * tab already shows there, else with the tab at the left edge (its snap point), never past the end.
 * `lefts` are the tabs' left edges within the strip, `tabW` a tab's width, `viewW` the strip's width
 * on screen, `max` the furthest it scrolls.
 */
export function barScroll(lefts: number[], tabW: number, viewW: number, max: number, active: number, now = 0): number {
  const left = lefts[active] ?? 0;
  const at = Math.min(Math.max(0, now), max);
  if (left >= at - 0.5 && left + tabW <= at + viewW + 0.5) return at;
  return Math.min(max, Math.max(0, left - (lefts[0] ?? 0)));
}

/** Is there more of the bar to the left, to the right? (For the fades.) */
export const moreEdges = (scrollLeft: number, max: number): { left: boolean; right: boolean } => ({ left: scrollLeft > 2, right: scrollLeft < max - 2 });

/**
 * Tests and previews: `?tabs=8` pads the bar out to that many tabs with made-up locked regions, to
 * see it with more regions than the game has yet. They are tabs only: no levels, never opened.
 */
export function fakeRegions(have: number, search: string = typeof location === 'undefined' ? '' : location.search): string[] {
  const want = Math.min(12, Number(new URLSearchParams(search).get('tabs')) || 0);
  const names = ['Viking', 'Leduc', 'Nisku', 'Belly River', 'Wabamun', 'Charlie Lake', 'Halfway'];
  return want > have ? names.slice(0, want - have) : [];
}

/** How long after the bar last moved a touch on it is not a tap: a finger put down to stop a fling. */
export const SETTLE_MS = 140;

let remembered = 0;

/**
 * Runs the bar on the page: scrolls it so tab `active` is in view (the region the player was last
 * on; the furthest one unlocked if none is remembered yet), keeping where it was if that already
 * shows it, keeps the edge fades right, and tells a swipe from a tap. Returns `tapped`:
 * true if a touch that began on the bar may count as a tap (the bar was at rest when the finger
 * went down and has not moved since).
 */
export function runRegionBar(frame: HTMLElement, track: HTMLElement, active: number): { tapped: () => boolean } {
  const tabs = [...track.children] as HTMLElement[];
  const fades = () => {
    const more = moreEdges(track.scrollLeft, track.scrollWidth - track.clientWidth);
    frame.classList.toggle('more-left', more.left);
    frame.classList.toggle('more-right', more.right);
  };
  const place = () => {
    if (!tabs.length || !track.clientWidth) return;
    // A window wide enough for every tab at full size shows them all: nothing to swipe.
    frame.classList.toggle('all-fit', allFit(tabs.length, frame.clientWidth));
    track.scrollLeft = barScroll(tabs.map((t) => t.offsetLeft), tabs[0].offsetWidth, track.clientWidth, track.scrollWidth - track.clientWidth, active, remembered);
    remembered = track.scrollLeft;
    fades();
  };
  let lastMove = -1e9, downAt: number | null = null, moving = false;
  track.addEventListener('scroll', () => { lastMove = performance.now(); remembered = track.scrollLeft; fades(); }, { passive: true });
  // (Only a finger can stop a fling: a mouse click just after the bar was scrolled is still a click.)
  track.addEventListener('pointerdown', (e) => { downAt = track.scrollLeft; moving = e.pointerType === 'touch' && performance.now() - lastMove < SETTLE_MS; }, { capture: true });
  // In the page now or later: place it once it has a size.
  if (track.isConnected && track.clientWidth) place();
  else requestAnimationFrame(place);
  // (A desktop window dragged wider or narrower: all the tabs, or the strip again.)
  if (typeof ResizeObserver !== 'undefined') new ResizeObserver(place).observe(frame);
  return {
    tapped: () => {
      // (No finger went down: a keyboard or a screen reader pressed the tab. That always counts.)
      if (downAt === null) return true;
      const ok = !moving && Math.abs(track.scrollLeft - downAt) < 2;
      downAt = null;
      moving = false;
      return ok;
    },
  };
}

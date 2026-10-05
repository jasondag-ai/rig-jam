// THE GAG BUSH. BUSH RULE (GAME_BIBLE, Oct 4): every gag prop matches the board art exactly, so the
// bush the bear, the hare, the porcupine and the worker hide behind is the board's own willow bush
// (trees.ts: olive green, light round blobs, darker underside, brown stems), drawn by the same code
// as the bushes in the scenery. In winter it keeps its leaves (something must hide the hare) under
// a light dusting of snow, like the board's winter trees.
//
// The board's bush stands on bare stems, so anything BEHIND it is cut off at the bottom of the
// leaves across the bush's width (`behindBush`): nothing shows between the stems.
import { treeArt, type Season } from './trees.ts';

const O = '#2b1e16';
/** The willow's largest drawing (trees.ts, size 2): its blobs as [x, y, r] in the 80 x 56 box. */
const LOBES: [number, number, number][] = [[18, 38, 16], [34, 28, 19], [52, 28, 18], [64, 39, 14]];
const dusting = LOBES.map(
  ([x, y, r]) =>
    `<path d="M${x - r * 0.78} ${y - r * 0.5} Q${x - r * 0.5} ${y - r * 1.02} ${x} ${y - r * 0.9} Q${x + r * 0.55} ${y - r * 0.98} ${x + r * 0.74} ${y - r * 0.42} Q${x + r * 0.3} ${y - r * 0.62} ${x} ${y - r * 0.5} Q${x - r * 0.4} ${y - r * 0.66} ${x - r * 0.78} ${y - r * 0.5} Z" fill="#ffffff" stroke="${O}" stroke-width="1.5" stroke-linejoin="round" vector-effect="non-scaling-stroke"/>`,
).join('');

/** The bush for a season: the board's willow; in winter, in leaf with a snow dusting. */
export const bushMarkup = (season: Season): string =>
  `<ellipse cx="40" cy="53" rx="34" ry="3.6" fill="${season === 'winter' ? 'rgba(80,100,130,.18)' : 'rgba(40,60,20,.22)'}"/>` + treeArt('willow', season === 'winter' ? 'summer' : season, 2) + (season === 'winter' ? dusting : '');
/** The bush's box and where it stands in it. */
export const BUSH_BOX = { vw: 80, vh: 56, ax: 40, ay: 53 };
/** Its width as a share of the screen's (about 68 px of leaves at 390: the references' bush is 62). */
export const BUSH_FRAC = 0.18;
/** In its own units: how far the leaves reach either side of its middle, and how far above the ground they end. */
export const BUSH_HALF = 38;
export const BUSH_LEAF = 12;

/**
 * Hides the part of `el` (an element placed with left/top in the bush's layer) that would show
 * under the leaves, between the stems: everything below the leaf line, across the bush's width.
 * `bush` is where the bush stands in the layer (px) and `bu` the px per bush unit. Pass null to clear.
 */
export function behindBush(el: HTMLElement | SVGElement, bush: { x: number; y: number } | null, bu = 0): void {
  if (!bush) return void (el.style.clipPath = '');
  const left = parseFloat(el.style.left) || 0, top = parseFloat(el.style.top) || 0;
  const x1 = bush.x - BUSH_HALF * bu - left, x2 = bush.x + BUSH_HALF * bu - left, y = bush.y - BUSH_LEAF * bu - top;
  const far = 4000;
  el.style.clipPath = `polygon(${-far}px ${-far}px, ${far}px ${-far}px, ${far}px ${far}px, ${x2}px ${far}px, ${x2}px ${y}px, ${x1}px ${y}px, ${x1}px ${far}px, ${-far}px ${far}px)`;
}

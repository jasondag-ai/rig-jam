// Log v3: the dig goes on past the reservoir, through the whole Earth, and out the other side at
// Alberta's opposite point, the Kerguelen Islands in the Southern Ocean. Below the reef: the
// Precambrian basement, the mantle, the molten outer core, the inner core with the centre of the
// Earth in its middle; then the same layers mirrored back up, ocean crust, the seafloor, the sea,
// and the surface. THE FAR SIDE IS UPSIDE DOWN: we come up underneath it, so its sea floor is
// above its sea on the page and the island hangs from the waterline with its sky below.
//
// This file is pure (no DOM): the deep layers, the dirt drawn a small tile at a time (only the tiles
// near the screen are ever on the page), the depth gauge's arithmetic in real km, the
// oddities buried on the way, and the stopwatch's text. log-dig-view.ts puts it on the page.
import { mulberry32 } from '../engine/rng.ts';

/** Real depths (km): the centre of the Earth and the far surface (the Earth's mean diameter). */
export const EARTH = { centre: 6371, far: 12742 } as const;

/** Where each formation of the upper dig ENDS (km below the grass). Real ballpark depths for central Alberta. */
export const UPPER_KM: Record<string, number> = { grass: 0, topsoil: 0.002, till: 0.05, badlands: 0.4, cardium: 1.8, mannville: 2.4, montney: 2.9, bakken: 3.2, duvernay: 3.6, reef: 4 };

export type DeepId = 'granite' | 'mantle' | 'outerCore' | 'innerCore' | 'outerCoreUp' | 'mantleUp' | 'oceanCrust' | 'seafloor' | 'ocean' | 'kerguelen';

export interface DeepLayer {
  id: DeepId;
  /** What its pill says. */
  name: string;
  /** How tall it is on the page (px). */
  height: number;
  /** The depth at its foot (km from the grass, measured straight through the Earth). */
  km: number;
}

/**
 * HOW LONG THE DIG IS: ONE SETTING. `screens` phone screens (of `screenPx`) from the foot of the
 * reservoir to the far waterline, like the long dig in Plants vs Zombies. Mostly dirt and rock:
 * thick layers that change slowly. (`tile` is how tall a piece of dirt is drawn at a time: only
 * the tiles near the screen are ever on the page.)
 */
export const DIG = { screens: 60, screenPx: 844, tile: 422 } as const;

/** Each layer's share of the dig (about 1 in all), and the depth at its foot (km, straight through the Earth). */
const PLAN: { id: DeepId; name: string; share: number; km: number }[] = [
  { id: 'granite', name: 'Basement granite', share: 0.05, km: 35 },
  { id: 'mantle', name: 'Mantle', share: 0.2, km: 2890 },
  { id: 'outerCore', name: 'Outer core', share: 0.12, km: 5150 },
  { id: 'innerCore', name: 'Inner core', share: 0.1, km: EARTH.far - 5150 },
  { id: 'outerCoreUp', name: 'Outer core', share: 0.12, km: EARTH.far - 2890 },
  { id: 'mantleUp', name: 'Mantle', share: 0.2, km: EARTH.far - 11 },
  { id: 'oceanCrust', name: 'Ocean crust', share: 0.035, km: EARTH.far - 4.4 },
  { id: 'seafloor', name: 'Seafloor', share: 0.015, km: EARTH.far - 4 },
  // (The sea is ten screens deep: two finds, then five empty screens of suspense before the island.)
  { id: 'ocean', name: 'Southern Ocean', share: 0.17, km: EARTH.far },
];
/** The far surface: one screen-high picture at the very end (not part of the dirt's length). */
export const SURFACE_PX = 460;

/**
 * Past the reservoir, top of the page to bottom. The crust ends at 35 km, the mantle at 2,890, the
 * outer core at 5,150; the centre (6,371) is the MIDDLE of the inner core. Then back up: the same
 * depths counted from the far surface, which has an ocean's crust under 4 km of sea. Every
 * layer is a whole number of tiles tall; the two mirrored layers are as tall as their twins.
 */
export const DEEP: DeepLayer[] = [
  ...PLAN.map((l) => ({ id: l.id, name: l.name, km: l.km, height: Math.max(1, Math.round((l.share * DIG.screens * DIG.screenPx) / DIG.tile)) * DIG.tile })),
  { id: 'kerguelen', name: 'Kerguelen Islands', height: SURFACE_PX, km: EARTH.far },
];

/** A mark on the page: at `y` px the depth is `km`. */
export interface Mark { y: number; km: number }

/**
 * The gauge's marks from where each layer ends on the page: `upper` = the y (px) at which each
 * upper formation ends (keyed like `UPPER_KM`), `deepTop` = where the deep layers start. The
 * inner core gets one more mark at its middle: the centre of the Earth.
 */
export function marksFrom(upper: Record<string, number>, deepTop: number): Mark[] {
  const marks: Mark[] = Object.keys(UPPER_KM).filter((k) => k in upper).map((k) => ({ y: upper[k], km: UPPER_KM[k] }));
  let y = deepTop;
  for (const l of DEEP) {
    if (l.id === 'innerCore') marks.push({ y: y + l.height / 2, km: EARTH.centre });
    y += l.height;
    marks.push({ y, km: l.km });
  }
  return marks.sort((a, b) => a.y - b.y);
}

/** The depth (km) at `y` px down the page: straight lines between the marks, 0 above the first, the last mark's below it. */
export function depthKm(y: number, marks: Mark[]): number {
  if (!marks.length || y <= marks[0].y) return marks[0]?.km ?? 0;
  for (let i = 1; i < marks.length; i++) {
    const a = marks[i - 1], b = marks[i];
    if (y <= b.y) return b.y === a.y ? b.km : a.km + ((b.km - a.km) * (y - a.y)) / (b.y - a.y);
  }
  return marks[marks.length - 1].km;
}

/**
 * The gauge reads the depth at a line that moves down the screen as the page scrolls: at the top of
 * the page it is the screen's top edge (the grass: 0), at the end its bottom edge (Kerguelen).
 * `scrollTop` of `max`, on a screen `viewH` tall; the result is in px from the top of the page.
 */
export const gaugeLine = (scrollTop: number, max: number, viewH: number): number => scrollTop + (max > 0 ? Math.min(1, Math.max(0, scrollTop / max)) : 0) * viewH;

/** How the gauge writes a depth: "0 km", "1.8 km" under ten, then whole km with a comma ("6,371 km"). */
export function kmText(km: number): string {
  if (km < 0.05) return '0 km';
  if (km < 10) return `${km.toFixed(1)} km`;
  return `${Math.round(km).toLocaleString('en-US')} km`;
}

/** The stopwatch: minutes, seconds and tenths ("0:07.4", "12:03.9"). */
export function clockText(ms: number): string {
  const t = Math.max(0, Math.floor(ms / 100));
  return `${Math.floor(t / 600)}:${String(Math.floor(t / 10) % 60).padStart(2, '0')}.${t % 10}`;
}

// ---------- Oddities on the way down ----------

import { DIG_FINDS, type DigFind } from './dig-finds.ts';
export type OddityId = DigFind['id'];
export type Oddity = DigFind;
/** The finds in the dirt (dig-finds.ts). Tap to wiggle, like the buried things above. */
export const ODDITIES: Oddity[] = DIG_FINDS;

const O = '#2a1a0c';
const ol = `stroke="${O}" stroke-width="2.2" stroke-linejoin="round" stroke-linecap="round"`;
const thin = `stroke="${O}" stroke-width="1.4" stroke-linejoin="round" stroke-linecap="round"`;
const pic = (w: number, h: number, body: string) => `<svg viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" aria-hidden="true">${body}</svg>`;

/** A find's drawing, by its id (dig-finds.ts). */
const FIND_ART: Record<OddityId, () => string> = {
  nugget: () =>
    // A vein of milky quartz across the granite, a gold nugget set in it.
    pic(70, 52,
      `<path d="M2 34 L16 20 L30 24 L46 10 L68 14 L66 26 L50 30 L38 44 L18 40 L6 46 Z" fill="#f4f1ea" ${ol}/><path d="M12 34 L28 30 L40 20 L58 18" fill="none" stroke="#cfcac0" stroke-width="2" stroke-linecap="round"/>` +
      `<path d="M26 22 Q30 14 38 17 Q46 15 46 23 Q50 30 42 34 Q34 38 28 33 Q22 29 26 22 Z" fill="#f2c230" ${ol}/><path d="M30 23 Q34 19 39 21" fill="none" stroke="#fff1a8" stroke-width="2.4" stroke-linecap="round"/><circle cx="41" cy="29" r="1.6" fill="#c9951a"/>` +
      `<path d="M52 6 l1.4 3.4 l3.4 1.4 l-3.4 1.4 l-1.4 3.4 l-1.4 -3.4 l-3.4 -1.4 l3.4 -1.4 z" fill="#fff" stroke="${O}" stroke-width="1"/>`),
  burrito: () =>
    // Wrapped in foil, frosted over: still frozen in the middle, even down here.
    pic(68, 42,
      `<path d="M8 22 Q8 8 34 8 Q60 8 60 22 Q60 36 34 36 Q8 36 8 22 Z" fill="#d9c08a" ${ol}/>` +
      `<path d="M8 22 Q8 8 34 8 L40 8 L36 36 L34 36 Q8 36 8 22 Z" fill="#c9ccd2" ${ol}/><path d="M16 14 l8 6 M14 26 l10 4 M26 12 l4 10 M24 28 l8 -4" stroke="#f4f6f8" stroke-width="1.8" stroke-linecap="round"/>` +
      `<path d="M46 16 q4 3 8 1 M46 26 q5 -2 9 1" fill="none" stroke="#a8874a" stroke-width="1.8" stroke-linecap="round"/>` +
      `<g stroke="#8fd3ff" stroke-width="2" stroke-linecap="round"><path d="M60 6 v10 M55 11 h10 M56.5 7.5 l7 7 M63.5 7.5 l-7 7"/></g>`),
  spoon: () =>
    pic(34, 64,
      `<g transform="rotate(14 17 32)"><path d="M17 4 Q28 4 28 16 Q28 27 19.5 29 L19.5 56 Q19.5 60 17 60 Q14.5 60 14.5 56 L14.5 29 Q6 27 6 16 Q6 4 17 4 Z" fill="#dfe4e9" ${ol}/><ellipse cx="17" cy="15" rx="6.5" ry="8" fill="#f4f6f8"/><path d="M12 12 Q14 8 18 8" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round"/></g>` +
      `<path d="M28 40 l1.4 3.4 l3.4 1.4 l-3.4 1.4 l-1.4 3.4 l-1.4 -3.4 l-3.4 -1.4 l3.4 -1.4 z" fill="#fff" stroke="${O}" stroke-width="1"/>`),
  pail: () =>
    // The sleepy worker's pail: he forgot it once already.
    pic(50, 52,
      `<path d="M9 18 Q25 -6 41 18" fill="none" stroke="${O}" stroke-width="5" stroke-linecap="round"/><path d="M9 18 Q25 -6 41 18" fill="none" stroke="#9aa3ad" stroke-width="2" stroke-linecap="round"/>` +
      `<path d="M6 17 L44 17 L39 48 L11 48 Z" fill="#b9c0c8" ${ol}/><ellipse cx="25" cy="17" rx="19" ry="4.5" fill="#8d96a1" ${ol}/>` +
      `<path d="M9 27 L41 27 M10.5 37 L39.5 37" stroke="#8d96a1" stroke-width="2"/><path d="M13 22 L16 44" stroke="#e6eaee" stroke-width="2.4" stroke-linecap="round"/>`),
  mole: () =>
    // A mole in a miner's headlamp, on his way somewhere.
    pic(60, 58,
      `<path d="M48 12 l10 -6 l-3 10 z" fill="#fff3a8" opacity="0.8"/>` +
      `<ellipse cx="28" cy="36" rx="20" ry="18" fill="#5d5568" ${ol}/><ellipse cx="29" cy="42" rx="11" ry="9" fill="#776d85"/>` +
      `<path d="M38 28 Q52 26 54 34 Q50 40 40 38 Z" fill="#6a6176" ${ol}/><circle cx="54" cy="33.5" r="3" fill="#f2a0a8" ${thin}/>` +
      `<circle cx="40" cy="28" r="1.8" fill="${O}"/><path d="M44 36 q3 2 6 0" fill="none" ${thin}/>` +
      `<path d="M16 22 Q28 10 42 20" fill="none" stroke="${O}" stroke-width="6" stroke-linecap="round"/><path d="M16 22 Q28 10 42 20" fill="none" stroke="#e5484d" stroke-width="3" stroke-linecap="round"/>` +
      `<circle cx="42" cy="18" r="5" fill="#ffe27a" ${thin}/>` +
      `<g fill="#f2a0a8" ${thin}><path d="M12 46 l-8 4 l3 -7 l-6 0 l8 -4 z"/><path d="M40 50 l6 5 l-8 0 l2 4 l-8 -5 z"/></g>`),

  diamond: () =>
    pic(50, 46,
      `<path d="M10 16 L18 5 L32 5 L40 16 L25 42 Z" fill="#9fe3f5" ${ol}/><path d="M10 16 L40 16 M18 5 L22 16 L25 42 L28 16 L32 5" fill="none" ${thin}/>` +
      `<path d="M18 5 L22 16 L10 16 Z" fill="#d6f6fd"/><path d="M28 16 L40 16 L25 42 Z" fill="#6fc6e0"/><path d="M10 16 L40 16 M18 5 L22 16 L25 42 L28 16 L32 5 M10 16 L18 5 L32 5 L40 16 L25 42 Z" fill="none" ${thin}/>` +
      `<path d="M43 4 l1.6 4 l4 1.6 l-4 1.6 l-1.6 4 l-1.6 -4 l-4 -1.6 l4 -1.6 z" fill="#fff" stroke="${O}" stroke-width="1"/>`),
  lunchbox: () =>
    // (Hung upright on this side of the centre: the last thing in the dig that is the right way up.)
    pic(60, 50,
      `<path d="M20 14 Q20 5 30 5 Q40 5 40 14" fill="none" stroke="${O}" stroke-width="5" stroke-linecap="round"/><path d="M20 14 Q20 5 30 5 Q40 5 40 14" fill="none" stroke="#9aa3ad" stroke-width="2" stroke-linecap="round"/>` +
      `<rect x="6" y="14" width="48" height="31" rx="5" fill="#e5484d" ${ol}/><path d="M6 25 H54" stroke="${O}" stroke-width="2"/>` +
      `<rect x="25" y="21" width="10" height="8" rx="2" fill="#dfe4e9" ${thin}/><path d="M12 33 h10 M12 38 h7" stroke="#b5343a" stroke-width="2" stroke-linecap="round"/>` +
      `<path d="M40 31 l10 0 l-5 9 z" fill="#f2d86a" ${thin}/>`),
  whale: () =>
    // A blue whale, belly up to us: this side of the world is upside down.
    pic(150, 70,
      `<g transform="rotate(180 75 35)"><path d="M10 34 Q16 12 60 12 Q104 12 124 28 Q132 22 142 12 Q142 26 138 32 Q144 40 144 52 Q134 44 126 38 Q96 56 56 54 Q22 52 10 34 Z" fill="#5a86a8" ${ol}/>` +
      `<path d="M14 38 Q40 52 70 52 Q96 52 118 42 Q96 58 56 56 Q26 54 14 38 Z" fill="#cfe1ec"/>` +
      `<path d="M52 44 Q58 58 74 60 Q70 50 64 44 Z" fill="#4a7393" ${thin}/>` +
      `<circle cx="28" cy="30" r="2.6" fill="${O}"/><path d="M14 40 Q24 44 36 43" fill="none" ${thin}/>` +
      `<path d="M56 12 q-2 -7 -8 -9 M58 12 q2 -8 9 -9" fill="none" stroke="#bfe3f5" stroke-width="2.4" stroke-linecap="round"/></g>`),
  squid: () =>
    // A giant squid, head down to us (this side of the world is upside down), arms trailing up.
    pic(96, 150,
      `<g transform="rotate(180 48 75)">` +
      `<path d="M48 6 Q70 30 66 62 Q64 78 48 80 Q32 78 30 62 Q26 30 48 6 Z" fill="#d9574a" ${ol}/><path d="M48 8 Q30 22 24 40 Q34 38 40 30 Z" fill="#c2463c" ${thin}/><path d="M48 8 Q66 22 72 40 Q62 38 56 30 Z" fill="#c2463c" ${thin}/>` +
      `<circle cx="40" cy="64" r="7" fill="#fff" ${thin}/><circle cx="41" cy="65" r="3.4" fill="${O}"/><circle cx="57" cy="64" r="6" fill="#fff" ${thin}/><circle cx="57.5" cy="65" r="3" fill="${O}"/>` +
      [[34, -10, 126], [40, -4, 140], [46, 2, 134], [52, 4, 142], [58, 8, 130], [63, 14, 122]].map(([x, bend, end]) => `<path d="M${x} 78 Q${x + bend} ${(78 + end) / 2} ${x + bend * 0.4} ${end}" fill="none" stroke="${O}" stroke-width="8" stroke-linecap="round"/><path d="M${x} 78 Q${x + bend} ${(78 + end) / 2} ${x + bend * 0.4} ${end}" fill="none" stroke="#d9574a" stroke-width="4.4" stroke-linecap="round"/>`).join('') +
      `<path d="M30 76 Q10 100 14 142 M66 76 Q88 100 84 144" fill="none" stroke="${O}" stroke-width="6" stroke-linecap="round"/><path d="M30 76 Q10 100 14 142 M66 76 Q88 100 84 144" fill="none" stroke="#e8786a" stroke-width="2.8" stroke-linecap="round"/>` +
      `<ellipse cx="14" cy="142" rx="5" ry="7" fill="#e8786a" ${thin}/><ellipse cx="84" cy="144" rx="5" ry="7" fill="#e8786a" ${thin}/></g>`),
};
/** An oddity's drawing. */
export const oddityArt = (id: OddityId): string => FIND_ART[id]();
/** How far below the reservoir a layer starts (px). */
export const layerTop = (id: DeepId): number => DEEP.slice(0, DEEP.findIndex((l) => l.id === id)).reduce((sum, l) => sum + l.height, 0);
/** The layer a place `screen` phone screens below the reservoir falls in. */
export const layerAt = (screen: number): DeepId => DEEP.find((l) => screen * DIG.screenPx < layerTop(l.id) + l.height)?.id ?? 'kerguelen';

/** A find's box inside its layer, for cards `width` px wide (a tap target of at least 44 px each way). */
export function oddityBox(o: Oddity, width: number): { left: number; top: number; hitW: number; hitH: number } {
  const hitW = Math.max(44, o.w), hitH = Math.max(44, o.h);
  return { left: Math.round(o.x * width - hitW / 2), top: Math.round(o.screen * DIG.screenPx - layerTop(o.layer) - hitH / 2), hitW, hitH };
}

// ---------- The dirt, drawn a tile at a time ----------

/** Each layer's colour at its top and at its foot: it changes slowly all the way down. */
const TONE: Record<Exclude<DeepId, 'kerguelen'>, [string, string]> = {
  granite: ['#b59a92', '#8f7b78'],
  mantle: ['#a83617', '#e0652b'],
  outerCore: ['#e58c12', '#ffc53d'],
  innerCore: ['#ffd978', '#fff2c2'],
  outerCoreUp: ['#ffc53d', '#e58c12'],
  mantleUp: ['#e0652b', '#a83617'],
  oceanCrust: ['#353c46', '#4d5663'],
  seafloor: ['#a89878', '#c8b898'],
  ocean: ['#143a66', '#58a4d6'],
};
/**
 * A layer's background (CSS): one long, slow change of colour from its top to its foot (the inner
 * core is brightest at its middle, the centre of the Earth). The far surface is the sky's blue.
 */
export function layerBackground(id: DeepId): string {
  if (id === 'kerguelen') return '#bfe3f2';
  const [a, b] = TONE[id];
  return id === 'innerCore' ? `linear-gradient(${a}, ${b} 50%, ${a})` : `linear-gradient(${a}, ${b})`;
}

/** A wavy line across a layer at `y`, as path steps from x = 0. */
function wave(y: number, width: number, rng: () => number, amp = 5, step = 38): string {
  let d = `M0 ${y.toFixed(1)}`;
  for (let x = step; x < width + step; x += step) d += ` Q${(x - step / 2).toFixed(1)} ${(y + (rng() - 0.5) * amp * 2).toFixed(1)} ${Math.min(x, width).toFixed(1)} ${(y + (rng() - 0.5) * amp).toFixed(1)}`;
  return d;
}

/** How many tiles a layer is. */
export const tilesIn = (id: DeepId): number => (id === 'kerguelen' ? 0 : DEEP.find((l) => l.id === id)!.height / DIG.tile);

/**
 * ONE TILE OF DIRT: tile `k` (0 at the layer's top) of a layer, `width` x `DIG.tile` px, as its
 * own small SVG. Procedural and seeded by the layer and the tile, so the same tile is always the
 * same and no two alike; flat shapes only (no background: the layer's own slow colour shows
 * through, and a shape may run over the tile's edge without being cut). The two mirrored layers
 * draw their twin's tiles in reverse order, turned over.
 */
export function tileSvg(id: Exclude<DeepId, 'kerguelen'>, k: number, width: number): string {
  const up = id === 'outerCoreUp' || id === 'mantleUp';
  const base = id === 'outerCoreUp' ? 'outerCore' : id === 'mantleUp' ? 'mantle' : id;
  const kk = up ? tilesIn(id) - 1 - k : k;
  const h = DIG.tile;
  const rng = mulberry32(((base.charCodeAt(0) * 131 + base.length) * 7919 + kk * 104729) >>> 0);
  const r = (a: number, b: number) => a + rng() * (b - a);
  const n = (v: number) => v.toFixed(1);
  const many = (per: number, cap: number) => Math.min(cap, Math.max(1, Math.round((width * h) / per)));
  let body = '';
  if (base === 'granite') {
    for (let i = many(1700, 110); i > 0; i--) body += `<circle cx="${n(r(0, width))}" cy="${n(r(0, h))}" r="${n(r(1.2, 3.2))}" fill="${['#3d3532', '#f1e6e0', '#d68f86', '#7d706c'][Math.floor(rng() * 4)]}"/>`;
    for (let i = 2; i > 0; i--) { const x = r(10, width - 60), y = r(20, h - 40); body += `<path d="M${n(x)} ${n(y)} l${n(r(18, 40))} ${n(r(10, 26))} l${n(r(10, 30))} ${n(r(-8, 12))}" fill="none" stroke="#6f5f5a" stroke-width="1.6" stroke-linecap="round"/>`; }
  } else if (base === 'mantle') {
    // Slow convection: big soft plumes a little hotter than the rock round them, and flow lines.
    for (let i = many(30000, 7); i > 0; i--) { const rx = r(34, 80); body += `<ellipse cx="${n(r(-20, width + 20))}" cy="${n(r(0, h))}" rx="${n(rx)}" ry="${n(rx * r(0.9, 1.8))}" fill="#ff9a4a" opacity="0.22"/>`; }
    for (let i = many(60000, 3); i > 0; i--) { const rx = r(16, 38); body += `<ellipse cx="${n(r(0, width))}" cy="${n(r(0, h))}" rx="${n(rx)}" ry="${n(rx * r(1, 1.7))}" fill="#ffb060" opacity="0.3"/>`; }
    for (let i = many(9000, 20); i > 0; i--) body += `<path d="M${n(r(0, width))} ${n(r(0, h))} q${n(r(-10, 10))} ${n(r(12, 26))} ${n(r(-6, 6))} ${n(r(30, 54))}" fill="none" stroke="#7d2a10" stroke-width="2" stroke-linecap="round" opacity="0.55"/>`;
  } else if (base === 'outerCore') {
    // Molten: bright currents running across, and bubbles.
    for (let y = r(10, 40); y < h; y += r(40, 70)) body += `<path d="${wave(y, width, rng, 9)}" fill="none" stroke="${rng() < 0.5 ? '#ffe07a' : '#c9770c'}" stroke-width="${n(r(3, 7))}" stroke-linecap="round" opacity="0.7"/>`;
    for (let i = many(15000, 12); i > 0; i--) body += `<circle cx="${n(r(0, width))}" cy="${n(r(0, h))}" r="${n(r(3, 9))}" fill="#ffe9a0" stroke="#c9770c" stroke-width="1.4"/>`;
  } else if (base === 'innerCore') {
    // Solid iron, crystalline: long facets leaning the same way.
    for (let i = many(5600, 30); i > 0; i--) { const len = r(26, 70); body += `<path d="M${n(r(-20, width))} ${n(r(0, h))} l${n(len)} ${n(-len * 0.5)}" stroke="${rng() < 0.5 ? '#f0c14e' : '#fffbe6'}" stroke-width="${n(r(2, 4))}" stroke-linecap="round"/>`; }
  } else if (base === 'oceanCrust') {
    // Pillow basalt.
    for (let i = many(2700, 62); i > 0; i--) { const rx = r(12, 26); body += `<ellipse cx="${n(r(0, width))}" cy="${n(r(0, h))}" rx="${n(rx)}" ry="${n(rx * r(0.55, 0.8))}" fill="${rng() < 0.5 ? '#566070' : '#2c323b'}" stroke="#23282f" stroke-width="1.8"/>`; }
  } else if (base === 'seafloor') {
    for (let i = many(1500, 110); i > 0; i--) body += `<circle cx="${n(r(0, width))}" cy="${n(r(0, h))}" r="${n(r(1, 2.4))}" fill="${rng() < 0.5 ? '#8c7c5c' : '#e0d2b2'}"/>`;
  } else if (base === 'ocean') {
    // Bubbles, and a few small fish, upside down like everything on this side of the world.
    for (let i = many(17000, 10); i > 0; i--) body += `<circle cx="${n(r(0, width))}" cy="${n(r(0, h))}" r="${n(r(2, 5))}" fill="none" stroke="#cfeaf8" stroke-width="1.4" opacity="0.7"/>`;
    for (let i = many(60000, 3); i > 0; i--) { const s = r(0.8, 1.3), way = rng() < 0.5 ? 1 : -1; body += `<g transform="translate(${n(r(20, width - 40))} ${n(r(20, h - 20))}) scale(${n(s * way)} ${n(-s)})"><path d="M0 0 Q8 -6 18 0 Q8 6 0 0 Z M18 0 l7 -5 l0 10 z" fill="#f2b84a" stroke="${O}" stroke-width="1.4" stroke-linejoin="round"/><circle cx="5" cy="-1" r="1" fill="${O}"/></g>`; }
  }
  const turned = up ? ` transform="translate(0 ${h}) scale(1 -1)"` : '';
  return `<svg class="deep-tile-art" viewBox="0 0 ${width} ${h}" width="${width}" height="${h}" overflow="visible" aria-hidden="true"><g${turned}>${body}</g></svg>`;
}

/**
 * Which tiles of a layer are near the screen: those within `margin` px of the stretch of the layer
 * that shows (`viewTop` and `viewBottom` are px from the LAYER's top). Everything else stays off
 * the page: a sixty-screen dig never holds more than a few tiles at once.
 */
export function tilesNear(id: DeepId, viewTop: number, viewBottom: number, margin: number = DIG.screenPx): number[] {
  const count = tilesIn(id);
  const first = Math.max(0, Math.floor((viewTop - margin) / DIG.tile)), last = Math.min(count - 1, Math.floor((viewBottom + margin) / DIG.tile));
  const out: number[] = [];
  for (let k = first; k <= last; k++) out.push(k);
  return out;
}

/** The dark toy line along the top of a layer: a thin strip `width` px wide. */
export function layerEdge(id: DeepId, width: number): string {
  const rng = mulberry32(id.length * 4409 + id.charCodeAt(1));
  return `<svg class="deep-edge" viewBox="0 0 ${width} 10" width="${width}" height="10" overflow="visible" aria-hidden="true"><path d="${wave(1.5, width, rng, 3)}" fill="none" stroke="${O}" stroke-width="2.4" stroke-linecap="round" opacity="0.85"/></svg>`;
}

/** The seabed, at the seafloor's foot (the sea is BELOW it on this side): its ragged edge, rocks and weed hanging into the water. 44 px tall. */
export function seabedSvg(width: number): string {
  const rng = mulberry32(8123);
  const r = (a: number, b: number) => a + rng() * (b - a);
  const n = (v: number) => v.toFixed(1);
  let body = `<path d="${wave(18, width, rng, 6)} L${width} 44 L0 44 Z" fill="${TONE.ocean[0]}"/><path d="${wave(18, width, mulberry32(8123), 6)}" fill="none" stroke="${O}" stroke-width="2.4" stroke-linecap="round"/>`;
  for (let x = 14; x < width; x += r(26, 60)) body += rng() < 0.5 ? `<ellipse cx="${n(x)}" cy="22" rx="${n(r(6, 12))}" ry="${n(r(4, 7))}" fill="#7d7566" stroke="${O}" stroke-width="1.6"/>` : `<path d="M${n(x)} 20 q${n(r(-6, 6))} ${n(r(8, 12))} ${n(r(-3, 3))} ${n(r(14, 22))}" fill="none" stroke="#3f8f5a" stroke-width="3" stroke-linecap="round"/>`;
  return `<svg class="deep-seabed" viewBox="0 0 ${width} 44" width="${width}" height="44" aria-hidden="true">${body}</svg>`;
}

/**
 * THE FAR SURFACE, from underneath: the sea above, the waterline, and below it the open sky, with
 * one tiny island hanging from the waterline, a king penguin and an elephant seal on it.
 */
export function kerguelenSvg(width: number): string {
  const h = SURFACE_PX, sea = 70, cx = width * 0.5;
  const rng = mulberry32(4421);
  const n = (v: number) => v.toFixed(1);
  let body = `<rect width="${width}" height="${h}" fill="#bfe3f2"/><rect width="${width}" height="${sea}" fill="${TONE.ocean[1]}"/>`;
  // clouds (the right way up for a penguin)
  for (const [x, y, s] of [[width * 0.16, 250, 1], [width * 0.8, 330, 0.8], [width * 0.3, 400, 0.7]] as const) body += `<g transform="translate(${n(x)} ${y}) scale(${s} ${-s})"><path d="M-30 6 Q-34 -6 -20 -8 Q-16 -20 0 -16 Q14 -24 22 -10 Q36 -10 32 6 Z" fill="#fff" stroke="${O}" stroke-width="2"/></g>`;
  // the island: rock and tussock grass, hanging down from the waterline
  body += `<path d="M${n(cx - 128)} ${sea} Q${n(cx - 100)} ${sea + 46} ${n(cx - 52)} ${sea + 58} Q${n(cx - 10)} ${sea + 104} ${n(cx + 30)} ${sea + 66} Q${n(cx + 88)} ${sea + 58} ${n(cx + 128)} ${sea} Z" fill="#6f6a62" ${ol}/>`;
  body += `<path d="M${n(cx - 112)} ${sea + 14} Q${n(cx - 74)} ${sea + 40} ${n(cx - 34)} ${sea + 46} Q${n(cx + 8)} ${sea + 70} ${n(cx + 52)} ${sea + 48} Q${n(cx + 92)} ${sea + 40} ${n(cx + 114)} ${sea + 14}" fill="none" stroke="#6fa04a" stroke-width="9" stroke-linecap="round"/>`;
  for (const tx of [-84, -18, 14, 100]) body += `<path d="M${n(cx + tx)} ${sea + 40} l-3 10 M${n(cx + tx)} ${sea + 40} l1 11 M${n(cx + tx)} ${sea + 40} l5 9" stroke="#4f8035" stroke-width="2.2" stroke-linecap="round"/>`;
  // waves along the waterline
  body += `<path d="${wave(sea, width, rng, 3, 22)}" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round" opacity="0.9"/><path d="${wave(sea + 1, width, mulberry32(4430), 3, 22)}" fill="none" stroke="${O}" stroke-width="1.6" stroke-linecap="round" opacity="0.6"/>`;
  // a king penguin, standing on the island (head down, to us)
  body += `<g transform="translate(${n(cx - 58)} ${sea + 58}) scale(1.15 -1.15)"><ellipse cx="0" cy="-22" rx="12" ry="20" fill="#2b2f3a" ${ol}/><ellipse cx="1" cy="-19" rx="7.5" ry="15" fill="#fbfbf6"/><path d="M-5 -34 Q1 -30 7 -34" fill="none" stroke="#f2a51e" stroke-width="3" stroke-linecap="round"/><circle cx="0" cy="-42" r="8" fill="#2b2f3a" ${ol}/><path d="M5 -43 l11 2 l-11 3 z" fill="#f08a24" ${thin}/><circle cx="2" cy="-44" r="1.4" fill="#fff"/><path d="M-12 -26 q-6 8 -3 16 M12 -26 q6 8 3 16" fill="none" stroke="${O}" stroke-width="4" stroke-linecap="round"/><path d="M-7 -2 h6 M2 -2 h6" stroke="#f08a24" stroke-width="3.4" stroke-linecap="round"/></g>`;
  // an elephant seal, flopped beside him
  body += `<g transform="translate(${n(cx + 58)} ${sea + 60}) scale(1.15 -1.15)"><path d="M-38 0 Q-44 -14 -24 -20 Q4 -30 26 -22 Q40 -18 40 -6 Q40 0 30 0 Z" fill="#8b7d6f" ${ol}/><path d="M-38 0 l-10 -7 l2 9 l-6 4 z" fill="#8b7d6f" ${thin}/><circle cx="30" cy="-14" r="1.8" fill="${O}"/><path d="M38 -10 Q48 -10 46 0 Q42 4 38 -2 Z" fill="#7a6d60" ${thin}/><path d="M-8 -2 q8 -6 18 -2" fill="none" stroke="#6f6358" stroke-width="2" stroke-linecap="round"/></g>`;
  // What they say (Jay, Oct 6). The words are the right way up for US, so we can read them: each
  // bubble's tail goes up to its speaker's head.
  const say = (x: number, y: number, w: number, lines: string[], tipX: number, tipY: number) => {
    const bh = 12 + lines.length * 13, left = Math.max(4, Math.min(width - w - 4, x)), tx = Math.max(left + 12, Math.min(left + w - 12, tipX));
    return `<g class="kerg-say"><path d="M${n(tx - 7)} ${y + 2} L${n(tipX)} ${tipY} L${n(tx + 7)} ${y + 2} Z" fill="#fffdf6" ${thin}/><rect x="${n(left)}" y="${y}" width="${w}" height="${bh}" rx="9" fill="#fffdf6" ${ol}/><path d="M${n(tx - 5.6)} ${y + 1.4} L${n(tx + 5.6)} ${y + 1.4}" stroke="#fffdf6" stroke-width="3.2"/>` +
      lines.map((t, i) => `<text x="${n(left + w / 2)}" y="${y + 17 + i * 13}" text-anchor="middle" font-size="11.5" font-weight="700" fill="${O}">${t}</text>`).join('') + `</g>`;
  };
  body += say(cx - 150, sea + 120, 92, KERGUELEN_SAYS.penguin, cx - 60, sea + 110);
  body += say(cx + 66, sea + 104, 88, KERGUELEN_SAYS.seal, cx + 100, sea + 82);
  return `<svg class="deep-surface" viewBox="0 0 ${width} ${h}" width="${width}" height="${h}" preserveAspectRatio="none" aria-hidden="true">${body}</svg>`;
}

/** The far side's two locals, each sure it is the other who is upside down (bubble lines). */
export const KERGUELEN_SAYS = { penguin: ["You're upside", 'down.'], seal: ['No, YOU are.'] };

/** The Dug Through card's picture: the Earth cut in half, the hole straight through it, a derrick on top and a penguin underneath. */
export function dugStill(): string {
  return `<svg class="egg-still dug-still" viewBox="0 0 100 84" aria-hidden="true">` +
    `<circle cx="50" cy="42" r="30" fill="#6a9a4a" ${ol}/><circle cx="50" cy="42" r="26" fill="#b59a92"/><circle cx="50" cy="42" r="23" fill="#c4471f"/><circle cx="50" cy="42" r="14" fill="#f0a21c"/><circle cx="50" cy="42" r="7" fill="#ffe7a0"/>` +
    `<path d="M50 12 V72" stroke="${O}" stroke-width="5" stroke-linecap="round"/><path d="M50 12 V72" stroke="#fff7e6" stroke-width="2" stroke-linecap="round"/>` +
    `<path d="M44 12 L50 0 L56 12 M46 8 H54" fill="none" ${thin}/>` +
    `<g transform="translate(50 73) scale(0.42 -0.42)"><ellipse cx="0" cy="-22" rx="12" ry="20" fill="#2b2f3a" ${ol}/><ellipse cx="1" cy="-19" rx="7.5" ry="15" fill="#fbfbf6"/><circle cx="0" cy="-42" r="8" fill="#2b2f3a" ${ol}/><path d="M5 -43 l11 2 l-11 3 z" fill="#f08a24" ${thin}/></g></svg>`;
}

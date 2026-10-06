// Log v3: the dig goes on past the reservoir, through the whole Earth, and out the other side at
// Alberta's opposite point, the Kerguelen Islands in the Southern Ocean. Below the reef: the
// Precambrian basement, the mantle, the molten outer core, the inner core with the centre of the
// Earth in its middle; then the same layers mirrored back up, ocean crust, the seafloor, the sea,
// and the surface. THE FAR SIDE IS UPSIDE DOWN: we come up underneath it, so its sea floor is
// above its sea on the page and the island hangs from the waterline with its sky below.
//
// This file is pure (no DOM): the deep layers and their drawings (one small SVG per layer, so a
// very long page never paints one huge picture), the depth gauge's arithmetic in real km, the
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
 * Past the reservoir, top of the page to bottom. The crust ends at 35 km, the mantle at 2,890, the
 * outer core at 5,150; the centre (6,371) is the MIDDLE of the inner core's block. Then back up:
 * the same depths counted from the far surface, which has an ocean's crust (7 km) under 4 km of sea.
 */
export const DEEP: DeepLayer[] = [
  { id: 'granite', name: 'Basement granite', height: 420, km: 35 },
  { id: 'mantle', name: 'Mantle', height: 1500, km: 2890 },
  { id: 'outerCore', name: 'Outer core', height: 1000, km: 5150 },
  { id: 'innerCore', name: 'Inner core', height: 800, km: EARTH.far - 5150 },
  { id: 'outerCoreUp', name: 'Outer core', height: 1000, km: EARTH.far - 2890 },
  { id: 'mantleUp', name: 'Mantle', height: 1500, km: EARTH.far - 11 },
  { id: 'oceanCrust', name: 'Ocean crust', height: 300, km: EARTH.far - 4.4 },
  { id: 'seafloor', name: 'Seafloor', height: 160, km: EARTH.far - 4 },
  { id: 'ocean', name: 'Southern Ocean', height: 900, km: EARTH.far },
  { id: 'kerguelen', name: 'Kerguelen Islands', height: 460, km: EARTH.far },
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

export type OddityId = 'diamond' | 'lunchbox' | 'whale';
export interface Oddity {
  id: OddityId;
  label: string;
  in: DeepId;
  /** Its centre: across the cards' width and down its layer (both 0 to 1). */
  x: number;
  y: number;
  w: number;
  h: number;
}
/** A diamond in the mantle, a lost lunchbox at the very centre, a whale in the Southern Ocean. Tap to wiggle, like the buried things above. */
export const ODDITIES: Oddity[] = [
  { id: 'diamond', label: 'Diamond', in: 'mantle', x: 0.3, y: 0.42, w: 50, h: 46 },
  { id: 'lunchbox', label: 'Lost lunchbox', in: 'innerCore', x: 0.6, y: 0.5, w: 60, h: 50 },
  { id: 'whale', label: 'Whale', in: 'ocean', x: 0.42, y: 0.45, w: 150, h: 70 },
];

const O = '#2a1a0c';
const ol = `stroke="${O}" stroke-width="2.2" stroke-linejoin="round" stroke-linecap="round"`;
const thin = `stroke="${O}" stroke-width="1.4" stroke-linejoin="round" stroke-linecap="round"`;
const pic = (w: number, h: number, body: string) => `<svg viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" aria-hidden="true">${body}</svg>`;

const ODD_ART: Record<OddityId, () => string> = {
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
};
/** An oddity's drawing. */
export const oddityArt = (id: OddityId): string => ODD_ART[id]();
/** An oddity's box inside its layer, for cards `width` px wide (a tap target of at least 44 px each way). */
export function oddityBox(o: Oddity, width: number, layerH: number): { left: number; top: number; hitW: number; hitH: number } {
  const hitW = Math.max(44, o.w), hitH = Math.max(44, o.h);
  return { left: Math.round(o.x * width - hitW / 2), top: Math.round(o.y * layerH - hitH / 2), hitW, hitH };
}

// ---------- The deep layers' drawings ----------

const FILL: Record<DeepId, string> = {
  granite: '#b59a92', mantle: '#c4471f', outerCore: '#f0a21c', innerCore: '#ffe7a0', outerCoreUp: '#f0a21c', mantleUp: '#c4471f',
  oceanCrust: '#414955', seafloor: '#b8a888', ocean: '#1d4f86', kerguelen: '#bfe3f2',
};
/** Each deep layer's base colour (its top edge takes this fill, so two layers meet cleanly). */
export const deepFill = (id: DeepId): string => FILL[id];

/** A wavy line across a layer at `y`, as path steps from x = 0. */
function wave(y: number, width: number, rng: () => number, amp = 5, step = 38): string {
  let d = `M0 ${y.toFixed(1)}`;
  for (let x = step; x < width + step; x += step) d += ` Q${(x - step / 2).toFixed(1)} ${(y + (rng() - 0.5) * amp * 2).toFixed(1)} ${Math.min(x, width).toFixed(1)} ${(y + (rng() - 0.5) * amp).toFixed(1)}`;
  return d;
}

/**
 * One deep layer as its own SVG, `width` x its height px: flat fills, the dark toy line along its
 * top, a sparse seeded texture (never more than a few hundred shapes, no filters, no gradients).
 * The two layers that mirror an earlier one are that same drawing turned over.
 */
export function deepSvg(id: DeepId, width: number, seed = 61): string {
  const layer = DEEP.find((l) => l.id === id)!;
  const h = layer.height;
  const base: DeepId = id === 'outerCoreUp' ? 'outerCore' : id === 'mantleUp' ? 'mantle' : id;
  const rng = mulberry32(seed + base.length * 977 + base.charCodeAt(0));
  const r = (a: number, b: number) => a + rng() * (b - a);
  const n = (v: number) => v.toFixed(1);
  const count = (per: number, cap: number) => Math.min(cap, Math.round((width * h) / per));
  let body = `<rect width="${width}" height="${h}" fill="${FILL[id]}"/>`;
  if (base === 'granite') {
    for (let i = count(1500, 260); i > 0; i--) body += `<circle cx="${n(r(0, width))}" cy="${n(r(6, h))}" r="${n(r(1.2, 3.2))}" fill="${['#3d3532', '#f1e6e0', '#d68f86', '#8d7f7a'][Math.floor(rng() * 4)]}"/>`;
    for (let i = 5; i > 0; i--) { const x = r(10, width - 60), y = r(30, h - 40); body += `<path d="M${n(x)} ${n(y)} l${n(r(18, 40))} ${n(r(10, 26))} l${n(r(10, 30))} ${n(r(-8, 12))}" fill="none" stroke="#6f5f5a" stroke-width="1.6" stroke-linecap="round"/>`; }
  } else if (base === 'mantle') {
    // Slow convection: big soft plumes, lighter and hotter toward the core.
    for (let i = count(26000, 22); i > 0; i--) { const x = r(-20, width + 20), y = r(40, h - 20), rx = r(36, 84); body += `<ellipse cx="${n(x)}" cy="${n(y)}" rx="${n(rx)}" ry="${n(rx * r(0.9, 1.9))}" fill="${y > h * 0.6 ? '#e2632a' : '#d1521f'}"/>`; }
    for (let i = count(42000, 14); i > 0; i--) { const x = r(0, width), y = r(h * 0.35, h - 10), rx = r(18, 44); body += `<ellipse cx="${n(x)}" cy="${n(y)}" rx="${n(rx)}" ry="${n(rx * r(1, 1.8))}" fill="#f08a3a"/>`; }
    for (let i = count(9000, 60); i > 0; i--) { const x = r(0, width), y = r(10, h); body += `<path d="M${n(x)} ${n(y)} q${n(r(-10, 10))} ${n(r(12, 26))} ${n(r(-6, 6))} ${n(r(30, 54))}" fill="none" stroke="#a83a16" stroke-width="2" stroke-linecap="round"/>`; }
  } else if (base === 'outerCore') {
    // Molten: bright currents running across, and bubbles.
    for (let y = 26; y < h; y += r(34, 60)) body += `<path d="${wave(y, width, rng, 9)}" fill="none" stroke="${rng() < 0.5 ? '#ffd24a' : '#e08412'}" stroke-width="${n(r(3, 7))}" stroke-linecap="round"/>`;
    for (let i = count(14000, 34); i > 0; i--) { const s = r(3, 9); body += `<circle cx="${n(r(0, width))}" cy="${n(r(10, h - 6))}" r="${n(s)}" fill="#ffe27a" stroke="#c9770c" stroke-width="1.4"/>`; }
  } else if (base === 'innerCore') {
    // Solid iron, crystalline: long facets leaning the same way.
    for (let i = count(5200, 70); i > 0; i--) { const x = r(-20, width), y = r(10, h - 10), len = r(26, 70); body += `<path d="M${n(x)} ${n(y)} l${n(len)} ${n(-len * 0.5)}" stroke="${rng() < 0.5 ? '#f3c85a' : '#fff6cf'}" stroke-width="${n(r(2, 4))}" stroke-linecap="round"/>`; }
    // The centre of the Earth: one dashed line across its middle.
    body += `<path d="M0 ${h / 2} H${width}" stroke="${O}" stroke-width="2.4" stroke-dasharray="9 7" opacity="0.8"/>`;
  } else if (base === 'oceanCrust') {
    // Pillow basalt.
    for (let i = count(2600, 46); i > 0; i--) { const x = r(0, width), y = r(16, h - 12), rx = r(12, 26); body += `<ellipse cx="${n(x)}" cy="${n(y)}" rx="${n(rx)}" ry="${n(rx * r(0.55, 0.8))}" fill="${rng() < 0.5 ? '#4d5663' : '#353c46'}" stroke="#23282f" stroke-width="1.8"/>`; }
  } else if (base === 'seafloor') {
    // Soft sediment, and at its foot (the sea is BELOW it here) the seabed: rocks and weed hanging into the water.
    for (let i = count(1300, 50); i > 0; i--) body += `<circle cx="${n(r(0, width))}" cy="${n(r(8, h - 30))}" r="${n(r(1, 2.4))}" fill="${rng() < 0.5 ? '#9c8c6c' : '#d6c8a8'}"/>`;
    body += `<path d="${wave(h - 26, width, rng, 6)} L${width} ${h} L0 ${h} Z" fill="${FILL.ocean}"/><path d="${wave(h - 26, width, mulberry32(seed + 5), 6)}" fill="none" stroke="${O}" stroke-width="2.4" stroke-linecap="round"/>`;
    for (let x = 14; x < width; x += r(26, 60)) body += rng() < 0.5 ? `<ellipse cx="${n(x)}" cy="${n(h - 22)}" rx="${n(r(6, 12))}" ry="${n(r(4, 7))}" fill="#7d7566" stroke="${O}" stroke-width="1.6"/>` : `<path d="M${n(x)} ${n(h - 24)} q${n(r(-6, 6))} ${n(r(8, 14))} ${n(r(-3, 3))} ${n(r(16, 24))}" fill="none" stroke="#3f8f5a" stroke-width="3" stroke-linecap="round"/>`;
  } else if (base === 'ocean') {
    // Dark at the seabed (the top, here), lighter toward the surface (the foot): flat bands, no gradient.
    const bands = ['#1d4f86', '#225b96', '#2869a6', '#3078b5', '#3d8ac4', '#4f9bd0'];
    bands.forEach((c, i) => { if (i) body += `<path d="${wave((h * i) / bands.length, width, rng, 8)} L${width} ${h} L0 ${h} Z" fill="${c}"/>`; });
    for (let i = count(16000, 20); i > 0; i--) { const s = r(2, 5); body += `<circle cx="${n(r(0, width))}" cy="${n(r(20, h - 10))}" r="${n(s)}" fill="none" stroke="#bfe3f5" stroke-width="1.4" opacity="0.7"/>`; }
    // A few small fish, upside down like everything on this side.
    for (let i = count(40000, 9); i > 0; i--) { const x = r(20, width - 40), y = r(60, h - 60), s = r(0.8, 1.3), way = rng() < 0.5 ? 1 : -1; body += `<g transform="translate(${n(x)} ${n(y)}) scale(${n(s * way)} ${n(-s)})"><path d="M0 0 Q8 -6 18 0 Q8 6 0 0 Z M18 0 l7 -5 l0 10 z" fill="#f2b84a" stroke="${O}" stroke-width="1.4" stroke-linejoin="round"/><circle cx="5" cy="-1" r="1" fill="${O}"/></g>`; }
  } else if (base === 'kerguelen') {
    // The far surface, from underneath: the sea above, the waterline, and below it the open sky,
    // with one tiny island hanging from the waterline, a king penguin and an elephant seal on it.
    const sea = 70, cx = width * 0.5;
    body = `<rect width="${width}" height="${h}" fill="#bfe3f2"/><rect width="${width}" height="${sea}" fill="#4f9bd0"/>`;
    // clouds (the right way up for a penguin)
    for (const [x, y, s] of [[width * 0.16, 250, 1], [width * 0.8, 330, 0.8], [width * 0.3, 400, 0.7]] as const) body += `<g transform="translate(${n(x)} ${y}) scale(${s} ${-s})"><path d="M-30 6 Q-34 -6 -20 -8 Q-16 -20 0 -16 Q14 -24 22 -10 Q36 -10 32 6 Z" fill="#fff" stroke="${O}" stroke-width="2"/></g>`;
    // the island: rock and tussock grass, hanging down from the waterline
    body += `<path d="M${n(cx - 128)} ${sea} Q${n(cx - 100)} ${sea + 46} ${n(cx - 52)} ${sea + 58} Q${n(cx - 10)} ${sea + 104} ${n(cx + 30)} ${sea + 66} Q${n(cx + 88)} ${sea + 58} ${n(cx + 128)} ${sea} Z" fill="#6f6a62" ${ol}/>`;
    body += `<path d="M${n(cx - 112)} ${sea + 14} Q${n(cx - 74)} ${sea + 40} ${n(cx - 34)} ${sea + 46} Q${n(cx + 8)} ${sea + 70} ${n(cx + 52)} ${sea + 48} Q${n(cx + 92)} ${sea + 40} ${n(cx + 114)} ${sea + 14}" fill="none" stroke="#6fa04a" stroke-width="9" stroke-linecap="round"/>`;
    for (const tx of [-84, -18, 14, 100]) body += `<path d="M${n(cx + tx)} ${sea + 40} l-3 10 M${n(cx + tx)} ${sea + 40} l1 11 M${n(cx + tx)} ${sea + 40} l5 9" stroke="#4f8035" stroke-width="2.2" stroke-linecap="round"/>`;
    // waves along the waterline
    body += `<path d="${wave(sea, width, rng, 3, 22)}" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round" opacity="0.9"/><path d="${wave(sea + 1, width, mulberry32(seed + 9), 3, 22)}" fill="none" stroke="${O}" stroke-width="1.6" stroke-linecap="round" opacity="0.6"/>`;
    // a king penguin, standing on the island (head down, to us)
    body += `<g transform="translate(${n(cx - 58)} ${sea + 58}) scale(1.15 -1.15)"><ellipse cx="0" cy="-22" rx="12" ry="20" fill="#2b2f3a" ${ol}/><ellipse cx="1" cy="-19" rx="7.5" ry="15" fill="#fbfbf6"/><path d="M-5 -34 Q1 -30 7 -34" fill="none" stroke="#f2a51e" stroke-width="3" stroke-linecap="round"/><circle cx="0" cy="-42" r="8" fill="#2b2f3a" ${ol}/><path d="M5 -43 l11 2 l-11 3 z" fill="#f08a24" ${thin}/><circle cx="2" cy="-44" r="1.4" fill="#fff"/><path d="M-12 -26 q-6 8 -3 16 M12 -26 q6 8 3 16" fill="none" stroke="${O}" stroke-width="4" stroke-linecap="round"/><path d="M-7 -2 h6 M2 -2 h6" stroke="#f08a24" stroke-width="3.4" stroke-linecap="round"/></g>`;
    // an elephant seal, flopped beside him
    body += `<g transform="translate(${n(cx + 58)} ${sea + 60}) scale(1.15 -1.15)"><path d="M-38 0 Q-44 -14 -24 -20 Q4 -30 26 -22 Q40 -18 40 -6 Q40 0 30 0 Z" fill="#8b7d6f" ${ol}/><path d="M-38 0 l-10 -7 l2 9 l-6 4 z" fill="#8b7d6f" ${thin}/><circle cx="30" cy="-14" r="1.8" fill="${O}"/><path d="M38 -10 Q48 -10 46 0 Q42 4 38 -2 Z" fill="#7a6d60" ${thin}/><path d="M-8 -2 q8 -6 18 -2" fill="none" stroke="#6f6358" stroke-width="2" stroke-linecap="round"/></g>`;
  }
  // The layer's top: one dark toy line (the surface block has its own waterline).
  if (base !== 'kerguelen') body += `<path d="${wave(1.5, width, mulberry32(seed + h), 3)}" fill="none" stroke="${O}" stroke-width="2.4" stroke-linecap="round" opacity="0.85"/>`;
  const turned = id !== base ? ` transform="translate(0 ${h}) scale(1 -1)"` : '';
  return `<svg class="deep-art" viewBox="0 0 ${width} ${h}" width="${width}" height="${h}" preserveAspectRatio="none" aria-hidden="true"><g${turned}>${body}</g></svg>`;
}

/** The Dug Through card's picture: the Earth cut in half, the hole straight through it, a derrick on top and a penguin underneath. */
export function dugStill(): string {
  return `<svg class="egg-still dug-still" viewBox="0 0 100 84" aria-hidden="true">` +
    `<circle cx="50" cy="42" r="30" fill="#6a9a4a" ${ol}/><circle cx="50" cy="42" r="26" fill="#b59a92"/><circle cx="50" cy="42" r="23" fill="#c4471f"/><circle cx="50" cy="42" r="14" fill="#f0a21c"/><circle cx="50" cy="42" r="7" fill="#ffe7a0"/>` +
    `<path d="M50 12 V72" stroke="${O}" stroke-width="5" stroke-linecap="round"/><path d="M50 12 V72" stroke="#fff7e6" stroke-width="2" stroke-linecap="round"/>` +
    `<path d="M44 12 L50 0 L56 12 M46 8 H54" fill="none" ${thin}/>` +
    `<g transform="translate(50 73) scale(0.42 -0.42)"><ellipse cx="0" cy="-22" rx="12" ry="20" fill="#2b2f3a" ${ol}/><ellipse cx="1" cy="-19" rx="7.5" ry="15" fill="#fbfbf6"/><circle cx="0" cy="-42" r="8" fill="#2b2f3a" ${ol}/><path d="M5 -43 l11 2 l-11 3 z" fill="#f08a24" ${thin}/></g></svg>`;
}

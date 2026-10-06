// The Wildlife Log's deep dig: ONE continuous cross-section behind the cards, from the grass down
// to an oil reservoir, drawn in code in the board's toy look (flat fills, the dark outline, no
// photo textures). The cards stand in groups of four; between the groups a WINDOW opens on the
// formation at that depth, with its label (a small pill) and the things buried in it. Below the
// last card the section keeps going down to the reef. A wellbore runs from the surface, down the
// gutter between the two columns of cards, into the reservoir.
//
// This file is pure (no DOM): the formations, the buried objects and their drawings, and the SVG of
// the strata. main.ts lays it out (`showLog`) and wires the taps. What the objects say is in
// lines.ts (`BURIED_LINES`). Buried objects are NOT log entries.
import { mulberry32 } from '../engine/rng.ts';

export type FormationId = 'grass' | 'topsoil' | 'till' | 'badlands' | 'cardium' | 'mannville' | 'montney' | 'bakken' | 'duvernay' | 'reef';

export interface Formation {
  id: FormationId;
  /** What its pill says. */
  name: string;
  /** The game region named after it: its pill is greyed until that region is unlocked. */
  region?: string;
  /** Height of its window (px): the open band where its pill and buried objects show. 0 = none. */
  window: number;
  /** Its window comes after this many groups of cards (the last formations lie below every card). */
  after: number;
}

/** How many cards stand between two windows (two rows of two). */
export const GROUP = 4;
/** Top to bottom. The first four windows open between the groups of cards; the rest lie below them. */
export const FORMATIONS: Formation[] = [
  { id: 'grass', name: 'Grass', window: 0, after: 0 },
  { id: 'topsoil', name: 'Topsoil', window: 178, after: 1 },
  { id: 'till', name: 'Glacial till', window: 134, after: 2 },
  { id: 'badlands', name: 'Badlands', window: 150, after: 3 },
  { id: 'cardium', name: 'Cardium', region: 'cardium', window: 126, after: 4 },
  { id: 'mannville', name: 'Mannville', region: 'mannville', window: 122, after: 5 },
  { id: 'montney', name: 'Montney', region: 'montney', window: 126, after: 5 },
  { id: 'bakken', name: 'Bakken', region: 'bakken', window: 152, after: 5 },
  { id: 'duvernay', name: 'Duvernay shale', region: 'duvernay', window: 126, after: 5 },
  { id: 'reef', name: 'Reef reservoir', window: 210, after: 5 },
];
/** The grass is this thick (px) at the very top of the section. */
export const GRASS = 16;
/** Half the room kept clear for the wellbore down the middle (px). */
export const BORE_CLEAR = 9;

/** True if a formation's pill is greyed: it is named after a region that is still locked. */
export const pillLocked = (f: Formation, open: (regionId: string) => boolean): boolean => !!f.region && !open(f.region);

export type BuriedId = 'keys' | 'remote' | 'sock' | 'golf' | 'den' | 'phone' | 'chest' | 'tusk' | 'plane' | 'dino' | 'egg' | 'plesiosaur' | 'ammonite' | 'bit' | 'trilobite';

export interface Buried {
  id: BuriedId;
  /** For screen readers. */
  label: string;
  in: FormationId;
  /** Its centre: across the cards' width (0 to 1) and down from its window's top (px). */
  x: number;
  y: number;
  /** Its drawing's size (px). Its tap target is never smaller than 44 px either way. */
  w: number;
  h: number;
}

/** Everything buried, shallow to deep. Each keeps to its own half of the window, clear of the wellbore. */
export const BURIED: Buried[] = [
  { id: 'keys', label: 'Car keys', in: 'topsoil', x: 0.13, y: 64, w: 46, h: 40 },
  { id: 'remote', label: 'TV remote', in: 'topsoil', x: 0.345, y: 74, w: 32, h: 56 },
  { id: 'sock', label: 'One sock', in: 'topsoil', x: 0.12, y: 138, w: 44, h: 46 },
  { id: 'golf', label: 'Golf ball', in: 'topsoil', x: 0.35, y: 144, w: 34, h: 34 },
  { id: 'den', label: 'Gopher den', in: 'topsoil', x: 0.77, y: 62, w: 136, h: 84 },
  { id: 'phone', label: 'Dropped phone', in: 'topsoil', x: 0.84, y: 146, w: 40, h: 44 },
  { id: 'chest', label: 'Pirate chest', in: 'till', x: 0.15, y: 86, w: 66, h: 56 },
  { id: 'tusk', label: 'Mammoth tusk', in: 'till', x: 0.36, y: 84, w: 70, h: 52 },
  { id: 'plane', label: 'Vintage silver plane', in: 'till', x: 0.765, y: 76, w: 124, h: 66 },
  { id: 'egg', label: 'Dinosaur egg', in: 'badlands', x: 0.17, y: 96, w: 44, h: 54 },
  { id: 'dino', label: 'Dinosaur skeleton', in: 'badlands', x: 0.765, y: 86, w: 148, h: 88 },
  { id: 'plesiosaur', label: 'Plesiosaur skeleton', in: 'cardium', x: 0.25, y: 76, w: 150, h: 70 },
  // (In the badlands: that is where Alberta's ammolite comes from.)
  { id: 'ammonite', label: 'Ammonite', in: 'badlands', x: 0.375, y: 96, w: 54, h: 54 },
  { id: 'bit', label: 'Lost drill bit and fishing tool', in: 'bakken', x: 0.66, y: 78, w: 50, h: 110 },
  { id: 'trilobite', label: 'Trilobite', in: 'duvernay', x: 0.76, y: 72, w: 46, h: 60 },
];

/** A buried object's box inside its window, for cards `width` px wide: the drawing and the (at least 44 px) tap target. */
export function buriedBox(b: Buried, width: number): { left: number; top: number; w: number; h: number; hitW: number; hitH: number } {
  const hitW = Math.max(44, b.w), hitH = Math.max(44, b.h);
  return { left: Math.round(b.x * width - hitW / 2), top: Math.round(b.y - hitH / 2), w: b.w, h: b.h, hitW, hitH };
}

// ---------- The buried objects' drawings ----------

const O = '#2a1a0c';
const ol = `stroke="${O}" stroke-width="2.2" stroke-linejoin="round" stroke-linecap="round"`;
const thin = `stroke="${O}" stroke-width="1.4" stroke-linejoin="round" stroke-linecap="round"`;
const svg = (w: number, h: number, body: string) => `<svg viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" aria-hidden="true">${body}</svg>`;
const BONE = '#f3e8cf';

const ART: Record<BuriedId, () => string> = {
  keys: () =>
    svg(46, 40,
      `<circle cx="14" cy="14" r="9" fill="none" stroke="${O}" stroke-width="5"/><circle cx="14" cy="14" r="9" fill="none" stroke="#c9ccd2" stroke-width="2.2"/>` +
      `<g ${ol}><path d="M19 20 L33 33 L30 36 L27 34 L25 36 L22 33 L20 34 L15 26 Z" fill="#d9b24a"/>` +
      `<path d="M22 13 L40 15 L41 19 L37 19 L36 22 L32 21 L30 23 L22 20 Z" fill="#c9ccd2"/>` +
      `<rect x="2" y="22" width="13" height="15" rx="3.5" fill="#33383f" transform="rotate(-14 8 30)"/></g>` +
      `<circle cx="7.5" cy="28" r="1.8" fill="#e5484d"/>`),
  remote: () =>
    svg(32, 56,
      `<g transform="rotate(12 16 28)"><rect x="6" y="3" width="20" height="50" rx="5" fill="#3b4048" ${ol}/>` +
      `<circle cx="16" cy="10" r="3" fill="#e5484d" ${thin}/>` +
      [18, 25, 32].map((y) => [11, 16, 21].map((x) => `<rect x="${x - 1.8}" y="${y}" width="3.6" height="3.6" rx="1" fill="#aab0b8"/>`).join('')).join('') +
      `<rect x="10" y="40" width="12" height="7" rx="3" fill="#7d8590"/></g>`),
  sock: () =>
    svg(44, 46,
      `<path d="M14 3 L29 3 L30 22 Q31 27 37 30 Q43 34 40 40 Q37 44 28 43 Q15 42 13 30 Z" fill="#f7f4ec" ${ol}/>` +
      `<path d="M14.3 8 L29.2 8 M14.4 12.5 L29.4 12.5" stroke="#e5484d" stroke-width="2.6"/>` +
      `<path d="M31 41.5 Q39 42 40.5 36 Q38 33 34.5 34 Q31.5 37 31 41.5 Z" fill="#c9ccd2" ${thin}/>` +
      `<path d="M13.6 27 Q14 22 19 22 Q20 27 16 31 Z" fill="#c9ccd2" ${thin}/>`),
  golf: () =>
    svg(34, 34,
      `<circle cx="17" cy="17" r="13" fill="#fbfbf6" ${ol}/>` +
      [[12, 11], [18, 9], [23, 13], [10, 17], [16, 15], [22, 19], [13, 22], [19, 23], [24, 24]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="1.5" fill="#cfd3d0"/>`).join('') +
      `<path d="M8 21 Q11 27 18 28.5" fill="none" stroke="#dfe2de" stroke-width="2"/>`),
  den: () =>
    svg(136, 84,
      // The room: a snug hollow with a rug, an armchair, a lamp, a picture and a table with the crust on a plate.
      `<path d="M10 44 Q8 14 44 9 Q92 2 122 20 Q134 30 130 54 Q128 76 96 78 L30 78 Q10 74 10 44 Z" fill="#3a2516" ${ol}/>` +
      `<path d="M16 46 Q15 20 46 15 Q90 9 118 25 Q126 33 124 52 Q122 70 96 72 L32 72 Q16 68 16 46 Z" fill="#6b4a2c"/>` +
      `<ellipse cx="70" cy="68" rx="40" ry="5" fill="#b2473e"/><ellipse cx="70" cy="68" rx="30" ry="3" fill="#e0a13c"/>` +
      `<g ${thin}><rect x="24" y="44" width="26" height="22" rx="6" fill="#4f7d5b"/><rect x="20" y="52" width="8" height="15" rx="3.5" fill="#5f9069"/><rect x="46" y="52" width="8" height="15" rx="3.5" fill="#5f9069"/><rect x="27" y="54" width="20" height="8" rx="3" fill="#77a882"/></g>` +
      `<g ${thin}><path d="M100 66 L100 40" /><path d="M92 40 L108 40 L104 28 L96 28 Z" fill="#ffd66b"/><path d="M95 66 L105 66"/></g>` +
      `<g ${thin}><rect x="60" y="22" width="18" height="14" rx="1.5" fill="#f3e8cf"/><path d="M63 33 L67 27 L70 31 L72 29 L75 33 Z" fill="#7fb069"/></g>` +
      `<g ${thin}><path d="M62 56 L88 56 L88 59 L62 59 Z" fill="#c98f52"/><path d="M66 59 L66 67 M84 59 L84 67"/>` +
      `<ellipse cx="75" cy="54" rx="9" ry="2.6" fill="#f7f4ec"/><path d="M69 53 L81 53 L75 47.5 Z" fill="#e0a13c"/><path d="M71.5 52 L78.5 52" stroke="#f7e3a8" stroke-width="1.2"/></g>`),
  phone: () =>
    svg(40, 44,
      `<g transform="rotate(-24 20 22)"><rect x="9" y="4" width="22" height="36" rx="4.5" fill="#23262b" ${ol}/>` +
      `<rect x="12" y="8" width="16" height="26" rx="1.5" fill="#8fd3ff"/>` +
      `<path d="M14 9 L21 20 L17 24 L24 33 M21 20 L27 16" fill="none" stroke="#f7fbff" stroke-width="1.3"/>` +
      `<circle cx="20" cy="37" r="1.4" fill="#7d8590"/></g>` +
      `<circle cx="32" cy="8" r="5.5" fill="#e5484d" ${thin}/><path d="M32 5.2 L32 10.8 M29.6 6.6 L32 5.2" stroke="#fff" stroke-width="1.5" fill="none"/>`),
  chest: () =>
    svg(66, 56,
      `<path d="M16 50 Q20 54 30 53 M40 52 Q52 55 58 49" fill="none" stroke="#e7c75a" stroke-width="3"/>` +
      `<g ${ol}><path d="M8 26 Q8 8 33 8 Q58 8 58 26 Z" fill="#8b5a2b"/><rect x="8" y="26" width="50" height="24" rx="2" fill="#7a4a22"/></g>` +
      `<path d="M8 26 L58 26" stroke="${O}" stroke-width="2.2"/>` +
      `<g ${thin} fill="#e7c75a"><path d="M18 9.5 L18 50 L23 50 L23 8.6 Z"/><path d="M43 8.6 L43 50 L48 50 L48 9.5 Z"/><rect x="28" y="22" width="10" height="11" rx="2"/></g>` +
      `<circle cx="33" cy="26.5" r="1.6" fill="${O}"/><path d="M33 27 L33 30.5" stroke="${O}" stroke-width="1.6"/>` +
      `<g ${thin} fill="#f2d86a"><circle cx="12" cy="49" r="3.4"/><circle cx="55" cy="50" r="3.4"/><circle cx="61" cy="45" r="2.6"/></g>`),
  tusk: () =>
    svg(70, 52,
      `<path d="M6 12 Q4 40 30 45 Q52 49 66 34 Q54 40 36 36 Q18 31 17 10 Q11 6 6 12 Z" fill="#f4ead2" ${ol}/>` +
      `<path d="M10 14 Q9 34 28 40 M22 27 Q30 34 44 37" fill="none" stroke="#d9c9a2" stroke-width="1.8" stroke-linecap="round"/>` +
      `<ellipse cx="11.5" cy="11" rx="5.6" ry="3.4" fill="#d9c9a2" ${thin}/>`),
  plane: () =>
    // A vintage twin-engined silver plane, nose down in the till.
    svg(124, 66,
      `<g transform="rotate(14 62 33)"><g ${ol}>` +
      `<path d="M96 22 L112 8 L118 9 L110 27 Z" fill="#c2c8cf"/>` +
      `<path d="M12 34 Q14 24 34 22 L98 22 Q114 24 116 30 Q104 38 60 42 Q24 44 12 34 Z" fill="#dfe4e9"/>` +
      `<path d="M42 30 L86 30 L70 52 L50 52 Z" fill="#c2c8cf"/>` +
      `<rect x="52" y="27" width="22" height="9" rx="4.5" fill="#aab2bb"/></g>` +
      `<path d="M20 30 Q23 26 32 26 L32 31 Q24 32 20 30 Z" fill="#7fc4ee" ${thin}/>` +
      [44, 54, 64, 74, 84].map((x) => `<circle cx="${x}" cy="26.5" r="1.9" fill="#7fc4ee" stroke="${O}" stroke-width="1"/>`).join('') +
      `<path d="M50 24 L50 40" stroke="${O}" stroke-width="2.4" stroke-linecap="round"/><circle cx="50" cy="31.5" r="2.2" fill="${O}"/>` +
      `<path d="M16 37 Q50 43 104 33" fill="none" stroke="#b5bcc5" stroke-width="1.6"/>` +
      `<path d="M100 24 L104 24 M92 24 L96 24" stroke="#e5484d" stroke-width="2"/></g>`),
  dino: () =>
    // A meat-eater lying on its side: skull, neck, ribs, hips, a long tail, legs and a small arm.
    svg(148, 88,
      `<g fill="${BONE}" ${thin}>` +
      // tail and backbone
      [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map((i) => { const x = 138 - i * 8.4, y = 52 - Math.sin(i / 3.4) * 14 - i * 0.6; return `<rect x="${(x - 3.2).toFixed(1)}" y="${(y - 3).toFixed(1)}" width="6.4" height="6" rx="2"/>`; }).join('') +
      // ribs
      [0, 1, 2, 3, 4].map((i) => `<path d="M${72 - i * 7} ${37 - i * 0.8} q-4 14 2 24" fill="none" stroke="${O}" stroke-width="4.2"/><path d="M${72 - i * 7} ${37 - i * 0.8} q-4 14 2 24" fill="none" stroke="${BONE}" stroke-width="2"/>`).join('') +
      // hips and legs
      `<path d="M78 40 Q90 38 92 50 Q84 54 78 48 Z"/>` +
      `<path d="M84 50 L96 66 L88 80 L98 82 L98 85 L84 85 L90 68 L78 54 Z"/>` +
      `<path d="M76 52 L82 68 L74 80 L84 82 L84 85 L70 85 L76 69 L70 56 Z"/>` +
      // arm
      `<path d="M44 46 L40 56 L44 60 M40 56 L36 59" fill="none" stroke="${O}" stroke-width="4.2"/><path d="M44 46 L40 56 L44 60 M40 56 L36 59" fill="none" stroke="${BONE}" stroke-width="2"/>` +
      // neck and skull
      `<path d="M40 32 L34 22 L40 19 L47 30 Z"/>` +
      `<path d="M6 16 Q8 5 24 5 Q38 5 40 16 Q40 24 30 25 L10 26 Q5 24 6 16 Z"/>` +
      `<path d="M9 28 L30 27 Q36 28 37 24 L39 30 Q36 36 28 35 L12 34 Q8 33 9 28 Z"/></g>` +
      `<circle cx="29" cy="13" r="3.6" fill="${O}"/><ellipse cx="17" cy="12" rx="2.2" ry="1.6" fill="${O}"/>` +
      `<path d="M11 26 l1.6 3 l1.6 -3 l1.6 3 l1.6 -3 l1.6 3 l1.6 -3 l1.6 3 l1.6 -3 l1.6 3 l1.6 -3" fill="#fff" stroke="${O}" stroke-width="1"/>`),
  egg: () =>
    // It cracks, an eye peeks out, and it closes again (the classes do it: style.css "The dig").
    svg(44, 54,
      `<ellipse cx="22" cy="49" rx="13" ry="3" fill="rgba(0,0,0,0.25)"/>` +
      `<g class="egg-shell"><path d="M22 5 Q36 8 37 30 Q37 48 22 48 Q7 48 7 30 Q8 8 22 5 Z" fill="#efe6cf" ${ol}/>` +
      [[14, 20, 2.4], [28, 16, 1.8], [30, 34, 2.6], [15, 38, 2], [22, 28, 1.6], [24, 42, 1.8]].map(([x, y, r]) => `<circle cx="${x}" cy="${y}" r="${r}" fill="#c9b78f"/>`).join('') + `</g>` +
      `<g class="egg-peek"><path d="M8.5 25 L14 21 L18 26 L23 20 L27 26 L32 21 L35.6 25 L35.6 31 L8.5 31 Z" fill="#1c130b" stroke="${O}" stroke-width="1.6" stroke-linejoin="round"/>` +
      `<g class="egg-eye"><ellipse cx="22" cy="27" rx="5.2" ry="3.6" fill="#ffd84a" stroke="${O}" stroke-width="1.2"/><ellipse cx="22" cy="27" rx="1.3" ry="3" fill="${O}"/></g></g>` +
      `<path class="egg-crack" d="M8.5 25 L14 21 L18 26 L23 20 L27 26 L32 21 L35.6 25" fill="none" stroke="${O}" stroke-width="1.6" stroke-linejoin="round" stroke-linecap="round"/>`),
  plesiosaur: () =>
    // A long neck and a small skull, a barrel of ribs, four paddles and a short tail.
    svg(150, 70,
      `<g fill="${BONE}" ${thin}>` +
      [0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((i) => { const x = 24 + i * 6.6, y = 16 + i * i * 0.26; return `<rect x="${(x - 2.6).toFixed(1)}" y="${(y - 2.6).toFixed(1)}" width="5.2" height="5.2" rx="1.8"/>`; }).join('') +
      `<path d="M4 12 Q6 6 14 7 L22 10 Q25 13 22 17 L10 18 Q4 17 4 12 Z"/>` +
      `<path d="M84 34 Q104 28 122 38 Q110 50 90 48 Q80 44 84 34 Z"/>` +
      [0, 1, 2, 3, 4].map((i) => `<path d="M${90 + i * 6.4} ${36 + (i === 2 ? -1 : 0)} q-2 8 2 13" fill="none" stroke="${O}" stroke-width="1.4"/>`).join('') +
      [0, 1, 2, 3, 4].map((i) => `<rect x="${(124 + i * 5).toFixed(1)}" y="${(38.5 + i * 0.9).toFixed(1)}" width="4.2" height="4.2" rx="1.5"/>`).join('') +
      `<path d="M90 46 Q78 58 66 62 Q68 54 82 43 Z"/><path d="M112 48 Q118 60 130 64 Q126 54 118 45 Z"/>` +
      `<path d="M90 35 Q80 24 68 22 Q72 30 84 38 Z"/><path d="M114 36 Q122 26 134 24 Q130 32 120 40 Z"/></g>` +
      `<circle cx="12" cy="11.5" r="2.2" fill="${O}"/><path d="M6 15.5 l1.4 2 l1.4 -2 l1.4 2 l1.4 -2 l1.4 2 l1.4 -2" fill="#fff" stroke="${O}" stroke-width="0.9"/>`),
  ammonite: () => {
    // A coiled shell: one spiral line from the middle out to the rim, with ribs across the outer whorl.
    const at = (t: number, r: number) => `${(27 + Math.cos(t) * r).toFixed(1)} ${(27 + Math.sin(t) * r).toFixed(1)}`;
    let coil = `M${at(0, 1.5)}`;
    for (let t = 0.25; t <= Math.PI * 5.5; t += 0.25) coil += ` L${at(t, 1.5 + (t / (Math.PI * 5.5)) * 21)}`;
    const ribs = Array.from({ length: 14 }, (_, i) => { const t = Math.PI * 3.6 + (i / 14) * Math.PI * 1.9, r = 1.5 + (t / (Math.PI * 5.5)) * 21; return `M${at(t, r - 6.4)} L${at(t + 0.05, r - 1)}`; }).join(' ');
    return svg(54, 54,
      `<circle cx="27" cy="27" r="23.5" fill="#d9a55f" ${ol}/>` +
      `<path d="${ribs}" fill="none" stroke="#a8743a" stroke-width="1.8" stroke-linecap="round"/>` +
      `<path d="${coil}" fill="none" stroke="${O}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>` +
      `<path d="M9 20 Q13 9 25 6" fill="none" stroke="#f1d3a0" stroke-width="2.2" stroke-linecap="round"/>`);
  },
  bit: () =>
    // The fish (a tricone bit on a stub of drill collar) and, coming down for it, the fishing tool (an overshot on its string).
    svg(50, 110,
      `<g ${ol}><rect x="20" y="0" width="10" height="34" fill="#8d96a1"/>` +
      `<path d="M14 32 L36 32 L38 56 Q25 62 12 56 Z" fill="#f08a24"/></g>` +
      `<path d="M15 40 L35 40 M14 47 L36 47" stroke="${O}" stroke-width="1.4"/>` +
      `<path d="M17 56 L19 62 L22 57 L25 63 L28 57 L31 62 L33 56" fill="#c9ccd2" stroke="${O}" stroke-width="1.4" stroke-linejoin="round"/>` +
      `<g ${ol}><rect x="19" y="70" width="12" height="12" fill="#6f7780"/>` +
      `<path d="M13 82 L37 82 L39 92 L11 92 Z" fill="#8d96a1"/>` +
      `<path d="M11 92 Q10 104 18 106 Q22 100 21 92 Z" fill="#c9ccd2"/><path d="M39 92 Q40 104 32 106 Q28 100 29 92 Z" fill="#c9ccd2"/><path d="M21 92 Q20 106 25 108 Q30 106 29 92 Z" fill="#dfe4e9"/></g>` +
      [[14.5, 97], [16.5, 102], [25, 99], [25, 104], [35.5, 97], [33.5, 102]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="1.3" fill="${O}"/>`).join('') +
      `<path d="M22 70 L22 66 M28 70 L28 66" stroke="${O}" stroke-width="1.6" stroke-linecap="round"/>`),
  trilobite: () =>
    svg(46, 60,
      `<path d="M23 4 Q41 6 42 22 Q42 44 23 57 Q4 44 4 22 Q5 6 23 4 Z" fill="#5d5568" ${ol}/>` +
      `<path d="M5 21 Q23 27 41 21" fill="none" stroke="${O}" stroke-width="2"/>` +
      [27, 32, 37, 42, 47].map((y, i) => `<path d="M${6.5 + i * 2.2} ${y} Q23 ${y + 4} ${39.5 - i * 2.2} ${y}" fill="none" stroke="${O}" stroke-width="1.5"/>`).join('') +
      `<path d="M17 21 Q16 40 23 55 Q30 40 29 21" fill="#776d85" stroke="${O}" stroke-width="1.6"/>` +
      `<path d="M17 21 Q16 10 23 9 Q30 10 29 21" fill="#776d85" stroke="${O}" stroke-width="1.6"/>` +
      `<ellipse cx="11.5" cy="15" rx="3" ry="2.2" fill="#2a2330"/><ellipse cx="34.5" cy="15" rx="3" ry="2.2" fill="#2a2330"/>`),
};

/** A buried object's drawing. */
export const buriedArt = (id: BuriedId): string => ART[id]();

// ---------- The strata ----------

export interface Layer {
  id: FormationId;
  /** Its top and bottom in the section (px from the section's top). */
  top: number;
  bottom: number;
}

/**
 * The layers of the section, top to bottom with no gaps, from where each formation's window ends
 * (`ends[id]`, px from the section's top; main.ts measures them). The grass is `GRASS` thick.
 */
export function layersFrom(ends: Record<Exclude<FormationId, 'grass'>, number>): Layer[] {
  let top = 0;
  return FORMATIONS.map((f) => {
    const bottom = f.id === 'grass' ? GRASS : Math.max(top + 1, Math.round(ends[f.id]));
    const layer = { id: f.id, top, bottom };
    top = bottom;
    return layer;
  });
}

const FILL: Record<FormationId, string> = {
  grass: '#5fae3f', topsoil: '#5a3d25', till: '#8b7b67', badlands: '#c39a62', cardium: '#d9b877',
  mannville: '#82765f', montney: '#6f808c', bakken: '#b9a37c', duvernay: '#3b3442', reef: '#cfc19c',
};

/** A formation's wavy top edge across the section, as SVG path steps starting at x = 0. */
function edge(y: number, width: number, rng: () => number, amp = 4): string {
  const step = 34;
  let d = `M0 ${y.toFixed(1)}`;
  for (let x = step; x < width + step; x += step) d += ` Q${(x - step / 2).toFixed(1)} ${(y + (rng() - 0.5) * amp * 2).toFixed(1)} ${Math.min(x, width).toFixed(1)} ${(y + (rng() - 0.5) * amp).toFixed(1)}`;
  return d;
}

/**
 * The whole cross-section as one SVG, `width` px wide (the screen's width: the cards' column and
 * its side margins) and as tall as its last layer. `bore` is the wellbore's centre line (x) and
 * `boreTop` where it starts at the surface. Seeded: it always looks the same.
 */
export function strataSvg(width: number, layers: Layer[], bore: number, boreTop = 0, seed = 2026): string {
  const rng = mulberry32(seed);
  const height = layers.at(-1)!.bottom;
  const r = (a: number, b: number) => a + rng() * (b - a);
  const n = (v: number) => v.toFixed(1);
  let out = '';
  for (const l of layers) {
    const h = l.bottom - l.top;
    const top = l.id === 'grass' ? `M0 ${l.top}L${width} ${l.top}` : edge(l.top, width, rng);
    let body = `<path class="st-fill" d="${top} L${width} ${l.bottom + 8} L0 ${l.bottom + 8} Z" fill="${FILL[l.id]}"/>`;
    const count = (per: number, cap: number) => Math.min(cap, Math.round((width * h) / per));
    if (l.id === 'grass') {
      for (let x = 4; x < width; x += r(9, 15)) body += `<path d="M${n(x)} ${l.bottom + 3} l${n(r(1.5, 3))} ${n(-r(6, 10))} l${n(r(1.5, 3))} ${n(r(6, 10))} Z" fill="#3f8f33"/>`;
    } else if (l.id === 'topsoil') {
      for (let i = count(5200, 70); i > 0; i--) { const x = r(0, width), y = r(l.top + 10, l.bottom - 4); body += `<path d="M${n(x)} ${n(y)} q${n(r(-8, 8))} ${n(r(4, 10))} ${n(r(-10, 10))} ${n(r(12, 22))}" fill="none" stroke="#7a5636" stroke-width="${n(r(1.2, 2.2))}" stroke-linecap="round"/>`; }
      for (let i = count(9000, 40); i > 0; i--) body += `<ellipse cx="${n(r(0, width))}" cy="${n(r(l.top + 10, l.bottom - 4))}" rx="${n(r(2, 4.5))}" ry="${n(r(1.6, 3))}" fill="#3f2a18"/>`;
    } else if (l.id === 'till') {
      for (let i = count(2600, 110); i > 0; i--) { const big = rng() < 0.25; body += `<ellipse cx="${n(r(0, width))}" cy="${n(r(l.top + 10, l.bottom - 6))}" rx="${n(big ? r(7, 12) : r(2.5, 6))}" ry="${n(big ? r(5, 8) : r(2, 4.5))}" fill="${['#a59783', '#6f6253', '#b9ad9a', '#7d8087'][Math.floor(rng() * 4)]}"${big ? ` stroke="#2a1a0c" stroke-width="1.6"` : ''} transform="rotate(${n(r(-25, 25))} 0 0)" style="transform-box: fill-box; transform-origin: center"/>`; }
    } else if (l.id === 'badlands') {
      // Banded like the coulees: rust, grey, cream and tan stripes.
      const bands = ['#a8623a', '#d8c39a', '#8d857a', '#c98a52', '#e2d2ae', '#9a6b47'];
      const bh = Math.max(14, h / Math.max(6, Math.round(h / 64)));
      for (let y = l.top + bh * 0.7, i = 0; y < l.bottom - 4; y += bh, i++) body += `<path d="${edge(y, width, rng, 3)} L${width} ${n(y + bh * 0.48)} L0 ${n(y + bh * 0.48)} Z" fill="${bands[i % bands.length]}"/>`;
    } else if (l.id === 'cardium') {
      for (let i = count(900, 260); i > 0; i--) body += `<circle cx="${n(r(0, width))}" cy="${n(r(l.top + 8, l.bottom - 3))}" r="${n(r(0.9, 1.8))}" fill="${rng() < 0.5 ? '#b8924e' : '#efd9a4'}"/>`;
      for (let i = count(16000, 26); i > 0; i--) { const x = r(0, width), y = r(l.top + 14, l.bottom - 8); body += `<path d="M${n(x)} ${n(y)} l${n(r(26, 48))} ${n(r(5, 11))}" stroke="#b8924e" stroke-width="1.4" stroke-linecap="round"/>`; }
    } else if (l.id === 'mannville') {
      // Coal seams: three black bands with a thin sheen.
      // (Measured up from its floor, so they cross its window, clear of the cards above.)
      for (const up of [96, 60, 26]) { const y = l.bottom - up, t = r(8, 13); body += `<path d="${edge(y, width, rng, 3)} L${width} ${n(y + t)} L0 ${n(y + t)} Z" fill="#1d1916"/><path d="${edge(y + 2.5, width, rng, 2)}" fill="none" stroke="#4a4541" stroke-width="1.2"/>`; }
      for (let i = count(3600, 60); i > 0; i--) body += `<path d="M${n(r(0, width))} ${n(r(l.top + 8, l.bottom - 4))} h${n(r(8, 20))}" stroke="#6a5f4b" stroke-width="1.3" stroke-linecap="round"/>`;
    } else if (l.id === 'montney') {
      for (let i = count(1900, 110); i > 0; i--) body += `<path d="M${n(r(0, width))} ${n(r(l.top + 8, l.bottom - 4))} h${n(r(6, 16))}" stroke="${rng() < 0.5 ? '#596872' : '#8a9aa6'}" stroke-width="1.3" stroke-linecap="round"/>`;
    } else if (l.id === 'bakken') {
      // Three members: black shale, the pale middle, black shale.
      const t = h * 0.24;
      body += `<path d="${edge(l.top + 6, width, rng, 2)} L${width} ${n(l.top + t)} L0 ${n(l.top + t)} Z" fill="#231f24"/><path d="${edge(l.bottom - t, width, rng, 3)} L${width} ${l.bottom + 8} L0 ${l.bottom + 8} Z" fill="#231f24"/>`;
      for (let i = count(2400, 60); i > 0; i--) body += `<circle cx="${n(r(0, width))}" cy="${n(r(l.top + t + 5, l.bottom - t - 5))}" r="${n(r(1, 2))}" fill="#9a8560"/>`;
    } else if (l.id === 'duvernay') {
      for (let y = l.top + 12; y < l.bottom - 4; y += r(9, 15)) body += `<path d="${edge(y, width, rng, 2)}" fill="none" stroke="#55495f" stroke-width="1.2"/>`;
    } else if (l.id === 'reef') {
      // A reef: rounded heads of limestone with pores full of oil, and oil pooled dark below.
      for (let i = count(2400, 46); i > 0; i--) { const x = r(0, width), y = r(l.top + 16, l.top + h * 0.6), rx = r(8, 18); body += `<ellipse cx="${n(x)}" cy="${n(y)}" rx="${n(rx)}" ry="${n(rx * r(0.6, 0.85))}" fill="#e3d7b6" stroke="#a8996f" stroke-width="1.4"/>`; }
      for (let i = count(1500, 80); i > 0; i--) { const x = r(0, width), y = r(l.top + 14, l.top + h * 0.66), s = r(2.2, 5); body += `<ellipse cx="${n(x)}" cy="${n(y)}" rx="${n(s)}" ry="${n(s * 0.8)}" fill="#2a1608" stroke="#c9861a" stroke-width="1.2"/>`; }
      const py = l.top + h * 0.66;
      body += `<path d="${edge(py, width, rng, 5)} L${width} ${l.bottom} L0 ${l.bottom} Z" fill="#1c0f06" stroke="#2a1a0c" stroke-width="2"/><path d="${edge(py + 7, width, rng, 3)}" fill="none" stroke="#c9861a" stroke-width="2" stroke-linecap="round" opacity="0.8"/>`;
      // The oil's sheen: a few soft amber streaks lying on the pool.
      for (let i = 0; i < 7; i++) { const x = r(8, width - 60), y = r(py + 18, l.bottom - 10); body += `<path d="M${n(x)} ${n(y)} q${n(r(10, 22))} ${n(-r(3, 6))} ${n(r(28, 54))} 0" fill="none" stroke="#8a5210" stroke-width="${n(r(2, 3.4))}" stroke-linecap="round" opacity="0.75"/>`; }
    }
    // The formation's top: one dark toy line (none over the grass).
    if (l.id !== 'grass') body += `<path d="${edge(l.top, width, mulberry32(seed + l.top), 4)}" fill="none" stroke="#2a1a0c" stroke-width="2.4" stroke-linecap="round" opacity="0.85"/>`;
    out += `<g class="stratum" data-layer="${l.id}">${body}</g>`;
  }
  // The wellbore: surface casing, then the hole down to the reservoir, with perforations at the bottom.
  const reef = layers.at(-1)!;
  const td = reef.top + (reef.bottom - reef.top) * 0.74;
  const shoe = layers[2].top + 30;
  out +=
    `<g class="wellbore" data-top="${Math.round(boreTop)}" data-td="${Math.round(td)}">` +
    // The wellhead standing on the grass: a spool, a master valve with its red handwheel, a cap.
    `<g class="wellhead" stroke="#2a1a0c" stroke-width="2" stroke-linejoin="round"><rect x="${bore - 8}" y="${boreTop - 5}" width="16" height="6" rx="1.5" fill="#6f7780"/><rect x="${bore - 5}" y="${boreTop - 17}" width="10" height="12" rx="2" fill="#9aa3ad"/><rect x="${bore - 3.5}" y="${boreTop - 22}" width="7" height="5" rx="1.5" fill="#6f7780"/><ellipse cx="${bore + 9}" cy="${boreTop - 11}" rx="2.6" ry="5" fill="#e5484d"/></g>` +
    `<path d="M${bore} ${boreTop} L${bore} ${n(td)}" stroke="#2a1a0c" stroke-width="8" stroke-linecap="round"/>` +
    `<path d="M${bore} ${boreTop} L${bore} ${n(td)}" stroke="#9aa3ad" stroke-width="3.6" stroke-linecap="round"/>` +
    `<path d="M${bore - 6.5} ${boreTop} L${bore - 6.5} ${n(shoe)} M${bore + 6.5} ${boreTop} L${bore + 6.5} ${n(shoe)}" stroke="#2a1a0c" stroke-width="2.4" stroke-linecap="round"/>` +
    `<path d="M${bore - 9} ${n(shoe)} l5 0 M${bore + 4} ${n(shoe)} l5 0" stroke="#2a1a0c" stroke-width="2.4" stroke-linecap="round"/>` +
    [0, 1, 2, 3].map((i) => `<path d="M${bore - 4} ${n(td - 8 - i * 9)} l-7 -3 M${bore + 4} ${n(td - 8 - i * 9)} l7 -3" stroke="#ffb02e" stroke-width="2" stroke-linecap="round"/>`).join('') +
    `</g>`;
  return `<svg class="strata" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}" preserveAspectRatio="none" aria-hidden="true">${out}</svg>`;
}

/** Where the oil glistens in the reservoir: a few glints (x across the section 0 to 1, y down the reef 0 to 1, size px, delay s). */
export const GLINTS: { x: number; y: number; size: number; delay: number }[] = [
  { x: 0.12, y: 0.8, size: 16, delay: 0 }, { x: 0.3, y: 0.9, size: 11, delay: 1.1 }, { x: 0.44, y: 0.78, size: 13, delay: 2.0 },
  { x: 0.63, y: 0.88, size: 17, delay: 0.6 }, { x: 0.8, y: 0.79, size: 12, delay: 1.6 }, { x: 0.92, y: 0.92, size: 10, delay: 2.5 },
  { x: 0.22, y: 0.3, size: 7, delay: 0.9 }, { x: 0.7, y: 0.4, size: 7, delay: 1.9 },
];

/**
 * The gopher's tunnel in the topsoil window, for cards `width` px wide: a tube from his den's floor
 * down and along to where the phone fell (one stroked path with the dark outline round it).
 */
export function tunnelSvg(width: number): string {
  const den = BURIED.find((b) => b.id === 'den')!, phone = BURIED.find((b) => b.id === 'phone')!, h = FORMATIONS.find((f) => f.id === 'topsoil')!.window;
  const x0 = den.x * width - 34, y0 = den.y + den.h / 2 - 12, x1 = phone.x * width + 4, y1 = phone.y + 2;
  const d = `M${x0.toFixed(1)} ${y0} C${x0.toFixed(1)} ${y1 + 6} ${(x0 + 10).toFixed(1)} ${y1 + 4} ${x1.toFixed(1)} ${y1}`;
  return `<svg class="dig-tunnel" viewBox="0 0 ${Math.round(width)} ${h}" width="${Math.round(width)}" height="${h}" aria-hidden="true"><path d="${d}" fill="none" stroke="#2a1a0c" stroke-width="31" stroke-linecap="round"/><path d="${d}" fill="none" stroke="#3a2516" stroke-width="26" stroke-linecap="round"/><path d="${d}" fill="none" stroke="#4b3220" stroke-width="12" stroke-linecap="round" opacity="0.6"/></svg>`;
}

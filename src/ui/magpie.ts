// The magpie gag as a code puppet, ported from the approved reference
// (~/Desktop/RHR Art Inbox/magpie_puppet_reference.html): the same parts, colours, outline,
// expressions, beats and timing. Pure: `pose(t)` says where every part is at a time in the gag,
// `fxAt(t)` what the dropping, splat, drip and feather are doing. magpie-gag.ts puts it on screen.
// Animation rules (GAME_BIBLE): he always faces the way he travels, crouches before every big move,
// squashes and stretches on landing and launch, moves on arcs, and leaves a feather behind.
import { SIZE, cabSide, type GameState, type Level, type Truck } from '../engine/index.ts';
export { MAGPIE_LINES } from './lines.ts';

const O = '#2b1e16';
/** The bird, drawn facing right in a 120 x 120 box, feet at (60, 108). */
export const BIRD = `
<g class="flip"><g class="root">
  <g class="tail">
    <path d="M46 82 L4 92 Q0 98 6 102 L50 92 Z" fill="#1d1c22" stroke="${O}" stroke-width="3" stroke-linejoin="round"/>
    <path d="M40 85 L10 92 L11 96 L42 89 Z" fill="#2f8f7a"/>
    <path d="M28 88 L12 92 L13 94.5 L30 91 Z" fill="#6a4c9c"/>
  </g>
  <g class="legs" stroke="${O}" stroke-width="3.2" stroke-linecap="round" fill="none">
    <path d="M55 96 L54 108 M48 108 L58 108 M66 96 L67 108 M62 108 L72 108"/>
  </g>
  <g class="body">
    <ellipse cx="60" cy="82" rx="25" ry="21" fill="#1d1c22" stroke="${O}" stroke-width="3"/>
    <path d="M44 72 Q52 64 64 64" stroke="#4a5063" stroke-width="3.5" fill="none" stroke-linecap="round"/>
    <path d="M55 82 Q58 104 78 94 Q86 84 80 74 Q66 70 55 82 Z" fill="#f7fafc" stroke="${O}" stroke-width="2.6" stroke-linejoin="round"/>
    <path d="M60 94 Q66 101 76 95 Q80 92 82 87 Q72 96 60 94 Z" fill="#d8dde8"/>
  </g>
  <g class="wing">
    <path d="M36 74 Q52 60 70 72 Q62 92 38 88 Z" fill="#245d8f" stroke="${O}" stroke-width="3" stroke-linejoin="round"/>
    <path d="M40 82 Q52 80 64 80 L62 84 Q50 85 39 86 Z" fill="#2f8f7a"/>
    <path d="M42 86 Q50 86 58 85 L56 87.5 Q48 88.5 42 88 Z" fill="#6a4c9c"/>
    <path d="M44 72 Q54 66 64 71 Q56 76 45 76 Z" fill="#f7fafc" stroke="${O}" stroke-width="2" stroke-linejoin="round"/>
  </g>
  <g class="head">
    <path d="M60 32 L56 22 L64 29 L64 19 L69 29" fill="#1d1c22" stroke="${O}" stroke-width="2.6" stroke-linejoin="round"/>
    <circle cx="70" cy="48" r="20" fill="#1d1c22" stroke="${O}" stroke-width="3"/>
    <path d="M56 40 Q60 32 70 30" stroke="#4a5063" stroke-width="3.5" fill="none" stroke-linecap="round"/>
    <g class="beak">
      <path class="upper" d="M86 44 Q98 45 104 50 Q96 52 86 52 Z" fill="#555a66" stroke="${O}" stroke-width="2.4" stroke-linejoin="round"/>
      <path class="lower" d="M86 52 Q95 52 100 52 Q94 56 86 56 Z" fill="#3e424c" stroke="${O}" stroke-width="2.2" stroke-linejoin="round"/>
    </g>
    <circle cx="78" cy="44" r="8.5" fill="#f7fafc" stroke="${O}" stroke-width="2.2"/>
    <circle class="pupil" cx="80.5" cy="44.5" r="4" fill="${O}"/>
    <circle class="glint" cx="82" cy="43" r="1.3" fill="#fff"/>
    <path class="lid" d="M68 34 L90 34 L90 40 L68 40 Z" fill="#1d1c22" stroke="${O}" stroke-width="2"/>
  </g>
</g></g>`;

export const SPLAT = `<svg viewBox="0 0 40 30" width="100%" height="100%"><path d="M8 15 Q4 6 14 8 Q18 1 25 6 Q35 4 33 14 Q38 22 28 23 Q22 29 15 24 Q5 25 8 15 Z" fill="#f7f5ee" stroke="${O}" stroke-width="2"/><circle cx="20" cy="15" r="3.2" fill="#d8d4c4"/><circle cx="37" cy="5" r="1.8" fill="#f7f5ee" stroke="${O}" stroke-width="1"/><circle cx="3" cy="25" r="1.5" fill="#f7f5ee" stroke="${O}" stroke-width="1"/></svg>`;
export const DRIP = `<svg viewBox="0 0 12 40" preserveAspectRatio="none" width="100%" height="100%" style="overflow:visible"><path d="M2 0 L10 0 Q8 18 8.6 30 A3.6 3.6 0 1 1 3.4 30 Q4 18 2 0 Z" fill="#f7f5ee" stroke="${O}" stroke-width="1.4" vector-effect="non-scaling-stroke"/></svg>`;
export const FEATHER = `<svg viewBox="0 0 30 12" width="100%" height="100%"><path d="M2 6 Q10 0 28 5 Q10 12 2 6 Z" fill="#245d8f" stroke="${O}" stroke-width="1.5"/><path d="M4 6 L27 5" stroke="#f7fafc" stroke-width="1"/></svg>`;

/** The bird's box is this share of the screen's width (about 37 px of bird at 390 px; a quarter smaller than the reference, after playing on a phone). */
export const BIRD_FRAC = 0.1125;
/** What he leaves behind keeps the reference's size: the splat and drip are measured in this share of the screen's width. */
export const MARK_FRAC = 0.15;

/** When each beat starts (seconds), and what it is (`data-beat` on the layer names the current one). */
export const BEATS: [number, string, string][] = [
  [0, 'fly-in', 'Flies in, facing the way he travels'],
  [1.7, 'land', 'Lands with a wobble and catches his balance'],
  [2.5, 'hop-turn', 'Hops around to face you'],
  [3.0, 'look', 'Cheeky look at the player, one blink'],
  [4.2, 'glance', 'Glances left, glances right'],
  [5.0, 'crouch', 'Crouch, tail goes up'],
  [5.4, 'strain', 'Strains while the dropping slowly swells'],
  [7.0, 'relief', 'Lets go. Sweet relief'],
  [7.3, 'peek', 'Peeks down to admire his work'],
  [8.0, 'smug', 'Smug chest puff and two chuckle bounces'],
  [9.6, 'wind-up', 'Crouches, wings up'],
  [9.9, 'launch', 'Launches forward and up, leaves a feather'],
  [11.8, 'gone', 'Gone. The splat and the feather stay a beat'],
];
/** The bird has left by GONE; the feather finishes drifting by END. */
export const GONE = 11.8;
export const END = 12.4;
/** Moments the runner acts on: touchdown, the splat hitting the roof, the driver's line. */
export const T_LAND = 1.7;
export const T_SPLAT = 7.12;
export const T_BUBBLE = 7.8;
/** The smug pose: the still used with reduced motion and on the Wildlife Log card. */
export const T_SMUG = 8.6;

export const beatAt = (t: number): string => BEATS.reduce((name, b) => (t >= b[0] ? b[1] : name), BEATS[0][1]);

const ease = (x: number) => (x < 0.5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2);
const clamp = (x: number, a = 0, b = 1) => Math.max(a, Math.min(b, x));
const seg = (t: number, a: number, b: number) => clamp((t - a) / (b - a));

export interface Pose {
  /** Offset from his spot on the roof, in drawing units (120 = the bird's box): x to the right, y down. */
  x: number;
  y: number;
  rot: number;
  sx: number;
  sy: number;
  /** 1 faces right, -1 faces left (its size dips a little mid hop-turn, never to paper-thin). */
  face: number;
  wing: number;
  tail: number;
  head: number;
  px: number;
  py: number;
  lid: string;
  beak: number;
  show: boolean;
  legsUp: boolean;
}

/**
 * How far he flies, in drawing units: in from (inX right, inY up) of his spot, and out to (outX
 * right, outY up). The reference's own distances are the default; the runner stretches them so he
 * starts and ends past the screen's edge.
 */
export interface Travel {
  inX: number;
  inY: number;
  outX: number;
  outY: number;
}
export const REFERENCE_TRAVEL: Travel = { inX: 300, inY: 230, outX: 330, outY: 240 };

const LID = 'M68 34 L90 34 L90 40 L68 40 Z';
const stand = (): Pose => ({ x: 0, y: 0, rot: 0, sx: 1, sy: 1, face: 1, wing: 0, tail: 0, head: 0, px: 80.5, py: 44.5, lid: LID, beak: 0, show: true, legsUp: false });

/** The whole gag: every part's position at time `t` (seconds). The reference's `pose`, as written. */
export function pose(t: number, travel: Travel = REFERENCE_TRAVEL): Pose {
  const p = stand();
  const flap = Math.sin(t * 2 * Math.PI * 6.5);
  if (t < 1.7) {
    // Fly in from the right, facing left (the direction of travel).
    const k = ease(seg(t, 0, 1.7));
    p.face = -1;
    p.x = (1 - k) * travel.inX;
    p.y = -(1 - k) * travel.inY - Math.sin(k * Math.PI) * 25;
    p.rot = 10 * (1 - k);
    p.wing = -55 + flap * 55;
    p.tail = -8 + flap * 4;
    p.legsUp = k < 0.85;
    p.lid = 'M68 34 L90 34 L90 38 L68 38 Z';
  } else if (t < 2.5) {
    // Land: squash, overshoot, wobble with wings out.
    const k = seg(t, 1.7, 2.5);
    p.face = -1;
    p.sy = 1 - Math.sin(clamp(k * 3) * Math.PI) * 0.22;
    p.sx = 2 - p.sy;
    p.rot = Math.sin(k * Math.PI * 3) * 9 * (1 - k);
    p.wing = -45 * (1 - k) + Math.sin(k * 30) * 10 * (1 - k);
    p.tail = Math.sin(k * Math.PI * 4) * 10 * (1 - k);
    p.lid = 'M68 34 L90 34 L90 41 L68 41 Z';
  } else if (t < 3.0) {
    // Hop-turn to face the player's side: he jumps, squashes a little at the top and snaps round in
    // one frame, so he never goes paper-thin.
    const k = seg(t, 2.5, 3.0);
    p.y = -Math.sin(k * Math.PI) * 16;
    const mag = 1 - 0.18 * Math.sin(k * Math.PI);
    p.face = (k < 0.5 ? -1 : 1) * mag;
    p.sy = 1 + 0.1 * Math.sin(k * Math.PI);
    p.wing = -35 * Math.sin(k * Math.PI);
    p.tail = 12 * Math.sin(k * Math.PI);
    p.legsUp = k > 0.2 && k < 0.8;
  } else if (t < 4.2) {
    // Cheeky look at the player, one blink.
    const k = seg(t, 3.0, 3.3);
    p.head = 7 * k;
    p.px = 78;
    p.py = 46;
    p.lid = 'M68 35 L90 39 L90 43 L68 41 Z'; // sly, slanted lid
    if (t > 3.7 && t < 3.82) p.lid = 'M68 34 L90 34 L90 53 L68 53 Z';
    p.beak = 3 * k;
  } else if (t < 5.0) {
    // Glance left, glance right.
    const k = seg(t, 4.2, 5.0);
    p.px = k < 0.45 ? 76 : k < 0.55 ? 78.5 : 82.5;
    p.head = k < 0.5 ? -6 : 6;
    p.lid = 'M68 36 L90 38 L90 42 L68 42 Z';
  } else if (t < 5.4) {
    // Anticipation: crouch, tail up.
    const k = ease(seg(t, 5.0, 5.4));
    p.sy = 1 - 0.1 * k;
    p.sx = 1 + 0.05 * k;
    p.tail = -32 * k;
    p.head = -4 * k;
    p.lid = 'M68 34 L90 37 L90 42 L68 42 Z';
    p.px = 79;
    p.py = 46;
  } else if (t < 7.0) {
    // Strain while the drop swells.
    const k = seg(t, 5.4, 7.0);
    p.sy = 0.9;
    p.sx = 1.05;
    p.tail = -32;
    p.head = -4;
    p.x = Math.sin(t * 60) * 0.9 * k; // a little shiver that builds
    p.lid = 'M68 34 L90 34 L90 46 L68 46 Z'; // eyes squeezed
    p.beak = -1;
  } else if (t < 7.3) {
    // Release, relief.
    const k = seg(t, 7.0, 7.3);
    p.sy = 0.9 + 0.2 * Math.sin(k * Math.PI);
    p.tail = -32 * (1 - k);
    p.head = 8 * k;
    p.lid = 'M68 34 L90 34 L90 47 L68 47 Z'; // blissful closed eyes
    p.beak = 4 * k;
  } else if (t < 8.0) {
    // Peek down at the splat.
    const k = seg(t, 7.3, 7.6);
    p.head = -14 * k;
    p.px = 77;
    p.py = 48;
    p.lid = 'M68 34 L90 36 L90 41 L68 40 Z';
  } else if (t < 9.6) {
    // Smug puff and two chuckle bounces.
    const k = seg(t, 8.0, 9.6);
    p.sx = p.sy = 1 + 0.07 * Math.min(1, k * 4);
    p.y = -Math.abs(Math.sin(clamp((k - 0.3) / 0.5) * Math.PI * 2)) * 5;
    p.head = 10;
    p.px = 79;
    p.py = 45;
    p.lid = 'M68 34 L90 38 L90 44 L68 42 Z';
    p.beak = 5;
  } else if (t < 9.9) {
    // Anticipation for take-off.
    const k = ease(seg(t, 9.6, 9.9));
    p.sy = 1 - 0.2 * k;
    p.sx = 1 + 0.1 * k;
    p.wing = -60 * k;
    p.head = -6 * k;
    p.tail = 10 * k;
    p.lid = 'M68 34 L90 34 L90 38 L68 38 Z';
  } else if (t < GONE) {
    // Launch forward and up, facing right, flapping.
    const k = seg(t, 9.9, GONE);
    const e = 1 - Math.pow(1 - k, 2);
    p.x = e * travel.outX;
    p.y = -(e * travel.outY) - Math.sin(k * Math.PI) * 30;
    p.rot = -18 * (1 - k) - 6;
    p.sy = 1 + 0.12 * Math.max(0, 1 - k * 6);
    p.sx = 2 - p.sy;
    p.wing = -55 + flap * 55;
    p.tail = 10 + flap * 4;
    p.legsUp = k > 0.08;
    p.lid = 'M68 34 L90 34 L90 38 L68 38 Z';
  } else p.show = false;
  return p;
}

/** How long the startle takes: feathers up, a hop, then off forward. */
export const STARTLE = { jump: 0.2, hop: 0.45, gone: 1.6 };
const WIDE = 'M68 34 L90 34 L90 35 L68 35 Z';

/**
 * His truck is grabbed mid-gag: from wherever he is (`from`), he startles (feathers up, wide eyed,
 * a jump), hop-turns to face right if he isn't already, and flies off forward early. `u` is seconds
 * since the startle; `out` is how far he must fly to clear the screen.
 */
export function startlePose(u: number, from: Pose, out: { x: number; y: number }): Pose {
  const p = stand();
  const flap = Math.sin(u * 2 * Math.PI * 7.5);
  const facingLeft = from.face < 0;
  p.x = from.x;
  p.y = Math.min(0, from.y);
  p.lid = WIDE;
  p.px = 80;
  p.py = 44.5;
  p.beak = 9;
  if (u < STARTLE.jump) {
    // Feathers up: he shoots up off his feet, stretched, wings and tail flung up.
    const k = seg(u, 0, STARTLE.jump);
    p.face = facingLeft ? -1 : 1;
    p.y += -14 * Math.sin(k * Math.PI * 0.5);
    p.sy = 1 + 0.22 * Math.sin(k * Math.PI);
    p.sx = 2 - p.sy;
    p.wing = -75 * k;
    p.tail = -40 * k;
    p.head = 12 * k;
    p.legsUp = k > 0.3;
  } else if (u < STARTLE.hop) {
    // A hop in the air; if he was facing left he snaps round to face the way he will leave.
    const k = seg(u, STARTLE.jump, STARTLE.hop);
    const mag = 1 - 0.18 * Math.sin(k * Math.PI);
    p.face = (facingLeft && k < 0.5 ? -1 : 1) * mag;
    p.y += -14 - 8 * Math.sin(k * Math.PI);
    p.wing = -75 + 30 * Math.sin(k * Math.PI * 2);
    p.tail = -40 * (1 - k);
    p.head = 12;
    p.legsUp = true;
  } else if (u < STARTLE.gone) {
    // Off forward and up, flapping hard.
    const k = seg(u, STARTLE.hop, STARTLE.gone);
    const e = 1 - Math.pow(1 - k, 2);
    p.x += e * out.x;
    p.y += -14 - e * out.y - Math.sin(k * Math.PI) * 24;
    p.rot = -20 * (1 - k) - 6;
    p.wing = -55 + flap * 55;
    p.tail = 10 + flap * 4;
    p.legsUp = true;
    p.lid = 'M68 34 L90 34 L90 37 L68 37 Z';
    p.beak = 4;
  } else p.show = false;
  return p;
}

/** What the dropping, the splat, the drip and the feather are doing at time `t` (all in bird widths). */
export function fxAt(t: number): { drop: { len: number; fall: number } | null; splat: boolean; drip: number | null; feather: { x: number; y: number; rot: number } | null } {
  const feather = (() => {
    if (t <= 10.0 || t >= END) return null;
    const k = seg(t, 10.0, 12.2);
    return { x: 0.1 + Math.sin(k * Math.PI * 3) * 0.18, y: -0.9 + k * 0.82, rot: Math.sin(k * Math.PI * 3) * 35 };
  })();
  return {
    // The drop forms under the lifted tail, swelling slowly, then falls to the roof.
    drop: t > 5.5 && t < 7.15 ? { len: 0.03 + 0.09 * seg(t, 5.5, 7.0), fall: seg(t, 7.0, 7.15) } : null,
    splat: t > T_SPLAT,
    // The drip runs slowly toward the truck's front: its length, growing.
    drip: t > 7.4 ? 0.08 + 0.16 * ease(seg(t, 7.4, 11.0)) : null,
    feather,
  };
}
/** The drip at its longest (where it stays once the bird has gone). */
export const DRIP_FULL = 0.24;

/** The transforms for a pose, as attributes on the bird's parts (the reference's `applyBird`). */
export function poseAttrs(p: Pose): Record<'flip' | 'root' | 'wing' | 'tail' | 'head' | 'lower', string> {
  return {
    flip: `translate(60 0) scale(${p.face} 1) translate(-60 0)`,
    root: `translate(${p.x * p.face} ${p.y}) rotate(${p.rot} 60 108) translate(60 108) scale(${p.sx} ${p.sy}) translate(-60 -108)`,
    wing: `rotate(${p.wing} 48 72)`,
    tail: `rotate(${p.tail} 48 86)`,
    head: `rotate(${p.head} 64 64)`,
    lower: `rotate(${p.beak} 86 53)`,
  };
}

/** The bird as a still drawing in a pose (the Wildlife Log card uses the smug one). */
export function magpieStill(p: Pose = pose(T_SMUG)): string {
  const a = poseAttrs(p);
  const art = BIRD.replace('<g class="flip">', `<g class="flip" transform="${a.flip}">`)
    .replace('<g class="root">', `<g class="root" transform="${a.root}">`)
    .replace('<g class="wing">', `<g class="wing" transform="${a.wing}">`)
    .replace('<g class="tail">', `<g class="tail" transform="${a.tail}">`)
    .replace('<g class="head">', `<g class="head" transform="${a.head}">`)
    .replace('<path class="lower"', `<path class="lower" transform="${a.lower}"`)
    .replace(/(<circle class="pupil" cx=")[^"]*(" cy=")[^"]*"/, `$1${p.px}$2${p.py}"`)
    .replace(/(<circle class="glint" cx=")[^"]*(" cy=")[^"]*"/, `$1${p.px + 1.5}$2${p.py - 1.5}"`)
    .replace(/(<path class="lid" d=")[^"]*"/, `$1${p.lid}"`);
  return `<svg class="magpie-still" viewBox="0 0 120 120" aria-hidden="true">${art}</svg>`;
}

/**
 * How far he must fly to start and end fully off screen, in drawing units. `spot` is his place on
 * the roof and `w` the bird's box, in screen px. He comes in from the upper right and leaves to the
 * upper right, on the reference's own headings, stretched just far enough that his whole box is past
 * the screen's right or top edge (whichever comes first), and never shorter than the reference.
 */
export function travelFor(spot: { x: number; y: number }, w: number, screenW: number): Travel {
  const unit = w / 120;
  const needX = (screenW - spot.x + w * 0.75) / unit;
  const needY = (spot.y + w * 0.4) / unit;
  const stretch = (x: number, y: number) => Math.max(1, Math.min(needX / x, needY / y));
  const a = stretch(REFERENCE_TRAVEL.inX, REFERENCE_TRAVEL.inY);
  const b = stretch(REFERENCE_TRAVEL.outX, REFERENCE_TRAVEL.outY);
  return { inX: REFERENCE_TRAVEL.inX * a, inY: REFERENCE_TRAVEL.inY * a, outX: REFERENCE_TRAVEL.outX * b, outY: REFERENCE_TRAVEL.outY * b };
}

/** Is the bird's whole box off the screen (past its right edge or above its top)? */
export function offScreen(p: Pose, spot: { x: number; y: number }, w: number, screenW: number): boolean {
  const unit = w / 120;
  const left = spot.x - 0.5 * w + p.x * unit;
  const bottom = spot.y - 0.9 * w + p.y * unit + w;
  return left >= screenW || bottom <= 0;
}

/** Where on a truck he lands: the middle of its cab roof, in cells from the pad's top-left corner. */
export function roofSpot(level: Level, t: Truck): { x: number; y: number } {
  const side = cabSide(level, t);
  const along = side === 'right' || side === 'bottom' ? t.length - 0.5 : 0.5;
  return t.orient === 'h' ? { x: t.col + along, y: t.row + 0.5 } : { x: t.col + 0.5, y: t.row + along };
}

/**
 * The truck he picks: one still on the pad whose roof is clear of the board's edge (at least a cell
 * in from every side, so the bird, the splat and the driver's bubble all have room); if there is no
 * such truck, the one whose roof is furthest in.
 */
export function pickTruck(state: GameState, random: () => number = Math.random): Truck | null {
  if (!state.trucks.length) return null;
  const inFrom = (t: Truck) => {
    const s = roofSpot(state.level, t);
    return Math.min(s.x, s.y, SIZE - s.x, SIZE - s.y);
  };
  const clear = state.trucks.filter((t) => inFrom(t) >= 1);
  if (clear.length) return clear[Math.floor(random() * clear.length)];
  return state.trucks.reduce((best, t) => (inFrom(t) > inFrom(best) ? t : best));
}

/** Which way the drip runs: toward the truck's front (its cab), as degrees turned from "down the screen". */
export const dripTurn = (cab: 'top' | 'right' | 'bottom' | 'left'): number => ({ bottom: 0, left: 90, top: 180, right: -90 })[cab];

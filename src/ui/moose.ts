// The moose peekaboo as a code puppet, ported from the approved reference
// (~/Desktop/RHR Art Inbox/worker_moose_puppet_reference.html): the same drawing, poses, beats and
// timing. Pure. He rises from BEHIND the top berm (egg-gags.ts clips him at it), blinks, chews,
// stares, flicks an ear, groans, and ducks; snow drops off an antler behind the berm.
/* eslint-disable */
import { SIZE, type Gate } from '../engine/index.ts';
const O = '#2b1e16';
const ease = (x: number) => (x < 0.5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2);
const clamp = (x: number, a = 0, b = 1) => Math.max(a, Math.min(b, x));
const seg = (t: number, a: number, b: number) => clamp((t - a) / (b - a));
const lerp = (a: number, b: number, k: number) => a + (b - a) * k;

// ---------- The drawing (the reference's, as written) ----------
const MB='#4a3222', MB2='#6b4a33', MUZ='#5c3f2b', ANT='#d8b27a', ANT2='#b58e57';
const antler = () => `<g>
  <path d="M46 42 Q38 40 34 34 Q24 36 12 30 Q8 27 10 22 L14 24 L13 17 L18 21 L19 13 L24 19 L27 12 L30 19 L35 15 L36 23 Q42 27 48 36 Z" fill="${ANT}" stroke="${O}" stroke-width="2.6" stroke-linejoin="round"/>
  <path d="M16 27 Q26 31 34 30" stroke="${ANT2}" stroke-width="3" fill="none" stroke-linecap="round"/>
  <path d="M15 22 Q18 18 22 20 Q25 16 29 19 L29 22 L15 24 Z" fill="#fff" stroke="${O}" stroke-width="1.4"/>
</g>`;
export const MOOSE = `
<g class="root">
  <rect x="45" y="86" width="30" height="40" fill="${MB}" stroke="${O}" stroke-width="3"/>
  <g class="antL">${antler()}</g>
  <g class="antR" transform="translate(120 0) scale(-1 1)">${antler()}</g>
  <g class="earL" transform="translate(45 47)"><path d="M0 0 Q-12 -6 -18 2 Q-10 7 0 5 Z" fill="${MB}" stroke="${O}" stroke-width="2.4" stroke-linejoin="round"/><path d="M-3 1.5 Q-9 -1 -13 2" stroke="${MB2}" stroke-width="2" fill="none"/></g>
  <g class="earR" transform="translate(75 47)"><path d="M0 0 Q12 -6 18 2 Q10 7 0 5 Z" fill="${MB}" stroke="${O}" stroke-width="2.4" stroke-linejoin="round"/><path d="M3 1.5 Q9 -1 13 2" stroke="${MB2}" stroke-width="2" fill="none"/></g>
  <path d="M44 44 Q44 36 60 36 Q76 36 76 44 L74 64 Q80 70 80 82 Q80 98 60 98 Q40 98 40 82 Q40 70 46 64 Z" fill="${MB}" stroke="${O}" stroke-width="3" stroke-linejoin="round"/>
  <path d="M50 42 Q55 39 62 39" stroke="${MB2}" stroke-width="3" fill="none" stroke-linecap="round"/>
  <g class="muzzle"><path d="M45 78 Q45 70 60 70 Q75 70 75 78 Q75 94 60 94 Q45 94 45 78 Z" fill="${MUZ}" stroke="${O}" stroke-width="2.2"/>
    <ellipse cx="53.5" cy="84" rx="3" ry="4" fill="${O}"/><ellipse cx="66.5" cy="84" rx="3" ry="4" fill="${O}"/></g>
  <g class="jaw"><path class="lip" d="M51 95 Q60 100 69 95" stroke="${O}" stroke-width="2.4" fill="none" stroke-linecap="round"/></g>
  <circle cx="50" cy="54" r="5.4" fill="#fff" stroke="${O}" stroke-width="2"/><circle cx="70" cy="54" r="5.4" fill="#fff" stroke="${O}" stroke-width="2"/>
  <circle class="pL" cx="50.5" cy="55" r="2.6" fill="${O}"/><circle class="pR" cx="69.5" cy="55" r="2.6" fill="${O}"/>
  <path class="lidL" d="M44 48 L56 48 L56 54 L44 54 Z" fill="${MB}" stroke="${O}" stroke-width="1.6"/>
  <path class="lidR" d="M64 48 L76 48 L76 54 L64 54 Z" fill="${MB}" stroke="${O}" stroke-width="1.6"/>
</g>`;


export const M_BEATS: [number, string, string][] = [
  [0, 'tips', 'Ears and antler tips appear over the berm'],
  [0.6, 'rise', 'Head rises slowly'],
  [1.4, 'blink', 'Slow, heavy blink'],
  [1.9, 'chew', 'Chews once, jaw side to side'],
  [2.4, 'stare', 'Deadpan stare at you, one ear flick'],
  [3.5, 'groan', 'Low groan: "Mmrrph"'],
  [4.3, 'duck', 'Tiny lift, then ducks down. Snow falls off an antler'],
  [4.8, 'gone', 'Gone'],
];
/** He is down by 4.8; the snow has finished falling by END. */
export const M_END = 5.7;
export const MOOSE_LINE = 'Mmrrph';
/** The still used with reduced motion and on the Wildlife Log card: the deadpan stare. */
export const T_STARE = 2.6;
/** His box is this share of the screen's width (about 45 px of antler span at 390 px). */
export const MOOSE_FRAC = 0.135;
/** Bumps into the top berm, in one level, that bring him up. */
export const MOOSE_BUMPS = 2;
export const mBeatAt = (t: number): string => M_BEATS.reduce((name, b) => (t >= b[0] ? b[1] : name), M_BEATS[0][1]);

export interface MoosePose { y: number; jaw: number; mz: number; lid: number; ear: number; lip: string; px: number; py: number; puff: number; bub: boolean }

/** The whole gag at time `t` (seconds). The reference's `mPose`, as written. */
export function mPose(t: number): MoosePose {
  const p: MoosePose = {y:100, jaw:0, mz:0, lid:6, ear:0, lip:'M51 95 Q60 100 69 95', px:0, py:0, puff:-1, bub:false};
  if (t < .6) p.y = lerp(100, 62, ease(seg(t,0,.6)));
  else if (t < 1.4) p.y = lerp(62, 0, ease(seg(t,.6,1.4)));
  else if (t < 4.3) p.y = 0;
  else if (t < 4.45) p.y = -4*Math.sin(seg(t,4.3,4.45)*Math.PI/2);
  else if (t < 4.8) p.y = lerp(-4, 105, ease(seg(t,4.45,4.8)));
  else p.y = 110;
  if (t > 1.4 && t < 1.9){ const k = seg(t,1.4,1.9); p.lid = 6 + Math.sin(k*Math.PI)*7; }       // slow heavy blink
  if (t > 1.9 && t < 2.4){ const k = seg(t,1.9,2.4); p.jaw = Math.sin(k*Math.PI*2)*2.6; p.mz = Math.sin(k*Math.PI*2)*1; }
  if (t > 2.9 && t < 3.15) p.ear = Math.sin(seg(t,2.9,3.15)*Math.PI)*28;
  if (t > 3.5 && t < 4.3){ p.lip = 'M52 96 Q60 94 68 96 Q60 102 52 96 Z'; p.bub = true; p.lid = 7; }
  if (t > 4.4 && t < 5.6) p.puff = seg(t,4.4,5.4);
  return p;
}

/** The attributes for a pose (the reference's `mApply`). */
export function mooseFrame(p: MoosePose) {
  return {
    root: `translate(0 ${p.y})`,
    jaw: `translate(${p.jaw} ${p.lip.includes('Z') ? 1 : 0})`,
    muzzle: `translate(${p.mz} 0)`,
    lip: p.lip,
    lipFill: p.lip.includes('Z') ? '#2b1e16' : 'none',
    lidL: `M44 48 L56 48 L56 ${48 + p.lid} L44 ${48 + p.lid} Z`,
    lidR: `M64 48 L76 48 L76 ${48 + p.lid} L64 ${48 + p.lid} Z`,
    earL: `translate(45 47) rotate(${-p.ear})`,
  };
}

/** The three snow chunks at `k` (0..1 of their fall): offsets from his spot in box widths, and opacity. */
export const snowChunks = (k: number) => [0, 1, 2].map((i) => ({ x: 0.27 + i * 0.04 + Math.sin(k * 6 + i) * 0.02, y: -0.62 + k * k * 0.62 + i * 0.02, opacity: k < 0.9 ? 1 : (1 - k) * 10 }));

/**
 * Which column of the top berm he rises behind: one with no gate in it or right beside it (so he
 * never comes up through a gate), as near the reference's spot (0.31 of the way across) as there is.
 */
export function mooseColumn(gates: readonly Pick<Gate, 'side' | 'index'>[]): number {
  const top = new Set(gates.filter((g) => g.side === 'top').map((g) => g.index));
  const want = 0.31 * (SIZE + 0.84) - 0.42 - 0.5;
  const free = Array.from({ length: SIZE }, (_, c) => c).filter((c) => !top.has(c));
  const pool = free.length ? free : Array.from({ length: SIZE }, (_, c) => c);
  return pool.reduce((best, c) => (Math.abs(c - want) < Math.abs(best - want) ? c : best));
}

/** A bump that counts toward the moose: a truck pushed up into the top berm (not into a truck or equipment). */
export const isTopBermBump = (orient: 'h' | 'v', direction: 1 | -1, hit: string): boolean => orient === 'v' && direction === -1 && (hit === 'wall' || hit === 'convoy');

/** The moose as a still drawing (the Wildlife Log card: the stare), cut off at the chin as the berm cuts him. */
export function mooseStill(t: number = T_STARE): string {
  const f = mooseFrame(mPose(t));
  const art = MOOSE.replace('<g class="root">', `<g class="root" transform="${f.root}">`)
    .replace(/(<path class="lidL" d=")[^"]*"/, `$1${f.lidL}"`).replace(/(<path class="lidR" d=")[^"]*"/, `$1${f.lidR}"`);
  return `<svg class="moose-still" viewBox="0 6 120 102" aria-hidden="true">${art}</svg>`;
}

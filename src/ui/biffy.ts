// The biffy (permanent scenery in the bottom strip of every level) and its two gags, as code puppets
// ported from the approved reference (~/Desktop/RHR Art Inbox/biffy_reference.html): the same
// drawings, poses, beats and timing.
//   Gag 6, Biffy A "Occupied": the door bangs open on a worker, back to us; the wide-eyed look over
//   his shoulder; he reaches back and pulls the door shut; the indicator flips to red, and a moment
//   later clicks back to green.
//   Gag 7, Biffy B "The runaway roll": the door bangs open, the roll tumbles out and rolls smoothly
//   away; an arm gropes around out of the dark; he shuffles out after it, pants at his ankles, a
//   strip of paper on his boot; the door creaks shut and the indicator flips to green.
// SAME START, SAME END (Jay, Oct 5): the indicator is green at rest and is always back to green by
// a gag's last frame (in B it goes red at the jolt: somebody is in there).
// After playing on a phone (Jay, Oct 5), on top of the reference: the biffy is drawn `BIFFY_SIZE`
// (a fifth smaller; the shuffler keeps his size); the truck's bump SHAKES it before the door opens,
// a small shake for A (one bump) and two bigger ones for B (two bumps); A's embarrassment flushes
// his whole face dark pink (no cheek blush); in B the roll rolls out from behind the door, flat
// along the ground at one constant speed, and the roll and the shuffler both leave by the screen
// edge NEAREST the biffy (the biffy stands in the strip's corner, right up at the berm).
// strip-gags.ts puts them on screen.
/* eslint-disable */
import { addEl, makePup, place, type Pup } from './puppet-stage.ts';
const O = '#2b1e16';
const ease = (x: number) => (x < 0.5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2);
const clamp = (x: number, a = 0, b = 1) => Math.max(a, Math.min(b, x));
const seg = (t: number, a: number, b: number) => clamp((t - a) / (b - a));
const lerp = (a: number, b: number, k: number) => a + (b - a) * k;
const FLUSH = '#e07a6c';
const mixC = (a: string, b: string, k: number) => { const pa = [1,3,5].map(i => parseInt(a.slice(i,i+2),16)), pb = [1,3,5].map(i => parseInt(b.slice(i,i+2),16)); return '#' + pa.map((v,i) => Math.round(v + (pb[i]-v)*k).toString(16).padStart(2,'0')).join(''); };
// The man in the biffy is SLOW MOE (STANDING_RULES 11): orange FR coveralls, stubble, droopy lids, hat tipped back.
const BL='#3d7cc9', BL2='#2d62a6', RED='#e8862e', RED2='#bf6418', DARK='#8a4513', FACE='#e58f7a', STUB='#9c7656', STRIPE='#d5dbe2', SKIN='#f0c09a', BUM='#f3b39b', HAT='#f2c230', BOOT='#5a3a24';

/* ---------------- the biffy (front view, door hinged on the left) ---------------- */
const DOOR = `<g class="door">
    <rect x="22" y="38" width="56" height="94" fill="${BL}" stroke="${O}" stroke-width="2.6"/>
    <path d="M30 50 L70 50 M30 55 L70 55 M30 60 L70 60" stroke="${BL2}" stroke-width="2.6"/>
    <rect class="ind" x="44" y="41" width="12" height="5" rx="1.5" fill="#56b05a" stroke="${O}" stroke-width="1.6"/>
    <rect x="66" y="84" width="5" height="12" rx="2" fill="#d5dbe2" stroke="${O}" stroke-width="1.6"/>
    <path d="M28 70 Q34 66 40 68" stroke="#6fa2e0" stroke-width="3" fill="none" stroke-linecap="round"/>
  </g>`;
export function biffy(withOccupant: boolean): string { return `
<g class="root">
  <rect x="14" y="26" width="72" height="108" rx="6" fill="${BL}" stroke="${O}" stroke-width="3"/>
  <path d="M18 120 L82 120 L82 130 L18 130 Z" fill="${BL2}"/>
  <path d="M10 28 Q12 10 50 8 Q88 10 90 28 Z" fill="#f2f1ea" stroke="${O}" stroke-width="3" stroke-linejoin="round"/>
  <path d="M24 20 Q34 13 48 12" stroke="#ffffff" stroke-width="3" fill="none" stroke-linecap="round"/>
  <rect x="22" y="38" width="56" height="94" fill="#1c2633" stroke="${O}" stroke-width="2.4"/>
  ${withOccupant ? `
  <g class="occ">
    <path d="M42 120 L42 128 M58 120 L58 128" stroke="${SKIN}" stroke-width="7"/>
    <rect x="36" y="117" width="28" height="9" rx="4" fill="${DARK}" stroke="${O}" stroke-width="2.2"/><path d="M39 121.5 H61" stroke="${STRIPE}" stroke-width="1.6"/>
    <path d="M36 128 L48 128 L48 132 L34 132 Z M52 128 L64 128 L66 132 L52 132 Z" fill="${BOOT}" stroke="${O}" stroke-width="1.8"/>
    <path d="M42 100 L42 119 M58 100 L58 119" stroke="${O}" stroke-width="9.5" stroke-linecap="round"/><path d="M42 100 L42 119 M58 100 L58 119" stroke="${SKIN}" stroke-width="6.5" stroke-linecap="round"/>
    <circle cx="45" cy="100" r="7.5" fill="${BUM}" stroke="${O}" stroke-width="2.2"/><circle cx="55" cy="100" r="7.5" fill="${BUM}" stroke="${O}" stroke-width="2.2"/>
    <rect x="35" y="66" width="30" height="32" rx="10" fill="${RED}" stroke="${O}" stroke-width="2.6"/>
    <rect x="35.5" y="82" width="29" height="4" fill="${STRIPE}" stroke="${O}" stroke-width="1.2"/>
    <g class="armR"><path d="M37 72 L33 88" stroke="${O}" stroke-width="9" stroke-linecap="round"/><path d="M37 72 L33 88" stroke="${RED}" stroke-width="5.6" stroke-linecap="round"/></g>
    <path d="M63 72 L67 88" stroke="${O}" stroke-width="9" stroke-linecap="round"/><path d="M63 72 L67 88" stroke="${RED}" stroke-width="5.6" stroke-linecap="round"/>
    <g class="reach" style="display:none"><path class="reachArm" d="M37 74 L12 80" stroke="${O}" stroke-width="9" stroke-linecap="round"/><path class="reachArm2" d="M37 74 L12 80" stroke="${RED}" stroke-width="5.6" stroke-linecap="round"/>
      <circle class="reachHand" cx="12" cy="80" r="4.4" fill="#e0a43a" stroke="${O}" stroke-width="2"/></g>
    <g class="headBack"><circle cx="50" cy="56" r="12" fill="${SKIN}" stroke="${O}" stroke-width="2.6"/>
      <circle cx="38.5" cy="57" r="3" fill="${SKIN}" stroke="${O}" stroke-width="1.8"/><circle cx="61.5" cy="57" r="3" fill="${SKIN}" stroke="${O}" stroke-width="1.8"/>
      <path d="M39 52 Q50 47 61 52 Q62 62 56 66 Q50 68 44 66 Q38 62 39 52 Z" fill="#7a4f2e" stroke="${O}" stroke-width="1.8" stroke-linejoin="round"/></g>
    <g class="headTurn" style="display:none"><circle class="skin" cx="51" cy="56" r="12" fill="${SKIN}" stroke="${O}" stroke-width="2.6"/>
      <circle class="skin" cx="40" cy="57" r="3" fill="${SKIN}" stroke="${O}" stroke-width="1.8"/>
      <circle class="tEye" cx="57" cy="53" r="4.6" fill="#fff" stroke="${O}" stroke-width="1.8"/><circle class="tPup" cx="58.3" cy="53.4" r="1.9" fill="${O}"/>
      <path class="tBrow" d="M53 46 Q57 44 61 46" stroke="#7a4f2e" stroke-width="2.2" fill="none" stroke-linecap="round"/>
      <path class="lidA" d="M52.4 52.2 A4.6 4.6 0 0 1 61.6 52.2 Z" fill="${SKIN}" stroke="${O}" stroke-width="1.5" stroke-linejoin="round"/>
      <path d="M47 61 Q51 67.5 58 66.5 Q61.5 64.5 62 60 Q55 64 47 61 Z" fill="${STUB}" opacity=".55"/><path d="M51 63.6 h.1 M55 65 h.1 M58.6 63.8 h.1" stroke="${O}" stroke-width="1.2" stroke-linecap="round" opacity=".6"/>
      <path class="skin" d="M61 56 Q64 56 63 60" fill="${SKIN}" stroke="${O}" stroke-width="1.6"/>
      <path d="M66 47 Q68 51 66 53 Q64 51 66 47 Z" fill="#9fd3f2" stroke="${O}" stroke-width="1.2"/></g>
    <g class="hat"><g transform="translate(0 -2.5)"><path d="M37 50 Q37 38 50 38 Q63 38 63 50 Z" fill="${HAT}" stroke="${O}" stroke-width="2.4"/><rect x="34" y="48" width="32" height="4" rx="2" fill="${HAT}" stroke="${O}" stroke-width="2"/></g></g>
  </g>` : ''}
  ${DOOR}
</g>`; }

/* ---------------- the shuffler (true side profile, facing right; Slow Moe) ----------------
   QUALITY PASS (Jay, Oct 8), to read at phone size: bent forward, his near hand holding the waistband of the pants
   bunched at his ankles (ONE CLEAR DARK BAND), his far arm out after the roll, his whole face flushed, an O for a
   mouth, a strip of paper trailing from his back boot. The skeleton is the reference's (hips at 54,84 and 62,84, the
   far arm about 70,66, the head about 80,62), so both gags that use him move him as before. The porcupine's worker
   is this same drawing with quills, his near hand clutching his bum instead (`shuffler(quills, true)`). */
export const shuffler = (extra = '', clutch = false): string => { const ARM = (c: string) => `<g class="arm"><path d="M70 66 L84 76 L90 74" stroke="${O}" stroke-width="8.5" stroke-linecap="round" stroke-linejoin="round" fill="none"/><path d="M70 66 L84 76 L90 74" stroke="${c}" stroke-width="5.2" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
      <circle cx="91" cy="74" r="4.2" fill="#e0a43a" stroke="${O}" stroke-width="2"/></g>`; return `
<g class="root">
  <g class="tpTail"><path class="tpStrip" d="M46 106 Q32 111 14 107" stroke="${O}" stroke-width="7" fill="none" stroke-linecap="round"/><path class="tpStrip2" d="M46 106 Q32 111 14 107" stroke="#fbfbf6" stroke-width="4.5" fill="none" stroke-linecap="round"/></g>
  <g class="legB" transform="translate(54 84)"><path d="M0 0 L0 17" stroke="${O}" stroke-width="9" stroke-linecap="round"/><path d="M0 0 L0 17" stroke="${SKIN}" stroke-width="6" stroke-linecap="round"/>
    <path d="M-5 19 L8 19 Q12 19 12 24 L-5 24 Z" fill="${BOOT}" stroke="${O}" stroke-width="2"/></g>
  <g class="legF" transform="translate(62 84)"><path d="M0 0 L0 17" stroke="${O}" stroke-width="9" stroke-linecap="round"/><path d="M0 0 L0 17" stroke="${SKIN}" stroke-width="6" stroke-linecap="round"/>
    <path d="M-5 19 L8 19 Q12 19 12 24 L-5 24 Z" fill="${BOOT}" stroke="${O}" stroke-width="2"/></g>
  <g class="bunch">
    <path d="M45 93 Q46 90 50 90.5 Q54 88.5 58 90.5 Q62 88.5 66 90.5 Q70 89.5 73 92 Q76 96 73 101 Q70 104 66 103 Q62 104.5 58 103 Q54 104.5 50 103 Q46 104 44.5 100 Q43 96 45 93 Z" fill="${DARK}" stroke="${O}" stroke-width="2.4" stroke-linejoin="round"/>
    <path d="M48 99.5 H70" stroke="${STRIPE}" stroke-width="2"/><path d="M52 92.5 Q53 95 52 97 M60 92.5 Q61 95 60 97 M67 92.5 Q68 95 67 97" stroke="${O}" stroke-width="1.2" fill="none" opacity=".7"/>
  </g>
  <g class="upper">
    ${clutch ? '' : ARM(RED2)}
    <path d="M44 84 Q42 72 52 70 Q58 72 58 82 Q52 90 44 84 Z" fill="${BUM}" stroke="${O}" stroke-width="2.4"/>
    ${extra}
    <g transform="rotate(52 58 82)">
      <rect x="46" y="52" width="24" height="32" rx="9" fill="${RED}" stroke="${O}" stroke-width="2.6"/>
      <rect x="46.5" y="68" width="23" height="4" fill="${STRIPE}" stroke="${O}" stroke-width="1.2"/>
    </g>
    ${clutch ? ARM(RED) : `<g class="hold"><path d="M57 90.5 L64.5 85 L71 90.5 Z" fill="${DARK}" stroke="${O}" stroke-width="2" stroke-linejoin="round"/>
      <path d="M73 68 L65.5 84" stroke="${O}" stroke-width="8.5" stroke-linecap="round"/><path d="M73 68 L65.5 84" stroke="${RED}" stroke-width="5.2" stroke-linecap="round"/>
      <circle cx="65" cy="85.5" r="4.4" fill="#e0a43a" stroke="${O}" stroke-width="2"/></g>`}
    <g class="head">
      <circle cx="71.5" cy="56" r="3.2" fill="${FACE}" stroke="${O}" stroke-width="1.8"/>
      <circle cx="82" cy="54" r="12.5" fill="${FACE}" stroke="${O}" stroke-width="2.6"/>
      <path d="M73.5 60 Q77 67 85 66.5 Q91 65.5 93.5 59 Q85 63.5 73.5 60 Z" fill="${STUB}" opacity=".6"/><path d="M78 63.4 h.1 M82 65 h.1 M86 64.6 h.1 M90 62.6 h.1" stroke="${O}" stroke-width="1.2" stroke-linecap="round" opacity=".6"/>
      <circle cx="93.5" cy="56" r="3" fill="#d7806c" stroke="${O}" stroke-width="1.6"/>
      <circle cx="86" cy="50" r="4.6" fill="#fff" stroke="${O}" stroke-width="1.8"/><circle class="pupil" cx="87.5" cy="51" r="1.9" fill="${O}"/>
      <path d="M81.4 49.4 A4.6 4.6 0 0 1 90.6 49.4 Z" fill="${FACE}" stroke="${O}" stroke-width="1.6" stroke-linejoin="round"/>
      <path d="M81 44.5 Q85 41 90.5 42.5" stroke="#7a4f2e" stroke-width="2.4" fill="none" stroke-linecap="round"/>
      <ellipse class="mouth" cx="88" cy="61.2" rx="2.5" ry="3.2" fill="#7a2a22" stroke="${O}" stroke-width="1.6"/>
      <g transform="rotate(-13 82 47)"><path d="M71 47 Q71 35 82 35 Q93 35 93 47 Z" fill="${HAT}" stroke="${O}" stroke-width="2.4"/><rect x="69" y="45" width="28" height="4" rx="2" fill="${HAT}" stroke="${O}" stroke-width="2"/></g>
    </g>
  </g>
</g>`; };
export const SHUFFLER = shuffler();

export const ROLL = `<svg viewBox="0 0 20 20" width="100%" height="100%"><circle cx="10" cy="10" r="8.5" fill="#fbfbf6" stroke="${O}" stroke-width="2"/><circle cx="10" cy="10" r="3.2" fill="#b9a98a" stroke="${O}" stroke-width="1.4"/><path d="M10 1.5 L10 6.8" stroke="#d9d6cc" stroke-width="1.4"/></svg>`;


export const A_BEATS: [number, string, string][] = [
  [0, 'sits', 'Biffy sits there'], [0.3, 'jolt', 'Truck bump: a small shake'], [0.5, 'door-open', 'Door bangs open'], [0.75, 'oblivious', 'Back to us, bum out, swaying, oblivious'],
  [1.7, 'look-back', 'Freezes. Slowly looks over his shoulder'], [1.95, 'eye-pop', 'Eye pops wide, his whole face flushes dark pink'], [2.3, 'nod', 'Awkward little nod'],
  [2.7, 'reach', 'Calmly reaches back for the door'], [3.1, 'pull-shut', 'Pulls it shut'], [3.55, 'occupied', 'Indicator flips to red. One last rock'], [4.5, 'done', 'Nothing to see here'],
  [5.0, 'unlocked', 'A click: the indicator flips back to green, as it began'],
];
export const A_END = 5.4;
/**
 * B's clock. The reference sent the roll and the shuffler the long way, off the far edge; they now
 * leave by the near one at the reference's own pace, so the shuffle is shorter (`B_OFF`) and the
 * door shuts sooner (`B_SHUT`). QUALITY PASS (Jay, Oct 8): the biffy stands a few steps from that edge, and at the
 * old pace he was gone in half a second; tiny steps cover little ground, so he takes 2.6 s over it and can be read.
 */
export const B_ROLL_OFF = 2.6, B_OFF = 5.5, B_SHUT = 5.8;
/** The door's width (1 shut, -0.42 wide open) under which it no longer covers the roll in the doorway: from then the roll is drawn in front. */
export const ROLL_CLEAR = 0.25;
/** The shuffle: steps a second (tiny and fast), the swing of a leg in degrees, the bob in drawing units. */
/** The share of the shuffle he spends dithering in the doorway before he makes off. */
export const B_DITHER = 0.3;
export const SHUFFLE = { hz: 5.2, deg: 7, bob: 1.6 };
export const B_BEATS: [number, string, string][] = [
  [0, 'sits', 'Biffy sits there'], [0.05, 'jolt', 'Two truck bumps: two big shakes'], [0.5, 'door-open', 'Door bangs open'], [0.8, 'roll-out', 'The toilet paper roll rolls out from behind the door'],
  [1.1, 'roll-away', 'It rolls flat along the ground at one steady speed, off the near edge of the screen'], [1.4, 'grope', 'His arm gropes around out of the dark, a few sweeps, nothing'],
  [2.9, 'shuffle', 'He shuffles out after it: bent over, pants at his ankles, mortified'], [B_OFF, 'off-screen', 'Off screen, by the near edge'], [B_SHUT, 'door-shut', 'The door creaks shut. Indicator flips to green'],
];
export const B_END = 6.9;
/** Reference sizes, as shares of the screen's width: the biffy (about 80 px tall at 390) and the shuffler. */
export const BIFFY_FRAC = 0.15;
/** The biffy is drawn this much of the reference's size (about 60 px tall at 390). The shuffler is not shrunk. */
export const BIFFY_SIZE = 0.8;
/** The shuffler is the worker's size (his head matches the worker's, as in the porcupine gag: about 62 px tall stood up, at 390). */
export const SHUFFLER_FRAC = 0.243;

/* door and jolt helpers shared by both gags */
function doorAndBody(pp: Pup, door: number, jolt: number, rock: number, indRed: boolean): void {
  const q = pp.q;
  q('.root')!.setAttribute('transform', `translate(${jolt} 0) rotate(${rock} 50 134)`);
  q('.door')!.setAttribute('transform', `translate(22 0) scale(${door} 1) translate(-22 0)`);
  q('.ind')!.setAttribute('fill', indRed ? '#d9453a' : '#56b05a');
}
function doorOpen(t: number, t0: number): number { // bangs open with an overshoot and a little bounce
  const k = seg(t, t0, t0 + .22); const settle = seg(t, t0 + .22, t0 + .6);
  return lerp(1, -0.42, ease(k)) + (k >= 1 ? Math.sin(settle*Math.PI*2)*.1*(1-settle) : 0);
}
/**
 * The truck's bump shakes the biffy before the door opens: it rattles side to side and rocks on its
 * base, dying away. `k` is -1..1 over the shake that starts at `t0` and lasts `dur`.
 */
const shake = (t: number, t0: number, dur: number) => (t > t0 && t < t0 + dur) ? Math.sin(((t - t0) / dur) * Math.PI * 6) * (1 - (t - t0) / dur) : 0;
/** A: one small shake. B: two bigger ones, one for each bump. Both are over as the door bangs open (0.5). */
export const A_SHAKE = { px: 3, deg: 2 }, B_SHAKE = { px: 5.5, deg: 4.5 };
const shakeA = (t: number) => shake(t, .3, .2);
const shakeB = (t: number) => shake(t, .05, .2) + shake(t, .29, .21);


export function aApply(sc: any, t: number): void {
  const pp = sc.p, q = pp.q; place(pp);
  let door = 1, rock = 0, red = false;
  if (t > .5 && t < 3.1) door = doorOpen(t, .5);
  if (t >= 3.1 && t < 3.55){ const k = ease(seg(t,3.1,3.5)); door = lerp(-0.42, 1, k); }
  // SAME START, SAME END: red while he is flustered in there, then a click back to the green it began with.
  if (t >= 3.55){ red = t < 5.0; rock = t < 4.4 ? Math.sin((t-3.55)*14)*2.5*(1 - seg(t,3.55,4.4)) : 0; }
  const sh = shakeA(t);
  doorAndBody(pp, door, sh * A_SHAKE.px, rock + sh * A_SHAKE.deg, red);
  const turn = t > 1.7 && t < 3.3;
  q('.headBack').style.display = turn ? 'none' : ''; q('.headTurn').style.display = turn ? '' : 'none';
  let sway = (t > .75 && t < 1.7) ? Math.sin(t*6)*2 : 0, nod = (t > 2.3 && t < 2.6) ? Math.sin(seg(t,2.3,2.6)*Math.PI)*3 : 0;
  q('.occ').setAttribute('transform', `rotate(${sway} 50 130)`);
  q('.headTurn').setAttribute('transform', `translate(0 ${nod})`);
  const wide = ease(seg(t, 1.95, 2.15)) * (t < 3.2 ? 1 : 0);          // eye pops wide with embarrassment
  q('.tEye').setAttribute('r', 4.6 + 2.6*wide); q('.tPup').setAttribute('r', 1.9 - .5*wide);
  q('.tBrow').setAttribute('transform', `translate(0 ${-3*wide})`);
  q('.lidA').style.opacity = String(1 - clamp(wide * 3));                  // Moe's droopy lid, until the eye pops
  const flushed = mixC(SKIN, FLUSH, wide);                                // his whole face, not a cheek spot
  q('.headTurn').querySelectorAll('.skin').forEach((n: SVGElement) => n.setAttribute('fill', flushed));
  q('.hat').setAttribute('transform', `translate(${turn ? 1 : 0} ${nod})`);
  // reaching arm follows the free edge of the door
  const reaching = t > 2.7 && t < 3.3;
  q('.reach').style.display = reaching ? '' : 'none'; q('.armR').style.display = reaching ? 'none' : '';
  if (reaching){
    const k = ease(seg(t,2.7,3.0)), edge = 22 + 56*door;
    const hx = t < 3.1 ? lerp(34, 22 + 56*-0.42 + 4, k) : Math.max(30, edge + 3), hy = lerp(84, 80, k);
    ['.reachArm','.reachArm2'].forEach(c => q(c).setAttribute('d', `M37 74 L${hx} ${hy}`));
    q('.reachHand').setAttribute('cx', hx); q('.reachHand').setAttribute('cy', hy);
  }
}


export function bApply(sc: any, t: number): void {
  const pp = sc.p; const {r, u} = place(pp);
  // They leave by the screen edge nearest the biffy.
  const dir = pp.spot.x < 0.5 ? -1 : 1;
  // The indicator starts as it stood (green) and goes red at the first bump: somebody is in there after all.
  let door = 1, red = t >= 0.05;
  if (t > .5 && t < B_SHUT) door = doorOpen(t, .5);
  if (t >= B_SHUT){ const k = seg(t,B_SHUT,B_SHUT + .9); door = lerp(-0.42, 1, k*k); if (t > B_SHUT + .9) red = false; }
  const sh = shakeB(t);
  doorAndBody(pp, door, sh * B_SHAKE.px, sh * B_SHAKE.deg, red);
  // THE ROLL ROLLS IN FRONT OF THE DOOR (Jay, Oct 8): the nearer lane, never behind it. The door is drawn again on
  // the gag's own layer (the biffy's own hidden meanwhile) so the roll can wait out of sight behind the SHUT door;
  // once the door has swung clear of the doorway the roll is put in front of it, and stays there.
  const front = sc.front; front.frac = pp.frac; front.spot = pp.spot; place(front);
  doorAndBody(front, door, sh * B_SHAKE.px, sh * B_SHAKE.deg, red);
  pp.q('.door').style.visibility = 'hidden';
  // It just rolls out: it waits on the floor in the doorway from the start (no fade: the shut door hides it), the
  // door bangs open on it, and it rolls along the ground at ONE constant speed, no easing, no drop, past the open
  // door, in front of it, and off the near edge. It turns as far as it travels.
  const groundY = pp.spot.y*r.height, startX = pp.spot.x*r.width;
  const rs = Math.max(10, 14*u/BIFFY_SIZE);
  const far = (dir < 0 ? startX : r.width - startX) + rs + 30;
  const k = seg(t,.8,B_ROLL_OFF);
  const rx = startX + dir*far*k, ry = groundY - 2*u - rs/2;
  const out = t > .5 && door < ROLL_CLEAR;
  sc.roll.style.zIndex = out ? '2' : '0'; front.svg.style.zIndex = '1'; sc.s.svg.style.zIndex = '3';
  sc.roll.dataset.front = out ? '1' : '0';
  sc.roll.style.opacity = t < B_ROLL_OFF ? '1' : '0'; sc.roll.style.width = sc.roll.style.height = rs+'px';
  sc.roll.style.left = '0px'; sc.roll.style.top = '0px'; sc.roll.style.willChange = 'transform';
  sc.roll.style.transform = `translate3d(${rx - rs/2}px, ${ry - rs/2}px, 0) rotate(${dir*far*k/(Math.PI*rs)*360}deg)`;
  // the shuffler (drawn facing right; mirrored about his own middle when he leaves to the left)
  const s = sc.s, sq = s.q;
  s.svg.style.transform = dir < 0 ? 'scaleX(-1)' : '';
  if (t > 1.4 && t < 2.9){                 // just his arm, groping around out of the dark doorway
    const k = seg(t,1.4,2.9);
    s.svg.style.visibility = 'visible'; place(s, dir*12);
    sq('.root').setAttribute('transform', 'translate(0 0)');
    sq('.upper').setAttribute('transform', '');
    ['.legB','.legF','.bunch','.tpTail','.head'].forEach(c => sq(c).style.opacity = String(0));
    sq('.upper').style.opacity = String(1); sq('.upper').querySelectorAll(':scope > path, :scope > g:not(.arm)').forEach((n: SVGElement) => (n.style.opacity = "0"));
    const out = Math.sin(clamp(k*1.15)*Math.PI);           // slides out, gropes, slides back
    const grope = Math.sin(k*Math.PI*6);                    // three sweeps
    sq('.arm').setAttribute('transform', `translate(${-34 + out*16} ${10 + grope*5}) rotate(${grope*28 + 10} 70 66)`);
  } else if (t >= 2.9 && t < B_OFF){      // shuffles out and off the near edge
    const k = seg(t,2.9,B_OFF);
    s.svg.style.visibility = 'visible';
    ['.legB','.legF','.bunch','.tpTail','.head'].forEach(c => sq(c).style.opacity = String(1));
    sq('.upper').querySelectorAll(':scope > path, :scope > g').forEach((n: SVGElement) => (n.style.opacity = "1"));
    const edge = dir < 0 ? pp.spot.x*r.width : r.width - pp.spot.x*r.width;
    // ANTICIPATION: he comes out of the doorway and dithers on the spot for a moment (the whole of him on screen,
    // a look back at the biffy), then makes off after the roll, picking up his pace.
    const go = k < B_DITHER ? .05*(k/B_DITHER) : .05 + .95*Math.pow((k - B_DITHER)/(1 - B_DITHER), 1.25);
    const walkPx = lerp(0, (edge + 70)/(s.frac*r.width/120), go);
    place(s, dir*(6 + walkPx));
    // TINY FAST STEPS with a small bob: his ankles are tied by the bunch, so the legs barely part; the whole of him
    // dips a little on each step and his top half follows a beat behind.
    const ph = t*2*Math.PI*SHUFFLE.hz, c = Math.sin(ph), dip = Math.abs(Math.cos(ph));
    sq('.legB').setAttribute('transform', `translate(54 84) rotate(${c*SHUFFLE.deg})`);
    sq('.legF').setAttribute('transform', `translate(62 84) rotate(${-c*SHUFFLE.deg})`);
    sq('.bunch').setAttribute('transform', `translate(${c*.9} ${-dip*.5})`);
    sq('.root').setAttribute('transform', `translate(0 ${-dip*SHUFFLE.bob})`);
    sq('.upper').setAttribute('transform', `rotate(${Math.sin(ph - .9)*2.2} 58 84)`);
    sq('.arm').setAttribute('transform', `rotate(${Math.sin(t*11)*9 - 4} 70 66)`);
    const glance = t > 3.15 && t < 3.6;
    sq('.head').setAttribute('transform', glance ? 'rotate(-10 80 62)' : `rotate(${Math.sin(t*4)*2} 80 62)`);
    sq('.pupil').setAttribute('cx', glance ? 85 : 87.5);
    sq('.tpTail').setAttribute('transform', `rotate(${c*5} 46 106)`);
  } else s.svg.style.visibility = 'hidden';
}


/** The biffy at rest: door shut, nobody showing, indicator as it was left. */
export function biffyRest(pp: Pup, red: boolean): void {
  place(pp);
  doorAndBody(pp, 1, 0, 0, red);
  const occ = pp.q('.occ') as SVGElement | null;
  if (occ) occ.style.display = '';
  (pp.q('.door') as SVGElement).style.visibility = '';
  pp.svg.querySelectorAll('.headTurn .skin').forEach((n) => n.setAttribute('fill', SKIN));
}

/** The permanent biffy puppet, in `host`, standing at `spot` (shares of the host's size). */
export const biffyPup = (host: HTMLElement, spot: { x: number; y: number }, scale: number): Pup => makePup(host, biffy(true), { vw: 100, vh: 140, ax: 50, ay: 134, frac: BIFFY_FRAC * BIFFY_SIZE * scale, spot });
/** Biffy B's extras: the shuffler and the roll, on a layer over everything (they leave past the screen's edge). */
export function runawayScene(biffyP: Pup, over: HTMLElement, scale: number): any {
  // Stacked: the roll, then the door drawn again over it, then the shuffler in front of both.
  const roll = addEl(over, 'pup-roll', ROLL);
  const front = makePup(over, `<g class="root">${DOOR}</g>`, { vw: 100, vh: 140, ax: 50, ay: 134, frac: biffyP.frac, spot: biffyP.spot });
  const s = makePup(over, SHUFFLER, { vw: 120, vh: 120, ax: 60, ay: 108, frac: SHUFFLER_FRAC * scale, spot: biffyP.spot });
  return { p: biffyP, s, roll, front };
}

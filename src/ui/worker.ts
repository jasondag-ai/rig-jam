// The sleepy worker gag as a code puppet, ported from the approved reference
// (~/Desktop/RHR Art Inbox/worker_moose_puppet_reference.html): the same drawing, poses, beats and
// timing. Pure: `wPose(t)` says where every part is at a time in the gag, `workerFrame` turns a pose
// into the attributes the drawing needs, `cancelPose` is what he does when the player makes a move.
// egg-gags.ts puts him on screen. He works by the screen's LEFT edge, like the reference.
/* eslint-disable */
const O = '#2b1e16';
const ease = (x: number) => (x < 0.5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2);
const clamp = (x: number, a = 0, b = 1) => Math.max(a, Math.min(b, x));
const seg = (t: number, a: number, b: number) => clamp((t - a) / (b - a));
const lerp = (a: number, b: number, k: number) => a + (b - a) * k;
const outBackW = (x: number) => { const c = 1.4; return 1 + (c + 1) * Math.pow(x - 1, 3) + c * Math.pow(x - 1, 2); };

// ---------- The drawing (the reference's, as written) ----------
const RED='#c8352b', RED2='#a3281f', STRIPE='#d5dbe2', SKIN='#f0c09a', SKIN2='#dfa47c', BEARD='#7a4f2e', BOOT='#5a3a24', GLOVE='#e0a43a', HAT='#f2c230', HAT2='#fde27a';
const leg = (cls: string) => `
  <g class="${cls}"><rect x="-5.5" y="-1" width="11" height="16" rx="5" fill="${RED}" stroke="${O}" stroke-width="2.6"/>
    <g class="shin" transform="translate(0 14)"><rect x="-5" y="-1" width="10" height="15" rx="4.5" fill="${RED}" stroke="${O}" stroke-width="2.6"/>
      <rect x="-5" y="5" width="10" height="3.2" fill="${STRIPE}" stroke="${O}" stroke-width="1.2"/>
      <path d="M-6 11 L7 11 Q11 11 11 15 L11 17 L-6 17 Z" fill="${BOOT}" stroke="${O}" stroke-width="2.4" stroke-linejoin="round"/></g></g>`;
const arm = (cls: string) => `
  <g class="${cls}"><rect x="-5" y="-2" width="10" height="15" rx="5" fill="${RED}" stroke="${O}" stroke-width="2.6"/>
    <rect x="-5" y="6" width="10" height="3" fill="${STRIPE}" stroke="${O}" stroke-width="1.1"/>
    <g class="fore" transform="translate(0 12)"><rect x="-4.5" y="-1" width="9" height="13" rx="4.5" fill="${RED}" stroke="${O}" stroke-width="2.6"/>
      <circle cx="0" cy="13" r="5" fill="${GLOVE}" stroke="${O}" stroke-width="2.4"/></g></g>`;
export const WORKER = `
<g class="pail"><path d="M-11 0 L11 0 L9 20 L-9 20 Z" fill="#eef0f2" stroke="${O}" stroke-width="2.6" stroke-linejoin="round"/>
    <path d="M-10.3 6 L10.3 6 L10 9 L-10 9 Z" fill="#aab3bd"/><path d="M5 2 L8 2 L6.5 18 L4 18 Z" fill="#cfd4da"/>
    <path class="handle" d="M-10 1 Q0 -12 10 1" fill="none" stroke="${O}" stroke-width="2"/></g>
<g class="reach"><rect x="-260" y="-5.5" width="262" height="11" rx="5.5" fill="${RED}" stroke="${O}" stroke-width="2.6"/>
  <rect x="-40" y="-5.5" width="4" height="11" fill="${STRIPE}" stroke="${O}" stroke-width="1.1"/>
  <g class="grip"><circle cx="5" cy="0" r="6" fill="${GLOVE}" stroke="${O}" stroke-width="2.4"/><path class="thumb" d="M6 -6 Q12 -8 13 -3" stroke="${O}" stroke-width="2.2" fill="${GLOVE}"/></g></g>
<g class="flip"><g class="root">

  <g class="legB" transform="translate(56 78)">${leg('thighB')}</g>
  <g class="armB" transform="translate(52 56)">${arm('upperB')}</g>
  <g class="torso">
    <rect x="45" y="48" width="32" height="35" rx="12" fill="${RED}" stroke="${O}" stroke-width="3"/>
    <path d="M47 70 Q60 82 75 70 L75 76 Q70 83 61 83 Q51 83 47 76 Z" fill="${RED2}"/>
    <rect x="45.5" y="64" width="31" height="4.5" fill="${STRIPE}" stroke="${O}" stroke-width="1.4"/>
    <rect x="66" y="52" width="7" height="8" rx="1.5" fill="#f2c230" stroke="${O}" stroke-width="1.6"/>
    <path d="M50 50 Q54 47 58 52" stroke="#e05a4e" stroke-width="2.5" fill="none" stroke-linecap="round"/>
  </g>
  <g class="legF" transform="translate(64 78)">${leg('thighF')}</g>
  <g class="head">
    <circle cx="52" cy="37" r="4.2" fill="${SKIN}" stroke="${O}" stroke-width="2"/>
    <circle cx="63" cy="36" r="16" fill="${SKIN}" stroke="${O}" stroke-width="3"/>
    <path d="M49 30 Q52 24 60 23" stroke="#fbd9bd" stroke-width="3" fill="none" stroke-linecap="round"/>
    <path d="M48 39 Q50 54 64 54 Q77 54 79 40 Q73 46 64 46 Q55 46 48 39 Z" fill="${BEARD}" stroke="${O}" stroke-width="2.2" stroke-linejoin="round"/>
    <path class="mouth" d="M64 47 Q68 48.5 72 47" stroke="${O}" stroke-width="2.2" fill="none" stroke-linecap="round"/>
    <circle class="blush" cx="68" cy="42" r="4" fill="#f08c80" opacity="0"/>
    <circle cx="78.5" cy="38" r="3.8" fill="${SKIN2}" stroke="${O}" stroke-width="2"/>
    <path d="M53 33 L64 32" stroke="${O}" stroke-width="1.8"/>
    <circle cx="70" cy="33" r="7.6" fill="#e2f2fa" stroke="${O}" stroke-width="2.2"/>
    <circle cx="70" cy="33" r="4.6" fill="#fff"/>
    <circle class="pupil" cx="71.5" cy="33.5" r="2.4" fill="${O}"/>
    <path class="lid" d="M65 28 L75 28 L75 29 L65 29 Z" fill="${SKIN}" stroke="${O}" stroke-width="1.4"/>
    <path class="brow" d="M65 24.5 Q70 22.5 76 24.5" stroke="${BEARD}" stroke-width="2.8" fill="none" stroke-linecap="round"/>
    <g class="hat"><path d="M46 26 Q46 9 63 9 Q80 9 80 26 Z" fill="${HAT}" stroke="${O}" stroke-width="2.8" stroke-linejoin="round"/>
      <path d="M52 20 Q54 13 62 12" stroke="${HAT2}" stroke-width="3" fill="none" stroke-linecap="round"/>
      <path d="M63 9 L63 25" stroke="${O}" stroke-width="1.6"/>
      <rect x="42" y="24" width="42" height="5" rx="2.5" fill="${HAT}" stroke="${O}" stroke-width="2.6"/></g>
  </g>
  <g class="armF" transform="translate(70 56)">${arm('upperF')}</g>
</g></g>`;


/**
 * SLOW MOE (STANDING_RULES 11; Jay, Oct 8): any worker who gets into trouble is Moe, the anti-hero. The SAME drawing
 * and build as the worker (so every pose, joint and size holds), dressed as Moe: orange FR coveralls with the same
 * reflective stripes, stubble where the beard was, droopy lids (a half lid over the eye, under the blinking one), his
 * hard hat tipped back. The bearded worker in red stays the lucky one.
 */
export const MOE_SUIT = '#e8862e', MOE_SUIT2 = '#bf6418', MOE_STUBBLE = '#9c7656';
export function asMoe(drawing: string): string {
  return drawing.replaceAll(RED2, MOE_SUIT2).replaceAll(RED, MOE_SUIT).replaceAll('#e05a4e', '#f5a85c')
    .replace(/<path d="M48 39 Q50 54 64 54[^>]*>/, `<path d="M49 41 Q52 53 64 53.5 Q76 53 78.5 42 Q72 47.5 64 47.5 Q56 47.5 49 41 Z" fill="${MOE_STUBBLE}" opacity=".55"/><path d="M54 47.5 h.1 M58.5 50 h.1 M63.5 51 h.1 M68.5 50.6 h.1 M73 48.6 h.1 M61 48.4 h.1 M66.5 48.6 h.1" stroke="${O}" stroke-width="1.4" stroke-linecap="round" opacity=".6"/>`)
    .replace('<path class="lid"', `<path class="droop" d="M62.4 31.4 A7.6 7.6 0 0 1 77.6 31.4 Z" fill="${SKIN}" stroke="${O}" stroke-width="1.8" stroke-linejoin="round"/><path class="lid"`)
    .replace(/<g class="hat">([\s\S]*?<rect x="42" y="24"[^>]*>)<\/g>/, '<g class="hat"><g transform="rotate(-10 63 27)">$1</g></g>');
}
/** The shared worker drawing as Slow Moe (pail and long reach included). */
export const MOE_WORKER = asMoe(WORKER);

/** When each beat starts (seconds), its name (`data-beat`), and what happens. */
export const W_BEATS: [number, string, string][] = [
  [0, 'walk-in', 'Walks in from off screen, carrying his pail'],
  [3.0, 'flip-pail', 'Stops, flips the pail over'],
  [3.9, 'sit', 'Sits down with a settle bounce'],
  [4.6, 'yawn', 'Big yawn and stretch'],
  [6.1, 'doze', 'Eyelids get heavy, dozes off'],
  [7.2, 'nod', 'Head snaps up, then droops again'],
  [8.7, 'jolt', 'Jolts awake, hard hat pops'],
  [9.1, 'guilty', 'Looks left, looks right. Guilty'],
  [10.2, 'bolt', 'Springs up, hop-turns and bolts off the edge, forgetting the pail'],
  [11.4, 'pail-alone', 'Beat: just the pail by the edge of the screen'],
  [12.2, 'peek', 'He peeks back in, red-faced, and his arm grabs the pail'],
  [12.95, 'yank', 'Yank. Him and the pail, gone'],
  [13.3, 'gone', 'Nothing to see here'],
];
/** Everything is off screen by END. He is asleep (the sighting counts) from T_ASLEEP. */
export const W_END = 13.4;
export const T_ASLEEP = 6.6;
/** The still used with reduced motion and on the Wildlife Log card: dozing on his pail. */
export const T_DOZE = 8.4;
/** His box is this share of the screen's width (about 62 px of worker at 390 px). */
export const WORKER_FRAC = 0.19;
/** His spot is this far in from the screen's left edge, as a share of its width. */
export const WORKER_X = 0.1;
export const wBeatAt = (t: number): string => W_BEATS.reduce((name, b) => (t >= b[0] ? b[1] : name), W_BEATS[0][1]);

export interface WorkerPose {
  x: number; y: number; rot: number; sx: number; sy: number; face: number;
  thB: number; thF: number; shB: number; shF: number; arB: number; arF: number; foB: number; foF: number;
  head: number; hatY: number; hatR: number; px: number; py: number; lid: string; brow: string; mouth: string;
  pail: 'carry' | 'set' | 'yank'; pailX: number; pailY: number; pailR: number;
  show: boolean; z: number; reach: number; yank: number; grip: boolean; peek: number; peekIn: number; blush: number; hideArm: boolean;
}

/** The whole gag: every part's place at time `t` (seconds). The reference's `wPose`, as written. */
export function wPose(t: number): WorkerPose {
  const p: WorkerPose = {x:0,y:0,rot:0,sx:1,sy:1,face:1, thB:0,thF:0,shB:0,shF:0, arB:0,arF:0,foB:0,foF:0, head:0,hatY:0,hatR:0,
    px:71.5,py:33.5, lid:'M65 28 L75 28 L75 29 L65 29 Z', brow:'M65 24.5 Q70 22.5 76 24.5', mouth:'M64 47 Q68 48.5 72 47',
    pail:'carry' as 'carry' | 'set' | 'yank', pailX:72, pailY:84, pailR:0, show:true, z:0, reach:0, yank:0, grip:false, peek:0, peekIn:0, blush:0, hideArm:false};
  const walk = (speed: number, amp: number) => { const c = Math.sin(t*2*Math.PI*speed);
    p.thB = c*amp; p.thF = -c*amp; p.shB = Math.max(0,-c)*amp*.9; p.shF = Math.max(0,c)*amp*.9;
    p.arB = -c*amp*.8; p.foB = -12; p.y = -Math.abs(Math.cos(t*2*Math.PI*speed))*2.2; };
  if (t < 3.0){                                         // walk in from the left, facing right
    const k = seg(t,0,3.0); p.x = lerp(-260, 0, ease(k)*.35 + k*.65); walk(1.6, 26);
    p.arF = -8; p.foF = -6; p.pailX = 74; p.pailY = 85 - p.y*.5; p.pailR = Math.sin(t*2*Math.PI*1.6)*6;
    p.hatY = -Math.abs(Math.cos(t*2*Math.PI*1.6 - .6))*1.2;
  } else if (t < 3.9){                                  // stop, swing the pail down and flip it
    const k = ease(seg(t,3.0,3.9));
    p.rot = 6*Math.sin(k*Math.PI); p.arF = lerp(-8, 30, k); p.foF = lerp(-6,-40,k);
    p.pail = 'carry'; p.pailX = lerp(74, 44, k); p.pailY = lerp(85, 88, k); p.pailR = lerp(0, 180, k);
    p.mouth = 'M64 47 Q68 47 72 47';
  } else if (t < 4.6){                                  // sit down, settle bounce
    const k = seg(t,3.9,4.6), e = ease(clamp(k*1.6));
    p.x = lerp(0,-16,e); p.y = lerp(0,10,e) - Math.sin(clamp((k-.6)/.4)*Math.PI)*2.5;
    p.thB = p.thF = lerp(0,-85,e); p.shB = p.shF = lerp(0,85,e);
    p.arF = lerp(30,-10,e); p.foF = lerp(-40,-60,e); p.arB = -10; p.foB = -50;
    p.pail = 'set'; p.sy = 1 - .06*Math.sin(clamp((k-.6)/.4)*Math.PI);
  } else {                                               // seated from here until he jumps up
    p.x = -16; p.y = 10; p.thB = p.thF = -85; p.shB = p.shF = 85; p.pail = 'set';
    p.arF = -10; p.foF = -60; p.arB = -10; p.foB = -50;
    if (t < 6.1){                                        // yawn and stretch
      const k = seg(t,4.6,6.1), up = Math.sin(clamp(k)*Math.PI);
      p.arF = lerp(-10,-165,up); p.foF = lerp(-60,-10,up); p.arB = lerp(-10,-160,up); p.foB = lerp(-50,-5,up);
      p.sy = 1 + .06*up; p.head = -8*up;
      p.lid = 'M65 26 L75 26 L75 38 L65 38 Z'; p.mouth = 'M66 45 Q69 41 72 45 Q72 51 69 51 Q66 51 66 45 Z';
      if (k > .85) { p.lid = 'M65 28 L75 31 L75 34 L65 33 Z'; p.mouth = 'M64 47 Q68 48 72 47'; }
    } else if (t < 8.7){                                 // doze, snap up once, doze again
      const breathe = Math.sin(t*2*Math.PI*.45);
      let droop = ease(seg(t,6.1,6.9))*22;
      if (t > 7.2 && t < 7.45) droop = lerp(22, 0, seg(t,7.2,7.3));
      if (t >= 7.45) droop = ease(seg(t,7.45,8.2))*24;
      p.head = droop; p.sy = 1 + breathe*.025; p.rot = droop*.12;
      p.lid = t > 7.2 && t < 7.45 ? 'M65 28 L75 30 L75 32 L65 32 Z' : 'M65 26 L75 26 L75 39 L65 39 Z';
      p.mouth = 'M64 47 Q68 50 72 46'; p.z = t > 6.6 ? 1 : 0; p.foF = -70; p.foB = -60;
    } else if (t < 9.1){                                 // jolt awake
      const k = seg(t,8.7,9.1);
      p.y = 10 - Math.sin(k*Math.PI)*9; p.sy = 1 + .1*Math.sin(k*Math.PI);
      p.hatY = -Math.sin(clamp(k*1.3)*Math.PI)*9; p.hatR = -8*Math.sin(k*Math.PI);
      p.lid = 'M65 23 L75 23 L75 24 L65 24 Z'; p.px = 70; p.py = 33; p.brow = 'M65 21.5 Q70 19 76 21.5';
      p.mouth = 'M66 46 Q69 43 72 46 Q72 49.5 69 49.5 Q66 49.5 66 46 Z'; p.arF = -40; p.arB = -35;
    } else if (t < 10.2){                                // look left, look right, guilty
      const k = seg(t,9.1,10.2);
      p.px = k < .45 ? 66.5 : (k < .55 ? 70 : 73.5); p.head = k < .5 ? -5 : 4;
      p.lid = 'M65 27 L75 27 L75 29 L65 29 Z'; p.brow = 'M65 25.5 Q70 22 76 23';
      p.mouth = 'M63.5 46 L72.5 46 L72.5 49 L63.5 49 Z M66.5 46 L66.5 49 M69.5 46 L69.5 49';
    } else if (t < 10.6){                                // springs up and hop-turns, forgetting the pail
      const k = seg(t,10.2,10.6), stand = ease(clamp(k*2));
      p.x = lerp(-16,0,stand); p.y = lerp(10,0,stand) - Math.sin(clamp((k-.35)/.65)*Math.PI)*10;
      p.thB = p.thF = lerp(-85,0,stand); p.shB = p.shF = lerp(85,0,stand);
      const mag = 1 - .18*Math.sin(clamp((k-.35)/.65)*Math.PI); p.face = (k < .67 ? 1 : -1)*mag;
      p.arF = -20; p.foF = -30; p.arB = -20; p.pail = 'set'; p.mouth = 'M64 47.5 Q68 46 72 47.5'; p.lid = 'M65 27 L75 27 L75 29 L65 29 Z';
      p.hatY = -Math.sin(clamp((k-.4)/.6)*Math.PI)*4;
    } else if (t < 11.4){                                // bolts off the left edge, the pail forgotten
      const k = seg(t,10.6,11.4);
      p.face = -1; p.x = -lerp(0, 260, k*k*.6 + k*.4); walk(2.8, 38); p.rot = 9;
      p.arF = -25 + Math.sin(t*2*Math.PI*2.8)*20; p.foF = -60;
      p.hatY = 3 - Math.abs(Math.cos(t*2*Math.PI*2.8 - 1.2))*5; p.hatR = 8; p.mouth = 'M65 47 Q68 45 71 47'; p.pail = 'set';
    } else if (t < 12.2){                                // beat: just the pail by the edge
      p.show = false; p.pail = 'set';
    } else if (t < 13.25){                               // he peeks back in at the edge, arm reaches, grabs, yanks
      p.pail = 'set'; p.hideArm = true; p.face = 1; p.peek = 1;
      const k1 = seg(t,12.2,12.45), k2 = seg(t,12.35,12.7), k3 = seg(t,12.95,13.25);
      p.reach = Math.min(1.03, outBackW(k2)); p.grip = t > 12.7;
      if (t > 12.95){ p.pail = 'yank'; p.yank = k3*k3; p.reach = 1; }
      p.peekIn = ease(k1); p.blush = t > 12.6 ? 1 : 0;
      p.px = 71; p.py = 34; p.lid = 'M65 27 L75 27 L75 28.5 L65 28.5 Z';
      p.brow = 'M65 22 Q70 19.5 76 21'; p.mouth = 'M64 47 Q68 45.5 72 47.5';
      p.y = 22; p.rot = 12; p.thB = p.thF = -70; p.shB = p.shF = 90;
    } else { p.show = false; p.pail = 'yank'; p.yank = 1; }
  }
  return p;
}

/** How long the cancel takes: a jolt, up and round (grabbing the pail), then off the edge with it. */
export const CANCEL = { jolt: 0.3, turn: 0.75, gone: 1.75 };

/**
 * The player made a move at gag time `t0`: he jolts, and runs off the left edge WITH his pail.
 * `u` is seconds since the move. Returns null once he has already bolted (t0 >= 10.2): the rest of
 * the gag is him leaving anyway, so it just plays out.
 */
export function cancelPose(u: number, t0: number): WorkerPose | null {
  if (t0 >= 10.2) return null;
  const from = wPose(t0);
  const seated = t0 >= 3.9;
  const wide = (p: WorkerPose) => { p.lid = 'M65 23 L75 23 L75 24 L65 24 Z'; p.px = 70; p.py = 33; p.brow = 'M65 21.5 Q70 19 76 21.5'; p.mouth = 'M66 46 Q69 43 72 46 Q72 49.5 69 49.5 Q66 49.5 66 46 Z'; };
  let p: WorkerPose;
  if (u < CANCEL.jolt) {
    const k = seg(u, 0, CANCEL.jolt);
    if (seated) p = wPose(8.7 + k * 0.399);
    else {
      // Caught on his feet: a start, hat popping, pail still in hand.
      p = wPose(0); p.x = from.x; p.thB = p.thF = p.shB = p.shF = 0; p.arB = -35; p.foB = -12;
      p.y = -Math.sin(k * Math.PI) * 8; p.sy = 1 + 0.1 * Math.sin(k * Math.PI);
      p.hatY = -Math.sin(clamp(k * 1.3) * Math.PI) * 9; p.hatR = -8 * Math.sin(k * Math.PI);
      p.arF = -8; p.foF = -6; p.pail = 'carry'; p.pailX = 74; p.pailY = 85; p.pailR = t0 >= 3.0 ? from.pailR : 0;
      if (t0 >= 3.0) { p.pailX = from.pailX; p.pailY = from.pailY; }
      wide(p);
    }
  } else if (u < CANCEL.turn) {
    // Up (if he was sitting) and a hop-turn to face the edge, never paper-thin; he takes the pail as he turns.
    const k = seg(u, CANCEL.jolt, CANCEL.turn);
    p = wPose(10.2 + k * 0.399);
    if (!seated) { p.x = from.x; p.y = -Math.sin(clamp((k - 0.35) / 0.65) * Math.PI) * 10; p.thB = p.thF = p.shB = p.shF = 0; }
    p.pail = seated && k < 0.67 ? 'set' : 'carry';
    p.pailX = 74; p.pailY = 85; p.pailR = seated ? 180 : 0;
    p.arF = seated ? lerp(-20, 28, clamp(k * 1.6)) : -8; p.foF = seated ? -40 : -6;
    if (!seated && t0 >= 3.0 && k < 0.5) { p.pailX = from.pailX; p.pailY = from.pailY; p.pailR = from.pailR; }
    wide(p);
  } else if (u < CANCEL.gone) {
    // Off the left edge, flat out, pail swinging in his hand.
    const k = seg(u, CANCEL.turn, CANCEL.gone);
    p = wPose(10.6 + k * 0.799);
    const x0 = seated ? 0 : from.x;
    p.x = lerp(x0, x0 - 300, k * k * 0.6 + k * 0.4);
    p.pail = 'carry'; p.pailX = 74; p.pailY = 85 - p.y * 0.5;
    p.pailR = (seated ? lerp(180, 0, clamp(k * 3)) : 0) + Math.sin(u * 2 * Math.PI * 2.8) * 10;
    p.arF = -8; p.foF = -6;
  } else { p = wPose(0); p.show = false; p.pail = 'yank'; p.yank = 1; }
  p.z = 0;
  return p;
}

export interface WorkerFrame {
  show: boolean;
  flip: string;
  /** Body groups ride together (the pail does not). */
  parts: Record<'legB' | 'armB' | 'torso' | 'legF' | 'head' | 'armF', string>;
  shinB: string; shinF: string; foreB: string; foreF: string; hat: string;
  px: number; py: number; lid: string; brow: string; mouth: string; mouthFill: string;
  pail: string; blush: number; armOpacity: number;
  reach: { transform: string; grip: string } | null;
  z: number;
}
const BASE = { legB: 'translate(56 78)', armB: 'translate(52 56)', torso: '', legF: 'translate(64 78)', head: '', armF: 'translate(70 56)' } as const;

/**
 * The attributes for a pose (the reference's `wApply`). `edge` is the screen's left edge in puppet
 * units (60 minus his spot's distance from the edge): the peek, the reaching arm and the yank are
 * all measured from it.
 */
export function workerFrame(pose: WorkerPose, edge: number): WorkerFrame {
  const p = { ...pose };
  if (p.peek) p.x = edge - 100 + 18 * p.peekIn - p.yank * (44 - edge + 60);
  const X = p.x * (p.face < 0 ? -1 : 1);
  const body = `translate(${X} ${p.y}) rotate(${p.rot} 60 108) translate(60 108) scale(${p.sx} ${p.sy}) translate(-60 -108)`;
  const extra = { legB: ` rotate(${p.thB})`, legF: ` rotate(${p.thF})`, armB: ` rotate(${p.arB})`, armF: ` rotate(${p.arF})`, head: ` rotate(${p.head} 62 50)`, torso: '' };
  const parts = Object.fromEntries((Object.keys(BASE) as (keyof typeof BASE)[]).map((k) => [k, `${body} ${BASE[k]}${extra[k]}`])) as WorkerFrame['parts'];
  let pail: string;
  if (p.pail === 'set') pail = 'translate(44 88) rotate(180 0 10)';
  else if (p.pail === 'yank') pail = `translate(${44 - p.yank * (44 - edge + 60)} 88) rotate(180 0 10)`;
  else {
    const lx = X + p.pailX;
    const wx = p.face < 0 ? 120 - lx : lx;
    pail = `translate(${wx} ${p.y + p.pailY}) rotate(${p.face < 0 ? -p.pailR : p.pailR} 0 10)`;
  }
  const reaching = p.reach > 0 || p.yank > 0;
  return {
    show: p.show,
    flip: `translate(60 0) scale(${p.face} 1) translate(-60 0)`,
    parts,
    shinB: `translate(0 14) rotate(${p.shB})`, shinF: `translate(0 14) rotate(${p.shF})`,
    foreB: `translate(0 12) rotate(${p.foB})`, foreF: `translate(0 12) rotate(${p.foF})`,
    hat: `translate(0 ${p.hatY}) rotate(${p.hatR} 63 26)`,
    px: p.px, py: p.py, lid: p.lid, brow: p.brow, mouth: p.mouth,
    mouthFill: p.mouth.includes('Z') ? (p.mouth.includes('L72.5') ? '#fff' : '#7a2a22') : 'none',
    pail, blush: p.blush, armOpacity: p.hideArm ? 0 : 1,
    reach: reaching ? { transform: `translate(${edge + p.reach * (38 - edge) - p.yank * (44 - edge + 60)} 90)`, grip: `scale(${p.grip ? 0.85 : 1})` } : null,
    z: p.z,
  };
}

/** Where a puppet part's world x ends up: is the whole worker (and his pail) past the left edge? */
export function workerOff(pose: WorkerPose, edge: number): boolean {
  if (pose.peek) return false;
  const pailX = pose.pail === 'set' ? 44 : pose.pail === 'yank' ? 44 - pose.yank * (44 - edge + 60) : pose.face < 0 ? 120 + pose.x - pose.pailX : pose.x + pose.pailX;
  const bodyOff = !pose.show || 60 + pose.x + 26 <= edge;
  return bodyOff && pailX + 12 <= edge;
}

/**
 * His clearing in the bottom strip: by the left edge, feet just above the strip's bottom (the tip
 * line and the buttons are below it). `strip` runs from the berm's bottom to the tip line, in screen
 * px. He is drawn a little smaller on a short strip, and not at all if there is no room for him.
 */
export function workerSpot(screenW: number, strip: { top: number; bottom: number }): { x: number; y: number; w: number; clearing: { x: number; y: number; width: number; height: number } } | null {
  const full = WORKER_FRAC * screenW;
  const room = strip.bottom - strip.top - 10;
  const scale = Math.min(1, room / (full * 0.84));
  if (scale < 0.72) return null;
  const w = full * scale;
  const x = WORKER_X * screenW;
  const y = strip.bottom - 3;
  return { x, y, w, clearing: { x: 0, y: y - w * 0.95, width: x + w * 0.55, height: w * 0.95 + 4 } };
}

/** The sleepy worker (Slow Moe) as a still drawing in a pose (the Wildlife Log card: dozing on his pail). */
export function workerStill(t: number = T_DOZE): string {
  const f = workerFrame(wPose(t), -200);
  let art = MOE_WORKER.replace('<g class="flip">', `<g class="flip" transform="${f.flip}">`).replace('<g class="pail">', `<g class="pail" transform="${f.pail}">`).replace('<g class="reach">', '<g class="reach" style="display:none">');
  for (const [k, v] of Object.entries(f.parts)) art = art.replace(new RegExp(`<g class="${k}"[^>]*>`), `<g class="${k}" transform="${v}">`);
  art = art.replace('<g class="hat">', `<g class="hat" transform="${f.hat}">`)
    .replace(/(<path class="lid" d=")[^"]*"/, `$1${f.lid}"`).replace(/(<path class="mouth" d=")[^"]*"/, `$1${f.mouth}"`);
  // The joints inside each limb.
  let n = 0;
  art = art.replace(/<g class="shin" transform="[^"]*">/g, () => `<g class="shin" transform="${n++ === 0 ? f.shinB : f.shinF}">`);
  n = 0;
  art = art.replace(/<g class="fore" transform="[^"]*">/g, () => `<g class="fore" transform="${n++ === 0 ? f.foreB : f.foreF}">`);
  return `<svg class="worker-still" viewBox="0 0 120 120" aria-hidden="true">${art}</svg>`;
}

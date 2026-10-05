// Gag 15, the frozen tongue, as code puppets ported from the approved reference
// (~/Desktop/RHR Art Inbox/frozen_tongue_reference.html): the same drawings, poses and timing. A
// frosty pipeline riser with a red handwheel stands in the winter strip. The worker strolls in,
// breath puffing, eyes the pipe, checks nobody is looking, licks it, sticks; the tongue stretches
// as he pulls and flails; "HEWP!"; his buddy (blue coveralls, orange hat, clean shaven) wanders in,
// takes it in, takes a photo (flash), cracks up typing, hop-turns and wanders off; a snowflake
// lands on the stuck worker's nose; blink. The reference ends there, with him still stuck; in the
// game he then heaves himself free and leaves (see tonguePose). strip-gags.ts puts it on screen.
/* eslint-disable */
import { addEl, makePup, place, type Pup } from './puppet-stage.ts';
import { WORKER, WORKER_FRAC } from './worker.ts';
const O = '#2b1e16';
const ease = (x: number) => (x < 0.5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2);
const clamp = (x: number, a = 0, b = 1) => Math.max(a, Math.min(b, x));
const seg = (t: number, a: number, b: number) => clamp((t - a) / (b - a));
const lerp = (a: number, b: number, k: number) => a + (b - a) * k;
const RED='#c8352b', RED2='#a3281f', HAT='#f2c230', HAT2='#fde27a';
// The worker's build alone (worker.ts carries his pail and his long reach in front of it).
const BUILD = WORKER.slice(WORKER.indexOf('<g class="flip">'));

/* buddy: same build, blue coveralls, orange hat, clean shaven */
export const BUDDY = BUILD.replaceAll(RED2, '#3d6797').replaceAll(RED, '#4f7fb0').replaceAll(HAT2, '#ffc08a').replaceAll(HAT, '#f08a2a')
  .replace(/<path d="M48 39 Q50 54 64 54[^>]*>/, '<path d="M50 44 Q54 52 64 53 Q74 53 77 45" stroke="#d9a07a" stroke-width="2" fill="none" stroke-linecap="round"/>');
const PHONE = `<g class="phone" style="display:none"><rect x="-2" y="4" width="10" height="15" rx="2" fill="#2f3440" stroke="${O}" stroke-width="1.6" transform="rotate(-20 3 11)"/><rect x="-.4" y="5.8" width="6.8" height="10.6" rx="1" fill="#8fd3f0" transform="rotate(-20 3 11)"/></g>`;

/* frosty pipeline riser with a handwheel valve */
export const RISER = `
<ellipse cx="20" cy="117" rx="18" ry="4" fill="#ffffff" stroke="${O}" stroke-width="2"/>
<rect x="14" y="34" width="12" height="84" fill="#9aa1aa" stroke="${O}" stroke-width="2.4"/>
<rect x="16.5" y="36" width="3" height="80" fill="#c7cdd4"/>
<g stroke="#ffffff" stroke-width="1.6" stroke-linecap="round" opacity=".9"><path d="M16 50 L19 47 M22 62 L25 59 M16 76 L20 72 M21 92 L25 88 M16 104 L19 101"/></g>
<rect x="9" y="28" width="22" height="7" rx="1.5" fill="#7d858f" stroke="${O}" stroke-width="2.2"/>
<path d="M11 35 L12.5 41 L14 35 M24 35 L25.5 43 L27 35" fill="#e9f6ff" stroke="${O}" stroke-width="1.4" stroke-linejoin="round"/>
<rect x="18" y="16" width="4" height="12" fill="#7d858f" stroke="${O}" stroke-width="1.8"/>
<ellipse cx="20" cy="16" rx="13" ry="4" fill="none" stroke="${O}" stroke-width="5.2"/>
<ellipse cx="20" cy="16" rx="13" ry="4" fill="none" stroke="#d23a2a" stroke-width="2.6"/>
<path d="M8 15 Q9 9 15 10 Q20 6 25 10 Q31 9 32 15 Q26 13 20 14 Q14 13 8 15 Z" fill="#ffffff" stroke="${O}" stroke-width="1.8" stroke-linejoin="round"/>`;

export const TONGUE_BEATS: [number, string, string][] = [
  [0, 'frosty-riser', 'A frosty pipeline riser on a cold morning'], [0.3, 'stroll-in', 'The worker strolls in, breath puffing'], [2.2, 'eyes-pipe', 'Stops. Eyes the frosty pipe. Hmm'],
  [2.7, 'checks-around', 'Checks left, checks right. Nobody around'], [3.0, 'lick', 'Leans in. Lick'], [3.3, 'stuck', 'Stuck. Eyes go huge'],
  [3.5, 'pulls', 'Pulls back. The tongue stretches. Arms flail'], [5.0, 'hewp', '"HEWP!" Waves for help'], [5.6, 'buddy-in', 'His buddy wanders in'],
  [7.0, 'buddy-looks', 'Buddy stops and takes it in'], [7.4, 'phone-out', 'Pulls out his phone...'], [7.9, 'flash', 'FLASH. Photo taken'], [8.1, 'deadpan', 'The worker, deadpan'],
  [8.6, 'cracks-up', 'Buddy checks the photo, cracks up, starts typing'], [9.6, 'buddy-leaves', 'Wanders off, still giggling at his phone'],
  [11.0, 'snowflake', 'Alone again. A snowflake lands on his nose. Blink'],
  [12.2, 'heave', 'He braces and heaves'], [12.9, 'pop', 'The tongue snaps free'], [13.8, 'trudges-off', 'Glove over his mouth, he trudges off the way he came'],
];
/** The ending the game adds after the reference's last beat. */
export const T_HEAVE = 12.2, T_POP = 12.9, T_TURN = 13.8, TONGUE_END = 16.4;
export const TONGUE_LINE = 'HEWP!';
/** In worker units from the riser: where the worker stands, and where his buddy stops. */
export const STAND = -36, BUDDY_STOP = -112;
/** The riser's box is the worker's drawing units at the same scale: a 40 x 120 box against his 120. */
export const RISER_BOX = { vw: 40, vh: 120, ax: 20, ay: 118 };
export const RISER_FRAC = (WORKER_FRAC * 40) / 120;

/**
 * The pose at a time. `from`: where the two walk in from, `out`: where they walk off to, in their
 * own units from the riser (the reference's are -300 and -330).
 */
function base(from: number): any { return {dx:from, y:0, rot:0, face:1, thB:0,thF:0,shB:0,shF:0, arB:0,arF:0,foF:-10,foB:-10, head:0,hatY:0,
  px:71.5,py:33.5, lid:'M65 28 L75 28 L75 29 L65 29 Z', brow:'M65 24.5 Q70 22.5 76 24.5', mouth:'M64 47 Q68 48.5 72 47', show:true, phone:false}; }
const BIG = (o: any) => { o.lid = 'M65 23 L75 23 L75 24 L65 24 Z'; o.brow = 'M65 21.5 Q70 19 76 21.5'; };

export function tonguePose(t: number, from = -300, out = -330, BS = BUDDY_STOP): any {
  const w = base(from), b = base(from); b.show = false;
  const walk = (o: any, speed: number, amp: number, phase = 0) => { const c = Math.sin((t+phase)*2*Math.PI*speed);
    o.thB = c*amp; o.thF = -c*amp; o.shB = Math.max(0,-c)*amp*.9; o.shF = Math.max(0,c)*amp*.9; o.arB = -c*amp*.8; o.arF = c*amp*.8; o.foB = -12; o.foF = -12;
    o.y = -Math.abs(Math.cos((t+phase)*2*Math.PI*speed))*2.2; o.hatY = -Math.abs(Math.cos((t+phase)*2*Math.PI*speed - .6))*1.2; };
  let tongue = 0, breath = false, bubble = false, flash = 0, flake = -1;
  // ----- worker -----
  if (t < .3) w.show = false;
  else if (t < 2.2){ const k = seg(t,.3,2.2); w.dx = lerp(from, STAND, 1 - Math.pow(1-k,1.6)); walk(w, 1.6, 26); breath = true; }
  else if (t < 2.7){ w.dx = STAND; w.head = -4; w.px = 74; w.py = 33; w.brow = 'M65 23.5 Q70 22 76 25'; w.mouth = 'M65 47.5 Q68 46.5 71 47.5'; breath = true; }   // hmm
  else if (t < 3.0){ const k = seg(t,2.7,3.0); w.dx = STAND; w.px = k < .5 ? 66.5 : 74.5; w.head = k < .5 ? -3 : 3; w.lid = 'M65 28 L75 30 L75 32 L65 31 Z'; }   // checks around
  else if (t < 3.3){ const k = ease(seg(t,3.0,3.3)); w.dx = STAND; w.rot = 13*k; w.px = 74.5; w.py = 34; w.mouth = 'M64 46.5 Q68 50 72 46.5 Z'; tongue = k; w.lid = 'M65 27 L75 27 L75 31 L65 31 Z'; }   // leans in and licks
  else if (t < 3.5){ w.dx = STAND; w.rot = 13; BIG(w); w.px = 72.5; w.py = 33.5; w.mouth = 'M66 46 Q69 43.5 72 46 Q72 50 69 50 Q66 50 66 46 Z'; tongue = 1; }   // stuck!
  else if (t < 5.0){ const k = seg(t,3.5,5.0), tug = Math.abs(Math.sin(k*Math.PI*4));
    w.dx = STAND - 3 - tug*5; w.rot = 13 - 15*tug; BIG(w); w.px = 72.5; w.py = 33.5; w.mouth = 'M66 46 Q69 43.5 72 46 Q72 50 69 50 Q66 50 66 46 Z'; tongue = 1;
    w.arF = -120 + Math.sin(t*22)*40; w.foF = -30 + Math.sin(t*22+1)*30; w.arB = -140 + Math.sin(t*22+2)*40; w.foB = -20;            // flailing
    w.thB = Math.sin(t*16)*18; w.thF = -Math.sin(t*16)*18; w.shB = Math.max(0,-Math.sin(t*16))*16; w.shF = Math.max(0,Math.sin(t*16))*16; }   // feet scrabble on the ice
  else if (t < 7.9){ w.dx = STAND - 5; w.rot = 7; BIG(w); w.px = 68; w.py = 33; w.mouth = 'M66 46 Q69 43.5 72 46 Q72 50 69 50 Q66 50 66 46 Z'; tongue = 1;
    w.arB = -160 + Math.sin(t*14)*25; w.foB = -10 + Math.sin(t*14)*20; w.arF = 15; bubble = t < 6.4;                                  // waves for help
    if (t > 7.0){ w.brow = 'M65 22 Q70 19.5 76 22'; w.lid = 'M65 26 L75 26 L75 27 L65 27 Z'; } }                                  // relief, help has arrived
  else if (t < 11.0){ w.dx = STAND - 5; w.rot = 7; tongue = 1; w.mouth = 'M66 46 Q69 43.5 72 46 Q72 50 69 50 Q66 50 66 46 Z'; w.arB = 10; w.arF = 10;
    w.lid = 'M65 29 L75 29 L75 31.5 L65 31.5 Z'; w.brow = 'M65 25.5 L76 25.5'; w.px = 68; w.py = 33; if (t > 9.6){ w.px = 67; } }        // deadpan
  else { w.dx = STAND - 5; w.rot = 7; tongue = 1; w.mouth = 'M66 46 Q69 43.5 72 46 Q72 50 69 50 Q66 50 66 46 Z'; w.arB = 10; w.arF = 10;
    w.px = 74.2; w.py = 34; w.brow = 'M65 23 Q70 23.5 76 25.5'; w.lid = 'M65 28 L75 28 L75 30 L65 30 Z';
    flake = seg(t,11.0,11.8); if (t > 11.8 && t < 12.0) w.lid = 'M65 27 L75 27 L75 38 L65 38 Z'; }                                 // snowflake, blink

  // ----- buddy -----
  if (t >= 5.6 && t < 7.0){ b.show = true; const k = seg(t,5.6,7.0); b.dx = lerp(from, BS, 1 - Math.pow(1-k,1.6)); walk(b, 1.5, 24, .3); }
  else if (t >= 7.0 && t < 7.4){ b.show = true; b.dx = BS; b.px = 74; b.brow = 'M65 23 Q70 21 76 23'; b.head = -3; }
  else if (t >= 7.4 && t < 8.6){ b.show = true; b.dx = BS; const k = ease(seg(t,7.4,7.8)); b.arF = lerp(0, -70, k); b.foF = lerp(-10, -60, k); b.phone = true; b.px = 74; b.lid = 'M65 27 L75 27 L75 30 L65 30 Z';
    b.mouth = 'M64 46.5 Q68 49 72 46.5'; if (t > 7.9) b.mouth = 'M63 46 Q68 51 73 46 Z'; flash = t > 7.9 && t < 8.15 ? 1 - seg(t,7.9,8.15) : 0; }
  else if (t >= 8.6 && t < 9.6){ b.show = true; b.dx = BS; b.arF = -40; b.foF = -75 + Math.sin(t*40)*6; b.phone = true; b.head = 12; b.px = 72.8; b.py = 36.2;
    const c = Math.abs(Math.sin(t*15)); b.y = -c*1.6; b.mouth = 'M63 46 Q68 52 73 46 Z'; b.lid = 'M65 27 Q70 32 75 27 L75 33 L65 33 Z'; }   // cracks up, typing
  else if (t >= 9.6 && t < 11.2){ b.show = true; const k = seg(t,9.6,11.2); b.face = k < .08 ? 1 : -1; b.dx = lerp(BS, out, clamp((k-.08)/.92)); b.y = k < .08 ? -Math.sin(k/.08*Math.PI)*5 : 0;
    if (k >= .08) walk(b, 1.3, 20); b.arF = -40; b.foF = -75; b.phone = true; b.head = 12; b.px = 72.8; b.py = 36.2; b.mouth = 'M63 46 Q68 52 73 46 Z'; b.lid = 'M65 27 Q70 32 75 27 L75 33 L65 33 Z'; b.y -= Math.abs(Math.sin(t*15))*1.2; }
  // ----- THE ENDING (not in the reference, which loops with him still stuck): the game needs him off
  // screen. After the blink he braces and gives one mighty heave; the tongue stretches and snaps
  // free with a pop; he staggers back, claps a glove over his mouth, hop-turns and trudges off the
  // way he came. -----
  let pop = -1, stretch = 0;
  if (t >= T_HEAVE && t < T_POP){ const k = ease(seg(t,T_HEAVE,T_POP)); w.dx = STAND - 5 - 9*k; w.rot = 7 - 19*k; stretch = k; BIG(w); w.px = 72.5; w.py = 33.5;
    w.arF = -30 - 40*k; w.arB = -30 - 40*k; w.thF = -14*k; w.thB = 12*k; w.brow = 'M65 26 Q70 22 76 23'; flake = -1; }
  else if (t >= T_POP && t < T_TURN){ const k = seg(t,T_POP,T_POP + .45), back = Math.sin(clamp(k)*Math.PI*.5); tongue = 0; pop = seg(t,T_POP,T_POP + .4); flake = -1;
    w.dx = STAND - 14 - 16*back; w.y = -Math.sin(clamp(k)*Math.PI)*6; w.rot = -12 + 12*clamp(k*1.4); BIG(w); w.px = 72.5; w.py = 33.5;
    w.mouth = 'M66 46 Q69 44.5 72 46 Q72 48.5 69 48.5 Q66 48.5 66 46 Z';
    const up = ease(seg(t,T_POP + .35,T_POP + .6)); w.arF = lerp(-70, -66, up); w.foF = lerp(-10, -98, up); w.arB = 10;        // glove over his mouth
    if (t > T_POP + .7){ w.lid = 'M65 28 L75 28 L75 31 L65 31 Z'; w.brow = 'M65 25.5 L76 26.5'; } }
  else if (t >= T_TURN){ const k = seg(t,T_TURN,TONGUE_END - .1), hop = seg(t,T_TURN,T_TURN + .25); tongue = 0; flake = -1;
    w.face = hop < .5 ? 1 : -1; w.rot = 0; w.arF = -66; w.foF = -98; w.lid = 'M65 28 L75 28 L75 31 L65 31 Z'; w.brow = 'M65 25.5 L76 26.5'; w.mouth = 'M65 47.5 L71 47.5';
    if (hop < 1){ w.dx = STAND - 30; w.y = -Math.sin(hop*Math.PI)*6; }
    else { const k2 = seg(t,T_TURN + .25,TONGUE_END - .1); w.dx = lerp(STAND - 30, out, k2*k2*.3 + k2*.7); walk(w, 1.5, 22); w.arF = -66; w.foF = -98; if (k >= 1) w.show = false; } }
  return {w, b, tongue, breath, bubble, flash, flake, pop, stretch};
}

function pupApply(B: Pup, p: any): void {
  const q = B.q;
  q('.flip').style.visibility = p.show ? 'visible' : 'hidden';
  q('.flip').setAttribute('transform', p.face < 0 ? 'translate(120 0) scale(-1 1)' : '');
  const body = `translate(0 ${p.y}) rotate(${p.rot} 60 80)`;
  ['.legB','.armB','.torso','.legF','.head','.armF'].forEach(sel => {
    const g = q(sel); const base = g.dataset.base ?? (g.dataset.base = g.getAttribute('transform') || '');
    let extra = '';
    if (sel === '.head') extra = ` rotate(${p.head} 62 50)`;
    if (sel === '.legB') extra = ` rotate(${p.thB})`; if (sel === '.legF') extra = ` rotate(${p.thF})`;
    if (sel === '.armB') extra = ` rotate(${p.arB})`; if (sel === '.armF') extra = ` rotate(${p.arF})`;
    const bod = (sel === '.legB' || sel === '.legF') ? `translate(0 ${p.y})` : body;   // legs stay planted when he leans
    g.setAttribute('transform', `${bod} ${base}${extra}`);
  });
  q('.legB .shin').setAttribute('transform', `translate(0 14) rotate(${p.shB})`); q('.legF .shin').setAttribute('transform', `translate(0 14) rotate(${p.shF})`);
  q('.armB .fore').setAttribute('transform', `translate(0 12) rotate(${p.foB})`); q('.armF .fore').setAttribute('transform', `translate(0 12) rotate(${p.foF})`);
  q('.hat').setAttribute('transform', `translate(0 ${p.hatY})`);
  q('.pupil').setAttribute('cx', p.px); q('.pupil').setAttribute('cy', p.py);
  q('.lid').setAttribute('d', p.lid); q('.brow').setAttribute('d', p.brow);
  q('.mouth').setAttribute('d', p.mouth); q('.mouth').setAttribute('fill', p.mouth.includes('Z') ? '#7a2a22' : 'none');
  const ph = q('.phone'); if (ph) ph.style.display = p.phone ? '' : 'none';
}
// a point in a part's own coordinates, in host pixels
function pt(B: Pup, sel: string, x: number, y: number): { x: number; y: number } { const el = B.q(sel), m = el.getScreenCTM(), r = B.host.getBoundingClientRect(); return {x: m.a*x + m.c*y + m.e - r.left, y: m.b*x + m.d*y + m.f - r.top}; }

/** The riser, standing at `spot` (shares of its layer). */
export const riserPup = (host: HTMLElement, spot: { x: number; y: number }, scale: number): Pup => makePup(host, RISER, { ...RISER_BOX, frac: RISER_FRAC * scale, spot });

/** The worker, his buddy, the overlay and the flash on a layer; the riser is the permanent one. `flashBox`: the strip the flash lights (px). */
export function tongueScene(layer: HTMLElement, riser: Pup, scale: number, flashBox: { top: number; height: number }): any {
  const z = (p: Pup, n: number) => ((p.svg.style.zIndex = String(n)), p);
  const sc: any = { riser };
  sc.worker = z(makePup(layer, BUILD, { vw: 120, vh: 120, ax: 60, ay: 108, frac: WORKER_FRAC * scale, spot: { ...riser.spot } }), 5);
  sc.buddy = z(makePup(layer, BUDDY, { vw: 120, vh: 120, ax: 60, ay: 108, frac: WORKER_FRAC * scale, spot: { ...riser.spot } }), 6);
  sc.buddy.q('.armF .fore').insertAdjacentHTML('afterbegin', PHONE);
  sc.ov = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  sc.ov.setAttribute('class', 'pup-overlay');
  sc.ov.style.zIndex = '7';
  layer.appendChild(sc.ov);
  sc.flash = addEl(layer, 'pup-flash');
  Object.assign(sc.flash.style, { top: `${flashBox.top}px`, height: `${flashBox.height}px` });
  sc.head = { x: 0, y: 0 };
  return sc;
}

export function tongueApply(sc: any, P: any, t: number): void {
  const {w, b} = P;
  const r = sc.worker.host.getBoundingClientRect(), u = sc.worker.frac*r.width/120;
  place(sc.worker, w.dx); pupApply(sc.worker, w);
  place(sc.buddy, b.dx); pupApply(sc.buddy, b);
  let html = '';
  // tongue: from his mouth to the cold pipe
  const m = pt(sc.worker, '.head', 71, 48.5);
  const pipeX = sc.riser.spot.x*r.width - 6*u;
  if (P.tongue > 0){
    if (t < 3.3) sc.stuckY = m.y;
    const ty = sc.stuckY ?? m.y, tx = lerp(m.x, pipeX, P.tongue);
    const d = `M${m.x} ${m.y} Q${(m.x + tx)/2} ${(m.y + ty)/2 + 1.5*u} ${tx} ${ty}`;
    // (the heave thins it as it stretches)
    html += `<path class="tongue" d="${d}" stroke="${O}" stroke-width="${(5.2 - 1.6*(P.stretch ?? 0))*u}" fill="none" stroke-linecap="round"/><path d="${d}" stroke="#ef7f86" stroke-width="${(3 - 1.2*(P.stretch ?? 0))*u}" fill="none" stroke-linecap="round"/>`;
    if (t >= 3.3 && t < 3.9){ const k = seg(t,3.3,3.9); for (let i = 0; i < 5; i++){ const a = -Math.PI*(.15 + i*.17), L = 7*u*(1 + k);
      html += `<path d="M${pipeX + Math.cos(a)*L} ${ty + Math.sin(a)*L*.9} l${Math.cos(a)*3*u} ${Math.sin(a)*3*u}" stroke="#bfe6ff" stroke-width="${Math.max(1.2, 1.4*u)}" stroke-linecap="round" opacity="${1-k}"/>`; } }   // frosty sparkle at the stick
  }
  // the pop as it snaps free: the same frosty sparkle, at the pipe
  if (P.pop >= 0 && P.pop < 1){ const k = P.pop, ty = sc.stuckY ?? m.y; for (let i = 0; i < 6; i++){ const a = -Math.PI*(.1 + i*.16), L = 6*u*(1 + k*1.6);
    html += `<path d="M${pipeX + Math.cos(a)*L} ${ty + Math.sin(a)*L*.9} l${Math.cos(a)*3.4*u} ${Math.sin(a)*3.4*u}" stroke="#bfe6ff" stroke-width="${Math.max(1.2, 1.4*u)}" stroke-linecap="round" opacity="${1-k}"/>`; } }
  // cold breath puffs
  if (P.breath){ for (let i = 0; i < 2; i++){ const k = ((t*1.1 + i*.5) % 1); html += `<circle cx="${m.x + (4 + k*10)*u}" cy="${m.y - k*5*u}" r="${(1.6 + k*3)*u}" fill="#ffffff" stroke="#c7d3de" stroke-width="${.8*u}" opacity="${(1-k)*.85}"/>`; } }
  // snowflake onto his nose
  if (P.flake >= 0){ const n = pt(sc.worker, '.head', 79, 38), k = P.flake, fx = n.x + Math.sin(k*9)*6*u*(1-k), fy = lerp(n.y - 70*u, n.y - 3*u, k), s = Math.max(2, 2.2*u);
    html += `<g class="flake" stroke="#ffffff" stroke-width="${Math.max(1, .9*u)}" stroke-linecap="round" transform="translate(${fx} ${fy}) rotate(${k*200})"><path d="M${-s} 0 L${s} 0 M0 ${-s} L0 ${s} M${-s*.7} ${-s*.7} L${s*.7} ${s*.7} M${-s*.7} ${s*.7} L${s*.7} ${-s*.7}"/></g>`; }
  if (sc.ovHtml !== html) sc.ov.innerHTML = sc.ovHtml = html;
  // where his head is, for the "HEWP!" bubble
  sc.head = pt(sc.worker, '.head', 46, 6);
  sc.flash.style.opacity = String(P.flash*.75);
}

/** Wildlife Log card art: stuck to the pipe, eyes huge. Drawn into one picture (the riser shares his units). */
export function tongueStill(): string {
  const host = document.createElement('div');
  const w = makePup(host, BUILD, { vw: 120, vh: 120, ax: 60, ay: 108, frac: 1, spot: { x: 0, y: 0 } });
  const p = tonguePose(4.6).w;
  pupApply(w, { ...p, rot: 7, arF: -120, arB: -150 });
  // The riser stands STAND + 5 units to his right; the tongue runs from his mouth (leaning 7 degrees about 60,80) to the pipe.
  const rx = 60 - (STAND - 5), a = (7 * Math.PI) / 180, mx = 60 + (71 - 60) * Math.cos(a) - (48.5 - 80) * Math.sin(a), my = 80 + (71 - 60) * Math.sin(a) + (48.5 - 80) * Math.cos(a);
  const d = `M${mx} ${my} Q${(mx + rx - 6) / 2} ${my + 1.5} ${rx - 6} ${my}`;
  w.svg.insertAdjacentHTML('afterbegin', `<g transform="translate(${rx - 20} ${108 - 118})">${RISER}</g>`);
  w.svg.insertAdjacentHTML('beforeend', `<path d="${d}" stroke="${O}" stroke-width="5.2" fill="none" stroke-linecap="round"/><path d="${d}" stroke="#ef7f86" stroke-width="3" fill="none" stroke-linecap="round"/>`);
  w.svg.removeAttribute('style');
  w.svg.setAttribute('class', 'egg-still tongue-still');
  w.svg.setAttribute('viewBox', '24 -6 112 124');
  return w.svg.outerHTML;
}

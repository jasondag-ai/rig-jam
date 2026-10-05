// Gag 13, gopher lunch, as code puppets ported from the approved reference
// (~/Desktop/RHR Art Inbox/gopher_lunch_reference.html): the same drawings, poses and timing, played
// at the BOARD'S OWN gopher mound (scenery.ts) rather than a second drawing of it. The worker
// strolls in with his sandwich, plops down with his back to the mound, sets the sandwich behind him
// and scrolls his phone; a paw peeks out of the hole, the arm feels around, grabs the sandwich and
// yanks it down; chomp chomp, crumbs; the paw politely returns the crust, pat pat; he reaches back
// without looking, bites, stops, stares at the crust; behind him the gopher pops up with stuffed
// cheeks and ducks just before he looks; deadpan.
// Then (the Oct 5 revision) he boils over, gets up, hurls the crust down the hole and stomps off;
// the gopher pops up chewing the crust, burp, gone: it ends on the quiet mound, exactly as it began.
// strip-gags.ts puts it on screen.
/* eslint-disable */
import { GOPHER, GOPHER_FRAC } from './near-miss.ts';
import { addEl, makePup, place, type Pup } from './puppet-stage.ts';
import { WORKER, WORKER_FRAC } from './worker.ts';
const O = '#2b1e16';
const ease = (x: number) => (x < 0.5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2);
const clamp = (x: number, a = 0, b = 1) => Math.max(a, Math.min(b, x));
const seg = (t: number, a: number, b: number) => clamp((t - a) / (b - a));
const lerp = (a: number, b: number, k: number) => a + (b - a) * k;
const FUR='#c99e64', FUR2='#ad8350';

/* ---------------- the hole's near lip ----------------
   The lower half of the hole, drawn in front so the arm looks like it comes out of the hole. It is
   the board mound's own hole (scenery.ts `mound`: ring at 33,17 with radii 11 x 6, throat at
   33,18.4 with radii 8 x 3.6, in its 64 x 34 box), laid exactly over it. */
export const MOUND_BOX = { vw: 64, vh: 34 };
/** In the board mound's box: the hole's centre, the line its base stands on, and how wide the heap is drawn. */
export const MOUND_HOLE = { x: 33, y: 17 };
export const MOUND_BASE = 29.5;
export const MOUND_DRAWN = 59;
export const LIP = `
<path d="M22 17 A11 6 0 0 0 44 17 Z" fill="#3a2414"/>
<path d="M22 17 A11 6 0 0 0 44 17" fill="none" stroke="#2a1a0c" stroke-width="1.5" vector-effect="non-scaling-stroke"/>
<path d="M25 18.4 A8 3.6 0 0 0 41 18.4 Z" fill="#120a04"/>`;
/** The reference's own mound is 92 units across its heap, in a box drawn at this share of the screen's width. */
export const REF_MOUND = { drawn: 92, frac: 0.113 };
/** The board mound's width (its whole box, px) that makes its heap the size of the reference's. */
export const moundWidthFor = (screenW: number, scale: number): number => ((REF_MOUND.frac * scale * screenW * REF_MOUND.drawn) / 100) * (MOUND_BOX.vw / MOUND_DRAWN);

/* ---------------- lunch ---------------- */
/* ---------------- lunch ---------------- */
const SANDWICH = `<svg viewBox="0 0 26 16" width="100%" height="100%" overflow="visible">
<path d="M2 11 Q2 15 6 15 L20 15 Q24 15 24 11 Z" fill="#e9b867" stroke="${O}" stroke-width="1.6" stroke-linejoin="round"/>
<path d="M2 10 Q5 7.5 8 10 Q11 7.5 14 10 Q17 7.5 20 10 Q23 7.5 25 10 L24 11.5 L2 11.5 Z" fill="#7cc04a" stroke="${O}" stroke-width="1.2" stroke-linejoin="round"/>
<rect x="3" y="7.4" width="20" height="2.6" rx="1.3" fill="#e9837b" stroke="${O}" stroke-width="1.2"/>
<path d="M2 7.5 Q2 1.5 13 1.5 Q24 1.5 24 7.5 Z" fill="#e9b867" stroke="${O}" stroke-width="1.6" stroke-linejoin="round"/>
<path d="M6 4.8 Q9 3 13 3" stroke="#f6d79a" stroke-width="1.4" fill="none" stroke-linecap="round"/></svg>`;
const CRUST = `<svg viewBox="0 0 26 16" width="100%" height="100%" overflow="visible">
<path d="M3 13 Q3 5 9 4 Q7 7 7 13 Z" fill="#c98f45" stroke="${O}" stroke-width="1.6" stroke-linejoin="round"/>
<path d="M5 8 L6 8.6" stroke="#f6d79a" stroke-width="1" stroke-linecap="round"/></svg>`;
const PHONE = `<g class="phone" style="display:none"><rect x="-2" y="4" width="10" height="15" rx="2" fill="#2f3440" stroke="${O}" stroke-width="1.6" transform="rotate(-20 3 11)"/><rect x="-.4" y="5.8" width="6.8" height="10.6" rx="1" fill="#8fd3f0" transform="rotate(-20 3 11)"/></g>`;

export const LUNCH_BEATS: [number, string, string][] = [
  [0, 'quiet-mound', 'A quiet gopher mound'], [0.5, 'stroll-in', 'The worker strolls in with his sandwich'], [3.0, 'plops-down', 'Turns and plops down, back to the mound'],
  [4.0, 'sets-it-down', 'Leans back and sets his sandwich down behind him, right by the hole'], [4.8, 'phone', 'Out comes the phone. He scrolls, totally absorbed'],
  [5.2, 'paw-peeks', 'A little paw peeks out of the hole'], [5.7, 'feels-around', 'The arm sneaks out and feels around for the sandwich'], [6.9, 'yank', 'Grabs it and yanks it down the hole'],
  [7.2, 'chomp', 'Chomp chomp chomp. Crumbs fly out of the hole. The worker chuckles at his phone'], [8.6, 'crust-back', 'The paw comes back out and politely returns the crust. Pat pat'],
  [9.6, 'bite', 'Without looking, he reaches back, grabs it, takes a bite'], [10.3, 'eyes-huge', 'Chews... stops. Looks at the crust. Eyes go huge'],
  [10.8, 'cheeks', 'Behind him the gopher pops up, cheeks stuffed, chewing happily'], [11.5, 'ducks', 'He turns to look at the hole. The gopher ducks just in time'],
  [12.0, 'deadpan', 'He looks back at us. Deadpan'], [12.8, 'boils-over', 'He boils over. Red face, steam, gets up'],
  [13.6, 'hurls-crust', 'Glares back and hurls the crust down the hole'], [14.3, 'stomps-off', 'Stomps off, fuming, fully off screen'],
  [15.0, 'burp', 'The gopher pops up chewing the crust. Burp. Grin. Gone'], [16.2, 'quiet-again', 'Just the quiet mound again, exactly like the start'],
];
/** SAME START, SAME END: it ends on the empty mound (he is off screen by 16.6). */
export const LUNCH_END = 16.7;
/** How far left of the mound's middle the worker sits, as a share of the screen's width (the reference: 0.655 against 0.752). */
export const LUNCH_GAP = 0.097;

/**
 * The pose at a time. `from`: where the worker's picture walks in from and `out`: where it walks off
 * to at the end, both in his own drawing's units (the reference walks in from -300).
 */
export function lunchPose(t: number, from = -300, out = -300): any {
  const w: any = {x:0, y:0, rot:0, sx:1, sy:1, face:1, dx:from, thB:0,thF:0,shB:0,shF:0, arB:0,arF:-30,foF:-60,foB:0, head:0,hatY:0,hatR:0,
    px:71.5,py:33.5, lid:'M65 28 L75 28 L75 29 L65 29 Z', brow:'M65 24.5 Q70 22.5 76 24.5', mouth:'M64 47 Q68 48.5 72 47', show:true, phone:false, blush:0, steam:false};
  const g: any = {dy:80, cheeks:false, chew:0, grin:false, lids:'half'};
  const a: any = {show:false, k:0, tx:0, ty:0, hold:null};       // gopher arm: k = reach fraction, (tx, ty) = paw offset from the food spot in mound units
  let food = 'hand';                                        // hand | ground | paw | gone | crust | crustPaw | crustHand
  const walk = (o: any, speed: number, amp: number) => { const c = Math.sin(t*2*Math.PI*speed);
    o.thB = c*amp; o.thF = -c*amp; o.shB = Math.max(0,-c)*amp*.9; o.shF = Math.max(0,c)*amp*.9; o.arB = -c*amp*.8; o.foB = -12;
    o.y = -Math.abs(Math.cos(t*2*Math.PI*speed))*2.2; o.hatY = -Math.abs(Math.cos(t*2*Math.PI*speed - .6))*1.2; };
  const sit = (o: any) => { o.y = 24; o.thB = o.thF = -90; o.shB = o.shF = 0; o.arB = 10; o.foB = -10; };
  const reachBack = (o: any, k: number) => { o.rot = -16*k; o.arF = lerp(10, 50, k); o.foF = lerp(-20, 0, k); };
  const phoneUp = (o: any) => { o.arF = -40; o.foF = -75; o.phone = true; o.head = 12; o.px = 72.8; o.py = 36.2; o.lid = 'M65 27 L75 27 L75 31 L65 31 Z'; o.mouth = 'M64 47 Q68 49 72 47'; };

  // ----- worker -----
  if (t < .5){ w.show = false; }
  else if (t < 3.0){ const k = seg(t,.5,3.0); w.dx = lerp(from, 0, 1 - Math.pow(1-k,1.6)); walk(w, 1.6, 26); w.arF = -40; w.foF = -60; }
  else if (t < 3.3){ const k = seg(t,3.0,3.3); w.dx = 0; w.y = -Math.sin(k*Math.PI)*7; w.face = k < .5 ? 1 : -1; w.arF = -40; w.foF = -60; w.thB = w.thF = -10*Math.sin(k*Math.PI); }   // hop turn, snaps at the top
  else if (t < 4.0){ const k = ease(seg(t,3.3,3.85)); w.dx = 0; w.face = -1; w.y = 24*k + Math.sin(seg(t,3.85,4.0)*Math.PI)*-1.5; w.thB = w.thF = -90*k; w.shB = w.shF = 95*Math.sin(k*Math.PI)*(1-k*.2) ;
    if (k > .99){ w.shB = w.shF = 0; } w.arF = lerp(-40, 10, k); w.foF = lerp(-60, -20, k); w.arB = 10*k; }
  else { w.dx = 0; w.face = -1; sit(w); w.arF = 10; w.foF = -20; }
  if (t >= 4.0 && t < 4.8){ const k = Math.sin(seg(t,4.0,4.8)*Math.PI); reachBack(w, clamp(k*1.4)); w.px = 67.5; w.head = -4*k; }          // sets it down behind him
  if (t >= 4.8 && t < 9.6){ phoneUp(w);
    if (t > 7.2 && t < 8.4){ const c = Math.abs(Math.sin(t*14)); w.y = 24 - c*1.4; w.mouth = 'M64 46 Q68 51 72 46 Z'; w.lid = 'M65 27 Q70 31.5 75 27 L75 33 L65 33 Z'; } }   // chuckles at something on the phone
  if (t >= 9.6 && t < 10.3){ phoneUp(w); if (t < 10.0){ reachBack(w, clamp(seg(t,9.6,9.9)*1.0)); w.phone = false; w.head = 9; }
    else { const k2 = seg(t,10.0,10.3); w.rot = lerp(-16, 0, k2); w.arF = lerp(58, -70, ease(k2)); w.foF = lerp(8, -95, ease(k2)); w.phone = false; } }               // reach back without looking, bring it to his mouth
  if (t >= 10.3 && t < 11.5){ w.arF = -60; w.foF = -90; w.phone = false; w.head = 0; w.px = 71.5; w.py = 33.5;
    if (t < 10.75){ const c = Math.sin(t*22); w.mouth = c > 0 ? 'M64 47 Q68 50 72 47' : 'M64 47.5 Q68 46.5 72 47.5'; w.arF = -70; w.foF = -95; }
    else { const k = seg(t,10.75,10.95); w.arF = lerp(-70, -48, k); w.foF = lerp(-95, -80, k); w.lid = 'M65 23 L75 23 L75 24 L65 24 Z'; w.px = 72.5; w.py = 35.5; w.brow = 'M65 21.5 Q70 19 76 21.5'; w.mouth = 'M66 46 Q69 43.5 72 46 Q72 50 69 50 Q66 50 66 46 Z'; } }      // stares at the crust, eyes huge
  if (t >= 11.5 && t < 12.0){ w.arF = -48; w.foF = -80; const k = ease(seg(t,11.5,11.75)); w.head = -6*k; w.px = lerp(72.5, 66, k); w.py = 33; w.lid = 'M65 26 L75 26 L75 27 L65 27 Z'; w.brow = 'M65 23 Q70 21 76 23.5'; w.mouth = 'M65 47.5 L71 47.5'; }   // looks back at the hole
  if (t >= 12.0 && t < 12.8){ w.arF = -48; w.foF = -80; w.head = 0; w.px = 74.2; w.py = 34; w.lid = 'M65 29 L75 29 L75 31.5 L65 31.5 Z'; w.brow = 'M65 25.5 L76 25.5'; w.mouth = 'M65 47.5 L71 47.5'; }       // deadpan at camera
  const ANGRY = (o: any) => { o.brow = 'M65 27.5 L76 23.5'; o.lid = 'M65 27 L75 25 L75 29 L65 30 Z'; o.mouth = 'M64 48 Q68 45.5 72 48'; o.blush = 1; o.steam = true; };
  if (t >= 12.8 && t < 13.6){ const k = ease(seg(t,12.9,13.5)); ANGRY(w); w.blush = seg(t,12.8,13.0); w.steam = t > 12.95; w.px = 74.2; w.py = 34;           // boils over and gets up
    w.y = 24*(1-k); w.thB = w.thF = -90*(1-k); w.shB = w.shF = 95*Math.sin((1-k)*Math.PI)*.8; w.arF = lerp(-48, -70, k); w.foF = -80; w.arB = 10; }
  if (t >= 13.6 && t < 14.3){ ANGRY(w); const k = seg(t,13.6,14.2); w.y = 0; w.thB = w.thF = 0; w.shB = w.shF = 0; w.arB = 0; w.head = -6; w.px = 66.5; w.py = 33;                                               // glares back, hurls the crust
    w.arF = k < .4 ? lerp(-70, -150, ease(k/.4)) : lerp(-150, 60, ease((k-.4)/.6)); w.foF = k < .4 ? -60 : -10; w.rot = k < .4 ? -4*ease(k/.4) : lerp(-4, 4, (k-.4)/.6); }
  if (t >= 14.3){ ANGRY(w); const k = seg(t,14.3,16.6); w.dx = lerp(0, out, k); w.show = t < 16.6; walk(w, 1.15, 30); w.y -= Math.abs(Math.sin(t*2*Math.PI*1.15))*1.5; w.arF = -20 + Math.sin(t*2*Math.PI*1.15)*12; w.foF = -95; w.arB = -Math.sin(t*2*Math.PI*1.15)*20; w.px = 74.2; w.py = 34;
    if (t > 15.1 && t < 15.5){ w.head = -4; w.px = 66.5; } }                                                                                          // stomps off, one last glare back

  // ----- food -----
  if (t < 4.55) food = 'hand';
  else if (t < 6.9) food = 'ground';
  else if (t < 7.15) food = 'paw';
  else if (t < 8.6) food = 'gone';
  else if (t < 9.1) food = 'crustPaw';
  else if (t < 9.88) food = 'crust';
  else if (t < 13.84) food = 'crustHand';
  else if (t < 14.2) food = 'thrown';
  else food = 'gone';

  // ----- gopher arm -----
  if (t >= 5.2 && t < 5.7){ a.show = true; a.k = .18 + Math.sin(seg(t,5.2,5.7)*Math.PI)*.08; a.tx = 0; a.ty = -14; }                    // paw peeks out
  if (t >= 5.7 && t < 6.75){ a.show = true; const k = seg(t,5.7,6.75); a.k = clamp(.2 + k*1.6, 0, 1); a.tx = 8 - k*8 + Math.sin(k*Math.PI*3)*7; a.ty = -Math.abs(Math.sin(k*Math.PI*3))*5; }   // feels around
  if (t >= 6.75 && t < 6.9){ a.show = true; a.k = 1; a.tx = 0; a.ty = 0; a.grab = true; }
  if (t >= 6.9 && t < 7.15){ a.show = true; a.k = 1 - ease(seg(t,6.9,7.15)); a.tx = 0; a.ty = 0; a.hold = 'sand'; }                    // yank
  if (t >= 8.6 && t < 9.1){ a.show = true; const k = seg(t,8.6,9.1); a.k = ease(clamp(k*1.5)); a.tx = 0; a.ty = 0; a.hold = 'crust'; }
  if (t >= 9.1 && t < 9.6){ a.show = true; const k = seg(t,9.1,9.6); a.k = k < .6 ? 1 : 1 - ease((k-.6)/.4); a.tx = 0; a.ty = k < .6 ? -Math.abs(Math.sin(k/.6*Math.PI*2))*4 : 0; }   // pat pat, back down the hole

  // ----- gopher head -----
  if (t >= 10.8 && t < 11.55){ const k = seg(t,10.8,11.0); g.dy = lerp(80, 24, ease(k)); g.cheeks = true; g.chew = Math.sin(t*24); if (t > 11.3) g.grin = true; if (t > 11.45) g.dy = lerp(24, 80, seg(t,11.45,11.55)); }
  if (t >= 15.0 && t < 16.1){ const k = seg(t,15.0,15.15); g.dy = lerp(80, 24, ease(k)); g.cheeks = true; g.chew = Math.sin(t*24); g.burp = t > 15.45 && t < 15.75; if (t > 15.6){ g.grin = true; g.cheeks = false; } if (t > 15.9) g.dy = lerp(24, 80, seg(t,15.9,16.05)); }
  return {w, g, a, food};
}

function workerApply(b: Pup, p: any): void {
  const q = b.q;
  q('.flip').style.visibility = p.show ? 'visible' : 'hidden';
  q('.flip').setAttribute('transform', p.face < 0 ? 'translate(120 0) scale(-1 1)' : '');
  const body = `translate(${p.x} ${p.y}) rotate(${p.rot} 60 104) translate(60 108) scale(${p.sx} ${p.sy}) translate(-60 -108)`;
  ['.legB','.armB','.torso','.legF','.head','.armF'].forEach(sel => {
    const g = q(sel); const base = g.dataset.base ?? (g.dataset.base = g.getAttribute('transform') || '');
    let extra = '';
    if (sel === '.head') extra = ` rotate(${p.head} 62 50)`;
    if (sel === '.legB') extra = ` rotate(${p.thB})`; if (sel === '.legF') extra = ` rotate(${p.thF})`;
    if (sel === '.armB') extra = ` rotate(${p.arB})`; if (sel === '.armF') extra = ` rotate(${p.arF})`;
    const bod = (sel === '.legB' || sel === '.legF') ? `translate(${p.x} ${p.y})` : body;   // legs stay planted when he leans
    g.setAttribute('transform', `${bod} ${base}${extra}`);
  });
  q('.legB .shin').setAttribute('transform', `translate(0 14) rotate(${p.shB})`); q('.legF .shin').setAttribute('transform', `translate(0 14) rotate(${p.shF})`);
  q('.armB .fore').setAttribute('transform', `translate(0 12) rotate(${p.foB})`); q('.armF .fore').setAttribute('transform', `translate(0 12) rotate(${p.foF})`);
  q('.hat').setAttribute('transform', `translate(0 ${p.hatY}) rotate(${p.hatR} 63 26)`);
  q('.pupil').setAttribute('cx', p.px); q('.pupil').setAttribute('cy', p.py);
  q('.lid').setAttribute('d', p.lid); q('.brow').setAttribute('d', p.brow);
  q('.mouth').setAttribute('d', p.mouth); q('.mouth').setAttribute('fill', p.mouth.includes('Z') ? '#7a2a22' : 'none');
  q('.phone').style.display = p.phone ? '' : 'none';
  q('.blush').setAttribute('opacity', p.blush); q('.blush').setAttribute('r', 4 + p.blush*3);
}

function putFood(el: HTMLElement, x: number, y: number, wpx: number, show: boolean): void { el.style.opacity = show ? '1' : '0'; el.style.width = wpx+'px'; el.style.height = (wpx*16/26)+'px'; el.style.transform = `translate3d(${x - wpx/2}px, ${y - wpx*16/52}px, 0)`; }

/**
 * The scene on one layer. `mound` is the board's mound as it stands in the layer (px): its box,
 * and from it the hole and the base line. `moundEl` (the board's drawing) wobbles while he eats.
 */
export function lunchScene(layer: HTMLElement, mound: { left: number; top: number; width: number; height: number }, scale: number, moundEl: SVGElement | HTMLElement | null): any {
  const r = layer.getBoundingClientRect(), W = r.width || 1, H = r.height || 1;
  const bu = mound.width / MOUND_BOX.vw;                    // px per board-mound unit
  const sc: any = { f: scale, moundEl };
  sc.um = (MOUND_DRAWN * bu) / REF_MOUND.drawn;             // px per REFERENCE mound unit: every distance in the reference is in these
  sc.hx = mound.left + MOUND_HOLE.x * bu; sc.hy = mound.top + MOUND_HOLE.y * bu;
  sc.groundY = mound.top + MOUND_BASE * bu;
  sc.moundX = sc.hx - 4 * sc.um;                            // the reference's hole is 4 units right of its mound's middle
  const zi = (el: HTMLElement | SVGElement, n: number) => ((el.style.zIndex = String(n)), el);
  // the gopher lives in a box that ends at the hole line, so he comes up out of the hole
  sc.clip = zi(addEl(layer, 'pup-clip'), 4);
  sc.clip.style.height = `${sc.hy}px`;
  sc.gopher = makePup(sc.clip, GOPHER, { vw: 120, vh: 120, ax: 60, ay: 108, frac: GOPHER_FRAC * scale, spot: { x: sc.hx / W, y: 1 } });
  sc.arm = zi(document.createElementNS('http://www.w3.org/2000/svg', 'svg'), 4); sc.arm.setAttribute('class', 'pup-overlay'); layer.appendChild(sc.arm);
  sc.lip = makePup(layer, LIP, { vw: MOUND_BOX.vw, vh: MOUND_BOX.vh, ax: 0, ay: 0, frac: mound.width / W, spot: { x: mound.left / W, y: mound.top / H } });
  zi(sc.lip.svg, 5);
  sc.worker = makePup(layer, WORKER, { vw: 120, vh: 120, ax: 60, ay: 108, frac: WORKER_FRAC * scale, spot: { x: (sc.moundX - LUNCH_GAP * scale * W) / W, y: sc.groundY / H } });
  zi(sc.worker.svg, 6);
  for (const part of ['.pail', '.reach']) (sc.worker.q(part) as SVGElement).style.display = 'none';
  sc.worker.q('.armF .fore').insertAdjacentHTML('afterbegin', PHONE);
  sc.sand = addEl(layer, 'pup-food', SANDWICH); sc.crust = addEl(layer, 'pup-food', CRUST);
  sc.ov = zi(document.createElementNS('http://www.w3.org/2000/svg', 'svg'), 8); sc.ov.setAttribute('class', 'pup-overlay'); layer.appendChild(sc.ov);
  // stuffed cheeks for the gopher, tucked behind his face
  sc.gopher.q('.head ellipse').insertAdjacentHTML('beforebegin', `<g class="cheeks" style="display:none"><circle cx="40" cy="58" r="11" fill="${FUR}" stroke="${O}" stroke-width="3"/><circle cx="80" cy="58" r="11" fill="${FUR}" stroke="${O}" stroke-width="3"/></g>`);
  return sc;
}

export function lunchApply(sc: any, P: any, t: number): void {
  const {w, g, a, food} = P;
  const r = sc.worker.host.getBoundingClientRect(), W = r.width;
  place(sc.lip);
  const um = sc.um, wu = sc.worker.frac*W/120, gu = sc.gopher.frac*W/120;
  const hx = sc.hx, hy = sc.hy, groundY = sc.groundY;
  // worker
  const Wk: Pup = sc.worker; place(Wk, w.dx); workerApply(Wk, w);
  // where his glove is right now
  const gl = Wk.q('.armF .fore circle').getBoundingClientRect(); const gx = gl.left + gl.width/2 - r.left, gy = gl.top + gl.height/2 - r.top;
  // food spot: behind him on the ground, just short of the mound
  const fx = sc.moundX - 46*um - 9*wu, fy = groundY - 4*wu, fw = 15*wu;
  sc.food = { x: fx, y: fy };
  // gopher arm
  let pawX = hx, pawY = hy, arm = '';
  if (a.show){ pawX = lerp(hx, fx + a.tx*um*.5, a.k); pawY = lerp(hy - 2*um, fy + a.ty*um*.5, a.k) - Math.sin(a.k*Math.PI)*10*um;
    const cx = lerp(hx, pawX, .45), cy = Math.min(hy, pawY) - 12*um*Math.min(1, a.k*2);
    const d = `M${hx} ${hy + 2*um} Q${cx} ${cy} ${pawX} ${pawY}`;
    arm = `<path d="${d}" stroke="${O}" stroke-width="${7.5*gu}" fill="none" stroke-linecap="round"/><path d="${d}" stroke="${FUR}" stroke-width="${4.4*gu}" fill="none" stroke-linecap="round"/>
      <circle class="paw" cx="${pawX}" cy="${pawY}" r="${4.2*gu}" fill="${FUR2}" stroke="${O}" stroke-width="${2*gu}"/>
      <path d="M${pawX - 3*gu} ${pawY + 3.4*gu} l${-.6*gu} ${2*gu} M${pawX} ${pawY + 4*gu} l0 ${2.2*gu} M${pawX + 3*gu} ${pawY + 3.4*gu} l${.6*gu} ${2*gu}" stroke="${O}" stroke-width="${1.2*gu}" stroke-linecap="round"/>`;
  }
  if (sc.armHtml !== arm) sc.arm.innerHTML = sc.armHtml = arm;
  // food
  const inHole = a.show && a.k < .35;
  sc.sand.style.zIndex = food === 'hand' ? '7' : '4'; sc.crust.style.zIndex = food === 'crustHand' ? '7' : '4';
  putFood(sc.sand, food === 'hand' ? gx : food === 'paw' ? pawX : fx, food === 'hand' ? gy : food === 'paw' ? pawY + 2*gu : fy, fw, w.show && (food === 'hand' || food === 'ground' || (food === 'paw' && !inHole)));
  if (food === 'crustHand') sc.throwFrom = {x: gx + 3*wu, y: gy};
  if (food === 'thrown'){ const k = seg(t,13.84,14.2), f0 = sc.throwFrom || {x: gx, y: gy}, cx = lerp(f0.x, hx, k), cy = lerp(f0.y, hy, k) - Math.sin(k*Math.PI)*22*um;
    sc.crust.style.zIndex = '4'; putFood(sc.crust, cx, cy, fw*(1 - k*.3), k < .92); sc.crust.style.transform += ` rotate(${k*720}deg)`; }
  else putFood(sc.crust, food === 'crustHand' ? gx + 3*wu : food === 'crustPaw' ? pawX + 4*gu : fx, food === 'crustHand' ? gy : food === 'crustPaw' ? pawY + 2*gu : fy, fw, (food === 'crust') || (food === 'crustHand') || (food === 'crustPaw' && !inHole));
  // gopher head
  const G: Pup = sc.gopher, gq = G.q; place(G);
  gq('.root').setAttribute('transform', `translate(0 ${g.dy})`);
  gq('.arms').style.display = 'none';
  gq('.cheeks').style.display = g.cheeks ? '' : 'none';
  gq('.cheeks').setAttribute('transform', `translate(60 58) scale(${1 + g.chew*.05} ${1 - g.chew*.05}) translate(-60 -58)`);
  gq('.lids').setAttribute('d', g.grin ? 'M45 50 Q51 45 57 50 L57 43 L45 43 Z M63 50 Q69 45 75 50 L75 43 L63 43 Z' : 'M45 49 L57 49 L57 43 L45 43 Z M63 49 L75 49 L75 43 L63 43 Z');
  gq('.mouth').setAttribute('d', g.grin ? 'M52 62 Q60 70 68 62' : (g.chew > 0 ? 'M55 64 Q60 66 65 64' : 'M55 63 Q60 61 65 63'));
  gq('.teeth').style.display = g.grin ? '' : 'none';
  // overlay: crumbs, chomp text, burp
  let html = '';
  const crumbs = (t0: number, t1: number, n: number, spread: number) => { if (t < t0 || t > t1) return; const k = seg(t, t0, t1);
    for (let i = 0; i < n; i++){ const ph = ((k*3 + i/n) % 1), ang = -Math.PI/2 + ((i*37 % 11)/11 - .5)*spread, sp = (14 + (i*13 % 7))*um;
      const x = hx + Math.cos(ang)*sp*ph*1.6, y = hy - Math.sin(-ang)*sp*ph*1.8 + ph*ph*16*um;
      html += `<circle cx="${x}" cy="${y}" r="${Math.max(1.2, 1.6*um)}" fill="#e9b867" stroke="${O}" stroke-width="${Math.max(.8, .6*um)}" opacity="${1 - ph*.6}"/>`; } };
  crumbs(7.2, 8.5, 9, 2.0);
  if (t > 7.25 && t < 8.5){ const k = (t*3) % 1, s = Math.max(10, 4.2*um*2);
    html += `<text x="${hx + 10*um}" y="${hy - 14*um - k*6*um}" font-family="Fredoka, sans-serif" font-weight="700" font-size="${s}" fill="#fff" stroke="${O}" stroke-width="${s*.22}" paint-order="stroke" opacity="${1-k*.5}">chomp</text>`; }
  if (g.burp){ const k = seg(t,15.45,15.75), s = Math.max(10, 4.2*um*2); crumbs(15.45, 15.75, 4, 1.2);
    html += `<text x="${hx + 8*um}" y="${hy - 26*um - k*5*um}" font-family="Fredoka, sans-serif" font-weight="700" font-size="${s}" fill="#fff" stroke="${O}" stroke-width="${s*.22}" paint-order="stroke">burp</text>`; }
  if (w.steam && w.show){ const hp = Wk.q('.hat').getBoundingClientRect(); for (let i = 0; i < 3; i++){ const k = ((t*1.6 + i/3) % 1), sx = hp.left - r.left + hp.width*(.25 + i*.25), sy = hp.top - r.top - k*14*wu;
    html += `<circle class="steam" cx="${sx + Math.sin(k*6 + i)*2*wu}" cy="${sy}" r="${(1.5 + k*3)*wu}" fill="#ffffff" stroke="#c9cfd6" stroke-width="${.7*wu}" opacity="${(1-k)*.9}"/>`; } }
  if (sc.ovHtml !== html) sc.ov.innerHTML = sc.ovHtml = html;
  // mound wobble while he eats
  const wob = (t > 7.2 && t < 8.5) ? Math.sin(t*50)*1.2 : 0;
  const turn = wob ? `rotate(${wob}deg)` : '';
  if (sc.moundEl) sc.moundEl.style.transform = turn;
  sc.lip.svg.style.transform = turn;
}

/** Wildlife Log card art: the gopher up out of his hole, cheeks stuffed. */
export function lunchStill(): string {
  const host = document.createElement('div');
  const p = makePup(host, GOPHER, { vw: 120, vh: 120, ax: 60, ay: 108, frac: 1, spot: { x: 0, y: 0 } });
  p.q('.head ellipse').insertAdjacentHTML('beforebegin', `<g class="cheeks"><circle cx="40" cy="58" r="11" fill="${FUR}" stroke="${O}" stroke-width="3"/><circle cx="80" cy="58" r="11" fill="${FUR}" stroke="${O}" stroke-width="3"/></g>`);
  p.q('.arms').style.display = 'none';
  p.q('.lids').setAttribute('d', 'M45 50 Q51 45 57 50 L57 43 L45 43 Z M63 50 Q69 45 75 50 L75 43 L63 43 Z');
  p.q('.mouth').setAttribute('d', 'M55 64 Q60 66 65 64');
  p.q('.teeth').style.display = 'none';
  p.svg.insertAdjacentHTML('beforeend', `<g transform="translate(74 92) scale(1.5)"><path d="M3 13 Q3 5 9 4 Q7 7 7 13 Z" fill="#c98f45" stroke="${O}" stroke-width="1.6" stroke-linejoin="round"/></g>`);
  p.svg.removeAttribute('style');
  p.svg.setAttribute('class', 'egg-still lunch-still');
  p.svg.setAttribute('viewBox', '14 14 92 96');
  return p.svg.outerHTML;
}

// Gag 8, the marshmallow on the flare stack, as a code puppet ported from the approved reference
// (~/Desktop/RHR Art Inbox/marshmallow_geese_reference.html): the same poses, beats and timing, on
// the sleepy worker's drawing (worker.ts). He walks into the bottom strip, telescopes a stick in
// three clicks from his hand to a flare's pilot flame, FWOOMP, yanks it back, blows it out, sniffs,
// shrugs, "Mmm. Crispy.", a puff of smoke from his ear, and strolls off. In the game the stick is
// aimed at the REAL flare (`tip`), and he walks in from and out to fully off screen (`from`, `to`).
// strip-gags.ts puts him on screen.
/* eslint-disable */
import { makePup, place, type Pup } from './puppet-stage.ts';
import { WORKER, WORKER_FRAC } from './worker.ts';
const O = '#2b1e16';
const ease = (x: number) => (x < 0.5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2);
const clamp = (x: number, a = 0, b = 1) => Math.max(a, Math.min(b, x));
const seg = (t: number, a: number, b: number) => clamp((t - a) / (b - a));
const lerp = (a: number, b: number, k: number) => a + (b - a) * k;

export const MM_BEATS: [number, string, string][] = [
  [0, 'walk-in', 'Walks in with a folded stick and a marshmallow'], [2.0, 'eyes-flare', 'Stops, eyes the flare, eyebrows wiggle'],
  [2.5, 'telescope', 'Telescopes the stick up over the berm: click, click, click'], [3.6, 'roast', 'Holds it in the pilot flame, licking his lips'],
  [4.5, 'fwoomp', 'FWOOMP. The marshmallow bursts into flame'], [4.6, 'eyes-pop', 'Eyes pop, hard hat jumps'],
  [5.1, 'yank', 'Yanks the stick back, flaming'], [5.8, 'blow', 'Blows it out'], [6.3, 'sniff-shrug', 'Charred lump. Sniffs it, shrugs'],
  [7.0, 'crispy', 'Pops it in. Happy chew. "Mmm. Crispy."'], [7.9, 'ear-smoke', 'A little smoke puff from his ears, then he strolls off'], [10.4, 'gone', 'Gone'],
];
export const MM_END = 10.5;
export const MM_LINE = 'Mmm. Crispy.';
/** The stick's overlay: drawn in screen px over the whole game screen. */
export const STICK = `<path class="stickO" stroke="${O}" stroke-width="4" fill="none" stroke-linecap="round"/><path class="stick" stroke="#b8894f" stroke-width="2.2" fill="none" stroke-linecap="round"/>
    <g class="joints"></g>
    <g class="mm"><rect class="mmBody" x="-5" y="-4" width="10" height="8" rx="3" fill="#fbfbf6" stroke="${O}" stroke-width="1.6"/>
      <g class="fire"><path d="M0 -14 Q7 -6 6 0 Q4 6 0 6 Q-4 6 -6 0 Q-7 -6 0 -14 Z" fill="#f28a1c" stroke="${O}" stroke-width="1.6"/><path d="M0 -8 Q3 -3 3 1 Q1.5 4 0 4 Q-1.5 4 -3 1 Q-3 -3 0 -8 Z" fill="#fde27a"/></g>
      <path class="smoke" d="M0 -6 Q-3 -10 0 -14 Q3 -18 0 -22" stroke="#8d8d8d" stroke-width="1.6" fill="none" stroke-linecap="round"/></g>
    <g class="puff"><circle r="6" fill="#eef3f8" stroke="${O}" stroke-width="1.6"/></g>`;

/** The front glove in puppet units, facing right. */
export function handPos(p: any): { x: number; y: number } {
  const a = p.arF*Math.PI/180, b = (p.arF + p.foF)*Math.PI/180;
  const x = 70 - 12*Math.sin(a) - 13*Math.sin(b), y = 56 + 12*Math.cos(a) + 13*Math.cos(b);
  return {x: x + p.x, y: y + p.y};
}
/** The pose at a time. `from` and `to` are where he walks in from and out to, in puppet units (the reference's are -300 and 380). */
export function mmPose(t: number, from = -300, to = 380): any {
  const p: any = {x:0,y:0,rot:0,sx:1,sy:1,face:1, thB:0,thF:0,shB:0,shF:0, arB:0,arF:-30,foF:-60,foB:0, head:0,hatY:0,hatR:0,
    px:71.5,py:33.5, lid:'M65 28 L75 28 L75 29 L65 29 Z', brow:'M65 24.5 Q70 22.5 76 24.5', mouth:'M64 47 Q68 48.5 72 47', show:true,
    ext:0, angle:-55, fire:0, char:false, smoke:false, puff:-1, mm:true, earSmoke:-1, bub:false, chew:0};
  const walk = (speed: number, amp: number) => { const c = Math.sin(t*2*Math.PI*speed);
    p.thB = c*amp; p.thF = -c*amp; p.shB = Math.max(0,-c)*amp*.9; p.shF = Math.max(0,c)*amp*.9; p.arB = -c*amp*.8; p.foB = -12;
    p.y = -Math.abs(Math.cos(t*2*Math.PI*speed))*2.2; p.hatY = -Math.abs(Math.cos(t*2*Math.PI*speed - .6))*1.2; };
  if (t < 2.0){ const k = seg(t,0,2.0); p.x = lerp(from, 0, 1 - Math.pow(1-k,1.6)); walk(1.6, 26); p.arF = -40; p.foF = -60; p.angle = -70; }
  else if (t < 2.5){ p.px = 73; p.py = 31.5; p.head = -8; const k = seg(t,2.0,2.5); p.brow = `M65 ${24.5 - Math.abs(Math.sin(k*Math.PI*3))*2.5} Q70 ${22.5 - Math.abs(Math.sin(k*Math.PI*3))*2.5} 76 24.5`; p.mouth = 'M64 46.5 Q68 49.5 72 46.5'; p.arF = -60; p.foF = -50; p.angle = -60; }
  else if (t < 3.6){ const k = seg(t,2.5,3.6);
    p.ext = Math.min(1, Math.floor(k*3)/3 + ease(clamp((k*3 % 1)/.25))/3);
    p.arF = -95; p.foF = -20; p.head = -10; p.px = 73; p.py = 31; p.angle = -38; p.mouth = 'M64 46.5 Q68 49.5 72 46.5'; }
  else if (t < 4.5){ p.ext = 1; p.arF = -95; p.foF = -20; p.angle = -38 + Math.sin(t*3)*1.5; p.head = -10; p.px = 73; p.py = 31;
    p.lid = 'M65 26 L75 26 L75 37 L65 37 Z'; p.mouth = 'M64 46 Q68 51 72 46 Q68 49 64 46 Z'; }
  else if (t < 5.1){ const k = seg(t,4.5,5.1); p.ext = 1; p.arF = -95; p.foF = -20; p.angle = -38; p.fire = 1 + .5*Math.sin(clamp(k*3)*Math.PI);
    p.lid = 'M65 22 L75 22 L75 23 L65 23 Z'; p.px = 72; p.py = 32; p.brow = 'M65 20.5 Q70 18 76 20.5'; p.hatY = -Math.sin(clamp(k*2.5)*Math.PI)*8; p.hatR = -10*Math.sin(clamp(k*2.5)*Math.PI);
    p.mouth = 'M66 45 Q69 42 72 45 Q72 49 69 49 Q66 49 66 45 Z'; p.y = -Math.sin(clamp(k*2.5)*Math.PI)*3; }
  else if (t < 5.8){ const k = ease(seg(t,5.1,5.6)); p.ext = 1 - k; p.angle = lerp(-38, -70, k); p.arF = lerp(-95, -40, k); p.foF = lerp(-20,-85,k); p.fire = 1;
    p.mouth = 'M66 45 Q69 42 72 45 Q72 49 69 49 Q66 49 66 45 Z'; p.px = 74; p.py = 36; }
  else if (t < 6.3){ const k = seg(t,5.8,6.3); p.ext = 0; p.angle = -70; p.arF = -40; p.foF = -85; p.fire = k < .5 ? 1 - k*2 : 0; p.char = k > .5; p.smoke = k > .5; p.puff = k;
    p.mouth = 'M71 45 Q75 47 71 49 Z'; p.px = 74; p.py = 36; }
  else if (t < 7.0){ const k = seg(t,6.3,7.0); p.ext = 0; p.angle = -70; p.arF = -40; p.foF = -85; p.char = true; p.smoke = true; p.px = k < .5 ? 74 : 68; p.py = 34;
    p.head = k > .5 ? -4 : 6; p.mouth = 'M64 47 Q68 46 72 47'; p.arB = k > .6 ? -35 : 0; p.foB = k > .6 ? -70 : 0;   // sniff, then a shrug
    p.y = k > .6 ? -Math.sin(seg(k,.6,1)*Math.PI)*3 : 0; p.brow = k > .6 ? 'M65 22.5 Q70 20.5 76 22.5' : p.brow; }
  else if (t < 7.9){ const k = seg(t,7.0,7.9); p.ext = 0; p.angle = -70; p.mm = k < .15; p.char = true; p.arF = k < .15 ? -100 : -30; p.foF = k < .15 ? -60 : -60;
    p.chew = k > .15 ? Math.abs(Math.sin(t*12)) : 0; p.lid = 'M65 30 Q70 26 75 30 L75 37 L65 37 Z'; p.mouth = `M64 ${46+p.chew*1.5} Q68 ${50+p.chew} 72 ${46+p.chew*1.5}`; p.bub = k > .3; }
  else if (t < 10.4){ const k = seg(t,7.9,10.4); p.mm = false; p.x = lerp(0, to, k*k*.3 + k*.7); walk(1.6, 26); p.arF = -10; p.foF = -20;
    p.earSmoke = seg(t,7.9,8.9); p.lid = 'M65 30 Q70 26 75 30 L75 37 L65 37 Z'; p.mouth = 'M64 46.5 Q68 49.5 72 46.5'; }
  else { p.show = false; p.mm = false; }
  return p;
}
/** Poses the worker's drawing (the reference's `wApplyBasic`). */
export function wApplyBasic(b: Pup, p: any): void {
  const q = b.q;
  q('.flip').style.visibility = p.show ? 'visible' : 'hidden';
  q('.flip').setAttribute('transform', 'translate(0 0)');
  const body = `translate(${p.x} ${p.y}) rotate(${p.rot} 60 108) translate(60 108) scale(${p.sx} ${p.sy}) translate(-60 -108)`;
  ['.legB','.armB','.torso','.legF','.head','.armF'].forEach(sel => {
    const g = q(sel); const base = g.dataset.base ?? (g.dataset.base = g.getAttribute('transform') || '');
    let extra = '';
    if (sel === '.head') extra = ` rotate(${p.head} 62 50)`;
    if (sel === '.legB') extra = ` rotate(${p.thB})`; if (sel === '.legF') extra = ` rotate(${p.thF})`;
    if (sel === '.armB') extra = ` rotate(${p.arB})`; if (sel === '.armF') extra = ` rotate(${p.arF})`;
    g.setAttribute('transform', `${body} ${base}${extra}`);
  });
  q('.legB .shin').setAttribute('transform', `translate(0 14) rotate(${p.shB})`);
  q('.legF .shin').setAttribute('transform', `translate(0 14) rotate(${p.shF})`);
  q('.armB .fore').setAttribute('transform', `translate(0 12) rotate(${p.foB})`);
  q('.armF .fore').setAttribute('transform', `translate(0 12) rotate(${p.foF})`);
  q('.hat').setAttribute('transform', `translate(0 ${p.hatY}) rotate(${p.hatR} 63 26)`);
  q('.pupil').setAttribute('cx', p.px); q('.pupil').setAttribute('cy', p.py);
  q('.lid').setAttribute('d', p.lid); q('.brow').setAttribute('d', p.brow);
  q('.mouth').setAttribute('d', p.mouth); q('.mouth').setAttribute('fill', p.mouth.includes('Z') ? '#7a2a22' : 'none');
}
/**
 * One frame. `sc.w` is the worker, `sc.ov` the stick's overlay (screen px), `sc.tip` the flare's
 * pilot flame in the layer's px, `sc.flame` the real flame (it flares up at the FWOOMP).
 */
export function mmApply(sc: any, p: any, t: number): void {
  const wk: Pup = sc.w;
  const W = place(wk);
  if (sc.flame) sc.flame.style.scale = p.fire > 1 ? '1.3 1.4' : '';
  wApplyBasic(wk, p);
  // stick: from the hand toward the flame tip; telescopes from a short folded length to full reach
  const hp = handPos(p);
  const hx = wk.spot.x*W.r.width + (hp.x - 60)*W.u, hy = wk.spot.y*W.r.height + (hp.y - 108)*W.u;
  const tipX = sc.tip.x, tipY = sc.tip.y;   // into the flame
  const full = Math.hypot(tipX - hx, tipY - hy), dirFull = Math.atan2(tipY - hy, tipX - hx);
  const shortLen = 26*W.u;
  const dir = p.ext > 0 ? dirFull : (p.angle*Math.PI/180);
  const len = p.ext > 0 ? lerp(shortLen, full, p.ext) : shortLen;
  const ex = hx + Math.cos(dir)*len, ey = hy + Math.sin(dir)*len;
  const show = p.show && (p.mm || p.ext > 0 || t < 7.2);
  const d = `M${hx} ${hy} L${ex} ${ey}`;
  const ov = sc.ov;
  ov.querySelector('.stick').setAttribute('d', show ? d : ''); ov.querySelector('.stickO').setAttribute('d', show ? d : '');
  const sw = Math.max(1.6, 2.4*W.u*2.4); ov.querySelector('.stick').setAttribute('stroke-width', sw*.6); ov.querySelector('.stickO').setAttribute('stroke-width', sw);
  // telescope joints
  const j = ov.querySelector('.joints'); let joints = '';
  if (show && p.ext > 0) for (let i = 1; i <= 3; i++){ const f = i/4; if (f*len > shortLen*.6) joints += `<circle cx="${hx + Math.cos(dir)*len*f}" cy="${hy + Math.sin(dir)*len*f}" r="${sw*.55}" fill="#8c8f94" stroke="${O}" stroke-width="1"/>`; }
  if (j.innerHTML !== joints) j.innerHTML = joints;
  // marshmallow at the tip
  const mm = ov.querySelector('.mm'), sc2 = Math.max(.8, W.u*1.25);
  mm.style.display = show && p.mm ? '' : 'none';
  mm.setAttribute('transform', `translate(${ex} ${ey}) scale(${sc2})`);
  ov.querySelector('.mmBody').setAttribute('fill', p.char ? '#2b2420' : '#fbfbf6');
  ov.querySelector('.fire').style.display = p.fire > 0 ? '' : 'none';
  ov.querySelector('.fire').setAttribute('transform', `scale(${p.fire*(1 + Math.sin(t*25)*.15)})`);
  ov.querySelector('.smoke').style.display = p.smoke ? '' : 'none';
  ov.querySelector('.smoke').setAttribute('transform', `translate(${Math.sin(t*4)*1.5} 0)`);
  // his breath puff, and the smoke puff from his ears after the bite
  const pf = ov.querySelector('.puff');
  if (p.puff >= 0 && p.puff < 1){ pf.style.display = ''; const mx = wk.spot.x*W.r.width + (74 - 60 + p.x)*W.u, my = wk.spot.y*W.r.height + (46 - 108)*W.u;
    pf.setAttribute('transform', `translate(${lerp(mx, ex, p.puff)} ${lerp(my, ey, p.puff)}) scale(${(.4 + p.puff*.8)*W.u*1.4})`); pf.style.opacity = 1 - p.puff*.6; }
  else if (p.earSmoke >= 0 && p.earSmoke < 1){ pf.style.display = ''; const ex2 = wk.spot.x*W.r.width + (52 - 60 + p.x)*W.u, ey2 = wk.spot.y*W.r.height + (37 - 108 + p.y)*W.u - p.earSmoke*14*W.u;
    pf.setAttribute('transform', `translate(${ex2} ${ey2}) scale(${(.5 + p.earSmoke)*W.u*1.2})`); pf.style.opacity = 1 - p.earSmoke; }
  else pf.style.display = 'none';
}

/** Sets the scene: the worker at `spot` (shares of his layer), and the stick's overlay on `over`, the layer that lies over the lease. */
export function marshmallowScene(layer: HTMLElement, over: HTMLElement, spot: { x: number; y: number }, scale: number, tip: { x: number; y: number }, flame: SVGElement | null): any {
  const w = makePup(layer, WORKER, { vw: 120, vh: 120, ax: 60, ay: 108, frac: WORKER_FRAC * scale, spot });
  // This worker has no pail and no long reach.
  for (const part of ['.pail', '.reach']) (w.q(part) as SVGElement).style.display = 'none';
  const ov = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  ov.setAttribute('class', 'pup-overlay');
  ov.innerHTML = STICK;
  over.appendChild(ov);
  return { w, ov, tip, flame };
}

/** Wildlife Log card art: the FWOOMP, with the stick and the flaming marshmallow drawn into his own picture. */
export function marshmallowStill(): string {
  const host = document.createElement('div');
  const w = makePup(host, WORKER, { vw: 120, vh: 120, ax: 60, ay: 108, frac: 1, spot: { x: 0, y: 0 } });
  for (const part of ['.pail', '.reach']) (w.q(part) as SVGElement).style.display = 'none';
  const p = mmPose(4.75);
  wApplyBasic(w, p);
  const h = handPos(p), a = (-52 * Math.PI) / 180, ex = h.x + Math.cos(a) * 46, ey = h.y + Math.sin(a) * 46;
  w.svg.insertAdjacentHTML('beforeend', `<path d="M${h.x} ${h.y} L${ex} ${ey}" stroke="${O}" stroke-width="4" stroke-linecap="round"/><path d="M${h.x} ${h.y} L${ex} ${ey}" stroke="#b8894f" stroke-width="2.2" stroke-linecap="round"/>
    <g transform="translate(${ex} ${ey}) scale(1.25)"><rect x="-5" y="-4" width="10" height="8" rx="3" fill="#fbfbf6" stroke="${O}" stroke-width="1.6"/><g transform="scale(1.3)"><path d="M0 -14 Q7 -6 6 0 Q4 6 0 6 Q-4 6 -6 0 Q-7 -6 0 -14 Z" fill="#f28a1c" stroke="${O}" stroke-width="1.6"/><path d="M0 -8 Q3 -3 3 1 Q1.5 4 0 4 Q-1.5 4 -3 1 Q-3 -3 0 -8 Z" fill="#fde27a"/></g></g>`);
  w.svg.removeAttribute('style');
  w.svg.setAttribute('class', 'egg-still marshmallow-still');
  w.svg.setAttribute('viewBox', '30 -14 104 126');
  return w.svg.outerHTML;
}

// Gag 12, the porcupine, as code puppets ported from the approved reference
// (~/Desktop/RHR Art Inbox/porcupine_reference.html): the same drawings, poses and timing. A quiet
// bush. The worker strolls in from off screen with a roll of toilet paper, looks left and right,
// slips behind the bush and squats; POKE: eyes huge, hard hat pops, the roll pops straight up over
// the bush and drops back behind it; he springs out with quills in his bum and scurries off the way
// he came, clutching it; the porcupine, hidden behind the bush from the start, bolts out the other
// way with its quills up. The bush is the board's own (gag-bush.ts). strip-gags.ts puts it on screen.
//
// Times: the reference cut the porcupine's entrance by starting its clock at SHIFT, so the gag's
// own time t runs from 0 and `pcPose` is asked for t + SHIFT, exactly as the reference does.
/* eslint-disable */
import { BUSH_BOX, BUSH_FRAC, behindBush, bushMarkup } from './gag-bush.ts';
import { addEl, makePup, place, type Pup } from './puppet-stage.ts';
import type { Season } from './trees.ts';
import { WORKER, WORKER_FRAC } from './worker.ts';
const O = '#2b1e16';
const ease = (x: number) => (x < 0.5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2);
const clamp = (x: number, a = 0, b = 1) => Math.max(a, Math.min(b, x));
const seg = (t: number, a: number, b: number) => clamp((t - a) / (b - a));
const lerp = (a: number, b: number, k: number) => a + (b - a) * k;
const RED='#c8352b', STRIPE='#d5dbe2', SKIN='#f0c09a', BOOT='#5a3a24', HAT='#f2c230';
const BUM = '#f3b39b';
export const QUILL_SHUFFLER = `
<g class="root">
  <g class="tpTail"><path class="tpStrip" d="M44 106 Q30 110 14 107" stroke="${O}" stroke-width="7" fill="none" stroke-linecap="round"/><path class="tpStrip2" d="M44 106 Q30 110 14 107" stroke="#fbfbf6" stroke-width="4.5" fill="none" stroke-linecap="round"/></g>
  <g class="legB" transform="translate(54 84)"><path d="M0 0 L0 16" stroke="${O}" stroke-width="9" stroke-linecap="round"/><path d="M0 0 L0 16" stroke="${SKIN}" stroke-width="6" stroke-linecap="round"/>
    <path d="M-5 17 L8 17 Q11 17 11 21 L-5 21 Z" fill="${BOOT}" stroke="${O}" stroke-width="2"/></g>
  <g class="legF" transform="translate(62 84)"><path d="M0 0 L0 16" stroke="${O}" stroke-width="9" stroke-linecap="round"/><path d="M0 0 L0 16" stroke="${SKIN}" stroke-width="6" stroke-linecap="round"/>
    <path d="M-5 17 L8 17 Q11 17 11 21 L-5 21 Z" fill="${BOOT}" stroke="${O}" stroke-width="2"/></g>
  <rect class="bunch" x="46" y="95" width="24" height="7" rx="3.5" fill="${RED}" stroke="${O}" stroke-width="2.2"/>
  <g class="upper">
    <path d="M44 84 Q42 72 52 70 Q58 72 58 82 Q52 90 44 84 Z" fill="${BUM}" stroke="${O}" stroke-width="2.4"/>
    <g class="quills" stroke-linecap="round"><path d="M46 76 L36 70 M48 80 L37 80 M50 72 L44 62 M47 84 L39 89 M53 75 L49 65" stroke="${O}" stroke-width="2.6"/><path d="M46 76 L38 71 M48 80 L39 80 M50 72 L45 64 M47 84 L41 88 M53 75 L50 67" stroke="#efe4c8" stroke-width="1.3"/></g>
    <g transform="rotate(48 58 82)">
      <rect x="46" y="52" width="24" height="32" rx="9" fill="${RED}" stroke="${O}" stroke-width="2.6"/>
      <rect x="46.5" y="68" width="23" height="4" fill="${STRIPE}" stroke="${O}" stroke-width="1.2"/>
    </g>
    <g class="arm"><path d="M70 66 L84 76 L90 74" stroke="${O}" stroke-width="8.5" stroke-linecap="round" stroke-linejoin="round" fill="none"/><path d="M70 66 L84 76 L90 74" stroke="${RED}" stroke-width="5.2" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
      <circle cx="91" cy="74" r="4.2" fill="#e0a43a" stroke="${O}" stroke-width="2"/></g>
    <g class="head">
      <circle cx="82" cy="54" r="12.5" fill="${SKIN}" stroke="${O}" stroke-width="2.6"/>
      <path d="M75 60 Q80 70 90 62 Q85 64 80 62 Z" fill="#7a4f2e" stroke="${O}" stroke-width="1.6"/>
      <circle cx="90" cy="56" r="3" fill="#dfa47c" stroke="${O}" stroke-width="1.6"/>
      <circle cx="86" cy="50" r="4.4" fill="#fff" stroke="${O}" stroke-width="1.8"/><circle class="pupil" cx="87.5" cy="50.5" r="1.9" fill="${O}"/>
      <path d="M82 45 Q86 42.5 90 44.5" stroke="#7a4f2e" stroke-width="2.4" fill="none" stroke-linecap="round"/>
      <circle cx="80" cy="57" r="3" fill="#f08c80"/>
      <ellipse class="mouth" cx="86.5" cy="63.5" rx="2.4" ry="3.1" fill="#7a2a22" stroke="${O}" stroke-width="1.6"/>
      <path d="M71 47 Q71 35 82 35 Q93 35 93 47 Z" fill="${HAT}" stroke="${O}" stroke-width="2.4"/><rect x="69" y="45" width="28" height="4" rx="2" fill="${HAT}" stroke="${O}" stroke-width="2"/>
    </g>
  </g>
</g>`;

/* ---------------- porcupine (side view, default facing right) ---------------- */
let QUILLS = '';
for (let i = 0; i < 26; i++){ const a = Math.PI*(1.08 + i/25*.84), r1 = 22, r2 = 33 + (i%3)*3;
  const x1 = 48 + Math.cos(a)*r1*1.4, y1 = 46 + Math.sin(a)*r1, x2 = 48 + Math.cos(a)*r2*1.35, y2 = 46 + Math.sin(a)*r2;
  QUILLS += `<path d="M${x1.toFixed(1)} ${y1.toFixed(1)} L${x2.toFixed(1)} ${y2.toFixed(1)}" stroke="${O}" stroke-width="2.6" stroke-linecap="round"/><path d="M${(x1+(x2-x1)*.55).toFixed(1)} ${(y1+(y2-y1)*.55).toFixed(1)} L${x2.toFixed(1)} ${y2.toFixed(1)}" stroke="#efe4c8" stroke-width="1.3" stroke-linecap="round"/>`; }
export const PORC = `
<g class="flip"><g class="root">
  <g class="feetB"><ellipse cx="36" cy="64" rx="6" ry="3.5" fill="#3a2c20" stroke="${O}" stroke-width="1.8"/><ellipse cx="62" cy="64" rx="6" ry="3.5" fill="#3a2c20" stroke="${O}" stroke-width="1.8"/></g>
  <g class="quillset">${QUILLS}</g>
  <ellipse cx="48" cy="48" rx="32" ry="18" fill="#4a3a2c" stroke="${O}" stroke-width="2.8"/>
  <path d="M26 40 Q44 30 66 36" stroke="#6b5642" stroke-width="3" fill="none" stroke-linecap="round"/>
  <path d="M70 44 Q84 42 90 52 Q86 60 74 60 Q68 54 70 44 Z" fill="#8a6b52" stroke="${O}" stroke-width="2.4" stroke-linejoin="round"/>
  <circle cx="89" cy="51" r="2.8" fill="#1d1612" stroke="${O}" stroke-width="1"/>
  <circle class="eye" cx="79" cy="48" r="2.6" fill="#fff" stroke="${O}" stroke-width="1.2"/><circle class="pup" cx="79.8" cy="48.3" r="1.3" fill="${O}"/>
  <g class="feetF"><ellipse cx="42" cy="65" rx="6" ry="3.5" fill="#3a2c20" stroke="${O}" stroke-width="1.8"/><ellipse cx="68" cy="65" rx="6" ry="3.5" fill="#3a2c20" stroke="${O}" stroke-width="1.8"/></g>
</g></g>`;

const ROLL = `<svg viewBox="0 0 20 20" width="100%" height="100%"><circle cx="10" cy="10" r="8.5" fill="#fbfbf6" stroke="${O}" stroke-width="2"/><circle cx="10" cy="10" r="3.2" fill="#b9a98a" stroke="${O}" stroke-width="1.4"/></svg>`;

export const SHIFT = 2.4;
export const PC_BEATS: [number, string, string][] = [
  [0, 'quiet-bush', 'A quiet bush'], [1.0, 'stroll-in', 'A worker strolls in, toilet paper in hand'], [3.0, 'look-around', 'Looks left, looks right'],
  [3.7, 'squat', 'Slips behind the bush and squats. Content'], [5.1, 'poke', 'POKE. Eyes go huge, hard hat pops'],
  [5.2, 'roll-pops', 'His toilet paper pops straight up over the bush and drops back behind it'], [5.5, 'springs-out', 'Springs out, quills in his bum'],
  [5.6, 'porcupine-bolts', 'SURPRISE: a porcupine bolts out the other way, quills up'], [5.8, 'scurry', 'He scurries off fast, hands clutching the side of his bum, quills sticking out, glancing back'],
];
/** Both are off screen by 7.9 (the reference loops at 10.6 after a pause). */
export const PC_END = 8.0;
export const PORC_FRAC = 0.085, QUILL_SHUFFLER_FRAC = 0.243;

/**
 * The pose at a reference time (the gag's time + SHIFT). `from`: where the worker walks in from,
 * `out`: where he shuffles off to, `bolt`: where the porcupine runs to, each in its own drawing's
 * units from the bush (the reference's are -320, -300 and 330).
 */
export function pcPose(t: number, from = -320, out = -300, bolt = 330): any {
  const w: any = {x:-420, y:0, rot:0, sx:1, sy:1, face:1, thB:0,thF:0,shB:0,shF:0, arB:0,arF:-30,foF:-60,foB:0, head:0,hatY:0,hatR:0,
    px:71.5,py:33.5, lid:'M65 28 L75 28 L75 29 L65 29 Z', brow:'M65 24.5 Q70 22.5 76 24.5', mouth:'M64 47 Q68 48.5 72 47', show:true, z:4, behind:false, starburst:-1, roll:'hand'};
  const pc: any = {x:300, y:0, face:-1, legs:0, show:true, z:4, puff:0, eye:2.6};
  const s: any = {show:false, x:0, face:-1, legs:0};
  const walk = (o: any, speed: number, amp: number) => { const c = Math.sin(t*2*Math.PI*speed);
    o.thB = c*amp; o.thF = -c*amp; o.shB = Math.max(0,-c)*amp*.9; o.shF = Math.max(0,c)*amp*.9; o.arB = -c*amp*.8; o.foB = -12;
    o.y = -Math.abs(Math.cos(t*2*Math.PI*speed))*2.2; o.hatY = -Math.abs(Math.cos(t*2*Math.PI*speed - .6))*1.2; };
  // porcupine
  if (t < 8.0){ pc.x = 0; }   // already hidden behind the bush, never seen arriving
  else if (t < 10.0){ const k = seg(t,8.0,10.0); pc.face = 1; pc.x = lerp(0, bolt, k*k*.3 + k*.7); pc.legs = Math.sin(t*26); pc.y = -Math.abs(Math.sin(t*13))*2.5; pc.puff = 1; pc.eye = 4; }
  else pc.show = false;
  if (t > 7.5 && t < 8.0){ pc.puff = 1; pc.eye = 4; }
  // worker
  if (t < 3.4) w.show = false;
  else if (t < 5.4){ const k = seg(t,3.4,5.4); w.x = lerp(from, -98, 1 - Math.pow(1-k,1.5)); walk(w, 1.6, 26); w.arF = -40; w.foF = -60; }
  else if (t < 6.1){ const k = seg(t,5.4,6.1); w.x = -98; w.px = k < .45 ? 67 : 74; w.head = k < .45 ? -5 : 5; w.lid = 'M65 28 L75 30 L75 32 L65 31 Z'; w.arF = -40; w.foF = -60; }
  else if (t < 7.5){ const k = seg(t,6.1,6.6); w.x = lerp(-98, -6, ease(k)); w.behind = true; w.roll = 'none';
    const sq = ease(seg(t,6.6,7.05)); const settle = Math.sin(seg(t,7.05,7.3)*Math.PI)*1.2; w.y = 14*sq + settle; w.thB = w.thF = -80*sq; w.shB = w.shF = 80*sq; w.arF = -20; w.foF = -40;
    if (t > 7.05){ w.lid = 'M65 26 Q70 31 75 26 L75 34 L65 34 Z'; w.mouth = 'M64 46.5 Q68 49.5 72 46.5'; w.head = Math.sin(t*3)*1.5; } }
  else if (t < 7.9){ const k = seg(t,7.5,7.9); w.x = -6; w.behind = true; w.y = 14 - Math.sin(clamp(k*1.6)*Math.PI)*26; w.thB = w.thF = -80*(1-k); w.shB = w.shF = 80*(1-k);
    w.lid = 'M65 23 L75 23 L75 24 L65 24 Z'; w.px = 70; w.py = 33; w.brow = 'M65 21.5 Q70 19 76 21.5'; w.mouth = 'M66 45 Q69 41.5 72 45 Q72 50 69 50 Q66 50 66 45 Z';
    w.hatY = -Math.sin(clamp(k*1.4)*Math.PI)*10; w.hatR = -12*Math.sin(clamp(k*1.4)*Math.PI); w.arF = -150; w.arB = -150; w.foF = -10; w.foB = -10; w.starburst = k; w.roll = 'drop'; }
  else w.show = false;
  if (t >= 7.9){ w.roll = 'ground'; }
  // the shuffle off to the left
  if (t >= 7.9 && t < 10.3){ const k = seg(t,7.9,10.3); s.show = true; s.face = -1; s.x = lerp(-14, out, k*.85 + k*k*.15); s.legs = Math.sin(t*2*Math.PI*5); }   // faster
  return {w, pc, s};
}

function workerApply(b: Pup, p: any): void {
  const q = b.q;
  q('.flip').style.visibility = p.show ? 'visible' : 'hidden';
  const body = `translate(${p.x} ${p.y}) rotate(${p.rot} 60 108) translate(60 108) scale(${p.sx} ${p.sy}) translate(-60 -108)`;
  ['.legB','.armB','.torso','.legF','.head','.armF'].forEach(sel => {
    const g = q(sel); const base = g.dataset.base ?? (g.dataset.base = g.getAttribute('transform') || '');
    let extra = '';
    if (sel === '.head') extra = ` rotate(${p.head} 62 50)`;
    if (sel === '.legB') extra = ` rotate(${p.thB})`; if (sel === '.legF') extra = ` rotate(${p.thF})`;
    if (sel === '.armB') extra = ` rotate(${p.arB})`; if (sel === '.armF') extra = ` rotate(${p.arF})`;
    g.setAttribute('transform', `${body} ${base}${extra}`);
  });
  q('.legB .shin').setAttribute('transform', `translate(0 14) rotate(${p.shB})`); q('.legF .shin').setAttribute('transform', `translate(0 14) rotate(${p.shF})`);
  q('.armB .fore').setAttribute('transform', `translate(0 12) rotate(${p.foB})`); q('.armF .fore').setAttribute('transform', `translate(0 12) rotate(${p.foF})`);
  q('.hat').setAttribute('transform', `translate(0 ${p.hatY}) rotate(${p.hatR} 63 26)`);
  q('.pupil').setAttribute('cx', p.px); q('.pupil').setAttribute('cy', p.py);
  q('.lid').setAttribute('d', p.lid); q('.brow').setAttribute('d', p.brow);
  q('.mouth').setAttribute('d', p.mouth); q('.mouth').setAttribute('fill', p.mouth.includes('Z') ? '#7a2a22' : 'none');
}

/** The scene on one layer, stacked as in the reference: porcupine and squatting worker behind the bush, the shuffler in front. */
export function porcupineScene(layer: HTMLElement, bush: { x: number; y: number }, scale: number, season: Season): any {
  const sc: any = { f: scale };
  const z = (p: Pup, n: number) => ((p.svg.style.zIndex = String(n)), p);
  sc.porc = z(makePup(layer, PORC, { vw: 100, vh: 70, ax: 50, ay: 66, frac: PORC_FRAC * scale, spot: { ...bush } }), 2);
  sc.worker = z(makePup(layer, WORKER, { vw: 120, vh: 120, ax: 60, ay: 108, frac: WORKER_FRAC * scale, spot: { ...bush } }), 2);
  for (const part of ['.pail', '.reach']) (sc.worker.q(part) as SVGElement).style.display = 'none';
  sc.bush = z(makePup(layer, bushMarkup(season), { ...BUSH_BOX, frac: BUSH_FRAC * scale, spot: { ...bush } }), 3);
  sc.shuf = z(makePup(layer, QUILL_SHUFFLER, { vw: 120, vh: 120, ax: 60, ay: 108, frac: QUILL_SHUFFLER_FRAC * scale, spot: { ...bush } }), 5);   // matches the worker: head 12.5 units vs 16
  sc.shuf.q('.tpTail').style.display = 'none';
  sc.roll = addEl(layer, 'pup-roll', ROLL);
  sc.ov = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  sc.ov.setAttribute('class', 'pup-overlay');
  sc.ov.style.zIndex = '6';
  layer.appendChild(sc.ov);
  return sc;
}

/** One frame, at the reference's time `t` (the gag's time + SHIFT). */
export function pcApply(sc: any, P: any, t: number): void {
  const {w, pc, s} = P;
  const R = place(sc.bush), r = R.r;
  // The reference's bush unit (its bush was a 100-unit box at 0.2 of the width): the roll and the starburst are measured in it.
  const bu = 0.2*sc.f*r.width/100, leaf = sc.bush.frac*r.width/BUSH_BOX.vw;
  const at = { x: sc.bush.spot.x*r.width, y: sc.bush.spot.y*r.height };
  // porcupine: always behind the bush until it bolts
  const PC: Pup = sc.porc, pq = PC.q; place(PC, pc.show ? pc.x : 99999);
  PC.svg.style.visibility = pc.show ? 'visible' : 'hidden';
  behindBush(PC.svg, at, leaf);
  pq('.flip').setAttribute('transform', `translate(50 0) scale(${pc.face} 1) translate(-50 0)`);
  pq('.root').setAttribute('transform', `translate(0 ${pc.y})`);
  pq('.feetF').setAttribute('transform', `translate(${pc.legs*2.5} 0)`); pq('.feetB').setAttribute('transform', `translate(${-pc.legs*2.5} 0)`);
  pq('.quillset').setAttribute('transform', `translate(48 46) scale(${1 + pc.puff*.28}) translate(-48 -46)`);
  pq('.eye').setAttribute('r', pc.eye);
  sc.bush.svg.style.transform = (t > 7.5 && t < 8.1 ? `rotate(${Math.sin(t*70)*2.5}deg)` : '');
  // worker (walk, squat behind the bush)
  const W: Pup = sc.worker; place(W); W.svg.style.zIndex = w.behind ? '2' : '4'; workerApply(W, w);
  behindBush(W.svg, w.behind ? at : null, leaf);
  // shuffler
  const SH: Pup = sc.shuf, shq = SH.q; place(SH, s.show ? s.x : 99999); SH.svg.style.visibility = s.show ? 'visible' : 'hidden';
  if (s.show){ shq('.root').setAttribute('transform', `translate(120 0) scale(-1 1) translate(0 ${-Math.abs(s.legs)*1.2})`);
    shq('.legB').setAttribute('transform', `translate(54 84) rotate(${s.legs*9})`); shq('.legF').setAttribute('transform', `translate(62 84) rotate(${-s.legs*9})`);
    shq('.quills').setAttribute('transform', `rotate(${Math.sin(t*30)*4} 48 80)`);
    shq('.arm').setAttribute('transform', `rotate(${110 + Math.sin(t*2*Math.PI*5)*4} 70 66)`);   // hand clutching the side of his bum
    const glance = t > 8.7 && t < 9.2; shq('.head').setAttribute('transform', glance ? 'rotate(-10 80 62)' : `rotate(${Math.sin(t*4)*2} 80 62)`);
    shq('.mouth').setAttribute('rx', 2.4); shq('.mouth').setAttribute('ry', 2.2 + Math.abs(Math.sin(t*6))); }
  // the roll: in his hand, then it pops straight up over the bush and drops back behind it
  const groundY = at.y, wu = W.frac*r.width/120;
  let rx: number | null = null, ry = 0, spin = 0; const rs = Math.max(9, 12*wu);
  if (w.roll === 'hand' && w.show && !w.behind){ rx = W.spot.x*r.width + (w.x + 76 - 60)*wu; ry = W.spot.y*r.height + (w.y + 80 - 108)*wu; }
  const roll: HTMLElement = sc.roll;
  roll.style.zIndex = '4';
  if (t >= 7.55 && t < 8.4){ const k = seg(t,7.55,8.4);
    rx = at.x - 6*bu; ry = groundY - 30*bu - Math.sin(k*Math.PI)*42*bu; spin = k*540; roll.style.zIndex = '2'; }   // up and back down behind the bush
  if (rx !== null){ roll.style.opacity = '1'; roll.style.width = roll.style.height = rs+'px'; roll.style.transform = `translate3d(${rx - rs/2}px, ${ry - rs/2}px, 0) rotate(${spin}deg)`; }
  else roll.style.opacity = '0';
  // poke starburst
  let html = '';
  if (w.starburst >= 0 && w.starburst < 1){ const k = w.starburst, cx = at.x, cy = groundY - 22*bu; const L = 12*bu;
    for (let i = 0; i < 7; i++){ const a = -Math.PI*(.05 + i/6*.9); html += `<path d="M${cx + Math.cos(a)*L*(1+k)} ${cy + Math.sin(a)*L*(1+k)} l${Math.cos(a)*L*.8} ${Math.sin(a)*L*.8}" stroke="${O}" stroke-width="${Math.max(1.4, L*.14)}" stroke-linecap="round" opacity="${1-k}"/>`; } }
  if (sc.ovHtml !== html) sc.ov.innerHTML = sc.ovHtml = html;
}

/** Wildlife Log card art: the porcupine bolting, quills up. */
export function porcupineStill(): string {
  const host = document.createElement('div');
  const p = makePup(host, PORC, { vw: 100, vh: 70, ax: 50, ay: 66, frac: 1, spot: { x: 0, y: 0 } });
  p.q('.quillset').setAttribute('transform', 'translate(48 46) scale(1.28) translate(-48 -46)');
  p.q('.eye').setAttribute('r', '4');
  p.svg.removeAttribute('style');
  p.svg.setAttribute('class', 'egg-still porcupine-still');
  p.svg.setAttribute('viewBox', '-8 -14 112 88');
  return p.svg.outerHTML;
}

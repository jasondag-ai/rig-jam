// Gag 9, the geese and the lost goose, as code puppets ported from the approved reference
// (~/Desktop/RHR Art Inbox/marshmallow_geese_reference.html): the same drawing, beats and timing.
// A V of seven crosses the sky left to right, fully off screen to fully off screen. One lost goose
// flaps the wrong way, passes them, stalls, double-takes, "Honk?!", snaps around (never paper-thin),
// chases them as a straggler and leaves last. A feather drifts down. strip-gags.ts puts them on screen.
/* eslint-disable */
import { addEl, makePup, place, type Pup } from './puppet-stage.ts';
const O = '#2b1e16';
const clamp = (x: number, a = 0, b = 1) => Math.max(a, Math.min(b, x));
const seg = (t: number, a: number, b: number) => clamp((t - a) / (b - a));
const lerp = (a: number, b: number, k: number) => a + (b - a) * k;

/* ================= Canada goose (side view, facing right) ================= */
export const GOOSE = `
<g class="flip"><g class="root">
  <g class="wingF"><path d="M50 34 Q40 6 62 2 Q72 18 64 36 Z" fill="#5e5040" stroke="${O}" stroke-width="2.4" stroke-linejoin="round"/><path d="M54 30 Q50 14 60 8" stroke="#8a7a66" stroke-width="2.5" fill="none" stroke-linecap="round"/></g>
  <path d="M14 38 L2 34 L4 44 L16 44 Z" fill="#1f1d1c" stroke="${O}" stroke-width="2.2" stroke-linejoin="round"/>
  <path d="M14 44 L22 48 L28 44 Z" fill="#f2f0ea" stroke="${O}" stroke-width="1.6"/>
  <ellipse cx="44" cy="40" rx="32" ry="13" fill="#8a7a66" stroke="${O}" stroke-width="2.6"/>
  <path d="M52 48 Q66 50 74 42 Q70 52 52 52 Z" fill="#d9cdb8"/>
  <path d="M30 34 Q42 30 56 32" stroke="#a89884" stroke-width="2.5" fill="none" stroke-linecap="round"/>
  <path d="M70 36 Q84 30 92 22 L98 26 Q90 38 76 44 Z" fill="#1f1d1c" stroke="${O}" stroke-width="2.4" stroke-linejoin="round"/>
  <g class="head"><ellipse cx="100" cy="22" rx="10" ry="7.5" fill="#1f1d1c" stroke="${O}" stroke-width="2.4"/>
    <path d="M94 24 Q99 30 104 26 Q100 22 94 24 Z" fill="#f7f6f2" stroke="${O}" stroke-width="1.4"/>
    <path d="M108 20 L117 22 L108 25 Z" fill="#1f1d1c" stroke="${O}" stroke-width="2"/>
    <circle class="eye" cx="103" cy="19.5" r="2.2" fill="#fff" stroke="${O}" stroke-width="1.2"/><circle class="pup" cx="103.6" cy="19.5" r="1" fill="${O}"/></g>
  <g class="wingB"><path d="M40 36 Q34 8 54 4 Q62 20 56 38 Z" fill="#4a3f33" stroke="${O}" stroke-width="2.2" stroke-linejoin="round"/></g>
</g></g>`;

export const G_BEATS: [number, string, string][] = [
  [0, 'v-flies', 'A V of geese flies across, left to right'], [0.8, 'wrong-way', 'One lost goose flaps the wrong way, right to left, wobbling'],
  [2.9, 'pass', 'They pass each other'], [3.3, 'stall', 'He stalls mid-air. Double take'], [3.7, 'honk', 'Eyes wide: "Honk?!"'],
  [4.3, 'snap-turn', 'Brakes hard, snaps around with a puff of feathers'], [4.6, 'chase', 'Chases them, frantic and wobbly'],
  [7.4, 'straggler', 'Slots into the last spot of the V'], [9.0, 'feather', 'All gone. A single feather drifts down'],
];
/** The reference stops its V at 9.0 with the straggler on the edge; the game lets them fly on until he is clear. */
export const G_END = 9.7;
export const GEESE_LINE = 'Honk?!';
export const GOOSE_FRAC = 0.088;
/** The sky band the reference was drawn for (390 x 180): the V's lead and the lost goose, as shares of its height. */
export const SKY = { lead: 0.36, lost: 0.6, height: 180 };
const V = [[0,0],[-1,1],[-1,-1],[-2,2],[-2,-2],[-3,3],[-3,-3]];          // V formation, lead at the front

/** Where the V's lead is across the band (px), from fully off the left to the whole flock and its straggler off the right. */
export function leadX(t: number, width: number, gw: number): number {
  const sp = gw * 1.05;
  return lerp(-gw * 0.6, width + 3.4 * sp + gw * 0.6, t / 9.0);
}

/** The flock on a layer: `band` is the sky band in the layer's px. */
export function geeseScene(layer: HTMLElement, band: { top: number; height: number }, scale: number): any {
  const pup = () => makePup(layer, GOOSE, { vw: 120, vh: 56, ax: 60, ay: 30, frac: GOOSE_FRAC * scale, spot: { x: -1, y: 0 } });
  return { band, frac: GOOSE_FRAC * scale, v: V.map(pup), lost: pup(), feather: addEl(layer, 'pup-dust pup-feather'), at: { x: 0, y: 0 } };
}

export function gApply(F: any, t: number): void {
  const host: HTMLElement = F.v[0].host, r = host.getBoundingClientRect();
  const H = F.band.height, top = F.band.top;
  const gw = F.frac*r.width, gu = gw/120, sp = gw*1.05;                       // spacing between geese in px
  const flap = (ph: number, speed = 4) => Math.sin(t*2*Math.PI*speed + ph);
  const leadY = top + SKY.lead*H;
  // V crosses from fully off screen left to fully off screen right
  const lead = leadX(t, r.width, gw);
  F.v.forEach((g: Pup, i: number) => {
    const [dx, dy] = V[i];
    const x = lead + dx*sp, y = leadY + dy*sp*.32 + Math.sin(t*2 + i)*1.5;
    g.spot = {x: x/r.width, y: y/r.height}; place(g);
    const f = flap(i*.7);
    g.q('.wingF').setAttribute('transform', `rotate(${f*38} 56 34)`); g.q('.wingB').setAttribute('transform', `rotate(${f*34 - 6} 48 36)`);
    g.q('.flip').setAttribute('transform', '');
  });
  // the lost goose
  const L: Pup = F.lost; let lx, ly, face = -1, wing = flap(0, 5.2)*40, eye = 2.2, pup = 1, rot = 0, head = 0;
  const baseY = top + SKY.lost*H;
  if (t < 3.3){ const k = seg(t, .8, 3.3); lx = lerp(r.width + gw*.7, r.width*.48, k); ly = baseY + Math.sin(t*5)*5*gu; rot = Math.sin(t*6)*8; if (t < .8) lx = r.width + gw; }
  else if (t < 4.3){ lx = r.width*.48 - seg(t,3.3,3.6)*8*gu; ly = baseY - seg(t,3.3,3.6)*6*gu; rot = -14; wing = flap(0,2)*20 - 10;
    head = t < 3.6 ? 0 : 1; eye = t > 3.7 ? 3.6 : 2.2; pup = t > 3.7 ? .7 : 1; }                       // stall, look back, double take
  else if (t < 4.6){ const k = seg(t,4.3,4.6); lx = r.width*.48 - 8*gu; ly = baseY - 6*gu - Math.sin(k*Math.PI)*8*gu; face = k < .5 ? -1*(1-.2*Math.sin(k*Math.PI)) : 1*(1-.2*Math.sin(k*Math.PI)); wing = -50; eye = 3.6; pup = .7; }
  else { // chase: frantic flapping, wobbly path, catches the back of the V and slots in
    face = 1; const target: Pup = F.v[6]; const tx = parseFloat(target.svg.style.left) + gw*.5 - sp*1.0;
    const k = seg(t, 4.6, 7.4), e = 1 - Math.pow(1-k, 2);
    const sx = r.width*.48 - 8*gu, sy = baseY - 6*gu;
    lx = lerp(sx, tx, e) + Math.sin(t*7)*6*gu*(1-k); ly = lerp(sy, leadY + 4*sp*.32, e) + Math.sin(t*9)*7*gu*(1-k);
    rot = Math.sin(t*11)*12*(1-k); wing = flap(0, k < 1 ? 7 : 4)*44; eye = k < .8 ? 3 : 2.2; pup = 1; }
  L.spot = {x: lx/r.width, y: ly/r.height}; place(L);
  F.at = { x: lx, y: ly };
  L.q('.flip').setAttribute('transform', `translate(60 0) scale(${face} 1) translate(-60 0)`);
  L.q('.root').setAttribute('transform', `rotate(${rot} 60 30)`);
  L.q('.wingF').setAttribute('transform', `rotate(${wing} 56 34)`); L.q('.wingB').setAttribute('transform', `rotate(${wing*.9 - 6} 48 36)`);
  L.q('.head').setAttribute('transform', head ? 'rotate(-30 92 26)' : '');
  L.q('.eye').setAttribute('r', eye); L.q('.pup').setAttribute('r', pup);
  // a feather from the snap-turn, drifting down
  const fk = seg(t, 4.4, 9.6), fe: HTMLElement = F.feather;
  if (t > 4.4 && t < 9.6){ const sz = Math.max(4, gw*.14); fe.style.width = (sz*1.8)+'px'; fe.style.height = (sz*.7)+'px';
    fe.style.background = '#8a7a66'; fe.style.borderRadius = '50% 50% 50% 50% / 60% 60% 40% 40%';
    fe.style.left = (r.width*.48 - 8*gu + Math.sin(fk*Math.PI*4)*14*gu)+'px'; fe.style.top = (baseY + fk*fk*H*.4)+'px';
    fe.style.transform = `rotate(${Math.sin(fk*Math.PI*4)*35}deg)`; fe.style.opacity = String(fk < .9 ? 1 : (1-fk)*10); }
  else fe.style.opacity = '0';
}

/** Wildlife Log card art: the lost goose in his double take. */
export function geeseStill(): string {
  const host = document.createElement('div');
  const F = geeseScene(host, { top: 0, height: SKY.height }, 1);
  gApply(F, 4.0);
  const svg: SVGSVGElement = F.lost.svg;
  svg.removeAttribute('style');
  svg.setAttribute('class', 'egg-still goose-still');
  svg.setAttribute('viewBox', '-6 -8 132 70');
  return svg.outerHTML;
}

// Gag 4, Near Miss (Cardium): the gopher and the hotshot, as code puppets ported from the approved
// reference (~/Desktop/RHR Art Inbox/near_miss_landowner_reference.html): the same drawings, poses,
// beats and timing. The gopher comes out of the permanent mound's hole (cut off at the hole line),
// does the full double take and ducks; the hotshot crosses the bottom strip right to left, from
// fully off screen to fully off screen, in dust; the gopher comes back up dusty, "Near miss!",
// coughs and sinks. strip-gags.ts puts it on screen.
/* eslint-disable */
import { addEl, makePup, place, type Pup } from './puppet-stage.ts';
const O = '#2b1e16';
const ease = (x: number) => (x < 0.5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2);
const clamp = (x: number, a = 0, b = 1) => Math.max(a, Math.min(b, x));
const seg = (t: number, a: number, b: number) => clamp((t - a) / (b - a));
const lerp = (a: number, b: number, k: number) => a + (b - a) * k;
/* ================= GOPHER ================= */
const FUR='#c99e64', FUR2='#ad8350', BELLY='#efd8ad', NOSE='#e58b86', DUSTC='#9c958a';
const GOPHER = `
<g class="root">
  <path d="M38 108 Q34 70 60 66 Q86 70 82 108 Z" fill="${FUR}" stroke="${O}" stroke-width="3" stroke-linejoin="round"/>
  <path d="M48 108 Q46 80 60 78 Q74 80 72 108 Z" fill="${BELLY}"/>
  <g class="arms"><path d="M46 84 Q44 92 52 92" stroke="${O}" stroke-width="2.6" fill="${FUR}"/><path d="M74 84 Q76 92 68 92" stroke="${O}" stroke-width="2.6" fill="${FUR}"/>
    <ellipse cx="53" cy="91" rx="4" ry="3" fill="${FUR2}" stroke="${O}" stroke-width="2"/><ellipse cx="67" cy="91" rx="4" ry="3" fill="${FUR2}" stroke="${O}" stroke-width="2"/></g>
  <g class="stretch" style="display:none"><path d="M44 80 Q36 64 40 52" stroke="${O}" stroke-width="7.5" stroke-linecap="round" fill="none"/><path d="M44 80 Q36 64 40 52" stroke="${FUR}" stroke-width="4" stroke-linecap="round" fill="none"/>
    <path d="M76 80 Q84 64 80 52" stroke="${O}" stroke-width="7.5" stroke-linecap="round" fill="none"/><path d="M76 80 Q84 64 80 52" stroke="${FUR}" stroke-width="4" stroke-linecap="round" fill="none"/></g>
  <g class="head">
    <circle cx="44" cy="36" r="6" fill="${FUR}" stroke="${O}" stroke-width="2.6"/><circle cx="76" cy="36" r="6" fill="${FUR}" stroke="${O}" stroke-width="2.6"/>
    <circle cx="44" cy="36" r="2.6" fill="${NOSE}"/><circle cx="76" cy="36" r="2.6" fill="${NOSE}"/>
    <ellipse cx="60" cy="52" rx="22" ry="20" fill="${FUR}" stroke="${O}" stroke-width="3"/>
    <path d="M46 40 Q52 34 60 34" stroke="#ddb985" stroke-width="3" fill="none" stroke-linecap="round"/>
    <ellipse cx="60" cy="62" rx="12" ry="8" fill="${BELLY}"/>
    <g class="spikes" style="display:none"><path d="M44 36 L46 26 L51 34 L55 22 L60 33 L65 22 L69 34 L74 26 L76 36" fill="${FUR}" stroke="${O}" stroke-width="2.4" stroke-linejoin="round"/></g>
    <g class="dusty" style="display:none"><circle cx="48" cy="46" r="5" fill="${DUSTC}" opacity=".85"/><circle cx="72" cy="58" r="4" fill="${DUSTC}" opacity=".85"/><circle cx="63" cy="40" r="3" fill="${DUSTC}" opacity=".85"/></g>
    <circle class="ewl" cx="51" cy="50" r="6.2" fill="#fff" stroke="${O}" stroke-width="2"/><circle class="ewr" cx="69" cy="50" r="6.2" fill="#fff" stroke="${O}" stroke-width="2"/>
    <circle class="pl" cx="52" cy="51" r="3.2" fill="${O}"/><circle class="pr" cx="70" cy="51" r="3.2" fill="${O}"/>
    <path class="lids" d="" fill="${FUR}" stroke="${O}" stroke-width="1.5"/>
    <ellipse cx="60" cy="59" rx="3.4" ry="2.4" fill="${NOSE}" stroke="${O}" stroke-width="1.6"/>
    <path class="mouth" d="M55 63 Q60 67 65 63" stroke="${O}" stroke-width="2" fill="none" stroke-linecap="round"/>
    <rect class="teeth" x="57.5" y="64" width="5" height="4" fill="#fff" stroke="${O}" stroke-width="1.2"/>
    <g class="whisk" stroke="${O}" stroke-width="1.2"><path d="M50 60 L40 58 M50 62 L40 63 M70 60 L80 58 M70 62 L80 63"/></g>
  </g>
</g>`;

/* ================= HOTSHOT (side view, facing left) ================= */
const WHEEL = (cx: number, cy: number, cls: string) => `<g class="${cls}" transform="translate(${cx} ${cy})"><circle r="11" fill="#2a2a2f" stroke="${O}" stroke-width="2.6"/><circle r="5.5" fill="#9aa1aa" stroke="${O}" stroke-width="1.8"/><g class="spin" stroke="${O}" stroke-width="1.6"><path d="M0 -5 L0 5 M-5 0 L5 0"/></g></g>`;
const HOTSHOT = `
<g class="root">
  <g class="trailer">
    <path d="M118 46 L150 46 L158 62 L312 62 L312 72 L132 72 L132 58 L120 58 Z" fill="#4b5058" stroke="${O}" stroke-width="2.6" stroke-linejoin="round"/>
    <path d="M160 62 L310 62" stroke="#6c727c" stroke-width="2.5"/>
    <path d="M170 62 L170 55 M200 62 L200 55 M230 62 L230 55 M260 62 L260 55 M290 62 L290 55 M168 55 L310 55" stroke="${O}" stroke-width="2"/>
    ${WHEEL(250,80,'w3')}${WHEEL(276,80,'w4')}
  </g>
  <g class="truck">
    <path d="M10 66 L10 50 Q12 40 26 38 L44 36 L58 18 Q62 14 70 14 L108 14 Q114 14 114 20 L114 40 L150 40 L150 66 Z" fill="#f4f3ee" stroke="${O}" stroke-width="2.8" stroke-linejoin="round"/>
    <path d="M12 60 L150 60 L150 66 L10 66 Z" fill="#cfd1d4"/>
    <path d="M60 20 L70 20 L70 36 L50 36 Z" fill="#a9d3ee" stroke="${O}" stroke-width="2"/>
    <path d="M75 20 L108 20 L108 36 L75 36 Z" fill="#a9d3ee" stroke="${O}" stroke-width="2"/>
    <path d="M62 22 L66 22 L58 33" stroke="#e3f3fb" stroke-width="2" fill="none"/>
    <rect x="66" y="9" width="30" height="5" rx="2" fill="#f28a1c" stroke="${O}" stroke-width="2"/>
    <path d="M146 40 L146 6" stroke="${O}" stroke-width="1.6"/><path class="flag" d="M146 6 L160 9 L146 13 Z" fill="#f28a1c" stroke="${O}" stroke-width="1.4"/>
    <rect x="8" y="48" width="8" height="6" rx="2" fill="#fff3b0" stroke="${O}" stroke-width="1.6"/>
    <path d="M86 40 L90 40" stroke="${O}" stroke-width="2"/>
    <path d="M118 46 Q132 46 138 54" stroke="${O}" stroke-width="2.4" fill="none"/>
    <path d="M110 52 Q124 44 136 52" fill="#3a3d44" stroke="${O}" stroke-width="2.2"/>
    ${WHEEL(34,70,'w1')}${WHEEL(128,70,'w2')}
  </g>
</g>`;


export { GOPHER, HOTSHOT };
export const N_BEATS: [number, string, string][] = [
  [0, 'sniff', 'Nose pokes up, sniffs'], [0.6, 'stretch', 'Pops up, smug little stretch'], [1.9, 'look', 'Hears something. Slow look right'],
  [2.35, 'double-take', 'Looks back... then a fast double take'], [2.55, 'eyes-huge', 'Eyes go huge, fur stands up'], [2.75, 'duck', 'Ducks out of sight'],
  [2.8, 'hotshot', 'Hotshot screams past, right to left, over the mound, in a cloud of dust'], [4.4, 'dust-settles', 'Dust settles'],
  [5.2, 'dusty', 'Pokes back up, dusty and frazzled'], [5.8, 'near-miss', 'Blinks twice. "Near miss!"'], [7.8, 'cough', 'Coughs out a little dust puff and sinks down'], [8.6, 'gone', 'Gone'],
];
export const N_END = 8.7;
export const NEAR_MISS_LINE = 'Near miss!';
/** Reference sizes, as shares of the screen's width: the gopher's box and the hotshot's. */
export const GOPHER_FRAC = 0.09;
export const HOTSHOT_FRAC = 0.4;
/* ---------- Near Miss timeline ---------- */

export function nPose(t: number): any {
  const p: any = {eye:1, gy:80, lids:0, pupX:0, pupY:0, mouth:'M55 63 Q60 67 65 63', teeth:true, stretch:false, spikes:false, dusty:false, wh:0, headR:0,
    hx: 999, hBounce:0, dust:false, bub:false, cough:-1};
  if (t < .6){ p.gy = lerp(80, 52, ease(seg(t,0,.6))); p.wh = Math.sin(t*40)*1.5; p.lids = 3; }
  else if (t < 1.9){ p.gy = lerp(52, 0, ease(seg(t,.6,.95))); p.lids = 5; p.mouth = 'M53 62 Q60 69 67 62';
    p.stretch = t > 1.0 && t < 1.7; if (p.stretch){ p.mouth = 'M56 62 Q60 70 64 62 Z'; p.lids = 9; p.gy = -4; } }
  else if (t < 2.35){ const k = ease(seg(t,1.9,2.35)); p.gy = 0; p.pupX = 3.5*k; p.headR = 7*k; p.lids = 3; }      // slow look right
  else if (t < 2.45){ const k = seg(t,2.35,2.45); p.gy = 0; p.pupX = 3.5*(1-k); p.headR = 7*(1-k); p.lids = 3; }  // back to centre
  else if (t < 2.55){ const k = seg(t,2.45,2.55); p.gy = -1; p.pupX = 3.8*k; p.headR = 10*k; p.lids = 0; }     // snaps back: double take
  else if (t < 2.75){ const k = ease(seg(t,2.55,2.7)); p.gy = -3; p.pupX = 3; p.headR = 10; p.lids = -2; p.eye = 1 + .55*k;
    p.spikes = true; p.mouth = 'M56 62 Q60 58 64 62 Q64 70 60 70 Q56 70 56 62 Z'; p.teeth = false; }               // eyes go huge
  else if (t < 2.88){ p.gy = lerp(-3, 90, ease(seg(t,2.75,2.88))); p.spikes = true; p.eye = 1.55; p.lids = -2; }   // ducks fast
  else if (t < 5.2) p.gy = 90;
  else if (t < 5.8){ p.gy = lerp(90, 8, ease(seg(t,5.2,5.8))); p.dusty = true; p.spikes = true; p.lids = 4; p.mouth = 'M55 64 Q60 62 65 64'; }
  else if (t < 7.8){ p.gy = 8; p.dusty = true; p.spikes = true; p.mouth = 'M55 64 Q60 62 65 64'; p.bub = t > 6.0;
    p.lids = ((t > 5.95 && t < 6.1) || (t > 6.3 && t < 6.45)) ? 12 : 4; p.pupX = -.5; }
  else if (t < 8.6){ p.dusty = true; p.spikes = true; const k = seg(t,7.8,8.6);
    p.gy = k < .4 ? 8 - Math.sin(k/.4*Math.PI)*4 : lerp(8, 90, ease(seg(k,.4,1))); p.cough = clamp(k/.6);
    p.mouth = k < .4 ? 'M57 62 Q60 59 63 62 Q63 67 60 67 Q57 67 57 62 Z' : 'M55 64 Q60 62 65 64'; p.teeth = k >= .4; p.lids = k < .4 ? 10 : 4; }
  else p.gy = 90;
  // hotshot crossing, right to left, starts and ends fully off screen
  if (t > 2.8 && t < 4.4){ const k = seg(t,2.8,4.4); p.hx = lerp(1, -1, k); p.dust = true; }
  if (t >= 4.4 && t < 5.2){ p.dust = true; }
  return p;
}
export function nApply(s: any, p: any, t: number): void {
  const g = s.g, q = g.q;
  const { w } = place(g);
  const r = s.h.host.getBoundingClientRect();
  const gy = s.holeY;
  q('.root').setAttribute('transform', `translate(0 ${p.gy})`);
  q('.head').setAttribute('transform', `rotate(${p.headR} 60 70)`);
  q('.pl').setAttribute('cx', 52 + p.pupX); q('.pr').setAttribute('cx', 70 + p.pupX);
  const lr = p.lids < 0 ? 'M44 40 L58 40 L58 41 L44 41 Z M62 40 L76 40 L76 41 L62 41 Z' :
    `M44 43 L58 43 L58 ${43+p.lids} L44 ${43+p.lids} Z M62 43 L76 43 L76 ${43+p.lids} L62 ${43+p.lids} Z`;
  q('.lids').setAttribute('d', p.lids === 0 ? '' : lr);
  const big = p.lids < 0; q('.pl').setAttribute('r', big ? 1.9 : 3.2); q('.pr').setAttribute('r', big ? 1.9 : 3.2);
  q('.ewl').setAttribute('r', 6.2*p.eye); q('.ewr').setAttribute('r', 6.2*p.eye);
  q('.mouth').setAttribute('d', p.mouth); q('.mouth').setAttribute('fill', p.mouth.includes('Z') ? '#7a2a22' : 'none');
  q('.teeth').style.display = p.teeth ? '' : 'none';
  q('.stretch').style.display = p.stretch ? '' : 'none'; q('.arms').style.display = p.stretch ? 'none' : '';
  q('.spikes').style.display = p.spikes ? '' : 'none'; q('.dusty').style.display = p.dusty ? '' : 'none';
  q('.whisk').setAttribute('transform', `translate(0 ${p.wh})`);
  // hotshot: hx from +1 (right, off screen) to -1 (left, off screen) in screen widths
  const h = s.h; const hr = h.host.getBoundingClientRect(); const hw = h.frac*hr.width, hu = hw/h.vw;
  const offX = p.hx === 999 ? 9999 : p.hx * (hr.width*.5 + hw*.55) / hu;
  place(h, offX);
  const bump = (p.hx !== 999 && Math.abs(p.hx*(hr.width*.5+hw*.55) - (g.spot.x - .5)*hr.width) < hw*.45) ? -Math.abs(Math.sin(t*30))*2.2 : 0;
  h.q('.root').setAttribute('transform', `translate(0 ${bump + Math.sin(t*50)*.5})`);
  h.svg.querySelectorAll('.spin').forEach((sp: Element) => sp.setAttribute('transform', `rotate(${-t*1400})`));
  h.q('.flag').setAttribute('transform', `rotate(${Math.sin(t*25)*10} 146 9)`);
  // dust cloud trails behind (to the right of) the truck, puffs grow and fade
  s.dust.forEach((d: HTMLElement, i: number) => {
    if (!p.dust){ d.style.opacity = String(0); return; }
    const life = ((t*2.2 + i/7) % 1);
    const truckRight = (hr.width*.5 + (p.hx === 999 ? 9e3 : p.hx*(hr.width*.5+hw*.55))) + hw*.45;
    const x = truckRight + life*hw*.35 - i*2, sz = (6 + life*16) * (hw/150);
    d.style.width = d.style.height = sz+'px';
    d.style.left = (x - sz/2)+'px'; d.style.top = (h.spot.y*hr.height - sz*.9 - life*hw*.06)+'px';
    d.style.opacity = String(t > 4.4 ? Math.max(0, (1-life)*(1 - seg(t,4.4,5.2))) : (1-life)*.95);
  });
  // gopher's little cough puff
  if (p.cough >= 0 && p.cough < 1){ const sz = (4 + p.cough*10)*(w/35);
    s.cough.style.width = s.cough.style.height = sz+'px'; s.cough.style.opacity = String(1 - p.cough);
    s.cough.style.left = (g.spot.x*r.width - sz/2)+'px'; s.cough.style.top = (gy - .78*w - p.cough*.3*w)+'px';
  } else s.cough.style.opacity = String(0);
}


/** Builds the scene: the gopher (cut off at the hole line) and the hotshot, with their dust. */
export function nearMissScene(under: HTMLElement, over: HTMLElement, hole: { x: number; y: number }, hotshotY: number, scale: number): any {
  const g = makePup(under, GOPHER, { vw: 120, vh: 120, ax: 60, ay: 108, frac: GOPHER_FRAC * scale, spot: hole });
  const h = makePup(over, HOTSHOT, { vw: 320, vh: 100, ax: 160, ay: 92, frac: HOTSHOT_FRAC * scale, spot: { x: 0.5, y: hotshotY } });
  // The reference places effects against the gopher's host; here that is the same size as the screen.
  const fx = { ...g, host: over } as Pup;
  return { g, h, fx, dust: Array.from({ length: 7 }, () => addEl(over, 'pup-dust')), cough: addEl(over, 'pup-dust'), bub: { classList: { toggle() {} }, style: {} } };
}

// Gag 5, the landowner on his quad, as a code puppet ported from the approved reference
// (~/Desktop/RHR Art Inbox/near_miss_landowner_reference.html): the same drawing, poses, beats and
// timing. He rides in from off screen, skids, shakes his head at the ruts, shakes his fist ("Who's
// paying for these ruts?"), does a wheelie, loses his hat and catches it, and exits fully off
// screen. strip-gags.ts puts him on screen.
/* eslint-disable */
import { addEl, makePup, place } from './puppet-stage.ts';
const O = '#2b1e16';
const ease = (x: number) => (x < 0.5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2);
const clamp = (x: number, a = 0, b = 1) => Math.max(a, Math.min(b, x));
const seg = (t: number, a: number, b: number) => clamp((t - a) / (b - a));
const lerp = (a: number, b: number, k: number) => a + (b - a) * k;
/* ================= LANDOWNER ON QUAD (side view, facing right) ================= */
const PL='#c0392b', PL2='#7f1f16', JEAN='#3d5f8f', SK='#f0c09a', SK2='#dfa47c', HATC='#8a5a32', HATC2='#a8744a', QD='#3f7a3a', QD2='#2f5f2c';
const QWHEEL = (cx: number, cy: number, cls: string) => `<g class="${cls}" transform="translate(${cx} ${cy})"><circle r="14" fill="#2a2a2f" stroke="${O}" stroke-width="2.8"/><circle r="6" fill="#c9ccd1" stroke="${O}" stroke-width="2"/><g class="spin" stroke="${O}" stroke-width="2"><path d="M0 -6 L0 6 M-6 0 L6 0"/></g><g stroke="${O}" stroke-width="1.6"><path d="M0 -14 L0 -11 M10 -10 L8 -8 M14 0 L11 0 M10 10 L8 8 M0 14 L0 11 M-10 10 L-8 8 M-14 0 L-11 0 M-10 -10 L-8 -8"/></g></g>`;
const LANDOWNER = `
<g class="root">
  <g class="quad">
    ${QWHEEL(40,108,'qwB')}${QWHEEL(118,108,'qwF')}
    <path d="M22 92 Q24 78 40 78 L58 78 L66 86 L96 86 L104 78 L122 78 Q138 80 138 94 L132 96 L116 92 Q104 92 102 98 L56 98 Q52 92 40 92 Z" fill="${QD}" stroke="${O}" stroke-width="2.8" stroke-linejoin="round"/>
    <path d="M30 86 Q40 80 52 82" stroke="#5ea055" stroke-width="3" fill="none" stroke-linecap="round"/>
    <path d="M56 92 L102 92" stroke="${QD2}" stroke-width="5"/>
    <rect x="58" y="80" width="38" height="8" rx="4" fill="#2f2f33" stroke="${O}" stroke-width="2.4"/>
    <path d="M18 76 L44 76 M22 76 L22 72 M32 76 L32 72 M42 76 L42 72 M116 74 L140 74 M120 74 L120 70 M130 74 L130 70 M140 74 L140 70" stroke="${O}" stroke-width="2.2"/>
    <path d="M104 82 L112 60" stroke="${O}" stroke-width="3"/><path d="M106 60 L120 60" stroke="${O}" stroke-width="3.4" stroke-linecap="round"/>
    <rect x="134" y="84" width="7" height="5" rx="2" fill="#fff3b0" stroke="${O}" stroke-width="1.6"/>
  </g>
  <g class="rider">
    <path d="M70 84 L92 84 L100 100 L106 100" stroke="${JEAN}" stroke-width="10" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
    <path d="M70 84 L92 84 L100 100 L106 100" stroke="${O}" stroke-width="13" stroke-linecap="round" stroke-linejoin="round" fill="none" opacity="0"/>
    <path d="M100 96 L112 96 Q116 96 116 100 L116 103 L100 103 Z" fill="#5a3a24" stroke="${O}" stroke-width="2.2"/>
    <rect x="66" y="50" width="28" height="36" rx="11" fill="${PL}" stroke="${O}" stroke-width="2.8"/>
    <path d="M66 60 L94 60 M66 70 L94 70 M75 50 L75 86 M85 50 L85 86" stroke="${PL2}" stroke-width="2.2"/>
    <g class="armBack" transform="translate(84 58)"><path d="M0 0 L18 6 L24 4" stroke="${O}" stroke-width="9" stroke-linecap="round" fill="none"/><path d="M0 0 L18 6 L24 4" stroke="${PL}" stroke-width="5.5" stroke-linecap="round" fill="none"/><circle cx="25" cy="4" r="4.5" fill="${SK}" stroke="${O}" stroke-width="2"/></g>
    <g class="head" transform="translate(0 0)">
      <circle cx="82" cy="36" r="15" fill="${SK}" stroke="${O}" stroke-width="2.8"/>
      <circle cx="71" cy="38" r="3.6" fill="${SK}" stroke="${O}" stroke-width="2"/>
      <path class="stache" d="M86 44 Q92 41 98 45 Q94 49 88 47 Z" fill="#d9d6cf" stroke="${O}" stroke-width="1.8"/>
      <circle cx="97" cy="39" r="3.6" fill="${SK2}" stroke="${O}" stroke-width="1.8"/>
      <circle cx="89" cy="33" r="5.2" fill="#fff" stroke="${O}" stroke-width="1.8"/>
      <circle class="pupil" cx="90.5" cy="33.5" r="2.4" fill="${O}"/>
      <path class="lid" d="M84 28 L95 28 L95 29 L84 29 Z" fill="${SK}" stroke="${O}" stroke-width="1.3"/>
      <path class="brow" d="M83 26 Q89 23 96 26" stroke="#e6e3dc" stroke-width="3.6" fill="none" stroke-linecap="round"/>
      <path class="mouth" d="M88 50 Q91 49 94 50" stroke="${O}" stroke-width="1.8" fill="none" stroke-linecap="round"/>
    </g>
    <g class="hat"><path d="M68 23 Q70 8 83 8 Q96 8 97 23 Z" fill="${HATC}" stroke="${O}" stroke-width="2.6" stroke-linejoin="round"/>
      <path d="M70 19 L96 19" stroke="#5a3a24" stroke-width="2.6"/>
      <path d="M60 24 Q66 20 82 21 Q98 20 106 23 Q100 28 82 27 Q66 28 60 24 Z" fill="${HATC2}" stroke="${O}" stroke-width="2.4" stroke-linejoin="round"/></g>
    <g class="armFront" transform="translate(76 58)"><g class="upper"><path d="M0 0 L22 8" stroke="${O}" stroke-width="9.5" stroke-linecap="round"/><path d="M0 0 L22 8" stroke="${PL}" stroke-width="6" stroke-linecap="round"/>
      <g class="fore" transform="translate(22 8)"><path d="M0 0 L10 -4" stroke="${O}" stroke-width="9" stroke-linecap="round"/><path d="M0 0 L10 -4" stroke="${PL}" stroke-width="5.5" stroke-linecap="round"/>
        <circle class="fist" cx="12" cy="-5" r="5" fill="${SK}" stroke="${O}" stroke-width="2"/></g></g></g>
  </g>
</g>`;


export { LANDOWNER };
export const L_BEATS: [number, string, string][] = [
  [0, 'ride-in', 'Rides in on his quad, bouncing over the grass'], [1.9, 'skid', 'Skids to a stop, lurches forward'],
  [2.5, 'head-shake', 'Looks over at the ruts and shakes his head. Scowl builds'], [3.6, 'turn', 'Turns to you'],
  [3.8, 'fist', 'Shakes his fist: "Who\'s paying for these ruts?"'], [6.1, 'rev', 'Hmph. Revs the quad'], [6.5, 'wheelie', 'Guns it, little wheelie'],
  [6.9, 'hat-off', 'Hat blows off'], [7.3, 'hat-catch', 'Grabs it out of the air without looking'], [8.6, 'gone', 'Gone, fully off screen'],
];
export const L_END = 8.7;
export const LANDOWNER_FRAC = 0.27;
/* ---------- Landowner timeline ---------- */
export function lPose(t: number): any {
  const p: any = {x:0, y:0, tilt:0, riderX:0, riderR:0, head:0, px:90.5, py:33.5, lid:'M84 28 L95 28 L95 29 L84 29 Z', brow:'M83 26 Q89 23 96 26',
    mouth:'M88 50 Q91 49 94 50', arm:[ -10, -10 ], fistShake:0, hat:{x:0,y:0,r:0,on:true}, spin:0, dirt:-1, bub:false, grab:false};
  const bump = Math.abs(Math.sin(t*9))*1.6;
  if (t < 1.9){ const k = seg(t,0,1.9); p.x = lerp(-420, 0, 1 - Math.pow(1-k,2)); p.y = -bump; p.tilt = Math.sin(t*9)*2; p.spin = t*900; p.riderR = 4;
    p.hat.y = -bump*.4; }
  else if (t < 2.5){ const k = seg(t,1.9,2.5); p.tilt = 7*Math.sin(clamp(k*2)*Math.PI); p.riderX = 6*Math.sin(clamp(k*1.6)*Math.PI); p.riderR = 10*Math.sin(clamp(k*1.6)*Math.PI);
    p.spin = 1.9*900 + k*80; p.dirt = k; p.hat.x = 4*Math.sin(clamp((k-.1)*1.6)*Math.PI); }
  else if (t < 3.6){ const k = seg(t,2.5,3.6); p.head = -10*ease(clamp(k*2)) + (k > .3 ? Math.sin(t*15)*6*Math.sin(seg(k,.3,1)*Math.PI) : 0); p.py = 31; p.px = 89 + (k > .3 ? Math.sin(t*15)*1.2 : 0);
    p.lid = k > .4 ? 'M84 28 L95 30 L95 33 L84 31 Z' : p.lid; p.brow = k > .4 ? 'M83 28 Q89 27 96 29' : p.brow; p.mouth = k > .5 ? 'M87 51 Q91 49 95 51' : p.mouth; }
  else if (t < 3.8){ p.head = lerp(-10, 4, seg(t,3.6,3.8)); p.px = 88.5; p.py = 34; p.lid = 'M84 28 L95 30 L95 33 L84 31 Z'; p.brow = 'M83 28 Q89 27 96 29'; }
  else if (t < 6.1){ p.head = 4; p.px = 88.5; p.py = 34; p.lid = 'M84 28 L95 30.5 L95 33.5 L84 31 Z'; p.brow = 'M83 29.5 Q89 27 96 28.5';
    p.mouth = 'M87 49 Q91 46.5 95 49 Q95 53 91 53 Q87 53 87 49 Z'; p.arm = [-40, 20]; p.fistShake = Math.sin(t*28)*9; p.bub = t > 4.0; p.riderR = -3; }
  else if (t < 6.5){ const k = seg(t,6.1,6.5); p.head = lerp(4,0,k); p.mouth = 'M87 51 Q91 49 95 51'; p.y = Math.sin(t*60)*.8; p.lid = 'M84 28 L95 29 L95 31 L84 30 Z'; }
  else if (t < 8.6){ const k = seg(t,6.5,8.6); p.x = lerp(0, 520, k*k);
    p.tilt = -12*Math.sin(clamp(k*3)*Math.PI*.5)*(k < .45 ? 1 : 1 - seg(k,.45,.7)); p.spin = 2600 + k*4000; p.riderR = -6; p.riderX = -3;
    p.dirt = clamp(k*2.5);
    p.lid = 'M84 28 L95 29 L95 31 L84 30 Z';
    if (t > 6.9 && t < 7.3){ const h = seg(t,6.9,7.3); p.hat = {x:-22*h, y:-24*Math.sin(h*Math.PI) + 10*h, r:-40*h, on:false}; p.arm = [lerp(-10,-115,seg(t,7.05,7.3)), lerp(-10,-25,seg(t,7.05,7.3))]; }
    else if (t >= 7.3){ const h = ease(seg(t,7.3,7.6)); p.grab = true; p.arm = [lerp(-115,-10,h), lerp(-25,-10,h)];
      p.hat = {x: lerp(-22, 0, h), y: lerp(10, 0, h), r: lerp(-40, 0, h), on:true}; }
  }
  else p.x = 999;
  return p;
}
export function lApply(s: any, p: any, t: number): void {
  const b = s.p, q = b.q;
  const {r, w, u} = place(b, p.x === 999 ? 9999 : p.x);
  q('.root').setAttribute('transform', `translate(0 ${p.y}) rotate(${p.tilt} 40 122)`);
  q('.rider').setAttribute('transform', `translate(${p.riderX} 0) rotate(${p.riderR} 80 90)`);
  q('.head').setAttribute('transform', `rotate(${p.head} 82 46)`);
  q('.pupil').setAttribute('cx', p.px); q('.pupil').setAttribute('cy', p.py);
  q('.lid').setAttribute('d', p.lid); q('.brow').setAttribute('d', p.brow);
  q('.mouth').setAttribute('d', p.mouth); q('.mouth').setAttribute('fill', p.mouth.includes('Z') ? '#7a2a22' : 'none');
  q('.armFront .upper').setAttribute('transform', `rotate(${p.arm[0] + p.fistShake})`);
  q('.armFront .fore').setAttribute('transform', `translate(22 8) rotate(${p.arm[1] + p.fistShake*.6})`);
  q('.hat').setAttribute('transform', `translate(${p.hat.x} ${p.hat.y}) rotate(${p.hat.r} 82 22)`);
  q('.qwB .spin').setAttribute('transform', `rotate(${p.spin})`); q('.qwF .spin').setAttribute('transform', `rotate(${p.spin})`);
  s.dirt.forEach((d: HTMLElement, i: number) => {
    if (p.dirt < 0 || p.x === 999 || p.dirt >= 1){ d.style.opacity = String(0); return; }
    const k = clamp(p.dirt + i*.06), sz = (3 + k*9)*(w/105);
    const baseX = b.spot.x*r.width + (p.x - 40)*u, baseY = b.spot.y*r.height;
    d.style.width = d.style.height = sz+'px';
    d.style.left = (baseX - k*(18 + i*6)*u - sz/2)+'px'; d.style.top = (baseY - sz - Math.sin(k*Math.PI)*(10+i*3)*u)+'px';
    d.style.opacity = String(1 - k); d.style.background = '#8a6b46';
  });
  void t;
}


export function landownerScene(over: HTMLElement, groundY: number, scale: number): any {
  const p = makePup(over, LANDOWNER, { vw: 160, vh: 130, ax: 80, ay: 122, frac: LANDOWNER_FRAC * scale, spot: { x: 0.5, y: groundY } });
  return { p, dirt: Array.from({ length: 5 }, () => addEl(over, 'pup-dust')) };
}

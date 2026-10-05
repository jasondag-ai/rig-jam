// Gag 10, the bear and the snowshoe hare (LEGENDARY), as code puppets ported from the approved
// reference (~/Desktop/RHR Art Inbox/bear_rabbit_reference.html): the same drawings, poses, beats
// and timing. The hare's ears twitch behind the bush; the bear lumbers in on all fours from off
// screen, sniffs, sits, strains, spots the ears, SNATCH, a long look, the wipe, inspects, sets the
// hare down clear of the bush, pats it and strolls off; the hare, violated, trudges back BEHIND
// the bush (it goes behind only once its front edge reaches the bush) and sinks out of sight.
// strip-gags.ts puts them on screen.
/* eslint-disable */
import { addEl, makePup, place, type Pup } from './puppet-stage.ts';
const O = '#2b1e16';
const ease = (x: number) => (x < 0.5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2);
const clamp = (x: number, a = 0, b = 1) => Math.max(a, Math.min(b, x));
const seg = (t: number, a: number, b: number) => clamp((t - a) / (b - a));
const lerp = (a: number, b: number, k: number) => a + (b - a) * k;

const FUR='#26262c', FUR2='#4a4a58', MUZ='#c9a27a', MUZ2='#a9845e', BROW='#7b7b8a';
/* ---------------- bear: one puppet with a walking pose set and a sitting pose set ---------------- */
export const BEAR = `
<g class="flip"><g class="root">
  <g class="walk">
    <g class="lFB" transform="translate(112 100)"><rect x="-8" y="-6" width="16" height="38" rx="8" fill="#1b1b20" stroke="${O}" stroke-width="2.6"/></g>
    <g class="lBB" transform="translate(48 100)"><rect x="-8" y="-6" width="16" height="38" rx="8" fill="#1b1b20" stroke="${O}" stroke-width="2.6"/></g>
    <circle cx="33" cy="84" r="6" fill="${FUR}" stroke="${O}" stroke-width="2.4"/>
    <ellipse cx="82" cy="90" rx="50" ry="30" fill="${FUR}" stroke="${O}" stroke-width="3"/>
    <path d="M50 70 Q78 58 108 66" stroke="${FUR2}" stroke-width="4" fill="none" stroke-linecap="round"/>
    <g class="lFN" transform="translate(122 102)"><rect x="-8.5" y="-6" width="17" height="38" rx="8.5" fill="${FUR}" stroke="${O}" stroke-width="2.6"/></g>
    <g class="lBN" transform="translate(58 102)"><rect x="-8.5" y="-6" width="17" height="38" rx="8.5" fill="${FUR}" stroke="${O}" stroke-width="2.6"/></g>
    <g class="wHead">
      <circle cx="118" cy="57" r="7.5" fill="${FUR}" stroke="${O}" stroke-width="2.4"/><circle cx="133" cy="55" r="7.5" fill="${FUR}" stroke="${O}" stroke-width="2.4"/>
      <circle cx="118" cy="57" r="3.4" fill="${FUR2}"/><circle cx="133" cy="55" r="3.4" fill="${FUR2}"/>
      <circle cx="130" cy="74" r="20" fill="${FUR}" stroke="${O}" stroke-width="3"/>
      <ellipse cx="147" cy="82" rx="12.5" ry="9" fill="${MUZ}" stroke="${O}" stroke-width="2.4"/>
      <ellipse cx="157" cy="78" rx="4" ry="3.2" fill="#121214" stroke="${O}" stroke-width="1.4"/>
      <circle cx="138" cy="67" r="4.6" fill="#fff" stroke="${O}" stroke-width="1.8"/><circle class="wPup" cx="139.5" cy="67.5" r="2.2" fill="${O}"/>
      <path class="wLid" d="M133 62 L144 62 L144 63 L133 63 Z" fill="${FUR}"/>
      <path class="wMouth" d="M142 89 Q148 92 154 88" stroke="${O}" stroke-width="1.8" fill="none" stroke-linecap="round"/>
    </g>
  </g>
  <g class="sit" style="display:none">
    <path class="farArm" d="" stroke="${O}" stroke-width="15" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
    <path class="farArm2" d="" stroke="#1b1b20" stroke-width="10.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
    <ellipse cx="62" cy="130" rx="13" ry="6" fill="#1b1b20" stroke="${O}" stroke-width="2.4"/>
    <circle cx="48" cy="114" r="6" fill="${FUR}" stroke="${O}" stroke-width="2.4"/>
    <ellipse cx="80" cy="94" rx="30" ry="36" fill="${FUR}" stroke="${O}" stroke-width="3"/>
    <path d="M58 76 Q66 62 82 60" stroke="${FUR2}" stroke-width="4" fill="none" stroke-linecap="round"/>
    <ellipse cx="96" cy="116" rx="20" ry="13" fill="${FUR}" stroke="${O}" stroke-width="2.8"/>
    <ellipse cx="108" cy="130" rx="14" ry="6" fill="#1b1b20" stroke="${O}" stroke-width="2.4"/>
    <g class="sHead">
      <circle cx="66" cy="31" r="8.5" fill="${FUR}" stroke="${O}" stroke-width="2.4"/><circle cx="98" cy="28" r="8.5" fill="${FUR}" stroke="${O}" stroke-width="2.4"/>
      <circle cx="66" cy="31" r="3.8" fill="${FUR2}"/><circle cx="98" cy="28" r="3.8" fill="${FUR2}"/>
      <circle cx="83" cy="48" r="23" fill="${FUR}" stroke="${O}" stroke-width="3"/>
      <path d="M66 38 Q72 29 84 27" stroke="${FUR2}" stroke-width="3.5" fill="none" stroke-linecap="round"/>
      <ellipse cx="96" cy="58" rx="14" ry="10" fill="${MUZ}" stroke="${O}" stroke-width="2.4"/>
      <path d="M86 63 Q96 68 106 62" fill="${MUZ2}"/>
      <ellipse cx="102" cy="53" rx="4.6" ry="3.6" fill="#121214" stroke="${O}" stroke-width="1.4"/>
      <circle cx="79" cy="44" r="5" fill="#fff" stroke="${O}" stroke-width="1.8"/><circle cx="94" cy="42" r="5" fill="#fff" stroke="${O}" stroke-width="1.8"/>
      <circle class="sPupL" cx="80" cy="44.5" r="2.4" fill="${O}"/><circle class="sPupR" cx="95" cy="42.5" r="2.4" fill="${O}"/>
      <path class="sLids" d="" fill="${FUR}" stroke="${O}" stroke-width="1.3"/>
      <path class="sBrows" d="M74 37 Q79 35 84 37 M89 35 Q94 33 99 35" stroke="${BROW}" stroke-width="2.6" fill="none" stroke-linecap="round"/>
      <path class="sMouth" d="M90 66 Q96 69 103 65" stroke="${O}" stroke-width="2" fill="none" stroke-linecap="round"/>
    </g>
    <path class="nearArm" d="" stroke="${O}" stroke-width="15" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
    <path class="nearArm2" d="" stroke="${FUR}" stroke-width="10.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
    <circle class="nearPaw" r="7.5" fill="${FUR}" stroke="${O}" stroke-width="2.4"/>
  </g>
</g></g>`;

/* ---------------- snowshoe hare (3/4, facing left) ---------------- */
export const HARE = `
<g class="flip"><g class="root">
  <ellipse cx="38" cy="74" rx="10" ry="4" fill="#fbfbf8" stroke="${O}" stroke-width="2"/>
  <ellipse cx="30" cy="58" rx="15" ry="16" fill="#fbfbf8" stroke="${O}" stroke-width="2.4"/>
  <path d="M18 64 Q30 76 42 64 Q42 72 30 74 Q18 72 18 64 Z" fill="#dfe4ec"/>
  <ellipse cx="20" cy="74" rx="10" ry="4" fill="#fbfbf8" stroke="${O}" stroke-width="2"/>
  <g class="ears">
    <g class="earL" transform="rotate(-12 23 24)"><ellipse cx="23" cy="10" rx="4" ry="13" fill="#fbfbf8" stroke="${O}" stroke-width="2.2"/><path d="M19.4 4 Q23 -6 26.6 4 Q23 2 19.4 4 Z" fill="#1f1d1c"/><ellipse cx="23" cy="12" rx="1.6" ry="8" fill="#f2c9c9"/></g>
    <g class="earR" transform="rotate(10 32 24)"><ellipse cx="32" cy="9" rx="4" ry="13" fill="#fbfbf8" stroke="${O}" stroke-width="2.2"/><path d="M28.4 3 Q32 -7 35.6 3 Q32 1 28.4 3 Z" fill="#1f1d1c"/></g>
  </g>
  <circle cx="27" cy="34" r="12.5" fill="#fbfbf8" stroke="${O}" stroke-width="2.4"/>
  <g class="frazzle" style="display:none"><path d="M15 32 L10 28 L16 28 M37 30 L43 26 L39 32 M18 50 L12 48 L17 54 M42 52 L48 50 L43 56" stroke="${O}" stroke-width="1.8" fill="none" stroke-linejoin="round"/></g>
  <circle class="eyeWL" cx="21.5" cy="32" r="0" fill="#fff" stroke="${O}" stroke-width="1.6"/><circle class="eyeWR" cx="31" cy="31" r="0" fill="#fff" stroke="${O}" stroke-width="1.6"/>
  <circle class="pupL" cx="21.5" cy="32" r="2.6" fill="#2b1e16"/><circle class="pupR" cx="31" cy="31" r="2.6" fill="#2b1e16"/>
  <circle class="glL" cx="22.3" cy="31" r=".9" fill="#fff"/><circle class="glR" cx="31.8" cy="30" r=".9" fill="#fff"/>
  <ellipse cx="22" cy="39" rx="2" ry="1.5" fill="#e98f9a" stroke="${O}" stroke-width="1"/>
  <path class="hMouth" d="M19.5 42 Q22 44 24.5 42" stroke="${O}" stroke-width="1.3" fill="none"/>
  <path d="M14 39 L6 37 M14 41 L6 42" stroke="${O}" stroke-width=".9"/>
  <ellipse cx="22" cy="58" rx="3" ry="2.4" fill="#fbfbf8" stroke="${O}" stroke-width="1.6"/><ellipse cx="32" cy="59" rx="3" ry="2.4" fill="#fbfbf8" stroke="${O}" stroke-width="1.6"/>
</g></g>`;

/* ---------------- snowy bush ---------------- */
export const BUSH = `
<ellipse cx="50" cy="66" rx="44" ry="5" fill="rgba(80,100,130,.18)"/>
<path d="M10 64 Q4 46 18 40 Q20 24 38 26 Q46 12 62 22 Q80 18 82 36 Q98 42 90 64 Z" fill="#3e6f4c" stroke="${O}" stroke-width="2.8" stroke-linejoin="round"/>
<path d="M24 46 Q32 38 44 40 M56 34 Q66 30 74 38" stroke="#5d9168" stroke-width="3" fill="none" stroke-linecap="round"/>
<path d="M16 40 Q20 26 36 28 Q44 14 62 22 Q78 20 80 34 Q72 32 66 36 Q58 28 48 34 Q40 30 32 36 Q24 34 16 40 Z" fill="#f6f8fb" stroke="${O}" stroke-width="2.2" stroke-linejoin="round"/>`;

/** The pose at a time. `from` and `to`: where the bear walks in from and out to, in his own units (the reference's are -400 and 560). */
export function bPose(t: number, from = -400, to = 560): any {
  const p: any = {mode:'walk', x:0, y:0, rot:0, sx:1, sy:1, face:1, legs:0, head:0, wLid:0, wMouth:'M142 89 Q148 92 154 88',
    sPupX:0, sPupY:0, lids:'', brows:'M74 37 Q79 35 84 37 M89 35 Q94 33 99 35', mouth:'M90 66 Q96 69 103 65', sHead:0, sweat:-1,
    near:null, hare:'bush', hRot:0, hShock:0, hFrazzle:false, hEarDroop:0, hareShow:true, wipeLines:false, puff:-1, hEarBob:Math.sin(t*9)*2,
    hViolated:false, cloud:0, hBack:0};
  if (t < 3.5){
    const k = seg(t,.2,3.0);
    p.x = t < .2 ? from : lerp(from, 0, 1 - Math.pow(1-k,1.8)); p.legs = t < 3.0 ? Math.sin(t*2*Math.PI*1.3) : 0;
    p.y = t < 3.0 ? -Math.abs(Math.sin(t*2*Math.PI*1.3))*2 : 0;
    if (t >= 3.0){ p.head = Math.sin(t*30)*2; p.wLid = 3; }
  } else if (t < 4.0){
    const k = seg(t,3.5,4.0);
    if (k < .3){ p.sy = 1 - .15*seg(k,0,.3); p.sx = 1 + .08*seg(k,0,.3); }
    else { p.mode = 'sit'; const k2 = seg(k,.3,1); p.sy = 1 + .1*Math.sin(k2*Math.PI); p.sx = 1 - .05*Math.sin(k2*Math.PI); }
  } else if (t < 12.4) p.mode = 'sit';
  const GRIN = 'M88 65 Q96 70 104 62', BLISS_L = 'M73 39 Q79 44 86 39 L86 50 L73 50 Z M88 37 Q94 42 101 37 L101 48 L88 48 Z';
  if (p.mode === 'sit'){
    p.near = {x:104, y:96};
    if (t >= 4.0 && t < 4.8){ p.sPupX = -1; p.sPupY = 1; p.brows = 'M74 37 Q79 35 84 37 M89 31 Q94 28 99 31'; p.mouth = GRIN; p.sHead = 4; }
    else if (t >= 4.8 && t < 6.4){                         // grunting: hard squint, clenched teeth, shiver, sweat
      p.lids = 'M73 36 L86 40 L86 50 L73 50 Z M88 40 L101 36 L101 48 L88 48 Z'; p.brows = 'M73 34 L85 39 M88 39 L100 33';
      p.mouth = 'M89 63 L104 62 L104 67 L89 68 Z'; p.x = Math.sin(t*55)*.9*seg(t,4.8,6.0); p.sy = .96 - .02*Math.sin(t*6); p.sweat = (t - 4.8) % .55 / .55;
    }
    else if (t >= 6.4 && t < 6.9){ p.lids = BLISS_L; p.mouth = 'M92 64 Q97 72 102 63 Z'; p.sy = .96; p.puff = seg(t,6.4,6.9); }
    else if (t >= 6.9 && t < 7.4){ const k = seg(t,6.9,7.4); p.sPupX = k < .4 ? -2.5 : 2.5; p.sHead = k < .4 ? -4 : 6; p.mouth = k > .6 ? GRIN : 'M90 66 Q96 68 103 65'; p.brows = k > .6 ? 'M74 37 Q79 35 84 37 M89 31 Q94 28 99 31' : p.brows; }
    else if (t >= 7.4 && t < 7.9){                          // SNATCH: fast reach and grab
      const k = seg(t,7.4,7.62), k2 = seg(t,7.62,7.9); const bush = {x:150, y:104}, up = {x:124, y:58};
      p.near = t < 7.62 ? {x: lerp(104, bush.x, ease(k)), y: lerp(96, bush.y, ease(k))} : {x: lerp(bush.x, up.x, ease(k2)), y: lerp(bush.y, up.y, ease(k2))};
      p.sPupX = 2.5; p.sHead = 6; p.mouth = GRIN; if (t >= 7.62){ p.hare = 'paw'; p.hShock = .35; p.hRot = -6; }
    } else if (t >= 7.9 && t < 8.9){                        // holds it up, looks at it. A long beat
      const k = seg(t,7.9,8.9); p.near = {x:124, y:58 + Math.sin(t*3)*1}; p.hare = 'paw'; p.hRot = -6;
      p.sPupX = 3; p.sPupY = -2.5; p.sHead = -6; p.mouth = k < .5 ? 'M90 66 Q96 68 103 65' : GRIN;
      p.brows = k > .45 && k < .8 ? `M74 ${36 - Math.abs(Math.sin(k*30))*2} Q79 ${34 - Math.abs(Math.sin(k*30))*2} 84 36 M89 ${33 - Math.abs(Math.sin(k*30))*2} Q94 ${31 - Math.abs(Math.sin(k*30))*2} 99 33` : p.brows;
      p.hShock = .35 + .65*ease(seg(k,.3,.9));               // the hare slowly realises
    } else if (t >= 8.9 && t < 9.15){                       // swing it round behind him, fast
      const k = ease(seg(t,8.9,9.15)); p.near = {x: lerp(124, 46, k), y: lerp(58, 116, k)}; p.hare = 'paw'; p.hShock = 1; p.hRot = lerp(-6, 20, k); p.mouth = GRIN;
    } else if (t >= 9.15 && t < 10.7){                      // the wipe
      const w = Math.sin(t*2*Math.PI*7);
      p.near = {x: 44 + w*10, y: 117 + Math.cos(t*2*Math.PI*14)*2}; p.hare = 'paw'; p.hShock = 1; p.hRot = 20 - w*14; p.wipeLines = true;
      p.lids = BLISS_L; p.mouth = 'M90 63 Q97 74 104 62 Z'; p.x = w*1.2; p.sHead = w*3; p.hEarFlap = w;
    } else if (t >= 10.7 && t < 11.3){
      const k = seg(t,10.7,11.3); p.near = {x: lerp(46, 118, ease(clamp(k*2))), y: lerp(116, 62, ease(clamp(k*2)))}; p.hare = 'paw'; p.hShock = 1; p.hFrazzle = true; p.hRot = -6;
      p.sPupX = 2.5; p.sPupY = 1.5; p.sHead = k > .5 ? Math.sin(seg(k,.5,1)*Math.PI*2)*5 : 0; p.mouth = GRIN;
    } else if (t >= 11.3){
      const k = seg(t,11.3,11.8); p.near = t < 11.8 ? {x: lerp(118, 142, ease(k)), y: lerp(62, 118, ease(k))} : {x: 142, y: 98 - Math.abs(Math.sin((t-11.8)*14))*4};
      p.hare = t < 11.8 ? 'paw' : 'ground'; p.hShock = 1; p.hFrazzle = true; p.mouth = GRIN; p.sPupX = 2; p.sPupY = 2;
    }
  }
  if (t >= 12.4 && t < 15.4){
    p.mode = 'walk'; const k = seg(t,12.6,15.4); p.x = t < 12.6 ? 0 : lerp(0, to, k*k*.4 + k*.6); p.legs = t < 12.6 ? 0 : Math.sin(t*2*Math.PI*1.3);
    p.y = -Math.abs(Math.sin(t*2*Math.PI*1.3))*2; p.wLid = 5; p.wMouth = 'M140 88 Q148 95 155 87';
    if (t < 12.6){ p.sy = 1 - .12*Math.sin(seg(t,12.4,12.6)*Math.PI); }
  } else if (t >= 15.4) p.mode = 'gone';
  if (t >= 11.8){ p.hare = 'ground'; p.hShock = 1; p.hFrazzle = true; p.hViolated = true; p.cloud = seg(t,12.0,12.4); }
  if (t >= 13.5) p.hEarDroop = ease(seg(t,13.5,13.8));
  if (t >= 14.4){ p.hare = 'back'; p.hBack = seg(t,14.4,15.8); p.cloud = 1 - seg(t,14.4,14.8); }
  if (t >= 15.8) p.hareShow = false;
  return p;
}

export const BEAR_BEATS: [number, string, string][] = [
  [0, 'hare-nibbles', 'A hare nibbles behind a snowy bush, ears twitching'], [0.2, 'bear-in', 'The bear lumbers in from off screen'],
  [3.0, 'sniff', 'Stops by the bush. Sniff sniff'], [3.5, 'sit', 'Rears up and sits back'], [4.0, 'smug', 'Smug look at you, one brow up'],
  [4.8, 'strain', 'Grunts and strains: hard squint, sweat flying'], [6.4, 'relief', 'Ahhh. Sweet relief'], [6.9, 'spots-ears', 'Looks around... spots the ears'],
  [7.4, 'snatch', 'SNATCH. Grabs the hare out of the bush'], [7.9, 'long-look', 'Holds it up and looks at it. A long beat. The hare realises'],
  [8.9, 'swing', 'Swings it round behind him'], [9.15, 'wipe', 'WIPE. Fast and vigorous. Pure bliss. Total shock'],
  [10.7, 'inspect', 'Inspects the hare. Satisfied nod'], [11.3, 'set-down', 'Sets it down. Pat on the head'],
  [12.0, 'violated', 'The hare: violated. Huge eyes, wobbly mouth, a little storm cloud overhead'],
  [12.4, 'bear-leaves', 'The bear drops to all fours and strolls off, happy'], [14.4, 'trudge', 'It trudges back behind the bush and sinks out of sight'], [15.8, 'gone', 'Gone'],
];
export const BEAR_END = 16.0;
export const BEAR_FRAC = 0.27, HARE_FRAC = 0.07, BUSH_FRAC = 0.2;
/** How far left of the bush the bear sits, as a share of the screen's width (the reference: 0.38 and 0.6). */
export const BEAR_GAP = 0.22;

/** The scene on one layer (its puppets stack by z-index): the hare, the bush in front of it, the bear, the overlay. */
export function bearScene(layer: HTMLElement, bush: { x: number; y: number }, scale: number): any {
  const sc: any = { scale };
  const z = (p: Pup, n: number) => ((p.svg.style.zIndex = String(n)), p);
  sc.hare = z(makePup(layer, HARE, { vw: 60, vh: 80, ax: 30, ay: 76, frac: HARE_FRAC * scale, spot: { x: bush.x, y: bush.y } }), 2);
  sc.bushEl = z(makePup(layer, BUSH, { vw: 100, vh: 70, ax: 50, ay: 66, frac: BUSH_FRAC * scale, spot: { x: bush.x, y: bush.y } }), 3);
  sc.bear = z(makePup(layer, BEAR, { vw: 160, vh: 140, ax: 80, ay: 134, frac: BEAR_FRAC * scale, spot: { x: bush.x - BEAR_GAP * scale, y: bush.y } }), 4);
  sc.ov = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  sc.ov.setAttribute('class', 'pup-overlay');
  sc.ov.style.zIndex = '6';
  layer.appendChild(sc.ov);
  sc.puff = addEl(layer, 'pup-dust');
  sc.puff.style.zIndex = '6';
  return sc;
}

export function bearApply(sc: any, p: any, t: number): void {
  const B: Pup = sc.bear, q = B.q;
  const R = place(B, p.mode === 'gone' ? 99999 : p.x);
  place(sc.bushEl);
  q('.walk').style.display = p.mode === 'walk' ? '' : 'none';
  q('.sit').style.display = p.mode === 'sit' ? '' : 'none';
  q('.root').setAttribute('transform', `translate(0 ${p.y}) translate(80 134) scale(${p.sx} ${p.sy}) translate(-80 -134)`);
  if (p.mode === 'walk'){
    const a = p.legs*24;
    q('.lFN').setAttribute('transform', `translate(122 102) rotate(${a})`); q('.lBN').setAttribute('transform', `translate(58 102) rotate(${-a})`);
    q('.lFB').setAttribute('transform', `translate(112 100) rotate(${-a})`); q('.lBB').setAttribute('transform', `translate(48 100) rotate(${a})`);
    q('.wHead').setAttribute('transform', `rotate(${p.head} 120 80)`);
    q('.wLid').setAttribute('d', `M133 62 L144 62 L144 ${63 + p.wLid} L133 ${63 + p.wLid} Z`);
    q('.wMouth').setAttribute('d', p.wMouth);
  }
  if (p.mode === 'sit'){
    q('.sHead').setAttribute('transform', `rotate(${p.sHead} 82 66)`);
    q('.sPupL').setAttribute('cx', 80 + p.sPupX); q('.sPupL').setAttribute('cy', 44.5 + p.sPupY);
    q('.sPupR').setAttribute('cx', 95 + p.sPupX); q('.sPupR').setAttribute('cy', 42.5 + p.sPupY);
    q('.sLids').setAttribute('d', p.lids); q('.sBrows').setAttribute('d', p.brows);
    q('.sMouth').setAttribute('d', p.mouth); q('.sMouth').setAttribute('fill', p.mouth.includes('Z') ? '#7a2a22' : 'none');
    const n = p.near, sh = {x:100, y:76};
    const mid = {x:(sh.x + n.x)/2 + (n.x < 80 ? 6 : 8), y: Math.max(sh.y, n.y) - 4 + (n.x < 80 ? 14 : 0)};
    const d = `M${sh.x} ${sh.y} Q${mid.x} ${mid.y} ${n.x} ${n.y}`;
    q('.nearArm').setAttribute('d', d); q('.nearArm2').setAttribute('d', d);
    q('.nearPaw').setAttribute('cx', n.x); q('.nearPaw').setAttribute('cy', n.y);
  }
  // hare
  const H: Pup = sc.hare, hq = H.q, u = R.u, r = R.r;
  const hu = H.frac*r.width/60, bu = sc.bushEl.frac*r.width/100;
  const bearPt = (x: number, y: number) => ({x: B.spot.x*r.width + (x - 80 + (p.mode === 'gone' ? 0 : p.x))*u, y: B.spot.y*r.height + (y - 134 + p.y)*u});
  let hx = 0, hy = 0, hrot = 0, z = 2, hidden = false;
  const groundSpot = {x: B.spot.x*r.width + (146 - 80)*u, y: B.spot.y*r.height};   // fixed spot on the snow, never follows the bear
  const bx = sc.bushEl.spot.x*r.width + 4*u, by = sc.bushEl.spot.y*r.height - 10*u;
  if (p.hare === 'bush'){ hx = bx; hy = by + (Math.sin(t*3) > .95 ? -2*u : 0); z = 2; }
  else if (p.hare === 'paw'){ const pt = bearPt(p.near.x, p.near.y); hx = pt.x; hy = pt.y + 18*hu; hrot = p.hRot; z = 5; }
  else if (p.hare === 'ground'){ hx = groundSpot.x; hy = groundSpot.y; z = 5; }
  else if (p.hare === 'back'){ const k = p.hBack;
    hx = lerp(groundSpot.x, bx, ease(seg(k,0,.6))); hy = lerp(groundSpot.y, by, ease(seg(k,0,.6))) - Math.abs(Math.sin(seg(k,0,.6)*Math.PI*2))*4*u + seg(k,.6,.9)*12*u;
    // Behind the bush only once its front edge (its leading foot; it trudges right) has reached the bush's own edge; hidden only when sunk behind it.
    z = hx + 19*hu >= sc.bushEl.spot.x*r.width - 42*bu ? 2 : 5; hidden = k > .9; }
  H.svg.style.zIndex = String(z); H.svg.style.visibility = p.hareShow && !hidden ? 'visible' : 'hidden';
  H.spot = {x: hx/r.width, y: hy/r.height}; place(H);
  hq('.flip').setAttribute('transform', '');
  hq('.root').setAttribute('transform', `rotate(${hrot} 30 50)`);
  const sh = p.hShock;
  hq('.eyeWL').setAttribute('r', 6.4*sh); hq('.eyeWR').setAttribute('r', 6.4*sh);
  hq('.pupL').setAttribute('r', lerp(2.6, 1.2, sh)); hq('.pupR').setAttribute('r', lerp(2.6, 1.2, sh));
  hq('.glL').style.display = sh > .5 ? 'none' : ''; hq('.glR').style.display = sh > .5 ? 'none' : '';
  hq('.hMouth').setAttribute('d', p.hViolated ? `M18.5 43 Q20 ${41.5 + Math.sin(t*20)*.6} 21.5 43 Q23 ${44.5 - Math.sin(t*20)*.6} 25 43` : (sh > .5 ? 'M19.5 43 L24.5 43' : 'M19.5 42 Q22 44 24.5 42'));
  hq('.frazzle').style.display = p.hFrazzle ? '' : 'none';
  const flap = p.hEarFlap ?? 0;
  hq('.earL').setAttribute('transform', `rotate(${-12 + flap*30 + (p.hare === 'bush' ? p.hEarBob : 0) - (p.hFrazzle ? 18 : 0)} 23 24)`);
  hq('.earR').setAttribute('transform', `rotate(${10 - flap*30 + (p.hFrazzle ? 25 + p.hEarDroop*70 : 0)} 32 24)`);
  let extra = '';
  if (p.sweat >= 0 && p.mode === 'sit'){ const k = p.sweat; const a = bearPt(70, 30), b = bearPt(100, 26);
    const drop = (x: number, y: number, dx: number, dy: number) => `<path d="M0 -3 Q2.2 0 0 2.2 Q-2.2 0 0 -3 Z" fill="#9fd3f2" stroke="${O}" stroke-width=".8" transform="translate(${x + dx*k*14*u} ${y + dy*k*14*u - Math.sin(k*Math.PI)*6*u}) scale(${Math.max(.9, u*1.6)})" opacity="${1-k}"/>`;
    extra += drop(a.x, a.y, -1, -.2) + drop(b.x, b.y, 1, -.4); }
  if (p.cloud > 0 && !hidden){
    const cx = hx + 2*hu, cy = hy - 92*hu, sc2 = hu*p.cloud;
    extra += `<g transform="translate(${cx} ${cy}) scale(${sc2})" opacity="${p.cloud}">
      <circle cx="-2" cy="26" r="2.2" fill="#fff" stroke="${O}" stroke-width="1"/><circle cx="2" cy="20" r="3.2" fill="#fff" stroke="${O}" stroke-width="1.1"/>
      <ellipse cx="0" cy="2" rx="17" ry="12" fill="#fff" stroke="${O}" stroke-width="1.6"/>
      <path d="M-10 2 Q-11 -5 -4 -5 Q-2 -11 5 -8 Q11 -9 11 -2 Q14 2 9 4 L-8 4 Q-12 4 -10 2 Z" fill="#7d8592" stroke="${O}" stroke-width="1.2"/>
      <path d="M-4 5 L-6 9 M1 5 L-1 9 M6 5 L4 9" stroke="#4f8fd0" stroke-width="1.2" stroke-linecap="round"/>
      <path d="M2 4 L0 8 L2.5 8 L0.5 12" stroke="#f2c230" stroke-width="1.3" fill="none" stroke-linejoin="round"/></g>`; }
  // wipe speed lines
  let html = extra;
  if (p.wipeLines){ const pt = bearPt(44, 117), L = 14*u;
    html = `<g stroke="${O}" stroke-width="${Math.max(1, 1.4*u*1.2)}" stroke-linecap="round" opacity=".8">
      <path d="M${pt.x - 2.2*L} ${pt.y - .6*L} L${pt.x - 1.4*L} ${pt.y - .6*L}"/><path d="M${pt.x - 2.4*L} ${pt.y} L${pt.x - 1.5*L} ${pt.y}"/><path d="M${pt.x - 2.2*L} ${pt.y + .6*L} L${pt.x - 1.4*L} ${pt.y + .6*L}"/>
      <path d="M${pt.x + 1.6*L} ${pt.y - .9*L} L${pt.x + 2.2*L} ${pt.y - 1.3*L}"/><path d="M${pt.x + 1.7*L} ${pt.y + .9*L} L${pt.x + 2.3*L} ${pt.y + 1.3*L}"/></g>` + extra; }
  if (sc.ovHtml !== html) sc.ov.innerHTML = sc.ovHtml = html;
  // relief sigh puff
  const pf: HTMLElement = sc.puff;
  if (p.puff >= 0 && p.puff < 1){ const pt = bearPt(108, 60); const s = (6 + p.puff*12)*u*1.2;
    pf.style.width = pf.style.height = s+'px'; pf.style.left = (pt.x + p.puff*10*u)+'px'; pf.style.top = (pt.y - s/2 - p.puff*8*u)+'px';
    pf.style.background = '#eef3f8'; pf.style.opacity = String(1 - p.puff); } else pf.style.opacity = '0';
}

/** Wildlife Log card art: the long look (the bear sitting, the hare held up in his paw), drawn into one picture. */
export function bearStill(): string {
  const host = document.createElement('div');
  const sc = bearScene(host, { x: 0, y: 0 }, 1);
  bearApply(sc, bPose(8.6), 8.6);
  const svg: SVGSVGElement = sc.bear.svg;
  // The hare, in the bear's own units (his drawing is 160 wide at 0.27, the hare's 60 at 0.07).
  const k = (HARE_FRAC / 60) / (BEAR_FRAC / 160), p = bPose(8.6);
  svg.insertAdjacentHTML('beforeend', `<g transform="translate(${p.near.x - 30 * k} ${p.near.y + 18 * k - 76 * k}) scale(${k})">${sc.hare.svg.innerHTML}</g>`);
  svg.removeAttribute('style');
  svg.setAttribute('class', 'egg-still bear-still');
  svg.setAttribute('viewBox', '20 4 136 136');
  return svg.outerHTML;
}

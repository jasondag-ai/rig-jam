// Gag 11, the bull and the cow, as code puppets ported from the approved reference
// (~/Desktop/RHR Art Inbox/bull_cow_reference.html, the Oct 5 re-send with the primp): the same
// drawings, poses and timing. A Holstein cow grazes in the Montney bottom strip; a Hereford bull
// wanders in from off screen, freezes, PRIMPS (licks a hoof, slicks his curly forelock back with a
// cartoon-stretched leg, puffs his chest with a sparkle; the forelock stays slicked), goes dreamy
// with floating red hearts (no speech bubble); her eyes go huge, she hop-turns and bolts off screen;
// his eyebrows waggle, he snorts, paws the ground and charges after her trailing hearts; a last
// heart floats up and pops. strip-gags.ts puts them on screen.
//
// SAME START, SAME END (Jay, Oct 5): the reference ends there. In the game the cow then wanders
// back in from the edge she left by, a little out of breath, and goes back to grazing in her spot
// (`T_BACK` on, built here in the reference's style). The bull stays gone.
/* eslint-disable */
import { makePup, place, type Pup } from './puppet-stage.ts';
const O = '#2b1e16';
const ease = (x: number) => (x < 0.5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2);
const clamp = (x: number, a = 0, b = 1) => Math.max(a, Math.min(b, x));
const seg = (t: number, a: number, b: number) => clamp((t - a) / (b - a));
const lerp = (a: number, b: number, k: number) => a + (b - a) * k;

const leg = (cls: string, x: number, y: number, fill: string, hoof: string) => `<g class="${cls}" transform="translate(${x} ${y})"><rect x="-6" y="-4" width="12" height="30" rx="6" fill="${fill}" stroke="${O}" stroke-width="2.4"/><rect x="-6.5" y="20" width="13" height="7" rx="2.5" fill="${hoof}" stroke="${O}" stroke-width="2"/></g>`;

/* ---------------- Holstein cow (side view, default facing right) ---------------- */
export const COW = `
<g class="flip"><g class="root">
  ${leg('lFB', 114, 84, '#e9e9e4', '#3a3a3a')}${leg('lBB', 50, 84, '#e9e9e4', '#3a3a3a')}
  <g class="tail" transform="translate(34 62)"><path d="M0 0 Q-10 14 -6 30" stroke="${O}" stroke-width="5" fill="none" stroke-linecap="round"/><path d="M0 0 Q-10 14 -6 30" stroke="#f7f7f2" stroke-width="2.6" fill="none" stroke-linecap="round"/><ellipse cx="-6" cy="32" rx="4" ry="6" fill="#26262c" stroke="${O}" stroke-width="1.8"/></g>
  <ellipse cx="80" cy="66" rx="48" ry="25" fill="#f7f7f2" stroke="${O}" stroke-width="3"/>
  <path d="M46 52 Q56 44 70 50 Q74 62 60 66 Q48 66 46 52 Z M88 46 Q104 42 110 54 Q104 64 92 60 Q84 54 88 46 Z M66 72 Q78 70 84 80 Q74 88 64 84 Z" fill="#26262c"/>
  <path d="M50 46 Q76 38 104 44" stroke="#ffffff" stroke-width="3" fill="none" stroke-linecap="round"/>
  <ellipse cx="62" cy="90" rx="9" ry="5" fill="#f2a5b3" stroke="${O}" stroke-width="2"/>
  ${leg('lFN', 120, 86, '#f7f7f2', '#3a3a3a')}${leg('lBN', 58, 86, '#f7f7f2', '#3a3a3a')}
  <g class="head">
    <path d="M112 50 Q118 40 132 42" stroke="${O}" stroke-width="12" fill="none" stroke-linecap="round"/><path d="M112 50 Q118 40 132 42" stroke="#f7f7f2" stroke-width="8" fill="none" stroke-linecap="round"/>
    <ellipse cx="124" cy="44" rx="9" ry="4.5" transform="rotate(-25 124 44)" fill="#26262c" stroke="${O}" stroke-width="2"/>
    <rect x="124" y="38" width="28" height="34" rx="13" fill="#f7f7f2" stroke="${O}" stroke-width="2.8"/>
    <path d="M126 44 Q132 38 142 40 Q140 50 130 52 Z" fill="#26262c"/>
    <rect x="132" y="60" width="24" height="16" rx="8" fill="#f2a5b3" stroke="${O}" stroke-width="2.4"/>
    <ellipse cx="141" cy="67" rx="1.8" ry="2.4" fill="${O}"/><ellipse cx="150" cy="67" rx="1.8" ry="2.4" fill="${O}"/>
    <path class="jaw" d="M136 76 Q144 79 152 76" stroke="${O}" stroke-width="1.8" fill="none" stroke-linecap="round"/>
    <circle class="eye" cx="140" cy="50" r="4.4" fill="#fff" stroke="${O}" stroke-width="1.8"/><circle class="pup" cx="141.5" cy="50.5" r="2.1" fill="${O}"/>
    <path class="lash" d="M136 46.5 L134 44 M139 45.5 L138.5 42.8 M142.5 45.6 L143.4 43" stroke="${O}" stroke-width="1.4" stroke-linecap="round"/>
  </g>
</g></g>`;

/* ---------------- Hereford bull (side view, default facing right) ---------------- */
const RB='#8a4b2b', RB2='#a8613a', RB3='#6e3a20';
export const BULL = `
<g class="flip"><g class="root">
  ${leg('lFB', 116, 82, RB3, '#2a2420')}${leg('lBB', 46, 82, RB3, '#2a2420')}
  <g class="tail" transform="translate(28 58)"><path d="M0 0 Q-10 14 -6 30" stroke="${O}" stroke-width="5" fill="none" stroke-linecap="round"/><path d="M0 0 Q-10 14 -6 30" stroke="${RB}" stroke-width="2.6" fill="none" stroke-linecap="round"/><ellipse cx="-6" cy="32" rx="4" ry="6" fill="#f2efe6" stroke="${O}" stroke-width="1.8"/></g>
  <path d="M28 66 Q28 40 60 38 Q84 28 108 38 Q132 44 130 70 Q128 90 80 92 Q30 92 28 66 Z" fill="${RB}" stroke="${O}" stroke-width="3" stroke-linejoin="round"/>
  <path d="M60 44 Q84 34 108 42" stroke="${RB2}" stroke-width="4" fill="none" stroke-linecap="round"/>
  <path d="M70 90 Q86 96 104 88 Q104 82 96 82 Q84 86 72 84 Z" fill="#f2efe6"/>
  ${leg('lFN', 122, 84, RB, '#2a2420')}${leg('lBN', 54, 84, RB, '#2a2420')}
  <g class="head">
    <path d="M118 40 Q126 30 136 34 L140 54 Q128 56 118 50 Z" fill="${RB}" stroke="${O}" stroke-width="2.6" stroke-linejoin="round"/>
    <path d="M128 38 Q122 26 130 20 Q126 30 134 36 Z" fill="#efe4c8" stroke="${O}" stroke-width="2" stroke-linejoin="round"/>
    <ellipse cx="126" cy="44" rx="9" ry="4.5" transform="rotate(-20 126 44)" fill="${RB}" stroke="${O}" stroke-width="2"/>
    <rect x="128" y="34" width="32" height="38" rx="14" fill="#f2efe6" stroke="${O}" stroke-width="2.8"/>
    <path d="M128 40 Q132 34 140 34 L140 46 Q132 46 128 40 Z" fill="${RB}"/>
    <path d="M150 36 Q160 24 168 30 Q160 30 156 40 Z" fill="#efe4c8" stroke="${O}" stroke-width="2" stroke-linejoin="round"/>
    <rect x="138" y="58" width="26" height="17" rx="8.5" fill="#e3a596" stroke="${O}" stroke-width="2.4"/>
    <ellipse cx="148" cy="65" rx="1.9" ry="2.5" fill="${O}"/><ellipse cx="157" cy="65" rx="1.9" ry="2.5" fill="${O}"/>
    <circle cx="152.5" cy="74" r="4.2" fill="none" stroke="#d9a520" stroke-width="2.4"/>
    <circle class="eye" cx="148" cy="48" r="4.6" fill="#fff" stroke="${O}" stroke-width="1.8"/><circle class="pup" cx="149.5" cy="48.5" r="2.2" fill="${O}"/>
    <path class="lid" d="M143 43 L153 43 L153 44 L143 44 Z" fill="#f2efe6" stroke="${O}" stroke-width="1.2"/>
    <path class="brow" d="M142 41 Q148 38 155 40" stroke="#4a2a18" stroke-width="3.4" fill="none" stroke-linecap="round"/>
    <path class="mouth" d="M142 70 Q146 72 150 71" stroke="${O}" stroke-width="1.8" fill="none" stroke-linecap="round"/>
    <path class="tongue" d="M150 72 Q156 76 160 72 Q158 80 151 77 Z" fill="#e86f86" stroke="${O}" stroke-width="1.4" style="display:none"/>
    <path class="lockCurl" d="M134 34 Q132 26 138 26 Q136 20 143 22 Q144 16 150 20 Q156 18 156 26 Q152 30 146 30 Q140 34 134 34 Z" fill="#6e3a20" stroke="${O}" stroke-width="1.8" stroke-linejoin="round"/>
    <path class="lockSlick" d="M132 34 Q140 24 156 26 Q160 27 162 32 Q150 29 144 32 Q138 34 132 34 Z" fill="#6e3a20" stroke="${O}" stroke-width="1.8" stroke-linejoin="round" style="display:none"/>
    <path class="shine" d="M146 27 L148 24 M150 27 L153 25" stroke="#fff" stroke-width="1.4" stroke-linecap="round" style="display:none"/>
  </g>
</g></g>`;

const HEART = (x: number, y: number, s: number, o: number) => `<path transform="translate(${x} ${y}) scale(${s})" opacity="${o}" d="M0 3 C-6 -3 -10 -9 -5 -12 C-2 -14 0 -11 0 -9 C0 -11 2 -14 5 -12 C10 -9 6 -3 0 3 Z" fill="#e3364b" stroke="${O}" stroke-width="1.4" vector-effect="non-scaling-stroke"/>`;

/** The primp sits between the freeze and the hearts: the reference's later beats all happen SHIFT later. */
export const SHIFT = 1.6;
/** After the last heart has popped the cow comes back: walking from T_BACK, home and puffing at T_HOME, grazing again from T_GRAZE. */
export const T_BACK = 11.7, T_HOME = 14.7, T_GRAZE = 15.5;
export const BULL_BEATS: [number, string, string][] = [
  [0, 'cow-grazes', 'A Holstein cow grazes, tail swishing'], [0.3, 'bull-in', 'The bull wanders in from off screen'],
  [2.4, 'freeze', 'He spots her. Freezes'], [2.8, 'lick-hoof', 'Licks a hoof'], [3.3, 'slick', 'Slicks back his forelock'],
  [3.9, 'chest-puff', 'Puffs out his chest, chin up. Sparkle'], [4.4, 'hearts', 'Dreamy eyes. Hearts float up'],
  [6.0, 'cow-looks', 'She lifts her head, mid-chew'], [6.5, 'eyes-huge', 'Her eyes go huge'], [6.9, 'hop-turn', 'Hop-turn'],
  [7.2, 'bolts', 'She bolts off screen, tail flying. His eyebrows waggle. Devious grin, a snort'],
  [8.2, 'paws', 'Paws the ground'], [8.5, 'charge', 'Charges after her, hearts trailing'], [10.6, 'last-heart', 'One last heart floats... and pops'],
  [T_BACK, 'cow-back', 'She wanders back in from the edge she left by, a little out of breath'], [T_HOME, 'catches-breath', 'Back in her spot. Catches her breath'],
  [T_GRAZE, 'grazes-again', 'Head down, grazing again, exactly like the start'],
];
export const BULL_END = 16.2;
export const COW_FRAC = 0.21, BULL_FRAC = 0.24;
/** How far left of the cow the bull stops, as a share of the screen's width (the reference: 0.3 and 0.66; a little closer here, to clear the biffy). */
export const BULL_GAP = 0.34;
/** The cow at rest: grazing, quite still. The gag's first and last frames are exactly this. */
export const COW_REST = { x: 0, y: 0, face: -1, legs: 0, gallop: false, head: -32, jaw: 0, eye: 4.4, pup: 2.1, tail: 0, show: true, sy: 1 };

// ----- the reference, as written (its `pose` is `refPose` here, its `poseOrig` the gag before the primp was added) -----
function poseOrig(t: number, from: number, to: number, charge: number): any {
  const c: any = {x:0, y:0, face:-1, legs:0, gallop:false, head:-30, jaw:0, eye:4.4, pup:2.1, tail:Math.sin(t*3)*14, show:true, sy:1};
  const b: any = {x:from, y:0, face:1, legs:0, gallop:false, head:0, lid:'M143 43 L153 43 L153 44 L143 44 Z', brow:'M142 41 Q148 38 155 40', mouth:'M142 70 Q146 72 150 71', pupX:0, tail:Math.sin(t*2.5)*10, show:true, sy:1, hearts:0, snort:-1, scrape:0};
  // cow grazing, munching
  if (t < 4.4){ c.head = -32; c.jaw = Math.sin(t*10)*1.5; }
  else if (t < 4.9){ const k = ease(seg(t,4.4,4.75)); c.head = lerp(-32, 4, k); c.jaw = t < 4.6 ? Math.sin(t*10)*1.5 : 0; c.pup = 2.1; }
  else if (t < 5.3){ const k = ease(seg(t,4.9,5.1)); c.head = 6; c.eye = 4.4 + 3.2*k; c.pup = 2.1 - .9*k; c.y = -2*k; c.tail = -30; }
  else if (t < 5.6){ const k = seg(t,5.3,5.6); c.y = -Math.sin(k*Math.PI)*12; c.face = (k < .5 ? -1 : 1)*(1 - .2*Math.sin(k*Math.PI)); c.eye = 7.6; c.pup = 1.2; c.head = 6; c.sy = 1 + .08*Math.sin(k*Math.PI); }
  else if (t < 7.8){ const k = seg(t,5.6,7.8); c.face = 1; c.x = lerp(0, to, k*k*.3 + k*.7); c.gallop = true; c.legs = Math.sin(t*2*Math.PI*3.4); c.y = -Math.abs(Math.sin(t*2*Math.PI*3.4))*5; c.eye = 7.6; c.pup = 1.2; c.tail = -70 + Math.sin(t*30)*8; c.head = 8; }
  else c.show = false;
  // bull
  if (t < .3) b.x = from;
  else if (t < 2.4){ const k = seg(t,.3,2.4); b.x = lerp(from, 0, 1 - Math.pow(1-k,1.8)); b.legs = Math.sin(t*2*Math.PI*1.3); b.y = -Math.abs(Math.sin(t*2*Math.PI*1.3))*1.6; }
  else if (t < 2.8){ b.x = 0; b.pupX = 1; b.lid = 'M143 43 L153 43 L153 44 L143 44 Z'; b.brow = 'M142 39 Q148 36 155 38'; }
  else if (t < 5.6){ b.x = 0; b.lid = 'M143 42 Q148 47 153 42 L153 49 L143 49 Z'; b.brow = 'M142 39 Q148 37 155 39'; b.mouth = 'M141 70 Q146 74 151 70'; b.head = -4 + Math.sin(t*2)*2; b.hearts = 1; b.tail = Math.sin(t*6)*22; }
  else if (t < 6.6){ b.x = 0; const w = Math.sin(t*2*Math.PI*4); b.brow = `M142 ${38 - w*3} Q148 ${35 - w*3} 155 ${37 - w*3}`;           // eyebrow waggle
    b.lid = 'M143 44 L153 45 L153 47 L143 46 Z'; b.mouth = 'M140 69 Q147 75 153 68'; b.pupX = 2; b.hearts = 1 - seg(t,5.6,6.2); b.snort = seg(t,6.0,6.6); }
  else if (t < 6.9){ b.x = 0; b.scrape = Math.sin(seg(t,6.6,6.9)*Math.PI*3); b.brow = 'M142 42 L155 39'; b.lid = 'M143 44 L153 45 L153 47 L143 46 Z'; b.mouth = 'M140 69 Q147 75 153 68'; b.sy = .95; }
  else if (t < 9.2){ const k = seg(t,6.9,9.2); b.x = lerp(0, charge, k*k*.45 + k*.55); b.gallop = true; b.legs = Math.sin(t*2*Math.PI*3.2); b.y = -Math.abs(Math.sin(t*2*Math.PI*3.2))*5;
    b.brow = 'M142 42 L155 39'; b.mouth = 'M140 69 Q147 75 153 68'; b.tail = 40 + Math.sin(t*25)*10; b.hearts = 2; }
  else b.show = false;
  return {c, b};
}
function refPose(t: number, from: number, to: number, charge: number): any {
  if (t < 2.8) return poseOrig(t, from, to, charge);
  if (t >= 4.4) return poseOrig(t - SHIFT, from, to, charge);
  // the primp: lick a hoof, smooth the forelock, puff the chest
  const P = poseOrig(2.79, from, to, charge), b = P.b, c = P.c;
  c.jaw = Math.sin(t*10)*1.5; c.tail = Math.sin(t*3)*14;
  b.primp = {leg:0, stretch:1, tongue:false, slick:t > 3.6, puff:0, shine:false};
  b.lid = 'M143 43 L153 43 L153 44 L143 44 Z'; b.brow = 'M142 41 Q148 38 155 40';
  if (t < 3.3){ const k = seg(t,2.8,3.3); b.primp.leg = -110*ease(clamp(k*3)); b.primp.tongue = Math.sin(k*Math.PI*4) > 0; b.head = 6; b.lid = 'M143 43 L153 43 L153 47 L143 47 Z'; }
  else if (t < 3.9){ const k = seg(t,3.3,3.9); b.primp.leg = -150 + Math.sin(k*Math.PI*2)*18; b.primp.stretch = 1.55; b.head = 14; b.lid = 'M143 43 L153 43 L153 48 L143 48 Z'; }
  else { const k = seg(t,3.9,4.4); b.primp.leg = -150*(1 - ease(clamp(k*2.5))); b.primp.stretch = lerp(1.55, 1, clamp(k*2.5)); b.primp.puff = Math.sin(clamp(k*1.2)*Math.PI*.5);
    b.head = -10*b.primp.puff; b.lid = 'M143 43 L153 43 L153 46 L143 46 Z'; b.brow = 'M142 39 Q148 36 155 39'; b.mouth = 'M141 70 Q147 73 152 69'; b.primp.shine = k > .3; }
  return P;
}

/**
 * The pose at a time. `from`/`charge`: where the bull walks in from and charges out to; `to`: where
 * the cow bolts to (and comes back from), each in its own drawing's units (the reference's are
 * -420, 620 and 520).
 */
export function bullPose(t: number, from = -420, to = 520, charge = 620): any {
  const P = refPose(t, from, to, charge);
  const c = P.c;
  P.breath = -1;
  // She only moves during the gag: her tail and jaw ease in from rest, so the first frame is the cow as she stood.
  const wake = clamp(t / 0.4);
  if (t < 2.8){ c.tail *= wake; c.jaw *= wake; }
  // ----- the cow comes back (not in the reference) -----
  if (t >= T_BACK && t < T_HOME){                          // a tired walk in from the edge she left by: head low, sides heaving
    const k = seg(t,T_BACK,T_HOME), step = Math.sin(t*2*Math.PI*1.15);
    Object.assign(c, { show: true, face: -1, gallop: false, x: lerp(to, 0, k < .9 ? k/.9*.96 : .96 + ease((k-.9)/.1)*.04), legs: step, y: -Math.abs(step)*1.2,
      head: -10 + Math.sin(t*2*Math.PI*1.15)*2, jaw: 1.5, eye: 4.4, pup: 2.1, tail: Math.sin(t*2)*6, sy: 1 + .035*Math.sin(t*2*Math.PI*1.6) });
    P.breath = (t*1.6) % 1;
  } else if (t >= T_HOME && t < T_GRAZE){                  // home: stands and catches her breath
    const k = seg(t,T_HOME,T_GRAZE);
    Object.assign(c, { show: true, face: -1, gallop: false, x: 0, legs: 0, y: 0, head: -10 - 4*k, jaw: 1.5*(1-k), eye: 4.4, pup: 2.1, tail: Math.sin(t*2)*6*(1-k), sy: 1 + .035*(1-k)*Math.sin(t*2*Math.PI*1.6) });
    P.breath = k < .7 ? (t*1.6) % 1 : -1;
  } else if (t >= T_GRAZE){                                 // head down: grazing again, exactly as she began
    const k = ease(seg(t,T_GRAZE,BULL_END - .15));
    Object.assign(c, { ...COW_REST, head: lerp(-14, COW_REST.head, k) });
  }
  return P;
}

function quad(pp: Pup, a: number, gallop: boolean): void {
  const q = pp.q; const amp = gallop ? 38 : 22;
  const set = (sel: string, deg: number) => { const g = q(sel); const base = g.dataset.base ?? (g.dataset.base = g.getAttribute('transform')); g.setAttribute('transform', `${base} rotate(${deg})`); };
  set('.lFN', a*amp); set('.lBN', (gallop ? a : -a)*amp); set('.lFB', -a*amp*(gallop ? .6 : 1)); set('.lBB', (gallop ? -a : a)*amp*.8);
}
/** Poses the cow alone (she is permanent scenery: `COW_REST` is how she stands when nothing is happening). */
export function cowApply(C: Pup, c: any): void {
  const cq = C.q;
  place(C, c.x);
  C.svg.style.visibility = c.show ? 'visible' : 'hidden';
  cq('.flip').setAttribute('transform', `translate(85 0) scale(${c.face} 1) translate(-85 0)`);
  cq('.root').setAttribute('transform', `translate(0 ${c.y}) translate(85 114) scale(1 ${c.sy}) translate(-85 -114)`);
  cq('.head').setAttribute('transform', `rotate(${-c.head} 116 52)`);
  cq('.jaw').setAttribute('transform', `translate(0 ${c.jaw})`);
  cq('.eye').setAttribute('r', c.eye); cq('.pup').setAttribute('r', c.pup);
  cq('.tail').setAttribute('transform', `translate(34 62) rotate(${c.tail})`);
  quad(C, c.legs, c.gallop);
}

/** Poses the bull's own drawing (`slick`: his forelock has been slicked back). */
function bullBody(B: Pup, b: any, slick: boolean): void {
  const bq = B.q;
  bq('.flip').setAttribute('transform', `translate(85 0) scale(${b.face} 1) translate(-85 0)`);
  bq('.root').setAttribute('transform', `translate(0 ${b.y}) translate(85 114) scale(1 ${b.sy}) translate(-85 -114)`);
  bq('.head').setAttribute('transform', `rotate(${b.head} 124 50)`);
  bq('.lid').setAttribute('d', b.lid); bq('.brow').setAttribute('d', b.brow); bq('.mouth').setAttribute('d', b.mouth);
  bq('.pup').setAttribute('cx', 149.5 + b.pupX);
  bq('.tail').setAttribute('transform', `translate(28 58) rotate(${b.tail})`);
  quad(B, b.legs, b.gallop);
  const pr = b.primp, slickNow = pr ? pr.slick : slick;
  bq('.lockCurl').style.display = slickNow ? 'none' : ''; bq('.lockSlick').style.display = slickNow ? '' : 'none';
  bq('.tongue').style.display = pr && pr.tongue ? '' : 'none'; bq('.shine').style.display = pr && pr.shine ? '' : 'none';
  if (pr){ bq('.lFN').setAttribute('transform', `translate(122 84) rotate(${pr.leg}) scale(1 ${pr.stretch})`);
    if (pr.puff) bq('.root').setAttribute('transform', `translate(0 ${-2*pr.puff}) translate(85 114) scale(${1 + .07*pr.puff} ${1 + .07*pr.puff}) translate(-85 -114)`); }
  if (b.scrape) bq('.lFN').setAttribute('transform', `translate(122 84) rotate(${-25 + b.scrape*30})`);
}

/** One frame at the gag's time `realT`. `sc.cow` is the permanent cow, `sc.bull` the bull, `sc.ov` the overlay (hearts, snort, dirt, her breath; the layer's px). */
export function bullApply(sc: any, P: any, realT: number): void {
  const {c, b} = P;
  // The reference runs its effects on the clock from before the primp was added.
  const t = realT >= 4.4 ? realT - SHIFT : Math.min(realT, 2.79);
  cowApply(sc.cow, c);
  const B: Pup = sc.bull; const RB_ = place(B, b.x);
  B.svg.style.visibility = b.show ? 'visible' : 'hidden';
  bullBody(B, b, realT >= 4.4);
  // hearts, snort, the final pop
  const u = RB_.u, r = RB_.r;
  const headPt = {x: B.spot.x*r.width + (150 - 85 + b.x)*u, y: B.spot.y*r.height + (30 - 114 + b.y)*u};
  let html = '';
  if (b.hearts === 1 || (b.hearts > 0 && b.hearts < 1)){
    for (let i = 0; i < 5; i++){ const life = ((t*.55 + i/5) % 1);
      html += HEART(headPt.x + Math.sin(life*7 + i)*8*u, headPt.y - life*55*u, Math.max(.7, u*1.1)*(.7 + life*.6), (b.hearts === 1 ? 1 : b.hearts)*(life < .8 ? 1 : (1-life)*5)); } }
  if (b.hearts === 2){ for (let i = 0; i < 3; i++){ const life = ((t*1.2 + i/3) % 1);
      html += HEART(headPt.x - 40*u - life*70*u, headPt.y + 10*u - life*22*u, Math.max(.6, u)*(.8 + life*.4), 1 - life); } }
  if (b.snort >= 0 && b.snort < 1){ const nx = B.spot.x*r.width + (166 - 85)*u, ny = B.spot.y*r.height + (66 - 114)*u, k = b.snort;
    html += `<circle cx="${nx + k*14*u}" cy="${ny + k*3*u}" r="${(2 + k*5)*u}" fill="#eef3f8" stroke="${O}" stroke-width="1" opacity="${1-k}"/>`; }
  if (t > 9.0 && t < 9.9){ const k = seg(t,9.0,9.6), px = sc.popX ?? r.width*.5, py = B.spot.y*r.height - 70*u - k*30*u;
    if (t < 9.6) html += HEART(px, py, Math.max(.8, u*1.3)*(1 + k*.3), 1);
    else { const k2 = seg(t,9.6,9.9); for (let i = 0; i < 6; i++){ const a = i/6*Math.PI*2; html += `<path class="pop" d="M${px + Math.cos(a)*6*u*(1+k2*2)} ${py + Math.sin(a)*6*u*(1+k2*2) - 5*u} l${Math.cos(a)*3*u} ${Math.sin(a)*3*u}" stroke="#e3364b" stroke-width="${Math.max(1.4,u*1.8)}" stroke-linecap="round" opacity="${1-k2}"/>`; } } }
  if (b.scrape){ const fx = B.spot.x*r.width + (122 - 85)*u, fy = B.spot.y*r.height; html += `<circle cx="${fx - 14*u}" cy="${fy - 3*u}" r="${(3 + Math.abs(b.scrape)*3)*u}" fill="#8a6b46" stroke="${O}" stroke-width="1" opacity=".8"/>`; }
  // her breath as she comes back: little puffs from her muzzle (she faces left, so her drawing is mirrored)
  if (P.breath >= 0){ const C: Pup = sc.cow, cu = C.frac*r.width/170, k = P.breath, mx = C.spot.x*r.width + (170 - 158 - 85 + c.x)*cu, my = C.spot.y*r.height + (70 - 114 + c.y)*cu;
    html += `<circle class="breath" cx="${mx - (3 + k*10)*cu}" cy="${my - k*5*cu}" r="${(2 + k*4)*cu}" fill="#eef3f8" stroke="${O}" stroke-width="1" opacity="${(1-k)*.9}"/>`; }
  if (sc.ovHtml !== html) sc.ov.innerHTML = sc.ovHtml = html;
}

/** The cow, standing at `spot` (shares of her layer). */
export const cowPup = (host: HTMLElement, spot: { x: number; y: number }, scale: number): Pup => makePup(host, COW, { vw: 170, vh: 120, ax: 85, ay: 114, frac: COW_FRAC * scale, spot });
/** The bull and the overlay on a layer; the cow is the permanent one. */
export function bullScene(layer: HTMLElement, cow: Pup, scale: number): any {
  const bull = makePup(layer, BULL, { vw: 170, vh: 120, ax: 85, ay: 114, frac: BULL_FRAC * scale, spot: { x: cow.spot.x - BULL_GAP * scale, y: cow.spot.y } });
  const ov = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  ov.setAttribute('class', 'pup-overlay');
  layer.appendChild(ov);
  return { cow, bull, ov };
}

/** Wildlife Log card art: the bull, forelock slicked, dreamy, with his hearts. */
export function bullStill(): string {
  const host = document.createElement('div');
  const bull = makePup(host, BULL, { vw: 170, vh: 120, ax: 85, ay: 114, frac: 1, spot: { x: 0, y: 0 } });
  bullBody(bull, bullPose(5.2).b, true);
  bull.svg.insertAdjacentHTML('beforeend', [[150, 16, 1.1], [160, -2, 1.4], [142, -16, 0.9]].map(([x, y, s]) => HEART(x, y, s, 1)).join(''));
  bull.svg.removeAttribute('style');
  bull.svg.setAttribute('class', 'egg-still bull-still');
  bull.svg.setAttribute('viewBox', '14 -30 164 150');
  return bull.svg.outerHTML;
}

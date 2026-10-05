// Gag 11, the bull and the cow, as code puppets ported from the approved reference
// (~/Desktop/RHR Art Inbox/bull_cow_reference.html): the same drawings, poses and timing. A Holstein
// cow grazes in the Montney bottom strip; a Hereford bull wanders in from off screen, freezes,
// PRIMPS (licks a hoof, slicks back his curly forelock with a cartoon-stretched leg, puffs his chest
// with a sparkle), goes dreamy with floating red hearts (no speech bubble); her eyes go huge, she
// hop-turns and bolts off screen; his eyebrows waggle, he snorts, paws the ground and charges after
// her trailing hearts; a last heart floats up and pops. strip-gags.ts puts them on screen.
//
// THE PRIMP is not in the reference file (it was Jay's punch-up, GAME_BIBLE Oct 4): it is built
// here in the reference's style and takes PRIMP seconds between the freeze and the hearts; every
// later beat of the reference is that much later, otherwise unchanged. The forelock stays slicked.
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
    <path class="forelock" d="" fill="#f7f1df" stroke="${O}" stroke-width="2" stroke-linejoin="round"/>
    <path class="shine" d="M131 29 Q139 27.5 147 29" stroke="#ffffff" stroke-width="1.6" fill="none" stroke-linecap="round" style="display:none"/>
    <path class="tongue" d="M150 72 Q157 76 154.5 81 Q149 81.5 147.5 73.5 Z" fill="#e8607a" stroke="${O}" stroke-width="1.4" stroke-linejoin="round" style="display:none"/>
    <circle class="eye" cx="148" cy="48" r="4.6" fill="#fff" stroke="${O}" stroke-width="1.8"/><circle class="pup" cx="149.5" cy="48.5" r="2.2" fill="${O}"/>
    <path class="lid" d="M143 43 L153 43 L153 44 L143 44 Z" fill="#f2efe6" stroke="${O}" stroke-width="1.2"/>
    <path class="brow" d="M142 41 Q148 38 155 40" stroke="#4a2a18" stroke-width="3.4" fill="none" stroke-linecap="round"/>
    <path class="mouth" d="M142 70 Q146 72 150 71" stroke="${O}" stroke-width="1.8" fill="none" stroke-linecap="round"/>
  </g>
  ${leg('primpLeg', 122, 84, RB, '#2a2420')}
</g></g>`;

const HEART = (x: number, y: number, s: number, o: number) => `<path transform="translate(${x} ${y}) scale(${s})" opacity="${o}" d="M0 3 C-6 -3 -10 -9 -5 -12 C-2 -14 0 -11 0 -9 C0 -11 2 -14 5 -12 C10 -9 6 -3 0 3 Z" fill="#e3364b" stroke="${O}" stroke-width="1.4" vector-effect="non-scaling-stroke"/>`;

/** How long the primp takes: the reference's later beats all happen this much later. */
export const PRIMP = 1.8;
const T_PRIMP = 2.8;
export const BULL_BEATS: [number, string, string][] = [
  [0, 'cow-grazes', 'A Holstein cow grazes, tail swishing'], [0.3, 'bull-in', 'The bull wanders in from off screen'],
  [2.4, 'freeze', 'He spots her. Freezes'], [2.8, 'lick-hoof', 'Primps: licks a hoof'], [3.35, 'slick', 'Slicks back his curly forelock'],
  [4.0, 'chest-puff', 'Puffs his chest. A sparkle'], [2.8 + PRIMP, 'hearts', 'Dreamy eyes. Hearts float up'],
  [4.4 + PRIMP, 'cow-looks', 'She lifts her head, mid-chew'], [4.9 + PRIMP, 'eyes-huge', 'Her eyes go huge'], [5.3 + PRIMP, 'hop-turn', 'Hop-turn'],
  [5.6 + PRIMP, 'bolts', 'She bolts off screen, tail flying. His eyebrows waggle. Devious grin, a snort'],
  [6.6 + PRIMP, 'paws', 'Paws the ground'], [6.9 + PRIMP, 'charge', 'Charges after her, hearts trailing'], [9.0 + PRIMP, 'last-heart', 'One last heart floats... and pops'],
];
export const BULL_END = 9.95 + PRIMP;
export const COW_FRAC = 0.21, BULL_FRAC = 0.24;
/** How far left of the cow the bull stops, as a share of the screen's width (the reference: 0.3 and 0.66; a little closer here, to clear the biffy). */
export const BULL_GAP = 0.34;

// The forelock: curly until he slicks it back. The two shapes share one structure so they can blend.
const CURLY = [139, 36, 137, 29, 142, 29, 143, 25, 148, 27, 153, 25, 153, 30, 157, 31, 154, 36];
const SLICK = [139, 36, 132, 33, 127, 28, 136, 25, 144, 27, 150, 27, 152, 31, 155, 33, 154, 36];
export function forelock(k: number): string {
  const n = CURLY.map((c, i) => +lerp(c, SLICK[i], k).toFixed(2));
  return `M${n[0]} ${n[1]} Q${n[2]} ${n[3]} ${n[4]} ${n[5]} Q${n[6]} ${n[7]} ${n[8]} ${n[9]} Q${n[10]} ${n[11]} ${n[12]} ${n[13]} Q${n[14]} ${n[15]} ${n[16]} ${n[17]} Z`;
}
const SHUT = 'M143 43 L153 43 L153 50 Q148 53.6 143 50 Z', OPEN = 'M143 43 L153 43 L153 44 L143 44 Z';

/**
 * The pose at a time. `to`: where the cow bolts to and `from`/`charge`: where the bull walks in
 * from and charges out to, each in its own drawing's units (the reference's are 520, -420 and 620).
 */
export function bullPose(t: number, from = -420, to = 520, charge = 620): any {
  // After the primp the reference runs on, PRIMP seconds later.
  const r = t - PRIMP;
  const c: any = {x:0, y:0, face:-1, legs:0, gallop:false, head:-30, jaw:0, eye:4.4, pup:2.1, tail:Math.sin(t*3)*14, show:true, sy:1};
  const b: any = {x:from, y:0, face:1, legs:0, gallop:false, head:0, lid:OPEN, brow:'M142 41 Q148 38 155 40', mouth:'M142 70 Q146 72 150 71', pupX:0, tail:Math.sin(t*2.5)*10, show:true, sx:1, sy:1, hearts:0, snort:-1, scrape:0,
    slick: t < 3.35 ? 0 : 1, tongue:false, primp:null, sparkle:-1};
  // cow grazing, munching
  if (r < 4.4){ c.head = -32; c.jaw = Math.sin(t*10)*1.5; }
  else if (r < 4.9){ const k = ease(seg(r,4.4,4.75)); c.head = lerp(-32, 4, k); c.jaw = r < 4.6 ? Math.sin(t*10)*1.5 : 0; c.pup = 2.1; }
  else if (r < 5.3){ const k = ease(seg(r,4.9,5.1)); c.head = 6; c.eye = 4.4 + 3.2*k; c.pup = 2.1 - .9*k; c.y = -2*k; c.tail = -30; }
  else if (r < 5.6){ const k = seg(r,5.3,5.6); c.y = -Math.sin(k*Math.PI)*12; c.face = (k < .5 ? -1 : 1)*(1 - .2*Math.sin(k*Math.PI)); c.eye = 7.6; c.pup = 1.2; c.head = 6; c.sy = 1 + .08*Math.sin(k*Math.PI); }
  else if (r < 7.8){ const k = seg(r,5.6,7.8); c.face = 1; c.x = lerp(0, to, k*k*.3 + k*.7); c.gallop = true; c.legs = Math.sin(r*2*Math.PI*3.4); c.y = -Math.abs(Math.sin(r*2*Math.PI*3.4))*5; c.eye = 7.6; c.pup = 1.2; c.tail = -70 + Math.sin(r*30)*8; c.head = 8; }
  else c.show = false;
  // bull
  if (t < .3) b.x = from;
  else if (t < 2.4){ const k = seg(t,.3,2.4); b.x = lerp(from, 0, 1 - Math.pow(1-k,1.8)); b.legs = Math.sin(t*2*Math.PI*1.3); b.y = -Math.abs(Math.sin(t*2*Math.PI*1.3))*1.6; }
  else if (t < T_PRIMP){ b.x = 0; b.pupX = 1; b.lid = OPEN; b.brow = 'M142 39 Q148 36 155 38'; }
  else if (t < 3.35){                                       // primp 1: brings a hoof up and licks it, twice
    const k = seg(t,2.8,3.35), up = ease(clamp(k*4));
    b.x = 0; b.head = lerp(0, 9, up); b.pupX = 1.5; b.lid = 'M143 43 L153 43 L153 47 L143 47 Z'; b.brow = 'M142 40 Q148 38 155 40';
    const lick = Math.max(0, Math.sin(seg(k,.25,1)*Math.PI*4));
    b.primp = {a: lerp(0, -108, up) - lick*4, s: lerp(1, 1.22, up)}; b.tongue = k > .25 && lick > .15; b.mouth = 'M142 70 Q146 73 150 71';
  }
  else if (t < 4.0){                                        // primp 2: the leg stretches right up and slicks the forelock back, two strokes
    const k = seg(t,3.35,4.0), reach = ease(clamp(k*4)), stroke = Math.sin(seg(k,.2,.9)*Math.PI*2);
    b.x = 0; b.head = lerp(9, 4, reach); b.lid = SHUT; b.brow = 'M142 39 Q148 36.5 155 39'; b.mouth = 'M141 70 Q146 73.5 151 70';
    b.primp = {a: lerp(-108, -155, reach) - stroke*6, s: lerp(1.22, 2.35, reach) + stroke*.08};
    b.slick = ease(seg(k,.2,.9));
  }
  else if (t < T_PRIMP + PRIMP){                             // primp 3: hoof down, chest out, a sparkle off the slicked forelock
    const k = seg(t,4.0,4.6), down = ease(clamp(k*3.2)), puff = Math.sin(clamp((k-.2)/.8)*Math.PI);
    b.x = 0; b.primp = k < .32 ? {a: lerp(-155, 0, down), s: lerp(2.35, 1, down)} : null;
    b.sx = 1 + .06*puff; b.sy = 1 + .07*puff; b.head = lerp(4, -9, ease(clamp(k*2))); b.lid = SHUT; b.brow = 'M142 38 Q148 35 155 37.5'; b.mouth = 'M140 69 Q147 75 153 68';
    b.sparkle = seg(k,.3,1); b.tail = Math.sin(t*14)*16;
  }
  else if (r < 5.6){ b.x = 0; b.lid = 'M143 42 Q148 47 153 42 L153 49 L143 49 Z'; b.brow = 'M142 39 Q148 37 155 39'; b.mouth = 'M141 70 Q146 74 151 70'; b.head = -4 + Math.sin(r*2)*2; b.hearts = 1; b.tail = Math.sin(r*6)*22; }
  else if (r < 6.6){ b.x = 0; const w = Math.sin(r*2*Math.PI*4); b.brow = `M142 ${38 - w*3} Q148 ${35 - w*3} 155 ${37 - w*3}`;           // eyebrow waggle
    b.lid = 'M143 44 L153 45 L153 47 L143 46 Z'; b.mouth = 'M140 69 Q147 75 153 68'; b.pupX = 2; b.hearts = 1 - seg(r,5.6,6.2); b.snort = seg(r,6.0,6.6); }
  else if (r < 6.9){ b.x = 0; b.scrape = Math.sin(seg(r,6.6,6.9)*Math.PI*3); b.brow = 'M142 42 L155 39'; b.lid = 'M143 44 L153 45 L153 47 L143 46 Z'; b.mouth = 'M140 69 Q147 75 153 68'; b.sy = .95; }
  else if (r < 9.2){ const k = seg(r,6.9,9.2); b.x = lerp(0, charge, k*k*.45 + k*.55); b.gallop = true; b.legs = Math.sin(r*2*Math.PI*3.2); b.y = -Math.abs(Math.sin(r*2*Math.PI*3.2))*5;
    b.brow = 'M142 42 L155 39'; b.mouth = 'M140 69 Q147 75 153 68'; b.tail = 40 + Math.sin(r*25)*10; b.hearts = 2; }
  else b.show = false;
  return {c, b, r};
}

function quad(pp: Pup, a: number, gallop: boolean): void {
  const q = pp.q; const amp = gallop ? 38 : 22;
  const set = (sel: string, deg: number) => { const g = q(sel); const base = g.dataset.base ?? (g.dataset.base = g.getAttribute('transform')); g.setAttribute('transform', `${base} rotate(${deg})`); };
  set('.lFN', a*amp); set('.lBN', (gallop ? a : -a)*amp); set('.lFB', -a*amp*(gallop ? .6 : 1)); set('.lBB', (gallop ? -a : a)*amp*.8);
}
/** Poses the cow alone (she is permanent scenery: `still` is how she stands when nothing is happening). */
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
/** The cow at rest: grazing, quite still. */
export const COW_REST = { x: 0, y: 0, face: -1, legs: 0, gallop: false, head: -32, jaw: 0, eye: 4.4, pup: 2.1, tail: 0, show: true, sy: 1 };

function bullBody(B: Pup, b: any): void {
  const bq = B.q;
  bq('.flip').setAttribute('transform', `translate(85 0) scale(${b.face} 1) translate(-85 0)`);
  bq('.root').setAttribute('transform', `translate(0 ${b.y}) translate(85 114) scale(${b.sx} ${b.sy}) translate(-85 -114)`);
  bq('.head').setAttribute('transform', `rotate(${b.head} 124 50)`);
  bq('.lid').setAttribute('d', b.lid); bq('.brow').setAttribute('d', b.brow); bq('.mouth').setAttribute('d', b.mouth);
  bq('.pup').setAttribute('cx', 149.5 + b.pupX);
  bq('.tail').setAttribute('transform', `translate(28 58) rotate(${b.tail})`);
  quad(B, b.legs, b.gallop);
  if (b.scrape) bq('.lFN').setAttribute('transform', `translate(122 84) rotate(${-25 + b.scrape*30})`);
  // the primp: the near front leg comes up IN FRONT of his head, stretching like rubber
  bq('.forelock').setAttribute('d', forelock(b.slick)); bq('.shine').style.display = b.slick > .9 ? '' : 'none';
  bq('.tongue').style.display = b.tongue ? '' : 'none';
  bq('.lFN').style.visibility = b.primp ? 'hidden' : '';
  bq('.primpLeg').style.display = b.primp ? '' : 'none';
  if (b.primp) bq('.primpLeg').setAttribute('transform', `translate(122 84) rotate(${b.primp.a}) scale(1 ${b.primp.s})`);
}

/** One frame. `sc.cow` is the permanent cow, `sc.bull` the bull, `sc.ov` the overlay (hearts, snort, sparkle, dirt; the layer's px). */
export function bullApply(sc: any, P: any, t: number): void {
  const {c, b, r: rt} = P;
  cowApply(sc.cow, c);
  const B: Pup = sc.bull; const RB_ = place(B, b.x);
  B.svg.style.visibility = b.show ? 'visible' : 'hidden';
  bullBody(B, b);
  // hearts, snort, the final pop
  const u = RB_.u, r = RB_.r;
  const headPt = {x: B.spot.x*r.width + (150 - 85 + b.x)*u, y: B.spot.y*r.height + (30 - 114 + b.y)*u};
  let html = '';
  if (b.hearts === 1 || (b.hearts > 0 && b.hearts < 1)){
    for (let i = 0; i < 5; i++){ const life = ((rt*.55 + i/5) % 1);
      html += HEART(headPt.x + Math.sin(life*7 + i)*8*u, headPt.y - life*55*u, Math.max(.7, u*1.1)*(.7 + life*.6), (b.hearts === 1 ? 1 : b.hearts)*(life < .8 ? 1 : (1-life)*5)); } }
  if (b.hearts === 2){ for (let i = 0; i < 3; i++){ const life = ((rt*1.2 + i/3) % 1);
      html += HEART(headPt.x - 40*u - life*70*u, headPt.y + 10*u - life*22*u, Math.max(.6, u)*(.8 + life*.4), 1 - life); } }
  if (b.snort >= 0 && b.snort < 1){ const nx = B.spot.x*r.width + (166 - 85)*u, ny = B.spot.y*r.height + (66 - 114)*u, k = b.snort;
    html += `<circle cx="${nx + k*14*u}" cy="${ny + k*3*u}" r="${(2 + k*5)*u}" fill="#eef3f8" stroke="${O}" stroke-width="1" opacity="${1-k}"/>`; }
  if (b.sparkle >= 0 && b.sparkle < 1){ const k = b.sparkle, sx = B.spot.x*r.width + (139 - 85)*u, sy = B.spot.y*r.height + (20 - 114)*u, s = Math.sin(k*Math.PI)*Math.max(1, u*1.7);
    html += `<path transform="translate(${sx} ${sy}) rotate(${k*90}) scale(${s})" d="M0 -8 L1.8 -1.8 L8 0 L1.8 1.8 L0 8 L-1.8 1.8 L-8 0 L-1.8 -1.8 Z" fill="#fff7c2" stroke="${O}" stroke-width="1.3" stroke-linejoin="round" vector-effect="non-scaling-stroke"/>`; }
  if (rt > 9.0 && rt < 9.9){ const k = seg(rt,9.0,9.6), px = sc.popX ?? r.width*.5, py = B.spot.y*r.height - 70*u - k*30*u;
    if (rt < 9.6) html += HEART(px, py, Math.max(.8, u*1.3)*(1 + k*.3), 1);
    else { const k2 = seg(rt,9.6,9.9); for (let i = 0; i < 6; i++){ const a = i/6*Math.PI*2; html += `<path d="M${px + Math.cos(a)*6*u*(1+k2*2)} ${py + Math.sin(a)*6*u*(1+k2*2) - 5*u} l${Math.cos(a)*3*u} ${Math.sin(a)*3*u}" stroke="#e3364b" stroke-width="${Math.max(1.4,u*1.8)}" stroke-linecap="round" opacity="${1-k2}"/>`; } } }
  if (b.scrape){ const fx = B.spot.x*r.width + (122 - 85)*u, fy = B.spot.y*r.height; html += `<circle cx="${fx - 14*u}" cy="${fy - 3*u}" r="${(3 + Math.abs(b.scrape)*3)*u}" fill="#8a6b46" stroke="${O}" stroke-width="1" opacity=".8"/>`; }
  if (sc.ovHtml !== html) sc.ov.innerHTML = sc.ovHtml = html;
  void t;
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
  const t = 3.6 + PRIMP;
  bullBody(bull, bullPose(t).b);
  bull.svg.insertAdjacentHTML('beforeend', [[150, 16, 1.1], [160, -2, 1.4], [142, -16, 0.9]].map(([x, y, s]) => HEART(x, y, s, 1)).join(''));
  bull.svg.removeAttribute('style');
  bull.svg.setAttribute('class', 'egg-still bull-still');
  bull.svg.setAttribute('viewBox', '14 -30 164 150');
  return bull.svg.outerHTML;
}

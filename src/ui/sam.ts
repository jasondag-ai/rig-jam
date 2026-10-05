// Gag 14, Safety Sam, as a code puppet ported from the approved reference
// (~/Desktop/RHR Art Inbox/safety_sam_reference.html): the same drawing, poses and timing. Sam is
// the worker's build in the safety advisor's kit (white hat, navy coveralls, hi-vis vest,
// moustache). He marches in with his clipboard under his arm, stops dead, looks up at the pad,
// shakes his head slowly ("tsk"), scribbles furiously, turns the clipboard round (SEE ME), two
// fingers to his eyes, then points at you, and backs off screen still pointing (walking backwards
// is the joke here, an intentional exception to the rule). strip-gags.ts puts him on screen.
/* eslint-disable */
import { makePup, place, type Pup } from './puppet-stage.ts';
import { WORKER, WORKER_FRAC } from './worker.ts';
const O = '#2b1e16';
const ease = (x: number) => (x < 0.5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2);
const clamp = (x: number, a = 0, b = 1) => Math.max(a, Math.min(b, x));
const seg = (t: number, a: number, b: number) => clamp((t - a) / (b - a));
const lerp = (a: number, b: number, k: number) => a + (b - a) * k;
const RED='#c8352b', RED2='#a3281f', STRIPE='#d5dbe2', GLOVE='#e0a43a', HAT='#f2c230', HAT2='#fde27a';
// The worker's build alone (worker.ts carries his pail and his long reach in front of it).
const BUILD = WORKER.slice(WORKER.indexOf('<g class="flip">'));

/* ---------------- Safety Sam: the worker's build, safety advisor's kit ---------------- */
const NAVY = '#35507a', NAVY2 = '#283e60', VEST = '#c9e24a', VEST2 = '#a9c234', WHITE = '#f3f5f7';
let SAM = BUILD.replaceAll(RED2, NAVY2).replaceAll(RED, NAVY).replaceAll(HAT2, '#ffffff').replaceAll(HAT, WHITE)
  .replace('M48 39 Q50 54 64 54 Q77 54 79 40 Q73 46 64 46 Q55 46 48 39 Z', 'M60 46 Q63 41.5 69 42.5 Q74 41.5 79 45 Q80 48 77 48.5 Q73 46 69 46.5 Q64 47.5 60 46 Z')   // moustache instead of beard
  .replace('class="brow" d="M65 24.5 Q70 22.5 76 24.5" stroke="#7a4f2e"', 'class="brow" d="M65 24.5 Q70 22.5 76 24.5" stroke="#5a4636"');
SAM = SAM.replace('<g class="torso">', `<g class="torso">`).replace(`<rect x="45.5" y="64" width="31" height="4.5" fill="${STRIPE}" stroke="${O}" stroke-width="1.4"/>`,
  `<path d="M46 54 Q46 49 52 49 L70 49 Q76 49 76 54 L76 79 Q70 83 61 83 Q51 83 46 79 Z" fill="${VEST}" stroke="${O}" stroke-width="2.4"/>
   <rect x="46.5" y="62" width="29" height="4" fill="#e9eef2" stroke="${O}" stroke-width="1.3"/><rect x="46.5" y="71" width="29" height="4" fill="#e9eef2" stroke="${O}" stroke-width="1.3"/>
   <path d="M61 49 L61 83" stroke="${VEST2}" stroke-width="2"/>`);
SAM = SAM.replace('<rect x="66" y="52" width="7" height="8" rx="1.5" fill="#ffffff"', '<rect x="66" y="52" width="7" height="8" rx="1.5" fill="#ffffff"');
// pen in the front hand, two "I'm watching you" fingers, clipboard slot just under the front arm
const PEN = `<g class="pen"><rect x="-1.2" y="6" width="2.4" height="12" rx="1" fill="#e8661c" stroke="${O}" stroke-width="1.2" transform="rotate(25 0 13)"/></g>
  <g class="vee" style="display:none"><rect x="-4.2" y="13" width="3.6" height="10" rx="1.8" fill="${GLOVE}" stroke="${O}" stroke-width="1.8" transform="rotate(-12 -2.4 14)"/><rect x=".8" y="13" width="3.6" height="10" rx="1.8" fill="${GLOVE}" stroke="${O}" stroke-width="1.8" transform="rotate(12 2.6 14)"/></g>`;
const BOARD_SIDE = `<g class="clip-side"><rect x="-3" y="-15" width="6" height="30" rx="1.5" fill="#b58a55" stroke="${O}" stroke-width="2" /><rect x="-1" y="-13" width="3" height="26" fill="#fbfaf4"/><rect x="-3.6" y="-17" width="5" height="5" rx="1" fill="#9aa1aa" stroke="${O}" stroke-width="1.5"/></g>`;
const BOARD_FRONT = `<g class="clip-front" style="display:none"><rect x="-13" y="-17" width="26" height="34" rx="2" fill="#b58a55" stroke="${O}" stroke-width="2.2"/><rect x="-10.5" y="-13" width="21" height="27.5" fill="#fbfaf4" stroke="${O}" stroke-width="1.2"/>
  <rect x="-5" y="-19" width="10" height="5" rx="1.4" fill="#9aa1aa" stroke="${O}" stroke-width="1.6"/>
  <path d="M-8 -9 L6 -9 M-8 -6 L3 -6" stroke="#9aa1aa" stroke-width="1.2"/>
  <g class="see"><text x="0" y="5" text-anchor="middle" font-family="'Permanent Marker', 'Fredoka', sans-serif" font-size="8.6" fill="#d23a2a" transform="rotate(-6)">SEE</text>
  <text x="0" y="12.5" text-anchor="middle" font-family="'Permanent Marker', 'Fredoka', sans-serif" font-size="8.6" fill="#d23a2a" transform="rotate(-6)">ME</text></g></g>`;
SAM = SAM.replace('<g class="armF"', `<g class="clipboard">${BOARD_SIDE}${BOARD_FRONT}</g><g class="armF"`);
export { SAM };

export const SAM_BEATS: [number, string, string][] = [
  [0, 'bad-moves', 'Bad moves pile up on the pad'], [0.3, 'march-in', 'Safety Sam marches in, clipboard tucked under his arm'], [2.0, 'looks-up', 'Stops dead. Looks up at the pad'],
  [2.5, 'tsk', 'Slow, disappointed head shake. "tsk tsk"'], [3.8, 'scribble', 'Scribbles furiously on the clipboard'], [5.2, 'see-me', 'Turns the clipboard around: SEE ME'],
  [6.5, 'fingers-to-eyes', 'Two fingers to his eyes...'], [7.1, 'points', '...then points at you'], [7.8, 'backs-off', 'Backs off screen slowly, still pointing, never breaking eye contact'],
];
export const SAM_END = 10.7;
/** Where he stops across the screen (a share of its width), as in the reference. */
export const SAM_X = 0.5;

/** The pose at a time. `from`: where he marches in from, `out`: where he backs off to, in his own units (the reference's are -260 and -280). */
export function samPose(t: number, from = -260, out = -280): any {
  const w: any = {x:0, y:0, rot:0, dx:from, thB:0,thF:0,shB:0,shF:0, arB:-30,arF:10,foF:-10,foB:-70, head:0, hatY:0,
    px:71.5,py:33.5, lid:'M65 28 L75 28 L75 29 L65 29 Z', brow:'M65 24.5 Q70 22.5 76 24.5', mouth:'M64 49.5 Q68 50 72 49.5', show:true,
    board:'tuck', pen:true, vee:false, tsk:false};
  const walk = (o: any, speed: number, amp: number, dir = 1) => { const c = Math.sin(t*2*Math.PI*speed)*dir;
    o.thB = c*amp; o.thF = -c*amp; o.shB = Math.max(0,-c)*amp*.9; o.shF = Math.max(0,c)*amp*.9; o.arF = o.board === 'tuck' && !o.vee ? 6 : c*amp*.7;
    o.y = -Math.abs(Math.cos(t*2*Math.PI*speed))*2.2; o.hatY = -Math.abs(Math.cos(t*2*Math.PI*speed - .6))*1.2; };
  const stern = (o: any) => { o.brow = 'M65 26.5 Q70 23.5 76 25'; o.lid = 'M65 28 L75 28 L75 30.5 L65 30.5 Z'; o.mouth = 'M64 49.5 L72 49.5'; };
  if (t < .3){ w.show = false; }
  else if (t < 2.0){ const k = seg(t,.3,2.0); w.dx = lerp(from, 0, 1 - Math.pow(1-k,1.3)); walk(w, 2.0, 28); stern(w); }          // brisk march
  else if (t < 2.5){ const k = seg(t,2.0,2.5); w.dx = 0; w.rot = Math.sin(k*Math.PI)*-3; w.head = -10*ease(clamp(k*2)); w.px = 72.5; w.py = 30.5; stern(w); w.brow = 'M65 24.5 Q70 22.5 76 24.5'; }   // halts, looks up
  else if (t < 3.8){ const k = seg(t,2.5,3.8); w.dx = 0; stern(w); w.head = -8 + Math.sin(k*Math.PI*3)*7; w.px = 71.5 + Math.sin(k*Math.PI*3)*1.6; w.py = 31; w.tsk = true; }   // slow head shake
  else if (t < 5.2){ w.dx = 0; stern(w); w.board = 'write'; w.head = 10; w.px = 72.6; w.py = 36; const j = Math.sin(t*55), j2 = Math.sin(t*19);
    w.arB = -40; w.foB = -62; w.arF = -42 + j2*5; w.foF = -70 + j*9; w.brow = 'M65 27 Q70 24 76 26'; w.mouth = t % .5 < .25 ? 'M64 49 Q68 47.5 72 49' : 'M64 49.5 Q68 51 72 49.5'; }   // scribbles
  else if (t < 6.5){ const k = ease(seg(t,5.2,5.5)); w.dx = 0; w.board = 'show'; w.arB = -62; w.foB = -55; w.arF = lerp(-58, 8, k); w.foF = lerp(-62, -8, k); w.head = 0; w.px = 74.2; w.py = 33.5;
    w.brow = 'M65 23 Q70 20 76 22'; w.lid = 'M65 28 L75 28 L75 30 L65 30 Z'; w.mouth = 'M64 49.5 Q68 48.5 72 49.5'; }   // SEE ME, eyebrow up
  else if (t < 7.1){ const k = ease(seg(t,6.5,6.75)); w.dx = 0; w.board = 'tuck'; w.pen = false; w.vee = true; w.arF = lerp(8, -150, k); w.foF = lerp(-8, -45, k); w.px = 74.2; w.py = 33.5; stern(w); }   // fingers to his eyes
  else if (t < 7.8){ const k = ease(seg(t,7.1,7.3)); w.dx = 0; w.board = 'tuck'; w.pen = false; w.vee = true; w.arF = lerp(-150, -95, k); w.foF = lerp(-45, -5, k); w.px = 74.2; w.py = 33.5; stern(w); }   // ...at you
  else if (t < 10.6){ const k = seg(t,7.8,10.6); w.dx = lerp(0, out, k*k*.4 + k*.6); walk(w, 1.2, 18, -1); w.board = 'tuck'; w.pen = false; w.vee = true; w.arF = -95; w.foF = -5; w.px = 74.2; w.py = 33.5; stern(w); }   // backs off, still pointing
  else w.show = false;
  return {w};
}

/** His back glove, in the drawing's units: the clipboard hangs from it. (The reference reads this off the screen; this is the same point by arithmetic.) */
export function backGlove(p: any): { x: number; y: number } {
  const a = (p.arB * Math.PI) / 180, b = ((p.arB + p.foB) * Math.PI) / 180, r = (p.rot * Math.PI) / 180;
  const x = 52 - 12 * Math.sin(a) - 13 * Math.sin(b), y = 56 + 12 * Math.cos(a) + 13 * Math.cos(b);
  // the body's lean, about his feet (60, 108), then its shift
  const dx = x - 60, dy = y - 108;
  return { x: 60 + dx * Math.cos(r) - dy * Math.sin(r) + p.x, y: 108 + dx * Math.sin(r) + dy * Math.cos(r) + p.y };
}

export function samApply(b: Pup, p: any): void {
  const q = b.q;
  q('.flip').style.visibility = p.show ? 'visible' : 'hidden';
  const body = `translate(${p.x} ${p.y}) rotate(${p.rot} 60 108)`;
  ['.legB','.armB','.torso','.legF','.head','.armF','.clipboard'].forEach(sel => {
    const g = q(sel); const base = g.dataset.base ?? (g.dataset.base = g.getAttribute('transform') || '');
    let extra = '';
    if (sel === '.head') extra = ` rotate(${p.head} 62 50)`;
    if (sel === '.legB') extra = ` rotate(${p.thB})`; if (sel === '.legF') extra = ` rotate(${p.thF})`;
    if (sel === '.armB') extra = ` rotate(${p.arB})`; if (sel === '.armF') extra = ` rotate(${p.arF})`;
    if (sel !== '.clipboard') g.setAttribute('transform', `${body} ${base}${extra}`);
  });
  q('.legB .shin').setAttribute('transform', `translate(0 14) rotate(${p.shB})`); q('.legF .shin').setAttribute('transform', `translate(0 14) rotate(${p.shF})`);
  q('.armB .fore').setAttribute('transform', `translate(0 12) rotate(${p.foB})`); q('.armF .fore').setAttribute('transform', `translate(0 12) rotate(${p.foF})`);
  q('.hat').setAttribute('transform', `translate(0 ${p.hatY})`);
  q('.pupil').setAttribute('cx', p.px); q('.pupil').setAttribute('cy', p.py);
  q('.lid').setAttribute('d', p.lid); q('.brow').setAttribute('d', p.brow);
  q('.mouth').setAttribute('d', p.mouth); q('.mouth').setAttribute('fill', p.mouth.includes('Z') ? '#7a2a22' : 'none');
  q('.pen').style.display = p.pen ? '' : 'none'; q('.vee').style.display = p.vee ? '' : 'none';
  q('.armF .fore circle').style.display = p.vee ? 'none' : '';
  // clipboard: tucked under the arm, held at the back hand to write, or shown to us at the chest
  const cb = q('.clipboard');
  q('.clip-side').style.display = 'none'; q('.clip-front').style.display = ''; q('.see').style.display = p.board === 'show' ? '' : 'none';
  const { x: gx, y: gy } = backGlove(p);
  if (p.board === 'tuck') cb.setAttribute('transform', `translate(${gx + 3} ${gy + 2}) rotate(-8) scale(.6)`);
  else if (p.board === 'write') cb.setAttribute('transform', `translate(${gx + 8} ${gy - 4}) rotate(-24) scale(.78)`);
  else cb.setAttribute('transform', `translate(${gx + 10} ${gy - 6}) scale(1.05)`);
}

/** Sam and his overlay ("tsk", the scribble marks) on a layer. */
export function samScene(layer: HTMLElement, spot: { x: number; y: number }, scale: number): any {
  const sam = makePup(layer, SAM, { vw: 120, vh: 120, ax: 60, ay: 108, frac: WORKER_FRAC * scale, spot });
  sam.q('.armF .fore').insertAdjacentHTML('beforeend', PEN);
  const ov = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  ov.setAttribute('class', 'pup-overlay');
  layer.appendChild(ov);
  return { sam, ov };
}

export function samFrame(sc: any, P: any, t: number): void {
  const {w} = P;
  const r = sc.sam.host.getBoundingClientRect(), u = sc.sam.frac*r.width/120;
  place(sc.sam, w.dx); samApply(sc.sam, w);
  let html = '';
  if (w.tsk){ const k = (t - 2.5) % .65 / .65, s = Math.max(11, 9*u);
    const hx = sc.sam.spot.x*r.width + (w.dx + 18)*u, hy = sc.sam.spot.y*r.height - 112*u;
    html += `<text x="${hx}" y="${hy - k*6*u}" font-family="Fredoka, sans-serif" font-weight="700" font-size="${s}" fill="#fff" stroke="${O}" stroke-width="${s*.22}" paint-order="stroke" opacity="${1 - k*.6}">tsk</text>`; }
  if (w.board === 'write'){ for (let i = 0; i < 3; i++){ const k = ((t*2.2 + i/3) % 1); const hx = sc.sam.spot.x*r.width + (w.dx + 30 + i*6)*u, hy = sc.sam.spot.y*r.height - (72 + k*26)*u;
    html += `<path d="M${hx} ${hy} q${3*u} ${-3*u} ${6*u} 0 t${6*u} 0" stroke="${O}" stroke-width="${Math.max(1, 1.4*u)}" fill="none" opacity="${1-k}" stroke-linecap="round"/>`; } }   // scribble marks fly off
  if (sc.ovHtml !== html) sc.ov.innerHTML = sc.ovHtml = html;
}

/** Wildlife Log card art: SEE ME. */
export function samStill(): string {
  const host = document.createElement('div');
  const sc = samScene(host, { x: 0, y: 0 }, 1);
  samApply(sc.sam, samPose(5.8).w);
  const svg: SVGSVGElement = sc.sam.svg;
  svg.removeAttribute('style');
  svg.setAttribute('class', 'egg-still sam-still');
  svg.setAttribute('viewBox', '14 2 96 112');
  return svg.outerHTML;
}

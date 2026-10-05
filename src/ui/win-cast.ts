// The win card's two characters as flat puppet stills in the worker's build and outline (the same
// drawing as every gag: worker.ts), one expression per result. No sprites.
//  - The mascot is the worker himself: arms up and a big grin at par, a thumbs-up when close, a
//    sheepish look (and a bead of sweat) when well over.
//  - The Company Man is the same build in a white hard hat, a light blue button shirt and khaki
//    pants, a travel mug in his hand and no vest: pleased at par, unmoved when close, a scowl when over.
import type { Tier } from './gags.ts';
import { wApplyBasic } from './marshmallow.ts';
import { makePup } from './puppet-stage.ts';
import { WORKER } from './worker.ts';

const O = '#2b1e16';
const RED = '#c8352b', RED2 = '#a3281f', STRIPE = '#d5dbe2', GLOVE = '#e0a43a', HAT = '#f2c230', HAT2 = '#fde27a', BEARD = '#7a4f2e', SKIN = '#f0c09a';
const SHIRT = '#a9cdea', SHIRT2 = '#8fb6d8', CUFF = '#cfe3f3', KHAKI = '#c8b382', KHAKI2 = '#b39d6c', GREY = '#8d9299';
// The worker's build alone (worker.ts carries his pail and his long reach in front of it).
const BUILD = WORKER.slice(WORKER.indexOf('<g class="flip">'));

/** The Company Man: the worker's build, part by part, in his own clothes. */
function companyBuild(): string {
  // Cut the drawing into its parts so the legs and the arms can wear different colours.
  const marks = ['<g class="legB"', '<g class="armB"', '<g class="torso">', '<g class="legF"', '<g class="head">', '<g class="armF"'];
  const at = marks.map((m) => BUILD.indexOf(m));
  const part = (i: number) => BUILD.slice(at[i], i + 1 < at.length ? at[i + 1] : BUILD.length);
  const legs = (s: string) => s.replaceAll(RED, KHAKI).replaceAll(STRIPE, KHAKI2);
  const arms = (s: string) => s.replaceAll(RED, SHIRT).replaceAll(STRIPE, CUFF).replaceAll(GLOVE, SKIN);
  const torso = part(2)
    .replaceAll(RED2, SHIRT2)
    .replaceAll(RED, SHIRT)
    // no reflective stripe and no vest: a button placket, three buttons, a collar and a chest pocket
    .replace(`<rect x="45.5" y="64" width="31" height="4.5" fill="${STRIPE}" stroke="${O}" stroke-width="1.4"/>`, `<path d="M64 50 L64 82" stroke="${SHIRT2}" stroke-width="2"/><g fill="#ffffff" stroke="${O}" stroke-width="1"><circle cx="64" cy="57" r="1.5"/><circle cx="64" cy="65" r="1.5"/><circle cx="64" cy="73" r="1.5"/></g><path d="M56 49 L64 55 L72 49" fill="${CUFF}" stroke="${O}" stroke-width="1.8" stroke-linejoin="round"/>`)
    .replace(`<rect x="66" y="52" width="7" height="8" rx="1.5" fill="#f2c230" stroke="${O}" stroke-width="1.6"/>`, `<rect x="67.5" y="58" width="7" height="7" rx="1.2" fill="${SHIRT2}" stroke="${O}" stroke-width="1.3"/>`)
    .replace(`<path d="M50 50 Q54 47 58 52" stroke="#e05a4e" stroke-width="2.5" fill="none" stroke-linecap="round"/>`, '');
  const head = part(4)
    .replaceAll(HAT2, '#ffffff')
    .replaceAll(HAT, '#f3f5f7')
    // clean shaven, greying: a jaw line where the beard was, grey brows, a tuft of grey under the hat
    .replace(/<path d="M48 39 Q50 54 64 54[^>]*>/, `<path d="M50 44 Q54 52 64 53 Q74 53 77 45" stroke="#d9a07a" stroke-width="2" fill="none" stroke-linecap="round"/><path d="M47.5 29 Q46 35 49.5 39 L52.5 33 Z" fill="${GREY}" stroke="${O}" stroke-width="1.6" stroke-linejoin="round"/>`)
    .replace(`stroke="${BEARD}" stroke-width="2.8"`, `stroke="${GREY}" stroke-width="2.8"`);
  return BUILD.slice(0, at[0]) + legs(part(0)) + arms(part(1)) + torso + legs(part(3)) + head + arms(part(5));
}
const MUG = `<g class="mug"><path d="M5 14 Q11 14 11 19 Q11 23 5 23" fill="none" stroke="${O}" stroke-width="2.2"/><rect x="-6" y="10" width="11" height="15" rx="2.2" fill="#2f6f8f" stroke="${O}" stroke-width="1.8"/><rect x="-6" y="14" width="11" height="3" fill="#bfc6cd" stroke="${O}" stroke-width="1"/><rect x="-6.6" y="7.6" width="12.2" height="3.6" rx="1.4" fill="#22303a" stroke="${O}" stroke-width="1.5"/></g>`;

const NEUTRAL = { x: 0, y: 0, rot: 0, sx: 1, sy: 1, thB: 0, thF: 0, shB: 0, shF: 0, arB: 0, arF: 0, foF: -10, foB: -10, head: 0, hatY: 0, hatR: 0, px: 71.5, py: 33.5, lid: 'M65 28 L75 28 L75 29 L65 29 Z', brow: 'M65 24.5 Q70 22.5 76 24.5', mouth: 'M64 47 Q68 48.5 72 47', show: true };

/** The worker's pose for each result. */
export const MASCOT_POSE: Record<Tier, object> = {
  // Both arms thrown up (one ahead of him, one behind: he is drawn side on), a little off his feet, a big grin, his hat jumping.
  par: { ...NEUTRAL, y: -4, arF: -128, foF: -14, arB: 150, foB: 16, thF: -10, thB: 12, shB: 22, hatY: -3, hatR: -6, brow: 'M65 21.5 Q70 19 76 21.5', lid: 'M65 30 Q70 26 75 30 L75 36 L65 36 Z', mouth: 'M63 45.5 Q68 53 73 45.5 Z' },
  // A thumbs-up and a smile.
  close: { ...NEUTRAL, arF: -62, foF: -74, arB: 6, brow: 'M65 23 Q70 21 76 23', mouth: 'M64 46.5 Q68 50 72 46.5', px: 73, thumb: true },
  // Sheepish: a hand behind his head, eyes aside, a flat little mouth, a bead of sweat.
  over: { ...NEUTRAL, arB: -150, foB: -118, arF: 8, head: 5, px: 67.5, py: 35, brow: 'M65 23.5 Q70 23.5 76 26', lid: 'M65 28 L75 28 L75 30.5 L65 30.5 Z', mouth: 'M65 48 Q68 47 71 48', sweat: true },
};
/** The Company Man's face (and what he does with his mug) for each result. */
export const COMPANY_POSE: Record<Tier, object> = {
  // Pleased: brows up, a smile, the mug raised to you.
  par: { ...NEUTRAL, arF: -52, foF: -86, head: -3, brow: 'M65 22.5 Q70 20 76 22.5', lid: 'M65 30 Q70 26.5 75 30 L75 36 L65 36 Z', mouth: 'M64 46.5 Q68 51 72 46.5' },
  // Unmoved: one brow up, a level mouth, the mug held where it was.
  close: { ...NEUTRAL, arF: -40, foF: -76, px: 73, brow: 'M65 25.5 Q70 22 76 22.5', lid: 'M65 28 L75 28 L75 30 L65 30 Z', mouth: 'M64 48 Q68 48.6 72 48' },
  // A scowl over the top of the mug.
  over: { ...NEUTRAL, arF: -40, foF: -76, head: 4, px: 72.5, py: 34.5, brow: 'M65 27.5 L76 23.5', lid: 'M65 27 L75 25 L75 29 L65 30 Z', mouth: 'M64 49.5 Q68 46.5 72 49.5' },
};

function still(markup: string, pose: any, cls: string, box: string, extra: (svg: SVGSVGElement) => void = () => undefined): SVGSVGElement {
  const host = document.createElement('div');
  const p = makePup(host, markup, { vw: 120, vh: 120, ax: 60, ay: 108, frac: 1, spot: { x: 0, y: 0 } });
  for (const part of ['.pail', '.reach']) (p.q(part) as SVGElement | null)?.setAttribute('style', 'display:none');
  extra(p.svg);
  wApplyBasic(p, pose);
  p.svg.removeAttribute('style');
  p.svg.setAttribute('class', `win-still ${cls}`);
  p.svg.setAttribute('viewBox', box);
  p.svg.dataset.tier = pose.tier ?? '';
  return p.svg;
}

/** The mascot (the worker, whole figure) for a result. */
export function mascotStill(tier: Tier): SVGSVGElement {
  const pose: any = { ...MASCOT_POSE[tier], tier };
  return still(BUILD, pose, 'mascot-still', '22 -2 82 116', (svg) => {
    // A thumb on his front glove, and a bead of sweat by his brow, for the poses that want them.
    if (pose.thumb) svg.querySelector('.armF .fore')!.insertAdjacentHTML('beforeend', `<rect x="-2" y="15" width="4" height="8" rx="2" fill="${GLOVE}" stroke="${O}" stroke-width="1.8"/>`);
    if (pose.sweat) svg.querySelector('.head')!.insertAdjacentHTML('beforeend', `<path d="M83 22 Q86.5 27 83 30 Q79.5 27 83 22 Z" fill="#9fd3f2" stroke="${O}" stroke-width="1.2"/>`);
  });
}

/** The Company Man (head and shoulders, mug in hand) for a result. */
export function companyStill(tier: Tier): SVGSVGElement {
  const pose: any = { ...COMPANY_POSE[tier], tier };
  return still(companyBuild(), pose, 'company-still', '37 7 62 62', (svg) => {
    // The mug stays upright in his hand whatever his arm is doing.
    svg.querySelector('.armF .fore')!.insertAdjacentHTML('beforeend', MUG);
    svg.querySelector('.mug')!.setAttribute('transform', `rotate(${-(pose.arF + pose.foF)} 0 13)`);
  });
}

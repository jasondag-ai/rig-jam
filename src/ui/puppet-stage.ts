// The little stage every strip gag is built on: the approved reference files' own helpers, so their
// poses and timelines port as written. A puppet is an inline SVG of any viewBox, anchored at
// (ax, ay), sized as a share of its host's width and placed at a spot given in shares of the host's
// size. In the game the host is a layer the size of the whole game screen.
export interface PupOptions {
  vw: number;
  vh: number;
  ax: number;
  ay: number;
  /** Width as a share of the host's width. */
  frac: number;
  /** Where the anchor stands, as shares of the host's width and height. */
  spot: { x: number; y: number };
}
export interface Pup extends PupOptions {
  svg: SVGSVGElement;
  host: HTMLElement;
  parent: HTMLElement;
  q: (selector: string) => any;
}

export function makePup(host: HTMLElement, markup: string, o: PupOptions): Pup {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', `0 0 ${o.vw} ${o.vh}`);
  svg.setAttribute('class', 'pup');
  svg.setAttribute('aria-hidden', 'true');
  svg.innerHTML = markup;
  host.appendChild(svg);
  return Object.assign({ svg, host, parent: host, q: (s: string) => svg.querySelector(s) }, o);
}

/**
 * THE DEPTH RULE (STANDING_RULES 1): everything in the bottom strip, scenery, props and gag
 * characters alike, is one child (a UNIT) of the game screen's `.depth-strip`, and a unit's
 * z-index IS its ground line in px down the screen: what stands lower draws in front, what stands
 * higher draws behind; equal ground lines keep the order they were put on screen. This sets the
 * ground line of the unit `el` belongs to. `max`: the lowest ground line of anything in the unit
 * (a gag layer with several puppets); `set`: exactly this.
 */
export function setGround(el: Element | null, y: number, how: 'max' | 'set' = 'max'): void {
  const strip = el?.closest('.depth-strip');
  if (!el || !strip || !Number.isFinite(y)) return;
  let unit = el as HTMLElement;
  while (unit.parentElement && unit.parentElement !== strip) unit = unit.parentElement;
  // (A unit laid out again at another size starts over: its old ground line means nothing there.)
  const size = `${strip.clientWidth}x${strip.clientHeight}`;
  const have = unit.dataset.groundAt === size ? Number(unit.dataset.ground) : NaN;
  const ground = Math.round(how === 'max' && Number.isFinite(have) ? Math.max(have, y) : y);
  if (unit.dataset.ground === String(ground) && unit.dataset.groundAt === size) return;
  unit.dataset.ground = String(ground);
  unit.dataset.groundAt = size;
  unit.style.zIndex = String(ground);
}

/** Sizes and places a puppet (shifted `dxUnits` of its own drawing units sideways). */
export function place(p: Pup, dxUnits = 0): { r: DOMRect; w: number; u: number } {
  const r = p.host.getBoundingClientRect();
  const w = p.frac * r.width;
  const h = (w * p.vh) / p.vw;
  const u = w / p.vw;
  p.svg.style.width = `${w}px`;
  p.svg.style.height = `${h}px`;
  p.svg.style.left = `${p.spot.x * r.width - p.ax * u + dxUnits * u}px`;
  p.svg.style.top = `${p.spot.y * r.height - p.ay * u}px`;
  // Its anchor stands on its ground line: that is its unit's depth. (`data-foot`: for the depth test.)
  const foot = String(Math.round(p.spot.y * r.height));
  if (p.svg.dataset.foot !== foot) p.svg.dataset.foot = foot;
  setGround(p.host, p.spot.y * r.height);
  return { r, w, u };
}

/** A CAMERA FLASH (Job Y): a quick, soft-edged burst of white over the WHOLE game screen, brightest at the camera (`at`, px in `host`), about 150 ms. `host` is a layer over the lease. (It used to light the bottom strip only, which read as a hard-edged box.) No flash with reduced motion (style.css). */
export const FLASH_S = 0.15;
export function camFlash(host: HTMLElement, at: { x: number; y: number }): HTMLElement {
  const el = addEl(host, 'pup-flash');
  const r = host.getBoundingClientRect();
  el.style.setProperty('--fx', `${r.width ? (at.x / r.width) * 100 : 50}%`);
  el.style.setProperty('--fy', `${r.height ? (at.y / r.height) * 100 : 80}%`);
  return el;
}

export function addEl(host: HTMLElement, cls: string, html = ''): HTMLElement {
  const d = document.createElement('div');
  d.className = cls;
  d.innerHTML = html;
  host.appendChild(d);
  return d;
}

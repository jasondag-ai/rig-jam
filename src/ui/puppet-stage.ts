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
  return { r, w, u };
}

export function addEl(host: HTMLElement, cls: string, html = ''): HTMLElement {
  const d = document.createElement('div');
  d.className = cls;
  d.innerHTML = html;
  host.appendChild(d);
  return d;
}

// Puppet rigs for the characters. Each moving part of a drawing is a group marked
// `data-j="name" data-p="px py"`: its joint name and pivot point in the drawing's own units.
// GSAP tweens plain numbers on each joint (x, y, rot, sx, sy); the rig writes them out as SVG
// transforms about the pivot on every animation frame. Joints nest, so a forearm swings with
// the upper arm, a paw with the forearm, and so on.
import { gsap } from 'gsap';

export interface Joint {
  el: SVGGElement;
  /** Pivot, in the part's own drawing units. */
  px: number;
  py: number;
  /** Offset, rotation (degrees, clockwise) and scale about the pivot. */
  x: number;
  y: number;
  rot: number;
  sx: number;
  sy: number;
}

/** The SVG transform for a joint: scale and rotate about its pivot, then offset. */
export function jointTransform(j: Pick<Joint, 'px' | 'py' | 'x' | 'y' | 'rot' | 'sx' | 'sy'>): string {
  const r = (v: number) => Math.round(v * 1000) / 1000;
  return `translate(${r(j.x + j.px)} ${r(j.y + j.py)}) rotate(${r(j.rot)}) scale(${r(j.sx)} ${r(j.sy)}) translate(${r(-j.px)} ${r(-j.py)})`;
}

/** Joint names and pivots in a drawing's markup, in document order. */
export function jointsIn(svg: string): { name: string; px: number; py: number }[] {
  return [...svg.matchAll(/data-j="([\w-]+)"\s+data-p="(-?[\d.]+) (-?[\d.]+)"/g)].map((m) => ({ name: m[1], px: Number(m[2]), py: Number(m[3]) }));
}

export class Rig {
  readonly j: Record<string, Joint> = {};
  private readonly tick = () => this.render();

  constructor(root: Element) {
    root.querySelectorAll<SVGGElement>('[data-j]').forEach((el) => {
      const [px, py] = (el.dataset.p ?? '0 0').split(' ').map(Number);
      this.j[el.dataset.j!] = { el, px, py, x: 0, y: 0, rot: 0, sx: 1, sy: 1 };
    });
    this.render();
    gsap.ticker.add(this.tick);
  }

  /** A joint by name (throws on a typo, so rigs fail loudly in tests). */
  get(name: string): Joint {
    const joint = this.j[name];
    if (!joint) throw new Error(`no joint "${name}"`);
    return joint;
  }

  render(): void {
    for (const joint of Object.values(this.j)) joint.el.setAttribute('transform', jointTransform(joint));
  }

  /** Stop drawing (the character has left the stage). */
  destroy(): void {
    gsap.ticker.remove(this.tick);
    gsap.killTweensOf(Object.values(this.j));
  }
}

/** Shows exactly one of a set of alternative parts (eyes open / shut / popped, and so on). */
export function show(root: Element, group: string, which: string): void {
  root.querySelectorAll<SVGElement>(`[data-alt="${group}"]`).forEach((el) => {
    el.style.display = el.dataset.v === which ? '' : 'none';
  });
}

/** Moves an SVG part to a new parent without it jumping on screen (a paw picking something up). */
export function reparent(el: SVGGraphicsElement, parent: SVGGraphicsElement): void {
  const from = el.getCTM();
  const to = parent.getCTM();
  parent.appendChild(el);
  if (!from || !to) return;
  const svg = el.ownerSVGElement!;
  const m = to.inverse().multiply(from);
  el.transform.baseVal.initialize(svg.createSVGTransformFromMatrix(m));
}

/**
 * Plays GSAP timelines one after another for a scene, stopping cleanly if `signal` aborts (a new
 * level): `run` resolves when an animation completes, `hold` waits, `stop` kills anything left.
 */
export function sceneRunner(signal: AbortSignal) {
  const live = new Set<gsap.core.Animation>();
  const run = (t: gsap.core.Animation): Promise<void> =>
    new Promise((resolve, reject) => {
      if (signal.aborted) return (t.kill(), reject(new Error('aborted')));
      live.add(t);
      t.eventCallback('onComplete', () => (live.delete(t), resolve()));
      signal.addEventListener('abort', () => (t.kill(), reject(new Error('aborted'))), { once: true });
    });
  return {
    run,
    hold: (s: number) => run(gsap.delayedCall(s, () => {})),
    /** Keeps a looping animation (wing flaps, walk cycles) to kill at the end. */
    keep: <T extends gsap.core.Animation>(t: T): T => (live.add(t), t),
    stop: () => live.forEach((t) => t.kill()),
  };
}

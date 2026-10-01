// Draws tire tracks on the pad. Marks are revealed behind the wheels as the truck slides: a clip
// rectangle follows the truck's real on-screen position every frame, during the drag, the snap
// into place, and the drive out to the fence. Only the track being laid is touched each frame;
// finished tracks are static SVG, so long games stay smooth.
import { SIZE, type MoveRange, type Truck } from '../engine/index.ts';
import type { Ground } from './themes.ts';
import { addWear, passOf, removeWear, revealed, segments, stretchOf, trackOpacity, type Pass, type Wear } from './tracks.ts';

const NS = 'http://www.w3.org/2000/svg';
const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

interface Laid {
  g: SVGGElement;
  pass: Pass;
}

interface Active {
  g: SVGGElement;
  clip: SVGClipPathElement;
  rect: SVGRectElement;
  el: HTMLElement;
  /** The truck's current position along its lane, in cells (fractional mid-slide). */
  position: () => number;
  startPos: number;
  length: number;
  horizontal: boolean;
  /** Set once the move is made: keep following until then (ms timestamp). */
  until: number | null;
}

let clipIds = 0;

export class TrackLayer {
  readonly svg: SVGSVGElement;
  private wear: Wear = new Map();
  private laid: Laid[] = [];
  private active: Active | null = null;
  private frame = 0;

  constructor() {
    this.svg = document.createElementNS(NS, 'svg');
    this.svg.setAttribute('class', 'tracks');
    this.svg.setAttribute('viewBox', `0 0 ${SIZE * 100} ${SIZE * 100}`);
    this.svg.setAttribute('preserveAspectRatio', 'none');
    this.svg.setAttribute('aria-hidden', 'true');
  }

  setGround(ground: Ground): void {
    this.svg.dataset.ground = ground;
  }

  /** A clean pad. */
  clear(): void {
    cancelAnimationFrame(this.frame);
    this.wear.clear();
    this.laid = [];
    this.active = null;
    this.svg.replaceChildren();
  }

  /** Drag started: lay marks over everything this drag could reach, revealed as the truck moves. */
  begin(truck: Truck, range: MoveRange, el: HTMLElement, position: () => number): void {
    this.finish();
    if (range.min === 0 && range.max === 0) return;
    const pos = truck.orient === 'h' ? truck.col : truck.row;
    const { g, clip, rect } = this.group(stretchOf(truck, range), 1);
    this.active = { g, clip, rect, el, position, startPos: pos, length: truck.length, horizontal: truck.orient === 'h', until: null };
    this.reveal(pos);
    this.svg.append(g);
    this.loop();
  }

  /** Drag let go without a move: those marks never happened. */
  cancel(): void {
    if (!this.active || this.active.until !== null) return;
    cancelAnimationFrame(this.frame);
    this.active.g.remove();
    this.active = null;
  }

  /** The move happened: wear the lane in and keep revealing until the truck settles (or drives out). */
  commit(truck: Truck, delta: number, exited: boolean, settleMs: number): void {
    const pass = passOf(truck, delta, exited);
    addWear(this.wear, pass);
    const fresh = this.group(pass, 0);
    const a = this.active;
    if (a && a.until === null) {
      // Swap the drag's marks for the final ones, keeping how much is revealed so far.
      fresh.rect.setAttribute('x', a.rect.getAttribute('x')!);
      fresh.rect.setAttribute('y', a.rect.getAttribute('y')!);
      fresh.rect.setAttribute('width', a.rect.getAttribute('width')!);
      fresh.rect.setAttribute('height', a.rect.getAttribute('height')!);
      a.g.replaceWith(fresh.g);
      Object.assign(a, { g: fresh.g, clip: fresh.clip, rect: fresh.rect, until: performance.now() + settleMs });
    } else {
      this.svg.append(fresh.g);
      this.unclip(fresh.g, fresh.clip);
    }
    this.laid.push({ g: fresh.g, pass });
    this.fade();
    if (reducedMotion()) this.finish();
  }

  /** Undo: the last move's marks and wear come off. */
  undo(): void {
    this.finish();
    const last = this.laid.pop();
    if (!last) return;
    removeWear(this.wear, last.pass);
    last.g.remove();
    this.fade();
  }

  /** Stops following and shows the active marks in full. */
  private finish(): void {
    cancelAnimationFrame(this.frame);
    const a = this.active;
    this.active = null;
    if (!a) return;
    if (a.until === null) a.g.remove(); // an uncommitted drag
    else this.unclip(a.g, a.clip);
  }

  private loop = (): void => {
    const a = this.active;
    if (!a) return;
    if (a.until !== null && (!a.el.isConnected || performance.now() >= a.until)) {
      this.finish();
      return;
    }
    this.reveal(a.position());
    this.frame = requestAnimationFrame(this.loop);
  };

  private reveal(current: number): void {
    const a = this.active!;
    const [lo, hi] = revealed(a.startPos, current, a.length);
    const along = { pos: lo * 100, size: Math.max(0, hi - lo) * 100 };
    a.rect.setAttribute(a.horizontal ? 'x' : 'y', String(along.pos));
    a.rect.setAttribute(a.horizontal ? 'width' : 'height', String(along.size));
    a.rect.setAttribute(a.horizontal ? 'y' : 'x', '0');
    a.rect.setAttribute(a.horizontal ? 'height' : 'width', String(SIZE * 100));
  }

  /** One move's marks: per wheel, per run of equal wear, three strokes (style.css picks which show). */
  private group(pass: Pass, extra: number): { g: SVGGElement; clip: SVGClipPathElement; rect: SVGRectElement } {
    const g = document.createElementNS(NS, 'g');
    const clip = document.createElementNS(NS, 'clipPath');
    clip.id = `trk${++clipIds}`;
    const rect = document.createElementNS(NS, 'rect');
    clip.append(rect);
    g.append(clip);
    g.setAttribute('clip-path', `url(#${clip.id})`);
    for (const s of segments(pass, this.wear, extra)) {
      for (const part of ['tt-edge', 'tt-mark', 'tt-tread']) {
        const line = document.createElementNS(NS, 'line');
        line.setAttribute('class', `${part} w${s.wear}`);
        line.setAttribute('x1', String(s.x1 * 100));
        line.setAttribute('y1', String(s.y1 * 100));
        line.setAttribute('x2', String(s.x2 * 100));
        line.setAttribute('y2', String(s.y2 * 100));
        g.append(line);
      }
    }
    return { g, clip, rect };
  }

  private unclip(g: SVGGElement, clip: SVGClipPathElement): void {
    g.removeAttribute('clip-path');
    clip.remove();
  }

  private fade(): void {
    this.laid.forEach((t, i) => t.g.setAttribute('opacity', String(trackOpacity(this.laid.length - 1 - i))));
  }
}

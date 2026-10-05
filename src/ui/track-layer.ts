// Draws tire tracks on the pad, live: the wheel marks of the sweep being driven are redrawn from
// the truck's real position on every touch move and every animation frame (drag, snap, drive-out),
// by moving line endpoints. No clip paths: iOS Safari doesn't reliably repaint those mid-drag.
// Only the drag in progress is touched each frame; finished tracks are static SVG.
import { SIZE } from '../engine/index.ts';
import type { Motion } from './spray.ts';
import type { Ground } from './themes.ts';
import { DragPath, addWear, removeWear, sweepCells, sweepSegments, sweepVary, trackOpacity, wearLevel, type Sweep, type Wear } from './tracks.ts';

const NS = 'http://www.w3.org/2000/svg';
const PARTS = ['tt-edge', 'tt-mark', 'tt-tread'];

/** One drag's tracks. Drags that moved a truck are undoable; others stay as decoration. */
interface Entry {
  g: SVGGElement;
  orient: 'h' | 'v';
  lane: number;
  /** Cells each finished sweep wore, so undo can take the wear back off. */
  worn: number[][];
  move: boolean;
  /** Seeds each of this drag's sweeps' small variation in offset and width (tracks.ts sweepVary). */
  seed: number;
}

interface Active {
  entry: Entry;
  path: DragPath;
  /** Lines for the sweep being driven, reused frame to frame. */
  live: SVGGElement;
  el: HTMLElement;
  length: number;
  position: () => number;
  /** Once the finger lifts: keep following until this time (ms), or until the truck has driven out. */
  until: number | null;
  lastPos: number;
  lastTime: number;
}

export class TrackLayer {
  readonly svg: SVGSVGElement;
  private wear: Wear = new Map();
  private entries: Entry[] = [];
  private active: Active | null = null;
  private frame = 0;
  /** Drags so far on this pad: seeds each one's small variation. */
  private drags = 1;
  private onMotion: (m: Motion) => void;
  /** Told the deepest wear level reached so far whenever a sweep wears the lane. */
  onWear: (level: number) => void = () => {};

  constructor(onMotion: (m: Motion) => void = () => {}) {
    this.onMotion = onMotion;
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
    this.entries = [];
    this.active = null;
    this.svg.replaceChildren();
  }

  /** A drag starts: from now on, wherever the truck goes leaves marks. */
  begin(orient: 'h' | 'v', lane: number, start: number, length: number, el: HTMLElement, position: () => number): void {
    this.finish();
    const g = document.createElementNS(NS, 'g');
    const live = document.createElementNS(NS, 'g');
    g.append(live);
    this.svg.append(g);
    const entry: Entry = { g, orient, lane, worn: [], move: false, seed: (this.drags++ * 7919 + lane * 131 + (orient === 'h' ? 17 : 0)) | 0 };
    this.entries.push(entry);
    this.fade();
    const now = performance.now();
    this.active = { entry, path: new DragPath(start, length), live, el, length, position, until: null, lastPos: start, lastTime: now };
    this.frame = requestAnimationFrame(this.loop);
  }

  /** Call on every pointer move: draws immediately, without waiting for the next frame. */
  update(): void {
    const a = this.active;
    if (!a || !a.el.isConnected) return;
    const pos = a.position();
    const now = performance.now();
    const dt = (now - a.lastTime) / 1000;
    // Speed is measured between actual movements: frames where the truck hasn't moved since the
    // last touch event would otherwise read as "stopped" and starve the wheel spray.
    if (Math.abs(pos - a.lastPos) > 0.002 && dt > 0.004) {
      this.onMotion({ orient: a.entry.orient, lane: a.entry.lane, length: a.length, pos, speed: (pos - a.lastPos) / dt, dt });
      a.lastPos = pos;
      a.lastTime = now;
    }
    const done = a.path.update(pos);
    if (done) this.settle(done);
    this.drawLive();
  }

  /** The finger lifted. `moved`: a move was counted (undo removes this drag's tracks). */
  release(moved: boolean, settleMs: number): void {
    const a = this.active;
    if (!a) return;
    a.entry.move = moved;
    a.until = performance.now() + settleMs;
  }

  /** Undo: every mark (and the wear) from the last drag that moved a truck comes off. */
  undo(): void {
    this.finish();
    const i = this.entries.findLastIndex((e) => e.move);
    if (i < 0) return;
    const [e] = this.entries.splice(i, 1);
    for (const cells of e.worn) removeWear(this.wear, e.orient, e.lane, cells);
    e.g.remove();
    this.fade();
  }

  private loop = (): void => {
    const a = this.active;
    if (!a) return;
    if (a.until !== null && (!a.el.isConnected || performance.now() >= a.until)) {
      this.finish();
      return;
    }
    this.update();
    this.frame = requestAnimationFrame(this.loop);
  };

  /** Stops following: the sweep in progress becomes final. Drags that never moved leave nothing. */
  private finish(): void {
    cancelAnimationFrame(this.frame);
    const a = this.active;
    this.active = null;
    if (!a) return;
    const last = a.path.end();
    if (last) this.settle(last, a.entry);
    a.live.remove();
    if (a.entry.worn.length === 0) {
      a.entry.g.remove();
      this.entries.splice(this.entries.indexOf(a.entry), 1);
      this.fade();
    }
  }

  /** A sweep is done: it wears the lane and its marks are drawn for good. */
  private settle(s: Sweep, entry = this.active!.entry): void {
    const cells = sweepCells(s);
    // Draw with the wear as it was during the pass (+1), then record the pass.
    const g = document.createElementNS(NS, 'g');
    this.lines(g, sweepSegments(entry.orient, entry.lane, s, this.wear, 1, sweepVary(entry.seed + entry.worn.length * 101)));
    addWear(this.wear, entry.orient, entry.lane, cells);
    entry.worn.push(cells);
    if (cells.length) this.onWear(Math.max(...cells.map((c) => wearLevel(this.wear, entry.orient, entry.lane, c))));
    entry.g.insertBefore(g, this.active?.entry === entry ? this.active.live : null);
  }

  private drawLive(): void {
    const a = this.active!;
    const s = a.path.current;
    this.lines(a.live, s ? sweepSegments(a.entry.orient, a.entry.lane, s, this.wear, 1, sweepVary(a.entry.seed + a.entry.worn.length * 101)) : []);
  }

  /** Puts these segments into `g`, reusing its existing line elements. */
  private lines(g: SVGGElement, segs: ReturnType<typeof sweepSegments>): void {
    const need = segs.length * PARTS.length;
    while (g.childElementCount > need) g.lastElementChild!.remove();
    while (g.childElementCount < need) g.append(document.createElementNS(NS, 'line'));
    let i = 0;
    for (const s of segs) {
      for (const part of PARTS) {
        const line = g.children[i++] as SVGLineElement;
        const cls = `${part} w${s.wear}`;
        if (line.getAttribute('class') !== cls) line.setAttribute('class', cls);
        line.setAttribute('x1', String(s.x1 * 100));
        line.setAttribute('y1', String(s.y1 * 100));
        line.setAttribute('x2', String(s.x2 * 100));
        line.setAttribute('y2', String(s.y2 * 100));
        line.style.setProperty('--tw', s.width.toFixed(3));
      }
    }
  }

  private fade(): void {
    this.entries.forEach((e, i) => e.g.setAttribute('opacity', String(trackOpacity(this.entries.length - 1 - i))));
  }
}

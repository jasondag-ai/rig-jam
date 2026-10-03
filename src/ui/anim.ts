// Sprite-sheet character animation (Batch C art: public/sprites/anim, made by tools/inbox-sprites.py,
// listed in anim-sprites.json). One element per character; it plays a named action by stepping the
// sheet's background, driven by GSAP so scenes can await it and an aborted scene kills it.
// Every action is drawn standing on the same ground line, so a character stays put between actions.
import { gsap } from 'gsap';
import MANIFEST from './anim-sprites.json' with { type: 'json' };

export interface AnimInfo {
  frames: number;
  w: number;
  h: number;
  /** Where the character is in a frame (union over frames, frame px): [x0, y0, x1, y1]. */
  box: [number, number, number, number];
}
export const ANIM = MANIFEST as unknown as Record<string, AnimInfo>;
export const hasAnim = (name: string) => name in ANIM;
const url = (name: string) => new URL(`./sprites/anim/${name}.webp`, location.href).href;

/**
 * A character drawn from sprite sheets. `scale` is display px per sheet px. The element's origin is
 * the character's feet (bottom centre of the frame), so place it with `transform` at the ground.
 */
export class Sprite {
  readonly el: HTMLElement;
  private sheet: HTMLElement;
  private scale: number;
  private current = '';
  private frame = { i: 0 };
  private tween: gsap.core.Tween | null = null;

  constructor(className: string, scale: number) {
    this.scale = scale;
    this.el = document.createElement('div');
    this.el.className = `sprite-anim ${className}`;
    this.sheet = document.createElement('div');
    this.sheet.className = 'sheet';
    this.el.append(this.sheet);
  }

  /** Shows one frame of an action (still). */
  show(name: string, frame = 0): void {
    this.tween?.kill();
    this.use(name);
    this.set(frame);
  }

  /**
   * Plays an action once (or `loop` times; -1 forever) at `fps`, from its first frame (or `from`).
   * Returns the tween (await it with a scene runner), finishing on the last frame.
   */
  play(name: string, o: { fps?: number; loop?: number; from?: number; to?: number; yoyo?: boolean } = {}): gsap.core.Tween {
    this.tween?.kill();
    this.use(name);
    const a = ANIM[name];
    const from = o.from ?? 0;
    const to = o.to ?? a.frames - 1;
    const fps = o.fps ?? 12;
    this.frame.i = from;
    this.set(from);
    // One step past the end so the last frame gets its full time; the loop restarts at `from`.
    const span = Math.abs(to - from) + 1;
    this.tween = gsap.to(this.frame, {
      i: from + Math.sign(to - from || 1) * span,
      duration: span / fps,
      ease: 'none',
      repeat: o.loop ?? 0,
      yoyo: o.yoyo,
      onUpdate: () => this.set(Math.min(Math.max(Math.floor(this.frame.i), Math.min(from, to)), Math.max(from, to))),
      onComplete: () => this.set(to),
    });
    return this.tween;
  }

  /** Display height of a whole frame in px (for sizing against the scene). */
  frameHeight(name: string): number {
    return ANIM[name].h * this.scale;
  }

  destroy(): void {
    this.tween?.kill();
    this.el.remove();
  }

  private use(name: string): void {
    if (this.current === name) return;
    this.current = name;
    const a = ANIM[name];
    const s = this.scale;
    Object.assign(this.sheet.style, {
      width: `${a.w * s}px`,
      height: `${a.h * s}px`,
      left: `${(-a.w * s) / 2}px`,
      top: `${-a.box[3] * s}px`,
      backgroundImage: `url("${url(name)}")`,
      backgroundSize: `${a.frames * a.w * s}px ${a.h * s}px`,
    });
  }

  private set(i: number): void {
    const a = ANIM[this.current];
    this.sheet.style.backgroundPosition = `${-((i % a.frames) * a.w * this.scale)}px 0`;
  }
}

/** Starts loading the sheets a scene will use. */
export function preloadAnims(names: string[]): void {
  for (const n of names) {
    if (!hasAnim(n)) continue;
    const img = new Image();
    img.src = url(n);
  }
}

/** A still frame of an action as an element sized `h` px tall (log cards and the win card). */
export function animStill(name: string, h: number, frame = 0): HTMLElement {
  const a = ANIM[name];
  const s = h / a.h;
  const el = document.createElement('div');
  el.className = 'anim-still';
  Object.assign(el.style, {
    width: `${a.w * s}px`,
    height: `${h}px`,
    backgroundImage: `url("${url(name)}")`,
    backgroundSize: `${a.frames * a.w * s}px ${h}px`,
    backgroundPosition: `${-(frame * a.w * s)}px 0`,
  });
  return el;
}

// Wheel spray: while a truck moves, its rear wheels flick particles backwards, more the faster it
// goes. Mud throws brown clumps and the odd splat that sits on the pad for a moment; gravel puffs
// dust; snow throws powder. Capped so long games stay smooth; off with reduced motion.
import type { Ground } from './themes.ts';
import { WHEEL_OFFSET } from './tracks.ts';

/** Never more than this many particles alive at once. */
export const MAX_PARTICLES = 36;
/** Never more than this many new particles in one frame. */
export const MAX_PER_FRAME = 3;
/** Particles per second at full speed, and the speed (cells/s) that counts as full. */
const RATE = 60;
const FULL_SPEED = 8;
/** Below this speed (cells/s) the wheels don't throw anything. */
const MIN_SPEED = 0.6;

/**
 * How many particles to throw this frame for a truck moving at `speed` cells/s for `dt` seconds.
 * `carry` keeps the fractional remainder between frames. `live` is how many are already flying.
 */
export function particlesFor(speed: number, dt: number, carry: number, live: number): { count: number; carry: number } {
  if (Math.abs(speed) < MIN_SPEED || dt <= 0) return { count: 0, carry: 0 };
  const total = carry + RATE * Math.min(1, Math.abs(speed) / FULL_SPEED) * dt;
  const whole = Math.floor(total);
  const count = Math.max(0, Math.min(whole, MAX_PER_FRAME, MAX_PARTICLES - live));
  return { count, carry: total - whole };
}

export interface Motion {
  orient: 'h' | 'v';
  lane: number;
  length: number;
  /** Truck position along its lane (cells) and speed (cells/s, signed). */
  pos: number;
  speed: number;
  dt: number;
}

const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const rand = (lo: number, hi: number) => lo + Math.random() * (hi - lo);

export class Spray {
  private ground: Ground = 'gravel';
  private live = 0;
  private carry = 0;
  private host: HTMLElement;
  /** Ground-level splats go before this element so trucks drive over them. */
  private below: () => Element | null;

  constructor(host: HTMLElement, below: () => Element | null) {
    this.host = host;
    this.below = below;
  }

  setGround(ground: Ground): void {
    this.ground = ground;
  }

  /** Throws particles from the rear wheels for one frame of motion. */
  emit(m: Motion, cell: number): void {
    if (reducedMotion()) return;
    const { count, carry } = particlesFor(m.speed, m.dt, this.carry, this.live);
    this.carry = carry;
    const dir = Math.sign(m.speed);
    for (let i = 0; i < count; i++) {
      // Rear wheels: the end of the truck trailing behind its direction of travel.
      const along = (dir > 0 ? m.pos + 0.3 : m.pos + m.length - 0.3) * cell;
      const across = (m.lane + 0.5 + (Math.random() < 0.5 ? -WHEEL_OFFSET : WHEEL_OFFSET)) * cell;
      const x = m.orient === 'h' ? along : across;
      const y = m.orient === 'h' ? across : along;
      // Flicked backwards, fanned out, further when faster.
      const reach = cell * rand(0.25, 0.7) * (0.6 + Math.min(1, Math.abs(m.speed) / FULL_SPEED));
      const back = -dir * reach;
      const side = rand(-0.45, 0.45) * reach;
      const dx = m.orient === 'h' ? back : side;
      const dy = m.orient === 'h' ? side : back;
      this.spawn(x, y, dx, dy, cell);
    }
  }

  private spawn(x: number, y: number, dx: number, dy: number, cell: number): void {
    const kind =
      this.ground === 'mud' ? (Math.random() < 0.18 ? 'splat' : 'clump') : this.ground === 'snow' ? 'powder' : 'dust';
    const p = document.createElement('div');
    p.className = `spray ${kind}`;
    const size =
      kind === 'splat' ? cell * rand(0.16, 0.26) : kind === 'clump' ? cell * rand(0.09, 0.16) : cell * rand(0.12, 0.22);
    Object.assign(p.style, { left: `${x - size / 2}px`, top: `${y - size / 2}px`, width: `${size}px`, height: `${size}px` });
    if (kind === 'splat') this.host.insertBefore(p, this.below());
    else this.host.append(p);
    this.live++;

    const to = `translate(${dx}px, ${dy}px)`;
    const frames: Keyframe[] =
      kind === 'splat'
        ? [
            { transform: 'translate(0, 0) scale(0.4)', opacity: 1 },
            { transform: `${to} scale(1.25, 0.8)`, opacity: 0.95, offset: 0.12 },
            { transform: `${to} scale(1.25, 0.8)`, opacity: 0.85, offset: 0.75 },
            { transform: `${to} scale(1.25, 0.8)`, opacity: 0 },
          ]
        : kind === 'clump'
          ? [
              { transform: 'translate(0, 0) scale(1)', opacity: 1 },
              { transform: `${to} scale(0.8)`, opacity: 0.9, offset: 0.8 },
              { transform: `${to} scale(0.6)`, opacity: 0 },
            ]
          : [
              { transform: 'translate(0, 0) scale(0.5)', opacity: 0.9 },
              { transform: `${to} scale(1.6)`, opacity: 0 },
            ];
    const duration = kind === 'splat' ? rand(1500, 2100) : kind === 'clump' ? rand(380, 560) : rand(450, 700);
    const anim = p.animate(frames, { duration, easing: 'cubic-bezier(0.2, 0.7, 0.4, 1)', fill: 'forwards' });
    anim.onfinish = () => {
      p.remove();
      this.live--;
    };
  }

  /** Removes everything (new level / restart). */
  clear(): void {
    this.host.querySelectorAll('.spray').forEach((p) => p.remove());
    this.live = 0;
    this.carry = 0;
  }
}

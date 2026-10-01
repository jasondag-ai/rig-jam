// Ground detail painted on the pad under the trucks: gravel speckle, wet mud with puddles, or
// packed snow with drifts. Every level starts with no tire tracks: those are laid by your moves
// (tracks.ts). Purely cosmetic; seeded per level so it never flickers.
import { mulberry32 } from '../engine/rng.ts';
import type { Ground } from './themes.ts';

const CELL = 100;
const SIZE = 600;
type Rng = () => number;

const between = (rng: Rng, lo: number, hi: number) => lo + rng() * (hi - lo);
const r1 = (n: number) => Math.round(n * 10) / 10;

function speckles(rng: Rng, count: number, cls: string, rMin: number, rMax: number): string {
  let out = '';
  for (let i = 0; i < count; i++) {
    out += `<circle class="${cls}" cx="${r1(rng() * SIZE)}" cy="${r1(rng() * SIZE)}" r="${r1(between(rng, rMin, rMax))}"/>`;
  }
  return out;
}

function gravel(rng: Rng): string {
  return [
    speckles(rng, 170, 'pd-speck-dark', 1.5, 4),
    speckles(rng, 110, 'pd-speck-light', 1.5, 3.5),
  ].join('');
}

/**
 * Grid corners for puddle stains. A stain centred on a corner spreads over four cells and is never
 * centred on any one of them, so it reads as ground, not as something sitting in a cell.
 */
function stainCorners(rng: Rng, count: number): { x: number; y: number }[] {
  const picked: { x: number; y: number }[] = [];
  for (let tries = 0; picked.length < count && tries < 200; tries++) {
    const c = { x: (1 + Math.floor(rng() * 5)) * CELL, y: (1 + Math.floor(rng() * 5)) * CELL };
    if (picked.some((p) => Math.abs(p.x - c.x) + Math.abs(p.y - c.y) < 3 * CELL)) continue;
    picked.push(c);
  }
  return picked;
}

/** A soft, irregular closed shape around (cx, cy). */
function blob(rng: Rng, cx: number, cy: number, rx: number, ry: number): string {
  const n = 8;
  const pts = Array.from({ length: n }, (_, i) => {
    const a = (i / n) * Math.PI * 2;
    const k = between(rng, 0.8, 1.12);
    return [cx + Math.cos(a) * rx * k, cy + Math.sin(a) * ry * k];
  });
  const mid = (i: number) => {
    const [a, b] = [pts[i % n], pts[(i + 1) % n]];
    return [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
  };
  let d = `M${r1(mid(0)[0])} ${r1(mid(0)[1])}`;
  for (let i = 1; i <= n; i++) d += ` Q${r1(pts[i % n][0])} ${r1(pts[i % n][1])} ${r1(mid(i)[0])} ${r1(mid(i)[1])}`;
  return `${d} Z`;
}

function mud(rng: Rng): string {
  const parts: string[] = [];
  // Broad glossy sheen: long soft bands of reflected sky.
  for (let i = 0; i < 5; i++) {
    parts.push(
      `<ellipse class="pd-sheen" cx="${r1(rng() * SIZE)}" cy="${r1(rng() * SIZE)}" rx="${r1(between(rng, 70, 140))}" ry="${r1(between(rng, 10, 18))}" transform="rotate(${r1(between(rng, -25, 25))})"/>`,
    );
  }
  // Wetter, lighter swirls across the surface.
  for (let i = 0; i < 7; i++) {
    parts.push(
      `<ellipse class="pd-wet" cx="${r1(rng() * SIZE)}" cy="${r1(rng() * SIZE)}" rx="${r1(between(rng, 50, 110))}" ry="${r1(between(rng, 20, 45))}" transform="rotate(${r1(between(rng, -30, 30))})"/>`,
    );
  }
  parts.push(speckles(rng, 70, 'pd-clump', 2, 5));
  // Puddles: flat, irregular, low-contrast wet stains on grid corners. No rim, glint or shadow.
  for (const c of stainCorners(rng, 3)) {
    const cx = c.x + between(rng, -8, 8);
    const cy = c.y + between(rng, -8, 8);
    parts.push(`<path class="pd-stain" d="${blob(rng, cx, cy, between(rng, 34, 46), between(rng, 20, 30))}"/>`);
  }
  // Glossy highlights: short bright flecks that say "wet".
  for (let i = 0; i < 45; i++) {
    const x = rng() * SIZE;
    const y = rng() * SIZE;
    const len = between(rng, 8, 18);
    parts.push(`<path class="pd-gloss" d="M${r1(x)} ${r1(y)} q${r1(len / 2)} ${r1(-len / 4)} ${r1(len)} 0"/>`);
  }
  return parts.join('');
}

function snow(rng: Rng): string {
  const parts: string[] = [];
  for (let i = 0; i < 6; i++) {
    parts.push(
      `<ellipse class="pd-drift" cx="${r1(rng() * SIZE)}" cy="${r1(rng() * SIZE)}" rx="${r1(between(rng, 50, 120))}" ry="${r1(between(rng, 18, 40))}"/>`,
    );
  }
  parts.push(speckles(rng, 60, 'pd-sparkle', 1, 2.2));
  return parts.join('');
}

/** SVG markup for the pad surface (600x600 viewBox, one cell = 100). */
export function padDecor(ground: Ground, seed: number): string {
  const rng = mulberry32(seed);
  const body = ground === 'gravel' ? gravel(rng) : ground === 'mud' ? mud(rng) : snow(rng);
  return `<svg class="pad-decor" viewBox="0 0 ${SIZE} ${SIZE}" preserveAspectRatio="none" aria-hidden="true">${body}</svg>`;
}

// Ground detail painted on the pad under the trucks: gravel speckle, wet mud with ruts and
// puddles, or packed snow with tracks. Purely cosmetic; seeded per level so it never flickers.
import type { Cell } from '../engine/index.ts';
import { mulberry32 } from '../engine/rng.ts';
import type { Ground } from './themes.ts';

const CELL = 100;
const SIZE = 600;
type Rng = () => number;

const between = (rng: Rng, lo: number, hi: number) => lo + rng() * (hi - lo);
const r1 = (n: number) => Math.round(n * 10) / 10;

/** A wavy line across the pad (a tire track), along a row or column at `at` px. */
function wavyLine(rng: Rng, horizontal: boolean, at: number): string {
  const pts = Array.from({ length: 5 }, (_, i) => [i * 150, at + between(rng, -14, 14)]);
  const xy = ([a, b]: number[]) => (horizontal ? `${r1(a)} ${r1(b)}` : `${r1(b)} ${r1(a)}`);
  let d = `M${xy([-20, pts[0][1]])}`;
  for (let i = 1; i < pts.length; i++) {
    const mid = [(pts[i - 1][0] + pts[i][0]) / 2, (pts[i - 1][1] + pts[i][1]) / 2];
    d += ` Q${xy(pts[i - 1])} ${xy(mid)}`;
  }
  return `${d} T${xy([SIZE + 20, pts[4][1]])}`;
}

/** A pair of parallel tire tracks, 34px apart. */
function trackPair(rng: Rng): { horizontal: boolean; lines: string[] } {
  const horizontal = rng() < 0.5;
  const at = between(rng, 120, 480);
  const seed = Math.floor(rng() * 1e9);
  return {
    horizontal,
    lines: [0, 34].map((offset) => wavyLine(mulberry32(seed), horizontal, at + offset)),
  };
}

function speckles(rng: Rng, count: number, cls: string, rMin: number, rMax: number): string {
  let out = '';
  for (let i = 0; i < count; i++) {
    out += `<circle class="${cls}" cx="${r1(rng() * SIZE)}" cy="${r1(rng() * SIZE)}" r="${r1(between(rng, rMin, rMax))}"/>`;
  }
  return out;
}

function gravel(rng: Rng): string {
  const t = trackPair(rng);
  return [
    ...t.lines.map((d) => `<path class="pd-track-light" d="${d}"/>`),
    speckles(rng, 170, 'pd-speck-dark', 1.5, 4),
    speckles(rng, 110, 'pd-speck-light', 1.5, 3.5),
  ].join('');
}

/** Cells for puddles: not under an obstacle, spread out. */
function puddleCells(rng: Rng, avoid: readonly Cell[], count: number): Cell[] {
  const taken = new Set(avoid.map((c) => `${c.row},${c.col}`));
  const picked: Cell[] = [];
  for (let tries = 0; picked.length < count && tries < 200; tries++) {
    const c = { row: Math.floor(rng() * 6), col: Math.floor(rng() * 6) };
    if (taken.has(`${c.row},${c.col}`)) continue;
    if (picked.some((p) => Math.abs(p.row - c.row) + Math.abs(p.col - c.col) < 3)) continue;
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

function mud(rng: Rng, avoid: readonly Cell[], id: string): string {
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
  // Two sets of ruts, each a soft dark groove between lit ridges, with a wet shine in the bottom.
  const ruts: string[] = [];
  for (let k = 0; k < 2; k++) {
    for (const d of trackPair(rng).lines) {
      ruts.push(`<path class="pd-rut-ridge" d="${d}"/><path class="pd-rut" d="${d}"/><path class="pd-rut-shine" d="${d}"/>`);
    }
  }
  parts.push(`<g filter="url(#${id}-soft)">${ruts.join('')}</g>`);
  parts.push(speckles(rng, 70, 'pd-clump', 2, 5));
  // Puddles: flat, irregular pools of sky-colored water ringed by wet, shiny mud.
  for (const c of puddleCells(rng, avoid, 3)) {
    const cx = c.col * CELL + 50 + between(rng, -10, 10);
    const cy = c.row * CELL + 50 + between(rng, -10, 10);
    const rx = between(rng, 38, 47);
    const ry = between(rng, 22, 30);
    const pool = blob(rng, cx, cy, rx, ry);
    parts.push(
      `<path class="pd-puddle-edge" d="${blob(rng, cx, cy, rx + 7, ry + 6)}"/>` +
        `<path fill="url(#${id}-water)" d="${pool}"/>` +
        `<path class="pd-ripple" d="M${r1(cx - rx * 0.5)} ${r1(cy + ry * 0.25)} q${r1(rx * 0.25)} ${r1(-ry * 0.12)} ${r1(rx * 0.5)} 0"/>` +
        `<ellipse class="pd-glint" cx="${r1(cx - rx * 0.32)}" cy="${r1(cy - ry * 0.32)}" rx="${r1(rx * 0.28)}" ry="${r1(ry * 0.14)}"/>`,
    );
  }
  // Glossy highlights: short bright flecks that say "wet".
  for (let i = 0; i < 45; i++) {
    const x = rng() * SIZE;
    const y = rng() * SIZE;
    const len = between(rng, 8, 18);
    parts.push(`<path class="pd-gloss" d="M${r1(x)} ${r1(y)} q${r1(len / 2)} ${r1(-len / 4)} ${r1(len)} 0"/>`);
  }
  const defs =
    `<defs><linearGradient id="${id}-water" x1="0" y1="0" x2="0" y2="1">` +
    `<stop offset="0" stop-color="#cfe6f2"/><stop offset="0.55" stop-color="#8fb3c8"/><stop offset="1" stop-color="#5d7f94"/>` +
    `</linearGradient><filter id="${id}-soft" x="-5%" y="-5%" width="110%" height="110%"><feGaussianBlur stdDeviation="2.2"/></filter></defs>`;
  return defs + parts.join('');
}

function snow(rng: Rng): string {
  const parts: string[] = [];
  for (let i = 0; i < 6; i++) {
    parts.push(
      `<ellipse class="pd-drift" cx="${r1(rng() * SIZE)}" cy="${r1(rng() * SIZE)}" rx="${r1(between(rng, 50, 120))}" ry="${r1(between(rng, 18, 40))}"/>`,
    );
  }
  for (let k = 0; k < 2; k++) {
    for (const d of trackPair(rng).lines) parts.push(`<path class="pd-snow-track" d="${d}"/><path class="pd-tread" d="${d}"/>`);
  }
  parts.push(speckles(rng, 60, 'pd-sparkle', 1, 2.2));
  return parts.join('');
}

/** SVG markup for the pad surface (600x600 viewBox, one cell = 100). */
export function padDecor(ground: Ground, seed: number, avoid: readonly Cell[] = []): string {
  const rng = mulberry32(seed);
  const id = `pd${seed.toString(36)}`;
  const body = ground === 'gravel' ? gravel(rng) : ground === 'mud' ? mud(rng, avoid, id) : snow(rng);
  return `<svg class="pad-decor" viewBox="0 0 ${SIZE} ${SIZE}" preserveAspectRatio="none" aria-hidden="true">${body}</svg>`;
}

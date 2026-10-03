// Illustrated truck sprites (public/sprites/trucks, made by tools/truck-sprites.py): one per kind and
// gate color, drawn cab-right like the SVG art, at 1x and 2x. A truck shows its sprite once it has
// loaded; until then (or if it never loads) the old SVG drawing stands in.
import type { Color, ObstacleKind, TruckKind } from '../engine/index.ts';
import OBSTACLES from './obstacle-sprites.json' with { type: 'json' };

const BASE = './sprites/trucks/';
export const spriteSrc = (kind: TruckKind, color: Color, scale: 1 | 2 = 1) => `${BASE}${kind}-${color}${scale === 2 ? '@2x' : ''}.webp`;
export const spriteSrcset = (kind: TruckKind, color: Color) => `${spriteSrc(kind, color)} 1x, ${spriteSrc(kind, color, 2)} 2x`;

/** The sprite <img> for a truck (sized and turned by the .art box around it). */
export const spriteImg = (kind: TruckKind, color: Color) =>
  `<img class="sprite" alt="" draggable="false" decoding="async" src="${spriteSrc(kind, color)}" srcset="${spriteSrcset(kind, color)}" />`;

const warm = new Set<string>();
/** Starts loading sprites ahead of time (each once), at the scale this screen will use. */
export function preloadSprites(list: { kind: TruckKind; color: Color }[]): void {
  const scale = (window.devicePixelRatio ?? 1) > 1.25 ? 2 : 1;
  for (const { kind, color } of list) {
    const src = spriteSrc(kind, color, scale);
    if (warm.has(src)) continue;
    warm.add(src);
    const img = new Image();
    img.decoding = 'async';
    img.src = src;
  }
}

// ---------- Obstacles (public/sprites/obstacles, made by tools/obstacle-sprites.py) ----------

const OB_BASE = './sprites/obstacles/';
export const obstacleSrc = (kind: ObstacleKind, scale: 1 | 2 = 1) => `${OB_BASE}${kind}${scale === 2 ? '@2x' : ''}.webp`;
/** Sprite height as a share of its width (taller than 1 sticks up above its cell). */
export const obstacleAspect = (kind: ObstacleKind) => (OBSTACLES as Record<string, { aspect: number }>)[kind].aspect;
/** How much of a cell the slab's footprint fills across. */
export const OB_FILL = 0.98;

/**
 * Size of an obstacle sprite in cells, and the share of its height that sticks up above its cell.
 * In the top row it's shrunk to fit inside the cell, so it never covers the fence or a gate.
 */
export function obstacleFit(kind: ObstacleKind, row: number): { w: number; over: number } {
  const aspect = obstacleAspect(kind);
  const w = row === 0 && aspect * OB_FILL > OB_FILL ? OB_FILL / aspect : OB_FILL;
  const h = w * aspect;
  return { w, over: Math.max(0, (h - OB_FILL) / h) };
}

/** The obstacle sprite: a base layer and the part that sticks up above the cell (faded over trucks). */
export const obstacleImgs = (kind: ObstacleKind) => {
  const attrs = `alt="" draggable="false" decoding="async" src="${obstacleSrc(kind)}" srcset="${obstacleSrc(kind)} 1x, ${obstacleSrc(kind, 2)} 2x"`;
  return `<img class="sprite ob-base" ${attrs} /><img class="ob-top" ${attrs} />`;
};

/** Turns a truck or obstacle element over to its sprite once the image is in; leaves the SVG if it fails. */
export function wireSprite(truckEl: HTMLElement): void {
  const img = truckEl.querySelector<HTMLImageElement>('img.sprite');
  if (!img) return;
  const on = () => truckEl.classList.add('sprite-on');
  const fail = () => {
    truckEl.classList.remove('sprite-on');
    truckEl.querySelectorAll('img').forEach((i) => i.remove());
  };
  if (img.complete) {
    if (img.naturalWidth) on();
    else fail();
    return;
  }
  img.addEventListener('load', on, { once: true });
  img.addEventListener('error', fail, { once: true });
}

/** Starts loading the obstacle sprites (each once). */
export function preloadObstacles(kinds: ObstacleKind[]): void {
  const scale = (window.devicePixelRatio ?? 1) > 1.25 ? 2 : 1;
  for (const kind of kinds) {
    const src = obstacleSrc(kind, scale);
    if (warm.has(src)) continue;
    warm.add(src);
    const img = new Image();
    img.src = src;
  }
}

// ---------- Pipe-rail fence (public/sprites/fence, made by tools/fence-sprites.py) ----------

const FENCE_PARTS = ['rail-h', 'rail-v', 'corner-tl', 'corner-tr', 'corner-br', 'corner-bl'];
/** Loaded too before the fence switches over (the gates are part of it). */
const GATE_PARTS = ['gate-hinge', 'gate-latch', ...['red', 'blue', 'yellow', 'green', 'orange', 'purple'].map((c) => `gate-leaf-${c}`)];
let fenceReady: Promise<boolean> | null = null;

/** Gives a board its pipe-rail fence (`.pipe-on`) once every piece has loaded; else the drawn fence stays. */
export function pipeFence(board: HTMLElement): void {
  for (const part of FENCE_PARTS) board.style.setProperty(`--${part}`, `url("${new URL(`./sprites/fence/${part}.webp`, location.href).href}")`);
  fenceReady ??= Promise.all(
    [...FENCE_PARTS, ...GATE_PARTS].map(
      (part) =>
        new Promise<boolean>((resolve) => {
          const img = new Image();
          img.onload = () => resolve(true);
          img.onerror = () => resolve(false);
          img.src = `./sprites/fence/${part}.webp`;
        }),
    ),
  ).then((ok) => ok.every(Boolean));
  void fenceReady.then((ok) => board.classList.toggle('pipe-on', ok));
}

// BALDONNEL'S MOUNTAINS (October upgrade, job U6c; Jay, Oct 10): foothills country, so a range stands on the horizon
// behind the farthest trees. Drawn in code in the flat toy style: two ridges of blue-grey, the nearer one darker,
// snow caps with a shaded side, one soft outline. Pure, and THE SAME EVERY VISIT: one fixed seed, laid out in shares
// of the screen's width, so every level and the level list show the same range.
// The range is as tall as the sky it is given and no taller than `MOUNTAIN_SHARE` of the width: where the sky band is
// short (Safari with its toolbars showing) it is squat, and its peaks still show over the trees. It never reaches
// above `top` (the HUD's foot, or the header's on the level list). It takes no touches: a tap on it is a tap on the sky.
import { mulberry32 } from '../engine/rng.ts';

/** The range's height at most, as a share of the screen's width (74 px at 390). */
export const MOUNTAIN_SHARE = 0.19;
/** Under this much sky (px) nothing is drawn: there is no room for a peak. */
export const MOUNTAIN_MIN = 8;
const SEED = 1907; // (fixed: the same mountains for everybody, every time)
const FAR = '#a9bccd', NEAR = '#8399b1', NEAR_SHADE = '#6f86a0', SNOW = '#f4f8fb', SNOW_SHADE = '#cddae6', LINE = '#4d6079';
const r1 = (n: number) => Math.round(n * 10) / 10;

export interface Peak { /** Where its top is, as a share of the width. */ x: number; /** How tall, as a share of the range's height. */ h: number; /** Half its foot's width, as a share of the width. */ w: number }
/** The two ridges' peaks, from the fixed seed: the far ridge lower and wider, the near one taller and sharper. */
export function peaks(): { far: Peak[]; near: Peak[] } {
  const rng = mulberry32(SEED);
  const ridge = (n: number, lo: number, hi: number, w: number, shift: number): Peak[] =>
    Array.from({ length: n }, (_, i) => ({ x: (i + 0.5 + shift + (rng() - 0.5) * 0.5) / n, h: lo + rng() * (hi - lo), w: w * (0.85 + rng() * 0.4) }));
  return { far: ridge(6, 0.42, 0.7, 0.16, 0.25), near: ridge(5, 0.62, 1, 0.15, 0) };
}

/**
 * The range as one SVG, `width` px wide, its foot on `base` and nothing of it above `top` (both px from the screen's
 * top). '' where there is no room for it.
 */
export function mountainsSvg(width: number, top: number, base: number): string {
  const H = Math.min(base - top, width * MOUNTAIN_SHARE);
  if (!(width > 0) || !(H >= MOUNTAIN_MIN)) return '';
  const { far, near } = peaks();
  const tri = (p: Peak) => ({ x: p.x * width, y: H - p.h * H, w: p.w * width });
  // One ridge: each peak a triangle with a slightly bent near slope, all of them standing on the range's foot.
  const ridge = (ps: Peak[], fill: string) =>
    ps.map(tri).map((t) => `<path d="M${r1(t.x - t.w)} ${r1(H)} L${r1(t.x - t.w * 0.28)} ${r1(t.y + (H - t.y) * 0.34)} L${r1(t.x)} ${r1(t.y)} L${r1(t.x + t.w * 0.4)} ${r1(t.y + (H - t.y) * 0.42)} L${r1(t.x + t.w)} ${r1(H)} Z" fill="${fill}" stroke="${LINE}" stroke-width="1.5" stroke-linejoin="round"/>`).join('');
  // The near ridge's shaded side (light from the top left: the right-hand face), and its snow.
  const shade = near.map(tri).map((t) => `<path d="M${r1(t.x)} ${r1(t.y)} L${r1(t.x + t.w * 0.4)} ${r1(t.y + (H - t.y) * 0.42)} L${r1(t.x + t.w)} ${r1(H)} L${r1(t.x + t.w * 0.18)} ${r1(H)} Z" fill="${NEAR_SHADE}"/>`).join('');
  const cap = (t: { x: number; y: number; w: number }, k: number) => {
    const d = (H - t.y) * k, l = t.w * 0.28 * (d / ((H - t.y) * 0.34)), r = t.w * 0.4 * (d / ((H - t.y) * 0.42));
    // (A zigzag foot: three teeth of snow down the rock.)
    return `<path d="M${r1(t.x)} ${r1(t.y)} L${r1(t.x - l)} ${r1(t.y + d)} L${r1(t.x - l * 0.45)} ${r1(t.y + d * 0.78)} L${r1(t.x - l * 0.05)} ${r1(t.y + d * 1.12)} L${r1(t.x + r * 0.4)} ${r1(t.y + d * 0.8)} L${r1(t.x + r)} ${r1(t.y + d)} Z" fill="${SNOW}" stroke="${LINE}" stroke-width="1.2" stroke-linejoin="round"/>` +
      `<path d="M${r1(t.x)} ${r1(t.y)} L${r1(t.x + r * 0.4)} ${r1(t.y + d * 0.8)} L${r1(t.x + r)} ${r1(t.y + d)} Z" fill="${SNOW_SHADE}"/>`;
  };
  const caps = (ps: Peak[], k: number) => ps.map(tri).map((t) => cap(t, k)).join('');
  return (
    `<svg class="mountains" data-peaks="${far.length + near.length}" width="${r1(width)}" height="${r1(H)}" viewBox="0 0 ${r1(width)} ${r1(H)}" style="position:absolute;left:0;top:${r1(base - H)}px" overflow="hidden" aria-hidden="true">` +
    ridge(far, FAR) + caps(far, 0.2) + ridge(near, NEAR) + shade + caps(near, 0.26) +
    `</svg>`
  );
}

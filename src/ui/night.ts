// NIGHT (GAME_BIBLE, Oct 5): no level starts at night. On any level, when the player has made no
// move for a while (gag-triggers.ts `night`), the lease slowly fades to night; the next move brings
// the day back. At night the ground, berm, scenery and the strip's gags lie under one cool shade
// at about half brightness under a deep blue sky with a moon and stars; trucks, gates and symbols
// are dimmed much less so every colour reads; a warm glow round each flare flickers with its flame;
// each cab has small headlight glows. Pure numbers and rules here (tested); the look and the fades
// are in style.css ("Night").
import type { Ground } from './themes.ts';

export const NIGHT = {
  /** The night's colour, laid over the ground, berm and scenery at this strength. */
  shade: { gravel: [8, 16, 48], mud: [4, 9, 30], snow: [8, 16, 48] } as Record<Ground, readonly [number, number, number]>,
  /**
   * About half brightness. Snow is so bright it takes more to sit darker than the trucks on it; mud
   * is so dark that the shade's own blue would lift it, so its shade is deeper and a little stronger.
   */
  alpha: { gravel: 0.55, mud: 0.6, snow: 0.75 } as Record<Ground, number>,
  /** Trucks and gates keep this much of their brightness (the ground keeps about half). */
  truck: 0.9,
  gate: 0.92,
  /** The flare's glow, in cells across. */
  glowCells: 2.5,
};
export const nightRgba = (ground: Ground): string => `rgba(${NIGHT.shade[ground].join(', ')}, ${NIGHT.alpha[ground]})`;

/** After this long with no move on a night level, a truck speaks up (once per level; never a fail). */
export const NUDGE_LINE = "While we're young, Sonny, we don't have all day.";

/**
 * `?night=1` keeps a level at night from the start and `?night=0` keeps night away (previews,
 * screenshots, tests). Otherwise (null) night comes only when the player goes idle.
 */
export function nightForced(search: string = typeof location === 'undefined' ? '' : location.search): boolean | null {
  const forced = new URLSearchParams(search).get('night');
  return forced === '1' ? true : forced === '0' ? false : null;
}

type Rgb = [number, number, number];
export const rgb = (hex: string): Rgb => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16)) as Rgb;
/** A ground colour as it looks under the night shade. */
export const shaded = (c: Rgb, ground: Ground): Rgb => c.map((v, i) => v * (1 - NIGHT.alpha[ground]) + NIGHT.shade[ground][i] * NIGHT.alpha[ground]) as Rgb;
/** A truck or gate colour as it looks at night. */
export const dimmed = (c: Rgb, keep: number = NIGHT.truck): Rgb => c.map((v) => v * keep) as Rgb;
/** WCAG relative luminance and contrast ratio. */
export const luminance = (c: Rgb): number => {
  const [r, g, b] = c.map((v) => (v / 255 <= 0.03928 ? v / 255 / 12.92 : ((v / 255 + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
export const contrast = (a: Rgb, b: Rgb): number => {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
};

/** A few stars, as shares of the sky's width and of the band from the top of the screen to the tree tops. */
export const STARS: [number, number, number][] = [
  [0.06, 0.2, 1.2], [0.15, 0.62, 0.9], [0.24, 0.1, 1], [0.33, 0.78, 1.3], [0.41, 0.34, 0.8], [0.5, 0.9, 1], [0.57, 0.16, 1.1],
  [0.66, 0.58, 0.9], [0.72, 0.3, 1.3], [0.86, 0.72, 1], [0.93, 0.14, 0.9], [0.97, 0.5, 1.1],
];
/** The night sky's art: stars and a moon (on the left, under the HUD's row), for a band `w` x `h` px. */
export function nightSky(w: number, h: number, moon: boolean): string {
  const stars = STARS.map(([x, y, r], i) => `<circle class="star s${i % 3}" cx="${(x * w).toFixed(1)}" cy="${(4 + y * (h - 8)).toFixed(1)}" r="${r}" fill="#fdf6d8"/>`).join('');
  const mx = w * 0.2, my = h - 22, r = 12;
  const art = moon
    ? `<circle cx="${mx}" cy="${my}" r="${r + 9}" fill="rgba(240, 236, 200, 0.12)"/><circle cx="${mx}" cy="${my}" r="${r}" fill="#f6efc8" stroke="#2b1e16" stroke-width="1.5"/>` +
      `<circle cx="${mx - 4}" cy="${my - 3}" r="2.6" fill="#ddd3a4"/><circle cx="${mx + 4}" cy="${my + 4}" r="1.8" fill="#ddd3a4"/><circle cx="${mx + 3}" cy="${my - 5}" r="1.2" fill="#ddd3a4"/>`
    : '';
  return `<svg class="night-sky" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" aria-hidden="true">${stars}${art}</svg>`;
}

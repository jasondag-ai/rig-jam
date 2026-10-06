// NIGHT (GAME_BIBLE, Oct 5): no level starts at night. On any level, when the player has made no
// move for a while (gag-triggers.ts `night`), the lease slowly fades to night; the next move brings
// the day back. At night the ground, berm, scenery and the strip's gags lie under one cool shade
// at about half brightness under a deep blue sky with a moon and stars; trucks, gates and symbols
// are dimmed much less so every colour reads; a warm glow round each flare flickers with its flame;
// each cab has small headlight glows. Pure numbers and rules here (tested); the look and the fades
// are in style.css ("Night").
import { GAG_TRIGGERS } from './gag-triggers.ts';
import type { Ground, ThemeId } from './themes.ts';

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
/** Does night ever fall on a level of this season? Montney's spring and Duvernay's winter: yes. Cardium's summer: never. */
export const nightComes = (theme: ThemeId): boolean => (GAG_TRIGGERS.night.themes as readonly string[]).includes(theme);
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

/**
 * Wildlife Log card art for NIGHT SHIFT: the pad at night with the flare glowing. A small picture
 * in the board's toy look: the dark blue shade, stars and a moon over the berm, a flare stack with
 * its warm glow on the ground, and one truck's headlights.
 */
export function nightStill(): string {
  const O = '#2a1a0c';
  const stars = [[12, 9], [30, 5], [52, 12], [88, 6], [104, 14], [70, 4]].map(([x, y], i) => `<circle cx="${x}" cy="${y}" r="${i % 2 ? 1.1 : 1.6}" fill="#fdf6d0"/>`).join('');
  return (
    '<svg class="egg-still night-still" viewBox="0 0 120 84" aria-hidden="true">' +
    '<defs><radialGradient id="ns-glow" cx="50%" cy="50%" r="50%"><stop offset="0" stop-color="#ffb347" stop-opacity=".85"/><stop offset=".55" stop-color="#ff9a2e" stop-opacity=".3"/><stop offset="1" stop-color="#ff9a2e" stop-opacity="0"/></radialGradient>' +
    '<radialGradient id="ns-lamp" cx="50%" cy="50%" r="50%"><stop offset="0" stop-color="#fff6c8" stop-opacity=".9"/><stop offset="1" stop-color="#fff6c8" stop-opacity="0"/></radialGradient></defs>' +
    `<rect x="2" y="2" width="116" height="80" rx="10" fill="#14203f" stroke="${O}" stroke-width="2.6"/>` +
    stars +
    `<circle cx="98" cy="20" r="7" fill="#f4efd2" stroke="${O}" stroke-width="1.6"/><circle cx="101" cy="18" r="6" fill="#14203f"/>` +
    // The berm along the top of the pad, and the pad itself, under the night's shade.
    `<path d="M2 40 Q20 32 40 36 Q64 31 86 36 Q104 33 118 39 L118 82 L2 82 Z" fill="#232b45" stroke="${O}" stroke-width="2"/>` +
    '<path d="M8 50 L112 50 L116 80 L4 80 Z" fill="#3a4160"/>' +
    // The flare's glow on the ground, then the stack and its flame.
    '<ellipse cx="44" cy="62" rx="34" ry="17" fill="url(#ns-glow)"/><circle cx="44" cy="28" r="20" fill="url(#ns-glow)"/>' +
    `<rect x="41.5" y="30" width="5" height="34" fill="#7d858f" stroke="${O}" stroke-width="1.8"/><rect x="38" y="62" width="12" height="5" rx="1.5" fill="#5d646d" stroke="${O}" stroke-width="1.6"/>` +
    `<path d="M44 12 Q52 22 48 29 Q44 33 40 29 Q36 22 44 12 Z" fill="#ff8a1c" stroke="${O}" stroke-width="1.8" stroke-linejoin="round"/><path d="M44 19 Q48 24 46 28 Q44 30 42 28 Q40 24 44 19 Z" fill="#ffe27a"/>` +
    // A truck parked in the dark, its headlights on.
    '<ellipse cx="104" cy="66" rx="13" ry="8" fill="url(#ns-lamp)"/>' +
    `<rect x="66" y="58" width="30" height="15" rx="4" fill="#a8362f" stroke="${O}" stroke-width="2"/><rect x="84" y="60" width="9" height="11" rx="2" fill="#7fa9c9" stroke="${O}" stroke-width="1.4"/>` +
    '</svg>'
  );
}

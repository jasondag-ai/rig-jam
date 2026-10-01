// Seasonal looks. A theme is a set of CSS variables plus a ground style for the pad.
// To give a new region a season, add (or reuse) a theme here and set `theme` on the region.

export type ThemeId = 'summer' | 'spring' | 'winter';

/** How the pad surface is decorated (see pad-decor.ts). */
export type Ground = 'gravel' | 'mud' | 'snow';

/** Every theme must set all of these. */
export const THEME_VARS = [
  '--sky-top', // top of the sky gradient behind the HUD
  '--sky-bottom', // sky at the horizon
  '--ground', // grass or snow outside the fence
  '--ground-dark', // patches and the bottom of the screen
  '--fence-color', // fence boards
  '--fence-post', // fence posts
  '--fence-cap', // snow along the fence top (transparent if none)
  '--pad', // the lease pad surface
  '--pad-light', // highlights on the pad
  '--pad-dark', // shadows, ruts, speckles on the pad
  '--pad-grid', // faint cell lines
  '--accent', // titles, Hint button, earned hats
  '--tree-spruce',
  '--tree-spruce-dark',
  '--tree-aspen',
  '--tree-aspen-dark',
  '--tree-bark',
  '--tree-frost', // snow on tree tiers (transparent if none)
  '--ob-ground', // footprint under obstacles
  '--truck-grime', // mud splatter on trucks' lower edge (transparent if none)
  '--truck-roof', // snow on truck roofs (transparent if none)
] as const;

export type ThemeVar = (typeof THEME_VARS)[number];

export interface Theme {
  id: ThemeId;
  name: string;
  ground: Ground;
  /** Share of spruce among border trees (the rest are aspen). */
  spruceShare: number;
  vars: Record<ThemeVar, string>;
}

const NONE = 'transparent';

export const THEMES: Record<ThemeId, Theme> = {
  summer: {
    id: 'summer',
    name: 'Summer',
    ground: 'gravel',
    spruceShare: 0.5,
    vars: {
      '--sky-top': '#4fb0ff',
      '--sky-bottom': '#c4ecff',
      '--ground': '#6cc24a',
      '--ground-dark': '#4c9a32',
      '--fence-color': '#7a4a22',
      '--fence-post': '#533013',
      '--fence-cap': NONE,
      '--pad': '#e8cb92',
      '--pad-light': '#f7e2b8',
      '--pad-dark': '#bf9a5c',
      '--pad-grid': 'rgba(120, 80, 30, 0.13)',
      '--accent': '#ffc21a',
      '--tree-spruce': '#2e9a52',
      '--tree-spruce-dark': '#1d6e39',
      '--tree-aspen': '#86d94e',
      '--tree-aspen-dark': '#58ad30',
      '--tree-bark': '#f4f1e6',
      '--tree-frost': NONE,
      '--ob-ground': 'rgba(120, 80, 30, 0.22)',
      '--truck-grime': NONE,
      '--truck-roof': NONE,
    },
  },
  spring: {
    id: 'spring',
    name: 'Spring mud',
    ground: 'mud',
    spruceShare: 0.55,
    vars: {
      '--sky-top': '#78c2f0',
      '--sky-bottom': '#e2f3f8',
      '--ground': '#a6b85c',
      '--ground-dark': '#7d8a3e',
      '--fence-color': '#6e4423',
      '--fence-post': '#4a2b12',
      '--fence-cap': NONE,
      '--pad': '#563019',
      '--pad-light': '#8a5532',
      '--pad-dark': '#2a1408',
      '--pad-grid': 'rgba(255, 220, 180, 0.09)',
      '--accent': '#ffc21a',
      '--tree-spruce': '#2b8048',
      '--tree-spruce-dark': '#1b5a31',
      '--tree-aspen': '#cbe87c',
      '--tree-aspen-dark': '#9ec257',
      '--tree-bark': '#efece2',
      '--tree-frost': NONE,
      '--ob-ground': 'rgba(20, 10, 4, 0.35)',
      '--truck-grime': '#4b2a15',
      '--truck-roof': NONE,
    },
  },
  winter: {
    id: 'winter',
    name: 'Winter',
    ground: 'snow',
    spruceShare: 0.85,
    vars: {
      '--sky-top': '#86b4dc',
      '--sky-bottom': '#e8f2fa',
      '--ground': '#f5f9fd',
      '--ground-dark': '#cfdff0',
      '--fence-color': '#74492a',
      '--fence-post': '#4f3019',
      '--fence-cap': '#ffffff',
      '--pad': '#e9f1f9',
      '--pad-light': '#ffffff',
      '--pad-dark': '#b4cbe2',
      '--pad-grid': 'rgba(60, 100, 150, 0.13)',
      '--accent': '#ffc21a',
      '--tree-spruce': '#23734b',
      '--tree-spruce-dark': '#16523a',
      '--tree-aspen': '#dbe7f1',
      '--tree-aspen-dark': '#b5c9dc',
      '--tree-bark': '#ece8dd',
      '--tree-frost': '#ffffff',
      '--ob-ground': 'rgba(60, 100, 150, 0.18)',
      '--truck-grime': NONE,
      '--truck-roof': '#ffffff',
    },
  },
};

/** Dev/testing override: add ?theme=winter (or summer/spring) to the URL to preview a theme. */
export function themeOverride(search: string): ThemeId | null {
  const id = new URLSearchParams(search).get('theme');
  return id && id in THEMES ? (id as ThemeId) : null;
}

/** Puts a theme's variables on an element (usually a whole screen). */
export function applyTheme(el: HTMLElement, theme: Theme): void {
  el.dataset.theme = theme.id;
  for (const [name, value] of Object.entries(theme.vars)) el.style.setProperty(name, value);
}

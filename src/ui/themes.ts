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
      '--ground': '#5a831f',
      '--ground-dark': '#386114',
      '--fence-color': '#7a4a22',
      '--fence-post': '#533013',
      '--fence-cap': NONE,
      '--pad': '#bea890',
      '--pad-light': '#d9c6ae',
      '--pad-dark': '#7d6650',
      '--pad-grid': 'rgba(60, 40, 20, 0.2)',
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
      '--ground': '#709926',
      '--ground-dark': '#477019',
      '--fence-color': '#6e4423',
      '--fence-post': '#4a2b12',
      '--fence-cap': NONE,
      '--pad': '#573f2e',
      '--pad-light': '#8a6e57',
      '--pad-dark': '#2e1c10',
      '--pad-grid': 'rgba(255, 225, 190, 0.15)',
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
      '--ground': '#b9aea6',
      '--ground-dark': '#827267',
      '--fence-color': '#74492a',
      '--fence-post': '#4f3019',
      '--fence-cap': '#ffffff',
      '--pad': '#e0e8f5',
      '--pad-light': '#f9fbfd',
      '--pad-dark': '#a9c0de',
      '--pad-grid': 'rgba(50, 85, 135, 0.18)',
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
  groundTextures(el, theme.id);
}

/** The season's ground photos (public/sprites/ground, from tools/ground-tiles.py): pad and grass. */
export const groundTiles = (id: string) => [`./sprites/ground/pad-${id}.webp`, `./sprites/ground/grass-${id}.webp`];
const loaded = new Map<string, Promise<boolean>>();
const loadTile = (src: string) => {
  let p = loaded.get(src);
  if (!p) {
    p = new Promise<boolean>((resolve) => {
      const img = new Image();
      img.onload = () => resolve(true);
      img.onerror = () => resolve(false);
      img.src = src;
    });
    loaded.set(src, p);
  }
  return p;
};
const ready = new Set<string>();

/**
 * Puts the season's textures on a screen (`.ground-tex`) once both have loaded; until then, or if
 * they fail, the flat theme colors and drawn pad detail stand in. Instant once cached.
 */
function groundTextures(el: HTMLElement, id: string): void {
  if (typeof Image === 'undefined') return;
  const [pad, grass] = groundTiles(id).map((src) => `url("${new URL(src, location.href).href}")`);
  el.style.setProperty('--pad-tile', pad);
  el.style.setProperty('--grass-tile', grass);
  if (ready.has(id)) return void el.classList.add('ground-tex');
  void Promise.all(groundTiles(id).map(loadTile)).then((ok) => {
    if (!ok.every(Boolean)) return;
    ready.add(id);
    if (el.dataset.theme === id) el.classList.add('ground-tex');
  });
}

import type { Season } from './trees.ts';

// Seasonal looks. A theme is a set of CSS variables plus a ground style for the pad.
// To give a new region a season, add (or reuse) a theme here and set `theme` on the region.

export type ThemeId = 'summer' | 'spring' | 'winter' | 'fall' | 'prairie' | 'boreal' | 'thaw';

/** The pad's surface: picks the base image, the ground detail (lease-detail.ts), the berm and the tracks. */
export type Ground = 'gravel' | 'mud' | 'snow';

/** Every theme must set all of these. */
export const THEME_VARS = [
  '--sky-top', // top of the sky gradient behind the HUD
  '--sky-bottom', // sky at the horizon
  '--ground', // grass or snow outside the berm
  '--ground-dark', // patches and the bottom of the screen
  '--pad', // the lease pad surface
  '--pad-light', // highlights on the pad
  '--pad-dark', // shadows, ruts, speckles on the pad
  '--accent', // titles, Hint button, earned hats
  '--tree-spruce',
  '--tree-spruce-dark',
  '--tree-aspen',
  '--tree-aspen-dark',
  '--tree-bark',
  '--tree-frost', // snow on tree tiers (transparent if none)
  '--ob-ground', // footprint under obstacles
] as const;

export type ThemeVar = (typeof THEME_VARS)[number];

export interface Theme {
  id: ThemeId;
  name: string;
  ground: Ground;
  /** Share of spruce among border trees (the rest are aspen). */
  spruceShare: number;
  /** Which drawing of the trees (trees.ts): leaf colour, snow. */
  season: Season;
  /** How much of the usual tree cover stands (1 = boreal forest; the prairie keeps a shelterbelt's worth). */
  trees: number;
  /** A berm of pale sand (Clearwater) in place of the ground's own dirt. */
  berm?: 'sand';
  vars: Record<ThemeVar, string>;
}

const NONE = 'transparent';

export const THEMES: Record<ThemeId, Theme> = {
  summer: {
    id: 'summer',
    name: 'Summer',
    ground: 'gravel',
    spruceShare: 0.5,
    season: 'summer',
    trees: 1,
    vars: {
      '--sky-top': '#4fb0ff',
      '--sky-bottom': '#c4ecff',
      '--ground': '#5a831f',
      '--ground-dark': '#386114',
      '--pad': '#bea890',
      '--pad-light': '#d9c6ae',
      '--pad-dark': '#7d6650',
      '--accent': '#ffc21a',
      '--tree-spruce': '#2e9a52',
      '--tree-spruce-dark': '#1d6e39',
      '--tree-aspen': '#86d94e',
      '--tree-aspen-dark': '#58ad30',
      '--tree-bark': '#f4f1e6',
      '--tree-frost': NONE,
      '--ob-ground': 'rgba(120, 80, 30, 0.22)',
    },
  },
  spring: {
    id: 'spring',
    name: 'Spring mud',
    ground: 'mud',
    spruceShare: 0.55,
    season: 'spring',
    trees: 1,
    vars: {
      '--sky-top': '#7fa3bd',
      '--sky-bottom': '#d9e2e6',
      '--ground': '#465325',
      '--ground-dark': '#2f3a18',
      '--pad': '#573f2e',
      '--pad-light': '#8a6e57',
      '--pad-dark': '#2e1c10',
      '--accent': '#ffc21a',
      '--tree-spruce': '#2b8048',
      '--tree-spruce-dark': '#1b5a31',
      '--tree-aspen': '#cbe87c',
      '--tree-aspen-dark': '#9ec257',
      '--tree-bark': '#efece2',
      '--tree-frost': NONE,
      '--ob-ground': 'rgba(20, 10, 4, 0.35)',
    },
  },
  winter: {
    id: 'winter',
    name: 'Winter',
    ground: 'snow',
    spruceShare: 0.85,
    season: 'winter',
    trees: 1,
    vars: {
      '--sky-top': '#86b4dc',
      '--sky-bottom': '#e8f2fa',
      '--ground': '#c5d2e8',
      '--ground-dark': '#9fb1d0',
      '--pad': '#edf2fa',
      '--pad-light': '#f9fbfd',
      '--pad-dark': '#a9c0de',
      '--accent': '#ffc21a',
      '--tree-spruce': '#23734b',
      '--tree-spruce-dark': '#16523a',
      '--tree-aspen': '#dbe7f1',
      '--tree-aspen-dark': '#b5c9dc',
      '--tree-bark': '#ece8dd',
      '--tree-frost': '#ffffff',
      '--ob-ground': 'rgba(60, 100, 150, 0.18)',
    },
  },
  // Mannville, late fall: dry tan grass, gold aspen thinning out among the spruce, a pale overcast
  // sky, and a pad of cold grey-brown dirt (muskeg country: the dark peat patches are the level's own).
  fall: {
    id: 'fall',
    name: 'Late fall',
    ground: 'gravel',
    spruceShare: 0.45,
    season: 'fall',
    trees: 1,
    vars: {
      '--sky-top': '#8fa6b8',
      '--sky-bottom': '#e3e6e2',
      '--ground': '#82703f',
      '--ground-dark': '#5e502b',
      '--pad': '#a8977e',
      '--pad-light': '#c7b79e',
      '--pad-dark': '#6c5c48',
      '--accent': '#ffc21a',
      '--tree-spruce': '#2b7a4a',
      '--tree-spruce-dark': '#1c5936',
      '--tree-aspen': '#f6cf55',
      '--tree-aspen-dark': '#e0a52c',
      '--tree-bark': '#f1ede1',
      '--tree-frost': NONE,
      '--ob-ground': 'rgba(70, 50, 24, 0.24)',
    },
  },
  // Bakken, flat prairie: canola stubble to the horizon under a big blue sky, hardly a tree (a
  // shelterbelt's worth), and a pad of pale dry clay.
  prairie: {
    id: 'prairie',
    name: 'Prairie',
    ground: 'gravel',
    spruceShare: 0.1,
    season: 'summer',
    trees: 0.14,
    vars: {
      '--sky-top': '#4f9fe6',
      '--sky-bottom': '#dceefc',
      '--ground': '#a99e62',
      '--ground-dark': '#857a48',
      '--pad': '#cdbb97',
      '--pad-light': '#e3d4b6',
      '--pad-dark': '#8c7a5c',
      '--accent': '#ffc21a',
      '--tree-spruce': '#2e9a52',
      '--tree-spruce-dark': '#1d6e39',
      '--tree-aspen': '#86d94e',
      '--tree-aspen-dark': '#58ad30',
      '--tree-bark': '#f4f1e6',
      '--tree-frost': NONE,
      '--ob-ground': 'rgba(110, 86, 40, 0.22)',
    },
  },
  // Clearwater (the Big Pad), boreal fall: pale reindeer lichen and moss over sand (the ground's
  // sage is the reference strip's own, #aeb486), gold aspen among dark spruce, a clear cool sky,
  // and a pad of pale sand (the sandy two-track's colour, a step greyer so the trucks stand out).
  boreal: {
    id: 'boreal',
    name: 'Boreal fall',
    ground: 'gravel',
    berm: 'sand',
    spruceShare: 0.55,
    season: 'fall',
    trees: 1,
    vars: {
      '--sky-top': '#6fb0e0',
      '--sky-bottom': '#dcecf2',
      '--ground': '#adb58a',
      '--ground-dark': '#858c58',
      '--pad': '#c4b28c',
      '--pad-light': '#dccba6',
      '--pad-dark': '#8a7854',
      '--accent': '#ffc21a',
      '--tree-spruce': '#2f7a4c',
      '--tree-spruce-dark': '#1f5b38',
      '--tree-aspen': '#f3cb5f',
      '--tree-aspen-dark': '#e1a838',
      '--tree-bark': '#ece6da',
      '--tree-frost': NONE,
      '--ob-ground': 'rgba(100, 80, 40, 0.22)',
    },
  },
  // Baldonnel, northeast BC at spring breakup: last year's dead khaki grass with the last snow lying in it (the
  // reference strip's #9a8c5e), black spruce and bare aspen, a pale washed sky. The pad is frost-firm grey gravel,
  // cold and a step lighter than Montney's mud, so the dark thawed patches (floor-art.ts `soft`) read at a glance.
  thaw: {
    id: 'thaw',
    name: 'Spring breakup',
    ground: 'gravel',
    spruceShare: 0.8,
    season: 'thaw',
    trees: 0.8,
    vars: {
      '--sky-top': '#7fa9c9',
      '--sky-bottom': '#e6edf0',
      '--ground': '#968f5e',
      '--ground-dark': '#6f6942',
      '--pad': '#b0a898',
      '--pad-light': '#cbc4b6',
      '--pad-dark': '#6f685c',
      '--accent': '#ffc21a',
      '--tree-spruce': '#2a4a38',
      '--tree-spruce-dark': '#1c3327',
      '--tree-aspen': '#9aa86a',
      '--tree-aspen-dark': '#7a8850',
      '--tree-bark': '#ece8dd',
      '--tree-frost': NONE,
      '--ob-ground': 'rgba(60, 54, 44, 0.24)',
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

/**
 * The season's ground outside the berm (public/sprites/ground, from tools/ground-tiles.py): a grass
 * field, or snow in winter. The pad itself has no image: it is the theme's flat `--pad` colour plus
 * the level's code-drawn fields and marks (lease-detail.ts).
 */
export const groundTiles = (id: string) => [`./sprites/ground/grass-${id}.webp`];
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
 * Puts the season's outside ground on a screen (`.ground-tex`) once it has loaded; until then, or
 * if it fails, the flat theme color stands in. Instant once cached.
 */
function groundTextures(el: HTMLElement, id: string): void {
  if (typeof Image === 'undefined') return;
  const [grass] = groundTiles(id).map((src) => `url("${new URL(src, location.href).href}")`);
  el.style.setProperty('--grass-tile', grass);
  if (ready.has(id)) return void el.classList.add('ground-tex');
  void Promise.all(groundTiles(id).map(loadTile)).then((ok) => {
    if (!ok.every(Boolean)) return;
    ready.add(id);
    if (el.dataset.theme === id) el.classList.add('ground-tex');
  });
}

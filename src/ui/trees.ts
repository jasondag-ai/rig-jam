// Scenery art in the board's toy look (ART_BIBLE 1), drawn in code: white spruce, trembling aspen
// and willow, each in three sizes and four seasons (summer, spring buds, winter snow, and late
// fall: gold aspen thinning out, rusty willow), plus the
// cattail clump and the blank lease sign. Flat two-tone shapes (a lit left side), a small shadow
// under each tier, and the trucks' dark outline at one weight whatever the tree's size on screen.
// No photo sprites. scenery.ts places them; each drawing is a <symbol> used many times.

export type Species = 'spruce' | 'aspen' | 'willow' | 'cattails' | 'sign';
/** (`thaw`: Baldonnel at spring breakup. Black spruce, dark and dull; aspen and willow only just in bud.) */
export type Season = 'summer' | 'spring' | 'winter' | 'fall' | 'thaw';
/** 0 small, 1 medium, 2 large: three different drawings, not one drawing scaled. */
export type TreeSize = 0 | 1 | 2;

/** Each species' drawing box: [width, height]. */
export const BOX: Record<Species, [number, number]> = { spruce: [60, 100], aspen: [60, 100], willow: [80, 56], cattails: [40, 60], sign: [50, 60] };
/** Width / height of a species' drawing. */
export const aspect = (s: Species) => BOX[s][0] / BOX[s][1];

const OUTLINE = '#2a1a0c';
/** The outline: one weight on screen however big the tree is drawn. */
const INK = `stroke="${OUTLINE}" stroke-width="1.5" stroke-linejoin="round" stroke-linecap="round" vector-effect="non-scaling-stroke"`;
const r1 = (n: number) => Math.round(n * 10) / 10;

interface Tones {
  dark: string;
  light: string;
  shade: string;
}
const SPRUCE: Record<Season, Tones> = {
  summer: { dark: '#2f8f4e', light: '#49b866', shade: '#1f6b39' },
  spring: { dark: '#33924a', light: '#58c064', shade: '#226d37' },
  winter: { dark: '#2c7a55', light: '#3f9a6c', shade: '#1d5a40' },
  fall: { dark: '#2b7a4a', light: '#3f9c5e', shade: '#1c5936' },
  thaw: { dark: '#2b4a39', light: '#3d6049', shade: '#1f3528' },
};
const ASPEN: Record<Season, Tones> = {
  summer: { dark: '#5fb43c', light: '#8fd957', shade: '#3f8f2a' },
  spring: { dark: '#b9d46a', light: '#dcee9c', shade: '#93b04c' },
  winter: { dark: '#ffffff', light: '#ffffff', shade: '#b9cbe6' },
  fall: { dark: '#e0a52c', light: '#f6cf55', shade: '#b97a1c' },
  thaw: { dark: '#a3a66c', light: '#c2c48c', shade: '#80834e' },
};
const WILLOW: Record<Season, Tones> = {
  summer: { dark: '#6f9638', light: '#95bf4a', shade: '#4f7426' },
  spring: { dark: '#a9c25a', light: '#cfe183', shade: '#869c40' },
  winter: { dark: '#ffffff', light: '#ffffff', shade: '#b9cbe6' },
  fall: { dark: '#b8763a', light: '#d99a4e', shade: '#8a5326' },
  thaw: { dark: '#a8674a', light: '#c98a66', shade: '#7f4733' },
};
const SNOW = '#ffffff';
const SNOW_SHADE = '#b9cbe6';

/** White spruce: stacked tiers, narrower toward the top; two, three or four of them. */
function spruce(season: Season, size: TreeSize): string {
  const t = SPRUCE[season];
  const n = 2 + size;
  const tierH = 84 / (n * 0.6 + 0.4);
  let out = `<rect x="26.5" y="84" width="7" height="14" rx="1.5" fill="#7a5230" ${INK}/>`;
  const tiers = Array.from({ length: n }, (_, i) => {
    const base = 89 - i * tierH * 0.6;
    return { base, apex: base - tierH, w: 27 * (1 - i / (n + 0.9)) };
  });
  tiers.forEach(({ base, apex, w }, i) => {
    out += `<path d="M${r1(30 - w)} ${r1(base)} Q30 ${r1(base + 5)} ${r1(30 + w)} ${r1(base)} L30 ${r1(apex)} Z" fill="${t.dark}" ${INK}/>`;
    // Lit left side.
    out += `<path d="M${r1(30 - w + 2.5)} ${r1(base - 0.8)} Q${r1(30 - w * 0.4)} ${r1(base + 2.6)} 30 ${r1(base + 1.6)} L30 ${r1(apex + 5)} Z" fill="${t.light}"/>`;
    // The tier above casts a small shadow on this one.
    const up = tiers[i + 1];
    if (up) out += `<path d="M${r1(30 - up.w + 1)} ${r1(up.base + 0.5)} Q30 ${r1(up.base + 10)} ${r1(30 + up.w - 1)} ${r1(up.base + 0.5)} Q30 ${r1(up.base + 5)} ${r1(30 - up.w + 1)} ${r1(up.base + 0.5)} Z" fill="${t.shade}"/>`;
    if (season === 'winter') {
      // Snow lying on the tier: a cap with a scalloped lower edge and a cool shade on its right.
      const drop = tierH * 0.56;
      const sw = w * 0.62;
      const cap = `M30 ${r1(apex)} L${r1(30 - sw)} ${r1(apex + drop)} Q${r1(30 - sw * 0.55)} ${r1(apex + drop * 0.72)} ${r1(30 - sw * 0.2)} ${r1(apex + drop)} Q${r1(30 + sw * 0.2)} ${r1(apex + drop * 0.74)} ${r1(30 + sw * 0.5)} ${r1(apex + drop)} Q${r1(30 + sw * 0.8)} ${r1(apex + drop * 0.82)} ${r1(30 + sw)} ${r1(apex + drop)} Z`;
      out += `<path d="${cap}" fill="${SNOW}" ${INK}/><path d="M30 ${r1(apex + 3)} L${r1(30 + sw * 0.86)} ${r1(apex + drop - 1.5)} Q${r1(30 + sw * 0.5)} ${r1(apex + drop * 0.84)} 30 ${r1(apex + drop * 0.9)} Z" fill="${SNOW_SHADE}"/>`;
    }
  });
  return out;
}

/** A clump of round lobes drawn as one shape: outlines first, then the fills over the inner lines. */
function lobes(list: [number, number, number][], t: Tones, squash = 1): string {
  const el = (cx: number, cy: number, r: number, extra: string) => `<ellipse cx="${r1(cx)}" cy="${r1(cy)}" rx="${r1(r)}" ry="${r1(r * squash)}" ${extra}/>`;
  return (
    list.map(([x, y, r]) => el(x, y, r, `fill="${t.dark}" ${INK} stroke-width="3"`)).join('') +
    list.map(([x, y, r]) => el(x, y, r, `fill="${t.dark}"`)).join('') +
    // A small shadow low on the right of each lobe, and the lit top left.
    list.map(([x, y, r]) => el(x + r * 0.2, y + r * squash * 0.42, r * 0.66, `fill="${t.shade}"`)).join('') +
    list.map(([x, y, r]) => el(x - r * 0.08, y - r * squash * 0.1, r * 0.8, `fill="${t.dark}"`)).join('') +
    list.map(([x, y, r]) => el(x - r * 0.28, y - r * squash * 0.3, r * 0.5, `fill="${t.light}"`)).join('')
  );
}

const ASPEN_LOBES: [number, number, number][][] = [
  [[30, 34, 19], [22, 46, 11]],
  [[30, 26, 17], [19, 42, 14], [41, 44, 13]],
  [[30, 20, 15], [17, 34, 14], [43, 35, 14], [30, 48, 15]],
];

/** Trembling aspen: a slim white trunk with dark marks under a round canopy; bare with snow in winter. */
function aspen(season: Season, size: TreeSize): string {
  const t = ASPEN[season];
  const trunkTop = season === 'winter' ? 14 : 34;
  let out = `<path d="M27 98 L28 ${trunkTop} L32 ${trunkTop} L33.5 98 Z" fill="#f3efe2" ${INK}/>` + `<path d="M28.4 84 h3 M29 70 h3.4 M28.2 58 h2.6" stroke="${OUTLINE}" stroke-width="1.6" fill="none" vector-effect="non-scaling-stroke"/>`;
  if (season === 'winter') {
    // Bare branches reaching up, with snow sitting on them.
    const reach = 12 + size * 4;
    const limbs: [number, number, number, number][] = [
      [30, 60, 30 - reach, 44],
      [30, 52, 30 + reach, 36],
      [30, 40, 30 - reach * 0.8, 24],
      [30, 32, 30 + reach * 0.7, 16],
    ];
    out += limbs.map(([x1, y1, x2, y2]) => `<path d="M${x1} ${y1} L${r1(x2)} ${y2}" stroke="${OUTLINE}" stroke-width="2" fill="none" stroke-linecap="round" vector-effect="non-scaling-stroke"/>`).join('');
    out += limbs.map(([, , x2, y2]) => `<ellipse cx="${r1(x2)}" cy="${y2 - 2}" rx="${5 + size}" ry="3.4" fill="${SNOW}" ${INK}/>`).join('');
    out += `<ellipse cx="30" cy="12" rx="${5 + size}" ry="3.6" fill="${SNOW}" ${INK}/>`;
    return out;
  }
  // Spring: the canopy is only coming in, so it is smaller and the buds show. Late fall: it is thinning out.
  const k = season === 'spring' ? 0.84 : season === 'fall' ? 0.8 : 1;
  const list = ASPEN_LOBES[size].map(([x, y, r]) => [30 + (x - 30) * k, y + (1 - k) * 8, r * k] as [number, number, number]);
  out += lobes(list, t);
  if (season === 'spring') out += list.map(([x, y, r]) => `<circle cx="${r1(x + r * 0.3)}" cy="${r1(y - r * 0.2)}" r="1.6" fill="#f4f9c6"/><circle cx="${r1(x - r * 0.1)}" cy="${r1(y + r * 0.45)}" r="1.4" fill="#f4f9c6"/>`).join('');
  return out;
}

const WILLOW_LOBES: [number, number, number][][] = [
  [[30, 36, 18], [50, 38, 16]],
  [[24, 36, 18], [44, 30, 19], [60, 38, 15]],
  [[18, 38, 16], [34, 28, 19], [52, 28, 18], [64, 39, 14]],
];

/** Willow shrub: a low clump of leafy lobes; bare twigs under a cap of snow in winter. */
function willow(season: Season, size: TreeSize): string {
  const t = WILLOW[season];
  const list = WILLOW_LOBES[size];
  if (season === 'winter') {
    const mid = list.reduce((a, [x]) => a + x, 0) / list.length;
    const twigs = Array.from({ length: 7 }, (_, i) => {
      const a = -2.5 + (i / 6) * 1.9;
      return `M${r1(mid)} 52 Q${r1(mid + Math.cos(a) * 12)} ${r1(48 + Math.sin(a) * 10)} ${r1(mid + Math.cos(a) * (22 + size * 3))} ${r1(50 + Math.sin(a) * (30 + size * 3))}`;
    }).join(' ');
    return (
      `<path d="${twigs}" stroke="#7a5230" stroke-width="2" fill="none" stroke-linecap="round" vector-effect="non-scaling-stroke"/>` +
      lobes(list.map(([x, y, r]) => [x, y - 6, r * 0.62] as [number, number, number]), t, 0.6) +
      `<ellipse cx="${r1(mid)}" cy="52" rx="${18 + size * 4}" ry="3.6" fill="${SNOW}" ${INK}/>`
    );
  }
  let out = lobes(list, t, 0.82);
  // A few stems showing at the base.
  out += `<path d="${list.map(([x]) => `M${x} 53 L${r1(x + 1)} 46`).join(' ')}" stroke="#5a3d22" stroke-width="1.6" fill="none" stroke-linecap="round" vector-effect="non-scaling-stroke"/>`;
  if (season === 'spring') out += list.map(([x, y, r]) => `<circle cx="${r1(x + r * 0.3)}" cy="${r1(y - r * 0.25)}" r="1.7" fill="#f4f9c6"/><circle cx="${r1(x - r * 0.35)}" cy="${r1(y + r * 0.2)}" r="1.5" fill="#f4f9c6"/>`).join('');
  return out;
}

/** A clump of cattails: three stalks with brown heads and a couple of blade leaves. */
const CATTAILS =
  `<path d="M12 60 Q8 36 4 22 M30 60 Q34 38 37 26 M20 60 Q22 40 26 30" stroke="#4f8a2a" stroke-width="2.4" fill="none" stroke-linecap="round" vector-effect="non-scaling-stroke"/>` +
  [[14, 60, 13, 12], [22, 60, 21, 4], [29, 60, 30, 16]]
    .map(([x1, y1, x2, y2]) => `<path d="M${x1} ${y1} L${x2} ${y2}" stroke="#3f7422" stroke-width="2" fill="none" stroke-linecap="round" vector-effect="non-scaling-stroke"/><rect x="${x2 - 2.8}" y="${y2}" width="5.6" height="15" rx="2.8" fill="#7a4a24" ${INK}/>`)
    .join('');

/** The blank lease sign: a white board on two posts (never any text: ART_BIBLE 2). */
const SIGN = `<rect x="9" y="26" width="5" height="32" rx="1" fill="#8a6238" ${INK}/><rect x="36" y="26" width="5" height="32" rx="1" fill="#8a6238" ${INK}/>` + `<rect x="3" y="6" width="44" height="26" rx="2.5" fill="#fbf8ee" ${INK}/><path d="M7 10 L43 10" stroke="#ffffff" stroke-width="2" fill="none" vector-effect="non-scaling-stroke"/><rect x="3" y="27" width="44" height="5" fill="#d9d3c2"/><rect x="3" y="6" width="44" height="26" rx="2.5" fill="none" ${INK}/>`;

/** The inner drawing for a species, season and size. */
export function treeArt(species: Species, season: Season, size: TreeSize): string {
  if (species === 'spruce') return spruce(season, size);
  if (species === 'aspen') return aspen(season, size);
  if (species === 'willow') return willow(season, size);
  return species === 'cattails' ? CATTAILS : SIGN;
}

/** The id of the <symbol> for a drawing. */
export const symbolId = (species: Species, season: Season, size: TreeSize) => `t-${species}-${season}-${size}`;

/** Every symbol a season's scenery can use, to put once in a hidden <svg>. */
export function seasonSymbols(season: Season): string {
  let out = '';
  for (const species of ['spruce', 'aspen', 'willow'] as const)
    for (const size of [0, 1, 2] as const) out += `<symbol id="${symbolId(species, season, size)}" viewBox="0 0 ${BOX[species][0]} ${BOX[species][1]}">${treeArt(species, season, size)}</symbol>`;
  for (const species of ['cattails', 'sign'] as const) out += `<symbol id="${symbolId(species, season, 0)}" viewBox="0 0 ${BOX[species][0]} ${BOX[species][1]}">${treeArt(species, season, 0)}</symbol>`;
  return out;
}

/** Which of the three drawings to use for a tree shown `h` px tall. */
export const sizeFor = (species: Species, h: number): TreeSize => (species === 'cattails' || species === 'sign' ? 0 : h < (species === 'willow' ? 20 : 34) ? 0 : h < (species === 'willow' ? 30 : 58) ? 1 : 2);

/** A standalone drawing (its own <svg>, not a <use>): for a single piece outside the scenery layer. */
export function treeSvg(species: Species, season: Season, size: TreeSize): string {
  return `<svg viewBox="0 0 ${BOX[species][0]} ${BOX[species][1]}" aria-hidden="true" style="display:block;width:100%;height:100%;overflow:visible">${treeArt(species, season, size)}</svg>`;
}

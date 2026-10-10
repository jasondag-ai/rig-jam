// The floor of regions 4, 5 and 7 (SOFT GROUND: `softSvg`), drawn in code in the board's toy look (flat shapes, one light from
// the top left, the trucks' dark outline): MUSKEG, a patch of dark peat with a wet sheen, and the
// LOAD RACK, a small steel platform with a hose. Both are floor: trucks drive over them. Pure.
import { mulberry32 } from '../engine/rng.ts';

const O = '#2a1a0c';
const r1 = (n: number) => Math.round(n * 10) / 10;

/**
 * Muskeg: a ragged patch of dark peat that fills its cell (so neighbouring patches read as one
 * bog), a paler wet rim, a few glints of standing water with a sheen, and tufts of sedge.
 * Seeded by its cell, so every patch differs and a level always looks the same.
 */
export function muskegSvg(seed: number): string {
  const rng = mulberry32(seed * 7919 + 17);
  // A wobbly outline round the cell, a little inside its edges.
  const pts: [number, number][] = [];
  const n = 14;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    const r = 55 + rng() * 6;
    // A squarish blob: push the corners out so it nearly fills the cell.
    const k = 1 / Math.max(Math.abs(Math.cos(a)), Math.abs(Math.sin(a))) ** 0.7;
    pts.push([50 + Math.cos(a) * r * k, 50 + Math.sin(a) * r * k]);
  }
  const path = (scale: number) =>
    pts.map(([x, y], i) => {
      const [px, py] = pts[(i + n - 1) % n];
      const s = (v: number) => r1(50 + (v - 50) * scale);
      return `${i ? 'Q' : 'M'}${i ? `${s(px)} ${s(py)} ` : ''}${s((px + x) / 2)} ${s((py + y) / 2)}`;
    }).join(' ') + ' Z';
  const pools = Array.from({ length: 3 }, () => ({ x: 24 + rng() * 52, y: 26 + rng() * 50, rx: 7 + rng() * 9, ry: 3 + rng() * 3.5, t: -18 + rng() * 36 }));
  const tufts = Array.from({ length: 4 }, () => ({ x: 14 + rng() * 72, y: 18 + rng() * 66 }));
  return (
    `<svg class="floor-art muskeg-art" viewBox="0 0 100 100" aria-hidden="true">` +
    `<path d="${path(1)}" fill="#4a3a26" stroke="${O}" stroke-width="2.2" stroke-linejoin="round" opacity="0.92"/>` +
    `<path d="${path(0.88)}" fill="#2c2117"/>` +
    `<path d="${path(0.7)}" fill="#1f1710" opacity="0.8"/>` +
    pools.map((p) => `<g transform="rotate(${r1(p.t)} ${r1(p.x)} ${r1(p.y)})"><ellipse cx="${r1(p.x)}" cy="${r1(p.y)}" rx="${r1(p.rx)}" ry="${r1(p.ry)}" fill="#3d4a4f"/><path d="M${r1(p.x - p.rx * 0.6)} ${r1(p.y - p.ry * 0.25)} q${r1(p.rx * 0.5)} ${r1(-p.ry * 0.7)} ${r1(p.rx)} 0" stroke="#c9dde6" stroke-width="1.6" fill="none" stroke-linecap="round" opacity="0.85"/></g>`).join('') +
    tufts.map((t) => `<path d="M${r1(t.x)} ${r1(t.y)} l-3 -8 M${r1(t.x)} ${r1(t.y)} l0.5 -10 M${r1(t.x)} ${r1(t.y)} l3.5 -7" stroke="#8a8f3c" stroke-width="1.8" fill="none" stroke-linecap="round"/>`).join('') +
    `</svg>`
  );
}

/**
 * SOFT GROUND, a road ban patch (Baldonnel): the frost has gone out of this cell. Drawn simply and WHOLLY INSIDE ITS
 * OWN CELL (Jay, Oct 10: the first drawing ran past the cell, so beside the berm the yard's clip cut it off, and it
 * showed whole whenever the clip lifted for a truck driving out: it flickered). A rounded patch of dark wet mud, two
 * water-filled wheel ruts, and a thin rim of the last snow just inside its edge, which shows on both sides of a
 * pickup standing on it. Browner and wetter than muskeg's black peat, with no sedge. Seeded by its cell.
 * `SOFT_INSET`: nothing of it comes nearer the cell's edge than this (of 100).
 */
export const SOFT_INSET = 3;
export function softSvg(seed: number): string {
  const rng = mulberry32(seed * 6151 + 29);
  // A rounded square, a little uneven: its corners' radii and its sides' bulge differ from patch to patch.
  const lo = SOFT_INSET + 3, hi = 100 - SOFT_INSET - 3;
  const shape = (inset: number, wob: number[]) => {
    const a = lo + inset, b = hi - inset, r = 15 - inset * 0.5;
    const [w0, w1, w2, w3] = wob;
    return `M${r1(a + r)} ${r1(a + w0)} Q50 ${r1(a - w0)} ${r1(b - r)} ${r1(a + w1)} Q${r1(b)} ${r1(a)} ${r1(b - w1)} ${r1(a + r)} Q${r1(b + w1)} 50 ${r1(b - w2)} ${r1(b - r)} Q${r1(b)} ${r1(b)} ${r1(b - r)} ${r1(b - w2)} Q50 ${r1(b + w2)} ${r1(a + r)} ${r1(b - w3)} Q${r1(a)} ${r1(b)} ${r1(a + w3)} ${r1(b - r)} Q${r1(a - w3)} 50 ${r1(a + w0)} ${r1(a + r)} Q${r1(a)} ${r1(a)} ${r1(a + r)} ${r1(a + w0)} Z`;
  };
  const wob = Array.from({ length: 4 }, () => rng() * 1.8);
  // The mud inside the snow: the rim is thin, and a little thicker here and thinner there.
  const inner = Array.from({ length: 4 }, () => rng() * 1.6);
  // Two ruts lying across the patch, one way or the other, each with a small wobble, well inside the mud.
  const across = rng() < 0.5, gap = 12 + rng() * 3;
  const rut = (k: number) => {
    const c = 50 + k * gap, w = () => r1(c + rng() * 3 - 1.5);
    return across ? `M22 ${w()} Q36 ${w()} 50 ${w()} T78 ${w()}` : `M${w()} 22 Q${w()} 36 ${w()} 50 T${w()} 78`;
  };
  const ruts = [rut(-1), rut(1)];
  const clods = Array.from({ length: 4 }, () => ({ x: 24 + rng() * 52, y: 24 + rng() * 52, r: 1.4 + rng() * 1.3 }));
  return (
    `<svg class="floor-art soft-art" viewBox="0 0 100 100" aria-hidden="true">` +
    // The snow rim (the whole patch's outline), its shaded foot, then the mud inside it.
    `<path d="${shape(0, wob)}" fill="#f2f6f9" stroke="${O}" stroke-width="2.2" stroke-linejoin="round"/>` +
    `<path d="${shape(3.4, inner)}" fill="#b4c2d0"/>` +
    `<path d="${shape(5, inner)}" fill="#4a3a26" stroke="${O}" stroke-width="1.4" stroke-opacity="0.55" stroke-linejoin="round"/>` +
    `<path d="${shape(12, wob)}" fill="#3d2f1e" opacity="0.85"/>` +
    ruts.map((d) => `<path d="${d}" fill="none" stroke="#231a10" stroke-width="8" stroke-linecap="round"/><path d="${d}" fill="none" stroke="#6f7d86" stroke-width="4" stroke-linecap="round"/><path d="${d}" fill="none" stroke="#b9c8d2" stroke-width="1.2" stroke-linecap="round" stroke-dasharray="8 12" opacity="0.9"/>`).join('') +
    clods.map((c) => `<circle cx="${r1(c.x)}" cy="${r1(c.y)}" r="${r1(c.r)}" fill="#7d6748"/>`).join('') +
    `</svg>`
  );
}

/**
 * The load rack: a steel loading platform set in the pad (checker plate, a yellow safety edge), a
 * riser with a red valve at one corner and a black hose coiled across with its nozzle. `across`:
 * the tanker that loads here drives left-right ('h') or up-down ('v'); the hose lies across its lane.
 */
export function rackSvg(lane: 'h' | 'v'): string {
  const plate = Array.from({ length: 5 }, (_, i) => `M${22 + i * 14} 20 L${22 + i * 14} 80`).join(' ');
  return (
    `<svg class="floor-art rack-art" viewBox="0 0 100 100" aria-hidden="true"><g transform="${lane === 'v' ? 'rotate(90 50 50)' : ''}">` +
    `<rect x="8" y="12" width="84" height="76" rx="7" fill="#f2c230" stroke="${O}" stroke-width="2.4"/>` +
    `<path d="M8 30 L26 12 M8 54 L50 12 M8 78 L74 12 M26 88 L92 22 M50 88 L92 46 M74 88 L92 70" stroke="${O}" stroke-width="5" opacity="0.8"/>` +
    `<rect x="15" y="19" width="70" height="62" rx="4" fill="#aab3bd" stroke="${O}" stroke-width="2"/>` +
    `<path d="${plate}" stroke="#8a939d" stroke-width="2"/>` +
    `<path d="M17 22 L83 22" stroke="#d5dbe2" stroke-width="2.4" stroke-linecap="round"/>` +
    // The hose: from the riser, a lazy S across the plate to its nozzle.
    `<path d="M26 30 Q52 26 50 48 Q48 70 72 68" stroke="${O}" stroke-width="8" fill="none" stroke-linecap="round"/>` +
    `<path d="M26 30 Q52 26 50 48 Q48 70 72 68" stroke="#3a4048" stroke-width="4.4" fill="none" stroke-linecap="round"/>` +
    `<rect x="68" y="62" width="14" height="12" rx="3" fill="#d5dbe2" stroke="${O}" stroke-width="2"/>` +
    // The riser and its red valve wheel.
    `<circle cx="26" cy="30" r="9" fill="#7d858f" stroke="${O}" stroke-width="2.2"/><circle cx="26" cy="30" r="5" fill="#d9453a" stroke="${O}" stroke-width="1.8"/><path d="M21 30 L31 30 M26 25 L26 35" stroke="${O}" stroke-width="1.6"/>` +
    `</g></svg>`
  );
}

/** The clock on a shift-change gate: a small white face, two hands. (Its rim says open or shut: style.css.) */
export const CLOCK = `<svg viewBox="0 0 20 20" aria-hidden="true"><circle cx="10" cy="10" r="8" class="clock-face"/><path d="M10 5.2 L10 10 L13.4 12" fill="none" class="clock-hands"/></svg>`;

/** A tanker's load tag: a drop. Hollow until it has loaded, then full. */
export const DROP = `<svg viewBox="0 0 20 24" aria-hidden="true"><path class="drop-shape" d="M10 2 Q17 11 17 15.5 A7 7 0 0 1 3 15.5 Q3 11 10 2 Z"/><path class="drop-shine" d="M7 14 Q7 17 9.5 18.2" fill="none"/></svg>`;

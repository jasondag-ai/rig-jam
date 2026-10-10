// THE STANDARD BALDONNEL SCENE's drawings (October upgrade, job U6), ported as written from
// `~/Desktop/RHR Art Inbox/baldonnel_sightings_reference.html` (saved Oct 9 17:36; its `bgBald`): northeast BC at
// spring breakup. The reference draws on a 390 x 190 strip in its own units (the berm's foot at y 30, the walking
// lane's ground line `GY` 150). Permanent props: the bison crossing sign, the old snowbank, the portable truck
// scale and its dial, the thaw pond with its ice pans, and the meltwater puddle; red willow, snow patches, the
// muddy two-track. (The trees are the board's own drawings: scene-stage.ts `BD_TREES`.) Pure strings.
//
// MOVED FROM THE REFERENCE, each for a rule (scene-stage.ts says where everything stands):
//   - the bison sign stands 56 further right, clear of the biffy in the strip's corner; the two spruce beside it
//     stand at the right, on the pond's far bank (scene-stage.ts `BD_TREES` says why);
//   - the meltwater puddle lies on the two-track's near rut (y 163, not 174) and the three front snow patches on
//     the lane's near edge (not y 180 to 185), so the scene can be cropped tighter and everything in it shows
//     bigger on the same strip (Clearwater's lesson);
//   - the two snow patches nearest the berm lie a little lower (y 52 and 54), inside that crop.
// THE SNOWBANK IS WHERE THE REFERENCE PUTS IT (x 38 to 98). Job U6 stood it 34 further right for the sleepy worker's
// spot; job U6b put it back: Half Dressed plays on the ground between the snowbank and the truck scale (the hare
// hides at the snow's edge, hops down into the mud beside it), and Overweight drops Moe's hat, kit and boots there.
// Moved, that ground is gone. So the sleepy worker, when he comes, sits in front of the snowbank's near end.
import { GY, OL, blob, r2, rng, tuft } from './wave3.ts';
export { blob };

const sw = (w = 3) => `stroke="${OL}" stroke-width="${w}" stroke-linejoin="round" stroke-linecap="round"`;

const LANE = '#7a6142', LANE_D = '#5f4b33', SNOW = '#e8edf1', SNOW_D = '#c9d3dc';
/** Where the props stand (the reference's names). */
export const SB = { x0: 38, x1: 98, top: 118, base: GY - 3 };
export const SCX = 175, PAD = { x0: 150, x1: 200, y: GY - 5 }, DIAL = { x: 210, y: GY - 46, r: 9 };
export const POND = { x0: 226, near: 128, far: 98, surf: 118 };
export const PANS: [number, number, number, number][] = [[246, 110, 13, 0], [302, 104, 15, 1], [356, 106, 18, 2]];
export const PUD2 = { x: 300, y: 163, rx: 46 };
export const SIGN = { x: 76, b: 112 };
/** The scale's foot for the depth rule: drawn on the lane's line as the reference draws it, but it STANDS 2 units
 *  behind it (as Clearwater's rig mats do), so everybody who walks the lane passes clearly in front of it. */
export const SCALE_FOOT = GY - 2, GY_FOOT = GY;
/** The dial's needle at rest (degrees: well into the green). */
export const NEEDLE_REST = -70;
/** Red willow [x, base, size]. */
export const WILLOWS: [number, number, number][] = [[118, 110, 1], [222, 104, 0.9]];
/** Snow patches lying flat [x, y, rx, ry, seed]: the back ones, and the three on the lane's near edge. */
export const SNOW_BACK: [number, number, number, number, number][] = [[70, 54, 24, 5, 11], [150, 52, 16, 4, 12], [118, 84, 18, 4, 14], [330, 58, 22, 4.6, 15], [196, 64, 14, 3.4, 16]];
export const SNOW_FRONT: [number, number, number, number, number][] = [[176, 166.4, 22, 2.8, 21], [30, 166, 18, 2.8, 22], [372, 166.6, 20, 2.8, 23]];

export function willow(x: number, b: number, s = 1): string {
  let o = '';
  ([[-8, -18, -14], [-3, -26, -4], [3, -28, 6], [8, -20, 14]] as const).forEach(([dx, h, lean]) => {
    o += `<path d="M${r2(x + dx * s * 0.3)} ${b} Q${r2(x + dx * s)} ${r2(b + h * s * 0.5)} ${r2(x + (dx + lean * 0.4) * s)} ${r2(b + h * s)}" fill="none" stroke="#8a4b35" stroke-width="2" stroke-linecap="round"/>`;
    o += `<ellipse cx="${r2(x + (dx + lean * 0.4) * s)}" cy="${r2(b + h * s - 2)}" rx="2" ry="3" fill="#ece8de" stroke="${OL}" stroke-width="1"/>`;
  });
  return o;
}
export const snowPatch = (x: number, y: number, rx: number, ry: number, seed: number): string =>
  `<path d="${blob(x, y, rx, ry, seed)}" fill="${SNOW}" stroke="${OL}" stroke-width="1.5" stroke-opacity=".35"/><path d="${blob(x - rx * 0.2, y - ry * 0.3, rx * 0.45, ry * 0.35, seed + 1)}" fill="#fbfdfe"/>`;
export function snowbank(): string {
  const { x0, x1, top, base } = SB, m = (x0 + x1) / 2;
  let s = `<path d="M${x0 - 6} ${base} Q${x0 + 2} ${top + 10} ${m - 12} ${top + 2} Q${m} ${top - 3} ${m + 12} ${top + 3} Q${x1 - 4} ${top + 12} ${x1 + 6} ${base} z" fill="${SNOW}" ${sw(2.6)}/>`;
  s += `<path d="M${x0 + 2} ${base - 1} Q${m} ${base - 9} ${x1 - 2} ${base - 1} z" fill="${SNOW_D}"/>`;
  s += `<path d="M${m - 16} ${top + 6} Q${m - 6} ${top} ${m + 6} ${top + 3}" fill="none" stroke="#fff" stroke-width="2.6" stroke-linecap="round"/>`;
  const R = rng(9);
  for (let i = 0; i < 9; i++) s += `<circle cx="${r2(x0 + 8 + R() * (x1 - x0 - 16))}" cy="${r2(top + 10 + R() * (base - top - 16))}" r="${r2(0.8 + R() * 0.8)}" fill="#8f877a"/>`;
  s += `<path d="M${x1 + 4} ${base} q6 2 14 1" fill="none" stroke="#a9b8c4" stroke-width="2" stroke-linecap="round"/>`;
  return s;
}
export function bisonSign(): string {
  const { x, b } = SIGN, c = b - 30;
  return `<path d="M${x} ${b} V${c}" stroke="${OL}" stroke-width="4.4" stroke-linecap="round"/><path d="M${x} ${b} V${c}" stroke="#9aa1aa" stroke-width="2.2" stroke-linecap="round"/>` +
    `<path d="M${x} ${c - 14} L${x + 14} ${c} L${x} ${c + 14} L${x - 14} ${c} z" fill="#f4c430" ${sw(2.4)}/>` +
    `<path d="M${x - 8} ${c + 5} V${c + 1} Q${x - 9} ${c - 3} ${x - 5} ${c - 4} Q${x - 1} ${c - 8} ${x + 3} ${c - 5} Q${x + 7} ${c - 4} ${x + 7} ${c + 1} L${x + 8} ${c + 4} H${x + 6} L${x + 5} ${c + 2} H${x + 3} V${c + 5} H${x + 1} V${c + 2} H${x - 4} V${c + 5} H${x - 6} V${c + 2} z" fill="${OL}"/><path d="M${x + 5} ${c - 5} q2 -2 1 -4" stroke="${OL}" stroke-width="1.2" fill="none"/>`;
}
/** The portable truck scale on the lane and its dial on a post; `ang` is the needle (degrees). */
export function scaleProp(ang: number = NEEDLE_REST): string {
  const { x0, x1, y } = PAD;
  let s = `<ellipse cx="${(x0 + x1) / 2}" cy="${GY + 1}" rx="30" ry="3" fill="${OL}" opacity=".16"/>`;
  s += `<path d="M${x0 - 7} ${GY} L${x0} ${y} H${x1} L${x1 + 7} ${GY} z" fill="#7d868f" ${sw(2.2)}/>`;
  s += `<rect x="${x0}" y="${y}" width="${x1 - x0}" height="5" fill="#9aa4ae" ${sw(2)}/><path d="M${x0 + 3} ${y + 1.4} H${x1 - 3}" stroke="#c3cad1" stroke-width="1.3"/>`;
  for (let i = 0; i < 6; i++) s += `<path d="M${x0 + 4 + i * 8} ${GY - 0.6} l4 -4" stroke="#f4c430" stroke-width="2"/>`;
  const { x, r } = DIAL, dy = DIAL.y;
  s += `<path d="M${x1 + 2} ${GY - 2} Q${x - 2} ${GY - 2} ${x} ${dy + 10}" fill="none" stroke="${OL}" stroke-width="1.6"/>`;
  s += `<path d="M${x} ${GY} V${dy + r}" stroke="${OL}" stroke-width="4.2" stroke-linecap="round"/><path d="M${x} ${GY} V${dy + r}" stroke="#9aa1aa" stroke-width="2" stroke-linecap="round"/>`;
  s += `<rect x="${x - r - 3}" y="${dy - r - 3}" width="${2 * r + 6}" height="${2 * r + 6}" rx="4" fill="#4a5058" ${sw(2.2)}/><circle cx="${x}" cy="${dy}" r="${r}" fill="#fbfaf6" ${sw(1.8)}/>`;
  const arc = (a0: number, a1: number, col: string) => {
    const p = (a: number) => [x + Math.sin((a * Math.PI) / 180) * (r - 2.2), dy - Math.cos((a * Math.PI) / 180) * (r - 2.2)];
    const [ax, ay] = p(a0), [bx, by] = p(a1);
    return `<path d="M${r2(ax)} ${r2(ay)} A${r - 2.2} ${r - 2.2} 0 0 1 ${r2(bx)} ${r2(by)}" fill="none" stroke="${col}" stroke-width="3"/>`;
  };
  s += arc(-62, -8, '#4caf50') + arc(18, 70, '#d9483a');
  const a = (ang * Math.PI) / 180;
  s += `<path d="M${x} ${dy} L${r2(x + Math.sin(a) * (r - 2))} ${r2(dy - Math.cos(a) * (r - 2))}" stroke="${OL}" stroke-width="1.8" stroke-linecap="round"/><circle cx="${x}" cy="${dy}" r="1.6" fill="${OL}"/>`;
  return s;
}
/** The thaw pond, running off the right edge (out to `x1`, however wide the screen), with its ice pans. */
export function pond(x1 = 400): string {
  const far = x1 - 2;
  let s = `<path d="M${POND.x0} ${POND.surf} Q${POND.x0 + 4} ${POND.far + 2} ${POND.x0 + 40} ${POND.far} Q${POND.x0 + 110} ${POND.far - 4} 400 ${POND.far - 2} H${x1 + 4} V${POND.near + 2} H400 Q300 ${POND.near + 3} ${POND.x0 + 44} ${POND.near} Q${POND.x0 + 4} ${POND.near - 1} ${POND.x0} ${POND.surf} z" fill="#7c9fb3" ${sw(2.4)}/>`;
  s += `<path d="M${POND.x0 + 20} ${POND.far + 5} Q300 ${POND.far + 1} 398 ${POND.far + 3} H${far} V${POND.far + 8} H398 Q300 ${POND.far + 6} ${POND.x0 + 24} ${POND.far + 9} z" fill="#97b7c8"/>`;
  ([[262, 122], [330, 124], [372, 118]] as const).forEach(([x, y]) => (s += `<path d="M${x - 7} ${y} h14" stroke="#b8d0dc" stroke-width="1.4" stroke-linecap="round"/>`));
  s += `<path d="M${POND.x0 + 2} ${POND.surf + 2} q6 -10 2 -16 M${POND.x0 + 8} ${POND.surf + 4} q4 -9 4 -14" fill="none" stroke="#7a6a3a" stroke-width="1.8" stroke-linecap="round"/>`;
  PANS.forEach(([x, y, w, seed]) => (s += icePan(x, y, w, seed)));
  return s;
}
export const icePan = (x: number, y: number, w: number, seed: number): string =>
  `<path d="${blob(x, y + 1.6, w, 3.4, 60 + seed)}" fill="#c3d2de" ${sw(1.8)}/><path d="${blob(x, y, w * 0.96, 2.8, 70 + seed)}" fill="#eef3f7" stroke="${OL}" stroke-width="1.4"/>`;
export function puddle(): string {
  const { x, y, rx } = PUD2;
  return `<path d="${blob(x, y, rx, 5.6, 91)}" fill="#7f8574" ${sw(2.2)}/><path d="${blob(x - 8, y - 1.6, 10, 1.6, 92)}" fill="#a2a996"/><path d="M${x + 10} ${y - 1} h6" stroke="#b9bfae" stroke-width="1.3" stroke-linecap="round"/>`;
}
/** The thawing grass's soft bands and the muddy two-track with its ruts, from `x0` to `x1` (the whole screen). */
export function ground(x0: number, x1: number, floor: number): string {
  const m = (x0 + x1) / 2;
  let s = ([[56, '#a39467'], [92, '#958757'], [124, '#a09163']] as const).map(([y, c]) => `<path d="M${x0} ${y} Q${m} ${y - 6} ${x1} ${y} V${floor + 30} H${x0} z" fill="${c}" opacity=".72"/>`).join('');
  s += `<path d="M${x0} 138 H0 Q120 134 210 139 T390 137 H${x1} V166 H390 Q300 168 200 165 T0 167 H${x0} z" fill="${LANE}"/>`;
  s += `<path d="M${x0} 144 H0 Q120 140 210 145 T390 143 H${x1} M${x0} 159 H0 Q120 156 210 160 T390 158 H${x1}" fill="none" stroke="${LANE_D}" stroke-width="2.6"/>`;
  ([[40, 151], [226, 154], [352, 149]] as const).forEach(([x, y]) => (s += `<path d="M${x - 9} ${y} q9 -2 18 0" fill="none" stroke="#a7a990" stroke-width="1.6" stroke-linecap="round"/>`));
  return s;
}
/** Tufts of last year's grass across the screen (seeded: always the same), none on the lane, the pond or the snowbank. */
export function tufts(left: number, width: number, top: number, floor: number): string {
  const R = rng(41);
  let s = '';
  for (let x = -200; x < 390 + 200; x += 12) {
    const tx = Math.round(x + R() * 10), ty = Math.round(40 + R() * 146), light = R() < 0.55;
    if (tx < left || tx > left + width || ty < top + 8 || ty > floor - 3) continue;
    if (ty > 130 || (tx > POND.x0 - 6 && ty > POND.far - 6)) continue;
    s += tuft(tx, ty, light ? '#7f7448' : '#c4b47e');
  }
  return s;
}

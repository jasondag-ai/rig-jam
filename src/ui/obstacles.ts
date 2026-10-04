// Lease equipment for 1-cell obstacles, drawn in the board's toy look (ART_BIBLE 1): 3/4 view, flat
// shading with one light from the top left, the trucks' dark outline, no photo materials, and no
// slab: each piece stands on a patch of worked ground in the pad's own colours with a soft contact
// shadow, so nothing floats. Drawn in code (not sprites) so the pumpjack's parts can move by real
// linkage math (GAME_BIBLE 7) and the flare's pilot flame can flicker.
//
// Every drawing is 100 units wide and stands on its cell (y 0..100); the tall ones stick up above
// it by OVER units (negative y). Colours and the flame's flicker live in style.css ("Equipment").
import type { ObstacleKind } from '../engine/index.ts';

/** How far each kind sticks up above its own cell, in drawing units (100 = one cell). */
export const OVER: Record<ObstacleKind, number> = { pumpjack: 6, tank: 12, wellhead: 12, flare: 46 };

/**
 * How a piece is laid out in its cell: `over` is the share of its height that sticks up above the
 * cell (faded when a truck is in the cell above), `scale` shrinks it in the top row so nothing
 * covers the berm or a gate.
 */
export function equipFit(kind: ObstacleKind, row: number): { over: number; scale: number; height: number } {
  const height = 100 + OVER[kind];
  return row === 0 ? { over: 0, scale: 100 / height, height } : { over: OVER[kind] / height, scale: 1, height };
}

// ---------- Pumpjack linkage (conventional beam pumping unit, side on) ----------

/** The fixed points and link lengths of the pumpjack drawing. */
export const PJ = {
  /** Saddle bearing on the samson post: the walking beam rocks about this point. */
  saddle: { x: 52, y: 34 },
  /** Crank shaft on the gearbox, and the crank pin's radius. */
  shaft: { x: 77, y: 66 },
  crank: 7,
  /** Saddle to the equalizer bearing at the beam's tail, and the pitman arm between it and the pin. */
  tail: 27,
  pitman: Math.hypot(5, 32),
  /** The horsehead's arc is centred on the saddle, so the bridle leaves it straight down at one x. */
  head: 35,
  /** The carrier bar's height with the beam level, and where the polished rod enters the stuffing box. */
  carrier: 58,
  box: 74,
} as const;

/** Strokes per minute (GAME_BIBLE 7: 6 to 8), and so the time one crank turn takes. */
export const STROKES_PER_MIN = 7;
export const STROKE_MS = 60_000 / STROKES_PER_MIN;

export interface PumpjackPose {
  /** Crank angle in degrees (it turns at a constant rate). */
  crank: number;
  /** Crank pin and equalizer bearing: the two ends of the pitman arm. */
  pin: { x: number; y: number };
  equalizer: { x: number; y: number };
  /** Walking beam's tilt about the saddle, degrees (positive = tail down, head up). */
  beam: number;
  /** Carrier bar height: the polished rod's top. It only ever moves up and down, at x = rodX. */
  carrierY: number;
  rodX: number;
}

/**
 * The whole mechanism for a crank angle (radians): the pin goes round the shaft, the pitman (fixed
 * length) pulls the equalizer round the saddle (fixed radius), which sets the beam's tilt; the
 * bridle unwraps from the horsehead's arc, so the carrier bar rises and falls by arc length, straight.
 */
export function pumpjackPose(phase: number): PumpjackPose {
  const { saddle, shaft, crank, tail, pitman, head, carrier } = PJ;
  const pin = { x: shaft.x + crank * Math.cos(phase), y: shaft.y + crank * Math.sin(phase) };
  // The equalizer is where a circle round the saddle (radius: tail) meets one round the pin (radius:
  // pitman); of the two crossings, the one above the pin.
  const dx = pin.x - saddle.x;
  const dy = pin.y - saddle.y;
  const d = Math.hypot(dx, dy);
  const toPin = Math.atan2(dy, dx);
  const open = Math.acos((tail * tail + d * d - pitman * pitman) / (2 * tail * d));
  const a = toPin - open;
  return {
    crank: (phase * 180) / Math.PI,
    pin,
    equalizer: { x: saddle.x + tail * Math.cos(a), y: saddle.y + tail * Math.sin(a) },
    beam: (a * 180) / Math.PI,
    carrierY: carrier - head * a,
    rodX: saddle.x - head,
  };
}

const r2 = (n: number) => Math.round(n * 100) / 100;

/** Moves a pumpjack drawing's layers to a pose. */
export function applyPumpjackPose(svg: Element, p: PumpjackPose): void {
  const set = (sel: string, attrs: Record<string, string | number>) => {
    const el = svg.querySelector(sel);
    if (el) for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, String(v));
  };
  set('.pj-crank', { transform: `rotate(${r2(p.crank)} ${PJ.shaft.x} ${PJ.shaft.y})` });
  set('.pj-beam', { transform: `rotate(${r2(p.beam)} ${PJ.saddle.x} ${PJ.saddle.y})` });
  set('.pj-pitman-edge', { x1: r2(p.pin.x), y1: r2(p.pin.y), x2: r2(p.equalizer.x), y2: r2(p.equalizer.y) });
  set('.pj-pitman', { x1: r2(p.pin.x), y1: r2(p.pin.y), x2: r2(p.equalizer.x), y2: r2(p.equalizer.y) });
  set('.pj-bridle', { y2: r2(p.carrierY) });
  set('.pj-carrier', { y: r2(p.carrierY - 1.5) });
  set('.pj-polished', { y1: r2(p.carrierY) });
}

/** A piece's patch of worked ground and its contact shadow (falling down-right, away from the light). */
const ground = (rx: number, ry = 13) =>
  `<ellipse class="eq-patch" cx="50" cy="86" rx="${rx}" ry="${ry}"/><ellipse class="eq-shadow" cx="${50 + rx * 0.12}" cy="88" rx="${rx * 0.82}" ry="${ry * 0.62}"/>`;

const svgOpen = (kind: ObstacleKind) => `<svg class="equip" viewBox="0 ${-OVER[kind]} 100 ${100 + OVER[kind]}" aria-hidden="true">`;

function pumpjack(phase: number): string {
  const p = pumpjackPose(phase);
  const { saddle: S, shaft: C, head: R } = PJ;
  const x = p.rodX;
  // Horsehead: an arc of radius R about the saddle, 32 degrees either side of level.
  const hy = R * Math.sin(0.56);
  const hx = S.x - R * Math.cos(0.56);
  return (
    svgOpen('pumpjack') +
    ground(48, 14) +
    // Skid base, with the motor and its belt guard at the tail end.
    '<rect class="eq-steel" x="10" y="81" width="86" height="8" rx="2"/>' +
    '<rect class="eq-motor" x="87" y="69" width="10" height="13" rx="2"/>' +
    // Gearbox.
    '<rect class="eq-dark" x="66" y="54" width="22" height="27" rx="4"/>' +
    // Samson post: a chunky A-frame up to the saddle bearing.
    `<path class="eq-post" d="M32 81 L${S.x - 4} ${S.y + 3} L${S.x + 4} ${S.y + 3} L72 81 L62 81 L${S.x} ${S.y + 18} L42 81 Z"/>` +
    '<rect class="eq-post" x="42" y="62" width="20" height="5.5" rx="1.5"/>' +
    // Crank and counterweight: turns at a constant rate.
    `<g class="pj-crank" transform="rotate(${r2(p.crank)} ${C.x} ${C.y})">` +
    `<rect class="eq-steel" x="${C.x - 4}" y="${C.y - 3.6}" width="19" height="7.2" rx="3.4"/>` +
    `<path class="eq-weight" d="M${C.x + 8} ${C.y - 9} L${C.x + 17} ${C.y - 9} Q${C.x + 22} ${C.y} ${C.x + 17} ${C.y + 9} L${C.x + 8} ${C.y + 9} Z"/>` +
    `<circle class="eq-pin" cx="${C.x + PJ.crank}" cy="${C.y}" r="2.4"/></g>` +
    `<circle class="eq-pin" cx="${C.x}" cy="${C.y}" r="3.4"/>` +
    // Pitman arm: crank pin up to the equalizer at the beam's tail.
    `<line class="pj-pitman-edge" x1="${r2(p.pin.x)}" y1="${r2(p.pin.y)}" x2="${r2(p.equalizer.x)}" y2="${r2(p.equalizer.y)}"/>` +
    `<line class="pj-pitman" x1="${r2(p.pin.x)}" y1="${r2(p.pin.y)}" x2="${r2(p.equalizer.x)}" y2="${r2(p.equalizer.y)}"/>` +
    // Bridle straight down from the horsehead, carrier bar, polished rod into the stuffing box.
    `<line class="pj-bridle" x1="${x}" y1="${S.y}" x2="${x}" y2="${r2(p.carrierY)}"/>` +
    `<line class="pj-polished" x1="${x}" y1="${r2(p.carrierY)}" x2="${x}" y2="${PJ.box + 2}"/>` +
    `<rect class="pj-carrier" x="${x - 5.5}" y="${r2(p.carrierY - 1.5)}" width="11" height="4" rx="1.2"/>` +
    // Wellhead under the horsehead: stuffing box on a short tee with a flowline stub.
    `<rect class="eq-red" x="${x - 5}" y="${PJ.box}" width="10" height="7" rx="1.5"/>` +
    `<rect class="eq-red" x="${x - 8}" y="${PJ.box + 6}" width="16" height="6" rx="1.5"/>` +
    // Walking beam with the horsehead: rocks on the saddle.
    `<g class="pj-beam" transform="rotate(${r2(p.beam)} ${S.x} ${S.y})">` +
    `<rect class="eq-beam" x="28" y="${S.y - 5.5}" width="${S.x + PJ.tail + 5 - 28}" height="11" rx="2"/>` +
    `<path class="eq-beam-hi" d="M36 ${S.y - 2.6} L${S.x + PJ.tail + 1} ${S.y - 2.6}"/>` +
    `<path class="eq-horse" d="M36 ${S.y - 9} L${r2(hx)} ${r2(S.y - hy)} A${R} ${R} 0 0 0 ${r2(hx)} ${r2(S.y + hy)} L36 ${S.y + 9} Z"/>` +
    `<circle class="eq-pin" cx="${S.x + PJ.tail}" cy="${S.y}" r="2.6"/></g>` +
    `<circle class="eq-pin" cx="${S.x}" cy="${S.y}" r="3.8"/>` +
    '</svg>'
  );
}

/** A handwheel seen from the front: rim and spokes. */
const wheel = (cx: number, cy: number, r: number) => `<circle class="eq-wheel-back" cx="${cx}" cy="${cy}" r="${r}"/><circle class="eq-wheel" cx="${cx}" cy="${cy}" r="${r}"/><path class="eq-spoke" d="M${cx - r} ${cy} L${cx + r} ${cy} M${cx} ${cy - r} L${cx} ${cy + r}"/><circle class="eq-pin" cx="${cx}" cy="${cy}" r="1.8"/>`;

// 400 bbl tank: a welded steel cylinder about as tall as it is wide, shallow cone roof with a thief
// hatch and a vent, a ladder up to a small railed landing, a load line valve near the bottom.
const TANK =
  svgOpen('tank') +
  ground(49, 14) +
  '<path class="eq-tank" d="M12 77 L12 6 A36 12 0 0 1 84 6 L84 77 A36 13 0 0 1 12 77 Z"/>' +
  '<path class="eq-shade" d="M62 16.4 A36 12 0 0 0 84 6 L84 77 A36 13 0 0 1 62 88.6 Z"/>' +
  '<path class="eq-seam" d="M12 30 A36 13 0 0 0 84 30 M12 54 A36 13 0 0 0 84 54"/>' +
  '<path class="eq-hi" d="M19 17 L19 80"/>' +
  // Roof: a shallow cone.
  '<ellipse class="eq-roof" cx="48" cy="6" rx="36" ry="12"/>' +
  '<path class="eq-seam" d="M48 -2 L20 10 M48 -2 L76 10 M48 -2 L48 18 M48 -2 L31 16 M48 -2 L65 16"/>' +
  '<rect class="eq-steel" x="33" y="-9" width="8" height="11" rx="2"/>' +
  '<rect class="eq-steel" x="52" y="-3" width="15" height="9" rx="3"/>' +
  // Ladder and landing on the right.
  '<path class="eq-rail" d="M87 86 L87 2 M96 88 L96 4"/>' +
  `<path class="eq-rung" d="${Array.from({ length: 7 }, (_, i) => `M87 ${16 + i * 10} L96 ${17.5 + i * 10}`).join(' ')}"/>` +
  '<path class="eq-steel" d="M76 0 L98 4 L98 9 L76 5 Z"/>' +
  '<path class="eq-rail" d="M78 0 L78 -9 L97 -5 L97 4"/>' +
  // Load line valve near the bottom.
  '<rect class="eq-steel" x="20" y="71" width="14" height="7" rx="1.5"/>' +
  wheel(36, 74.5, 6) +
  '</svg>';

// Wellhead: a production tree (never a hydrant). Casing head flange at the ground, two master valves
// with handwheels, a flow cross with a wing valve and a short flowline, a pressure gauge on top,
// yellow guard posts round it.
const post = (x: number, y: number, h: number) => `<rect class="eq-guardpost" x="${x - 4.5}" y="${y - h}" width="9" height="${h}" rx="4"/>`;
const WELLHEAD =
  svgOpen('wellhead') +
  ground(48, 14) +
  post(18, 78, 26) +
  post(84, 78, 26) +
  // Flowline: down from the wing valve to the ground.
  '<path class="eq-pipe-edge" d="M82 36 L82 84"/><path class="eq-pipe" d="M82 36 L82 84"/>' +
  '<rect class="eq-steel" x="28" y="78" width="44" height="9" rx="2"/>' +
  '<rect class="eq-red" x="36" y="58" width="28" height="21" rx="2.5"/>' +
  '<rect class="eq-flange" x="31" y="53" width="38" height="7" rx="2"/>' +
  '<rect class="eq-red" x="36" y="34" width="28" height="20" rx="2.5"/>' +
  '<rect class="eq-flange" x="31" y="29" width="38" height="7" rx="2"/>' +
  // Flow cross, with a blind cap on the left and the wing valve on the right.
  '<rect class="eq-red" x="24" y="15" width="12" height="11" rx="1.5"/>' +
  '<rect class="eq-flange" x="20" y="13" width="6" height="15" rx="1.5"/>' +
  '<rect class="eq-red" x="62" y="15" width="12" height="11" rx="1.5"/>' +
  '<rect class="eq-red" x="72" y="9" width="19" height="24" rx="2.5"/>' +
  '<rect class="eq-red" x="34" y="10" width="32" height="20" rx="2.5"/>' +
  wheel(81.5, 21, 7) +
  wheel(50, 68.5, 8.5) +
  wheel(50, 44, 8) +
  '<path class="eq-hi" d="M40.5 14 L40.5 26 M40.5 38 L40.5 50 M40.5 62 L40.5 75"/>' +
  // Tree cap and pressure gauge.
  '<rect class="eq-steel" x="47.4" y="3" width="5.2" height="8"/>' +
  '<circle class="eq-gauge" cx="50" cy="-2" r="8.5"/><path class="eq-needle" d="M50 -2 L55 -6.5"/>' +
  post(11, 92, 28) +
  post(91, 92, 28) +
  '</svg>';

// Flare stack: a tall steel stack on a small pad, ladder up the side, three guy wires, a knockout
// drum at the base, and a small pilot flame at the tip.
const FLARE =
  svgOpen('flare') +
  ground(48, 14) +
  '<path class="eq-guy" d="M43 -14 L7 86 M43 -14 L95 90 M43 -14 L66 62"/>' +
  '<rect class="eq-pad" x="24" y="78" width="38" height="10" rx="2.5"/>' +
  // Knockout drum on its saddles, piped into the stack.
  '<rect class="eq-steel" x="66" y="82" width="6" height="6" rx="1"/><rect class="eq-steel" x="86" y="82" width="6" height="6" rx="1"/>' +
  '<rect class="eq-drum" x="58" y="62" width="39" height="21" rx="10.5"/>' +
  '<path class="eq-hi" d="M67 67.5 L89 67.5"/>' +
  // The stack, its ladder and the flare tip.
  '<rect class="eq-stack" x="36.5" y="-30" width="13" height="111" rx="2.5"/>' +
  '<path class="eq-hi" d="M40.4 -25 L40.4 76"/>' +
  '<path class="eq-shade-line" d="M46.6 -25 L46.6 76"/>' +
  '<path class="eq-rail" d="M53 78 L53 -18 M59 60 L59 -18"/>' +
  `<path class="eq-rung" d="${Array.from({ length: 10 }, (_, i) => `M53 ${-12 + i * 8} L59 ${-12 + i * 8}`).join(' ')}"/>` +
  '<rect class="eq-steel" x="33" y="-36" width="20" height="8" rx="2.5"/>' +
  '<g class="fl-flame"><path class="fl-outer" d="M43 -36 Q33 -40 38 -48.5 Q41.4 -45 43.6 -44 Q43 -50 46 -53 Q55 -46 50 -36 Z"/><path class="fl-core" d="M43.4 -36.6 Q39.4 -40 42.4 -43.6 Q44 -41.6 45.4 -45.4 Q49.4 -41 46.6 -36.6 Z"/></g>' +
  '</svg>';

/**
 * The drawing for an obstacle. `seed` (the cell's row and column) staggers each pumpjack's phase
 * and each flame's flicker, so two on one pad never move together.
 */
export function equipmentSvg(kind: ObstacleKind, seed = 0): string {
  if (kind === 'pumpjack') return pumpjack(phaseFor(seed));
  return kind === 'tank' ? TANK : kind === 'wellhead' ? WELLHEAD : FLARE;
}

/** Where in its stroke a pumpjack starts (radians), from its cell. */
export const phaseFor = (seed: number) => ((seed * 137.5) % 360) * (Math.PI / 180);

/**
 * Always-on ambient motion: turns every pumpjack under `root` (cranks at a constant rate, the rest
 * following by the linkage). One animation frame loop for the whole board. Returns a stop function.
 * With reduced motion nothing runs: each pumpjack holds the pose it was drawn in.
 */
export function runPumpjacks(root: HTMLElement, reducedMotion: boolean): () => void {
  const jacks = [...root.querySelectorAll<SVGElement>('.obstacle.pumpjack svg.equip')].map((svg) => ({ svg, phase: Number(svg.parentElement?.dataset.phase ?? 0) }));
  if (reducedMotion || !jacks.length) return () => {};
  let frame = 0;
  const start = performance.now();
  const tick = (now: number) => {
    const turn = ((now - start) / STROKE_MS) * Math.PI * 2;
    for (const j of jacks) applyPumpjackPose(j.svg, pumpjackPose(j.phase + turn));
    frame = requestAnimationFrame(tick);
  };
  frame = requestAnimationFrame(tick);
  return () => cancelAnimationFrame(frame);
}

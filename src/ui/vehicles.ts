// Top-down oilfield vehicles in the chunky toy style. Each is drawn cab-right in a
// (length x 100) by 100 box; board-view rotates it to face the truck's gate. Body panels use the
// truck's color (--c) so color stays the main read; steel parts give each type its silhouette.
// Styles live in style.css (look for "Vehicles").
import type { TruckKind } from '../engine/index.ts';

const svg = (w: number, body: string) =>
  `<svg viewBox="0 0 ${w} 100" preserveAspectRatio="none" aria-hidden="true">${body}</svg>`;

/** Cab at the front (right): roof, windshield, mirrors. `from` is where the cab starts. */
function cab(w: number, from: number): string {
  return (
    `<rect class="v-mirror" x="${w - 40}" y="-5" width="9" height="12" rx="3"/>` +
    `<rect class="v-mirror" x="${w - 40}" y="93" width="9" height="12" rx="3"/>` +
    `<rect class="v-cab" x="${from}" y="5" width="${w - 4 - from}" height="90" rx="16"/>` +
    `<rect class="v-light" x="${from + 8}" y="13" width="${w - 44 - from}" height="12" rx="6"/>` +
    `<rect class="v-glass" x="${w - 32}" y="16" width="16" height="68" rx="6"/>` +
    `<rect class="v-bumper" x="${w - 10}" y="14" width="8" height="72" rx="3"/>`
  );
}

// Pickup: cab with hood, and an open box behind it (dark floor with ribs).
const PICKUP = svg(
  200,
  `<rect class="v-body" x="4" y="5" width="108" height="90" rx="12"/>` +
    `<rect class="v-floor" x="16" y="17" width="88" height="66" rx="5"/>` +
    `<path class="v-rib" d="M20 34 H100 M20 50 H100 M20 66 H100"/>` +
    `<rect class="v-shade" x="4" y="83" width="108" height="12" rx="6"/>` +
    `<rect class="v-cab" x="112" y="5" width="84" height="90" rx="18"/>` +
    `<rect class="v-light" x="122" y="13" width="26" height="12" rx="6"/>` +
    `<rect class="v-glass" x="116" y="20" width="8" height="60" rx="3"/>` +
    `<rect class="v-glass" x="150" y="15" width="15" height="70" rx="6"/>` +
    `<rect class="v-mirror" x="152" y="-5" width="9" height="12" rx="3"/>` +
    `<rect class="v-mirror" x="152" y="93" width="9" height="12" rx="3"/>` +
    `<rect class="v-bumper" x="190" y="14" width="8" height="72" rx="3"/>`,
);

// Picker: short flatdeck with a knuckle crane folded flat along the deck behind the cab.
const PICKER = svg(
  200,
  `<rect class="v-body" x="4" y="7" width="134" height="86" rx="8"/>` +
    `<path class="v-plank" d="M8 30 H134 M8 50 H134 M8 70 H134"/>` +
    `<path class="v-pocket" d="M22 7 v8 M52 7 v8 M82 7 v8 M22 93 v-8 M52 93 v-8 M82 93 v-8"/>` +
    `<rect class="v-steel" x="106" y="-3" width="12" height="16" rx="3"/>` +
    `<rect class="v-steel" x="106" y="87" width="12" height="16" rx="3"/>` +
    `<rect class="v-boom" x="30" y="53" width="96" height="17" rx="8"/>` +
    `<rect class="v-boom" x="18" y="32" width="84" height="15" rx="7"/>` +
    `<circle class="v-joint" cx="27" cy="50" r="10"/>` +
    `<circle class="v-turret" cx="120" cy="50" r="17"/>` +
    `<circle class="v-joint" cx="120" cy="50" r="6"/>` +
    `<path class="v-cable" d="M98 40 v14"/><circle class="v-hook" cx="98" cy="57" r="4"/>` +
    cab(200, 140),
);

// Vac truck: squared cylindrical tank with rings, big round rear door, black hose reel up front.
const VAC = svg(
  300,
  `<rect class="v-chassis" x="20" y="12" width="216" height="76" rx="6"/>` +
    `<rect class="v-body" x="24" y="5" width="168" height="90" rx="20"/>` +
    `<path class="v-ring" d="M68 8 V92 M112 8 V92 M156 8 V92"/>` +
    `<rect class="v-light" x="32" y="13" width="152" height="13" rx="6"/>` +
    `<rect class="v-reel" x="196" y="9" width="36" height="82" rx="8"/>` +
    `<path class="v-coil" d="M200 24 H228 M200 36 H228 M200 48 H228 M200 60 H228 M200 72 H228"/>` +
    `<circle class="v-door" cx="26" cy="50" r="27"/>` +
    `<circle class="v-door-ring" cx="26" cy="50" r="17"/>` +
    `<circle class="v-bolt" cx="26" cy="27" r="3.5"/><circle class="v-bolt" cx="26" cy="73" r="3.5"/>` +
    `<circle class="v-bolt" cx="5" cy="50" r="3.5"/>` +
    cab(300, 236),
);

// Frac pump truck: flat deck carrying a big triplex pump at the back, a body-colored engine
// hood with a grille, and a manifold of pipes wrapping the rear.
const FRAC = svg(
  300,
  `<rect class="v-body" x="4" y="6" width="232" height="88" rx="8"/>` +
    `<path class="v-pipe-o" d="M8 22 H62 M8 78 H62 M14 22 V78"/>` +
    `<path class="v-pipe" d="M8 22 H62 M8 78 H62 M14 22 V78"/>` +
    `<circle class="v-flange" cx="14" cy="22" r="7"/><circle class="v-flange" cx="14" cy="78" r="7"/>` +
    `<rect class="v-pump" x="58" y="10" width="82" height="80" rx="9"/>` +
    `<circle class="v-plunger" cx="78" cy="30" r="9"/><circle class="v-plunger" cx="99" cy="30" r="9"/><circle class="v-plunger" cx="120" cy="30" r="9"/>` +
    `<rect class="v-shade" x="64" y="56" width="70" height="26" rx="6"/>` +
    `<rect class="v-engine" x="150" y="12" width="80" height="76" rx="10"/>` +
    `<rect class="v-light" x="158" y="18" width="54" height="11" rx="5"/>` +
    `<path class="v-grille" d="M218 34 V78 M224 34 V78"/>` +
    `<circle class="v-stack" cx="160" cy="76" r="8"/>` +
    cab(300, 236),
);

// Water hauler: smooth oval tank with a walkway, two top hatches and a ladder off the back.
const WATER = svg(
  300,
  `<rect class="v-chassis" x="20" y="14" width="216" height="72" rx="6"/>` +
    `<rect class="v-body" x="12" y="5" width="220" height="90" rx="45"/>` +
    `<rect class="v-light" x="40" y="13" width="164" height="13" rx="6"/>` +
    `<rect class="v-walk" x="44" y="41" width="156" height="18" rx="5"/>` +
    `<circle class="v-hatch" cx="70" cy="50" r="13"/><circle class="v-hatch" cx="174" cy="50" r="13"/>` +
    `<rect class="v-ladder" x="-2" y="32" width="22" height="36" rx="3"/>` +
    `<path class="v-rung" d="M-2 41 H20 M-2 50 H20 M-2 59 H20"/>` +
    cab(300, 236),
);

export const VEHICLE_SVG: Record<TruckKind, string> = {
  pickup: PICKUP,
  picker: PICKER,
  vac: VAC,
  frac: FRAC,
  water: WATER,
};

/** Kind to draw when a level doesn't say. */
export const defaultKind = (length: 2 | 3): TruckKind => (length === 2 ? 'pickup' : 'vac');

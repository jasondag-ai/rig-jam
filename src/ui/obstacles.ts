// Lease equipment art for 1-cell obstacles. Each drawing fills a 100x100 cell and uses bold shapes
// so it still reads at phone size. Colors and motion live in style.css (look for "Obstacles").
import type { ObstacleKind } from '../engine/index.ts';

// Side view. The walking beam pivots on the samson post; the horsehead nods over the well while
// the crank and counterweights turn below the tail, driven by a small motor.
const PUMPJACK = `
<svg viewBox="0 0 100 100" aria-hidden="true">
  <rect class="ob-ground" x="3" y="3" width="94" height="94" rx="10"/>
  <rect class="ob-concrete" x="6" y="80" width="88" height="9" rx="2"/>
  <rect class="ob-steel" x="6" y="70" width="9" height="10" rx="1.5"/>
  <path class="ob-steel" d="M36 80 L48 34 L53 34 L43 80 Z"/>
  <path class="ob-steel" d="M64 80 L53 34 L48 34 L57 80 Z"/>
  <rect class="ob-steel" x="41" y="58" width="19" height="3.5" rx="1"/>
  <rect class="pj-motor" x="82" y="68" width="12" height="12" rx="2"/>
  <rect class="ob-dark" x="64" y="62" width="17" height="18" rx="3"/>
  <g class="pj-crank">
    <rect class="ob-steel" x="70.5" y="55" width="4" height="27" rx="2"/>
    <rect class="pj-weight" x="64" y="51" width="17" height="8" rx="3"/>
    <rect class="pj-weight" x="64" y="78" width="17" height="8" rx="3"/>
    <circle class="ob-dark" cx="72.5" cy="68.5" r="3"/>
  </g>
  <g class="pj-beam">
    <path class="pj-pitman" d="M80 36 L73 57"/>
    <path class="pj-rod" d="M10.5 50 L10.5 71"/>
    <rect class="pj-paint" x="20" y="29" width="63" height="8" rx="2"/>
    <path class="pj-paint" d="M23 24 L13 24 Q4 27 4 38 Q4 50 13 53 L20 53 L23 44 Z"/>
    <circle class="ob-dark" cx="80" cy="33" r="3"/>
  </g>
  <circle class="ob-dark" cx="50.5" cy="33" r="4"/>
</svg>`;

// Top-down 400 bbl tank: round shell with roof seams, center vent, thief hatch, and a caged
// ladder up the side to a small platform at the hatch.
const TANK_SEAMS = Array.from({ length: 8 }, (_, i) => {
  const a = (i * Math.PI) / 4;
  return `M${50 + 7 * Math.cos(a)} ${50 + 7 * Math.sin(a)} L${50 + 33 * Math.cos(a)} ${50 + 33 * Math.sin(a)}`;
}).join(' ');
const TANK_RUNGS = Array.from({ length: 6 }, (_, i) => `M85 ${40 + i * 5} L94 ${40 + i * 5}`).join(' ');

const TANK = `
<svg viewBox="0 0 100 100" aria-hidden="true">
  <rect class="ob-ground" x="3" y="3" width="94" height="94" rx="10"/>
  <circle class="tk-shadow" cx="53" cy="54" r="41"/>
  <circle class="tk-shell" cx="50" cy="50" r="40"/>
  <circle class="tk-ring" cx="50" cy="50" r="33"/>
  <path class="tk-seam" d="${TANK_SEAMS}"/>
  <path class="tk-shine" d="M19 38 A33 33 0 0 1 38 18"/>
  <circle class="ob-dark" cx="50" cy="50" r="6"/>
  <rect class="tk-platform" x="66" y="21" width="22" height="11" rx="1.5"/>
  <rect class="tk-hatch" x="56" y="20" width="12" height="13" rx="3"/>
  <rect class="tk-ladder" x="85" y="32" width="9" height="32" rx="1.5"/>
  <path class="tk-rung" d="${TANK_RUNGS}"/>
</svg>`;

/** A valve handwheel: rim with four spokes. */
const wheel = (cx: number, cy: number, r: number) =>
  `<circle class="wh-wheel" cx="${cx}" cy="${cy}" r="${r}"/>` +
  `<path class="wh-spoke" d="M${cx - r} ${cy} L${cx + r} ${cy} M${cx} ${cy - r} L${cx} ${cy + r}"/>`;

// Side view valve tree: casing head, two master valves with handwheels, a wing valve off the
// flow tee, and a pressure gauge on top. Yellow guard posts mark it on the lease.
const WELLHEAD = `
<svg viewBox="0 0 100 100" aria-hidden="true">
  <rect class="ob-ground" x="3" y="3" width="94" height="94" rx="10"/>
  <rect class="ob-concrete" x="20" y="80" width="60" height="9" rx="2"/>
  <rect class="wh-post" x="8" y="56" width="7" height="33" rx="3"/>
  <rect class="wh-post" x="85" y="56" width="7" height="33" rx="3"/>
  <rect class="wh-body" x="31" y="70" width="38" height="10" rx="2"/>
  <rect class="wh-body" x="42" y="56" width="16" height="15" rx="1"/>
  <rect class="wh-flange" x="38" y="53" width="24" height="4" rx="1"/>
  <rect class="wh-body" x="42" y="40" width="16" height="14" rx="1"/>
  <rect class="wh-flange" x="38" y="38" width="24" height="4" rx="1"/>
  <rect class="ob-steel" x="31" y="61" width="11" height="3"/>
  ${wheel(29, 62.5, 6.5)}
  <rect class="ob-steel" x="58" y="45.5" width="10" height="3"/>
  ${wheel(70, 47, 6.5)}
  <rect class="wh-body" x="40" y="27" width="20" height="12" rx="1"/>
  <rect class="wh-body" x="16" y="30" width="24" height="6" rx="1"/>
  <rect class="wh-body" x="60" y="30" width="16" height="6" rx="1"/>
  <rect class="wh-body" x="74" y="26" width="9" height="14" rx="1"/>
  ${wheel(78.5, 20, 5.5)}
  <rect class="wh-body" x="45" y="17" width="10" height="11" rx="1"/>
  <circle class="wh-gauge" cx="50" cy="11" r="7"/>
  <path class="wh-needle" d="M50 11 L54 7"/>
</svg>`;

export const OBSTACLE_SVG: Record<ObstacleKind, string> = {
  pumpjack: PUMPJACK,
  tank: TANK,
  wellhead: WELLHEAD,
};

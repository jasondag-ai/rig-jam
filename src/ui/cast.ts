// Character art for the gags, in the chunky toy style: bold shapes, dark outlines. Moving parts are
// separate groups (wing, arms, door, fist) that style.css animates (look for "Gags").
const OL = 'stroke="#2a1a0c" stroke-linejoin="round"';

const SPOTTER_HEAD = `
  <circle cx="35" cy="22" r="10" fill="#e8b48a" ${OL} stroke-width="2.5"/>
  <path d="M23 17 Q24 6 35 6 Q46 6 47 17 Z" fill="#ffd21f" ${OL} stroke-width="2.5"/>
  <rect x="20" y="15" width="30" height="4" rx="2" fill="#ffd21f" ${OL} stroke-width="2"/>`;
const VEST = `
  <rect x="20" y="30" width="30" height="31" rx="7" fill="#ff8a00" ${OL} stroke-width="2.5"/>
  <rect x="21" y="40" width="28" height="4" fill="#e8eef2"/>
  <rect x="21" y="50" width="28" height="4" fill="#e8eef2"/>
  <rect x="33" y="30" width="4" height="31" fill="#d8e0e6"/>`;
const PAIL_SHAPE = (x: number, y: number, up: boolean) =>
  up
    ? `<path d="M${x} ${y} L${x + 30} ${y} L${x + 27} ${y + 26} L${x + 3} ${y + 26} Z" fill="#ff7a00" ${OL} stroke-width="2.5"/><rect x="${x - 1}" y="${y - 3}" width="32" height="5" rx="2" fill="#ff9a2e" ${OL} stroke-width="2"/><path d="M${x + 6} ${y + 8} H${x + 24}" stroke="#ffb35c" stroke-width="2"/>`
    : `<path d="M${x} ${y} L${x + 18} ${y} L${x + 16} ${y + 16} L${x + 2} ${y + 16} Z" fill="#ff7a00" ${OL} stroke-width="2"/><path d="M${x} ${y} Q${x + 9} ${y - 9} ${x + 18} ${y}" fill="none" stroke="#5a5a5a" stroke-width="1.8"/>`;

/** Spotter in his hi-vis vest walking on with a pail (the pail hides when he runs off). */
export const SPOTTER_WALK = `
<svg viewBox="0 0 70 90" aria-hidden="true">
  <g class="sw-leg sw-leg-l"><rect x="24" y="58" width="9" height="24" rx="3" fill="#2f5d9e" ${OL} stroke-width="2.5"/><rect x="21" y="80" width="13" height="7" rx="3" fill="#5a3a1c" ${OL} stroke-width="2.5"/></g>
  <g class="sw-leg sw-leg-r"><rect x="37" y="58" width="9" height="24" rx="3" fill="#2f5d9e" ${OL} stroke-width="2.5"/><rect x="36" y="80" width="13" height="7" rx="3" fill="#5a3a1c" ${OL} stroke-width="2.5"/></g>
  <path d="M22 34 L16 54" stroke="#e8b48a" stroke-width="6" stroke-linecap="round"/>
  ${VEST}
  <path d="M48 34 L54 54" stroke="#e8b48a" stroke-width="6" stroke-linecap="round"/>
  <g class="sw-pail">${PAIL_SHAPE(47, 55, false)}</g>
  ${SPOTTER_HEAD}
  <circle cx="31.5" cy="22" r="1.6" fill="#2a1a0c"/><circle cx="38.5" cy="22" r="1.6" fill="#2a1a0c"/>
  <path d="M31 27 Q35 29 39 27" fill="none" stroke="#2a1a0c" stroke-width="1.8" stroke-linecap="round"/>
</svg>`;

/** Spotter asleep on an upturned pail: head drooped, eyes shut, mouth open. */
export const SPOTTER_SIT = `
<svg viewBox="0 0 70 90" aria-hidden="true">
  <g class="ss-pail">${PAIL_SHAPE(20, 62, true)}</g>
  <g class="ss-body">
    <rect x="18" y="64" width="9" height="18" rx="3" fill="#2f5d9e" ${OL} stroke-width="2.5"/>
    <rect x="43" y="64" width="9" height="18" rx="3" fill="#2f5d9e" ${OL} stroke-width="2.5"/>
    <rect x="15" y="80" width="13" height="7" rx="3" fill="#5a3a1c" ${OL} stroke-width="2.5"/>
    <rect x="42" y="80" width="13" height="7" rx="3" fill="#5a3a1c" ${OL} stroke-width="2.5"/>
    <rect x="17" y="58" width="36" height="10" rx="5" fill="#2f5d9e" ${OL} stroke-width="2.5"/>
    <g transform="translate(0 6)">${VEST}</g>
    <path d="M22 42 Q16 52 22 62 M48 42 Q54 52 48 62" fill="none" stroke="#e8b48a" stroke-width="6" stroke-linecap="round"/>
    <g transform="rotate(18 35 30) translate(0 6)">
      ${SPOTTER_HEAD}
      <path d="M29.5 22 q2 1.6 4 0 M36.5 22 q2 1.6 4 0" fill="none" stroke="#2a1a0c" stroke-width="1.6" stroke-linecap="round"/>
      <ellipse cx="35" cy="27.5" rx="2.2" ry="2.6" fill="#7a3b2a"/>
    </g>
  </g>
</svg>`;

/** Company Man: white hard hat, pressed shirt, tie, clipboard. Upper body, for the win card. */
export const COMPANY_MAN = `
<svg viewBox="0 0 64 70" aria-hidden="true">
  <path d="M10 70 Q10 44 32 42 Q54 44 54 70 Z" fill="#cfe2f5" ${OL} stroke-width="2.5"/>
  <path d="M32 44 L32 70" stroke="#a9c3dd" stroke-width="1.5"/>
  <path d="M26 43 L32 50 L38 43" fill="#fff" ${OL} stroke-width="2"/>
  <path d="M30 48 L34 48 L35 62 L32 66 L29 62 Z" fill="#c4473a" ${OL} stroke-width="1.8"/>
  <g class="cm-clip">
    <rect x="38" y="48" width="18" height="22" rx="2" fill="#b07a42" ${OL} stroke-width="2.2"/>
    <rect x="41" y="52" width="12" height="15" fill="#fff"/>
    <path d="M43 56 H51 M43 59.5 H51 M43 63 H49" stroke="#9aa6b2" stroke-width="1.4"/>
    <rect x="43" y="46" width="8" height="4" rx="1.5" fill="#9a9a9a" ${OL} stroke-width="1.5"/>
  </g>
  <circle cx="32" cy="30" r="12" fill="#efc39c" ${OL} stroke-width="2.5"/>
  <circle cx="27.5" cy="29" r="1.7" fill="#2a1a0c"/><circle cx="36.5" cy="29" r="1.7" fill="#2a1a0c"/>
  <path d="M26 35 Q32 33 38 35" fill="none" stroke="#6b4a2a" stroke-width="3" stroke-linecap="round"/>
  <path d="M18 24 Q19 10 32 10 Q45 10 46 24 Z" fill="#fff" ${OL} stroke-width="2.5"/>
  <rect x="15" y="22" width="34" height="5" rx="2.5" fill="#fff" ${OL} stroke-width="2.2"/>
  <rect x="30.5" y="11" width="3" height="11" rx="1.5" fill="#e3e3e3"/>
</svg>`;

/** Porta-potty. The door swings open on its hinge. */
export const BIFFY = `
<svg viewBox="0 0 44 70" aria-hidden="true">
  <rect x="4" y="12" width="36" height="56" rx="4" fill="#2f7fd8" ${OL} stroke-width="2.5"/>
  <path d="M2 14 Q22 2 42 14 Z" fill="#f2f2f2" ${OL} stroke-width="2.5"/>
  <path d="M16 18 a5 5 0 1 0 6 0 a4 4 0 1 1 -6 0 Z" fill="#ffd21f"/>
  <rect class="bf-dark" x="9" y="24" width="26" height="41" rx="2" fill="#1b2a3a"/>
  <g class="bf-door">
    <rect x="9" y="24" width="26" height="41" rx="2" fill="#4a97e8" ${OL} stroke-width="2.2"/>
    <rect x="27" y="40" width="5" height="9" rx="2" fill="#d9d9d9" ${OL} stroke-width="1.5"/>
    <rect x="14" y="28" width="16" height="5" rx="1.5" fill="#d9423a"/>
  </g>
</svg>`;

/** Landowner on his quad, cowboy hat, plaid shirt. His fist shakes. Faces left. */
export const LANDOWNER = `
<svg viewBox="0 -16 96 92" aria-hidden="true">
  <circle cx="20" cy="62" r="11" fill="#2a2725" ${OL} stroke-width="2.5"/><circle cx="20" cy="62" r="4" fill="#9a9a9a"/>
  <circle cx="74" cy="62" r="11" fill="#2a2725" ${OL} stroke-width="2.5"/><circle cx="74" cy="62" r="4" fill="#9a9a9a"/>
  <path d="M8 50 Q10 40 26 40 L70 40 Q86 40 88 52 L84 56 L12 56 Z" fill="#d8392b" ${OL} stroke-width="2.5"/>
  <rect x="6" y="36" width="20" height="6" rx="3" fill="#2a2725" ${OL} stroke-width="2"/>
  <path d="M22 36 L30 26" stroke="#2a2725" stroke-width="3" stroke-linecap="round"/>
  <rect x="44" y="28" width="22" height="16" rx="5" fill="#2a2725"/>
  <rect x="42" y="12" width="22" height="22" rx="6" fill="#c0392b" ${OL} stroke-width="2.5"/>
  <path d="M42 18 H64 M42 25 H64 M49 12 V34 M57 12 V34" stroke="#7a1f16" stroke-width="2"/>
  <path d="M44 22 L30 28" stroke="#c0392b" stroke-width="6" stroke-linecap="round"/>
  <g class="lo-fist">
    <path d="M60 18 L72 4" stroke="#c0392b" stroke-width="6" stroke-linecap="round"/>
    <circle cx="73" cy="3" r="4.5" fill="#efc39c" ${OL} stroke-width="2"/>
  </g>
  <circle cx="52" cy="4" r="8" fill="#efc39c" ${OL} stroke-width="2.5"/>
  <path d="M46 4 L50 2.5 M54 2.5 L58 4" stroke="#2a1a0c" stroke-width="2" stroke-linecap="round"/>
  <path d="M37 -2 Q52 -6 67 -2 L62 -4 Q58 -14 52 -14 Q46 -14 42 -4 Z" fill="#8a5a2b" ${OL} stroke-width="2.2"/>
</svg>`;

/** Block heater post in the fence. `.pp-plug` hangs loose once the cord has ripped out. */
export const PLUG_POST = `
<svg viewBox="0 0 20 30" aria-hidden="true">
  <rect x="6" y="6" width="8" height="24" rx="2" fill="#7d7870" stroke="#2a1a0c" stroke-width="2"/>
  <rect x="3" y="2" width="14" height="10" rx="2.5" fill="#ffd21f" stroke="#2a1a0c" stroke-width="2"/>
  <circle cx="8" cy="7" r="1.2" fill="#2a1a0c"/><circle cx="12" cy="7" r="1.2" fill="#2a1a0c"/>
  <g class="pp-plug"><path d="M10 12 Q4 18 10 22 Q15 25 11 28" fill="none" stroke="#1c1c1c" stroke-width="2.4" stroke-linecap="round"/><rect x="8.5" y="26" width="5" height="4" rx="1" fill="#ff8a00" stroke="#2a1a0c" stroke-width="1.2"/></g>
</svg>`;

// ---------- Wildlife and traffic along the bottom ----------

/** A leafy bush (what the bear squats against). */
export const BUSH = `
<svg viewBox="0 0 60 48" aria-hidden="true">
  <path d="M4 44 Q0 30 12 26 Q10 12 24 12 Q30 2 40 10 Q54 8 54 22 Q62 30 56 44 Z" fill="#4c9a3a" ${OL} stroke-width="2.6"/>
  <path d="M14 30 Q18 22 26 24 M34 18 Q40 14 46 20 M30 34 Q36 28 44 32" fill="none" stroke="#6fbf52" stroke-width="3" stroke-linecap="round"/>
  <circle cx="20" cy="36" r="2" fill="#2f6e24"/><circle cx="42" cy="38" r="2" fill="#2f6e24"/>
</svg>`;

/** Hot shot pickup (the rush-delivery truck), side view facing right, amber light, "HOT SHOT" door. */
export const HOTSHOT = `
<svg viewBox="0 0 120 52" aria-hidden="true">
  <path d="M4 22 L4 40 L114 40 L114 30 Q114 24 106 23 L92 21 L82 8 Q80 6 76 6 L56 6 Q52 6 52 10 L52 22 Z" fill="#f4f4f0" ${OL} stroke-width="2.6"/>
  <path d="M58 10 L76 10 L84 21 L58 21 Z" fill="#7fc4e8" ${OL} stroke-width="2"/>
  <rect x="4" y="32" width="110" height="4" fill="#d8392b"/>
  <text class="hs-text" x="8" y="29.5" font-family="Arial Black, Arial, sans-serif" font-size="7.4" font-weight="900" fill="#d8392b">HOT SHOT</text>
  <rect x="62" y="1" width="10" height="5" rx="2" fill="#ffb000" ${OL} stroke-width="1.6" class="hs-light"/>
  <rect x="108" y="25" width="6" height="5" rx="1.5" fill="#fff6b0" ${OL} stroke-width="1.4"/>
  <path d="M8 22 L48 22" stroke="#cfcfc8" stroke-width="2"/>
  <circle cx="26" cy="41" r="9.5" fill="#2a2725" ${OL} stroke-width="2.5"/><circle cx="26" cy="41" r="3.6" fill="#9a9a9a"/>
  <circle cx="94" cy="41" r="9.5" fill="#2a2725" ${OL} stroke-width="2.5"/><circle cx="94" cy="41" r="3.6" fill="#9a9a9a"/>
  <path d="M-10 18 H-2 M-14 27 H-4 M-9 36 H-1" stroke="#2a1a0c" stroke-width="2.4" stroke-linecap="round" opacity="0.55"/>
</svg>`;

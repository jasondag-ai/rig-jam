// Character art for the gags, in the chunky toy style: bold shapes, dark outlines. Moving parts are
// separate groups (wing, arms, door, fist) that style.css animates (look for "Gags").
const OL = 'stroke="#2a1a0c" stroke-linejoin="round"';

/** Black-and-white magpie, side view facing right. The wing flaps in flight. */
export const MAGPIE = `
<svg viewBox="0 0 64 44" aria-hidden="true">
  <path d="M3 25 L24 19 L25 27 Z" fill="#1f4652" ${OL} stroke-width="2.5"/>
  <ellipse cx="31" cy="25" rx="13" ry="9" fill="#1c1c1c" ${OL} stroke-width="2.5"/>
  <ellipse cx="34" cy="29" rx="8" ry="5" fill="#fff"/>
  <path d="M30 37 L28 42 M35 37 L36 42" stroke="#3a3a3a" stroke-width="2.5" stroke-linecap="round"/>
  <g class="mp-wing">
    <path d="M22 22 Q30 8 42 17 Q33 23 22 25 Z" fill="#1c1c1c" ${OL} stroke-width="2.5"/>
    <path d="M27 19 Q33 14 38 17" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round"/>
  </g>
  <circle cx="45" cy="16" r="7" fill="#1c1c1c" ${OL} stroke-width="2.5"/>
  <circle cx="47.5" cy="14.5" r="2.4" fill="#fff"/>
  <circle cx="48.2" cy="14.5" r="1.2" fill="#111"/>
  <path d="M51 15 L60 17.5 L51 19.5 Z" fill="#5a5a5a" ${OL} stroke-width="2"/>
</svg>`;

/** Roof splat the magpie leaves behind. */
export const SPLAT = `
<svg viewBox="0 0 30 24" aria-hidden="true">
  <path d="M15 3 Q22 2 22 8 Q28 9 26 14 Q29 19 22 20 Q18 24 13 20 Q6 23 5 17 Q0 13 6 10 Q5 3 15 3 Z" fill="#fff" stroke="#9a9a9a" stroke-width="1.6"/>
  <circle cx="13" cy="11" r="2.4" fill="#d8d8d8"/><circle cx="18" cy="15" r="1.6" fill="#e4e4e4"/>
</svg>`;

/** Spotter in a hi-vis vest with two flags. Arms wave in the flag dance. */
export const SPOTTER = `
<svg viewBox="0 0 70 90" aria-hidden="true">
  <g class="sp-legs">
    <rect x="24" y="58" width="9" height="24" rx="3" fill="#2f5d9e" ${OL} stroke-width="2.5"/>
    <rect x="37" y="58" width="9" height="24" rx="3" fill="#2f5d9e" ${OL} stroke-width="2.5"/>
    <rect x="21" y="80" width="13" height="7" rx="3" fill="#5a3a1c" ${OL} stroke-width="2.5"/>
    <rect x="36" y="80" width="13" height="7" rx="3" fill="#5a3a1c" ${OL} stroke-width="2.5"/>
  </g>
  <g class="sp-arm sp-arm-l">
    <path d="M22 34 L8 22" stroke="#e8b48a" stroke-width="6" stroke-linecap="round"/>
    <path d="M8 22 L4 4" stroke="#5a3a1c" stroke-width="2.5" stroke-linecap="round"/>
    <path d="M4 4 L18 7 L6 14 Z" fill="#ff7a00" ${OL} stroke-width="2"/>
  </g>
  <g class="sp-arm sp-arm-r">
    <path d="M48 34 L62 22" stroke="#e8b48a" stroke-width="6" stroke-linecap="round"/>
    <path d="M62 22 L66 4" stroke="#5a3a1c" stroke-width="2.5" stroke-linecap="round"/>
    <path d="M66 4 L52 7 L64 14 Z" fill="#ff7a00" ${OL} stroke-width="2"/>
  </g>
  <rect x="20" y="30" width="30" height="31" rx="7" fill="#ff8a00" ${OL} stroke-width="2.5"/>
  <rect x="21" y="40" width="28" height="4" fill="#e8eef2"/>
  <rect x="21" y="50" width="28" height="4" fill="#e8eef2"/>
  <rect x="33" y="30" width="4" height="31" fill="#d8e0e6"/>
  <circle cx="35" cy="22" r="10" fill="#e8b48a" ${OL} stroke-width="2.5"/>
  <circle cx="31.5" cy="22" r="1.6" fill="#2a1a0c"/><circle cx="38.5" cy="22" r="1.6" fill="#2a1a0c"/>
  <path d="M31 27 Q35 30 39 27" fill="none" stroke="#2a1a0c" stroke-width="1.8" stroke-linecap="round"/>
  <path d="M23 17 Q24 6 35 6 Q46 6 47 17 Z" fill="#ffd21f" ${OL} stroke-width="2.5"/>
  <rect x="20" y="15" width="30" height="4" rx="2" fill="#ffd21f" ${OL} stroke-width="2"/>
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

/** The worker who stumbles out of the biffy, hauling his coveralls up. */
export const WORKER = `
<svg viewBox="0 0 44 70" aria-hidden="true">
  <rect x="13" y="44" width="8" height="22" rx="3" fill="#1f3c6e" ${OL} stroke-width="2.2"/>
  <rect x="23" y="44" width="8" height="22" rx="3" fill="#1f3c6e" ${OL} stroke-width="2.2"/>
  <rect x="11" y="28" width="22" height="22" rx="6" fill="#1f3c6e" ${OL} stroke-width="2.2"/>
  <rect x="11" y="44" width="22" height="5" fill="#f2f2f2" ${OL} stroke-width="1.5"/>
  <g class="wk-arms">
    <path d="M12 32 Q6 40 13 46" fill="none" stroke="#1f3c6e" stroke-width="6" stroke-linecap="round"/>
    <path d="M32 32 Q38 40 31 46" fill="none" stroke="#1f3c6e" stroke-width="6" stroke-linecap="round"/>
  </g>
  <circle cx="22" cy="20" r="9" fill="#efc39c" ${OL} stroke-width="2.2"/>
  <path d="M18 18 L20 20 M26 18 L24 20" stroke="#2a1a0c" stroke-width="1.8" stroke-linecap="round"/>
  <ellipse cx="22" cy="25" rx="3" ry="2" fill="#7a3b2a"/>
  <path d="M12 15 Q13 5 22 5 Q31 5 32 15 Z" fill="#ffd21f" ${OL} stroke-width="2.2"/>
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

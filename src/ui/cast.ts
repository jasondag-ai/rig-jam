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

/** One bird dropping: white blob, dark centre, a short drip. The magpie leaves two or three. */
export const DROPPING = `
<svg viewBox="0 0 20 24" aria-hidden="true">
  <path d="M10 2 Q14 2 15 6 Q19 7 18 11 Q19 15 14 15 Q11 17 8 15 Q3 16 3 11 Q1 7 5 6 Q6 2 10 2 Z" fill="#fff" stroke="#7a7a7a" stroke-width="1.3"/>
  <path d="M12.2 14.6 Q13.8 18 12.8 21 Q11.8 22.8 10.9 21.2 Q10.4 18 11 15.2 Z" fill="#fff" stroke="#7a7a7a" stroke-width="1.1"/>
  <ellipse cx="10" cy="9.6" rx="3.4" ry="2.7" fill="#34322f"/>
  <circle cx="8.8" cy="8.7" r="0.9" fill="#6b6a66"/>
</svg>`;

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

/**
 * The worker who comes out of the biffy: strict side profile, bent over, coveralls bunched round his
 * knees (red long johns underneath, nothing bare), hauling them up. Faces right; flipped to go left.
 * His feet (`.wb-foot`) do tiny quick shuffle steps.
 */
export const WORKER_BENT = `
<svg viewBox="0 0 64 60" aria-hidden="true">
  <g class="wb-foot wb-foot-back"><rect x="14" y="52" width="13" height="6" rx="3" fill="#4a2f16" ${OL} stroke-width="2"/></g>
  <rect x="16" y="38" width="8" height="16" rx="3" fill="#c0392b" ${OL} stroke-width="2"/>
  <g class="wb-foot wb-foot-front"><rect x="22" y="52" width="13" height="6" rx="3" fill="#5a3a1c" ${OL} stroke-width="2"/></g>
  <rect x="21" y="38" width="8" height="16" rx="3" fill="#d8392b" ${OL} stroke-width="2"/>
  <rect x="12" y="33" width="22" height="11" rx="5" fill="#1f3c6e" ${OL} stroke-width="2.2"/>
  <path d="M15 37 Q20 35 24 38 Q28 35 31 37" fill="none" stroke="#2b4a80" stroke-width="1.6"/>
  <path d="M12 20 Q12 33 24 33 L30 33 L30 21 Z" fill="#d8392b" ${OL} stroke-width="2.2"/>
  <path d="M15 26 H28 M16 30 H29" stroke="#a82a1f" stroke-width="1.4"/>
  <path d="M22 13 Q34 7 47 13 L48 23 Q36 26 24 22 Z" fill="#1f3c6e" ${OL} stroke-width="2.2"/>
  <g class="wb-arms">
    <path d="M42 17 Q33 28 27 35" fill="none" stroke="#1f3c6e" stroke-width="6" stroke-linecap="round"/>
    <circle cx="27" cy="35" r="3.4" fill="#f0c49c" ${OL} stroke-width="1.8"/>
  </g>
  <circle cx="52" cy="25" r="7.5" fill="#f0c49c" ${OL} stroke-width="2.2"/>
  <path d="M54 24 l2.6 0.6" stroke="#2a1a0c" stroke-width="1.8" stroke-linecap="round"/>
  <path d="M55.5 29.5 q1.6 -1 3 0" fill="none" stroke="#a0442a" stroke-width="1.6" stroke-linecap="round"/>
  <path d="M45 21 Q46 13 54 14 Q60 15 60 22 Z" fill="#ffd21f" ${OL} stroke-width="2.2"/>
  <path d="M43 21.5 H61" stroke="#2a1a0c" stroke-width="2.2" stroke-linecap="round"/>
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

const BEAR = '#2e2622';
const BEAR_HI = '#4a3d36';
const MUZZLE = '#c49a6c';

/**
 * Black bear, side view facing right. Two poses (`.pose.walk`, `.pose.squat`) swap by class; the
 * walking legs (`.bw-leg-a/b`) step. Squatting, he strains (`.bs-sweat`) and his arm either holds
 * out in front (`.bs-arm-front`) or reaches round behind to his rump (`.bs-arm-back`).
 */
export const BEAR_SVG = `
<svg viewBox="0 0 120 92" aria-hidden="true">
  <g class="pose walk">
    <g class="bw-leg bw-leg-b"><rect x="22" y="56" width="13" height="30" rx="5" fill="${BEAR}" ${OL} stroke-width="2.5"/><rect x="73" y="56" width="13" height="30" rx="5" fill="${BEAR}" ${OL} stroke-width="2.5"/></g>
    <path d="M10 46 Q8 26 34 22 Q58 16 84 26 Q98 32 96 50 Q94 66 74 66 L28 66 Q12 64 10 46 Z" fill="${BEAR}" ${OL} stroke-width="2.8"/>
    <path d="M30 30 Q52 24 76 31" fill="none" stroke="${BEAR_HI}" stroke-width="5" stroke-linecap="round"/>
    <circle cx="11" cy="40" r="4.5" fill="${BEAR}" ${OL} stroke-width="2.2"/>
    <g class="bw-leg bw-leg-a"><rect x="31" y="58" width="14" height="30" rx="5" fill="${BEAR}" ${OL} stroke-width="2.5"/><rect x="82" y="58" width="14" height="30" rx="5" fill="${BEAR}" ${OL} stroke-width="2.5"/></g>
    <circle cx="97" cy="22" r="6" fill="${BEAR}" ${OL} stroke-width="2.4"/><circle cx="97" cy="22" r="2.6" fill="${MUZZLE}"/>
    <path d="M86 34 Q86 16 100 16 Q112 16 113 28 L119 33 Q120 40 112 41 L102 42 Q88 44 86 34 Z" fill="${BEAR}" ${OL} stroke-width="2.6"/>
    <path d="M108 31 L118 33 Q119 39 112 40 L106 40 Z" fill="${MUZZLE}" ${OL} stroke-width="2"/>
    <ellipse cx="117.5" cy="33.5" rx="3" ry="2.4" fill="#111"/>
    <circle cx="104" cy="27" r="2.6" fill="#fff"/><circle cx="104.8" cy="27" r="1.4" fill="#111"/>
  </g>
  <g class="pose squat">
    <ellipse cx="34" cy="70" rx="24" ry="18" fill="${BEAR}" ${OL} stroke-width="2.8"/>
    <g class="bs-arm-back"><path d="M60 46 Q40 66 22 76" fill="none" stroke="#2a1a0c" stroke-width="13" stroke-linecap="round"/><path d="M60 46 Q40 66 22 76" fill="none" stroke="${BEAR}" stroke-width="8.5" stroke-linecap="round"/></g>
    <path d="M36 64 Q34 34 52 26 Q70 20 76 36 Q80 54 70 70 Q60 82 44 80 Z" fill="${BEAR}" ${OL} stroke-width="2.8"/>
    <path d="M58 34 Q70 34 72 50" fill="none" stroke="${BEAR_HI}" stroke-width="5" stroke-linecap="round"/>
    <ellipse cx="62" cy="86" rx="16" ry="5.5" fill="${BEAR}" ${OL} stroke-width="2.4"/>
    <path d="M18 78 Q22 58 42 62 Q56 66 58 82" fill="none" stroke="${BEAR_HI}" stroke-width="4" stroke-linecap="round"/>
    <ellipse cx="72" cy="86.5" rx="5" ry="3" fill="${MUZZLE}" opacity="0.6"/>
    <g class="bs-arm-front"><path d="M64 44 Q76 54 84 60" fill="none" stroke="#2a1a0c" stroke-width="13" stroke-linecap="round"/><path d="M64 44 Q76 54 84 60" fill="none" stroke="${BEAR}" stroke-width="8.5" stroke-linecap="round"/></g>
    <circle cx="58" cy="10" r="6" fill="${BEAR}" ${OL} stroke-width="2.4"/><circle cx="58" cy="10" r="2.6" fill="${MUZZLE}"/>
    <path d="M50 22 Q50 4 64 4 Q76 4 77 16 L83 21 Q84 28 76 29 L66 30 Q52 32 50 22 Z" fill="${BEAR}" ${OL} stroke-width="2.6"/>
    <path d="M72 19 L82 21 Q83 27 76 28 L70 28 Z" fill="${MUZZLE}" ${OL} stroke-width="2"/>
    <ellipse cx="81.5" cy="21.5" rx="3" ry="2.4" fill="#111"/>
    <path d="M64 13 L70 16 M64 18 L70 16" stroke="#fff" stroke-width="2.2" stroke-linecap="round"/>
    <path d="M71 26 L76 26" stroke="#fff" stroke-width="1.6" stroke-linecap="round"/>
    <g class="bs-sweat"><path d="M46 6 Q43 11 46 13 Q49 11 46 6 Z" fill="#7fd0ff" stroke="#2a6a9a" stroke-width="1.2"/><path d="M42 16 Q39.5 20 42 22 Q44.5 20 42 16 Z" fill="#7fd0ff" stroke="#2a6a9a" stroke-width="1.2"/></g>
  </g>
</svg>`;

/** Snowshoe-ish rabbit, side view facing left. `.rb-ears` flatten back when he bolts; `.rb-eye-big` for shock. */
export const RABBIT = `
<svg viewBox="0 0 44 40" aria-hidden="true">
  <g class="rb-ears">
    <path d="M14 14 Q8 0 12 -4 Q17 2 17 13 Z" fill="#b89a78" ${OL} stroke-width="2"/>
    <path d="M18 13 Q16 -2 21 -4 Q24 3 21 14 Z" fill="#b89a78" ${OL} stroke-width="2"/>
    <path d="M14 11 Q12 3 13 0" fill="none" stroke="#f2b8b0" stroke-width="1.8" stroke-linecap="round"/>
  </g>
  <ellipse cx="26" cy="27" rx="14" ry="10" fill="#c9ab88" ${OL} stroke-width="2.2"/>
  <circle cx="39" cy="24" r="4.5" fill="#fff" ${OL} stroke-width="1.8"/>
  <ellipse cx="31" cy="36" rx="8" ry="3.2" fill="#b89a78" ${OL} stroke-width="1.8"/>
  <ellipse cx="14" cy="36" rx="3.5" ry="2.4" fill="#b89a78" ${OL} stroke-width="1.6"/>
  <circle cx="13" cy="20" r="8.5" fill="#c9ab88" ${OL} stroke-width="2.2"/>
  <circle cx="5.2" cy="21.5" r="1.6" fill="#e07070"/>
  <g class="rb-eye"><circle cx="10.5" cy="18" r="1.8" fill="#111"/></g>
  <g class="rb-eye-big"><circle cx="10.5" cy="18" r="3.4" fill="#fff" stroke="#111" stroke-width="1.2"/><circle cx="10" cy="18" r="1.4" fill="#111"/></g>
</svg>`;

/** A leafy bush (what the bear squats against). */
export const BUSH = `
<svg viewBox="0 0 60 48" aria-hidden="true">
  <path d="M4 44 Q0 30 12 26 Q10 12 24 12 Q30 2 40 10 Q54 8 54 22 Q62 30 56 44 Z" fill="#4c9a3a" ${OL} stroke-width="2.6"/>
  <path d="M14 30 Q18 22 26 24 M34 18 Q40 14 46 20 M30 34 Q36 28 44 32" fill="none" stroke="#6fbf52" stroke-width="3" stroke-linecap="round"/>
  <circle cx="20" cy="36" r="2" fill="#2f6e24"/><circle cx="42" cy="38" r="2" fill="#2f6e24"/>
</svg>`;

const MOOSE = '#5b3a22';
const MOOSE_DK = '#3f2716';
const ANTLER = '#e9d6a6';

/**
 * Bull moose, side view facing right: long legs (`.mw-leg-a/b` step slowly), hump, dewlap, palmate
 * antlers. `.mh-side` is his head in profile; `.mh-front` (shown while `.staring`) looks right at you.
 */
export const MOOSE_SVG = `
<svg viewBox="0 0 140 120" aria-hidden="true">
  <g class="mw-leg mw-leg-b"><rect x="28" y="64" width="11" height="52" rx="4" fill="${MOOSE_DK}" ${OL} stroke-width="2.5"/><rect x="88" y="64" width="11" height="52" rx="4" fill="${MOOSE_DK}" ${OL} stroke-width="2.5"/></g>
  <path d="M14 56 Q10 34 34 32 Q50 20 70 24 Q88 22 100 34 Q108 46 104 60 Q100 74 84 74 L34 74 Q16 72 14 56 Z" fill="${MOOSE}" ${OL} stroke-width="2.8"/>
  <path d="M40 34 Q56 26 74 30" fill="none" stroke="#7a5233" stroke-width="5" stroke-linecap="round"/>
  <path d="M15 46 Q8 48 9 56" fill="none" stroke="#2a1a0c" stroke-width="5" stroke-linecap="round"/>
  <g class="mw-leg mw-leg-a"><rect x="38" y="66" width="12" height="52" rx="4" fill="${MOOSE}" ${OL} stroke-width="2.5"/><rect x="96" y="66" width="12" height="52" rx="4" fill="${MOOSE}" ${OL} stroke-width="2.5"/></g>
  <g class="mh-side">
    <path d="M100 30 Q92 18 98 8 Q104 16 108 18 Q112 6 106 -4 Q116 0 118 10 Q122 2 120 -6 Q130 4 124 18 Z" fill="${ANTLER}" ${OL} stroke-width="2.4"/>
    <path d="M100 40 Q104 26 116 24 Q124 24 130 36 L136 50 Q138 58 130 60 L122 60 Q110 58 104 50 Z" fill="${MOOSE}" ${OL} stroke-width="2.6"/>
    <path d="M128 44 Q138 46 136 56 Q134 61 127 60 Z" fill="${MOOSE_DK}" ${OL} stroke-width="2"/>
    <ellipse cx="133" cy="51" rx="1.6" ry="2.4" fill="#111"/>
    <path d="M110 56 Q108 70 114 72 Q118 66 116 57" fill="${MOOSE_DK}" ${OL} stroke-width="2"/>
    <path d="M110 28 L104 22 L112 26 Z" fill="${MOOSE}" ${OL} stroke-width="2"/>
    <circle cx="118" cy="35" r="2.6" fill="#fff"/><circle cx="119" cy="35" r="1.4" fill="#111"/>
  </g>
  <g class="mh-front">
    <path d="M100 26 Q86 22 82 6 Q90 12 94 10 Q90 0 94 -6 Q100 4 102 2 Q104 -6 108 -2 Q106 10 108 22 Z" fill="${ANTLER}" ${OL} stroke-width="2.4"/>
    <path d="M124 26 Q138 22 142 6 Q134 12 130 10 Q134 0 130 -6 Q124 4 122 2 Q120 -6 116 -2 Q118 10 116 22 Z" fill="${ANTLER}" ${OL} stroke-width="2.4"/>
    <path d="M98 26 L90 22 L98 32 Z M126 26 L134 22 L126 32 Z" fill="${MOOSE}" ${OL} stroke-width="2"/>
    <path d="M100 30 Q100 20 112 20 Q124 20 124 30 L122 54 Q120 66 112 66 Q104 66 102 54 Z" fill="${MOOSE}" ${OL} stroke-width="2.6"/>
    <ellipse cx="112" cy="58" rx="9" ry="7" fill="${MOOSE_DK}" ${OL} stroke-width="2"/>
    <ellipse cx="108.5" cy="58" rx="1.6" ry="2.2" fill="#111"/><ellipse cx="115.5" cy="58" rx="1.6" ry="2.2" fill="#111"/>
    <g class="mh-eyes"><circle cx="106" cy="36" r="4" fill="#fff" ${OL} stroke-width="1.4"/><circle cx="118" cy="36" r="4" fill="#fff" ${OL} stroke-width="1.4"/><circle cx="106" cy="37" r="2" fill="#111"/><circle cx="118" cy="37" r="2" fill="#111"/></g>
    <path d="M108 66 Q106 76 112 78 Q118 76 116 66" fill="${MOOSE_DK}" ${OL} stroke-width="2"/>
  </g>
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

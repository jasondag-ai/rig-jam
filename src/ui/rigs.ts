// Puppet-rig drawings for the animated characters (see rig.ts). Same chunky toy style as cast.ts:
// bold shapes, dark outlines. Every `data-j` group is a joint with its pivot in `data-p`;
// `data-alt` groups are swap-in alternatives (eyes open / shut, and so on).
const OL = 'stroke="#2a1a0c" stroke-linejoin="round" stroke-linecap="round"';
const BEAR = '#2e2622';
const BEAR_DK = '#1c1714';
const BEAR_HI = '#4d4039';
const MUZZLE = '#c49a6c';

/**
 * Black bear, side view facing right, standing on the line y = 186. Joints: face (whole bear: turn
 * and squash, pivot at his feet), hips (drops when he sits), body (pivots at the hip to sit up),
 * head, jaw, ears, eye, belly (lags behind), tail, back legs (thigh + shin), far front leg (armF),
 * and the near arm: shoulder (arm), elbow (fore), wrist (paw). `grip` marks where the paw holds.
 */
export const BEAR_RIG = `
<svg viewBox="-20 -40 250 232" overflow="visible" aria-hidden="true">
<g data-j="face" data-p="100 186">
<g data-j="hips" data-p="60 128">
  <g data-j="thighF" data-p="74 126">
    <ellipse cx="74" cy="134" rx="17" ry="21" fill="${BEAR_DK}" ${OL} stroke-width="3"/>
    <g data-j="shinF" data-p="74 152">
      <rect x="66" y="146" width="16" height="36" rx="7" fill="${BEAR_DK}" ${OL} stroke-width="3"/>
      <ellipse cx="79" cy="182" rx="12" ry="5.5" fill="${BEAR_DK}" ${OL} stroke-width="3"/>
    </g>
  </g>
  <g data-j="body" data-p="60 128">
    <g data-j="armF" data-p="118 114">
      <rect x="110" y="108" width="17" height="72" rx="8" fill="${BEAR_DK}" ${OL} stroke-width="3"/>
      <ellipse cx="123" cy="182" rx="12" ry="5.5" fill="${BEAR_DK}" ${OL} stroke-width="3"/>
    </g>
    <g data-j="tail" data-p="38 100"><circle cx="32" cy="96" r="7.5" fill="${BEAR}" ${OL} stroke-width="3"/></g>
    <path d="M36 104 Q32 72 70 68 Q112 60 142 74 Q160 84 156 110 Q152 136 126 138 L66 138 Q38 134 36 104 Z" fill="${BEAR}" ${OL} stroke-width="3.2"/>
    <g data-j="belly" data-p="96 128">
      <path d="M62 126 Q96 150 134 126 Q130 140 96 142 Q66 140 62 126 Z" fill="${BEAR}" ${OL} stroke-width="3"/>
    </g>
    <path d="M60 80 Q96 68 132 80" fill="none" stroke="${BEAR_HI}" stroke-width="7" stroke-linecap="round"/>
    <g data-j="head" data-p="146 98">
      <g data-j="earF" data-p="156 66"><circle cx="154" cy="62" r="8.5" fill="${BEAR_DK}" ${OL} stroke-width="3"/></g>
      <g data-j="ear" data-p="168 66"><circle cx="168" cy="61" r="9.5" fill="${BEAR}" ${OL} stroke-width="3"/><circle cx="168" cy="61" r="4" fill="${MUZZLE}"/></g>
      <path d="M144 94 Q142 64 170 64 Q192 64 195 82 L204 89 Q207 100 196 102 L178 104 Q148 110 144 94 Z" fill="${BEAR}" ${OL} stroke-width="3.2"/>
      <g data-j="jaw" data-p="180 101">
        <path d="M178 101 Q190 110 199 103 L197 100 Z" fill="${BEAR}" ${OL} stroke-width="2.6"/>
      </g>
      <path d="M190 85 L204 89 Q206 99 197 100 L188 100 Z" fill="${MUZZLE}" ${OL} stroke-width="2.6"/>
      <ellipse cx="203" cy="90" rx="4" ry="3.2" fill="#111"/>
      <g data-j="eye" data-p="177 80">
        <g data-alt="eye" data-v="open"><circle cx="177" cy="80" r="5" fill="#fff" ${OL} stroke-width="1.6"/><circle cx="178.6" cy="80.3" r="2.6" fill="#111"/></g>
        <g data-alt="eye" data-v="shut" style="display:none"><path d="M171 76 L181 80 L171 84" fill="none" stroke="#fff" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round"/></g>
        <g data-alt="eye" data-v="pop" style="display:none"><circle cx="177" cy="79" r="8" fill="#fff" ${OL} stroke-width="1.8"/><circle cx="179.5" cy="79.5" r="3" fill="#111"/></g>
      </g>
      <g data-alt="brow" data-v="strain" style="display:none"><path d="M168 70 L184 74" stroke="#fff" stroke-width="2.4" stroke-linecap="round"/><path d="M182 97 L194 97" stroke="#fff" stroke-width="2" stroke-linecap="round"/></g>
      <g data-j="sweat" data-p="158 70" style="display:none">
        <path d="M156 58 Q152 65 156 68 Q160 65 156 58 Z" fill="#8fd6ff" stroke="#2a6a9a" stroke-width="1.4"/>
        <path d="M148 70 Q145 76 148 78 Q151 76 148 70 Z" fill="#8fd6ff" stroke="#2a6a9a" stroke-width="1.4"/>
      </g>
    </g>
    <g data-j="arm" data-p="128 114">
      <rect x="119" y="106" width="19" height="46" rx="9" fill="${BEAR}" ${OL} stroke-width="3"/>
      <g data-j="fore" data-p="128 146">
        <rect x="120" y="140" width="17" height="40" rx="8" fill="${BEAR}" ${OL} stroke-width="3"/>
        <g data-j="paw" data-p="129 180">
          <ellipse cx="133" cy="182" rx="13.5" ry="6" fill="${BEAR}" ${OL} stroke-width="3"/>
          <path d="M141 180 l4 -1 M142 183 l4 0" stroke="#e8dcc6" stroke-width="1.6" stroke-linecap="round"/>
          <g class="grip" transform="translate(134 176)"></g>
        </g>
      </g>
    </g>
  </g>
  <g data-j="thigh" data-p="58 126">
    <ellipse cx="58" cy="134" rx="20" ry="24" fill="${BEAR}" ${OL} stroke-width="3.2"/>
    <g data-j="shin" data-p="58 154">
      <rect x="49" y="148" width="18" height="34" rx="8" fill="${BEAR}" ${OL} stroke-width="3"/>
      <ellipse cx="64" cy="183" rx="14" ry="6" fill="${BEAR}" ${OL} stroke-width="3"/>
    </g>
  </g>
</g>
</g>
</svg>`;

const FUR = '#c9ab88';
const FUR_DK = '#a88a68';

/** A spiky outline round an ellipse: the rabbit's fur standing on end. */
function frazzle(cx: number, cy: number, rx: number, ry: number, spikes: number): string {
  const pts: string[] = [];
  for (let i = 0; i < spikes * 2; i++) {
    const a = (i / (spikes * 2)) * Math.PI * 2;
    const k = i % 2 ? 1 : 1.32;
    pts.push(`${(cx + Math.cos(a) * rx * k).toFixed(1)} ${(cy + Math.sin(a) * ry * k).toFixed(1)}`);
  }
  return `M${pts.join(' L')} Z`;
}

/**
 * Rabbit, side view facing left, standing on y = 52. Joints: root (squash and stretch, pivot at his
 * feet), body, head, ear and earF (pivot at their base), nose, leg (hind), paw (front), tail.
 * Alternatives: eye normal / huge / shut, fur smooth / frazzled, speed lines.
 */
export const RABBIT_RIG = `
<svg viewBox="-8 -12 76 68" overflow="visible" aria-hidden="true">
<g data-j="root" data-p="32 52">
  <g data-alt="lines" data-v="on" style="display:none" stroke="#2a1a0c" stroke-width="2.2" stroke-linecap="round" opacity="0.55">
    <path d="M60 30 H74 M62 40 H78 M60 48 H72"/>
  </g>
  <g data-j="tail" data-p="49 36"><circle cx="51" cy="35" r="5.5" fill="#fff" ${OL} stroke-width="2"/></g>
  <g data-j="leg" data-p="42 42">
    <ellipse cx="40" cy="41" rx="9" ry="10" fill="${FUR}" ${OL} stroke-width="2.2"/>
    <ellipse cx="38" cy="49.5" rx="12" ry="3.6" fill="${FUR_DK}" ${OL} stroke-width="2"/>
  </g>
  <g data-j="body" data-p="34 46">
    <path data-alt="fur" data-v="frazzled" style="display:none" d="${frazzle(33, 37, 16, 12.5, 14)}" fill="${FUR}" ${OL} stroke-width="2"/>
    <ellipse cx="33" cy="37" rx="16" ry="12.5" fill="${FUR}" ${OL} stroke-width="2.4"/>
    <ellipse cx="30" cy="42" rx="9" ry="5" fill="#e9dcc6"/>
    <g data-j="paw" data-p="20 44"><ellipse cx="18" cy="49" rx="4.6" ry="3" fill="${FUR_DK}" ${OL} stroke-width="1.8"/></g>
    <g data-j="head" data-p="22 34">
      <g data-j="earF" data-p="25 21"><ellipse cx="26" cy="10" rx="3.6" ry="11" fill="${FUR_DK}" ${OL} stroke-width="2"/></g>
      <g data-j="ear" data-p="21 22">
        <ellipse cx="20.5" cy="10" rx="4.2" ry="12" fill="${FUR}" ${OL} stroke-width="2.2"/>
        <ellipse cx="20.5" cy="11" rx="1.8" ry="8" fill="#f2b8b0"/>
      </g>
      <path data-alt="fur" data-v="frazzled" style="display:none" d="${frazzle(18, 29, 10, 9.5, 9)}" fill="${FUR}" ${OL} stroke-width="1.8"/>
      <circle cx="18" cy="29" r="10" fill="${FUR}" ${OL} stroke-width="2.4"/>
      <g data-j="nose" data-p="9.5 31"><circle cx="9" cy="31" r="2" fill="#e07070"/></g>
      <path d="M10 33 L3 32 M10 34 L4 36" stroke="#5a4636" stroke-width="0.9" stroke-linecap="round"/>
      <g data-alt="eye" data-v="normal"><circle cx="15.5" cy="26.5" r="2.2" fill="#111"/><circle cx="14.9" cy="25.8" r="0.7" fill="#fff"/></g>
      <g data-alt="eye" data-v="huge" style="display:none"><circle cx="15.5" cy="26" r="5.4" fill="#fff" ${OL} stroke-width="1.4"/><circle cx="14" cy="26" r="1.6" fill="#111"/></g>
      <g data-alt="eye" data-v="shut" style="display:none"><path d="M12.5 26.5 Q15.5 28.5 18.5 26.5" fill="none" stroke="#111" stroke-width="1.6" stroke-linecap="round"/></g>
    </g>
  </g>
</g>
</svg>`;

const SKIN = '#f0c49c';
const SKIN_DK = '#d9a77c';
const NAVY = '#1f3c6e';
const SHIRT = '#e9e4da';

/**
 * The biffy worker, strict side profile facing right, feet on y = 78. One connected body: shirt
 * down over his hips, a round bare cheek at the back, bare thighs into the coveralls bunched round
 * his knees, shins and boots. One hand holds a toilet roll; `.tp` is the streamer trailing behind
 * (the scene redraws it as it flutters). Joints: root (bob, pivot at his feet), legF and legN
 * (pivot at the hip), upper (torso sway), head, arm.
 */
export const WORKER_RIG = `
<svg viewBox="-30 -4 92 84" overflow="visible" aria-hidden="true">
<g data-j="root" data-p="34 78">
  <path class="tp" d="M45 46 Q30 52 14 48" fill="none" stroke="#fbfbf6" stroke-width="5" stroke-linecap="round"/>
  <path class="tp-edge" d="M45 46 Q30 52 14 48" fill="none" stroke="#b9b6ac" stroke-width="1" stroke-dasharray="2 3"/>
  <g data-j="legF" data-p="30 44">
    <rect x="25.5" y="40" width="9" height="20" rx="4" fill="${SKIN_DK}" ${OL} stroke-width="2"/>
    <rect x="26.5" y="58" width="7" height="16" rx="3" fill="${NAVY}" ${OL} stroke-width="2"/>
    <ellipse cx="32" cy="75" rx="7.5" ry="3.6" fill="#4a2f16" ${OL} stroke-width="2"/>
  </g>
  <g data-j="upper" data-p="32 46">
    <path d="M21 36 Q17 44 22 50 Q28 55 34 50 L38 40 Z" fill="${SKIN}" ${OL} stroke-width="2.2"/>
    <path d="M23 47 Q27 50 31 48" fill="none" stroke="${SKIN_DK}" stroke-width="1.5" stroke-linecap="round"/>
    <path d="M24 20 Q22 32 23 40 Q30 44 42 49 Q46 50 46 44 L46 24 Q44 18 34 17 Z" fill="${SHIRT}" ${OL} stroke-width="2.2"/>
    <path d="M28 40 Q34 43 42 46" fill="none" stroke="#c9c3b6" stroke-width="1.4"/>
    <g data-j="head" data-p="40 18">
      <circle cx="44" cy="12" r="7.5" fill="${SKIN}" ${OL} stroke-width="2.2"/>
      <path d="M46 10.5 l2.4 0.6" stroke="#2a1a0c" stroke-width="1.8" stroke-linecap="round"/>
      <path d="M50.5 13 q1.6 1 0 2.2" fill="none" stroke="#2a1a0c" stroke-width="1.4" stroke-linecap="round"/>
      <path d="M47 16.8 q1.8 -1.2 3.4 0" fill="none" stroke="#a0442a" stroke-width="1.4" stroke-linecap="round"/>
      <path d="M36 8 Q37 0 45 0 Q52 1 52 8 Z" fill="#ffd21f" ${OL} stroke-width="2.2"/>
      <path d="M34 8.5 H54" stroke="#2a1a0c" stroke-width="2.2" stroke-linecap="round"/>
    </g>
    <g data-j="arm" data-p="40 24">
      <path d="M40 24 Q42 34 45 41" fill="none" stroke="#2a1a0c" stroke-width="7.5" stroke-linecap="round"/>
      <path d="M40 24 Q42 34 45 41" fill="none" stroke="${SHIRT}" stroke-width="4.5" stroke-linecap="round"/>
      <rect x="41" y="41" width="9" height="8" rx="2.5" fill="#fbfbf6" ${OL} stroke-width="1.8"/>
      <ellipse cx="45.5" cy="45" rx="1.6" ry="2.6" fill="#b9b6ac"/>
      <circle cx="45" cy="41.5" r="3" fill="${SKIN}" ${OL} stroke-width="1.6"/>
    </g>
  </g>
  <g data-j="legN" data-p="35 44">
    <rect x="31" y="41" width="9.5" height="19" rx="4" fill="${SKIN}" ${OL} stroke-width="2"/>
    <rect x="32" y="58" width="7.5" height="16" rx="3" fill="${NAVY}" ${OL} stroke-width="2"/>
    <ellipse cx="38" cy="75" rx="7.5" ry="3.6" fill="#5a3a1c" ${OL} stroke-width="2"/>
  </g>
  <path d="M21 58 Q22 52 33 53 Q44 52 46 58 Q47 65 34 65 Q20 65 21 58 Z" fill="${NAVY}" ${OL} stroke-width="2.2"/>
  <path d="M25 57 Q30 55 34 58 Q38 55 43 58" fill="none" stroke="#2b4a80" stroke-width="1.5"/>
  <rect x="38" y="55" width="3" height="5" rx="1" fill="#c9a227"/>
</g>
</svg>`;

const MOOSE = '#5b3a22';
const MOOSE_DK = '#3f2716';
const MOOSE_HI = '#7a5233';
const ANTLER = '#e9d6a6';

/**
 * Bull moose, front on, from the shoulders up (the shoulder line is y = 140; everything below is
 * behind the fence). Joints: lean (the whole moose, pivot at his shoulders), head (pivot at the
 * neck), antlerL/antlerR and earL/earR (pivot at their base), jaw (chewing), bell (the dewlap),
 * grass (a sprig he's chewing). Eyes: open, shut (blink) or stare.
 */
export const MOOSE_RIG = `
<svg viewBox="-10 -6 180 150" overflow="visible" aria-hidden="true">
<g data-j="lean" data-p="80 140">
  <path d="M8 140 Q12 104 46 96 Q80 84 114 96 Q148 104 152 140 Z" fill="${MOOSE}" ${OL} stroke-width="3.2"/>
  <path d="M40 104 Q80 92 120 104" fill="none" stroke="${MOOSE_HI}" stroke-width="6" stroke-linecap="round"/>
  <path d="M62 110 L64 76 L96 76 L98 110 Z" fill="${MOOSE_DK}" ${OL} stroke-width="3"/>
  <g data-j="head" data-p="80 78">
    <g data-j="antlerL" data-p="66 40">
      <path d="M66 42 Q50 40 40 34 Q30 40 18 36 Q22 30 16 22 Q26 24 28 16 Q34 22 38 14 Q42 22 48 18 Q50 28 58 30 Q62 34 68 36 Z" fill="${ANTLER}" ${OL} stroke-width="2.6"/>
    </g>
    <g data-j="antlerR" data-p="94 40">
      <path d="M94 42 Q110 40 120 34 Q130 40 142 36 Q138 30 144 22 Q134 24 132 16 Q126 22 122 14 Q118 22 112 18 Q110 28 102 30 Q98 34 92 36 Z" fill="${ANTLER}" ${OL} stroke-width="2.6"/>
    </g>
    <g data-j="earL" data-p="64 48"><path d="M64 46 Q50 40 44 46 Q50 54 64 52 Z" fill="${MOOSE}" ${OL} stroke-width="2.4"/><path d="M60 48 Q52 46 49 47" stroke="#c98f6a" stroke-width="2" stroke-linecap="round"/></g>
    <g data-j="earR" data-p="96 48"><path d="M96 46 Q110 40 116 46 Q110 54 96 52 Z" fill="${MOOSE}" ${OL} stroke-width="2.4"/><path d="M100 48 Q108 46 111 47" stroke="#c98f6a" stroke-width="2" stroke-linecap="round"/></g>
    <path d="M62 44 Q80 32 98 44 L100 78 Q100 96 92 104 L68 104 Q60 96 60 78 Z" fill="${MOOSE}" ${OL} stroke-width="3"/>
    <path d="M72 46 Q80 42 88 46 L86 76 L74 76 Z" fill="${MOOSE_HI}" opacity="0.55"/>
    <g data-j="bell" data-p="80 112"><path d="M75 108 Q72 128 80 134 Q88 128 85 108 Z" fill="${MOOSE_DK}" ${OL} stroke-width="2.4"/></g>
    <g data-j="jaw" data-p="80 104">
      <path d="M65 98 Q80 128 95 98 Q80 106 65 98 Z" fill="${MOOSE_DK}" ${OL} stroke-width="2.6"/>
      <path d="M74 112 Q80 116 86 112" fill="none" stroke="#2a1a0c" stroke-width="1.8" stroke-linecap="round"/>
      <g data-j="grass" data-p="90 108">
        <path d="M89 109 Q100 104 106 96 M90 109 Q101 108 109 103 M90 110 Q99 114 106 113" fill="none" stroke="#5aa83c" stroke-width="2.6" stroke-linecap="round"/>
      </g>
    </g>
    <ellipse cx="80" cy="96" rx="17" ry="13" fill="${MOOSE_DK}" ${OL} stroke-width="2.8"/>
    <ellipse cx="74" cy="97" rx="2.6" ry="3.6" fill="#120b06"/><ellipse cx="86" cy="97" rx="2.6" ry="3.6" fill="#120b06"/>
    <g data-alt="eye" data-v="open"><circle cx="68" cy="60" r="4.5" fill="#fff" ${OL} stroke-width="1.6"/><circle cx="92" cy="60" r="4.5" fill="#fff" ${OL} stroke-width="1.6"/><circle cx="69" cy="61" r="2.3" fill="#111"/><circle cx="91" cy="61" r="2.3" fill="#111"/></g>
    <g data-alt="eye" data-v="shut" style="display:none"><path d="M63.5 60 Q68 63 72.5 60 M87.5 60 Q92 63 96.5 60" fill="none" stroke="#111" stroke-width="2" stroke-linecap="round"/></g>
    <g data-alt="eye" data-v="stare" style="display:none"><circle cx="68" cy="60" r="6.5" fill="#fff" ${OL} stroke-width="1.8"/><circle cx="92" cy="60" r="6.5" fill="#fff" ${OL} stroke-width="1.8"/><circle cx="68" cy="60.5" r="1.8" fill="#111"/><circle cx="92" cy="60.5" r="1.8" fill="#111"/><path d="M61 51 L73 53 M99 51 L87 53" stroke="#2a1a0c" stroke-width="2.4" stroke-linecap="round"/></g>
  </g>
</g>
</svg>`;

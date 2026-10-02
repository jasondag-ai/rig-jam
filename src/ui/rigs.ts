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
    <g data-j="tail" data-p="38 100"><circle cx="31" cy="96" r="8.5" fill="${BEAR}" ${OL} stroke-width="3"/><path d="M26.5 93 Q30 89.5 34.5 91.5" fill="none" stroke="${BEAR_HI}" stroke-width="3" stroke-linecap="round"/></g>
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
        <g data-alt="eye" data-v="happy" style="display:none"><path d="M170.5 82 Q177 73.5 183.5 82" fill="none" stroke="#fff" stroke-width="2.8" stroke-linecap="round"/></g>
        <g data-alt="eye" data-v="pop" style="display:none"><circle cx="177" cy="79" r="8" fill="#fff" ${OL} stroke-width="1.8"/><circle cx="179.5" cy="79.5" r="3" fill="#111"/></g>
      </g>
      <g data-alt="brow" data-v="relief" style="display:none"><ellipse cx="183" cy="90" rx="5.5" ry="3.2" fill="#e8847a" opacity="0.75"/><path d="M190 98.5 Q195 101.5 200 98" fill="none" stroke="#2a1a0c" stroke-width="1.8" stroke-linecap="round"/></g>
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
      <g data-alt="eye" data-v="deadpan" style="display:none"><circle cx="15.5" cy="26.5" r="4.4" fill="#fff" ${OL} stroke-width="1.3"/><circle cx="14.6" cy="28.2" r="1.5" fill="#111"/><path d="M11 26.2 A4.5 4.5 0 0 1 20 26.2 Z" fill="${FUR_DK}" ${OL} stroke-width="1.3"/></g>
      <g data-alt="mouth" data-v="flat" style="display:none"><path d="M8.6 35.2 L13.6 35.6" stroke="#3a2a18" stroke-width="1.5" stroke-linecap="round"/></g>
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

const GOPHER = '#b8976a';
const GOPHER_DK = '#8f714a';
const GOPHER_LT = '#e6d3b0';

/**
 * Richardson's ground squirrel ("gopher"), standing bolt upright like a picket pin, facing a little
 * to the right; feet on y = 60 (the hole's rim). Joints: root (rise from the hole, squash and
 * stretch; pivot at his feet), body, head, paws (clasped at his chest), tail. Mouth: shut or
 * whistle (pursed, with a note).
 */
export const GOPHER_RIG = `
<svg viewBox="-6 -10 52 72" overflow="visible" aria-hidden="true">
<g data-j="root" data-p="20 60">
  <g data-j="tail" data-p="12 52"><path d="M12 52 Q2 50 2 42 Q4 38 8 40 Q8 48 14 48 Z" fill="${GOPHER_DK}" ${OL} stroke-width="1.8"/><path d="M3 43 Q4 39 7 40" stroke="#3a2a18" stroke-width="2.2" stroke-linecap="round"/></g>
  <g data-j="body" data-p="20 58">
    <path d="M10 58 Q6 40 12 30 Q20 22 28 30 Q34 40 30 58 Z" fill="${GOPHER}" ${OL} stroke-width="2.2"/>
    <path d="M15 56 Q13 42 18 34 Q24 34 26 42 Q27 50 25 56 Z" fill="${GOPHER_LT}"/>
    <g data-j="paws" data-p="21 38"><ellipse cx="18.5" cy="40" rx="3" ry="2.4" fill="${GOPHER_DK}" ${OL} stroke-width="1.4"/><ellipse cx="23.5" cy="40" rx="3" ry="2.4" fill="${GOPHER_DK}" ${OL} stroke-width="1.4"/></g>
    <g data-j="head" data-p="21 28">
      <circle cx="15" cy="12" r="3.2" fill="${GOPHER}" ${OL} stroke-width="1.6"/><circle cx="26" cy="12" r="3.2" fill="${GOPHER}" ${OL} stroke-width="1.6"/>
      <path d="M11 20 Q11 9 21 9 Q31 9 31 20 Q31 29 21 29 Q11 29 11 20 Z" fill="${GOPHER}" ${OL} stroke-width="2.2"/>
      <ellipse cx="23" cy="23" rx="5.5" ry="4" fill="${GOPHER_LT}"/>
      <circle cx="17.5" cy="17" r="1.9" fill="#111"/><circle cx="26.5" cy="17" r="1.9" fill="#111"/>
      <circle cx="17" cy="16.4" r="0.6" fill="#fff"/><circle cx="26" cy="16.4" r="0.6" fill="#fff"/>
      <ellipse cx="23" cy="21.2" rx="1.6" ry="1.1" fill="#3a2a18"/>
      <g data-alt="mouth" data-v="shut"><path d="M21 24.5 Q23 25.8 25 24.5" fill="none" stroke="#3a2a18" stroke-width="1.1" stroke-linecap="round"/></g>
      <g data-alt="mouth" data-v="whistle" style="display:none"><ellipse cx="23" cy="25" rx="1.4" ry="1.7" fill="#3a2a18"/></g>
    </g>
  </g>
  <g data-j="note" data-p="35 8" data-alt="note" data-v="on" style="display:none"><path d="M33 12 v-9 l6 -2 v8" fill="none" stroke="#2a1a0c" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/><ellipse cx="31.6" cy="12.3" rx="2.2" ry="1.6" fill="#2a1a0c"/><ellipse cx="37.6" cy="9.3" rx="2.2" ry="1.6" fill="#2a1a0c"/></g>
</g>
</svg>`;

/** The gopher's hole: a dark oval with a lip of dug-up dirt (drawn in front of his feet). */
export const GOPHER_HOLE = `
<svg viewBox="0 0 40 12" overflow="visible" aria-hidden="true">
  <ellipse cx="20" cy="6" rx="18" ry="5.5" fill="#7a5a36" ${OL} stroke-width="2"/>
  <ellipse cx="20" cy="5.5" rx="12" ry="3.4" fill="#2a1a0c"/>
</svg>`;

/** A Canada goose in flight, side view facing right. Joint: wing (pivot at the shoulder). */
export const GOOSE_RIG = `
<svg viewBox="-4 -14 64 40" overflow="visible" aria-hidden="true">
  <g data-j="wingF" data-p="26 12"><path d="M24 12 Q30 -2 40 -8 Q36 6 30 13 Z" fill="#6b5a46" ${OL} stroke-width="1.6"/></g>
  <path d="M8 14 Q4 10 6 8 Q12 10 16 10 L40 9 Q48 11 46 16 Q40 20 22 19 Q12 19 8 14 Z" fill="#8a7458" ${OL} stroke-width="1.8"/>
  <path d="M22 18 Q32 20 42 16" fill="none" stroke="#e8dfcf" stroke-width="3" stroke-linecap="round"/>
  <path d="M6 9 L1 7 L2 12 Z" fill="#1c1c1c" ${OL} stroke-width="1.2"/>
  <path d="M44 12 Q48 6 50 2" fill="none" stroke="#2a1a0c" stroke-width="5.5" stroke-linecap="round"/>
  <path d="M44 12 Q48 6 50 2" fill="none" stroke="#1c1c1c" stroke-width="3.2" stroke-linecap="round"/>
  <ellipse cx="52" cy="1" rx="4.6" ry="3.2" fill="#1c1c1c" ${OL} stroke-width="1.4"/>
  <path d="M49.5 2.4 Q51.5 4 54 2.6" fill="none" stroke="#fff" stroke-width="1.6" stroke-linecap="round"/>
  <path d="M56 0.5 L60 1.4 L56 2.4 Z" fill="#1c1c1c"/>
  <g data-j="wing" data-p="26 12"><path d="M22 12 Q28 -4 40 -10 Q38 6 30 14 Z" fill="#7d6a52" ${OL} stroke-width="1.8"/><path d="M28 6 Q32 0 37 -5" fill="none" stroke="#5a4a38" stroke-width="1.2"/></g>
</svg>`;

/**
 * The pumper (lease operator): side view facing right, FR coveralls and a ball cap, clipboard in
 * hand, feet on y = 70. Joints: root (bob), legB/legF (walk, pivot at the hip), head, arm (holds the
 * clipboard; pivot at the shoulder), hand (the pencil hand, scribbling).
 */
export const PUMPER_RIG = `
<svg viewBox="-4 -4 44 76" overflow="visible" aria-hidden="true">
<g data-j="root" data-p="18 70">
  <g data-j="legB" data-p="17 44"><rect x="13" y="42" width="8" height="24" rx="3.5" fill="#1d3f73" ${OL} stroke-width="2"/><ellipse cx="19" cy="67.5" rx="6" ry="3" fill="#3b2614" ${OL} stroke-width="1.8"/></g>
  <path d="M10 22 Q10 16 18 16 Q26 16 26 22 L27 46 L9 46 Z" fill="#2f5d9e" ${OL} stroke-width="2.2"/>
  <path d="M10 33 H26 M10 37 H26" stroke="#d9e3ee" stroke-width="2.4"/>
  <g data-j="legF" data-p="19 44"><rect x="15" y="42" width="8" height="24" rx="3.5" fill="#2f5d9e" ${OL} stroke-width="2"/><ellipse cx="21" cy="67.5" rx="6" ry="3" fill="#4a2f16" ${OL} stroke-width="1.8"/></g>
  <g data-j="head" data-p="18 15">
    <circle cx="19" cy="9" r="6.5" fill="#f0c49c" ${OL} stroke-width="2"/>
    <path d="M12 7 Q13 1 19 1 Q25 1 25.5 6 L31 7 Q31 9 25 9 L12.5 9 Z" fill="#c0392b" ${OL} stroke-width="1.8"/>
    <circle cx="22" cy="10" r="1.1" fill="#2a1a0c"/>
    <path d="M21 13.5 q1.6 0.8 3 0" fill="none" stroke="#a0442a" stroke-width="1.2" stroke-linecap="round"/>
  </g>
  <g data-j="arm" data-p="17 20">
    <path d="M17 20 Q22 28 28 30" fill="none" stroke="#2a1a0c" stroke-width="6.4" stroke-linecap="round"/>
    <path d="M17 20 Q22 28 28 30" fill="none" stroke="#2f5d9e" stroke-width="4" stroke-linecap="round"/>
    <rect x="25" y="20" width="10" height="13" rx="1.5" fill="#c9a56a" ${OL} stroke-width="1.6" transform="rotate(-12 30 27)"/>
    <rect x="27" y="23" width="6" height="8" fill="#fbfbf6" transform="rotate(-12 30 27)"/>
    <path d="M28 25 h4 M28 27.4 h4 M28 29.8 h3" stroke="#8a8a8a" stroke-width="0.8" transform="rotate(-12 30 27)"/>
    <circle cx="28" cy="30" r="2.6" fill="#f0c49c" ${OL} stroke-width="1.4"/>
  </g>
  <g data-j="hand" data-p="20 22">
    <path d="M20 22 Q24 25 28.5 25" fill="none" stroke="#2a1a0c" stroke-width="6" stroke-linecap="round"/>
    <path d="M20 22 Q24 25 28.5 25" fill="none" stroke="#2f5d9e" stroke-width="3.6" stroke-linecap="round"/>
    <path d="M29 26 L33 20" stroke="#e8b22a" stroke-width="1.8" stroke-linecap="round"/>
    <circle cx="29" cy="25.5" r="2.3" fill="#f0c49c" ${OL} stroke-width="1.3"/>
  </g>
</g>
</svg>`;

/** The pumper's company pickup, side view facing right, wheels on y = 50. Joint: door (swings open). */
export const PUMPER_TRUCK = `
<svg viewBox="0 0 120 52" overflow="visible" aria-hidden="true">
  <path d="M4 22 L4 40 L114 40 L114 30 Q114 24 106 23 L92 21 L82 8 Q80 6 76 6 L56 6 Q52 6 52 10 L52 22 Z" fill="#f4f4f0" ${OL} stroke-width="2.6"/>
  <path d="M58 10 L76 10 L84 21 L58 21 Z" fill="#7fc4e8" ${OL} stroke-width="2"/>
  <rect x="4" y="31" width="110" height="4" fill="#2e8b57"/>
  <path d="M8 22 L48 22" stroke="#cfcfc8" stroke-width="2"/>
  <rect x="108" y="25" width="6" height="5" rx="1.5" fill="#fff6b0" ${OL} stroke-width="1.4"/>
  <g data-j="door" data-p="84 22"><path d="M57 22 L84 22 L84 36 L57 36 Z" fill="#ececE6" ${OL} stroke-width="1.8"/><circle cx="70" cy="28" r="3.4" fill="#2e8b57"/><rect x="77" y="25" width="4" height="1.8" rx="0.9" fill="#8a8a8a"/></g>
  <circle cx="26" cy="41" r="9.5" fill="#2a2725" ${OL} stroke-width="2.5"/><circle cx="26" cy="41" r="3.6" fill="#9a9a9a"/>
  <circle cx="94" cy="41" r="9.5" fill="#2a2725" ${OL} stroke-width="2.5"/><circle cx="94" cy="41" r="3.6" fill="#9a9a9a"/>
</svg>`;

/** A gauge on a short riser outside the fence (what the pumper checks). Joint: needle. */
export const GAUGE_RIG = `
<svg viewBox="0 0 24 44" overflow="visible" aria-hidden="true">
  <rect x="9" y="16" width="6" height="26" rx="1.5" fill="#8a8f96" ${OL} stroke-width="1.8"/>
  <rect x="5" y="38" width="14" height="5" rx="1.5" fill="#6d727a" ${OL} stroke-width="1.6"/>
  <circle cx="12" cy="11" r="9" fill="#fbfbf6" ${OL} stroke-width="2.2"/>
  <path d="M6 13 A7 7 0 0 1 18 13" fill="none" stroke="#c0392b" stroke-width="1.6"/>
  <g data-j="needle" data-p="12 11"><path d="M12 11 L7.5 7" stroke="#2a1a0c" stroke-width="1.6" stroke-linecap="round"/></g>
  <circle cx="12" cy="11" r="1.4" fill="#2a1a0c"/>
</svg>`;

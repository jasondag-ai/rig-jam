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

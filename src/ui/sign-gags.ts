// @ts-nocheck
// Sign gags 16 to 18, at the lease sign, as code puppets ported from the approved reference
// (~/Desktop/RHR Art Inbox/sign_gags_reference.html, saved Oct 5 13:22): the same drawings, the
// worker's build dressed as someone else (`dress`), the same poses and timing.
//   16 THE SURVEYOR (approved as it is): sights the sign, "Off a metre.", yanks it up and moves
//      it a metre, sights again, taps the instrument, "Huh.", carries it back exactly, stamps it
//      in, "Perfect.", folds the tripod and leaves.
//   17 THE BACK SCRATCHER (mule deer) and 18 THE TOURISTS were REVISED by Jay after that file was
//      saved (GAME_BIBLE, Oct 5), and no newer file has arrived, so their revised beats are built
//      here from his words on the reference's own drawings, poses and clock:
//      deer: it rubs its CHEEK AND NECK up and down the sign's near post (no rump rubbing); eyes
//      roll up and back, tongue out, a hind leg thumps; it ambles off past the sign.
//      tourists: SHE PHOTOGRAPHS HIM posing by the sign (he spins round, elbow on the sign,
//      thumbs up), flash, one mosquito, the swarm, both run off; a straggler lands on the sign.
//      If a newer reference arrives, port it over these two.
// Every distance is in the worker's drawing units from the sign, toward the side the visitors
// come from (the NEAR screen edge). In the game that is the right, so strip-gags.ts mirrors the
// stage about the sign (`mirror`); nothing here knows left from right, except the sign's own
// moves and the overlay's lettering, which are turned back.
/* eslint-disable */
import { FLASH_S, camFlash, makePup, place } from './puppet-stage.ts';
const O = '#2b1e16';
const ease = x => x<.5 ? 2*x*x : 1-Math.pow(-2*x+2,2)/2;
const clamp = (x,a=0,b=1) => Math.max(a,Math.min(b,x));
const seg = (t,a,b) => clamp((t-a)/(b-a));
const lerp = (a,b,k) => a + (b-a)*k;

const RED='#c8352b', RED2='#a3281f', STRIPE='#d5dbe2', SKIN='#f0c09a', SKIN2='#dfa47c', BEARD='#7a4f2e', BOOT='#5a3a24', GLOVE='#e0a43a', HAT='#f2c230', HAT2='#fde27a';
const leg = (cls) => `
  <g class="${cls}"><rect x="-5.5" y="-1" width="11" height="16" rx="5" fill="${RED}" stroke="${O}" stroke-width="2.6"/>
    <g class="shin" transform="translate(0 14)"><rect x="-5" y="-1" width="10" height="15" rx="4.5" fill="${RED}" stroke="${O}" stroke-width="2.6"/>
      <rect x="-5" y="5" width="10" height="3.2" fill="${STRIPE}" stroke="${O}" stroke-width="1.2"/>
      <path d="M-6 11 L7 11 Q11 11 11 15 L11 17 L-6 17 Z" fill="${BOOT}" stroke="${O}" stroke-width="2.4" stroke-linejoin="round"/></g></g>`;
const arm = (cls) => `
  <g class="${cls}"><rect x="-5" y="-2" width="10" height="15" rx="5" fill="${RED}" stroke="${O}" stroke-width="2.6"/>
    <rect x="-5" y="6" width="10" height="3" fill="${STRIPE}" stroke="${O}" stroke-width="1.1"/>
    <g class="fore" transform="translate(0 12)"><rect x="-4.5" y="-1" width="9" height="13" rx="4.5" fill="${RED}" stroke="${O}" stroke-width="2.6"/>
      <circle cx="0" cy="13" r="5" fill="${GLOVE}" stroke="${O}" stroke-width="2.4"/></g></g>`;
const WORKER = `
<g class="flip"><g class="root">

  <g class="legB" transform="translate(56 78)">${leg('thighB')}</g>
  <g class="armB" transform="translate(52 56)">${arm('upperB')}</g>
  <g class="torso">
    <rect x="45" y="48" width="32" height="35" rx="12" fill="${RED}" stroke="${O}" stroke-width="3"/>
    <path d="M47 70 Q60 82 75 70 L75 76 Q70 83 61 83 Q51 83 47 76 Z" fill="${RED2}"/>
    <rect x="45.5" y="64" width="31" height="4.5" fill="${STRIPE}" stroke="${O}" stroke-width="1.4"/>
    <rect x="66" y="52" width="7" height="8" rx="1.5" fill="#f2c230" stroke="${O}" stroke-width="1.6"/>
    <path d="M50 50 Q54 47 58 52" stroke="#e05a4e" stroke-width="2.5" fill="none" stroke-linecap="round"/>
  </g>
  <g class="legF" transform="translate(64 78)">${leg('thighF')}</g>
  <g class="head">
    <circle cx="52" cy="37" r="4.2" fill="${SKIN}" stroke="${O}" stroke-width="2"/>
    <circle cx="63" cy="36" r="16" fill="${SKIN}" stroke="${O}" stroke-width="3"/>
    <path d="M49 30 Q52 24 60 23" stroke="#fbd9bd" stroke-width="3" fill="none" stroke-linecap="round"/>
    <path d="M48 39 Q50 54 64 54 Q77 54 79 40 Q73 46 64 46 Q55 46 48 39 Z" fill="${BEARD}" stroke="${O}" stroke-width="2.2" stroke-linejoin="round"/>
    <path class="mouth" d="M64 47 Q68 48.5 72 47" stroke="${O}" stroke-width="2.2" fill="none" stroke-linecap="round"/>
    <circle class="blush" cx="68" cy="42" r="4" fill="#f08c80" opacity="0"/>
    <circle cx="78.5" cy="38" r="3.8" fill="${SKIN2}" stroke="${O}" stroke-width="2"/>
    <path d="M53 33 L64 32" stroke="${O}" stroke-width="1.8"/>
    <circle cx="70" cy="33" r="7.6" fill="#e2f2fa" stroke="${O}" stroke-width="2.2"/>
    <circle cx="70" cy="33" r="4.6" fill="#fff"/>
    <circle class="pupil" cx="71.5" cy="33.5" r="2.4" fill="${O}"/>
    <path class="lid" d="M65 28 L75 28 L75 29 L65 29 Z" fill="${SKIN}" stroke="${O}" stroke-width="1.4"/>
    <path class="brow" d="M65 24.5 Q70 22.5 76 24.5" stroke="${BEARD}" stroke-width="2.8" fill="none" stroke-linecap="round"/>
    <g class="hat"><path d="M46 26 Q46 9 63 9 Q80 9 80 26 Z" fill="${HAT}" stroke="${O}" stroke-width="2.8" stroke-linejoin="round"/>
      <path d="M52 20 Q54 13 62 12" stroke="${HAT2}" stroke-width="3" fill="none" stroke-linecap="round"/>
      <path d="M63 9 L63 25" stroke="${O}" stroke-width="1.6"/>
      <rect x="42" y="24" width="42" height="5" rx="2.5" fill="${HAT}" stroke="${O}" stroke-width="2.6"/></g>
  </g>
  <g class="armF" transform="translate(70 56)">${arm('upperF')}</g>
</g></g>`;

/* ---------------- shared ---------------- */
/** The lease sign: the board's own blank sign, as the reference draws it. Permanent scenery (strip-gags.ts `SignProp`). */
export
const SIGN = `<g class="sg">
<rect x="12.5" y="27" width="4.6" height="31" rx="1" fill="#7a4f2e" stroke="${O}" stroke-width="1.8"/>
<rect x="43" y="27" width="4.6" height="31" rx="1" fill="#7a4f2e" stroke="${O}" stroke-width="1.8"/>
<rect x="7.5" y="5" width="45" height="23.5" rx="1.6" fill="#f8f6ef" stroke="${O}" stroke-width="2.4"/>
<rect x="9" y="24.6" width="42" height="2.6" fill="#e2ddd0"/></g>`;
/** The sign's box is this share of the screen's width (the worker's 0.19 x 60/120). */
export const SIGN_FRAC = .19*60/120;
export const signPup = (host, f, spot) => makePup(host, SIGN, {vw:60, vh:60, ax:30, ay:58, frac:SIGN_FRAC*f, spot});
/** The worker-sized visitors' box, as a share of the screen's width. */
export const VISITOR_FRAC = .19;
const z = (p, n) => { p.svg.style.zIndex = String(n); return p; };

/** Put a puppet's anchor at a pixel point, optionally rotated about its anchor. */
function placePx(p, x, y, rot = 0){
  const r = p.host.getBoundingClientRect();
  const w = p.frac*r.width, h = w*p.vh/p.vw, u = w/p.vw;
  p.svg.style.width = w+'px'; p.svg.style.height = h+'px';
  p.svg.style.left = (x - p.ax*u)+'px'; p.svg.style.top = (y - p.ay*u)+'px';
  p.svg.style.transformOrigin = `${p.ax*u}px ${p.ay*u}px`; p.svg.style.transform = rot ? `rotate(${rot}deg)` : '';
  return u;
}
/** A point of a puppet's part, in the stage's own px (the stage may be mirrored about the sign: `sc.mirror`). */
function pt(sc, B, sel, x, y){ const el = B.q(sel), m = el.getScreenCTM(), r = sc.frame.getBoundingClientRect(); const sx = m.a*x + m.c*y + m.e - r.left, sy = m.b*x + m.d*y + m.f - r.top;
  return {x: sc.mirror ? 2*sc.spot.x*r.width - sx : sx, y: sy}; }

/** Dress the worker build as someone else. */
function dress(P, o){
  const S = P.svg, T = S.querySelector('.torso');
  T.children[0].setAttribute('fill', o.top); T.children[1].setAttribute('fill', o.shade);
  T.children[2].style.display = o.stripes ? '' : 'none'; T.children[3].style.display = o.badge ? '' : 'none'; T.children[4].setAttribute('stroke', o.shade);
  if (o.vest) T.children[1].insertAdjacentHTML('afterend', `<path d="M46 54 Q46 49 52 49 L70 49 Q76 49 76 54 L76 79 Q70 83 61 83 Q51 83 46 79 Z" fill="${o.vest}" stroke="${O}" stroke-width="2.4"/><rect x="46.5" y="62" width="29" height="4" fill="#e9eef2" stroke="${O}" stroke-width="1.3"/><rect x="46.5" y="71" width="29" height="4" fill="#e9eef2" stroke="${O}" stroke-width="1.3"/>`);
  if (o.torsoExtra) T.insertAdjacentHTML('beforeend', o.torsoExtra);
  ['.armB','.armF'].forEach(sel => { const g = S.querySelector(sel+' > g'); g.children[0].setAttribute('fill', o.top); g.children[1].style.display = o.stripes ? '' : 'none';
    const fo = g.querySelector('.fore'); fo.querySelector('rect').setAttribute('fill', o.forearm || o.top); fo.querySelector('circle').setAttribute('fill', o.hands || GLOVE); });
  ['.legB','.legF'].forEach(sel => { const g = S.querySelector(sel+' > g'); g.children[0].setAttribute('fill', o.pants); const sh = g.querySelector('.shin');
    sh.children[0].setAttribute('fill', o.shins || o.pants); sh.children[1].style.display = o.stripes ? '' : 'none'; sh.children[2].setAttribute('fill', o.boots || BOOT); });
  if (!o.beard){ const b = S.querySelector(`.head path[fill="${BEARD}"]`); b.setAttribute('fill', 'none'); b.setAttribute('stroke', SKIN2); b.setAttribute('stroke-width', '2'); b.setAttribute('d', 'M50 44 Q54 52 64 53 Q74 53 77 45'); }
  if (o.moustache) S.querySelector('.head .mouth').insertAdjacentHTML('beforebegin', `<path d="M61 45.5 Q64 42 69 43 Q74 42 78 45 Q78 47.5 75.5 47.5 Q72 45.8 69 46.2 Q64.5 47 61 45.5 Z" fill="${o.moustache}" stroke="${O}" stroke-width="1.6"/>`);
  if (o.hat) S.querySelector('.hat').innerHTML = o.hat;
  if (o.hardHat){ S.querySelectorAll('.hat path, .hat rect').forEach(e => { if (e.getAttribute('fill') === HAT) e.setAttribute('fill', o.hardHat); if (e.getAttribute('stroke') === HAT2) e.setAttribute('stroke', o.hardHat2); }); }
  if (o.hair) S.querySelector('.head').insertAdjacentHTML('afterbegin', o.hair);
}
const PHONE = `<g class="phone" style="display:none"><rect x="-2" y="4" width="10" height="15" rx="2" fill="#2f3440" stroke="${O}" stroke-width="1.6" transform="rotate(-20 3 11)"/><rect x="-.4" y="5.8" width="6.8" height="10.6" rx="1" fill="#8fd3f0" transform="rotate(-20 3 11)"/></g>`;

function base(){ return {dx:-400, y:0, rot:0, face:1, thB:0,thF:0,shB:0,shF:0, arB:0,arF:0,foF:-10,foB:-10, head:0,hatY:0,
  px:71.5,py:33.5, lid:'M65 28 L75 28 L75 29 L65 29 Z', brow:'M65 24.5 Q70 22.5 76 24.5', mouth:'M64 47 Q68 48.5 72 47', show:true, phone:false, flush:0}; }
const walkP = (o, t, speed, amp, phase = 0) => { const c = Math.sin((t+phase)*2*Math.PI*speed);
  o.thB = c*amp; o.thF = -c*amp; o.shB = Math.max(0,-c)*amp*.9; o.shF = Math.max(0,c)*amp*.9; o.arB = -c*amp*.8; o.arF = c*amp*.8; o.foB = -12; o.foF = -12;
  o.y = -Math.abs(Math.cos((t+phase)*2*Math.PI*speed))*2.2; o.hatY = -Math.abs(Math.cos((t+phase)*2*Math.PI*speed - .6))*1.2; };
const hop = (o, k, from, to) => { o.face = k < .5 ? from : to; o.y = -Math.sin(k*Math.PI)*6; o.thB = o.thF = -12*Math.sin(k*Math.PI); o.shB = o.shF = 18*Math.sin(k*Math.PI); };

function pupApply(B, p){
  const q = B.q;
  q('.flip').style.visibility = p.show ? 'visible' : 'hidden';
  q('.flip').setAttribute('transform', p.face < 0 ? 'translate(120 0) scale(-1 1)' : '');
  const body = `translate(0 ${p.y}) rotate(${p.rot} 60 84)`;
  ['.legB','.armB','.torso','.legF','.head','.armF'].forEach(sel => {
    const g = q(sel); const base = g.dataset.base ?? (g.dataset.base = g.getAttribute('transform') || '');
    let extra = '';
    if (sel === '.head') extra = ` rotate(${p.head} 62 50)`;
    if (sel === '.legB') extra = ` rotate(${p.thB})`; if (sel === '.legF') extra = ` rotate(${p.thF})`;
    if (sel === '.armB') extra = ` rotate(${p.arB})`; if (sel === '.armF') extra = ` rotate(${p.arF})`;
    const bod = (sel === '.legB' || sel === '.legF') ? `translate(0 ${p.y})` : body;
    g.setAttribute('transform', `${bod} ${base}${extra}`);
  });
  q('.legB .shin').setAttribute('transform', `translate(0 14) rotate(${p.shB})`); q('.legF .shin').setAttribute('transform', `translate(0 14) rotate(${p.shF})`);
  q('.armB .fore').setAttribute('transform', `translate(0 12) rotate(${p.foB})`); q('.armF .fore').setAttribute('transform', `translate(0 12) rotate(${p.foF})`);
  q('.hat').setAttribute('transform', `translate(0 ${p.hatY})`);
  q('.pupil').setAttribute('cx', p.px); q('.pupil').setAttribute('cy', p.py);
  q('.lid').setAttribute('d', p.lid); q('.brow').setAttribute('d', p.brow);
  q('.mouth').setAttribute('d', p.mouth); q('.mouth').setAttribute('fill', p.mouth.includes('Z') ? '#7a2a22' : 'none');
  q('.blush').setAttribute('opacity', 0);
  const ph = q('.phone'); if (ph) ph.style.display = p.phone ? '' : 'none';
  const tu = q('.thumb'); if (tu) tu.style.display = p.thumb ? '' : 'none';
}
const puff = (x, y, k, s, n = 5) => { let h = ''; for (let i = 0; i < n; i++){ const a = Math.PI*(1 + i/(n-1)), d = (4 + k*10)*s;
  h += `<circle cx="${x + Math.cos(a)*d}" cy="${y + Math.sin(a)*d*.5}" r="${(2 + k*2.5)*s}" fill="#d9c7a3" stroke="${O}" stroke-width="${Math.max(.8, .9*s)}" opacity="${1-k}"/>`; } return h; };
/** One sign gag's stage: `stage` holds the visitors (mirrored about the sign when they come from the right), `frame` is the unmirrored layer, `sign` the permanent sign's own puppet. */
function stageOf(stage, frame, sign, f, spot, mirror){ return {f, spot, stage, frame, sign, mirror, way: mirror ? -1 : 1}; }
const overlay = (host) => { const ov = document.createElementNS('http://www.w3.org/2000/svg','svg'); ov.setAttribute('class','pup-overlay'); host.appendChild(ov); return ov; };

/* ================= 1. THE SURVEYOR ================= */
const TRIPOD = `<g class="legs" stroke-linecap="round"></g>
<g class="headpiece"><rect x="11" y="44" width="18" height="4.5" rx="1.5" fill="#7d858f" stroke="${O}" stroke-width="1.8"/>
<rect x="13.5" y="30" width="13" height="14.5" rx="2" fill="#f2c230" stroke="${O}" stroke-width="2"/>
<rect x="7" y="33" width="26" height="5.5" rx="2" fill="#3a3f46" stroke="${O}" stroke-width="1.8"/>
<circle cx="32" cy="35.7" r="1.6" fill="#8fd3f0"/>
<path d="M16 30 Q20 25 24 30" fill="none" stroke="${O}" stroke-width="2"/></g>`;
/** FOLDED, THE TRIPOD IS COLLAPSED: its legs are telescoped to half their length (`TRI_SHORT` shorter), so he can carry it against him. Unfolding (`spread` 0 to 1) spreads the legs and runs them out together, and the instrument rises on them. */
export const TRI_SHORT = 30;
const tripodTop = (spread) => 48 + TRI_SHORT*(1 - spread);
const tripodLegs = (spread) => { const top = tripodTop(spread), feet = [[20 - 15*spread, 108], [20, 106 - 2*(1-spread)], [20 + 15*spread, 108]];
  return feet.map(([x,y]) => `<path d="M20 ${top} L${x} ${y}" stroke="${O}" stroke-width="5"/><path d="M20 ${top} L${x} ${y}" stroke="#e7b33b" stroke-width="2.6"/>`).join(''); };

export const SURVEY_BEATS = [[0,'just-the-sign','Just the lease sign'],[.3,'walks-in','A surveyor walks in from the near edge, tripod in hand'],[2.3,'plants-tripod','Plants the tripod and spreads its legs'],[2.9,'sights','Sights the sign through the instrument. Squints'],[4.0,'looks-again','Pulls back, blinks, looks again'],[4.6,'off-a-metre','"Off a metre."'],[5.2,'marches-over','Marches over and grabs the sign'],[6.4,'yanks','Yanks it out of the ground. Dirt flies'],[6.8,'moves-it','Shuffles it a metre over and plants it. Thunk'],[7.9,'heads-back','Hop-turns and heads back to the tripod'],[8.9,'sights-again','Sights it again. Long pause'],[9.6,'huh','Taps the instrument. "Huh."'],[10.4,'pulls-it-up','Marches back, pulls the sign up again'],[11.3,'carries-back','Carries it back to exactly where it was'],[12.0,'stamps','Plants it, stamps the dirt down'],[12.8,'perfect','Dusts his hands. "Perfect."'],[13.4,'folds-tripod','Folds up the tripod'],[14.9,'walks-off','Walks off the way he came. Just the sign again']];
export const SURVEY_END = 17.1;
/** THE TRIPOD IS PART OF HIS HAND. Carried, it is drawn inside his front forearm's own group, so
    it goes wherever the glove goes with no measuring and no tween of its own. It changes hands
    with the ground only at an instant when the two drawings are the same by arithmetic: he stands
    in the HOLD pose with the folded tripod upright and its feet on the ground at `TRI_AT`.
    `T_PLANT` / `T_PICKUP`: those two instants (s). `TRI_AT`: where it stands (his units from the sign). */
export const T_PLANT = 2.45, T_PICKUP = 14.85, TRI_AT = -70;
/** His front arm when he sets the tripod down or takes it up, and when he carries it; the carried tripod's lean (degrees, toward the way he faces). */
export const HOLD = {arF:0, foF:-20}, CARRY = {arF:40, foF:-95}, CARRY_LEAN = -14;
// (Carried COLLAPSED and clutched against his belly, leaning a little back: nothing of it leads him
// onto the screen and it never covers his face. Held out in front at full length, its thin folded
// legs came on before he did: "a thin object" ahead of the gag.)
/** His front glove in his own drawing (120 box, facing right, standing straight), from the arm's two angles. */
export const gloveAt = (arF, foF) => { const a = arF*Math.PI/180, b = (arF+foF)*Math.PI/180; return {x: 70 - 12*Math.sin(a) - 13*Math.sin(b), y: 56 + 12*Math.cos(a) + 13*Math.cos(b)}; };
const HOLD_AT = gloveAt(HOLD.arF, HOLD.foF);
/** Where on the tripod's own drawing the glove grips it: with the HOLD pose its feet (y 108) are on his ground line. */
export const GRIP = {x:20, y:HOLD_AT.y};
/** Where he stands to set it down (facing the sign) and to take it up (facing away), so the glove is right on the standing tripod. */
export const PLANT_DX = TRI_AT - (HOLD_AT.x - 60), PICK_DX = TRI_AT + (HOLD_AT.x - 60);
/** Where the carried tripod is, from his pose alone (his units from the sign; `foot` above the ground): what the tests check against the standing one. */
export function heldTripod(w, lean = 0){ const g = gloveAt(w.arF, w.foF), r = lean*Math.PI/180, fy = 108 - GRIP.y;
  return {x: w.dx + (g.x - 60 - Math.sin(r)*fy)*w.face, foot: 108 - (g.y + w.y + Math.cos(r)*fy)}; }
/** What he says, and when (the reference's `say`). */
export const SURVEY_LINES = [{from:4.6, to:5.2, text:'Off a metre.'}, {from:9.9, to:10.4, text:'Huh.'}, {from:12.8, to:13.4, text:'Perfect.'}];
export function surveyScene(stage, frame, sign, f, spot, mirror){
  const sc = stageOf(stage, frame, sign, f, spot, mirror);
  // The standing tripod: its own drawing, put on its spot once and never moved.
  sc.tri = z(makePup(stage, TRIPOD, {vw:40, vh:110, ax:20, ay:108, frac:.19*f*40/120, spot}), 4);
  // (Nothing is drawn before its first frame says so: the standing tripod starts hidden.)
  sc.tri.svg.style.visibility = 'hidden';
  sc.man = z(makePup(stage, WORKER, {vw:120, vh:120, ax:60, ay:108, frac:.19*f, spot}), 5);
  sc.man.q('.flip').style.visibility = 'hidden';
  // The carried tripod: the same drawing, folded, inside his front forearm (under the glove that grips it).
  sc.man.q('.armF .fore').insertAdjacentHTML('afterbegin', `<g class="held" style="display:none">${TRIPOD}</g>`);
  sc.held = sc.man.q('.armF .fore .held'); sc.held.querySelector('.legs').innerHTML = tripodLegs(0);
  sc.held.querySelector('.headpiece').setAttribute('transform', `translate(0 ${TRI_SHORT})`);
  dress(sc.man, {top:'#c9b07a', shade:'#ad9560', vest:'#f07f2a', pants:'#6d6a4f', hardHat:'#f7f7f2', hardHat2:'#ffffff', beard:false, moustache:'#7a4f2e'});
  sc.ov = overlay(stage);
  return sc;
}
/** The pose at a time. `off`: how far from the sign (his units) he is fully off the near edge (the reference: 330). */
export function surveyPose(t, off = 330){
    const w = base(); let tri = {mode:'hand', spread:0, lean:CARRY_LEAN}, sg = {dx:0, lift:0, puff:-1, puffX:0}, say = null;
    const SCOPE = -95, GRAB1 = -44, GRAB2 = -59;
    const carry = (o) => { o.arF = CARRY.arF; o.foF = CARRY.foF; };
    const look = (o) => { o.dx = SCOPE; o.rot = 7; o.head = 6; o.px = 74.2; o.py = 34; o.arF = -60; o.foF = -40; o.arB = -40; o.foB = -50; };
    const grab = (o) => { o.arF = -84; o.arB = -84; o.foF = -10; o.foB = -10; };
    if (t < .3){ w.show = false; tri.mode = 'hidden'; }
    else if (t < 2.3){ const k = seg(t,.3,2.3); w.dx = lerp(-off, PLANT_DX, k < .88 ? k/.88*.97 : .97 + ease((k-.88)/.12)*.03); walkP(w, t, 1.8, 22); carry(w); }
    else if (t < T_PLANT){ const k = ease(seg(t,2.3,T_PLANT - .03)), a = base(); walkP(a, 2.3, 1.8, 22);            // stops; lowers it, in his hand, until its feet are on the ground
      w.dx = PLANT_DX; w.y = a.y*(1-k); w.hatY = a.hatY*(1-k); w.thB = a.thB*(1-k); w.thF = a.thF*(1-k); w.shB = a.shB*(1-k); w.shF = a.shF*(1-k); w.arB = a.arB*(1-k);
      w.arF = lerp(CARRY.arF, HOLD.arF, k); w.foF = lerp(CARRY.foF, HOLD.foF, k); tri.lean = CARRY_LEAN*(1-k); }
    else if (t < 2.9){ const k = ease(seg(t,2.55,2.9)); w.dx = lerp(PLANT_DX, SCOPE, k); w.arF = HOLD.arF; w.foF = HOLD.foF; w.rot = 4*k;            // it stands; he spreads its legs and steps back to the eyepiece
      w.thB = Math.sin(k*Math.PI*2)*8; w.thF = -w.thB; tri.mode = 'stand'; tri.spread = ease(seg(t,T_PLANT,2.85)); }
    else if (t < 4.0){ look(w); w.lid = 'M65 26 L75 26 L75 34 L65 34 Z'; w.brow = 'M65 26 Q70 24.5 76 25.5'; tri.mode = 'stand'; tri.spread = 1; }
    else if (t < 4.6){ tri.mode = 'stand'; tri.spread = 1; if (t < 4.2){ w.dx = SCOPE; w.rot = 0; w.head = 0; w.px = 72; w.lid = t < 4.1 ? 'M65 27 L75 27 L75 38 L65 38 Z' : 'M65 28 L75 28 L75 29 L65 29 Z'; w.brow = 'M65 23 Q70 21 76 23'; } else { look(w); w.lid = 'M65 26 L75 26 L75 34 L65 34 Z'; } }
    else if (t < 5.2){ w.dx = SCOPE; tri.mode = 'stand'; tri.spread = 1; w.px = 74.2; w.brow = 'M65 25.5 Q70 24 76 25.5'; w.mouth = 'M65 47.5 L71 47.5'; w.arF = -100; w.foF = -110; say = 'Off a metre.'; }   // hand to chin
    else if (t < 6.0){ const k = seg(t,5.2,6.0); w.dx = lerp(SCOPE, GRAB1, k); walkP(w, t, 1.8, 20); tri.mode = 'stand'; tri.spread = 1; w.brow = 'M65 25.5 Q70 24 76 25.5'; }
    else if (t < 6.4){ w.dx = GRAB1; grab(w); w.y = 4*ease(seg(t,6.0,6.4)); w.thB = w.thF = -20*ease(seg(t,6.0,6.4)); w.shB = w.shF = 30*ease(seg(t,6.0,6.4)); tri.mode = 'stand'; tri.spread = 1; w.brow = 'M65 26.5 Q70 24 76 25.5'; }   // crouch, grab
    else if (t < 6.8){ const k = ease(seg(t,6.4,6.6)); w.dx = GRAB1; grab(w); w.y = 4*(1-k); w.rot = -8*k; w.thB = w.thF = -20*(1-k); w.shB = w.shF = 30*(1-k); sg.lift = 12*k; sg.puff = seg(t,6.4,6.8); sg.puffX = 0; tri.mode = 'stand'; tri.spread = 1; w.mouth = 'M65 46 Q68 44 71 46 Q71 49 68 49 Q65 49 65 46 Z'; }
    else if (t < 7.9){ const k = seg(t,6.8,7.6); w.dx = lerp(GRAB1, GRAB2, k); grab(w); w.rot = -5; sg.dx = lerp(0, -15, k); sg.lift = t < 7.6 ? 12 : 12*(1 - ease(seg(t,7.6,7.72))); w.thB = Math.sin(t*20)*8; w.thF = -Math.sin(t*20)*8;     // shuffles back a metre
      if (t > 7.72){ sg.puff = seg(t,7.72,8.1); sg.puffX = -15; w.y = Math.sin(seg(t,7.72,7.9)*Math.PI)*2; } tri.mode = 'stand'; tri.spread = 1; }
    else if (t < 8.1){ w.dx = GRAB2; hop(w, seg(t,7.9,8.1), 1, -1); sg.dx = -15; tri.mode = 'stand'; tri.spread = 1; if (t < 8.1) sg.puff = seg(t,7.72,8.1), sg.puffX = -15; }
    else if (t < 8.7){ const k = seg(t,8.1,8.7); w.face = -1; w.dx = lerp(GRAB2, SCOPE, k); walkP(w, t, 1.8, 20); sg.dx = -15; tri.mode = 'stand'; tri.spread = 1; }
    else if (t < 8.9){ w.dx = SCOPE; hop(w, seg(t,8.7,8.9), -1, 1); sg.dx = -15; tri.mode = 'stand'; tri.spread = 1; }
    else if (t < 9.6){ look(w); w.lid = 'M65 26 L75 26 L75 34 L65 34 Z'; sg.dx = -15; tri.mode = 'stand'; tri.spread = 1; }
    else if (t < 10.4){ w.dx = SCOPE; sg.dx = -15; tri.mode = 'stand'; tri.spread = 1; w.arF = -70 + Math.sin(t*30)*6*(t < 9.9 ? 1 : 0); w.foF = -50; w.px = t < 9.95 ? 75 : 74.2; w.py = 34;
      w.brow = 'M65 23.5 Q70 22 76 24.5'; w.mouth = 'M65 47.5 Q68 46.5 71 47.5'; say = t > 9.9 ? 'Huh.' : null; }                                   // taps the instrument
    else if (t < 11.0){ const k = seg(t,10.4,11.0); w.dx = lerp(SCOPE, GRAB2, k); walkP(w, t, 1.8, 20); sg.dx = -15; tri.mode = 'stand'; tri.spread = 1; }
    else if (t < 11.3){ const k = ease(seg(t,11.0,11.3)); w.dx = GRAB2; grab(w); w.rot = -8*k; sg.dx = -15; sg.lift = 12*k; sg.puff = seg(t,11.0,11.4); sg.puffX = -15; tri.mode = 'stand'; tri.spread = 1; }
    else if (t < 12.3){ const k = seg(t,11.3,12.0); w.dx = lerp(GRAB2, GRAB1, k); grab(w); w.rot = -5; walkP(w, t, 1.6, 12); w.arF = w.arB = -84; w.foF = w.foB = -10; sg.dx = lerp(-15, 0, k); sg.lift = t < 12.0 ? 12 : 12*(1 - ease(seg(t,12.0,12.12)));
      if (t > 12.12){ sg.puff = seg(t,12.12,12.5); w.y = Math.sin(seg(t,12.12,12.3)*Math.PI)*2; } tri.mode = 'stand'; tri.spread = 1; }
    else if (t < 12.8){ w.dx = GRAB1; const s = Math.max(0, Math.sin((t-12.3)*Math.PI*4)); w.thF = -30*s; w.shF = 30*s; w.y = -s*1.5; tri.mode = 'stand'; tri.spread = 1; sg.puff = t < 12.5 ? seg(t,12.12,12.5) : seg(t,12.55,12.8); w.brow = 'M65 25.5 Q70 24 76 25.5'; }   // stamps the dirt down
    else if (t < 13.4){ w.dx = GRAB1; tri.mode = 'stand'; tri.spread = 1; w.px = 74.2; w.arF = -70 + Math.sin(t*28)*10; w.foF = -60; w.arB = -60 + Math.sin(t*28 + 1)*10; w.foB = -60; w.mouth = 'M64 46.5 Q68 49.5 72 46.5'; w.lid = 'M65 27 Q70 30 75 27 L75 33 L65 33 Z'; say = 'Perfect.'; }
    else if (t < 13.6){ w.dx = GRAB1; hop(w, seg(t,13.4,13.6), 1, -1); tri.mode = 'stand'; tri.spread = 1; }
    else if (t < 14.4){ const k = seg(t,13.6,14.4); w.face = -1; w.dx = lerp(GRAB1, PICK_DX, k); walkP(w, t, 1.8, 20); tri.mode = 'stand'; tri.spread = 1; }
    else if (t < T_PICKUP){ w.face = -1; w.dx = PICK_DX; w.arF = HOLD.arF; w.foF = HOLD.foF; tri.mode = 'stand'; tri.spread = 1 - ease(seg(t,14.45,14.8)); }   // his glove on it while it folds
    else if (t < 15.05){ const k = ease(seg(t,T_PICKUP + .02,15.05)); w.face = -1; w.dx = PICK_DX; w.arF = lerp(HOLD.arF, CARRY.arF, k); w.foF = lerp(HOLD.foF, CARRY.foF, k); tri.lean = CARRY_LEAN*k; }   // in his hand again; lifts it
    else if (t < 16.9){ const k = seg(t,15.05,16.9); w.face = -1; w.dx = lerp(PICK_DX, -(off + 70), k); walkP(w, t - 15.05, 1.8, 22*Math.min(1, (t - 15.05)*4)); carry(w); }
    else { w.show = false; tri.mode = 'hidden'; }
    return {w, tri, sg, say};
}
export function surveyApply(sc, P, t){
  const {w, tri, sg} = P, r = sc.stage.getBoundingClientRect(), u = sc.man.frac*r.width/120;
  place(sc.man, w.dx); pupApply(sc.man, w);
  // The sign is the permanent one, on its own (unmirrored) layer: its moves are turned to the stage's way.
  place(sc.sign, sg.dx*sc.way); sc.sign.svg.style.transform = sg.lift ? `translateY(${-sg.lift*u}px)` : '';
  // The standing tripod never moves; its legs are redrawn only when their spread changes.
  place(sc.tri, TRI_AT);
  if (tri.mode === 'stand' && sc.spread !== tri.spread){ sc.tri.q('.legs').innerHTML = tripodLegs((sc.spread = tri.spread)); sc.tri.q('.headpiece').setAttribute('transform', `translate(0 ${TRI_SHORT*(1 - tri.spread)})`); }
  sc.tri.svg.style.visibility = tri.mode === 'stand' ? 'visible' : 'hidden';
  // The carried one is a child of his forearm: kept upright by taking the arm's own turn back out
  // (plus the carrying lean), and turned back when he is mirrored so the instrument faces the same way.
  sc.held.style.display = tri.mode === 'hand' ? '' : 'none';
  if (tri.mode === 'hand') sc.held.setAttribute('transform', `translate(0 13) rotate(${(tri.lean || 0) - w.rot - w.arF - w.foF})${w.face < 0 ? ' scale(-1 1)' : ''} translate(${-GRIP.x} ${-GRIP.y})`);
  let html = '';
  if (sg.puff >= 0 && sg.puff < 1) html += puff(sc.spot.x*r.width + sg.puffX*u, sc.spot.y*r.height, sg.puff, u);
  if (sc.ovHtml !== html) sc.ov.innerHTML = sc.ovHtml = html;
}

/* ================= 2. THE BACK SCRATCHER (mule deer) ================= */
const D = '#9c7d5f', D2 = '#806650', CREAM = '#f3ead8', DK = '#3b302a';
const dleg = (cls, x, col) => `<g class="${cls}" transform="translate(${x} 62)"><rect x="-3.6" y="-1" width="7.2" height="25" rx="3.6" fill="${col}" stroke="${O}" stroke-width="2.2"/>
  <g class="sh" transform="translate(0 23)"><rect x="-2.2" y="-1" width="4.4" height="22" rx="2.2" fill="${col}" stroke="${O}" stroke-width="2"/><path d="M-3 19 L3 19 L3.4 23 L-3.4 23 Z" fill="${DK}" stroke="${O}" stroke-width="1.5"/></g></g>`;
const DEER = `<g class="flip"><g class="root">
${dleg('lhf', 46, D2)}${dleg('lff', 94, D2)}
<g class="bod">
<path d="M35 47 Q27 49 28.5 57 Q32 55 34 51 Z" fill="${CREAM}" stroke="${O}" stroke-width="1.6"/><circle cx="29" cy="56" r="1.9" fill="${DK}"/>
<path d="M88 50 Q93 32 101 26 L110 32 Q101 44 99 62 Z" fill="${D}" stroke="${O}" stroke-width="2.6" stroke-linejoin="round"/>
<ellipse cx="66" cy="55" rx="34" ry="16" fill="${D}" stroke="${O}" stroke-width="2.8"/>
<ellipse cx="38" cy="54" rx="7.5" ry="10.5" fill="${CREAM}"/>
<path d="M44 66 Q66 72 88 66" stroke="${CREAM}" stroke-width="3" fill="none" stroke-linecap="round"/>
<path d="M46 44 Q62 39 80 42" stroke="#b39477" stroke-width="3" fill="none" stroke-linecap="round"/>
</g>
<g class="dhead">
<path d="M99 23 Q90 5 83 9 Q87 21 98 26 Z" fill="${D2}" stroke="${O}" stroke-width="2.2"/>
<ellipse cx="110" cy="28" rx="13.5" ry="8" fill="${D}" stroke="${O}" stroke-width="2.6" transform="rotate(16 110 28)"/>
<path d="M101 23 Q105 18 112 20" stroke="#6e5641" stroke-width="3" fill="none" stroke-linecap="round"/>
<ellipse cx="120.5" cy="32.5" rx="5.6" ry="4.6" fill="#5b4a40" stroke="${O}" stroke-width="1.8"/>
<ellipse cx="124.5" cy="31.2" rx="2.2" ry="1.8" fill="${DK}"/>
<ellipse cx="117" cy="36.5" rx="4" ry="1.8" fill="${CREAM}"/>
<path class="tongue" d="M119 37 Q121 43 124 41 Q123 38 121 36 Z" fill="#e98a8a" stroke="${O}" stroke-width="1.2" style="display:none"/>
<circle cx="109" cy="25" r="3.3" fill="#fff" stroke="${O}" stroke-width="1.4"/><circle class="dpup" cx="110" cy="25.3" r="1.8" fill="${DK}"/>
<path class="dlid" d="M105.5 21.5 L112.5 21.5 L112.5 22 L105.5 22 Z" fill="${D}" stroke="${O}" stroke-width="1"/>
<g class="ear"><path d="M103 21 Q96 2 88 4 Q90 18 101 25 Z" fill="${D}" stroke="${O}" stroke-width="2.4"/><path d="M100.5 20 Q95 8 90.5 7.5 Q92 16 99 22 Z" fill="#e8b5a8"/></g>
</g>
${dleg('lhn', 42, D)}${dleg('lfn', 90, D)}
</g></g>`;
export const DEER_BEATS = [[0,'just-the-sign','Just the lease sign'],[.3,'wanders-in','A mule deer wanders in from the near edge'],[2.3,'eyes-the-post','Stops at the sign. Ears flick. Eyes the near post'],[2.7,'leans-in','Leans its cheek and neck against the post'],[3.1,'rubs','Rubs cheek and neck up and down the post. The sign rattles'],[3.8,'bliss','Eyes roll up and back in bliss, tongue out'],[4.8,'thump','One hind leg thumps like a dog'],[6.3,'sigh','Big happy sigh'],[6.7,'shake','A shake of the head, ears flapping'],[7.1,'ambles-off','Ambles off past the sign. Just the sign again']];
export const DEER_END = 9.5;
/** The deer's box (140 wide in the worker's units), as a share of the screen's width. */
export const DEER_FRAC = .19*140/120;
/**
 * Where it stands to rub: its chest just short of the sign's near end (the board's end is 22.5
 * units this side of the sign's middle, over the near post; the deer's chest is 34 ahead of its own
 * middle), so its lowered neck and cheek lie on the near post's corner of the sign.
 */
export const DEER_STOP = -58;
export function deerScene(stage, frame, sign, f, spot, mirror){
  const sc = stageOf(stage, frame, sign, f, spot, mirror);
  sc.deer = z(makePup(stage, DEER, {vw:140, vh:110, ax:70, ay:108, frac:DEER_FRAC*f, spot}), 5);
  return sc;
}
/** The pose at a time. `off`: fully off the near edge; `far`: fully off the far one, past the sign (its units from the sign). */
export function deerPose(t, off = 330, far = 460){
  const d = {dx:-off, y:0, rot:0, legs:0, amp:0, head:0, ear:0, lid:0, px:110, py:25.3, tongue:false, thump:0, show:true, sx:1, sy:1};
  let rattle = 0;
  const STOP = DEER_STOP;
  if (t < .3) d.show = false;
  else if (t < 2.3){ const k = seg(t,.3,2.3); d.dx = lerp(-off, STOP - 6, k < .85 ? k/.85*.95 : .95 + ease((k-.85)/.15)*.05); d.legs = t*2*Math.PI*1.7; d.amp = 20; d.y = -Math.abs(Math.sin(t*2*Math.PI*1.7))*1.4; d.head = Math.sin(t*2*Math.PI*1.7)*2; }
  else if (t < 2.7){ d.dx = STOP - 6; d.ear = Math.sin(seg(t,2.3,2.5)*Math.PI)*-25; d.head = t > 2.45 ? 6 : 0; d.px = t > 2.45 ? 111.5 : 110; }              // ears flick, eyes the post
  else if (t < 3.1){ const k = ease(seg(t,2.7,3.1)); d.dx = lerp(STOP - 6, STOP, k); d.legs = k*Math.PI*2; d.amp = 8; d.head = lerp(6, 35, k); d.rot = 8*k; d.y = -1*k; d.px = 111.5; }   // steps in, lowers its head, lays its cheek on the post's corner
  else if (t < 6.3){ const up = Math.sin(t*8);                                                                    // up and down the post, cheek then neck
    d.dx = STOP + up*1.5; d.rot = 8 + up*2; d.y = -1 - up*2; d.head = 35 + up*20; rattle = Math.sin(t*16)*3;
    d.ear = 28; d.lid = clamp(seg(t,3.3,3.8))*.75; d.px = lerp(110, 108.6, clamp(seg(t,3.3,3.8))); d.py = lerp(25.3, 23.6, clamp(seg(t,3.3,3.8)));
    d.tongue = t > 3.8; d.thump = (t > 4.8 && t < 5.6) ? Math.abs(Math.sin(t*28)) : 0; }
  else if (t < 6.7){ const k = seg(t,6.3,6.7); d.dx = STOP; const s = Math.sin(k*Math.PI); d.sy = 1 - s*.06; d.sx = 1 + s*.04; d.head = lerp(35, 0, ease(k)) + s*4; d.rot = 8*(1 - ease(k)); d.ear = 20; d.lid = .6; d.tongue = false; }
  else if (t < 7.1){ d.dx = STOP; d.ear = Math.sin(t*60)*30; d.head = Math.sin(t*60 + 1)*6; d.y = -1; }
  else if (t < 9.3){ const k = seg(t,7.1,9.3); d.dx = lerp(STOP, far, k*k*.3 + k*.7); d.legs = t*2*Math.PI*1.6; d.amp = 20; d.y = -Math.abs(Math.sin(t*2*Math.PI*1.6))*1.4; d.lid = .3; }
  else d.show = false;
  return {d, rattle};
}
function deerSet(deer, d){
  const q = deer.q;
  q('.root').setAttribute('transform', `translate(0 ${d.y}) rotate(${d.rot} 70 100) translate(70 108) scale(${d.sx} ${d.sy}) translate(-70 -108)`);
  const L = (cls, ph, x) => { const a = Math.sin(d.legs + ph)*d.amp; q('.'+cls).setAttribute('transform', `translate(${x} 62) rotate(${a})`); q(`.${cls} .sh`).setAttribute('transform', `translate(0 23) rotate(${Math.max(0, -a)*.8})`); };
  L('lhn', 0, 42); L('lff', 0, 94); L('lhf', Math.PI, 46); L('lfn', Math.PI, 90);
  if (d.thump){ q('.lhn').setAttribute('transform', `translate(42 62) rotate(${-25*d.thump})`); q('.lhn .sh').setAttribute('transform', `translate(0 23) rotate(${30*d.thump})`); }
  q('.dhead').setAttribute('transform', `rotate(${d.head} 100 42)`);
  q('.ear').setAttribute('transform', `rotate(${d.ear} 101 24)`);
  q('.dpup').setAttribute('cx', d.px); q('.dpup').setAttribute('cy', d.py);
  const ly = 21.5 + d.lid*7; q('.dlid').setAttribute('d', `M105.5 21.5 L112.5 21.5 L112.5 ${ly} Q109 ${ly + 1.6*d.lid} 105.5 ${ly} Z`);
  q('.tongue').style.display = d.tongue ? '' : 'none';
}
export function deerApply(sc, P, t){
  const {d} = P;
  place(sc.sign); sc.sign.svg.style.transformOrigin = '50% 96%'; sc.sign.svg.style.transform = P.rattle ? `rotate(${P.rattle*sc.way}deg)` : '';
  place(sc.deer, d.dx); sc.deer.svg.style.visibility = d.show ? 'visible' : 'hidden';
  deerSet(sc.deer, d);
}

/* ================= 3. THE TOURISTS ================= */
const CAP = (c) => `<path d="M47 31 Q47 15 63 15 Q79 15 79 31 Z" fill="${c}" stroke="${O}" stroke-width="2.6" stroke-linejoin="round"/><path d="M76 28.5 L92 29.5 Q94 33 90 33.5 L76 33 Z" fill="${c}" stroke="${O}" stroke-width="2.4" stroke-linejoin="round"/><path d="M52 24 Q55 18 62 17" stroke="#ffffff" stroke-width="2.4" fill="none" stroke-linecap="round" opacity=".45"/><circle cx="63" cy="15" r="1.8" fill="${c}" stroke="${O}" stroke-width="1.4"/>`;
const SUNHAT = `<path d="M51 27 Q51 12 64 12 Q77 12 77 27 Z" fill="#f1d58a" stroke="${O}" stroke-width="2.4" stroke-linejoin="round"/><rect x="51" y="22" width="26" height="4" fill="#ef7fa8" stroke="${O}" stroke-width="1.4"/><ellipse cx="64" cy="27" rx="25" ry="4.4" fill="#f1d58a" stroke="${O}" stroke-width="2.4"/><path d="M45 26.5 Q64 24 83 26.5" stroke="#f8e6b0" stroke-width="1.6" fill="none"/>`;
const HAIR = `<path d="M50 30 Q42 34 41 46 Q40 56 45 60 Q47 52 50 46 Z" fill="#6b3f22" stroke="${O}" stroke-width="2.2" stroke-linejoin="round"/><path d="M48 33 Q47 24 58 22 Q52 28 51 38 Z" fill="#6b3f22"/>`;
const FLOWERS = `<g fill="#ffd34d" stroke="${O}" stroke-width=".9"><circle cx="52" cy="56" r="2.2"/><circle cx="66" cy="60" r="2.2"/><circle cx="56" cy="72" r="2.2"/><circle cx="70" cy="74" r="2.2"/></g><rect x="48" y="76" width="26" height="6" rx="3" fill="#2f3440" stroke="${O}" stroke-width="1.4"/><rect x="66" y="74.5" width="10" height="8" rx="3" fill="#d6402f" stroke="${O}" stroke-width="1.6"/>`;
const THUMB = `<g class="thumb" style="display:none"><rect x="-1.8" y="4" width="3.6" height="7" rx="1.8" fill="${SKIN}" stroke="${O}" stroke-width="1.5"/></g>`;
export const TOUR_BEATS = [[0,'just-the-sign','Just the lease sign'],[.3,'stroll-in','A city couple strolls in from the near edge, shorts and sandals'],[2.4,'points','He points: "A real oil sign!"'],[2.9,'poses','He spins round and poses, elbow on the sign, thumbs up. She lines up the photo'],[3.5,'flash','FLASH'],[3.7,'admire','She admires the photo'],[4.0,'slap','One mosquito. Slap'],[4.5,'swarm','Then the whole swarm rises out of the grass. Eyes go huge'],[5.1,'run','They turn and run, swatting, the swarm right behind them'],[7.5,'straggler','One straggler lands on the sign... and buzzes off. Just the sign again']];
export const TOUR_END = 9.1;
export const TOUR_LINE = {from:2.4, to:2.9, text:'A real oil sign!'};
/** Where they stop (units from the sign, on the near side): he by the sign, close enough to lean an elbow on it; she back a few steps with the phone. */
export const TOUR_HIM = -40, TOUR_HER = -128;
export function tourScene(stage, frame, sign, f, spot, mirror, flashHost, flashAt){
  const sc = stageOf(stage, frame, sign, f, spot, mirror);
  sc.him = z(makePup(stage, WORKER, {vw:120, vh:120, ax:60, ay:108, frac:.19*f, spot}), 5);
  dress(sc.him, {top:'#29a3a6', shade:'#1f8487', pants:'#d9c38a', shins:SKIN, boots:'#b98a5a', hands:SKIN, forearm:SKIN, beard:false, hat:CAP('#d6402f'), torsoExtra:FLOWERS});
  sc.him.q('.armF .fore').insertAdjacentHTML('beforeend', THUMB);
  sc.her = z(makePup(stage, WORKER, {vw:120, vh:120, ax:60, ay:108, frac:.178*f, spot}), 6);
  dress(sc.her, {top:'#ef7fa8', shade:'#d8618c', pants:'#f1efe6', shins:SKIN, boots:'#b98a5a', hands:SKIN, forearm:SKIN, beard:false, hat:SUNHAT, hair:HAIR});
  sc.her.q('.armF .fore').insertAdjacentHTML('afterbegin', PHONE);
  sc.ov = overlay(stage);
  // The camera's flash: a quick soft burst over the whole game screen, from where they stand (puppet-stage.ts `camFlash`).
  sc.flash = camFlash(flashHost ?? frame, flashAt ?? { x: 0, y: 0 });
  return sc;
}
/** The pose at a time. `off`: how far from the sign (their units) they are fully off the near edge (the reference: 360). */
export function tourPose(t, off = 360){
  const m = base(), h = base(); let say = null, flash = 0, swarm = null, one = null, last = null;
  const HIM = TOUR_HIM, HER = TOUR_HER;
  const happy = (o) => { o.mouth = 'M63.5 46 Q68 51.5 72.5 46 Z'; o.lid = 'M65 27 Q70 31 75 27 L75 33 L65 33 Z'; };
  const shock = (o) => { o.lid = 'M65 23 L75 23 L75 24 L65 24 Z'; o.brow = 'M65 21.5 Q70 19 76 21.5'; o.mouth = 'M66 46 Q69 43.5 72 46 Q72 50 69 50 Q66 50 66 46 Z'; };
  // He poses: turned to face her, leaning back with an elbow on the sign behind him, thumb up.
  const posing = (o, k) => { o.face = -1; o.rot = 5*k; o.arB = 82*k; o.foB = lerp(-10, -105, k); o.thumb = k > .5; o.arF = lerp(0, -70, k); o.foF = lerp(-10, -110, k); o.px = 74.5; o.py = 32; happy(o); };
  if (t < .3){ m.show = h.show = false; }
  else if (t < 2.4){ const k = seg(t,.3,2.4), e = k < .88 ? k/.88*.97 : .97 + ease((k-.88)/.12)*.03; m.dx = lerp(-(off - 58), HIM, e); h.dx = lerp(-off, HER, e); walkP(m, t, 1.7, 22); walkP(h, t, 1.7, 20, .25); h.arF = -10; h.phone = true; m.px = 74; h.px = 74; }
  else if (t < 2.9){ m.dx = HIM; h.dx = HER; m.arF = -105; m.foF = -15; happy(m); h.phone = true; h.arF = -10; h.px = 74; say = 'A real oil sign!'; }
  else if (t < 3.7){ m.dx = HIM; h.dx = HER;                                                        // he spins round and poses; she lines up the shot
    if (t < 3.1) hop(m, seg(t,2.9,3.1), 1, -1); const k = ease(seg(t,3.05,3.3)); if (t >= 3.1) posing(m, k);
    const kh = ease(seg(t,2.9,3.2)); h.phone = true; h.arF = lerp(-10, -92, kh); h.foF = lerp(-10, -18, kh); happy(h); h.px = 74.5; h.py = 32.5; h.rot = 3*kh;
    flash = t > 3.5 && t < 3.5 + FLASH_S ? 1 - seg(t,3.5,3.5 + FLASH_S) : 0; }
  else if (t < 4.5){ m.dx = HIM; h.dx = HER; posing(m, 1); h.phone = true; h.arF = -55; h.foF = -60; h.head = 10; h.px = 73; h.py = 36; happy(h); one = seg(t,3.85,4.3);   // she admires the photo
    if (t > 4.25){ m.thumb = false; m.arF = -175; m.foF = -60; m.head = -4; m.mouth = 'M65 47 Q68 45 71 47'; m.lid = 'M65 26 L75 26 L75 31 L65 31 Z'; } }                          // slap!
  else if (t < 5.1){ m.dx = HIM; h.dx = HER; m.face = -1; shock(m); shock(h); m.px = h.px = 74.5; h.phone = true; h.arF = -30; swarm = {k: seg(t,4.5,5.1), phase:'rise'}; m.arF = -60; h.foF = -40; }
  else if (t < 5.35){ const k = seg(t,5.1,5.35); m.dx = HIM; h.dx = HER; hop(m, k, -1, -1); hop(h, k, 1, -1); shock(m); shock(h); h.phone = true; swarm = {k:0, phase:'hover'}; }
  else if (t < 7.5){ const k = seg(t,5.35,7.4); m.face = h.face = -1; h.dx = lerp(HER, -(off + 60), k); m.dx = lerp(HIM, -(off + 60), k*.98); walkP(m, t, 2.6, 34); walkP(h, t, 2.6, 32, .2); shock(m); shock(h); h.phone = true;
    m.arF = -160 + Math.sin(t*30)*30; m.arB = -150 + Math.sin(t*30 + 2)*30; h.arF = -150 + Math.sin(t*28 + 1)*30; h.arB = -160 + Math.sin(t*28)*30; m.show = k < 1; h.show = k < 1; swarm = {k, phase:'chase'}; }
  else { m.show = h.show = false; last = seg(t,7.5,9.0); }
  if (t >= 7.4 && t < 7.8) swarm = {k:1, phase:'chase'};
  return {m, h, say, flash, swarm, one, last};
}
export function tourApply(sc, P, t){
  const {m, h} = P, r = sc.stage.getBoundingClientRect(), u = sc.him.frac*r.width/120;
  place(sc.sign); place(sc.him, m.dx); pupApply(sc.him, m); place(sc.her, h.dx*(.19/.178)); pupApply(sc.her, h);
  sc.flash.style.opacity = String(P.flash*.85);
  let html = '';
  const mos = (x, y, i) => { const s = Math.max(1.6, 1.3*u), wv = Math.sin(t*90 + i)*.6 + .8; return `<ellipse cx="${x - s*.9}" cy="${y - s*.9}" rx="${s*.9}" ry="${s*.45*wv}" fill="#ffffff" opacity=".8"/><ellipse cx="${x + s*.9}" cy="${y - s*.9}" rx="${s*.9}" ry="${s*.45*wv}" fill="#ffffff" opacity=".8"/><circle cx="${x}" cy="${y}" r="${s*.8}" fill="${O}"/>`; };
  const headM = pt(sc, sc.him, '.head', 63, 30), headH = pt(sc, sc.her, '.head', 63, 30);
  if (P.one !== null && P.one !== undefined){ const k = P.one, sx = sc.spot.x*r.width + 60*u, cx = lerp(sx, headM.x - 6*u, ease(k)) + Math.sin(t*22)*4*u, cy = lerp(headM.y - 20*u, headM.y + 6*u, k) + Math.cos(t*19)*4*u; html += mos(cx, cy, 0); }
  if (P.swarm){ const {k, phase} = P.swarm; const mid = {x:(headM.x + headH.x)/2, y:(headM.y + headH.y)/2};
    const c = phase === 'rise' ? {x: lerp(sc.spot.x*r.width + 50*u, mid.x + 18*u, ease(k)), y: lerp(sc.spot.y*r.height - 4*u, mid.y, ease(k))} : phase === 'hover' ? {x: mid.x + 18*u, y: mid.y} : {x: mid.x + lerp(18, 22, k)*u, y: mid.y};
    for (let i = 0; i < 28; i++){ const a = i*2.39 + t*(3 + i%5), rr = (8 + (i*7)%14)*u*(phase === 'rise' ? .6 + .4*k : 1); html += mos(c.x + Math.cos(a)*rr*1.3, c.y + Math.sin(a*1.3)*rr*.8, i); }
    // (The lettering is turned back to read the right way on a mirrored stage.)
    const s = Math.max(10, 7.5*u); html += `<text class="bzz" x="${c.x}" y="${c.y - 24*u}" ${sc.mirror ? `transform="translate(${2*c.x} 0) scale(-1 1)"` : ''} text-anchor="middle" font-family="Fredoka, sans-serif" font-weight="700" font-size="${s}" fill="#fff" stroke="${O}" stroke-width="${s*.22}" paint-order="stroke">BZZZZ</text>`; }
  if (P.last !== null && P.last !== undefined){ const k = P.last, lx = sc.spot.x*r.width, ly = sc.spot.y*r.height - 45*u;
    let x, y; if (k < .35){ const kk = k/.35; x = lerp(lx - 70*u, lx, ease(kk)) + Math.sin(t*20)*3*u*(1-kk); y = lerp(ly - 20*u, ly, ease(kk)); } else if (k < .6){ x = lx; y = ly; } else { const kk = (k-.6)/.4; x = lerp(lx, lx + 260*u, kk*kk) + Math.sin(t*20)*3*u; y = ly - kk*30*u; }
    if (k < 1) html += mos(x, y, 3); }
  if (sc.ovHtml !== html) sc.ov.innerHTML = sc.ovHtml = html;
}

/* ---------------- Wildlife Log card art ---------------- */
const still = (markup, vw, vh, view, cls, set) => { const host = document.createElement('div'); const p = makePup(host, markup, {vw, vh, ax:0, ay:0, frac:1, spot:{x:0, y:0}}); set(p); p.svg.removeAttribute('style'); p.svg.setAttribute('class', `egg-still ${cls}`); p.svg.setAttribute('viewBox', view); return p.svg.outerHTML; };
/** The surveyor, squinting at the sign. */
export const surveyorStill = () => still(WORKER, 120, 120, '26 2 78 110', 'surveyor-still', (p) => { dress(p, {top:'#c9b07a', shade:'#ad9560', vest:'#f07f2a', pants:'#6d6a4f', hardHat:'#f7f7f2', hardHat2:'#ffffff', beard:false, moustache:'#7a4f2e'}); pupApply(p, {...surveyPose(12.9).w, rot:0}); });
/** The deer, in bliss. */
export const deerStill = () => still(DEER, 140, 110, '18 -2 116 114', 'deer-still', (p) => deerSet(p, deerPose(4.2).d));
/** The tourist, thumbs up. */
export const touristsStill = () => still(WORKER, 120, 120, '26 2 78 110', 'tourists-still', (p) => { dress(p, {top:'#29a3a6', shade:'#1f8487', pants:'#d9c38a', shins:SKIN, boots:'#b98a5a', hands:SKIN, forearm:SKIN, beard:false, hat:CAP('#d6402f'), torsoExtra:FLOWERS}); p.q('.armF .fore').insertAdjacentHTML('beforeend', THUMB); const m = tourPose(3.45).m; pupApply(p, {...m, face:1, rot:0, arB:0, foB:-10}); });

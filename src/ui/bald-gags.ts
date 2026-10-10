// @ts-nocheck
// BALDONNEL'S SEVEN SIGHTINGS (October upgrade, job U6b), ported from
// `~/Desktop/RHR Art Inbox/baldonnel_sightings_reference.html` (saved Oct 9 17:36) as the Clearwater ones were
// (wave3.ts): the reference's new puppets (sandhill crane, bison, snowshoe hare in its spring coat, wood frog,
// mosquito, pike, the magpie, the bits Moe carries) and its seven gags copied AS WRITTEN by a script, each as
// `BALD.<key>` in wave3's shape: `beats` [time, id, text], `dur`, `still`, `lead(E)` / `tail(E)`, and what it draws:
// `render` (the walking lane), `back` (a lane behind it), `front` (a lane in front), `over` (sound words and whistled
// notes, over everything). The worker, the pickup, Moe, the bearded worker and every helper are wave3.ts's own (they
// are the same drawings, character for character). The scenery is NOT drawn here: it is permanent (bald-art.ts).
//
// WHAT WAS CHANGED FROM THE PAGE, each for a rule of the game:
//   - A WIDER SCREEN. On a short strip the screen is wider than the page's 390 by `E` units a side. Whoever walks
//     or drives in starts `E` further out and carries on `E` further at the page's own speed at its edge (the
//     `_IN` / `_OUT` constants: clocks start `lead(E)` early and end `tail(E)` late; every beat keeps its time).
//     Whoever flies in or out (the cranes, the magpie, the mosquito) covers the extra way in the same time.
//   - NOTHING OVER THE LEASE. The strip's layers lie under the board, so anything above the strip's top would be
//     cut off by the berm. The page's flyers come down out of the sky above its picture; here they glide in LOW,
//     from the screen's edge, inside the strip (`CRANE_IN_Y`, `BIRD_IN_Y` and the like), and leave the same way.
//     The crane's feather starts its fall inside the strip; "garooo" is written a little lower.
//   - LANES (the depth rule). Right of Way: Moe walks BEHIND his truck on the back lane and round its front to the
//     bison on the front lane (`back`, `front`); the truck and the bison are on the walking lane. Last Ice plays on
//     the pond, behind the lane (all of it in `back`, on the pond's line). Late Croak's frogs are in the puddle, in
//     front of the lane the bearded worker walks (`front`).
//   - THE SCALE'S NEEDLE is the scenery's own (scene-stage.ts `BaldProp.needle`): Overweight only says where it
//     points (`needle`).
//   - LINES ("Shoo!", "Got one!", "Hey!") are said in the game's own bubble (`lines`; texts in lines.ts).
import { GY, OL, C, sfx, r2, rng, w3worker as worker, clamp, seg, io, es, inr, lerp, hop, kf, sw, walk, note, hardHat, handW, blob, MOE, BEARD, puff, pickup } from './wave3.ts';
import { SB, SCX, PAD, DIAL, POND, PUD2 } from './bald-art.ts';

export const BALD = {};
/** His speed at the screen's edge, in and out (the page's eased walks: twice the distance over the time). */
const OW_IN=2*168/2.0, OW_OUT=2*179/1.65;
const CR_IN=2*104/1.1, CR_OUT=2*109/1.55;
const BI_IN=2*410/1.7, BI_OUT=2*230/2.3, TR_IN=2*170/1.4, TR_OUT=2*170/1.6;
const HA_IN=2*318/1.2, HA_OUT=2*336/1.9, WK_V=480/4.3;
const IC_IN=2*150/2.6, IC_OUT=2*160/2.6;
const FR_IN=2*120/1.1, FR_OUT=2*355/2.0;
const MQ_IN=2*302/1.8, MQ_OUT=2*183/2.0;
/** Where the flyers come in and go out (the feet's y at the screen's edge): low enough that the whole bird is inside the strip. */
const CRANE_IN_Y=104, CRANE_OUT_Y=102, BIRD_IN_Y=96, BIRD_OUT_Y=92, FEATHER_Y=52, GAROO_Y=62;

const HAT_IN_HAND=c=>`<g transform="translate(0 -33) rotate(180) scale(.8)">${hardHat(c)}</g>`;
const KIT=`<g transform="translate(0 -38)"><path d="M-4 0 q4 -5 8 0" fill="none" stroke="${OL}" stroke-width="1.8"/><rect x="-8" y="0" width="16" height="11" rx="2" fill="#c8392b" ${sw(2)}/><path d="M-8 4 H8" stroke="#a22d21" stroke-width="1.6"/></g>`;
const BOOTS=`<g transform="translate(0 -38)"><path d="M-6 0 v10 h9 a4 4 0 0 0 -2 -5 h-2 v-5 z M1 2 v10 h9 a4 4 0 0 0 -2 -5 h-2 v-5 z" fill="${C.boot}" ${sw(1.8)}/></g>`;
const SANDWICH=`<g transform="translate(0 -40)"><path d="M-7 4 L7 4 L0 -8 z" fill="#e9c98a" ${sw(1.8)}/><path d="M-5.4 2 L5.4 2" stroke="#7cbf3c" stroke-width="1.8"/><path d="M-4.4 0 L4.4 0" stroke="#d9483a" stroke-width="1.4"/></g>`;
function sandwichW(x,y,rot=0){return`<g transform="translate(${r2(x)} ${r2(y)}) rotate(${r2(rot)})"><path d="M-7 4 L7 4 L0 -8 z" fill="#e9c98a" ${sw(1.8)}/><path d="M-5.4 2 L5.4 2" stroke="#7cbf3c" stroke-width="1.8"/><path d="M-4.4 0 L4.4 0" stroke="#d9483a" stroke-width="1.4"/></g>`;}
function kitW(x,y){return`<g transform="translate(${r2(x)} ${r2(y)})"><path d="M-4 -11 q4 -5 8 0" fill="none" stroke="${OL}" stroke-width="1.8"/><rect x="-8" y="-11" width="16" height="11" rx="2" fill="#c8392b" ${sw(2)}/><path d="M-8 -7 H8" stroke="#a22d21" stroke-width="1.6"/></g>`;}
function bootW(x,y,rot=0){return`<g transform="translate(${r2(x)} ${r2(y)}) rotate(${r2(rot)})"><path d="M-5 -10 v7 h-1 a2 2 0 0 0 0 3 h13 a4 4 0 0 0 -3 -5 h-3 v-5 z" fill="${C.boot}" ${sw(1.8)}/></g>`;}
function hatW(x,y,rot=0,c=C.hat){return`<g transform="translate(${r2(x)} ${r2(y)}) rotate(${r2(rot)}) scale(.54)">${hardHat(c)}</g>`;}
const FEATHER_G=`<path d="M-1 -2 Q6 -9 16 -6 Q7 -1 -1 -2 z" fill="#a3a9ae" ${sw(1.4)}/><path d="M1 -3 L14 -6" stroke="#d6dadd" stroke-width="1"/>`;

/* ---------- sandhill crane, true side profile, facing right; feet at (0,0) ---------- */
function crane(o){
 o=Object.assign({x:0,y:GY,s:.46,face:1,legF:0,legB:0,bend:0,neck:0,wing:0,fly:0,bill:0,open:0,eye:'n',px:0,py:0,sq:0,lean:0,tuck:0,shake:0},o);
 const G='#a7adb2',GD='#878e95',GL='#c6cbcf',RUST='#b08a63';
 const sx=o.s*o.face*(1+o.sq),sy=o.s*(1-o.sq),k=o.bend,dy=10*k;
 const leg=(a,c)=>{const hy=-50+dy,ky=-25+5*k,kx=-5-9*k;return`<g transform="rotate(${r2(a+70*o.fly)} 0 ${r2(hy)})"><path d="M0 ${r2(hy)} L${r2(kx)} ${r2(ky)} L0 ${r2(-1+(o.tuck?-20:0))} M-4 0 L7 0" fill="none" stroke="${OL}" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/><path d="M0 ${r2(hy)} L${r2(kx)} ${r2(ky)} L0 ${r2(-1+(o.tuck?-20:0))} M-4 0 L7 0" fill="none" stroke="${c}" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></g>`;};
 // the far wing shows only when open
 const wingA=-(o.wing*80);
 const farWing=o.wing>.05?`<g transform="rotate(${r2(wingA-14)} 6 -64)"><path d="M6 -64 Q-18 -80 -46 -70 L-40 -64 L-46 -59 L-37 -57 L-41 -52 Q-16 -52 6 -58 z" fill="${GD}" ${sw(2.2)}/></g>`:'';
 const nearWing=`<g transform="rotate(${r2(wingA)} 6 -64)"><path d="M6 -64 Q-18 -80 -46 -70 L-40 -64 L-46 -59 L-37 -57 L-41 -52 Q-16 -52 6 -58 z" fill="${G}" ${sw(2.4)}/><path d="M-6 -66 Q-20 -70 -34 -64" fill="none" stroke="${RUST}" stroke-width="3" stroke-linecap="round"/><path d="M-38 -62 l-6 0 M-36 -56 l-6 1" stroke="${OL}" stroke-width="1.4"/></g>`;
 const up={x:24,y:-104},bow={x:46,y:-58},fl={x:50,y:-68};
 const n=o.neck,f=o.fly;
 const H={x:lerp(lerp(up.x,bow.x,n),fl.x,f)+o.shake,y:lerp(lerp(up.y,bow.y,n),fl.y,f)};
 const N0={x:14,y:-64};const cp={x:N0.x+(H.x-N0.x)*.1,y:N0.y+(H.y-N0.y)*.62};
 const neckP=`M${N0.x} ${N0.y} Q${r2(cp.x)} ${r2(cp.y)} ${r2(H.x)} ${r2(H.y)}`;
 const billA=lerp(lerp(10,62,n),2,f)+o.bill+o.shake*2.2;
 let eye;const ex=3,ey=-2;
 if(o.eye==='closed')eye=`<path d="M${ex-3.4} ${ey} q3.4 3 6.8 0" fill="none" ${sw(2)}/>`;
 else{const wide=o.eye==='wide',er=wide?5:4.2;eye=`<circle cx="${ex}" cy="${ey}" r="${er}" fill="#fff" ${sw(1.8)}/><circle cx="${r2(ex+.8+o.px)}" cy="${r2(ey+o.py)}" r="${wide?1.7:2.1}" fill="${OL}"/><circle cx="${r2(ex+o.px)}" cy="${r2(ey-1+o.py)}" r=".7" fill="#fff"/>`;
  if(o.eye==='half')eye+=`<path d="M${r2(ex-er-.4)} ${ey} a${r2(er+.4)} ${r2(er+.4)} 0 0 1 ${r2(2*er+.8)} 0 z" fill="#c8392b" ${sw(1.8)}/>`;}
 const opn=o.open*9;
 const head=`<g transform="translate(${r2(H.x)} ${r2(H.y)})"><g transform="rotate(${r2(billA)} 6 0)"><path d="M7 -2 L30 ${r2(-1-opn*.2)} L8 2 z" fill="#3e3a36" ${sw(1.8)}/><path d="M7 1 L28 ${r2(2+opn)} L8 4 z" fill="#2e2a27" ${sw(1.6)}/></g><circle cx="0" cy="0" r="9.5" fill="${G}" ${sw(2.4)}/><path d="M-4 3 Q2 9 8 4 Q5 -1 -4 3 z" fill="#f3f3ef"/><path d="M-3 -8 Q5 -11 9 -4 Q4 -3 -1 -4 z" fill="#c8392b" ${sw(1.4)}/>${eye}</g>`;
 const body=`<g transform="translate(0 ${r2(dy)}) rotate(${r2(o.lean)} 0 -54)">${farWing}<path d="M-22 -60 Q-40 -58 -36 -42 Q-30 -46 -24 -46 Q-28 -39 -18 -42 Q-14 -50 -22 -60 z" fill="${GD}" ${sw(2.2)}/><ellipse cx="-4" cy="-58" rx="25" ry="13.5" fill="${G}" ${sw(2.6)}/><path d="M-20 -64 Q-6 -71 10 -66" fill="none" stroke="${GL}" stroke-width="3" stroke-linecap="round"/>${nearWing}<path d="${neckP}" fill="none" stroke="${OL}" stroke-width="9.5" stroke-linecap="round"/><path d="${neckP}" fill="none" stroke="${G}" stroke-width="5.6" stroke-linecap="round"/>${head}</g>`;
 return`<g transform="translate(${r2(o.x)} ${r2(o.y)}) scale(${r2(sx)} ${r2(sy)})">${leg(o.legB,'#41464c')}${leg(o.legF,'#565c63')}${body}</g>`;}
/* the crane's head in world space (for the camera) */
function craneHead(o){const s=o.s||.46,f=o.face||1;return[o.x+40*s*f,(o.y||GY)-90*s];}

/* ---------- bison, true side profile, facing right; hooves at (0,0) ---------- */
function bison(o){
 o=Object.assign({x:0,y:GY,s:.5,face:1,ph:0,walk:0,lie:0,headDip:0,eye:'n',px:0,py:0,mouth:'',tail:0,hat:false,sq:0,chew:0},o);
 const F='#7a5232',FD='#4c3020',FM='#3d2617',FL='#946640',HORN='#2d2824';
 const sx=o.s*o.face*(1+o.sq),sy=o.s*(1-o.sq),L=o.lie,drop=34*L,sn=Math.sin(o.ph)*o.walk*18;
 const leg=(x,a,col)=>`<g transform="rotate(${r2(a)} ${x} -40)"><rect x="${x-7}" y="-44" width="14" height="38" rx="6" fill="${col}" ${sw(2.6)}/><path d="M${x-8} -8 h16 v8 h-16 z" fill="${HORN}" ${sw(2.2)}/></g>`;
 let legs='';
 if(L<.5){const k=1-2*L;legs=`<g transform="translate(0 ${r2(drop*.3)}) scale(1 ${r2(.5+.5*k)})" style="transform-origin:0 0">${leg(-56,-sn,FD)}${leg(46,sn,FM)}${leg(-44,sn,F)}${leg(58,-sn,FD)}</g>`;}
 else legs=`<ellipse cx="-48" cy="-6" rx="16" ry="6" fill="${FD}" ${sw(2.2)}/><ellipse cx="54" cy="-5" rx="15" ry="5.5" fill="${FM}" ${sw(2.2)}/><path d="M64 -3 h10 v3 h-10 z" fill="${HORN}" ${sw(1.6)}/>`;
 const tailG=`<g transform="rotate(${r2(o.tail)} -80 -76)"><path d="M-80 -76 Q-90 -64 -88 -48" fill="none" stroke="${OL}" stroke-width="5" stroke-linecap="round"/><path d="M-80 -76 Q-90 -64 -88 -48" fill="none" stroke="${F}" stroke-width="2.6" stroke-linecap="round"/><path d="M-91 -52 q3 -4 6 0 q1 7 -3 9 q-5 -3 -3 -9 z" fill="${FM}" ${sw(1.8)}/></g>`;
 let eye;const ex=17,ey=-4;
 if(o.eye==='closed')eye=`<path d="M${ex-4} ${ey} q4 3.4 8 0" fill="none" ${sw(2.2)}/>`;
 else if(o.eye==='happy')eye=`<path d="M${ex-4.4} ${ey+1.6} q4.4 -5 8.8 0" fill="none" ${sw(2.4)}/>`;
 else{const wide=o.eye==='wide',er=wide?6.4:5.4;eye=`<circle cx="${ex}" cy="${ey}" r="${er}" fill="#fff" ${sw(2.2)}/><circle cx="${r2(ex+.8+o.px)}" cy="${r2(ey+o.py)}" r="${wide?2.2:2.8}" fill="${OL}"/><circle cx="${r2(ex+o.px)}" cy="${r2(ey-1.2+o.py)}" r=".9" fill="#fff"/>`;
  if(o.eye==='half')eye+=`<path d="M${r2(ex-er-.4)} ${ey} a${r2(er+.4)} ${r2(er+.4)} 0 0 1 ${r2(2*er+.8)} 0 z" fill="${FM}" ${sw(2.2)}/>`;}
 const jawDrop=o.mouth==='yawn'?9:o.chew*2;
 const mouth=o.mouth==='yawn'?`<ellipse cx="27" cy="${r2(23+jawDrop*.3)}" rx="6" ry="${r2(3+jawDrop*.5)}" fill="#7a2f2a" ${sw(2)}/>`:o.mouth==='grin'?`<path d="M17 22 Q25 31 33 21 Q25 25 17 22 z" fill="#7a2f2a" ${sw(2)}/>`:`<path d="M20 ${r2(24+jawDrop)} q6 2 12 -1" fill="none" ${sw(2)}/>`;
 const hat=o.hat?`<g transform="translate(13 -42) rotate(-16) scale(.78)">${hardHat(typeof o.hat==='string'?o.hat:C.hat)}</g>`:'';
 const head=`<g transform="translate(70 ${r2(-58+drop*.6)}) rotate(${r2(o.headDip)} 0 -10)"><path d="M2 20 Q8 44 20 40 Q26 34 22 24 z" fill="${FM}" ${sw(2.2)}/><path d="M-8 -20 Q14 -28 30 -12 L38 16 Q34 30 20 28 L4 24 Q-12 10 -8 -20 z" fill="${FM}" ${sw(2.8)}/><path d="M-2 -22 Q10 -28 22 -20" fill="none" stroke="#5a3b26" stroke-width="3" stroke-linecap="round"/><path d="M8 -20 Q2 -34 14 -40 Q12 -32 15 -22 z" fill="${HORN}" ${sw(2)}/><path d="M12 -38 q1 -1 2 -1" stroke="#9a9289" stroke-width="1.6"/>${eye}<ellipse cx="34" cy="12" rx="2.2" ry="1.6" fill="${OL}"/>${mouth}${hat}</g>`;
 const body=`<g transform="translate(0 ${r2(drop)})">${tailG}<ellipse cx="-40" cy="-64" rx="44" ry="30" fill="${F}" ${sw(2.8)}/><path d="M-70 -84 Q-46 -94 -20 -88" fill="none" stroke="${FL}" stroke-width="4" stroke-linecap="round"/><path d="M-16 -86 Q6 -124 42 -108 Q70 -96 74 -66 Q76 -40 58 -32 L-6 -36 Q-20 -60 -16 -86 z" fill="${FD}" ${sw(2.8)}/><path d="M-4 -98 l-4 -6 M8 -108 l-3 -7 M22 -112 l0 -7 M36 -110 l3 -6 M50 -102 l5 -5 M-8 -72 l-5 -2 M2 -50 l-4 3 M40 -40 l2 5 M58 -44 l5 3" stroke="#6a4630" stroke-width="2" stroke-linecap="round"/></g>`;
 return`<g transform="translate(${r2(o.x)} ${r2(o.y)}) scale(${r2(sx)} ${r2(sy)})">${legs}${body}${head}</g>`;}
function bisonHorn(o){const s=o.s||.5,f=o.face||1,drop=34*(o.lie||0);return[o.x+(70+14)*s*f,(o.y||GY)+(-58+drop*.6-40)*s];}
function bisonNose(o){const s=o.s||.5,f=o.face||1,drop=34*(o.lie||0);return[o.x+(70+36)*s*f,(o.y||GY)+(-58+drop*.6+12)*s];}

/* ---------- snowshoe hare in spring coat, true side profile, facing right; feet at (0,0) ---------- */
/* Half way through the spring moult: the front half (head, ears, shoulders) has gone brown, the back
   half and the big snowshoe feet are still winter white. fb / rb blend each half into what it sits on
   (front into the mud, back into the snow); ol fades the outline. The eye never blends. */
let HUID=0;
function hare(o){
 o=Object.assign({x:0,y:GY,s:.62,face:1,lift:0,crouch:0,sit:0,eye:'n',px:0,py:0,ear:0,fb:0,rb:0,nib:0,blush:0,mouth:'smile',sq:0},o);
 const id='h'+(HUID++);
 const BR='#8d6b45',BRD='#6e5236',WH='#f6f5f0',WHD='#dadfe5';
 const sx=o.s*o.face*(1+o.sq),sy=o.s*(1-o.sq),c=o.crouch,st=o.sit;
 const by=-17+5*c,bry=15-4*c,brx=25+3*c,tilt=-22*st;
 const fa=r2(1-.94*o.fb),ra=r2(1-.94*o.rb);
 const clip=`<clipPath id="${id}r"><rect x="-60" y="-80" width="58" height="90"/></clipPath><clipPath id="${id}f"><rect x="-2" y="-80" width="70" height="90"/></clipPath>`;
 const rear=`<g opacity="${ra}"><g transform="rotate(${r2(tilt)} -12 -4)"><circle cx="-26" cy="${r2(by-4)}" r="5" fill="${WH}" ${sw(2)}/><ellipse clip-path="url(#${id}r)" cx="0" cy="${r2(by)}" rx="${r2(brx)}" ry="${r2(bry)}" fill="${WH}" ${sw(2.6)}/><path clip-path="url(#${id}r)" d="M${r2(-brx+6)} ${r2(by+bry*.5)} Q0 ${r2(by+bry+2)} 4 ${r2(by+bry*.7)}" fill="none" stroke="${WHD}" stroke-width="3" stroke-linecap="round"/><ellipse cx="-10" cy="-3.5" rx="17" ry="4.6" fill="${WH}" ${sw(2.2)}/></g></g>`;
 const hx=20,hy=r2(-33+6*c-6*st);
 const earA=-28+o.ear*22;
 const ears=`<g transform="rotate(${r2(earA)} -4 -9)"><ellipse cx="-6" cy="-24" rx="4.6" ry="14" fill="${BRD}" ${sw(2.2)}/><path d="M-10 -34 Q-6 -42 -2 -34 Q-6 -36 -10 -34 z" fill="#2e241c"/></g><g transform="rotate(${r2(earA+12)} -1 -9)"><ellipse cx="-1" cy="-25" rx="4.8" ry="14.6" fill="${BR}" ${sw(2.2)}/><ellipse cx="-1" cy="-23" rx="1.8" ry="9" fill="#c69a7a"/><path d="M-5.4 -35 Q-1 -44 3.4 -35 Q-1 -37 -5.4 -35 z" fill="#2e241c"/></g>`;
 const nib=o.nib?Math.sin(o.nib*30)*1.2:0;
 const mouthP=o.mouth==='flat'?`<path d="M9 7 h4" fill="none" stroke="${OL}" stroke-width="1.4"/>`:o.mouth==='o'?`<ellipse cx="11" cy="7.4" rx="1.6" ry="2" fill="#6b2a20"/>`:`<path d="M8.6 ${r2(6.6+nib*.4)} q2 2 4 0" fill="none" stroke="${OL}" stroke-width="1.4"/>`;
 const front=`<g opacity="${fa}"><g transform="rotate(${r2(tilt)} -12 -4)"><ellipse clip-path="url(#${id}f)" cx="0" cy="${r2(by)}" rx="${r2(brx)}" ry="${r2(bry)}" fill="${BR}" ${sw(2.6)}/><path d="M-2 ${r2(by-bry+1)} q3 ${r2(bry*.6)} 0 ${r2(bry*1.4)}" fill="none" stroke="#b89a74" stroke-width="2" stroke-dasharray="2 2.4"/><ellipse cx="18" cy="-3" rx="5.4" ry="3.2" fill="${WH}" ${sw(2)}/></g><g transform="translate(${hx} ${hy})">${ears}<circle cx="0" cy="0" r="12" fill="${BR}" ${sw(2.4)}/><ellipse cx="9" cy="3" rx="6" ry="5" fill="${BR}" ${sw(2)}/>${o.blush?`<ellipse cx="4" cy="5" rx="4" ry="2.2" fill="#e8786a" opacity="${r2(o.blush)}"/>`:''}<ellipse cx="14.6" cy="${r2(1.2+nib*.2)}" rx="2" ry="1.6" fill="#e98f9a" stroke="${OL}" stroke-width="1"/>${mouthP}<path d="M12 4 l9 -2 M12 5.6 l9 1.2" stroke="${OL}" stroke-width=".9" opacity=".7"/></g></g>`;
 let eye;const ex=5,ey=-3;
 if(o.eye==='closed')eye=`<path d="M${ex-3.4} ${ey} q3.4 3 6.8 0" fill="none" ${sw(1.8)}/>`;
 else{const wide=o.eye==='wide',er=wide?6:5;eye=`<circle cx="${ex}" cy="${ey}" r="${er}" fill="#fff" stroke="${OL}" stroke-width="1.8"/><circle cx="${r2(ex+.8+o.px)}" cy="${r2(ey+o.py)}" r="${wide?2:2.5}" fill="${OL}"/><circle cx="${r2(ex+o.px)}" cy="${r2(ey-1.1+o.py)}" r=".8" fill="#fff"/>`;
  if(o.eye==='half')eye+=`<path d="M${r2(ex-er-.4)} ${ey} a${r2(er+.4)} ${r2(er+.4)} 0 0 1 ${r2(2*er+.8)} 0 z" fill="${BR}" stroke="${OL}" stroke-width="1.8"/>`;}
 return`<g transform="translate(${r2(o.x)} ${r2(o.y-o.lift)}) scale(${r2(sx)} ${r2(sy)})">${clip}${rear}${front}<g transform="translate(${hx} ${hy})">${eye}</g></g>`;}

/* ---------- wood frog, sitting, side profile, facing right; seat at (0,0) ---------- */
function frog(o){
 o=Object.assign({x:0,y:0,s:.8,face:1,sac:0,eye:'n',px:0,py:0,blush:0,sq:0},o);
 const F='#a67d4f',FD='#7d5a36',M='#3e2c1e',J='#efe3c4';
 const sx=o.s*o.face*(1+o.sq),sy=o.s*(1-o.sq);
 let eye;const ex=8,ey=-21;
 if(o.eye==='closed')eye=`<circle cx="${ex}" cy="${ey}" r="4.6" fill="${F}" ${sw(1.8)}/><path d="M${ex-3} ${ey} q3 2.6 6 0" fill="none" ${sw(1.6)}/>`;
 else{const wide=o.eye==='wide',er=wide?5.2:4.6;eye=`<circle cx="${ex}" cy="${ey}" r="${er}" fill="#fff" ${sw(1.8)}/><circle cx="${r2(ex+.6+o.px)}" cy="${r2(ey+o.py)}" r="${wide?1.6:2.2}" fill="${OL}"/>`;
  if(o.eye==='half')eye+=`<path d="M${r2(ex-er-.3)} ${ey-.2} a${r2(er+.3)} ${r2(er+.3)} 0 0 1 ${r2(2*er+.6)} 0 z" fill="${F}" ${sw(1.6)}/>`;}
 const sac=o.sac>0?`<ellipse cx="14" cy="${r2(-9+o.sac*1.5)}" rx="${r2(5.5*o.sac)}" ry="${r2(4.6*o.sac)}" fill="#f1e8cf" ${sw(1.6)}/>`:'';
 return`<g transform="translate(${r2(o.x)} ${r2(o.y)}) scale(${r2(sx)} ${r2(sy)})"><path d="M-14 0 Q-17 -6 -10 -8 Q-2 -9 0 -2 L2 0 z" fill="${FD}" ${sw(1.8)}/><path d="M-12 -2 Q-12 -17 2 -19 Q14 -21 17 -12 Q18 -4 12 0 L-10 0 z" fill="${F}" ${sw(2.2)}/><path d="M0 -17 Q8 -16 18 -13 L17 -10 Q8 -12 -1 -14 z" fill="${M}"/><path d="M4 -8 Q11 -7 16 -9" fill="none" stroke="${J}" stroke-width="2" stroke-linecap="round"/>${sac}${eye}<path d="M8 -1 v-5" stroke="${OL}" stroke-width="4.6" stroke-linecap="round"/><path d="M8 -1 v-5" stroke="${F}" stroke-width="2.2" stroke-linecap="round"/>${o.blush?`<ellipse cx="5" cy="-12" rx="3.4" ry="1.8" fill="#e8786a" opacity="${r2(o.blush)}"/>`:''}</g>`;}

/* ---------- mosquito (comically big), facing right ---------- */
function mosquito(x,y,face,t,o={}){const s=o.s||1.5,flap=Math.sin(t*90);
 return`<g transform="translate(${r2(x)} ${r2(y)}) scale(${r2(s*face)} ${s})"><path d="M-2 2 l-3 7 M0 2 l1 8 M2 2 l4 7 M-1 1 l-6 4 M1 1 l7 3" stroke="${OL}" stroke-width=".9" stroke-linecap="round" fill="none"/><ellipse cx="-7" cy="1.6" rx="6" ry="2.2" fill="#6b5a4c" transform="rotate(12 -7 1.6)" ${sw(1.2)}/><path d="M-9 0 v3.4 M-6 .4 v3.4" stroke="#c9b9a4" stroke-width="1"/><ellipse cx="0" cy="0" rx="3.2" ry="2.6" fill="#5a4b3f" ${sw(1.2)}/><circle cx="3.6" cy="-.6" r="2.4" fill="#5a4b3f" ${sw(1)}/><circle cx="4.2" cy="-1.2" r="1.5" fill="#fff" stroke="${OL}" stroke-width=".6"/><circle cx="${r2(4.6+(o.px||0)*.3)}" cy="-1.1" r=".7" fill="${OL}"/><path d="M5.6 .2 L12 3" stroke="${OL}" stroke-width="1"/><ellipse cx="-2" cy="${r2(-4-1.6*flap)}" rx="5" ry="1.8" transform="rotate(${r2(-20-26*flap)} 0 -1)" fill="#e6f2fa" opacity=".85" stroke="${OL}" stroke-width=".6"/><ellipse cx="-1" cy="${r2(-4+1.6*flap)}" rx="4.4" ry="1.6" transform="rotate(${r2(-10+26*flap)} 0 -1)" fill="#e6f2fa" opacity=".7" stroke="${OL}" stroke-width=".5"/></g>`;}

/* ---------- the magpie (the game's own drawing, magpie.ts BIRD), feet at (x,y) ---------- */
const BIRD=`<g class="flip"><g class="root"><g class="tail"><path d="M46 82 L4 92 Q0 98 6 102 L50 92 Z" fill="#1d1c22" stroke="${OL}" stroke-width="3" stroke-linejoin="round"/><path d="M40 85 L10 92 L11 96 L42 89 Z" fill="#2f8f7a"/><path d="M28 88 L12 92 L13 94.5 L30 91 Z" fill="#6a4c9c"/></g><g class="legs" stroke="${OL}" stroke-width="3.2" stroke-linecap="round" fill="none"><path d="M55 96 L54 108 M48 108 L58 108 M66 96 L67 108 M62 108 L72 108"/></g><g class="body"><ellipse cx="60" cy="82" rx="25" ry="21" fill="#1d1c22" stroke="${OL}" stroke-width="3"/><path d="M44 72 Q52 64 64 64" stroke="#4a5063" stroke-width="3.5" fill="none" stroke-linecap="round"/><path d="M55 82 Q58 104 78 94 Q86 84 80 74 Q66 70 55 82 Z" fill="#f7fafc" stroke="${OL}" stroke-width="2.6" stroke-linejoin="round"/><path d="M60 94 Q66 101 76 95 Q80 92 82 87 Q72 96 60 94 Z" fill="#d8dde8"/></g><g class="wing"><path d="M36 74 Q52 60 70 72 Q62 92 38 88 Z" fill="#245d8f" stroke="${OL}" stroke-width="3" stroke-linejoin="round"/><path d="M40 82 Q52 80 64 80 L62 84 Q50 85 39 86 Z" fill="#2f8f7a"/><path d="M42 86 Q50 86 58 85 L56 87.5 Q48 88.5 42 88 Z" fill="#6a4c9c"/><path d="M44 72 Q54 66 64 71 Q56 76 45 76 Z" fill="#f7fafc" stroke="${OL}" stroke-width="2" stroke-linejoin="round"/></g><g class="head"><path d="M60 32 L56 22 L64 29 L64 19 L69 29" fill="#1d1c22" stroke="${OL}" stroke-width="2.6" stroke-linejoin="round"/><circle cx="70" cy="48" r="20" fill="#1d1c22" stroke="${OL}" stroke-width="3"/><path d="M56 40 Q60 32 70 30" stroke="#4a5063" stroke-width="3.5" fill="none" stroke-linecap="round"/><g class="beak"><path class="upper" d="M86 44 Q98 45 104 50 Q96 52 86 52 Z" fill="#555a66" stroke="${OL}" stroke-width="2.4" stroke-linejoin="round"/><path class="lower" d="M86 52 Q95 52 100 52 Q94 56 86 56 Z" fill="#3e424c" stroke="${OL}" stroke-width="2.2" stroke-linejoin="round"/></g><circle cx="78" cy="44" r="8.5" fill="#f7fafc" stroke="${OL}" stroke-width="2.2"/><circle class="pupil" cx="80.5" cy="44.5" r="4" fill="${OL}"/><circle class="glint" cx="82" cy="43" r="1.3" fill="#fff"/><path class="lid" d="M68 34 L90 34 L90 40 L68 40 Z" fill="#1d1c22" stroke="${OL}" stroke-width="2"/></g></g></g>`;
const LIDS={sly:'M68 34 L90 34 L90 40 L68 40 Z',open:'M68 34 L90 34 L90 35 L68 35 Z',smug:'M68 34 L90 34 L90 43.5 L68 43.5 Z',shut:'M68 34 L90 34 L90 52 L68 52 Z'};
function magpie(o){o=Object.assign({x:0,y:GY,s:.36,face:1,wing:0,tail:0,head:0,px:80.5,py:44.5,lid:'sly',rot:0,sx:1,sy:1},o);
 const a=BIRD.replace('<g class="flip">',`<g transform="translate(60 0) scale(${o.face} 1) translate(-60 0)">`)
  .replace('<g class="root">',`<g transform="rotate(${r2(o.rot)} 60 108) translate(60 108) scale(${r2(o.sx)} ${r2(o.sy)}) translate(-60 -108)">`)
  .replace('<g class="wing">',`<g transform="rotate(${r2(o.wing)} 48 72)">`).replace('<g class="tail">',`<g transform="rotate(${r2(o.tail)} 48 86)">`).replace('<g class="head">',`<g transform="rotate(${r2(o.head)} 64 64)">`)
  .replace(/(<circle class="pupil" cx=")[^"]*(" cy=")[^"]*"/,`$1${r2(o.px)}$2${r2(o.py)}"`).replace(/(<circle class="glint" cx=")[^"]*(" cy=")[^"]*"/,`$1${r2(o.px+1.5)}$2${r2(o.py-1.5)}"`).replace(/(<path class="lid" d=")[^"]*"/,`$1${LIDS[o.lid]}"`);
 return`<g transform="translate(${r2(o.x-60*o.s)} ${r2(o.y-108*o.s)}) scale(${o.s})">${a}</g>`;}

/* ---------- ice pan, pail and rod for Last Ice ---------- */
function pail(x,y){return`<path d="M${x-9} ${y} L${x-7} ${y-16} H${x+7} L${x+9} ${y} z" fill="#c9ced4" ${sw(2.2)}/><path d="M${x-8.6} ${y-3} H${x+8.6}" stroke="#9aa1aa" stroke-width="2"/><path d="M${x-4} ${y-14} V${y-3}" stroke="#e3e7eb" stroke-width="1.6"/>`;}
function bobber(x,y){return`<circle cx="${r2(x)}" cy="${r2(y)}" r="2.8" fill="#fff" ${sw(1.3)}/><path d="M${r2(x-2.8)} ${r2(y)} a2.8 2.8 0 0 1 5.6 0 z" fill="#d9483a" stroke="${OL}" stroke-width="1.3"/>`;}
function tinyFish(x,y,rot=0){return`<g transform="translate(${r2(x)} ${r2(y)}) rotate(${r2(rot)})"><path d="M-4 0 Q0 -3 4 0 Q0 3 -4 0 z M-4 0 l-3 -2.4 v4.8 z" fill="#b9c3cc" stroke="${OL}" stroke-width="1"/><circle cx="2" cy="-.4" r=".6" fill="${OL}"/></g>`;}
function splashDrops(x,y,k,n=7,col='#cfe0ea'){if(k<=0||k>=1)return'';let s='';const R=rng(13);for(let i=0;i<n;i++){const vx=(R()-.5)*60,vy=34+R()*40,px=x+vx*k,py=y-vy*k+70*k*k;if(py>y+1)continue;s+=`<ellipse cx="${r2(px)}" cy="${r2(py)}" rx="2" ry="2.6" fill="${col}" stroke="${OL}" stroke-width="1" opacity="${r2(1-k)}"/>`;}return s;}
function ripple(x,y,k,w=12){if(k<=0||k>=1)return'';return`<ellipse cx="${r2(x)}" cy="${r2(y)}" rx="${r2(2+w*k)}" ry="${r2(.8+w*.22*k)}" fill="none" stroke="#e3eef4" stroke-width="1.4" opacity="${r2(1-k)}"/>`;}

/* ================= 1. Overweight (Slow Moe and the magpie) ================= */
function needleAt(t){return kf(t,[[0,-70],[2.72,-70],[2.92,66,'out'],[3.05,58],[3.18,63],[3.3,60],[4.05,60],[4.2,57],[4.85,57],[5.0,54],[5.75,54],[5.9,51],[6.15,51],[6.28,48],[7.0,48],[7.2,46],[7.62,46],[7.85,-70,'out'],[8.86,-70],[8.98,-26,'out'],[9.08,-32],[9.18,-28],[11.5,-28],[11.7,-70]]);}
const OW_OFF=134, HAT_G=[118,GY-1], KIT_G=[126,GY], BOOT_G=[[104,GY],[110,GY]];
const PICK={lean:44,bob:20,armB:-58,armF:-58};
BALD.overweight = { name:'Overweight', dur:13.2, still:6.9,
 beats:[[0,'moe-walks-in','Moe walks in with his lunch kit.'],[2.0,'spots-the-truck','Spots the truck scale. Curious.'],[2.5,'hops-on-clank','Hops on. CLANK.'],[2.75,'the-needle-swings','The needle swings deep into the red.'],[3.3,'glares-at-the','Glares at the dial.'],[3.8,'takes-off-his','Takes off his hard hat. Drops it. Still red.'],[4.7,'sets-down-his','Sets down his lunch kit. Still red.'],[5.6,'kicks-off-one','Kicks off one boot. Then the other. Still red.'],[6.8,'sucks-in-his','Sucks in his gut. Holds it. Still red.'],[7.6,'gives-up-turns','Gives up. Turns and steps off in his socks.'],[8.1,'behind-him-a','Behind him, a magpie flies in and lands on the scale.'],[8.9,'ding-green-light','Ding. Green light.'],[9.0,'moe-whips-round','Moe whips round. The magpie puffs up, smug.'],[9.9,'moe-glares-at','Moe glares at the magpie. Then at you.'],[10.5,'turns-and-gathers','Turns and gathers his hat, kit and boots.'],[11.35,'stomps-off-in','Stomps off in his socks.'],[11.4,'the-magpie-hops','The magpie hops round and flies off.']],
 lead:E=>E/OW_IN, tail:E=>E/OW_OUT, needle:needleAt,
 mx(t){if(t<0)return -40+OW_IN*t;if(t<2.0)return kf(t,[[0,-40],[2.0,128,'out']]);if(t<2.75)return t<2.5?128:lerp(128,SCX,es(t,2.5,2.75));if(t<7.85)return SCX;if(t<8.15)return lerp(SCX,OW_OFF,es(t,7.85,8.15));if(t<11.35)return OW_OFF;return t>13.0?-45-OW_OUT*(t-13.0):kf(t,[[11.35,OW_OFF],[13.0,-45,'in']]);},
 bird(t,E=0){if(t<8.1)return null;let p={x:178,y:PAD.y,face:-1,lid:'sly'};
  if(t<8.85){const k=seg(t,8.1,8.85);p.x=lerp(430+E,178,io(k));p.y=lerp(BIRD_IN_Y,PAD.y,k*k)-10*Math.sin(Math.PI*k)*(1-k);p.wing=-42+38*Math.sin(t*26);p.tail=-6;p.rot=-8*(1-k);p.lid='open';}
  else if(t<9.0){const k=seg(t,8.85,9.0);p.sy=1-.16*Math.sin(Math.PI*k);p.sx=1+.12*Math.sin(Math.PI*k);p.wing=-20*(1-k);}
  else if(t<11.3){p.lid='smug';p.px=t<9.6?80.5:78;p.sy=1+.05*Math.sin(Math.PI*seg(t,9.1,9.5));if(t>9.8&&t<10.6){p.y-=2*Math.abs(Math.sin((t-9.8)*12));}if(inr(t,10.7,10.84))p.lid='shut';}
  else if(t<11.5){p.y+=hop(t,11.3,11.5,7);p.face=t<11.4?-1:1;}
  else if(t<11.65){p.face=1;p.sy=.86;p.sx=1.08;p.tail=14;}
  else{const k=seg(t,11.65,12.7);p.face=1;p.x=lerp(178,440+E,k);p.y=lerp(PAD.y,BIRD_OUT_Y,io(k));p.wing=-42+38*Math.sin(t*26);p.rot=-12;p.lid='open';if(k>=1)return null;}
  return p;},
 _focus(t){if(t>8.1&&t<9.0){const b=this.bird(t);return{x:clamp((b.x+this.mx(t))/2,40,350),y:110};}return{x:clamp(this.mx(t)+18,40,350),y:118};},
 _draw(t,E=0){
  let s='',o='',B='',F='';
  const x=this.mx(t);
  let y=GY;if(t>=2.75&&t<7.85)y=PAD.y;else if(t>=2.5&&t<2.75)y=lerp(GY,PAD.y,seg(t,2.5,2.75));else if(t>=7.85&&t<8.15)y=lerp(PAD.y,GY,seg(t,7.85,8.15));
  let p={x,y,face:1,...MOE,eye:'n',mouth:'smile',handB:KIT};
  const hatOff=t>=3.95&&t<10.95, kitOff=t>=4.85&&t<10.95, boot1=t>=5.72&&t<10.95, boot2=t>=6.12&&t<10.95;
  if(hatOff)p.noHat=true;if(kitOff)p.handB='';if(boot1)p.sockB=true;if(boot2)p.socks=true;
  if(t<2.0){Object.assign(p,walk(x/8,22));p.handB=KIT;p.eye='happy';}
  else if(t<2.5){p.px=2;p.py=2;p.mouth='o';p.lean=8;}
  else if(t<2.75){p.bob=hop(t,2.5,2.75,10);p.mouth='o';}
  else if(t<3.3){p.sq=.07*Math.sin(Math.PI*seg(t,2.75,2.95));p.eye='wide';p.mouth='O';p.px=2.5;p.py=-.5;}
  else if(t<3.8){p.eye='half';p.mouth='frown';p.brow=4;p.px=2.5;}
  else if(t<4.25){p.armF=kf(t,[[3.8,0],[3.92,-165],[4.02,-95],[4.25,0]]);if(t>=3.92&&t<4.05)p.hand=HAT_IN_HAND(C.hat);p.eye='half';p.mouth='flat';p.px=2;}
  else if(t<4.7){p.eye='half';p.mouth='frown';p.px=2.5;p.brow=4;}
  else if(t<5.0){p.armB=kf(t,[[4.7,0],[4.85,-42],[5.0,0]]);if(t<4.85)p.handB=KIT;p.lean=kf(t,[[4.7,0],[4.85,10],[5.0,0]]);p.mouth='flat';}
  else if(t<5.6){p.eye='half';p.mouth='frown';p.px=2.5;p.brow=5;}
  else if(t<6.3){p.legB=t<5.95?kf(t,[[5.6,0],[5.72,48],[5.95,0]]):0;p.legF=t>=5.95?kf(t,[[5.95,0],[6.12,44],[6.3,0]]):0;p.mouth='grit';p.lean=t<5.95?-6:-4;}
  else if(t<6.8){p.eye='half';p.mouth='frown';p.px=2.5;p.brow=5;}
  else if(t<7.6){const k=seg(t,6.8,7.0);p.sq=-.07*k;p.blush=.8*k;p.mouth='flat';p.eye='closed';p.x=x+.6*Math.sin(t*60)*k;p.armF=-6;p.armB=6;}
  else if(t<7.85){p.bob=hop(t,7.6,7.85,6);p.face=t<7.72?1:-1;p.eye='half';p.mouth='frown';p.sq=.05*Math.sin(Math.PI*seg(t,7.6,7.72));}
  else if(t<8.15){p.face=-1;p.bob=hop(t,7.85,8.15,7);p.eye='half';p.mouth='frown';}
  else if(t<9.0){p.face=-1;p.eye='half';p.mouth='frown';p.py=2;p.headRot=6;}
  else if(t<9.25){p.bob=hop(t,9.0,9.25,8);p.face=t<9.12?-1:1;p.eye='wide';p.mouth='O';}
  else if(t<9.9){p.eye='wide';p.mouth='O';p.px=2.5;p.py=.6;}
  else if(t<10.5){p.eye='half';p.mouth='frown';p.brow=6;p.px=t<10.2?2.5:2;p.py=t<10.2?.6:0;}
  else if(t<10.75){p.bob=hop(t,10.5,10.75,8);p.face=t<10.62?1:-1;p.mouth='frown';}
  else if(t<11.15){p.face=-1;const b=kf(t,[[10.75,0],[10.9,1],[11.0,1],[11.15,0]]);p.lean=PICK.lean*b;p.bob=PICK.bob*b;p.armB=PICK.armB*b;p.armF=PICK.armF*b;p.eye='half';p.mouth='frown';if(t>=10.95){p.handB=KIT;p.hand=BOOTS;}}
  else if(t<11.35){p.face=-1;p.handB=KIT;p.hand=BOOTS;p.armF=-30;p.mouth='frown';p.eye='half';}
  else{Object.assign(p,walk(x/7,18));p.face=-1;p.handB=KIT;p.hand=BOOTS;p.armF=-30;p.eye='half';p.mouth='frown';p.headRot=6;}
  if(t>=10.95){p.noHat=false;p.sockB=true;p.socks=true;}
  // things on the ground (Moe's, gone again once he picks them up)
  if(t>=3.92&&t<10.95){if(t<4.25){if(t>=4.05){const k=seg(t,4.05,4.25);s+=hatW(lerp(SCX+16,HAT_G[0],k),lerp(GY-58,HAT_G[1],k*k),lerp(0,180*0,k));}}else s+=hatW(HAT_G[0],HAT_G[1]);}
  if(t>=4.85&&t<10.95){const k=seg(t,4.85,5.0);s+=kitW(lerp(SCX-10,KIT_G[0],k),lerp(GY-24,KIT_G[1],k*k));}
  const bootFly=(t0,i)=>{if(t<t0||t>=10.95)return'';const k=seg(t,t0,t0+.4);const [bx,by]=BOOT_G[i];return bootW(lerp(SCX-6,bx,k),lerp(PAD.y-4,by,k)-26*Math.sin(Math.PI*k),-200*k*(1-k)*4+(k>=1?0:0));};
  s+=bootFly(5.72,0)+bootFly(6.12,1);
  s+=worker(p);
  const b=this.bird(t,E);if(b)s+=magpie(b);
  // sound words
  if(t>2.75&&t<3.1)o+=sfx(SCX-20,GY-10,'clank',9,-6,'#fff');
  if(t>2.8&&t<3.3)o+=sfx(DIAL.x+18,DIAL.y-12,'creak',9,8,'#fff');
  if(t>4.2&&t<4.5)o+=sfx(HAT_G[0]-4,GY-16,'thud',9,-6,'#fff');
  if(t>6.0&&t<6.3)o+=sfx(BOOT_G[0][0]-6,GY-18,'clonk',9,-6,'#fff');
  if(t>6.4&&t<6.7)o+=sfx(BOOT_G[1][0]+2,GY-24,'clonk',9,6,'#fff');
  if(t>8.98&&t<9.6)o+=sfx(DIAL.x+16,DIAL.y-14,'ding',11,8,'#9be37a',1+.1*Math.sin(t*40));
  return{s,o,B,F};}};

/* ================= 2. Two Left Feet (two sandhill cranes and Slow Moe) ================= */
const CA=246, CBX=292;
function craneHop(t,a,d=.45){if(t<a-.18||t>a+d+.12)return{bob:0,bend:0,wing:0,fly:0};if(t<a)return{bob:0,bend:.5*seg(t,a-.18,a),wing:.15,fly:0};if(t<a+d){const k=seg(t,a,a+d);return{bob:-26*Math.sin(Math.PI*k),bend:0,wing:.75+.25*Math.sin(k*Math.PI*3),fly:.25*Math.sin(Math.PI*k),legF:-14*Math.sin(Math.PI*k)};}return{bob:0,bend:.4*(1-seg(t,a+d,a+d+.12)),wing:.2,fly:0};}
BALD.cranes = { name:'Two Left Feet', dur:12.8, still:7.9,
 beats:[[0,'a-rattling-call','A rattling call from above. Garooo.'],[0.2,'two-sandhill-cranes','Two sandhill cranes glide in, legs down.'],[1.8,'they-land-the','They land. The second hop-turns to face the first.'],[2.1,'they-bow-to','They bow to each other.'],[2.7,'the-dance-leaps','The dance: leaps, half-open wings, more bows.'],[4.4,'slow-moe-walks','Slow Moe walks in from the far side and stops to watch.'],[5.9,'he-copies-them','He copies them. A bow. A flap. A little hop.'],[6.4,'the-cranes-stop','The cranes stop and stare at him.'],[6.9,'he-tries-the','He tries the one-leg pose, arms out like wings. Wobbles.'],[7.6,'he-notices-them','He notices them staring. Freezes. Sheepish grin.'],[7.9,'both-cranes-slowly','Both cranes slowly shake their heads.'],[8.7,'crouch-leap-and','Crouch, leap, and they fly off.'],[9.5,'a-grey-feather','A grey feather floats down onto his hat.'],[10.3,'he-puts-his','He puts his leg down. Looks at you. Shrugs.'],[10.9,'hopturn-one-last','Hop-turn. One last little flap. Walks off.']],
 lead:E=>0, tail:E=>E/CR_OUT,
 mx(t){if(t<4.4)return 430+CR_IN*(4.4-t);if(t<5.5)return kf(t,[[4.4,430],[5.5,326,'out']]);if(t<11.15)return 326;return t>12.7?435+CR_OUT*(t-12.7):kf(t,[[11.15,326],[12.7,435,'in']]);},
 cr(i,t,E=0){const home=i?CBX:CA;let o={x:home,y:GY,face:1,eye:'n'};
  const t0=i?.45:.2,t1=i?1.85:1.65;
  if(t<t1){const k=seg(t,t0,t1);o.x=lerp((i?-70:-90)-E,home,io(k));o.y=lerp(i?CRANE_IN_Y-4:CRANE_IN_Y,GY,io(k))-8*Math.sin(Math.PI*k);o.fly=1-seg(k,.7,1);o.wing=.55+.45*Math.sin(t*9+i);o.legF=-30*seg(k,.6,1);o.legB=-20*seg(k,.6,1);o.open=t<.6&&!i?.6:0;if(t<t0)o.x=-9999;return o;}
  if(i&&t<2.1){o.y=GY+hop(t,1.85,2.1,9);o.face=t<1.98?1:-1;o.wing=.2;return o;}
  if(i)o.face=-1;
  if(t<2.7){const b=Math.sin(Math.PI*seg(t,2.1,2.6));o.neck=b;o.lean=10*b;o.wing=.25*b;return o;}
  if(t<6.4){const hops=i?[3.0,3.8,4.7,5.5]:[2.7,3.5,4.4,5.2];let h={bob:0,bend:0,wing:.1,fly:0};hops.forEach(a=>{const q=craneHop(t,a);if(q.bob||q.bend||q.wing>.15)h=q;});
   o.y=GY+h.bob;o.bend=h.bend;o.wing=h.wing;o.fly=h.fly;if(h.legF)o.legF=h.legF;
   const bw=(i?[4.25,5.05]:[3.95,4.85]).some(a=>inr(t,a,a+.3));if(bw)o.neck=.8;o.open=inr(t,2.75,3.0)?.6:0;return o;}
  const toMoe=(this.mx(t)<o.x?-1:1)*o.face;
  if(t<7.9){o.eye='wide';o.px=toMoe*2.2;o.py=.4;if(inr(t,7.2,7.3))o.eye='closed';return o;}
  if(t<8.6){o.eye='half';o.px=toMoe*1.4;o.shake=3.4*Math.sin((t-7.9+i*.08)*15)*Math.sin(Math.PI*seg(t,7.9,8.6));return o;}
  // take off: the second hop-turns to face the way they fly
  if(i&&t<8.95){if(t<8.7){o.eye='half';return o;}o.y=GY+hop(t,8.7,8.95,9);o.face=t<8.82?-1:1;return o;}
  o.face=1;const a=i?8.95:8.7;
  if(t<a){o.eye='half';return o;}
  if(t<a+.2){o.bend=.7*seg(t,a,a+.2);o.wing=.3;return o;}
  const k=seg(t,a+.2,a+1.8);o.x=lerp(home,(i?520:500)+E,k*k);o.y=lerp(GY,i?CRANE_OUT_Y-4:CRANE_OUT_Y,io(k))-6*Math.sin(Math.PI*k);o.fly=Math.min(1,k*3);o.wing=.55+.45*Math.sin(t*9+i);if(k>=1)o.x=-9999;return o;},
 _focus(t){if(t<2.0)return{x:255,y:100};if(t<4.4)return{x:258,y:108};if(t<9.2)return{x:clamp((this.mx(t)+270)/2,40,350),y:112};return{x:clamp(this.mx(t)-10,40,350),y:118};},
 _draw(t,E=0){
  let s='',o='',B='',F='';
  const x=this.mx(t);
  [0,1].forEach(i=>{const o=this.cr(i,t,E);if(o.x>-150-E&&o.x<480+E)s+=crane(o);});
  let p={x,face:-1,...MOE,eye:'n',mouth:'smile'};
  if(t>=10.25)p.hatItem=`<g transform="translate(-4 -12) rotate(-20)">${FEATHER_G}</g>`;
  // his one-leg crane pose: knee up, arms out like wings, wobbling
  const pose=(k,wob)=>{p.legF=-78*k;p.armF=-92*k;p.armB=92*k;p.lean=wob*k;p.bob=-3*k;};
  if(t<5.5){Object.assign(p,walk(x/8,22));p.eye='happy';}
  else if(t<5.9){p.eye='happy';p.mouth='o';p.px=2;}
  else if(t<6.3){const b=Math.sin(Math.PI*seg(t,5.9,6.3));p.lean=26*b;p.armF=-70*b;p.armB=-60*b;p.eye='happy';p.mouth='grin';}
  else if(t<6.9){const w=(t-6.3)*15;p.armF=-100+55*Math.sin(w);p.armB=-100+55*Math.sin(w);p.bob=hop(t,6.4,6.75,9);p.eye='happy';p.mouth='grin';}
  else if(t<7.6){pose(es(t,6.9,7.1),7*Math.sin(t*9));p.eye='closed';p.mouth='grit';}
  else if(t<10.3){pose(1,(t<8.7?4:2.5)*Math.sin(t*8));p.eye='n';p.mouth='grin';p.blush=.7;
   const b=this.cr(0,t);p.px=2.2;p.py=t>9.0?clamp((b.y-(GY-60))/30,-2.6,0):.4;if(inr(t,8.1,8.2))p.eye='closed';}
  else if(t<10.9){const k=1-es(t,10.3,10.55);pose(k,0);p.eye='half';p.mouth='flat';p.blush=.7*k;p.px=2;
   if(t>10.55){const sh=Math.sin(Math.PI*seg(t,10.55,10.9));p.armF=-40*sh;p.armB=-40*sh;p.bob=-2*sh;}}
  else if(t<11.15){p.bob=hop(t,10.9,11.15,8);p.face=t<11.02?-1:1;p.mouth='flat';}
  else{Object.assign(p,walk(x/8,18));p.face=1;p.eye='half';p.mouth='smile';
   if(t<11.6){const w=(t-11.15)*16;p.armF=-100+50*Math.sin(w);p.armB=-100+50*Math.sin(w);p.bob=hop(t,11.2,11.5,6);}}
  s+=worker(p);
  // the feather comes down from the flight onto his hat
  if(t>=9.5&&t<10.25){const k=seg(t,9.5,10.25);const hx=x-1,hy=GY-67;s+=`<g transform="translate(${r2(lerp(x+70,hx,k)+8*Math.sin(k*9))} ${r2(lerp(FEATHER_Y,hy,io(k)))}) rotate(${r2(-20+30*Math.sin(k*8))})">${FEATHER_G}</g>`;}
  if(t>=0&&t<1.2)o+=sfx(70,GAROO_Y,'garooo',10,-6,'#fff',.9+.1*Math.sin(t*20));
  if(t>2.7&&t<3.0)o+=sfx(CA+18,GY-70,'garoo',8,-6,'#fff');
  return{s,o,B,F};}};

/* ================= 3. Right of Way (a bison and Slow Moe's pickup) ================= */
const RW_TX=80, BXH=290;
BALD.bison = { name:'Right of Way', dur:14.4, still:10.8,
 beats:[[0,'a-bison-ambles','A bison ambles in from the left.'],[1.7,'stops-in-the','Stops in the middle of the lane.'],[1.8,'lies-down-chews','Lies down. Chews.'],[2.2,'slow-moe-drives','Slow Moe drives in and stops.'],[3.8,'beep-beep','BEEP BEEP.'],[4.2,'the-bison-yawns','The bison yawns. Does not move.'],[5.0,'clunk-moe-gets','Clunk. Moe gets out on the far side.'],[5.1,'walks-round-the','Walks round the front of the truck to the bison.'],[6.0,'waves-his-arms','Waves his arms. “Shoo!” The bison flicks its tail.'],[6.8,'claps-clap-clap','Claps. Clap clap. The bison keeps chewing.'],[7.3,'he-gives-up','He gives up. Arms drop.'],[7.7,'hopturn-stomps-back','Hop-turn. Stomps back round the front of the truck.'],[8.7,'clunk-back-in','Clunk. Back in.'],[9.0,'backs-up-the','Backs up the way he came. Beep... beep... Grr.'],[10.4,'the-bison-looks','The bison looks back...'],[10.6,'and-giggles-heh','...and giggles. Heh heh heh.'],[11.3,'gets-up-in','Gets up, in its own time.'],[11.9,'ambles-off','Ambles off.']],
 backY:GY-8, frontY:GY+12,
 lead:E=>E/BI_IN, tail:E=>E/BI_OUT,
 lines:[{key:'shoo',from:6.0,to:6.8,mouth(t){return{x:BALD.bison.wx(t)+8,y:GY-46};}}],
 bx(t){if(t<0)return -120+BI_IN*t;if(t<1.7)return kf(t,[[0,-120],[1.7,BXH,'out']]);if(t<11.9)return BXH;return t>14.2?520+BI_OUT*(t-14.2):kf(t,[[11.9,BXH],[14.2,520,'in']]);},
 tx(t){if(t<2.2)return -90-TR_IN*(2.2-t);if(t<9.0)return kf(t,[[2.2,-90],[3.6,RW_TX,'out']]);return t>10.6?-90-TR_OUT*(t-10.6):kf(t,[[9.0,RW_TX],[10.6,-90,'in']]);},
 wx(t){return kf(t,[[5.05,RW_TX+8],[5.6,166,'lin'],[6.0,230,'out'],[7.9,230],[8.3,166,'in'],[8.65,RW_TX+12,'out']]);},
 laneY(x){return x<148?GY-8:x>170?GY+12:lerp(GY-8,GY+12,(x-148)/22);},
 bis(t){const x=this.bx(t);let o={x,face:1};
  if(t<1.7){o.walk=1;o.ph=x/11;o.tail=6*Math.sin(t*4);return o;}
  if(t<2.3){o.lie=es(t,1.8,2.3);o.headDip=4*o.lie;o.eye='half';return o;}
  if(t<10.4){o.lie=1;o.headDip=4;o.eye='half';o.chew=(inr(t,2.4,3.8)||inr(t,5.2,8.8))?(Math.sin(t*14)+1)/2:0;
   if(t>=4.2&&t<5.0){o.mouth='yawn';o.eye='closed';o.headDip=-6*Math.sin(Math.PI*seg(t,4.2,5.0));}
   if(t>=5.9&&t<7.3){o.tail=14*Math.sin(t*9);o.px=-2;}
   if(t>=9.0)o.px=-2.2;
   return o;}
  if(t<10.6){o.lie=1;o.headDip=4;o.eye='n';o.px=-2.6;o.py=-.5;return o;}
  if(t<11.3){const g=Math.abs(Math.sin((t-10.6)*22));o.lie=1;o.headDip=2+3*g;o.eye='happy';o.mouth='grin';o.sq=.025*g;return o;}
  if(t<11.9){o.lie=1-es(t,11.3,11.8);o.headDip=4*o.lie;o.eye='half';o.mouth='grin';return o;}
  o.walk=1;o.ph=x/11;o.eye='half';o.mouth='grin';o.tail=6*Math.sin(t*4);return o;},
 _focus(t){if(t<2.2)return{x:clamp(this.bx(t),40,350),y:118};if(t<5.0)return{x:clamp((this.tx(t)+BXH)/2+20,40,350),y:118};if(t<8.7)return{x:clamp((this.wx(t)+BXH)/2,40,350),y:120};if(t<10.4)return{x:clamp((this.tx(t)+BXH)/2,40,350),y:118};return{x:clamp(this.bx(t)+20,40,350),y:122};},
 _draw(t,E=0){
  let s='',o='',B='',F='';
  const tx=this.tx(t),wx=this.wx(t);
  const inside=t<5.0||t>=8.7;
  const rock=(inr(t,5.0,5.3)?Math.sin(Math.PI*seg(t,5.0,5.3))*1.6:0)+(inr(t,8.7,9.0)?Math.sin(Math.PI*seg(t,8.7,9.0))*-1.6:0)+(inr(t,3.8,4.4)?Math.sin((t-3.8)*30)*.6:0);
  let pitch=0;if(t>=3.6&&t<3.9)pitch=2.2*Math.sin(Math.PI*seg(t,3.6,3.9));if(t>=9.0&&t<9.25)pitch=1.6*Math.sin(Math.PI*seg(t,9.0,9.25));
  let drv=null;if(inside&&tx>-100-E){drv={...MOE,eye:t<3.8?'happy':'half',mouth:t<3.8?'o':'flat',px:2};if(t>=8.7){drv.mouth='frown';drv.brow=6;drv.px=0;}}
  // Moe outside: behind the truck on the far side, then the front lane by the bison's rump
  let moeS='',behind=false;
  if(!inside){
   let p={x:wx,y:this.laneY(wx),face:1,...MOE,eye:'n',mouth:'flat'};
   behind=wx<158;
   if(t<6.0){Object.assign(p,walk(wx/8,22));p.mouth='frown';p.brow=3;}
   else if(t<6.8){const w=(t-6.0)*16;p.armF=-150+40*Math.sin(w);p.armB=-150-40*Math.sin(w);p.mouth='O';p.brow=4;p.bob=-2*Math.abs(Math.sin(w));}
   else if(t<7.3){const c=Math.abs(Math.sin((t-6.8)*20));p.armF=-84+14*c;p.armB=-84-14*c;p.mouth='flat';p.brow=5;p.eye='half';}
   else if(t<7.7){const k=es(t,7.3,7.5);p.armF=-84*(1-k);p.armB=-84*(1-k);p.lean=10*k;p.headRot=8*k;p.eye='half';p.mouth='frown';}
   else if(t<7.9){p.bob=hop(t,7.7,7.9,7);p.face=t<7.8?1:-1;p.mouth='frown';p.eye='half';}
   else{p.face=-1;Object.assign(p,walk(wx/6,26));p.mouth='frown';p.brow=6;p.eye='half';p.lean=6;}
   moeS=worker(p);}
  const bo=this.bis(t);
  const bisonS=bo.x<500+E&&bo.x>-140-E?bison(bo):'';
  if(behind)B+=moeS;
  if(tx>-95-E)s+=pickup({x:tx,y:GY-rock,pitch,spin:tx*5.2,driver:drv,id:'r'});
  s+=bisonS;
  if(!behind)F+=moeS;
  // sound words and steam
  if(t>3.8&&t<4.5)o+=sfx(tx+30,GY-82,'BEEP BEEP',10,-6,'#f4c430',1+.08*Math.sin(t*40));
  if(t>5.0&&t<5.4)o+=sfx(tx+4,GY-74,'clunk',9,-6,'#fff');
  if(t>8.7&&t<9.1)o+=sfx(tx+4,GY-74,'clunk',9,-6,'#fff');
  if(t>6.8&&t<7.3)o+=sfx(wx+22,GY-46,'clap clap',9,-6,'#fff');
  if(t>9.0&&t<10.5&&((t-9.0)%.5)<.3)o+=sfx(tx-74,GY-46,'beep',8,0,'#f4c430');
  if(t>9.1&&t<10.2){for(let i=0;i<3;i++){const ph=((t*1.6+i/3)%1);o+=puff(tx+24+i*4,GY-70-ph*18,2.4+ph*3,(1-ph)*.8,'#eef0f2');}if(t<9.9)o+=sfx(tx+44,GY-80,'grr',10,-6,'#fff');}
  if(t>10.6&&t<11.3){const n=bisonNose(bo);o+=sfx(n[0]-22,n[1]-36-(Math.floor(t*8)%2)*3,'heh heh heh',10,-6,'#fff');}
  return{s,o,B,F};}};

/* ================= 4. Half Dressed (a snowshoe hare, mid-moult) ================= */
const HX_EDGE=106, HTOP=68, HMUD=128, HHIDE=104;
BALD.hare = { name:'Half Dressed', dur:11.4, still:6.6,
 beats:[[0,'a-snowshoe-hare','A snowshoe hare hops in. Half brown, half white.'],[1.2,'sits-by-the','Sits by the snowbank. Nibbles.'],[1.4,'crunch-crunch-footsteps','Crunch crunch. Footsteps. Ears up.'],[1.9,'hides-against-the','Hides against the snow. His brown half sticks out. So does his white half.'],[2.4,'looks-back-at','Looks back at himself.'],[2.9,'hops-onto-the','Hops onto the snowbank. The white half vanishes. The brown half does not.'],[3.9,'hopturn-down-into','Hop-turn down into the mud. Now the white half glows.'],[4.8,'the-footsteps-are','The footsteps are close.'],[5.0,'backs-up-to','Backs up to the line where snow meets mud. Gone. Just one eye.'],[5.6,'the-bearded-worker','The bearded worker strolls in, whistling.'],[6.95,'steps-right-over','Steps right over him.'],[7.6,'the-eye-follows','The eye follows him out.'],[8.4,'the-hare-reappears','The hare reappears. Proud.'],[9.3,'hops-off','Hops off.']],
 lead:E=>E/HA_IN, tail:E=>Math.max(E/HA_OUT,E/WK_V-1.4),
 hx(t){if(t<0)return 430-HA_IN*t;if(t<1.2)return kf(t,[[0,430],[1.2,HX_EDGE+6,'out']]);if(t<2.9)return HX_EDGE+6;if(t<3.3)return lerp(HX_EDGE+6,HTOP,es(t,2.9,3.3));if(t<3.9)return HTOP;if(t<4.4)return lerp(HTOP,HMUD,es(t,3.9,4.4));if(t<5.0)return HMUD;if(t<5.5)return lerp(HMUD,HHIDE,es(t,5.0,5.5));if(t<9.3)return HHIDE;return t>11.2?440+HA_OUT*(t-11.2):kf(t,[[9.3,HHIDE],[11.2,440,'in']]);},
 wkx(t){return -40+WK_V*(t-5.6);},
 _focus(t){if(t<1.2)return{x:clamp(this.hx(t),40,350),y:130};if(t>5.6&&t<8.0)return{x:clamp((this.wkx(t)+this.hx(t))/2,60,350),y:122};return{x:clamp(this.hx(t),40,350),y:132};},
 _draw(t,E=0){
  let s='',o='',B='',F='';
  const x=this.hx(t);
  let h={x,y:GY,face:-1};
  const sbTop=xx=>{const {x0,x1,top,base}=SB,m=(x0+x1)/2;const d=Math.abs(xx-m)/((x1-x0)/2);return lerp(top+1,base,clamp(d*d));};
  if(t<1.2){const ph=((t*3.2)%1+1)%1;h.lift=10*Math.sin(Math.PI*ph);h.crouch=.2;}
  else if(t<1.4){h.sit=.8;h.nib=t;}
  else if(t<1.9){h.sit=.8;h.ear=1;h.eye='wide';h.px=-1.5;}
  else if(t<2.9){h.crouch=1;h.ear=-.3;h.eye='wide';h.lift=0;h.sq=.05;if(t>2.4){h.px=-2.6;h.py=1.2;h.eye='n';h.mouth='flat';}}
  else if(t<3.3){const k=seg(t,2.9,3.3);h.y=lerp(GY,sbTop(HTOP),k);h.lift=16*Math.sin(Math.PI*k);h.crouch=.2;}
  else if(t<3.9){h.y=sbTop(HTOP);h.crouch=1;h.rb=es(t,3.3,3.5);if(t>3.5){h.px=-2.4;h.py=-.5;}if(t>3.7){h.px=.5;h.py=2;h.mouth='flat';}}
  else if(t<4.4){const k=seg(t,3.9,4.4);h.y=lerp(sbTop(HTOP),GY,k);h.lift=18*Math.sin(Math.PI*k);h.face=k<.5?-1:1;h.crouch=.2;h.rb=1-k;}
  else if(t<5.0){h.face=1;h.crouch=1;h.fb=es(t,4.4,4.6);h.px=t>4.55?-2.6:0;h.mouth='flat';if(t>4.8){h.eye='wide';h.ear=1;h.px=-1;}}
  else if(t<5.5){h.face=1;h.crouch=1;h.fb=1;h.rb=es(t,5.25,5.5);h.eye='wide';}
  else if(t<8.4){h.face=1;h.crouch=1;h.fb=1;h.rb=1;h.eye=inr(t,6.0,6.12)||inr(t,8.0,8.1)?'closed':'n';const w=this.wkx(t);h.px=t>6.7?clamp((w-x)/40,-2.5,2.5):-1;h.py=inr(t,6.8,7.2)?-2:0;}
  else if(t<9.3){const k=es(t,8.4,8.8);h.face=1;h.fb=1-k;h.rb=1-k;h.crouch=1-k;h.sit=k;h.eye='half';h.mouth='smile';}
  else{h.face=1;const ph=((t-9.3)*3.2)%1;h.lift=10*Math.sin(Math.PI*ph);h.crouch=.2;}
  s+=hare(h);
  // the bearded worker, whistling, steps right over him
  const w=this.wkx(t);
  if(w>-45-E&&w<445+E){let q=Object.assign(walk(w/8,22),{x:w,face:1,...BEARD,eye:'happy',mouth:'o'});
   if(Math.abs(w-x)<22){const k=1-Math.abs(w-x)/22;q.legF=-46*k;q.legB=10*k;q.bob=-3*k;}
   s+=worker(q);for(let k=0;k<2;k++){const ph=((t*1.4+k*.5)%1);o+=note(w+14+ph*10,GY-62-ph*18,1-ph);}}
  if((t>1.4&&t<2.0)||(t>4.75&&t<5.5)){const loud=t>4.7;o+=sfx(loud?40:16,GY-40-(Math.floor(t*4)%2)*6,'crunch',loud?11:8,-6,'#fff');}
  return{s,o,B,F};}};

/* ================= 5. Last Ice (Slow Moe on an ice pan, and a bigger fish) ================= */
const LI_X=290;
/* a northern pike, side profile, facing right; centre of the body at (0,0), about 64 units long */
function pike(x,y,rot,open=0,s=.62){const O2='#5f7a3c',OD='#4a6230',BE='#e8e2b8',SP='#d9d68f',FIN='#c8642e';const j=open*9;
 return`<g transform="translate(${r2(x)} ${r2(y)}) rotate(${r2(rot)}) scale(${s})"><path d="M-30 0 L-44 -11 L-41 0 L-44 11 z" fill="${FIN}" ${sw(2)}/><path d="M-14 -7 L-20 -16 L-8 -9 z M-14 7 L-20 15 L-8 9 z" fill="${FIN}" ${sw(1.8)}/>`+
 `<path d="M-32 0 Q-20 -10 6 -9 Q22 -8 26 -4 L40 ${r2(-3-j*.3)} Q42 ${r2(-1-j*.3)} 38 ${r2(-.5-j*.2)} L26 -1 L26 1 L36 ${r2(1+j)} Q38 ${r2(3+j)} 34 ${r2(3.6+j)} L24 6 Q20 9 6 9 Q-20 10 -32 0 z" fill="${O2}" ${sw(2.4)}/>`+
 `<path d="M-26 3 Q-10 9 14 7 Q22 6 25 4" fill="none" stroke="${BE}" stroke-width="3.4" stroke-linecap="round"/>`+
 (open>.2?`<path d="M27 0 l3 ${r2(-1-j*.15)} l2 ${r2(1+j*.15)} M30 ${r2(1.5+j*.5)} l2 ${r2(-1.6-j*.3)} l2 ${r2(2+j*.3)}" stroke="#fff" stroke-width="1.2" fill="none"/>`:'')+
 [[-18,-3],[-8,-5],[2,-4],[-12,2],[-2,1],[10,-1]].map(([a,b])=>`<ellipse cx="${a}" cy="${b}" rx="2.6" ry="1.3" fill="${SP}"/>`).join('')+
 `<path d="M2 -8.6 L8 -14 L12 -8.4 z" fill="${OD}" ${sw(1.6)}/><circle cx="17" cy="-3.4" r="3.8" fill="#fff" ${sw(1.6)}/><circle cx="18" cy="-3.4" r="1.9" fill="${OL}"/><path d="M12 -6 Q14 0 12 5" fill="none" stroke="${OD}" stroke-width="1.6"/></g>`;}
const PIKE_X=-46;
BALD.ice = { name:'Last Ice', dur:12.6, still:8.4,
 beats:[[0,'slow-moe-drifts','Slow Moe drifts in on an ice pan, sitting on a pail, rod out.'],[2.6,'the-pan-bumps','The pan bumps into a chunk of ice and stops. Bump.'],[3.4,'the-bobber-dips','The bobber dips. Plunk.'],[3.8,'he-yanks-up','He yanks. Up comes one tiny fish.'],[4.4,'holds-it-up','Holds it up. “Got one!”'],[5.2,'jumps-up-to','Jumps up to celebrate.'],[5.5,'the-pan-tips','The pan tips. Windmill arms.'],[6.8,'sits-back-down','Sits back down hard. SPLASH.'],[7.1,'the-fish-flips','The fish flips out of his hand...'],[7.45,'and-lands-on','...and lands on the edge of the ice. Flip flop.'],[7.6,'he-leans-out','He leans out for it. Slowly. Carefully.'],[8.2,'bubbles','Bubbles.'],[8.3,'a-big-pike','A big pike bursts up out of the water...'],[8.5,'chomp-gone','...CHOMP. Gone.'],[8.7,'and-back-down','And back down. SPLASH.'],[9.2,'moe-still-reaching','Moe, still reaching, looks at you.'],[9.8,'the-pan-drifts','The pan drifts back out the way it came.']],
 backY:POND.surf+3, onPond:true,
 lead:E=>E/IC_IN, tail:E=>E/IC_OUT,
 lines:[{key:'got',from:4.4,to:5.2,mouth(t){return{x:BALD.ice.px(t)-2,y:POND.surf-44};}}],
 px(t){if(t<0)return 440-IC_IN*t;if(t<9.8)return kf(t,[[0,440],[2.6,LI_X,'out']]);return t>12.4?450+IC_OUT*(t-12.4):kf(t,[[9.8,LI_X],[12.4,450,'in']]);},
 tilt(t){let a=0;if(t>=5.5&&t<6.85){const k=seg(t,5.5,6.85);a=11*Math.sin((t-5.5)*8)*(1-k*.5);}if(t>=6.85&&t<7.4)a=4*Math.sin((t-6.85)*20)*(1-seg(t,6.85,7.4));if(inr(t,2.6,2.8))a=-2*Math.sin(Math.PI*seg(t,2.6,2.8));if(inr(t,8.7,9.1))a=2.4*Math.sin((t-8.7)*24)*(1-seg(t,8.7,9.1));return a;},
 /* the pike: up beside the pan's edge, head first, then over and back down head first */
 pk(t,px){if(t<8.3||t>=8.78)return null;const k=seg(t,8.3,8.78);const y=POND.surf+16-34*Math.sin(Math.PI*k);const rot=lerp(-74,100,io(k));return{x:px+PIKE_X+5*Math.sin(Math.PI*k),y,rot,open:k<.42?1:k<.48?1-(k-.42)*16:0};},
 _focus(t){if(t<2.4)return{x:clamp(this.px(t)-10,40,350),y:96};if(t>7.4&&t<9.2)return{x:clamp(this.px(t)-28,40,350),y:96};return{x:clamp(this.px(t)-20,40,350),y:100};},
 _draw(t,E=0){
  let s='',o='',B='',F='';
  const px=this.px(t),py=POND.surf+1+.8*Math.sin(t*2.2),a=this.tilt(t);
  const seated=!(t>=5.2&&t<6.85);
  const pailX=px+6, pailY=py-1;
  let p={face:-1,...MOE,eye:'half',mouth:'smile'};
  if(seated){p.x=pailX;p.y=pailY-16+21.6;p.legF=-58;p.legB=-48;}else{p.x=px+2;p.y=py-1;}
  const fishOnLine=t>=3.8&&t<4.4, fishInHand=t>=4.4&&t<7.1;
  let rodA=-32,rodL=34;
  if(t<3.4){p.armF=-62;p.eye='half';p.mouth='smile';}
  else if(t<3.8){p.armF=-62;p.eye='wide';p.mouth='o';p.py=2;p.px=1.6;}
  else if(t<4.4){p.armF=kf(t,[[3.8,-62],[3.95,-140]]);rodA=kf(t,[[3.8,-32],[3.95,-78]]);p.eye='wide';p.mouth='grin';}
  else if(t<5.2){p.armF=-120;rodA=-70;p.armB=-150;p.eye='happy';p.mouth='grin';p.px=2;}
  else if(t<5.5){p.bob=hop(t,5.2,5.5,10);p.armF=-150;p.armB=-160;rodA=-80;p.eye='happy';p.mouth='grin';p.legF=0;p.legB=0;}
  else if(t<6.85){const w=(t-5.5)*14;p.armF=-150+110*Math.sin(w);p.armB=-150-110*Math.sin(w);rodA=-80+40*Math.sin(w);p.eye='wide';p.mouth='O';p.lean=-a*.8;}
  else if(t<7.1){p.armF=-90;p.armB=-140;rodA=-50;p.eye='wide';p.mouth='O';p.bob=kf(t,[[6.85,-4],[6.95,3],[7.1,0]]);}
  else if(t<7.6){p.armF=-70;p.armB=kf(t,[[7.1,-140],[7.3,-90]]);rodA=-40;p.eye='wide';p.mouth='O';p.px=1.6;p.py=2;}
  else if(t<9.2){const k=es(t,7.6,8.2);p.armB=-60;rodA=-60;p.lean=20*k;p.armF=lerp(-90,-36,k);p.eye=t<8.3?'n':'wide';p.mouth=t<8.3?'flat':'O';p.px=2;p.py=2;if(t>=8.3&&t<8.8){p.py=-1.5;}}
  else if(t<9.8){const k=1-es(t,9.5,9.8);p.armB=-60;rodA=-60;p.lean=20*k;p.armF=lerp(-90,-36,k);p.eye='half';p.mouth='flat';p.px=2;}
  else{p.armF=150;rodA=-118;p.eye='half';p.mouth='frown';p.brow=4;}
  // the pan, the pail, Moe and his rod, all tilting together about the pan's middle
  let g=`<path d="${blob(px,py+2,34,4.2,81)}" fill="#c3d2de" ${sw(2)}/><path d="${blob(px,py,33,3.4,82)}" fill="#eef3f7" stroke="${OL}" stroke-width="1.6"/>`;
  g+=pail(pailX,pailY);
  g+=worker(p);
  const h=handW(p,(t>=7.6&&t<9.8)?'B':'F'), ra=rodA*Math.PI/180, tip=[h[0]-Math.cos(ra)*rodL,h[1]+Math.sin(ra)*rodL];
  g+=`<path d="M${r2(h[0])} ${r2(h[1])} L${r2(tip[0])} ${r2(tip[1])}" stroke="${OL}" stroke-width="2.6" stroke-linecap="round"/><path d="M${r2(h[0])} ${r2(h[1])} L${r2(tip[0])} ${r2(tip[1])}" stroke="#8a6a45" stroke-width="1.2" stroke-linecap="round"/>`;
  if(t<3.8){const bx=tip[0]-6,by=POND.surf+(inr(t,3.4,3.8)?3*Math.sin(Math.PI*seg(t,3.4,3.6)):0);g+=`<path d="M${r2(tip[0])} ${r2(tip[1])} Q${r2(bx-2)} ${r2((tip[1]+by)/2)} ${r2(bx)} ${r2(by-2)}" fill="none" stroke="#f4f1ea" stroke-width=".8"/>`+bobber(bx,by-1);}
  else if(fishOnLine){const k=seg(t,3.8,4.0);const fy=lerp(POND.surf+2,tip[1]+14,k);g+=`<path d="M${r2(tip[0])} ${r2(tip[1])} L${r2(tip[0])} ${r2(fy-3)}" stroke="#f4f1ea" stroke-width=".8"/>`+tinyFish(tip[0],fy,90+12*Math.sin(t*30));}
  else if(fishInHand&&t<7.1){const hb=handW(p,'B');g+=tinyFish(hb[0],hb[1]-4,-70+10*Math.sin(t*25));}
  s+=`<g transform="rotate(${r2(a)} ${r2(px)} ${r2(py)})">${g}</g>`;
  // the tiny fish: out of his hand, onto the edge of the ice, flopping
  const edge=[px-28,py-2.6];
  if(t>=7.1&&t<7.45){const k=seg(t,7.1,7.45);const hb=handW(p,'B');s+=tinyFish(lerp(hb[0],edge[0],k),lerp(hb[1]-4,edge[1],k)-16*Math.sin(Math.PI*k),-70+250*k);}
  else if(t>=7.45&&t<8.5){const f=Math.sin((t-7.45)*26);s+=tinyFish(edge[0]+.6*f,edge[1]-1.6*Math.abs(f),f*28);}
  // bubbles, then the pike, cut off at the water line
  if(t>=8.15&&t<8.35){for(let i=0;i<3;i++){const k=((t-8.15)*5+i/3)%1;s+=`<circle cx="${r2(px+PIKE_X+(i-1)*3)}" cy="${r2(POND.surf+1-k*3)}" r="${r2(1+k)}" fill="none" stroke="#e3eef4" stroke-width="1"/>`;}}
  const pk=this.pk(t,px);
  if(pk)s+=`<clipPath id="pkclip"><rect x="-900" y="-200" width="2400" height="${POND.surf+201}"/></clipPath><g clip-path="url(#pkclip)">${pike(pk.x,pk.y,pk.rot,pk.open)}</g>`;
  if(t>=8.3&&t<8.42)s+=ripple(px+PIKE_X,POND.surf+1,seg(t,8.3,8.42),8);
  s+=splashDrops(px+PIKE_X,POND.surf,seg(t,8.3,8.7),6)+splashDrops(px+PIKE_X,POND.surf,seg(t,8.72,9.2),8);
  s+=ripple(px+PIKE_X,POND.surf+1,seg(t,8.75,9.7),16)+ripple(px+PIKE_X,POND.surf+1,seg(t,8.95,9.9),11);
  if(t>=3.4&&t<3.8)s+=ripple(px-40,POND.surf+1,seg(t,3.4,3.8),8);
  if(t>=6.85&&t<7.4){s+=splashDrops(px-26,py,seg(t,6.85,7.4))+splashDrops(px+26,py,seg(t,6.88,7.4));o+=sfx(px,py-52,'SPLASH',12,-6,'#cfe0ea');}
  if(t>2.6&&t<2.95)o+=sfx(px-34,py-18,'bump',9,-6,'#fff');
  if(t>3.4&&t<3.8)o+=sfx(px-46,py-14,'plunk',9,-6,'#fff');
  if(t>7.5&&t<8.1)o+=sfx(edge[0]-6,edge[1]-14,'flip flop',8,-6,'#fff');
  if(t>8.5&&t<8.9)o+=sfx(px+PIKE_X-4,POND.surf-38,'CHOMP',13,-8,'#f4c430',1+.15*Math.sin(t*40));
  if(t>8.72&&t<9.2)o+=sfx(px+PIKE_X-4,POND.surf-14,'SPLASH',11,-6,'#cfe0ea');
  return{s,o,B,F};}};

/* ================= 6. Late Croak (three wood frogs and the bearded worker) ================= */
const FROGS=[{x:PUD2.x-30,f:1,s:.95,on:.4},{x:PUD2.x-1,f:1,s:.95,on:.8},{x:PUD2.x+30,f:-1,s:.78,on:1.2}];
const CROAKS=[[1.8,2.7,3.6],[2.1,3.0,3.9],[2.4,3.3,4.2]];
BALD.frogs = { name:'Late Croak', dur:10.8, still:7.8,
 beats:[[0,'the-puddle-ripples','The puddle ripples.'],[0.4,'blup-blup-blup','Blup. Blup. Blup. Three wood frogs pop up.'],[1.8,'they-sing-in','They sing in a round. Crick, crick, creek.'],[4.4,'the-bearded-worker','The bearded worker walks in.'],[4.9,'silence-three-frogs','Silence. Three frogs, frozen.'],[5.5,'he-stops-looks','He stops. Looks down at the puddle. Hmm.'],[6.3,'shrugs-walks-on','Shrugs. Walks on.'],[7.6,'the-little-one','The little one lets out one late CREEK.'],[8.0,'the-other-two','The other two turn and glare at him.'],[8.7,'all-three-sink','All three sink out of sight. Blup blup blup.']],
 frontY:PUD2.y+5,
 lead:E=>0, tail:E=>Math.max(0,8.6+E/FR_OUT-10.6),
 wx(t){if(t<4.4)return 430+FR_IN*(4.4-t);if(t<5.5)return kf(t,[[4.4,430],[5.5,PUD2.x+10,'out']]);if(t<6.6)return PUD2.x+10;return t>8.6?-45-FR_OUT*(t-8.6):kf(t,[[6.6,PUD2.x+10],[8.6,-45,'in']]);},
 _focus(t){if(t>4.4&&t<6.8)return{x:clamp((this.wx(t)+PUD2.x)/2,40,350),y:146};return{x:PUD2.x,y:152};},
 _draw(t,E=0){
  let s='',o='',B='',F='';
  // the worker walks the lane behind the puddle
  const w=this.wx(t);
  if(w>-50-E&&w<440+E){let q={x:w,face:-1,...BEARD,eye:'n',mouth:'smile'};
   if(t<5.5){Object.assign(q,walk(w/8,20));q.eye='happy';}
   else if(t<6.3){q.px=1;q.py=2.5;q.brow=4;q.mouth='flat';q.eye=inr(t,5.9,6.0)?'closed':'n';q.headRot=inr(t,5.6,6.2)?4*Math.sin((t-5.6)*14):0;}
   else if(t<6.6){const b=Math.sin(Math.PI*seg(t,6.3,6.6));q.armF=-40*b;q.armB=-40*b;q.bob=-2*b;q.mouth='flat';}
   else{Object.assign(q,walk(w/8,20));q.eye='happy';q.mouth='o';}
   s+=worker(q);}
  // frogs, cut off at the water's surface
  const surf=PUD2.y+1;
  let fr='';
  FROGS.forEach((G,i)=>{
   let rise=t<G.on?0:es(t,G.on,G.on+.25);
   const sinkAt=8.7+i*.2;if(t>=sinkAt)rise=1-es(t,sinkAt,sinkAt+.3);
   if(rise<=0)return;
   let q={x:G.x,y:surf+3+26*(1-rise),s:G.s,face:G.f,eye:'n'};
   if(t<4.9){let sac=0;CROAKS[i].forEach(a=>{if(t>=a&&t<a+.36)sac=Math.sin(Math.PI*seg(t,a,a+.36));});q.sac=sac;q.eye=sac>.2?'closed':'n';}
   else if(t<7.6){q.eye='wide';q.px=(w-G.x)>0?1.2*G.f:-1.2*G.f;if(t>6.6)q.px=-1.4*G.f;}
   else if(t<8.0){if(i===2){q.sac=1.4*Math.sin(Math.PI*seg(t,7.6,8.0));q.eye='closed';}else{q.eye='n';}}
   else{if(i===2){q.eye='wide';q.blush=.9;q.sq=.08;}else{q.eye='half';q.px=1.8;}}
   fr+=frog(q);});
  F+=`<clipPath id="pudclip"><rect x="-900" y="-200" width="2400" height="${surf+200}"/></clipPath><g clip-path="url(#pudclip)">${fr}</g>`;
  F+=`<path d="M${PUD2.x-38} ${surf} h76" stroke="#a2a996" stroke-width="1.4" stroke-linecap="round"/>`;
  FROGS.forEach((G,i)=>{F+=ripple(G.x,surf,seg(t,G.on,G.on+.6),7)+ripple(G.x,surf,seg(t,8.7+i*.2,9.4+i*.2),8);});
  F+=ripple(PUD2.x,surf,seg(t,0,.5),10);
  // notes and sound words
  if(t<4.9)FROGS.forEach((G,i)=>CROAKS[i].forEach(a=>{if(t>=a&&t<a+.8){const k=seg(t,a,a+.8);o+=note(G.x+4*G.f+6*k,surf-24-k*20,1-k);if(k<.3)o+=sfx(G.x+G.f*6,surf-34-i*7,i===2?'creek':'crick',8,-6,'#fff');}}));
  if(t>=7.6&&t<8.1){const k=seg(t,7.6,8.1);o+=sfx(FROGS[2].x+8,surf-38-6*k,'CREEK',11,6,'#f4c430',1+.1*Math.sin(t*40));}
  [8.7,8.9,9.1].forEach((a,i)=>{if(t>=a&&t<a+.35)o+=sfx(FROGS[i].x,surf-14,'blup',8,-6,'#fff');});
  return{s,o,B,F};}};

/* ================= 7. Lunch to Go (Slow Moe and the first mosquito of spring) ================= */
const LG_X=262, KIT_SPOT=[LG_X+18,GY];
BALD.mosquito = { name:'Lunch to Go', dur:8.0, still:4.9,
 beats:[[0,'slow-moe-walks','Slow Moe walks in with his lunch kit.'],[1.8,'sets-it-down','Sets it down. Rubs his hands. Lunch time.'],[2.8,'bzzz-a-big','BZZZ. A big mosquito flies in...'],[3.5,'and-lands-on','...and lands on the lunch kit. Moe smirks.'],[3.9,'it-grabs-the','It grabs the handle. Strains. bzzZZZ.'],[4.5,'the-lunch-kit','The lunch kit lifts off the ground.'],[4.7,'moes-smirk-drops','Moe’s smirk drops.'],[5.1,'it-flies-off','It flies off with his lunch. “Hey!”'],[5.6,'moe-chases-after','Moe chases after it.']],
 lead:E=>E/MQ_IN, tail:E=>E/MQ_OUT,
 lines:[{key:'hey',from:5.1,to:6.0,mouth(t){return{x:BALD.mosquito.mx(t)+10,y:GY-60};}}],
 mx(t){if(t<0)return -40+MQ_IN*t;if(t<1.8)return kf(t,[[0,-40],[1.8,LG_X,'out']]);if(t<5.6)return LG_X;return t>7.6?445+MQ_OUT*(t-7.6):kf(t,[[5.6,LG_X],[7.6,445,'in']]);},
 bug(t,E=0){const L=[KIT_SPOT[0],GY-19];
  if(t<2.8)return null;
  if(t<3.5){const k=seg(t,2.8,3.5);return{x:lerp(420+E,L[0],io(k))+5*Math.sin(t*20),y:lerp(60,L[1],io(k))+5*Math.sin(t*13)*(1-k),f:-1,carry:false};}
  if(t<3.9)return{x:L[0],y:L[1],f:-1,carry:false};
  if(t<4.5)return{x:L[0]+.6*Math.sin(t*70),y:L[1]-1.2*Math.abs(Math.sin(t*30)),f:-1,carry:true,strain:true};
  if(t<5.1){const k=es(t,4.5,5.1);return{x:L[0]+3*k,y:lerp(L[1],GY-44,k)+1.5*Math.sin(t*14),f:1,carry:true,strain:true};}
  const k=seg(t,5.1,7.5);return{x:lerp(L[0]+3,450+E,k),y:GY-44-12*k+3*Math.sin(t*9),f:1,carry:true};},
 _focus(t){if(t<5.6)return{x:clamp(this.mx(t)+14,40,350),y:120};return{x:clamp(this.mx(t)+40,40,350),y:116};},
 _draw(t,E=0){
  let s='',o='',B='',F='';
  const x=this.mx(t);
  let p={x,face:1,...MOE,eye:'n',mouth:'smile',handB:KIT};
  const kitDown=t>=2.0;
  if(kitDown)p.handB='';
  const b=this.bug(t,E);
  if(t<1.8){Object.assign(p,walk(x/8,22));p.eye='happy';}
  else if(t<2.3){const k=Math.sin(Math.PI*seg(t,1.8,2.3));p.lean=26*k;p.bob=10*k;p.armB=-30*k;if(t<2.0)p.handB=KIT;p.eye='happy';}
  else if(t<2.8){const r=Math.sin((t-2.3)*30);p.armF=-72+8*r;p.armB=-72-8*r;p.eye='happy';p.mouth='grin';}
  else if(t<3.5){p.armF=-30;p.armB=-20;if(b){p.px=clamp((b.x-x)/14,-2.5,2.5);p.py=clamp((b.y-(GY-52))/14,-2.5,2.5);}p.mouth='o';}
  else if(t<4.6){p.eye='half';p.mouth='smile';p.px=1.8;p.py=2.4;p.armF=-10;p.armB=10;p.brow=-1;if(t>3.9)p.bob=-1*Math.abs(Math.sin(t*12));}
  else if(t<5.1){p.eye='wide';p.mouth='O';if(b){p.px=clamp((b.x-x)/14,-2.5,2.5);p.py=clamp((b.y-(GY-52))/14,-2.5,2.5);}}
  else if(t<5.35){p.armF=kf(t,[[5.1,0],[5.2,-100]]);p.eye='wide';p.mouth='O';p.px=2.5;p.py=-1;}
  else if(t<5.6){const k=Math.sin(Math.PI*seg(t,5.35,5.6));p.armF=-100+60*k;p.bob=5*k;p.lean=-6*k;p.eye='wide';p.mouth='grit';}
  else{Object.assign(p,walk(x/6,44));p.lean=18;p.eye='wide';p.mouth='O';p.hatLift=3*Math.abs(Math.sin(x/6));p.armF=-60+40*Math.sin(x/6);p.armB=-60-40*Math.sin(x/6);}
  // the lunch kit: on the ground, then dangling from the mosquito
  if(kitDown&&!(b&&b.carry&&t>=4.5))s+=kitW(KIT_SPOT[0]+(b&&b.strain?.5*Math.sin(t*70):0),KIT_SPOT[1]);
  s+=worker(p);
  if(b){if(b.carry&&t>=4.5){const sw2=t<5.1?3*Math.sin(t*10):8*Math.sin(t*6);s+=`<g transform="rotate(${r2(sw2)} ${r2(b.x)} ${r2(b.y+4)})">${kitW(b.x,b.y+20)}</g>`;}
   s+=mosquito(b.x,b.y,b.f,b.strain?t*1.8:t);}
  if(t>=5.6){s+='<g data-fx="dust">';for(let k=1;k<4;k++)s+=puff(x-12-k*9,GY-3-k*2,3+k,(1-k/4)*.6);s+='</g>';}
  if(t>2.8&&t<3.5)o+=sfx(360+E*.6,70,'BZZZ',10,-6,'#fff',1+.08*Math.sin(t*50));
  if(t>3.95&&t<4.9)o+=sfx(KIT_SPOT[0]+22,GY-40-(t-3.95)*8,'bzzZZZ',9+3*seg(t,3.95,4.9),-6,'#fff',1+.1*Math.sin(t*60));
  return{s,o,B,F};}};


// Each gag draws all its lanes in one pass (as the page does); the stage asks for them one at a time.
for (const g of Object.values(BALD)) {
  let key = '', val = null;
  const all = (t, E = 0) => { const k = t + '|' + E; if (k !== key) { val = g._draw(t, E); key = k; } return val; };
  g.render = g.onPond ? () => '' : (t, E) => all(t, E).s;
  // (Last Ice is all on the pond: what the page draws in one picture is the back lane's here.)
  if (g.onPond) g.back = (t, E) => all(t, E).s;
  else if (g.backY !== undefined) g.back = (t, E) => all(t, E).B;
  if (g.frontY !== undefined) g.front = (t, E) => all(t, E).F;
  g.over = (t, E) => all(t, E).o;
}

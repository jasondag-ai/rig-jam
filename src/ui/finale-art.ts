// @ts-nocheck
// THE FINALE'S ART (October upgrade, job U9), ported from `~/Desktop/RHR Art Inbox/finale_reference.html` (saved
// Oct 10 01:38). THIS FILE IS WRITTEN BY `python3 tools/port-finale.py`: change the art there and run it again.
// Copied as written: the crew photo's FRONT-VIEW puppets and the photo itself (`photoFront`: what the camera saw, the
// one place in the game where anybody faces us), the crew in the strip and its timing (`crew`, `moeP2`, `birdP2`), the
// tripod, the splat on Moe's hat (rule 8's one exception: Jay, Oct 10), the Polaroid, and Still Here (Moe in his
// robe at the biffy: `stinger`). The side-view puppets are the game's own: wave3.ts's worker and animals,
// bald-gags.ts's crane, bison, hare, frog and magpie, bear.ts's bear, biffy.ts's biffy and its door.
// CHANGED FROM THE PAGE: `crew` gives its rows one at a time (back, mid, front: each a lane with its own ground line,
// and the magpie over them all); the magpie flies in from beyond a wider screen's edge (`E`); every line is said in
// the game's own bubble, not drawn. The page's mock phone, its card and its cover are not here: the game has its own.
import { GY, OL, C, sfx, r2, rng, w3worker as worker, clamp, seg, io, es, inr, lerp, hop, kf, sw, mix, walk, hardHat, MOE, BEARD, THUMB, beaver, coyote, pdog } from './wave3.ts';
import { crane, bison, hare, frog, magpie } from './bald-gags.ts';
import { BEAR } from './bear.ts';
import { biffy as biffyMarkup, DOOR } from './biffy.ts';

function aspen(x,b,h,la='#e1a838',lb='#f3cb5f'){const tr=`<rect x="${r2(x-3.5)}" y="${r2(b-h*.62)}" width="7" height="${r2(h*.62)}" rx="2" fill="#ece6da" ${sw(2.2)}/><path d="M${r2(x-2)} ${r2(b-h*.2)} h3 M${r2(x)} ${r2(b-h*.34)} h2.4 M${r2(x-2)} ${r2(b-h*.46)} h2" stroke="${OL}" stroke-width="1.6"/>`;
 const cs=[[0,-.84,.17],[-.13,-.7,.15],[.13,-.72,.15],[0,-.62,.14]].map(([dx,dy,r])=>[x+dx*h,b+dy*h,r*h]);
 return tr+cs.map(([cx,cy,r])=>`<circle cx="${r2(cx)}" cy="${r2(cy)}" r="${r2(r)}" fill="${OL}" stroke="${OL}" stroke-width="5"/>`).join('')+cs.map(([cx,cy,r])=>`<circle cx="${r2(cx)}" cy="${r2(cy)}" r="${r2(r)}" fill="${la}"/>`).join('')+cs.map(([cx,cy,r])=>`<circle cx="${r2(cx-r*.28)}" cy="${r2(cy-r*.3)}" r="${r2(r*.5)}" fill="${lb}"/>`).join('');}
function spruce(x,b,h,ca='#2f5b3e',cb='#3e7350'){let s=`<rect x="${r2(x-3)}" y="${r2(b-h*.18)}" width="6" height="${r2(h*.18)}" fill="#6b4a30" ${sw(2)}/>`;
 [[.14,.46,.34],[.36,.7,.27],[.56,1,.19]].forEach(([bf,tf,wf])=>{const yb=b-h*bf,yt=b-h*tf,w=h*wf;s+=`<path d="M${r2(x-w)} ${r2(yb)} L${r2(x)} ${r2(yt)} L${r2(x+w)} ${r2(yb)} Q${r2(x)} ${r2(yb+4)} ${r2(x-w)} ${r2(yb)} z" fill="${ca}" ${sw(2.4)}/><path d="M${r2(x-w*.5)} ${r2(yb-2)} L${r2(x-1)} ${r2(yt+7)} L${r2(x-1)} ${r2(yb)} z" fill="${cb}"/>`;});return s;}
function bush(x,b,s=1,ca='#6f8a3e',cb='#8ea956'){const cs=[[-9,-8,9],[0,-13,10],[9,-8,9]].map(([dx,dy,r])=>[x+dx*s,b+dy*s,r*s]);return cs.map(([cx,cy,r])=>`<circle cx="${r2(cx)}" cy="${r2(cy)}" r="${r2(r)}" fill="${OL}" stroke="${OL}" stroke-width="5"/>`).join('')+cs.map(([cx,cy,r])=>`<circle cx="${r2(cx)}" cy="${r2(cy)}" r="${r2(r)}" fill="${ca}"/>`).join('')+cs.map(([cx,cy,r])=>`<circle cx="${r2(cx-r*.3)}" cy="${r2(cy-r*.3)}" r="${r2(r*.45)}" fill="${cb}"/>`).join('');}
/* ================= THE CREW PHOTO, FROM THE CAMERA (front view) =================
   The Polaroid shows what the camera saw: everyone facing us. A still, drawn once in the same flat toy look
   (flat fills, one dark outline, light from the top left). Photo units: 300 x 134. */
const FW={skin:C.skin,skinD:C.skinD};
function fHardHat(c,lift=0,tip=0){ // front view of a hard hat; tip > 0 = tipped back (we see under the brim)
 const y=-109-lift;let s=`<g transform="translate(0 ${r2(y)})">`;
 if(tip>0)s+=`<ellipse cx="0" cy="${r2(-1-tip)}" rx="21" ry="${r2(3.6+tip*.6)}" fill="${mix(c,'#000000',.28)}" ${sw(2.2)}/>`;
 s+=`<path d="M-17 ${r2(-tip)} a17 17 0 0 1 34 0 z" fill="${c}" ${sw(2.6)}/><path d="M0 ${r2(-16-tip)} V${r2(-1-tip)}" stroke="${OL}" stroke-width="1.6" opacity=".4"/><path d="M-11 ${r2(-9-tip)} q4 -5 9 -6" stroke="#ffffff" stroke-width="2.6" fill="none" stroke-linecap="round" opacity=".55"/>`;
 if(tip<=0)s+=`<ellipse cx="0" cy="0" rx="21" ry="3.6" fill="${c}" ${sw(2.2)}/>`;
 return s+`</g>`;}
function fToque(){return`<g transform="translate(0 -110)"><path d="M-13 2 V-8 Q-23 -10 -20 -20 Q-17 -29 -8 -26 Q-4 -36 5 -32 Q14 -37 17 -27 Q26 -24 22 -14 Q20 -9 13 -8 V2 z" fill="#fbfaf6" ${sw(2.4)}/><path d="M-13 -3 H13" stroke="#ddd7ca" stroke-width="3"/></g>`;}
function fCowHat(){return`<g transform="translate(0 -110)"><ellipse cx="0" cy="1" rx="27" ry="5" fill="${C.cowboy}" ${sw(2.4)}/><path d="M-13 0 v-14 q6 -6 13 -2 q7 -4 13 2 v14 z" fill="${C.cowboy}" ${sw(2.4)}/><rect x="-13" y="-5" width="26" height="3.6" fill="#5b3a21"/></g>`;}
function fworker(o){
 o=Object.assign({x:0,y:0,s:.52,suit:[C.red,C.redD],legs:null,glove:C.glove,hat:'hard',hatC:C.hat,hatLift:0,hatTip:0,eye:'n',pupY:0,pupX:0,mouth:'smile',brow:0,glasses:true,beard:false,stubble:false,tache:false,droop:false,vest:false,apron:false,plaid:false,shirt:false,armL:'down',armR:'down',hatItem:'',plain:false},o);
 const S=o.suit,L=o.legs||S;let s='';
 // legs and boots
 const leg=(x,c)=>`<rect x="${x-4.6}" y="-42" width="9.2" height="36" rx="3.6" fill="${c}" ${sw(2.4)}/>${(o.legs)?'':`<rect x="${x-3.6}" y="-24" width="7.2" height="3" fill="${C.stripe}"/>`}<path d="M${x-6} -8 h12 a2 2 0 0 1 2 2 v6 h-16 v-6 a2 2 0 0 1 2 -2 z" fill="${C.boot}" ${sw(2.2)}/>`;
 s+=leg(-6.5,L[1])+leg(6.5,L[0]);
 // arms
 const arm=(side,pose)=>{const x=side*20;const c=side<0?S[1]:S[0];
  if(pose==='thumb')return`<path d="M${x} -74 L${x+side*6} -54 L${x+side*1} -66" fill="none" stroke="${OL}" stroke-width="10.5" stroke-linecap="round" stroke-linejoin="round"/><path d="M${x} -74 L${x+side*6} -54 L${x+side*1} -66" fill="none" stroke="${c}" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"/><circle cx="${x+side*1}" cy="-68" r="5" fill="${o.glove}" ${sw(2)}/><rect x="${x+side*1-2}" y="-79" width="4.4" height="9" rx="2.2" fill="${o.glove}" ${sw(1.6)}/>`;
  if(pose==='mug')return`<path d="M${x} -74 L${x+side*3} -56 L${x-side*6} -60" fill="none" stroke="${OL}" stroke-width="10.5" stroke-linecap="round" stroke-linejoin="round"/><path d="M${x} -74 L${x+side*3} -56 L${x-side*6} -60" fill="none" stroke="${c}" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"/><g transform="translate(${x-side*9} -66)"><rect x="-5" y="-6" width="10" height="12" rx="2" fill="#f4f1ea" ${sw(1.8)}/><path d="M${side*5} -3 q${side*4} 0 ${side*4} 3 q0 3 ${-side*4} 3" fill="none" ${sw(1.6)}/></g><circle cx="${x-side*5}" cy="-60" r="4.6" fill="${o.glove}" ${sw(1.8)}/>`;
  if(pose==='clip')return`<path d="M${x} -74 L${x+side*2} -56" fill="none" stroke="${OL}" stroke-width="10.5" stroke-linecap="round"/><path d="M${x} -74 L${x+side*2} -56" fill="none" stroke="${c}" stroke-width="7" stroke-linecap="round"/><g transform="translate(${x+side*1} -58) rotate(${side*-8})"><rect x="-7" y="-10" width="14" height="18" rx="1.6" fill="#a8743f" ${sw(1.8)}/><rect x="-4.6" y="-7" width="9.2" height="12" fill="#fbfaf6"/></g><circle cx="${x+side*2}" cy="-53" r="4.6" fill="${o.glove}" ${sw(1.8)}/>`;
  if(pose==='wave')return`<path d="M${x} -74 L${x+side*10} -88 L${x+side*12} -104" fill="none" stroke="${OL}" stroke-width="10.5" stroke-linecap="round" stroke-linejoin="round"/><path d="M${x} -74 L${x+side*10} -88 L${x+side*12} -104" fill="none" stroke="${c}" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"/><circle cx="${x+side*12}" cy="-106" r="5" fill="${o.glove}" ${sw(1.8)}/>`;
  return`<rect x="${x-4.6}" y="-77" width="9.2" height="30" rx="4.6" fill="${c}" ${sw(2.4)}/><circle cx="${x}" cy="-46" r="5" fill="${o.glove}" ${sw(2)}/>`;};
 s+=arm(-1,o.armL);
 // torso
 s+=`<rect x="-17" y="-80" width="34" height="44" rx="10" fill="${S[0]}"/>`;
 if(o.plaid)s+=`<path d="M-8 -79V-37M8 -79V-37M-16 -66H16M-16 -51H16" stroke="#7d2219" stroke-width="2.2" opacity=".75"/>`;
 if(o.shirt)s+=`<path d="M-7 -80 L0 -71 L7 -80" fill="#fbfbf7" ${sw(1.6)}/><path d="M0 -71 V-38" stroke="${S[1]}" stroke-width="1.6"/><circle cx="0" cy="-62" r="1" fill="${S[1]}"/><circle cx="0" cy="-52" r="1" fill="${S[1]}"/>`;
 if(o.apron)s+=`<path d="M-11 -66 H11 V-34 H-11 z" fill="#fbfaf6" stroke="${OL}" stroke-width="1.6"/><path d="M-11 -66 L-14 -79 M11 -66 L14 -79" stroke="${OL}" stroke-width="1.4"/>`;
 if(!o.plaid&&!o.shirt&&!o.apron&&!o.plain)s+=`<path d="M0 -79 V-37" stroke="${S[1]}" stroke-width="1.6"/><rect x="-16" y="-56" width="32" height="3.4" fill="${C.stripe}"/><rect x="4" y="-73" width="6" height="7" rx="1.4" fill="#f08a24" stroke="${OL}" stroke-width="1.4"/>`;
 if(o.vest)s+=`<path d="M-17 -78 H-5 V-38 H-17 Z M5 -78 H17 V-38 H5 Z" fill="#c8e63a"/><path d="M-17 -62 H-5 M5 -62 H17 M-17 -50 H-5 M5 -50 H17" stroke="#e9ecef" stroke-width="3"/>`;
 s+=`<rect x="-17" y="-80" width="34" height="44" rx="10" fill="none" ${sw(2.6)}/>`;
 s+=arm(1,o.armR);
 // head
 const hy=-97;
 s+=`<circle cx="-17" cy="${hy+1}" r="4" fill="${FW.skin}" ${sw(2)}/><circle cx="17" cy="${hy+1}" r="4" fill="${FW.skin}" ${sw(2)}/><circle cx="0" cy="${hy}" r="17" fill="${FW.skin}" ${sw(2.6)}/>`;
 if(o.stubble)s+=`<path d="M-13 ${hy+5} Q-12 ${hy+16} 0 ${hy+17} Q12 ${hy+16} 13 ${hy+5} Q0 ${hy+12} -13 ${hy+5} z" fill="#9c7656" opacity=".5"/>`;
 if(o.beard)s+=`<path d="M-16 ${hy+1} Q-15 ${hy+22} 0 ${hy+24} Q15 ${hy+22} 16 ${hy+1} Q11 ${hy+12} 6 ${hy+10} Q0 ${hy+8} -6 ${hy+10} Q-11 ${hy+12} -16 ${hy+1} z" fill="#7a4f2e" ${sw(1.8)}/>`;
 // eyes
 const eye=(ex)=>{if(o.eye==='happy')return`<path d="M${ex-4} ${hy-1} q4 -5 8 0" fill="none" ${sw(2.2)}/>`;
  const wide=o.eye==='wide',r=wide?5.6:4.4;let e=`<circle cx="${ex}" cy="${hy-2}" r="${r}" fill="#fff" ${sw(1.8)}/><circle cx="${r2(ex+o.pupX)}" cy="${r2(hy-2+o.pupY)}" r="${wide?2:2.4}" fill="${OL}"/>`;
  if(o.droop)e+=`<path d="M${r2(ex-r-.3)} ${hy-2} a${r2(r+.3)} ${r2(r+.3)} 0 0 1 ${r2(2*r+.6)} 0 z" fill="${FW.skin}" ${sw(1.6)}/>`;return e;};
 s+=eye(-6.5)+eye(6.5);
 if(o.glasses)s+=`<rect x="-13" y="${hy-8}" width="12" height="11" rx="4" fill="none" stroke="${OL}" stroke-width="1.3" opacity=".85"/><rect x="1" y="${hy-8}" width="12" height="11" rx="4" fill="none" stroke="${OL}" stroke-width="1.3" opacity=".85"/><path d="M-1 ${hy-4} H1" stroke="${OL}" stroke-width="1.3"/>`;
 s+=`<path d="M-11 ${hy-10+o.brow} q4 -2.4 8 -1 M3 ${hy-11} q4 -1.4 8 1" fill="none" stroke="${OL}" stroke-width="2" stroke-linecap="round"/>`;
 s+=`<circle cx="0" cy="${hy+3}" r="3" fill="${FW.skinD}" ${sw(1.6)}/>`;
 if(o.tache)s+=`<path d="M-8 ${hy+7} q4 -3 8 -1 q4 -2 8 1 q1 3 -3 3 q-3 -1.6 -5 -.4 q-2 -1.2 -5 .4 q-4 0 -3 -3 z" fill="${o.tacheC||'#ddd6ca'}" ${sw(1.4)}/>`;
 const my=hy+10;
 const M={smile:`<path d="M-5 ${my} q5 4.4 10 0" fill="none" ${sw(2)}/>`,grin:`<path d="M-7 ${my-1} q7 9 14 0 z" fill="#6b2a20" ${sw(1.8)}/><path d="M-5.6 ${my} h11.2" stroke="#fff" stroke-width="1.6"/>`,
  grit:`<rect x="-7" y="${my-3}" width="14" height="6.4" rx="2" fill="#fff" ${sw(1.8)}/><path d="M-2.4 ${my-3} v6.4 M2.4 ${my-3} v6.4" stroke="${OL}" stroke-width="1.2"/>`};
 s+=M[o.mouth]||'';
 // hat
 s+=o.hat==='toque'?fToque():o.hat==='cowboy'?fCowHat():fHardHat(o.hatC,o.hatLift,o.hatTip);
 s+=o.hatItem;
 return`<g transform="translate(${r2(o.x)} ${r2(o.y)}) scale(${o.s})">${s}</g>`;}

/* front-view animals, feet at (x,y) */
function fBison(x,y,s=1){const F='#7a5232',FD='#4c3020',FM='#3d2617',FL='#946640',HORN='#2d2824';
 return`<g transform="translate(${x} ${y}) scale(${s})"><ellipse cx="0" cy="-22" rx="40" ry="22" fill="${FD}" ${sw(2.6)}/><path d="M-30 -30 q8 -14 30 -16 q22 2 30 16" fill="none" stroke="${F}" stroke-width="5" stroke-linecap="round" opacity=".7"/>`+
  `<path d="M-14 -36 q-12 -2 -15 -12 q-1 -5 3 -6 q2 6 9 7" fill="#e9e1cf" ${sw(2)}/><path d="M14 -36 q12 -2 15 -12 q1 -5 -3 -6 q-2 6 -9 7" fill="#e9e1cf" ${sw(2)}/>`+
  `<path d="M-17 -38 Q-20 -22 -12 -8 Q0 2 12 -8 Q20 -22 17 -38 Q0 -48 -17 -38 z" fill="${FM}" ${sw(2.6)}/><path d="M-15 -36 Q0 -46 15 -36 Q8 -30 0 -32 Q-8 -30 -15 -36 z" fill="${F}"/>`+
  `<path d="M-8 -6 Q0 6 8 -6 Q4 2 0 2 Q-4 2 -8 -6 z" fill="${FM}" ${sw(1.6)}/>`+
  `<ellipse cx="0" cy="-13" rx="8" ry="6" fill="${FL}" ${sw(1.8)}/><circle cx="-3" cy="-13" r="1.5" fill="${OL}"/><circle cx="3" cy="-13" r="1.5" fill="${OL}"/><path d="M-4 -8.6 q4 3 8 0" fill="none" ${sw(1.4)}/>`+
  `<path d="M-11 -27 q3 -3 6 0 M5 -27 q3 -3 6 0" fill="none" ${sw(1.8)}/></g>`;}
function fCrane(x,y,s=1){const G='#a7adb2',GD='#878e95';
 return`<g transform="translate(${x} ${y}) scale(${s})"><path d="M-4 -50 L-5 -1 M4 -50 L5 -1 M-9 0 h7 M2 0 h7" fill="none" stroke="${OL}" stroke-width="3.6" stroke-linecap="round"/><path d="M-4 -50 L-5 -1 M4 -50 L5 -1" fill="none" stroke="#3e3a36" stroke-width="1.6" stroke-linecap="round"/>`+
  `<path d="M-14 -54 Q-16 -76 0 -80 Q16 -76 14 -54 Q8 -44 0 -44 Q-8 -44 -14 -54 z" fill="${G}" ${sw(2.4)}/><path d="M-13 -58 q-5 6 -3 14 M13 -58 q5 6 3 14" fill="none" stroke="${GD}" stroke-width="3" stroke-linecap="round"/><path d="M-6 -74 q6 -3 12 0" stroke="#b08a63" stroke-width="3" fill="none" stroke-linecap="round"/>`+
  `<path d="M-2.6 -80 Q-3 -96 -1 -104 M2.6 -80 Q3 -96 1 -104" fill="${G}" stroke="${OL}" stroke-width="2"/><rect x="-2.4" y="-104" width="4.8" height="25" fill="${G}"/>`+
  `<circle cx="0" cy="-110" r="7.4" fill="${G}" ${sw(2.2)}/><path d="M-5 -115 q5 -5 10 0 q-5 2 -10 0 z" fill="#c8392b" ${sw(1.4)}/><circle cx="-3.4" cy="-111" r="2.4" fill="#fff" ${sw(1.2)}/><circle cx="3.4" cy="-111" r="2.4" fill="#fff" ${sw(1.2)}/><circle cx="-3.2" cy="-110.6" r="1.2" fill="${OL}"/><circle cx="3.2" cy="-110.6" r="1.2" fill="${OL}"/><path d="M-1.8 -107.6 L0 -103 L1.8 -107.6 z" fill="#3e3a36" ${sw(1.2)}/></g>`;}
function fCoyote(x,y,s=1){const c='#b9976a',cl='#e8d8b6',cd='#8d7150';
 return`<g transform="translate(${x} ${y}) scale(${s})"><path d="M-14 0 Q-16 -20 -8 -30 L8 -30 Q16 -20 14 0 z" fill="${c}" ${sw(2.4)}/><path d="M-6 0 Q-7 -16 0 -24 Q7 -16 6 0 z" fill="${cl}"/><path d="M-9 0 V-12 M9 0 V-12" stroke="${cd}" stroke-width="2.4"/>`+
  `<path d="M-13 -36 L-15 -54 L-5 -44 z M13 -36 L15 -54 L5 -44 z" fill="${c}" ${sw(2.2)}/><path d="M-12 -40 L-13 -50 L-7 -44 z M12 -40 L13 -50 L7 -44 z" fill="#e8b9a8"/>`+
  `<path d="M-13 -40 Q-14 -28 -6 -24 L0 -18 L6 -24 Q14 -28 13 -40 Q0 -48 -13 -40 z" fill="${c}" ${sw(2.4)}/><path d="M-5 -30 L0 -20 L5 -30 Q0 -32 -5 -30 z" fill="${cl}"/><ellipse cx="0" cy="-22" rx="2.6" ry="2" fill="${OL}"/>`+
  `<circle cx="-5.4" cy="-35" r="2.6" fill="#fff" ${sw(1.2)}/><circle cx="5.4" cy="-35" r="2.6" fill="#fff" ${sw(1.2)}/><circle cx="-5.2" cy="-34.6" r="1.4" fill="${OL}"/><circle cx="5.2" cy="-34.6" r="1.4" fill="${OL}"/><path d="M-2 -18 q2 4 4 0" fill="#e07a6c" ${sw(1)}/></g>`;}
function fHare(x,y,s=1){const BR='#8d6b45',WH='#f6f5f0';
 return`<g transform="translate(${x} ${y}) scale(${s})"><ellipse cx="0" cy="-10" rx="11" ry="11" fill="${BR}" ${sw(2.2)}/><ellipse cx="0" cy="-7" rx="6" ry="7" fill="${WH}"/>`+
  `<ellipse cx="-4.6" cy="-36" rx="3.4" ry="11" fill="${BR}" ${sw(1.8)} transform="rotate(-10 -4.6 -28)"/><ellipse cx="4.6" cy="-36" rx="3.4" ry="11" fill="${BR}" ${sw(1.8)} transform="rotate(10 4.6 -28)"/><path d="M-7.6 -45 q2.6 -4 5 0 M2.6 -45 q2.6 -4 5 0" fill="#2b241e"/>`+
  `<circle cx="0" cy="-24" r="9" fill="${BR}" ${sw(2.2)}/><ellipse cx="0" cy="-20" rx="5" ry="3.6" fill="${WH}"/><circle cx="-3.6" cy="-26" r="2" fill="${OL}"/><circle cx="3.6" cy="-26" r="2" fill="${OL}"/><ellipse cx="0" cy="-21.6" rx="1.6" ry="1.2" fill="#e98f9a"/><path d="M-2 -19.6 q2 1.6 4 0" fill="none" stroke="${OL}" stroke-width="1"/><path d="M-4 -21 L-10 -22 M4 -21 L10 -22" stroke="${OL}" stroke-width=".7"/></g>`;}
function fBeaver(x,y,s=1){const c='#7c5130',cd='#5f3c22',cl='#b2835a';
 return`<g transform="translate(${x} ${y}) scale(${s})"><ellipse cx="13" cy="-4" rx="9" ry="5" fill="#4a3426" ${sw(1.8)} transform="rotate(-20 13 -4)"/><ellipse cx="0" cy="-12" rx="12" ry="13" fill="${c}" ${sw(2.2)}/><ellipse cx="0" cy="-9" rx="7" ry="8" fill="${cl}"/>`+
  `<circle cx="-8" cy="-32" r="3" fill="${cd}" ${sw(1.6)}/><circle cx="8" cy="-32" r="3" fill="${cd}" ${sw(1.6)}/><circle cx="0" cy="-25" r="10" fill="${c}" ${sw(2.2)}/><ellipse cx="0" cy="-20" rx="5.6" ry="4" fill="${cl}"/>`+
  `<circle cx="-3.8" cy="-27.6" r="2" fill="${OL}"/><circle cx="3.8" cy="-27.6" r="2" fill="${OL}"/><ellipse cx="0" cy="-22.4" rx="2.2" ry="1.5" fill="${OL}"/><rect x="-2.6" y="-19.6" width="5.2" height="5.4" rx="1" fill="#f0a23a" ${sw(1.2)}/><path d="M0 -19.6 V-14.2" stroke="${OL}" stroke-width="1"/></g>`;}
function fFrog(x,y,s=1){const F='#a67d4f',FD='#7d5a36',J='#efe3c4';
 return`<g transform="translate(${x} ${y}) scale(${s})"><ellipse cx="0" cy="-5" rx="10" ry="6" fill="${F}" ${sw(1.8)}/><ellipse cx="0" cy="-3" rx="6" ry="3" fill="${J}"/><circle cx="-5.4" cy="-10.6" r="3.4" fill="${F}" ${sw(1.6)}/><circle cx="5.4" cy="-10.6" r="3.4" fill="${F}" ${sw(1.6)}/><circle cx="-5.4" cy="-10.6" r="1.6" fill="${OL}"/><circle cx="5.4" cy="-10.6" r="1.6" fill="${OL}"/><path d="M-5 -5.4 q5 3 10 0" fill="none" stroke="${OL}" stroke-width="1.2"/><path d="M-8 0 l-3 1 M8 0 l3 1" stroke="${FD}" stroke-width="2" stroke-linecap="round"/></g>`;}
function fMagpie(x,y,s=1){ // sitting, facing us, feet at (x,y)
 return`<g transform="translate(${x} ${y}) scale(${s})"><path d="M4 -10 L16 -34 L20 -32 L9 -8 z" fill="#1d1c22" ${sw(1.8)}/><path d="M7 -12 L16 -30" stroke="#2f8f7a" stroke-width="2"/>`+
  `<path d="M-3 0 v-3 M3 0 v-3" stroke="${OL}" stroke-width="1.8" stroke-linecap="round"/><ellipse cx="0" cy="-9" rx="8" ry="8" fill="#1d1c22" ${sw(1.8)}/><ellipse cx="0" cy="-7" rx="5" ry="5.4" fill="#f7fafc"/><path d="M-8 -12 q-3 4 -1 9 M8 -12 q3 4 1 9" stroke="#245d8f" stroke-width="3" fill="none" stroke-linecap="round"/>`+
  `<circle cx="0" cy="-20" r="6.6" fill="#1d1c22" ${sw(1.8)}/><circle cx="-2.6" cy="-21" r="2.2" fill="#f7fafc"/><circle cx="2.6" cy="-21" r="2.2" fill="#f7fafc"/><circle cx="-2.4" cy="-20.6" r="1.1" fill="${OL}"/><circle cx="2.4" cy="-20.6" r="1.1" fill="${OL}"/><path d="M-1.8 -21.4 h3.6 v.8 h-3.6 z" fill="#1d1c22"/><path d="M-1.6 -18 L0 -14.6 L1.6 -18 z" fill="#555a66" ${sw(1)}/></g>`;}
function fSplat(){ // on the front of Moe's hard hat, in hat units (the dome's base at 0)
 return`<g transform="translate(-118 0)"></g>`;}
/* the photo itself: what the camera saw at the flash */
let FRONT=null;
function photoFront(){
 if(FRONT)return FRONT;
 let s=`<defs><linearGradient id="phSky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#7fb8e6"/><stop offset="1" stop-color="#cfe7f6"/></linearGradient></defs>`;
 s+=`<rect x="0" y="0" width="300" height="134" fill="#86b84f"/><rect x="0" y="0" width="300" height="46" fill="url(#phSky)"/><rect x="0" y="46" width="300" height="20" fill="#93c25a"/>`;
 // far trees, and the biffy back by the berm
 const R=rng(44);for(let x=-4;x<306;x+=9+R()*9){const h=12+R()*10;if(x>8&&x<34)continue;s+=R()<.65?spruce(x,50,h):aspen(x,50,h,'#6fa04a','#8cbc5c');}
 s+=`<g transform="translate(21 64) scale(.17) translate(-50 -134)">${biffyMarkup(false).replace('<g class="root">','<g>')}</g>`;
 // the two-track, seen end on: it runs away from the camera
 s+=`<path d="M120 66 L180 66 L250 134 L50 134 Z" fill="#c8ae7e" opacity=".55"/>`;
 // the same lineup the player saw in the strip (same order, same rows), now facing the camera.
 // strip x to photo x: 8 + (x - 20) * 0.916
 const P=x=>8+(x-20)*.916;
 // back row: the bear sitting up
 s+=bearSit(P(84),112,.56,{px:0,py:.6,near:{x:120,y:48},mouth:'M86 64 Q96 74 106 62'});
 // the middle row: the crew in the strip's order, Slow Moe at the end nearest the camera, under the magpie
 const mid=122;
 s+=fworker({x:P(124),y:mid,suit:[C.red,C.redD],beard:true,eye:'happy',mouth:'grin',armR:'thumb'});
 s+=fworker({x:P(150),y:mid,suit:['#f3efe6','#d8d1c2'],legs:['#e9e4d8','#d8d1c2'],apron:true,hat:'toque',tache:true,glove:C.skin,glasses:false,eye:'happy',mouth:'grin'});
 s+=fworker({x:P(176),y:mid,suit:[C.navy,C.navyD],hatC:'#f7f6f0',tache:true,vest:true,plain:true,mouth:'smile',armL:'clip'});
 s+=fworker({x:P(202),y:mid,suit:['#a9c8e8','#86a9cf'],legs:['#cdb98f','#ad9a70'],shirt:true,hatC:'#f7f6f0',glasses:false,eye:'happy',mouth:'grin',armR:'mug'});
 s+=fworker({x:P(228),y:mid,suit:[C.plaid,C.plaidD],plaid:true,legs:[C.jean,C.jeanD],hat:'cowboy',tache:true,glove:C.skin,mouth:'smile',armL:'wave'});
 const splat=`<g transform="translate(-5 -118)"><path d="M-8 -2 q-1 -5 4 -5 q3 -4 7 -1 q5 -1 5 4 q3 3 -2 5 q-2 4 -7 2 q-4 3 -7 -1 q-3 -2 0 -4 z" fill="#f6f7f2" ${sw(1.4)}/><path d="M-3 3 q-1.6 7 -.4 13 q1.4 2.4 3 0 q.6 -6 .2 -12" fill="#f6f7f2" ${sw(1.2)}/></g>`;
 s+=fworker({x:P(256),y:mid,suit:['#e8862e','#bf6418'],stubble:true,eye:'wide',pupY:-3,mouth:'grit',hatTip:3,hatLift:3,armR:'thumb',hatItem:splat});
 s+=fMagpie(P(256),mid-.52*128,.62);
 // the front row: the bison lying down on the left, the small ones, the coyote, the crane by the camera
 const fr=133;
 s+=fBison(P(66),fr,.74);
 s+=fHare(P(152),fr,.8)+fBeaver(P(181),fr,.82)+pdog({x:P(205),y:fr,s:.62,arms:.15,mouth:'smile'})+fFrog(P(220),fr,.8)+fFrog(P(233),fr,.8)+fCoyote(P(264),fr,.82);
 s+=fCrane(P(316),fr,.56);
 return FRONT=s;}

const FONT='Fredoka, Trebuchet MS, sans-serif';
function txt(s,x,y,size,o={}){const st=o.stroke===false?'':`stroke="${o.strokeC||OL}" stroke-width="${o.sw||3.4}" paint-order="stroke" stroke-linejoin="round"`;
 return`<text x="${r2(x)}" y="${r2(y)}" text-anchor="${o.anchor||'middle'}" font-family="${FONT}" font-weight="${o.w||700}" font-size="${size}" fill="${o.fill||'#fff'}" ${st} ${o.extra||''}>${s}</text>`;}
const ease=io;
const backOut=x=>{const c1=1.70158,c3=c1+1;return 1+c3*Math.pow(x-1,3)+c1*Math.pow(x-1,2);};

const BIF={x:34,y:104,s:.468};
function biffyBody(){const m=biffyMarkup(false).replace(DOOR,'').replace('<g class="root">','<g>');return`<g transform="translate(${r2(BIF.x-50*BIF.s)} ${r2(BIF.y-134*BIF.s)}) scale(${BIF.s})">${m}</g>`;}
function biffyDoor(door=1,red=false){let d=DOOR.replace('<g class="door">',`<g transform="translate(22 0) scale(${r2(door)} 1) translate(-22 0)">`);if(red)d=d.replace('fill="#56b05a"','fill="#d9453a"');
 return`<g transform="translate(${r2(BIF.x-50*BIF.s)} ${r2(BIF.y-134*BIF.s)}) scale(${BIF.s})">${d}</g>`;}
const biffyW=(red=false)=>biffyBody()+biffyDoor(1,red);
/* ---------- the crew ---------- */
const ROWS={back:128,mid:144,front:160};
const COOK={suit:['#f3efe6','#d8d1c2'],apron:true,hat:'toque',tache:true,glove:C.skin,noGlasses:true};
const RANCHER={suit:[C.plaid,C.plaidD],plaid:true,legs:[C.jean,C.jeanD],hat:'cowboy',tache:true,glove:C.skin};
const VEST=`<path d="M-15 -76 H-3 L-3 -38 H-15 Z M5 -76 H15 V-38 H5 Z" fill="#c8e63a"/><path d="M-15 -60 H-3 M5 -60 H15 M-15 -48 H-3 M5 -48 H15" stroke="#e9ecef" stroke-width="3"/>`;
const SAM={suit:'navy',hatC:'#f7f6f0',tache:true,plain:true,torsoItem:VEST};
const COMAN={suit:['#a9c8e8','#86a9cf'],legs:['#cdb98f','#ad9a70'],hatC:'#f7f6f0',plain:true,noGlasses:true,torsoItem:`<path d="M-2 -77 L3 -70 L8 -77" fill="none" stroke="#86a9cf" stroke-width="2"/><path d="M3 -70 V-40" stroke="#86a9cf" stroke-width="1.6"/>`};
const MUG=`<g transform="translate(0 -42)"><rect x="-3" y="-12" width="11" height="13" rx="2" fill="#f4f1ea" ${sw(1.8)}/><path d="M8 -9 q5 0 5 4 q0 4 -5 4" fill="none" ${sw(1.8)}/></g>`;
const CLIPB=`<g transform="translate(2 -40) rotate(10)"><rect x="-1" y="-20" width="14" height="19" rx="1.6" fill="#a8743f" ${sw(1.8)}/><rect x="1.5" y="-17" width="9" height="13" fill="#fbfaf6"/></g>`;
function bearSit(x,y,s,o={}){
 let m=BEAR.replace('<g class="walk">','<g class="walk" style="display:none">').replace('<g class="sit" style="display:none">','<g class="sit">')
  .replace('<g class="flip">','<g>').replace('<g class="root">',`<g transform="translate(80 134) scale(${r2(o.sx||1)} ${r2(o.sy||1)}) translate(-80 -134)">`)
  .replace('<g class="sHead">',`<g transform="rotate(${r2(o.head||0)} 82 66)">`);
 const px=o.px??2,py=o.py??0;
 m=m.replace(/(class="sPupL" cx=")[^"]*(" cy=")[^"]*"/,`$1${r2(80+px)}$2${r2(44.5+py)}"`).replace(/(class="sPupR" cx=")[^"]*(" cy=")[^"]*"/,`$1${r2(95+px)}$2${r2(42.5+py)}"`);
 m=m.replace(/(class="sMouth" d=")[^"]*"/,`$1${o.mouth||'M88 65 Q96 70 104 62'}"`);
 const n=o.near||{x:104,y:96},sh={x:100,y:76};
 const mid={x:(sh.x+n.x)/2+(n.x<80?6:8),y:Math.max(sh.y,n.y)-4+(n.x<80?14:0)};
 const d=`M${sh.x} ${sh.y} Q${r2(mid.x)} ${r2(mid.y)} ${r2(n.x)} ${r2(n.y)}`;
 m=m.replace('class="nearArm" d=""',`class="nearArm" d="${d}"`).replace('class="nearArm2" d=""',`class="nearArm2" d="${d}"`).replace('<circle class="nearPaw" r="7.5"',`<circle class="nearPaw" cx="${r2(n.x)}" cy="${r2(n.y)}" r="7.5"`);
 return`<g transform="translate(${r2(x-80*s)} ${r2(y-134*s)}) scale(${r2(s)})">${m}</g>`;}
function tripod(x,y,light){ // x = the camera's middle, y = the feet; lens to the left
 const top=y-56;let s=`<path d="M${x} ${top} L${x-13} ${y} M${x} ${top} L${x+12} ${y} M${x} ${top} L${x+1} ${y+2}" stroke="${OL}" stroke-width="4" stroke-linecap="round"/><path d="M${x} ${top} L${x-13} ${y} M${x} ${top} L${x+12} ${y} M${x} ${top} L${x+1} ${y+2}" stroke="#7d848c" stroke-width="2" stroke-linecap="round"/>`;
 s+=`<rect x="${x-4}" y="${top-3}" width="8" height="5" fill="#5a6068" ${sw(1.6)}/>`;
 s+=`<rect x="${x-12}" y="${top-17}" width="24" height="15" rx="2.5" fill="#3a3d44" ${sw(2.2)}/><rect x="${x+2}" y="${top-21}" width="8" height="5" rx="1.2" fill="#3a3d44" ${sw(1.6)}/>`;
 s+=`<rect x="${x-19}" y="${top-14}" width="8" height="9" rx="2" fill="#5a6068" ${sw(1.8)}/><ellipse cx="${x-19.5}" cy="${top-9.5}" rx="2" ry="4" fill="#9fd3f2" stroke="${OL}" stroke-width="1.4"/>`;
 s+=`<circle cx="${x-7}" cy="${top-19.5}" r="2.4" fill="${light?'#ff4a3a':'#7a2a24'}" stroke="${OL}" stroke-width="1.2"/>`;
 if(light)s+=`<circle cx="${x-7}" cy="${top-19.5}" r="5" fill="#ff4a3a" opacity=".35"/>`;
 return s;}
const SPLAT_AT=[-9,-13];
function hatSplat(k,drip){if(k<=0)return'';const s=1.45*k;let g=`<g transform="translate(${SPLAT_AT[0]} ${SPLAT_AT[1]}) scale(${r2(s)})"><path d="M-6 0 q-1 -5 4 -5 q2 -4 6 -1 q5 -1 5 4 q3 3 -1 5 q-2 4 -6 2 q-4 3 -7 -1 q-4 -1 -1 -4 z" fill="#f6f7f2" ${sw(1.4)}/><circle cx="2" cy="-1" r="1.6" fill="#d8dccf"/></g>`;
 if(drip>0)g+=`<path d="M-15 -9 q-2.5 ${r2(8*drip)} -1.2 ${r2(14*drip)} q2 2.6 3.4 0 q.8 ${r2(-7*drip)} .5 ${r2(-14*drip)}" fill="#f6f7f2" ${sw(1.3)}/>`;
 return g;}

/* The crew photo's timing */
const T_BEEP=1.65,T_RUN=1.9,T_SPOT=3.0,T_BIRD=3.6,T_LAND=4.5,T_FAST=5.0,T_SNAP=5.86,T_POL=6.05;
const MOE_SPOT=256,MOE_CAM=374,CAM_X=354;
function moeP2(t){
 const p=Object.assign({},MOE,{x:MOE_CAM,y:ROWS.mid,face:-1,eye:'n',mouth:'flat'});
 if(t<.4){p.lean=16;p.eye='half';p.armF=-60;p.armB=-50;return p;}
 if(t<1.6){const k=Math.sin((t-.4)*13);p.armF=-140+32*k;p.armB=-20;p.mouth='O';p.eye='n';p.bob=-1*Math.abs(k);return p;}
 if(t<T_RUN){const k=Math.sin(Math.PI*seg(t,1.6,T_RUN));p.lean=10*k;p.armF=-80*k;p.mouth='smile';return p;}
 if(t<T_SPOT){const x=kf(t,[[T_RUN,MOE_CAM],[T_SPOT,MOE_SPOT,'out']]);Object.assign(p,walk(x/4.2,34));p.x=x;p.lean=-12;p.mouth='O';p.eye='wide';p.hatLift=2*Math.abs(Math.sin(x/4.2));return p;}
 p.x=MOE_SPOT;
 if(t<3.2){p.bob=hop(t,T_SPOT,3.2,6);p.face=t<3.1?-1:1;p.mouth='grin';return p;}
 p.face=1;
 if(t<T_LAND+.1){p.eye='happy';p.mouth='grin';p.armF=-34;p.hand=THUMB(C.glove);p.bob=-.6*Math.sin(t*2.2);return p;}
 if(t<T_SNAP){p.eye='n';p.px=.4;p.py=-2.9;p.mouth='grit';p.armF=-34;p.hand=THUMB(C.glove);p.brow=-2;return p;}
 if(t<7.4){p.eye='wide';p.px=.2;p.py=-2.6;p.mouth='O';p.armF=-34;p.hand=THUMB(C.glove);return p;}
 p.eye='half';p.brow=5;p.mouth='frown';p.px=2.2;p.py=-2.4;p.armF=-10;return p;}
function birdP2(t,E=0){
 if(t<T_BIRD)return null;const land={x:MOE_SPOT+3,y:ROWS.mid-65.4};
 let p={x:land.x,y:land.y,s:.3,face:1,lid:'sly'};
 if(t<T_LAND){const k=seg(t,T_BIRD,T_LAND);p.x=lerp(-40-E,land.x,io(k));p.y=lerp(8,land.y,k*k)-26*Math.sin(Math.PI*k)*(1-k);p.wing=-42+38*Math.sin(t*26);p.tail=-6;p.rot=-8*(1-k);p.lid='open';return p;}
 if(t<T_LAND+.2){const k=seg(t,T_LAND,T_LAND+.2);p.sy=1-.16*Math.sin(Math.PI*k);p.sx=1+.12*Math.sin(Math.PI*k);p.wing=-20*(1-k);return p;}
 if(t<5.3){p.px=83;return p;}
 if(t<T_SNAP){const k=seg(t,5.3,5.5);p.sy=1-.1*k;p.sx=1+.06*k;p.tail=20*k;p.lid='sly';p.px=78;return p;}
 if(t<6.7){p.lid='smug';p.tail=lerp(20,0,seg(t,T_SNAP,6.1));if(t>6.1&&t<6.6)p.y-=1.5*Math.abs(Math.sin((t-6.1)*12));return p;}
 if(t<6.85){p.sy=.86;p.sx=1.08;p.tail=14;return p;}
 const k=seg(t,6.85,7.8);if(k>=1)return null;p.x=lerp(land.x,440+E,k);p.y=lerp(land.y,-30,io(k));p.wing=-42+38*Math.sin(t*26);p.rot=-12;p.lid='open';return p;}
function crew(t,o={}){
 // everyone on the strip, by ground line (the depth rule): back row, middle row, front row
 const bob=i=>-.6*Math.sin(t*2.2+i*1.3);
 let back='',mid='',front='';
 back+=bearSit(84,ROWS.back,.62,{px:2.4,py:.4,near:{x:118+2*Math.sin(t*3),y:50+2*Math.cos(t*3)},sy:1+.012*Math.sin(t*2)});
 const ppl=[[124,Object.assign({},BEARD,{eye:'happy',mouth:'grin',armF:-34,hand:THUMB(C.glove)})],[150,Object.assign({},COOK,{mouth:'grin',eye:'happy'})],[176,Object.assign({},SAM,{mouth:'smile',px:1,handB:CLIPB,armB:-20})],[202,Object.assign({},COMAN,{mouth:'smile',eye:'happy',hand:MUG,armF:-46})],[228,Object.assign({},RANCHER,{mouth:'smile',px:1})]];
 ppl.forEach(([x,q],i)=>{mid+=worker(Object.assign({x,y:ROWS.mid,face:1,bob:bob(i)},q));});
 const m=moeP2(t);const k=seg(t,T_SNAP,T_SNAP+.12);
 m.hatItem=hatSplat(k,seg(t,T_SNAP+.08,T_SNAP+.5));
 mid+=worker(m);
 front+=bison({x:66,y:ROWS.front,face:1,lie:1,headDip:0,eye:'happy',mouth:'grin',tail:6*Math.sin(t*3),chew:0});
 front+=hare({x:152,y:ROWS.front,face:1,ear:.2*Math.sin(t*4),mouth:'smile',px:1});
 front+=beaver({x:181,y:ROWS.front,face:1,mouth:'teeth',eye:'n',px:1,tail:4*Math.sin(t*3)});
 front+=pdog({x:205,y:ROWS.front,arms:.15,mouth:'smile',sway:6*Math.sin(t*3)});
 front+=frog({x:220,y:ROWS.front,face:1,sac:.5+.5*Math.sin(t*6)})+frog({x:233,y:ROWS.front,face:1,sac:.5+.5*Math.sin(t*6+2)});
 front+=coyote({x:264,y:ROWS.front,face:1,sit:1,eye:'n',px:1});
 front+=crane({x:316,y:ROWS.front,face:1,eye:'n',px:1,neck:.04+.04*Math.sin(t*1.7)});
 front+=tripod(CAM_X,ROWS.front+2,o.light);
 const b=birdP2(t,o.E||0);
 return{back,mid,front,over:(b?magpie(b):'')};}
function crewSounds(t){let s='';
 if(t>T_BEEP&&t<T_FAST&&((t-T_BEEP)%.6)<.3)s+=sfx(CAM_X-6,ROWS.front-82,'beep',9,-4,'#ff6a5a');
 if(t>T_FAST&&t<T_SNAP&&((t-T_FAST)%.18)<.09)s+=sfx(CAM_X-6,ROWS.front-82,'beep',10,-4,'#ff6a5a');
 if(t>T_SNAP+.02&&t<T_SNAP+.6)s+=sfx(MOE_SPOT-30,ROWS.mid-86,'splat',11,-8,'#f6f7f2');
 if(t>6.15&&t<6.7&&Math.floor(t*8)%2===0)s+=sfx(MOE_SPOT+24,ROWS.mid-96,'heh heh',8,-6,'#fff');
 return s;}
const timerOn=t=>(t>T_BEEP&&t<T_FAST&&((t-T_BEEP)%.6)<.3)||(t>T_FAST&&t<T_SNAP&&((t-T_FAST)%.18)<.09);

/* ---------- the Polaroid ---------- */
const PCROP={x:58,y:44,w:278,h:124};
function polaroid(cx,cy,sc,rot,op=1){
 const pw=300,ph=134,B=10,BB=46,W=pw+2*B,H=ph+B+BB;
 let s=`<g opacity="${r2(op)}" transform="translate(${r2(cx)} ${r2(cy)}) rotate(${r2(rot)}) scale(${r2(sc)}) translate(${-W/2} ${-H/2})">`;
 s+=`<rect x="5" y="7" width="${W}" height="${H}" rx="3" fill="#000" opacity=".28"/><rect x="0" y="0" width="${W}" height="${H}" rx="3" fill="#fbfbf7" ${sw(2.4)}/>`;
 s+=`<clipPath id="polC"><rect x="${B}" y="${B}" width="${pw}" height="${r2(ph)}"/></clipPath><g clip-path="url(#polC)"><g transform="translate(${B} ${B})">${photoFront()}</g></g>`;
 s+=`<rect x="${B}" y="${B}" width="${pw}" height="${r2(ph)}" fill="none" stroke="${OL}" stroke-width="1.6"/>`;
 s+=txt('The crew. Zero incidents.*',W/2,B+ph+28,19,{fill:'#2b3a6b',stroke:false,w:600});
 s+=txt('*almost',W-18,B+ph+42,12,{fill:'#2b3a6b',stroke:false,w:600,anchor:'end'});
 s+=`<path d="M${W/2-34} -8 h68 v18 h-68 z" fill="#f4e6a8" opacity=".85" transform="rotate(-2 ${W/2} 0)"/>`;
 return s+`</g>`;}

/* ---------- 4. Still Here: Moe in his robe, at the biffy ---------- */
const ROBE={suit:['#8e3b46','#702d37'],legs:['#a9c9e8','#8eb0d3'],socks:true,plain:true,glove:C.skin,noGlasses:true,
 torsoItem:`<path d="M-11 -77 V-37 M-6.5 -78 V-37 M-2 -78 V-37 M7.5 -78 V-37 M12 -77 V-37" stroke="#bdb6b3" stroke-width="1.8"/><path d="M-4 -78 L3 -63 L10 -78 Z" fill="#a9c9e8" stroke="${OL}" stroke-width="1.4"/><path d="M-4 -78 L3 -60 M10 -78 L3 -60" stroke="#f0e6d8" stroke-width="3"/><rect x="-15" y="-53" width="30" height="4" fill="#5a222b"/><path d="M6 -51 l3 8 M7 -51 l-1 9" stroke="#5a222b" stroke-width="2.4" stroke-linecap="round"/>`};
const BRUSH_A=-117.6;
const SLEEVE=`<path d="M-2 -72 V-46 M2 -72 V-46" stroke="#bdb6b3" stroke-width="1.6"/>`;
function brushItem(a){return SLEEVE+`<g transform="rotate(${r2(-a)} 0 -42)"><path d="M0 -42 L-13 -42" stroke="${OL}" stroke-width="4.6" stroke-linecap="round"/><path d="M0 -42 L-13 -42" stroke="#3d9bd9" stroke-width="2.4" stroke-linecap="round"/><rect x="-16" y="-46" width="6" height="3.4" rx="1" fill="#fbfbf7" stroke="${OL}" stroke-width="1"/></g>`;}
const FOAM=`<circle cx="16" cy="13" r="2.6" fill="#fbfbf7" stroke="${OL}" stroke-width=".9"/><circle cx="19.5" cy="10" r="1.8" fill="#fbfbf7" stroke="${OL}" stroke-width=".9"/><circle cx="13" cy="15.6" r="1.6" fill="#fbfbf7" stroke="${OL}" stroke-width=".9"/>`;
const SH={x:43,y:103,s:.35};
function moeP4(t){
 const p=Object.assign({},MOE,ROBE,{x:SH.x,y:SH.y,s:SH.s,face:1,eye:'half',mouth:'smile',lean:0,handB:SLEEVE});
 const brushing=(t<3.2)||(t>7.9);const a=BRUSH_A+(brushing?6*Math.sin(t*38):0);
 if(t<3.6||t>7.9){p.armF=a;p.hand=brushItem(a);p.faceItem=FOAM;p.mouth='o';}
 else{const k=t<3.9?seg(t,3.6,3.9):1;const a2=lerp(BRUSH_A,-60,io(k));p.armF=a2;p.hand=brushItem(a2);p.faceItem=FOAM;}
 p.lean=kf(t,[[1.95,0],[2.35,26,'out'],[8.15,26],[8.55,0,'in']]);
 if(t>=3.2&&t<3.6){p.eye='n';p.px=1.6;}
 if(t>=3.6&&t<7.9){p.eye=t<4.0?'wide':'n';p.px=1.4;p.mouth=t<5.6?'O':'flat';p.brow=t<4.0?-3:0;}
 if(t>=5.8&&t<7.9){p.eye='half';p.brow=2;p.mouth=(t<7.4)?'flat':'smile';}
 return p;}
function stinger(t){ // the biffy and Moe, in world units
 const door=t<1.2?1:t<2.0?lerp(1,-.42,io(seg(t,1.2,2.0))):t<8.6?-.42:lerp(-.42,1,io(seg(t,8.6,9.3)));
 let s=biffyBody();
 if(t>1.25&&t<9.2)s+=worker(moeP4(t));
 return s+biffyDoor(door,true);}
function stingerWords(t,W){ // sound words and lines, drawn at screen size; W maps a world point to the screen
 let s='';const at=(x,y)=>W(x,y);
 const [cx,cy]=at(BIF.x+2,BIF.y-62);
 if((t>1.2&&t<2.0)||(t>8.6&&t<9.3))s+=sfx(cx,cy,'creeeak',16,-6,'#fff');
 const [bx,by]=at(BIF.x+30,BIF.y-44);
 if(((t>2.3&&t<3.2)||(t>8.0&&t<8.5))&&Math.floor(t*6)%2===0)s+=sfx(bx+40,by+10,'scrub scrub',15,-6,'#fff');
 return s;}
const ZOOM={s:3.2,cx:60,cy:80}; // the close-up: world (60,80) at the middle of the screen

/* ---------- the finale's own stage (the page's `bgFinale`, less its flat grass: the game's ground shows) ---------- */
/** The strip's world: the page's, y 36 (the berm's foot) to y 180. */
export const FIN_SCENE = { w: 390, top: 36, floor: 180, ground: 144 };
/** The two-track across the strip, run on to both screen edges. */
export function finLane(x0, x1) {
 return `<path d="M${r2(x0)} 134 H${r2(x1)} V174 H${r2(x0)} Z" fill="#c8ae7e"/><path d="M${r2(x0)} 142.5 H${r2(x1)}" stroke="#b0965f" stroke-width="5"/><path d="M${r2(x0)} 165.5 H${r2(x1)}" stroke="#b0965f" stroke-width="5"/><path d="M${r2(x0)} 150 H${r2(x1)} V158 H${r2(x0)} Z" fill="#8fbd56"/>`;}
/** The page's grass tufts (its own seed), none on the lane. */
export function finTufts() {
 let s='';const R=rng(5);
 for(let i=0;i<16;i++){const x=R()*390,y=60+R()*70;if(y>130&&y<176)continue;s+=`<path d="M${r2(x)} ${r2(y)} l-2.5 -6 M${r2(x)} ${r2(y)} l.5 -7 M${r2(x)} ${r2(y)} l3 -5.5" stroke="#5f9441" stroke-width="1.6" stroke-linecap="round"/>`;}
 for(let i=0;i<8;i++){const x=R()*390,y=176+R()*20;s+=`<path d="M${r2(x)} ${r2(y)} l-2.5 -6 M${r2(x)} ${r2(y)} l.5 -7 M${r2(x)} ${r2(y)} l3 -5.5" stroke="#5f9441" stroke-width="1.6" stroke-linecap="round"/>`;}
 return s;}
/** The page's back trees [species, x, base, height]: drawn by the game in the board's own drawings. */
export const FIN_TREES = [['spruce',92,58,40],['aspen',126,60,44],['willow',166,60,22],['spruce',304,56,40],['aspen',338,60,42],['spruce',372,58,34]];
/** The close-up's flat sky and grass behind the stage (the page's `bgClose` and its strip's green), as wide as asked. */
export function closeBack(x0, x1) {
 return `<defs><linearGradient id="finSky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#6fb0e4"/><stop offset="1" stop-color="#d4eaf7"/></linearGradient></defs>`+
  `<rect x="${r2(x0)}" y="-300" width="${r2(x1-x0)}" height="334" fill="url(#finSky)"/><rect x="${r2(x0)}" y="20" width="${r2(x1-x0)}" height="470" fill="#84b64d"/><rect x="${r2(x0)}" y="20" width="${r2(x1-x0)}" height="40" fill="#92c25a"/>`;}
/** The Polaroid alone, in a box of its own (`POL`): what drops onto the screen. */
export const POL = { w: 330, h: 204 };
export const polaroidSvg = () => polaroid(162, 98, 1, 0);

export { BIF, ROWS, MOE_SPOT, MOE_CAM, CAM_X, SH, ZOOM_AT, T_BEEP, T_RUN, T_SPOT, T_BIRD, T_LAND, T_FAST, T_SNAP, T_POL, biffyBody, biffyDoor, crew, crewSounds, timerOn, tripod, photoFront, polaroid, stinger, stingerWords, moeP2, moeP4, backOut };
const ZOOM_AT = { s: 3.2, cx: 60, cy: 80 }; // (the page's ZOOM: the close-up puts world (60, 80) at the middle of the screen, 3.2 times as big)

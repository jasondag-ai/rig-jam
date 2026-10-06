// @ts-nocheck
// GAG WAVE 3 (Mannville and Bakken), PORTED AS WRITTEN from the approved reference page
// `~/Desktop/RHR Art Inbox/mannville_bakken_gags_reference.html` (saved Oct 6 03:41): the same
// helpers, puppets (worker, cat, beaver, coyote, prairie dog, pipe, bale, tumbleweed, cloud,
// umbrella), beats and timing. The reference draws a whole 390 x 190 strip as one SVG string per
// frame, and so does the game: each gag's `render(t, E)` returns the MOVING part of the scene in
// the reference's own coordinates (ground line `GY` 150; the strip's scenery is permanent and
// drawn once by scene-stage.ts, not here).
//
// THE ONE CHANGE: `E`. The game shows the reference's 390-wide world at the scale the strip's
// height allows, so on a short strip the screen is WIDER than 390 world units, by `E` on each
// side. Nobody may pop in or out in view, so every walk-in starts `E` further out and every
// walk-off goes `E` further, AT THE REFERENCE'S OWN SPEED: the gag starts `lead(E)` seconds early
// (t < 0) and ends `tail(E)` seconds late. Every beat between keeps the reference's time.
const GY=150, OL='#2b1e16';
const C={skin:'#f1c39a',skinD:'#dc9e74',red:'#c8392b',redD:'#a22d21',navy:'#2f4170',navyD:'#24335a',hat:'#f4c430',glove:'#d9b45c',boot:'#4b3324',stripe:'#ece8dc',sock:'#c4c0b8',mud:'#5b4a2d',mudD:'#4a3c24',jean:'#4d6c9c',jeanD:'#3d5784',plaid:'#b8433a',plaidD:'#9b372f',cowboy:'#8a5a35'};
const r2=n=>Math.round(n*100)/100;
const clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,v));
const seg=(t,a,b)=>clamp((t-a)/(b-a));
const io=x=>x<.5?2*x*x:1-Math.pow(-2*x+2,2)/2;
const es=(t,a,b)=>io(seg(t,a,b));
const inr=(t,a,b)=>t>=a&&t<b;
const lerp=(a,b,x)=>a+(b-a)*x;
const hop=(t,a,b,h=7)=>(t>a&&t<b)?-h*Math.sin(Math.PI*(t-a)/(b-a)):0;
function kf(t,A){if(t<=A[0][0])return A[0][1];for(let i=1;i<A.length;i++){if(t<=A[i][0]){const[t0,v0]=A[i-1],[t1,v1,m='io']=A[i];let x=t1===t0?1:(t-t0)/(t1-t0);x=m==='lin'?x:m==='in'?x*x:m==='out'?1-(1-x)*(1-x):io(x);return v0+(v1-v0)*x;}}return A[A.length-1][1];}
const sw=(w=3)=>`stroke="${OL}" stroke-width="${w}" stroke-linejoin="round" stroke-linecap="round"`;
function mix(a,b,x){const p=h=>[1,3,5].map(i=>parseInt(h.slice(i,i+2),16));const A=p(a),B=p(b);return'#'+A.map((v,i)=>Math.round(v+(B[i]-v)*x).toString(16).padStart(2,'0')).join('');}
function walk(ph,amp=24){const s=Math.sin(ph);return{legF:-amp*s,legB:amp*s,armF:amp*.8*s,armB:-amp*.8*s,bob:-2*Math.abs(Math.cos(ph))};}
function rng(seed){return()=>{seed|=0;seed=seed+0x6D2B79F5|0;let t=Math.imul(seed^seed>>>15,1|seed);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};}

function bubble(x,y,txt,side='r'){const w=txt.length*7.2+18,h=21;const bx=side==='r'?x-8:x-w+8;return`<g><rect x="${r2(bx)}" y="${r2(y-h)}" width="${r2(w)}" height="${h}" rx="10" fill="#fff" ${sw(2.2)}/><path d="M${r2(x-1)} ${r2(y-1)} L${r2(x+(side==='r'?-3:3))} ${r2(y+8)} L${r2(x+(side==='r'?8:-8))} ${r2(y-1)}" fill="#fff" ${sw(2.2)}/><path d="M${r2(x-3)} ${r2(y-1.3)} H${r2(x+10)}" stroke="#fff" stroke-width="3.2" transform="translate(${side==='r'?0:-6} 0)"/><text x="${r2(bx+w/2)}" y="${r2(y-6)}" text-anchor="middle" font-family="Fredoka, Trebuchet MS, sans-serif" font-weight="600" font-size="13" fill="${OL}">${txt}</text></g>`;}
function sfx(x,y,txt,size=16,rot=-6,col='#f4c430',sc=1){return`<g transform="translate(${r2(x)} ${r2(y)}) rotate(${rot}) scale(${r2(sc)})"><text x="0" y="0" text-anchor="middle" font-family="Fredoka, Trebuchet MS, sans-serif" font-weight="700" font-size="${size}" fill="${col}" stroke="${OL}" stroke-width="3.4" paint-order="stroke" stroke-linejoin="round">${txt}</text></g>`;}
function note(x,y,a=1,col='#fff'){return`<g opacity="${r2(a)}" transform="translate(${r2(x)} ${r2(y)})"><path d="M0 0 a3.4 2.6 -20 1 1 0.1 0 M3 -1 V-12 q4 1 6 4" fill="${col}" ${sw(1.8)}/></g>`;}
function zz(x,y,a,s=1){return sfx(x,y,'z',9*s,-10,'#fff',1).replace('<g ',`<g opacity="${r2(a)}" `);}
function hardHat(c){return`<path d="M-16 0 a16 15 0 0 1 32 0 z" fill="${c}" ${sw()}/><path d="M0 -14 V-1" stroke="${OL}" stroke-width="1.6" opacity=".45"/><rect x="-18" y="-2.5" width="40" height="5" rx="2.5" fill="${c}" ${sw(2.4)}/>`;}
function cowHat(){return`<path d="M-11 0 v-14 q11 -7 22 0 v14 z" fill="${C.cowboy}" ${sw()}/><rect x="-10" y="-5" width="20" height="3.4" fill="#5b3a21"/><ellipse cx="3" cy="1" rx="24" ry="4.6" fill="${C.cowboy}" ${sw(2.6)}/>`;}
function worker(o){
 o=Object.assign({sockB:false,x:0,y:GY,s:.54,face:1,legF:0,legB:0,armF:0,armB:0,bob:0,lean:0,headRot:0,eye:'n',px:0,py:0,mouth:'smile',brow:0,suit:'red',hat:'hard',hatC:C.hat,hatLift:0,hatRot:0,noHat:false,socks:false,blush:0,sq:0,tache:false,legs:null,plaid:false,mud:0,hand:'',handB:'',glove:C.glove,clip:''},o);
 const S=o.suit==='red'?[C.red,C.redD]:o.suit==='navy'?[C.navy,C.navyD]:o.suit;
 const L=o.mud>.5?[C.mud,C.mudD]:(o.legs||S);
 const leg=(a,c,sk)=>`<g transform="rotate(${r2(a)} 0 -40)"><rect x="-6" y="-41" width="12" height="35" rx="4" fill="${c}" ${sw()}/>${(o.legs||o.mud>.5)?'':`<rect x="-4.6" y="-22" width="9.2" height="3.2" fill="${C.stripe}"/>`}${sk?`<path d="M-6.5 -9 q1.5 -1.5 3 0 q1.5 -1.5 3 0 q1.5 -1.5 3 0 q1.5 -1.5 3 0 v3 q4 .5 5 3.5 q.5 2 -1 2.5 h-15.5 q-1.5 -.5 -.5 -2 z" fill="#e4ddcf" ${sw(2.2)}/><path d="M-4 -4 l1 -1.6 M0 -5 l1 -1.6 M4 -3 l1 -1.6 M7 -1 l1 -1.6" stroke="#a39a8a" stroke-width="1.2" stroke-linecap="round"/>`:o.socks?`<path d="M-6 -8 h12 a5 5 0 0 1 5 5 v3 h-17 z" fill="${C.sock}" ${sw(2.4)}/>`:`<path d="M-7 -9 h14 a7 7 0 0 1 7 7 v2 h-21 z" fill="${C.boot}" ${sw(2.6)}/>`}</g>`;
 const arm=(a,c,item)=>`<g transform="rotate(${r2(a)} 0 -70)"><rect x="-5" y="-73" width="10" height="30" rx="5" fill="${c}" ${sw()}/>${item||''}<circle cx="0" cy="-42" r="5.6" fill="${o.glove}" ${sw(2.4)}/></g>`;
 let torso=`<rect x="-15" y="-78" width="30" height="42" rx="9" fill="${S[0]}"/>`;
 if(o.plaid)torso+=`<path d="M-6 -77V-37M5 -77V-37M-14 -64H14M-14 -50H14" stroke="#7d2219" stroke-width="2.2" opacity=".75"/>`;
 else torso+=`<rect x="-14" y="-55" width="28" height="3.4" fill="${C.stripe}"/><rect x="4" y="-71" width="6" height="8" rx="1.5" fill="#f08a24" stroke="${OL}" stroke-width="1.6"/>`;
 if(o.mud>0)torso+=`<path d="M-15 -49 q4 5 8 0 q4 6 8 0 q4 5 8 0 q3 4 7 0 V-36 H-15 z" fill="${C.mud}" opacity="${r2(clamp(o.mud))}"/>`;
 torso+=`<rect x="-15" y="-78" width="30" height="42" rx="9" fill="none" ${sw()}/>`;
 const ey=1;let eye='';
 if(o.eye==='closed')eye=`<path d="M2 ${ey} q5 4 10 0" fill="none" ${sw(2.4)}/>`;
 else if(o.eye==='happy')eye=`<path d="M2 ${ey+2} q5 -6 10 0" fill="none" ${sw(2.4)}/>`;
 else{const wide=o.eye==='wide',er=wide?8.2:6.4,pr=wide?2.5:3.2;
  eye=`<circle cx="7" cy="${ey}" r="${er}" fill="#fff" ${sw(2.2)}/><circle cx="${r2(7+o.px)}" cy="${r2(ey+o.py)}" r="${pr}" fill="${OL}"/><circle cx="${r2(5.8+o.px)}" cy="${r2(ey-1.3+o.py)}" r="1" fill="#fff"/>`;
  if(o.eye==='half')eye+=`<path d="M${r2(7-er-.4)} ${ey} a${r2(er+.4)} ${r2(er+.4)} 0 0 1 ${r2(2*er+.8)} 0 z" fill="${o.flushC||C.skin}" ${sw(2.2)}/>`;}
 const glasses=o.eye==='wide'?'':`<rect x="-2" y="${ey-8.5}" width="18" height="15" rx="6" fill="none" stroke="${OL}" stroke-width="1.4" opacity=".85"/><path d="M-2 ${ey-3} H-13" stroke="${OL}" stroke-width="1.4"/>`;
 const M={smile:`<path d="M7 11 q5 4 10 -1" fill="none" ${sw(2.2)}/>`,grin:`<path d="M6 9 q6 9 12 -1 z" fill="#6b2a20" ${sw(2)}/>`,o:`<ellipse cx="12" cy="12" rx="2.6" ry="3" fill="#6b2a20" ${sw(1.8)}/>`,O:`<ellipse cx="12" cy="11" rx="4.2" ry="5.2" fill="#6b2a20" ${sw(2)}/>`,flat:`<path d="M8 12 h8" fill="none" ${sw(2.2)}/>`,frown:`<path d="M7 13 q5 -5 10 0" fill="none" ${sw(2.2)}/>`,grit:`<rect x="6" y="8.5" width="12" height="6" rx="2" fill="#fff" ${sw(2)}/><path d="M10 8.5 v6 M14 8.5 v6" stroke="${OL}" stroke-width="1.4"/>`,pant:`<ellipse cx="12" cy="12" rx="3.6" ry="4.4" fill="#6b2a20" ${sw(2)}/>`};
 const skin=o.flushC||C.skin;
 const hat=o.noHat?'':`<g transform="translate(0 ${r2(-11-o.hatLift)}) rotate(${r2(o.hatRot)})">${o.hat==='cowboy'?cowHat():hardHat(o.hatC)}</g>`;
 const head=`<g transform="translate(2 -94) rotate(${r2(o.headRot)})"><circle cx="0" cy="0" r="17" fill="${skin}" ${sw()}/><circle cx="-10" cy="3" r="4" fill="${skin}" ${sw(2.2)}/>${o.blush?`<ellipse cx="5" cy="9" rx="5" ry="2.8" fill="#e8786a" opacity="${r2(o.blush)}"/>`:''}${eye}${glasses}<circle cx="17" cy="4" r="3.6" fill="${C.skinD}" ${sw(2)}/>${M[o.mouth]||''}${o.tache?`<path d="M7 8 q5 -3 11 0 q2 4 -2 4 q-3 -2 -4 0 q-4 1 -5 -4 z" fill="#ddd6ca" ${sw(1.8)}/>`:''}<path d="M1 ${ey-8.5} L13 ${r2(ey-8.5+o.brow)}" fill="none" ${sw(2.2)}/>${hat}</g>`;
 const sx=o.s*o.face*(1+o.sq),sy=o.s*(1-o.sq);
 return`<g ${o.clip?`clip-path="url(#${o.clip})"`:''}><g transform="translate(${r2(o.x)} ${r2(o.y)}) scale(${r2(sx)} ${r2(sy)})"><g transform="translate(0 ${r2(o.bob)})"><g transform="rotate(${r2(o.lean)} 0 -40)">${arm(o.armB,S[1],o.handB)}</g>${leg(o.legB,L[1],o.sockB)}${leg(o.legF,L[0],false)}<g transform="rotate(${r2(o.lean)} 0 -40)">${torso}${head}${arm(o.armF,S[0],o.hand)}</g></g></g></g>`;}

function cat(o){
 o=Object.assign({x:0,y:GY,s:1,face:1,c:'#9b98a2',cd:'#6e6b79',ph:0,walk:0,sit:0,sleep:0,headRot:0,eye:'n',px:0,mouth:'',tail:0,dangle:0,carry:'',sq:0,stripes:true},o);
 const sx=o.s*o.face*(1+o.sq),sy=o.s*(1-o.sq),sn=Math.sin(o.ph)*o.walk*26;
 const legR=(x,a,c,h=13,up=0)=>`<g transform="rotate(${r2(a)} ${x} -12)"><rect x="${x-3.3}" y="${r2(-13-up)}" width="6.6" height="${r2(h)}" rx="3" fill="${c}" ${sw(2.4)}/></g>`;
 const low=6*o.sleep;
 let tail;
 if(o.sleep>.5)tail=`M-15 -8 Q-24 4 -2 3 Q12 3 16 -1`;
 else if(o.dangle)tail=`M-16 -14 Q-22 -4 -20 6`;
 else tail=`M-16 -17 Q${r2(-30+o.tail*3)} ${r2(-22-8*Math.sin(o.ph*.5))} ${r2(-26+o.tail*2)} -38`;
 const tailS=`<path d="${tail}" fill="none" stroke="${OL}" stroke-width="9" stroke-linecap="round"/><path d="${tail}" fill="none" stroke="${o.c}" stroke-width="4.6" stroke-linecap="round"/>`;
 let legs='';
 if(o.sleep<.5){const dl=o.dangle?5:0;
  if(o.sit<.5)legs+=legR(-12,sn+dl,o.cd)+legR(-8,-sn-dl,o.c);
  legs+=legR(10,-sn+dl,o.cd,13+8*o.sit,8*o.sit)+legR(14,sn-dl,o.c,13+8*o.sit,8*o.sit);}
 const bodyRot=-24*o.sit+(o.dangle?18:0);
 const stripes=o.stripes?`<path d="M-9 -25 q2 4 0 8 M-2 -26 q2 4 0 8 M5 -26 q2 4 0 7" fill="none" stroke="${o.cd}" stroke-width="2.6" stroke-linecap="round"/>`:'';
 const body=`<g transform="translate(0 ${r2(low)}) rotate(${r2(bodyRot)} -12 -12)"><ellipse cx="0" cy="-17" rx="19" ry="${r2(10-2*o.sleep)}" fill="${o.c}" ${sw(2.6)}/>${stripes}${o.sit>.5?`<ellipse cx="-11" cy="-11" rx="9" ry="7" fill="${o.c}" ${sw(2.4)}/>`:''}</g>`;
 let eye;const ex=4.5,eyy=-1;
 if(o.eye==='closed')eye=`<path d="M1 ${eyy} q3.5 3 7 0" fill="none" ${sw(2)}/>`;
 else{const wide=o.eye==='wide',er=wide?5.4:4.3;eye=`<circle cx="${ex}" cy="${eyy}" r="${er}" fill="#f6efb8" ${sw(2)}/><ellipse cx="${r2(ex+.6+o.px)}" cy="${eyy}" rx="1.5" ry="${wide?2.4:3.2}" fill="${OL}"/>`;
  if(o.eye==='half')eye+=`<path d="M${r2(ex-er-.4)} ${eyy+.3} a${r2(er+.4)} ${r2(er+.4)} 0 0 1 ${r2(2*er+.8)} 0 z" fill="${o.c}" ${sw(2)}/>`;}
 const mouth=o.mouth==='yawn'?`<ellipse cx="9" cy="6" rx="3.2" ry="4.2" fill="#a8434a" ${sw(1.8)}/>`:`<path d="M7 5.5 q1.5 2 3 0 q1.5 2 3 0" fill="none" ${sw(1.6)}/>`;
 const hy=-27+low+5*o.sleep;
 const head=`<g transform="translate(19 ${r2(hy-8*o.sit)}) rotate(${r2(o.headRot+12*o.sleep)})"><path d="M-8 -5 L-9 -17 L-1 -9 z" fill="${o.c}" ${sw(2.2)}/><path d="M2 -9 L7 -18 L9 -5 z" fill="${o.c}" ${sw(2.2)}/><path d="M-7 -7 L-7.5 -13 L-3 -9 z M4 -9 L6.6 -14 L7.4 -7 z" fill="#e9a3a0"/><circle cx="0" cy="0" r="10.5" fill="${o.c}" ${sw(2.6)}/>${eye}<path d="M11 1.5 l-3 -2.5 l3.6 0 z" fill="#e57b8a" ${sw(1.4)}/>${mouth}<path d="M12 4 l7 -1.5 M12 5.5 l7 1" stroke="${OL}" stroke-width="1" opacity=".8"/>${o.carry}</g>`;
 return`<g transform="translate(${r2(o.x)} ${r2(o.y)}) scale(${r2(sx)} ${r2(sy)})">${tailS}${legs}${body}${head}</g>`;}

function beaver(o){
 o=Object.assign({x:0,y:GY,s:.8,face:1,ph:0,walk:0,sq:0,headRot:0,eye:'n',px:0,py:0,brow:0,tail:0,armA:-168,mouth:'teeth',chin:false},o);
 const c='#7c5130',cd='#5f3c22',cl='#b2835a',sn=Math.sin(o.ph)*o.walk*26;
 const sx=o.s*o.face*(1+o.sq),sy=o.s*(1-o.sq);
 const tail=`<g transform="rotate(${r2(o.tail)} -18 -10)"><ellipse cx="-33" cy="-8" rx="15" ry="5.6" fill="#4a3426" ${sw(2.4)} transform="rotate(-8 -33 -8)"/><path d="M-42 -11 l14 5 M-40 -5 l10 -6 M-34 -12 l6 6" stroke="#6d4d38" stroke-width="1.4"/></g>`;
 const foot=(x,a,col)=>`<g transform="rotate(${r2(a)} ${x} -9)"><rect x="${x-4.5}" y="-10" width="9" height="10" rx="3.5" fill="${col}" ${sw(2.2)}/></g>`;
 let eye;const ex=3,eyy=-3;
 if(o.eye==='closed')eye=`<path d="M-1 ${eyy} q4 3.5 8 0" fill="none" ${sw(2)}/>`;
 else if(o.eye==='happy')eye=`<path d="M-1 ${eyy+1} q4 -4 8 0" fill="none" ${sw(2)}/>`;
 else if(o.eye==='dizzy')eye=`<path d="M0 ${eyy-3} l6 6 M6 ${eyy-3} l-6 6" fill="none" ${sw(2)}/>`;
 else{const wide=o.eye==='wide',er=wide?5.8:4.6;eye=`<circle cx="${ex}" cy="${eyy}" r="${er}" fill="#fff" ${sw(2)}/><circle cx="${r2(ex+.8+o.px)}" cy="${r2(eyy+o.py)}" r="${wide?2:2.5}" fill="${OL}"/><circle cx="${r2(ex+o.px)}" cy="${r2(eyy-1+o.py)}" r=".8" fill="#fff"/>`;
  if(o.eye==='squint')eye+=`<path d="M${ex-5} ${eyy} a5 5 0 0 1 10 0 z" fill="${c}" ${sw(2)}/>`;}
 const head=`<g transform="translate(20 -30) rotate(${r2(o.headRot)})"><circle cx="-6" cy="-10" r="4.4" fill="${c}" ${sw(2.2)}/><circle cx="0" cy="0" r="12.5" fill="${c}" ${sw(2.6)}/><ellipse cx="10" cy="3" rx="8" ry="6.5" fill="${cl}" ${sw(2.2)}/><ellipse cx="16" cy="-1" rx="3.4" ry="2.6" fill="${OL}"/><rect x="8.5" y="7.5" width="7" height="7" rx="1.2" fill="#f0a830" ${sw(1.8)}/><path d="M12 7.5 v7" stroke="${OL}" stroke-width="1.3"/>${eye}<path d="M-2 ${eyy-7} L7 ${r2(eyy-7+o.brow)}" fill="none" ${sw(2)}/></g>`;
 const arm=`<g transform="rotate(${r2(o.armA)} 10 -24)"><rect x="6" y="-25" width="8" height="20" rx="4" fill="${cd}" ${sw(2.2)}/><circle cx="10" cy="-5" r="4.2" fill="${cd}" ${sw(2)}/></g>`;
 const chinArm=`<path d="M10 -24 Q22 -20 26 -18" fill="none" stroke="${OL}" stroke-width="9" stroke-linecap="round"/><path d="M10 -24 Q22 -20 26 -18" fill="none" stroke="${cd}" stroke-width="5" stroke-linecap="round"/>`;
 return`<g transform="translate(${r2(o.x)} ${r2(o.y)}) scale(${r2(sx)} ${r2(sy)})">${tail}${foot(-12,sn,cd)}${foot(10,-sn,cd)}<ellipse cx="0" cy="-18" rx="22" ry="16" fill="${c}" ${sw(2.6)}/><ellipse cx="7" cy="-14" rx="12" ry="10" fill="${cl}"/>${foot(-6,-sn,c)}${head}${o.chin?chinArm:arm}</g>`;}

function coyote(o){
 o=Object.assign({x:0,y:124,s:.72,face:1,ph:0,walk:0,sit:0,low:0,headRot:0,eye:'n',px:0,mouth:'',ears:0,blush:0,sq:0},o);
 // A trot: diagonal pairs swing together, the swinging pair lifts its paws, the body rides a small bounce.
 const c='#b59b6d',cd='#8c7550',cl='#ece0c4',sn=Math.sin(o.ph)*o.walk*26,cs=Math.cos(o.ph)*o.walk;
 const sx=o.s*o.face*(1+o.sq),sy=o.s*(1-o.sq),dy=7*o.low-1.6*Math.abs(cs);
 const lg=(x,a,col,h,up=0)=>`<g transform="rotate(${r2(a)} ${x} -20)"><rect x="${x-2.8}" y="${r2(-21-up)}" width="5.6" height="${r2(h)}" rx="2.6" fill="${col}" ${sw(2.2)}/></g>`;
 const lh=21-7*o.low;
 const liftA=3*Math.max(0,cs),liftB=3*Math.max(0,-cs);
 // Sitting down is one smooth fold (nothing switches at a halfway point): the hind legs swing
 // forward under him as the rump comes down, the haunch grows out of the body.
 const hind=`<g transform="translate(0 ${r2(11*o.sit)})">${lg(-15,sn-78*o.sit,cd,lh-liftA-5*o.sit)}${lg(-11,-sn-78*o.sit,c,lh-liftB-5*o.sit)}</g>`;
 let legs=hind+lg(12,-sn,cd,lh+14*o.sit-liftB,14*o.sit)+lg(16,sn,c,lh+14*o.sit-liftA,14*o.sit);
 const tailRot=o.low*38+30*o.sit+4*Math.sin(o.ph*2)*o.walk;
 const tail=`<g transform="rotate(${r2(tailRot)} -20 -25)"><path d="M-19 -27 Q-34 -30 -43 -17 Q-37 -14 -31 -19 Q-26 -21 -19 -21 z" fill="${c}" ${sw(2.2)}/><path d="M-43 -17 Q-41 -21 -37 -21 Q-38 -17 -40 -16 z" fill="${OL}"/></g>`;
 const body=`<g transform="translate(0 ${r2(dy+9*o.sit)}) rotate(${r2(-26*o.sit)} -14 -20)">${tail}<ellipse cx="0" cy="-26" rx="22" ry="10" fill="${c}" ${sw(2.6)}/><path d="M-12 -18 Q2 -14 14 -19" fill="none" stroke="${cl}" stroke-width="4" stroke-linecap="round"/>${o.sit>.02?`<ellipse cx="-12" cy="-17" rx="${r2(10*o.sit)}" ry="${r2(8*o.sit)}" fill="${c}" ${sw(2.2)}/>`:''}</g>`;
 let eye;const ex=2,eyy=-3;
 if(o.eye==='closed')eye=`<path d="M-1 ${eyy} q3.5 3 7 0" fill="none" ${sw(2)}/>`;
 else{const wide=o.eye==='wide',er=wide?5:4;eye=`<circle cx="${ex}" cy="${eyy}" r="${er}" fill="#fff" ${sw(2)}/><circle cx="${r2(ex+.8+o.px)}" cy="${eyy}" r="${wide?1.8:2.2}" fill="${OL}"/>${wide?`<circle cx="${ex-.6}" cy="${eyy-1.6}" r="1" fill="#fff"/>`:''}`;
  if(o.eye==='half')eye+=`<path d="M${ex-4.4} ${eyy+.3} a4.4 4.4 0 0 1 8.8 0 z" fill="${c}" ${sw(2)}/>`;}
 const jaw=o.mouth==='howl'?`<path d="M5 3 L20 3 L9 11 z" fill="#6a2a24" ${sw(1.8)}/><path d="M6 6 L18 9 L19 12 L8 10 z" fill="${c}" ${sw(1.8)}/>`:o.mouth==='squeak'?`<ellipse cx="13" cy="6" rx="2" ry="2.4" fill="#6a2a24" ${sw(1.6)}/>`:'';
 const ear=(x)=>`<g transform="rotate(${r2(-35*o.ears)} ${x} -6)"><path d="M${x-4} -5 L${x-2} -19 L${x+4} -7 z" fill="${c}" ${sw(2)}/></g>`;
 const head=`<g transform="translate(22 ${r2(-34+dy+(o.sit?-6*o.sit:0))}) rotate(${r2(o.headRot)})">${ear(-4)}${ear(2)}<circle cx="0" cy="0" r="9" fill="${c}" ${sw(2.4)}/><path d="M4 -4 L20 0 Q22 4 18 5 L5 6 z" fill="${c}" ${sw(2.2)}/><path d="M6 4 L17 4.6" stroke="${cl}" stroke-width="2"/><circle cx="20" cy="1" r="2.3" fill="${OL}"/>${jaw}${eye}${o.blush?`<ellipse cx="2" cy="4" rx="4" ry="2.2" fill="#e8786a" opacity="${r2(o.blush)}"/>`:''}</g>`;
 return`<g transform="translate(${r2(o.x)} ${r2(o.y)}) scale(${r2(sx)} ${r2(sy)})">${legs}${body}${head}</g>`;}

function pdog(o){
 o=Object.assign({x:0,y:0,s:.8,arms:0,eye:'n',px:0,py:0,mouth:'smile',blush:0,sway:0},o);
 const c='#c9a26b',cl='#ecd5a8';
 const a=o.arms*165;
 const armL=`<g transform="rotate(${r2(a+o.sway)} -9 -24)"><rect x="-12" y="-25" width="6" height="12" rx="3" fill="${c}" ${sw(2)}/></g>`;
 const armR=`<g transform="rotate(${r2(-a-o.sway)} 9 -24)"><rect x="6" y="-25" width="6" height="12" rx="3" fill="${c}" ${sw(2)}/></g>`;
 const E=(x)=>{if(o.eye==='closed')return`<path d="M${x-3} -38 q3 2.6 6 0" fill="none" ${sw(1.8)}/>`;let s=`<circle cx="${x}" cy="-38" r="3.8" fill="#fff" ${sw(1.8)}/><circle cx="${r2(x+o.px)}" cy="${r2(-38+o.py)}" r="1.9" fill="${OL}"/>`;if(o.eye==='half')s+=`<path d="M${x-4.2} -37.6 a4.2 4.2 0 0 1 8.4 0 z" fill="${c}" ${sw(1.8)}/>`;return s;};
 const mouth={smile:`<path d="M-3 -29 q3 2.6 6 0" fill="none" ${sw(1.6)}/>`,O:`<ellipse cx="0" cy="-28" rx="2.6" ry="3" fill="#6a2a24" ${sw(1.6)}/>`,frown:`<path d="M-3 -27.6 q3 -2.6 6 0" fill="none" ${sw(1.6)}/>`,grin:`<path d="M-4 -30 q4 5 8 0 z" fill="#6a2a24" ${sw(1.6)}/>`,flat:`<path d="M-3 -28.6 h6" ${sw(1.6)}/>`}[o.mouth];
 return`<g transform="translate(${r2(o.x)} ${r2(o.y)}) scale(${o.s})">${armL}${armR}<ellipse cx="0" cy="-16" rx="11" ry="16" fill="${c}" ${sw(2.4)}/><ellipse cx="0" cy="-13" rx="6.6" ry="10.5" fill="${cl}"/><circle cx="-8" cy="-44" r="3" fill="${c}" ${sw(1.8)}/><circle cx="8" cy="-44" r="3" fill="${c}" ${sw(1.8)}/><circle cx="0" cy="-36" r="10" fill="${c}" ${sw(2.4)}/><ellipse cx="0" cy="-31" rx="5.5" ry="3.8" fill="${cl}"/>${E(-4.2)}${E(4.2)}<ellipse cx="0" cy="-33" rx="2" ry="1.4" fill="${OL}"/>${mouth}${o.blush?`<ellipse cx="-6" cy="-31" rx="2.6" ry="1.5" fill="#e8786a" opacity="${o.blush}"/><ellipse cx="6" cy="-31" rx="2.6" ry="1.5" fill="#e8786a" opacity="${o.blush}"/>`:''}</g>`;}

function pipe(cx,cy,a){return`<g transform="translate(${r2(cx)} ${r2(cy)}) rotate(${r2(a)})"><rect x="-65" y="-4" width="130" height="8" rx="2" fill="#9aa4ae" ${sw(2.4)}/><path d="M-54 -1.4 H52" stroke="#cfd5da" stroke-width="1.6"/><rect x="-66" y="-5.2" width="10" height="10.4" rx="1.5" fill="#6d7782" ${sw(2.2)}/><rect x="56" y="-5.2" width="10" height="10.4" rx="1.5" fill="#6d7782" ${sw(2.2)}/></g>`;}
const SPIRAL='M0 0 A3 3 0 0 1 6 0 A6 6 0 0 1 -6 0 A9 9 0 0 1 12 0 A12 12 0 0 1 -12 0 A15 15 0 0 1 18 0 A18 18 0 0 1 -18 0 A21 21 0 0 1 24 0';
function bale(x,y,rot){return`<ellipse cx="${r2(x)}" cy="${GY+1}" rx="24" ry="4" fill="${OL}" opacity=".14"/><g transform="translate(${r2(x)} ${r2(y)}) rotate(${r2(rot)})"><circle r="27" fill="#e3c46c" ${sw()}/><path d="${SPIRAL}" fill="none" stroke="#b48f3c" stroke-width="2.2" stroke-linecap="round"/><path d="M-27 -3 l-4 -2 M-25 10 l-4 1 M20 -18 l3 -3 M8 26 l1 4" stroke="#b48f3c" stroke-width="1.8" stroke-linecap="round"/></g>`;}
const TWC={};
function tweed(r){if(TWC[r])return TWC[r];const R=rng(r*13+5);let p='';const n=15;for(let i=0;i<n;i++){const a=i/n*Math.PI*2,rr=r*(.84+R()*.3);p+=(i?'L':'M')+r2(Math.cos(a)*rr)+' '+r2(Math.sin(a)*rr);}p+='z';let arcs='';for(let i=0;i<6;i++){const a=R()*360,rx=r*(.4+R()*.5),ry=r*(.2+R()*.35);arcs+=`<ellipse rx="${r2(rx)}" ry="${r2(ry)}" transform="rotate(${r2(a)})" fill="none" stroke="#8b6a39" stroke-width="${r2(Math.max(1,r*.11))}"/>`;}return TWC[r]=`<path d="${p}" fill="#d2b373" ${sw(Math.max(1.6,r*.16))}/>${arcs}<path d="M${r2(-r*.5)} ${r2(-r*.2)} l${r2(r*.3)} ${r2(-r*.3)}" stroke="#f0dca6" stroke-width="${r2(Math.max(1,r*.12))}" stroke-linecap="round"/>`;}
function cloud(x,y,mood){const cs=[[-17,3,11],[0,-5,14],[17,2,11],[7,7,10],[-7,7,10]];let s=`<g transform="translate(${r2(x)} ${r2(y)})">`;s+=cs.map(([a,b,r])=>`<circle cx="${a}" cy="${b}" r="${r}" fill="${OL}" stroke="${OL}" stroke-width="5"/>`).join('');s+=cs.map(([a,b,r])=>`<circle cx="${a}" cy="${b}" r="${r}" fill="#f4f6fa"/>`).join('')+`<path d="M-22 9 Q0 15 22 9 Q14 15 0 15 Q-14 15 -22 9 z" fill="#d6dde8"/>`;
 const face={smug:`<circle cx="-5" cy="1" r="1.9" fill="${OL}"/><circle cx="5" cy="1" r="1.9" fill="${OL}"/><path d="M-3 6 q4 3 8 -1" fill="none" ${sw(1.8)}/>`,mad:`<path d="M-8 -1 l5 2 M8 -1 l-5 2" ${sw(1.8)}/><path d="M-3 8 q3 -3 6 0" fill="none" ${sw(1.8)}/>`,grin:`<path d="M-7 0 q2 -3 4 0 M3 0 q2 -3 4 0" fill="none" ${sw(1.8)}/><path d="M-5 5 q5 7 10 0 z" fill="#6b2a20" ${sw(1.6)}/>`}[mood];
 return s+face+'</g>';}
function rain(cx,top,stop,t,n=6,sp=150,col='#4f8fd8'){let s='';const len=stop-top;if(len<4)return'';for(let i=0;i<n;i++){const x=cx-17+i*(34/(n-1));const yy=top+((t*sp+i*17)%len);s+=`<path d="M${r2(x-1)} ${r2(yy)} l-1.5 6" stroke="${col}" stroke-width="2" stroke-linecap="round"/>`;}return s;}
function umbrella(u){const w=r2(26*Math.max(.14,u)),d=r2(4+14*u);return`<path d="M0 -44 V2" stroke="${OL}" stroke-width="2.4"/><path d="M0 -44 q0 -5 -4 -5 q-4 0 -4 4" fill="none" stroke="${OL}" stroke-width="2.4" stroke-linecap="round"/><path d="M${-w} 2 Q0 ${2+d*2} ${w} 2 Q${r2(w*.5)} -2 0 1 Q${r2(-w*.5)} -2 ${-w} 2 z" fill="#d9483a" ${sw(2.4)}/><path d="M0 1 V${r2(2+d)}" stroke="${OL}" stroke-width="1.4"/><path d="M0 ${r2(2+d)} v4" stroke="${OL}" stroke-width="2.4"/>`;}
function blob(cx,cy,rx,ry,seed){const R=rng(seed),n=12;let pts=[];for(let i=0;i<n;i++){const a=i/n*Math.PI*2,k=.82+R()*.3;pts.push([cx+Math.cos(a)*rx*k,cy+Math.sin(a)*ry*k]);}
 let d='';for(let i=0;i<n;i++){const p0=pts[i],p1=pts[(i+1)%n],mx=(p0[0]+p1[0])/2,my=(p0[1]+p1[1])/2;d+=(i?'':`M${r2((pts[n-1][0]+p0[0])/2)} ${r2((pts[n-1][1]+p0[1])/2)} `)+`Q${r2(p0[0])} ${r2(p0[1])} ${r2(mx)} ${r2(my)} `;}return d+'z';}
const MUSKEG=(()=>{let s='';[[150,152,40,8.5,4],[92,161,16,4,9],[352,147,13,3.6,13]].forEach(([x,y,rx,ry,sd])=>{s+=`<path d="${blob(x,y,rx,ry,sd)}" fill="#4f4a2c" ${sw(2.4)}/><path d="${blob(x-rx*.3,y-ry*.35,rx*.3,ry*.25,sd+1)}" fill="#6f6b47"/>`;});
 s+=`<path d="M192 151 q2 -16 0 -24 M198 152 q-1 -12 2 -19 M108 160 q1 -10 -1 -15" fill="none" stroke="#6d7a3a" stroke-width="2.2" stroke-linecap="round"/><rect x="189.5" y="122" width="5" height="10" rx="2.5" fill="#6b4a30" ${sw(1.6)}/><rect x="104.5" y="141" width="4.4" height="8" rx="2.2" fill="#6b4a30" ${sw(1.4)}/>`;return s;})();

/* The game moved ONE thing in the scenery above: the small left puddle and its cattail stand 54 px
   further right (at 92, not 38), clear of the sleepy worker's spot by the screen's left edge. */
export { GY, OL, C, MUSKEG, bale, sfx, r2, rng, tuft, worker as w3worker, cat, beaver, coyote, pdog };
function tuft(x,y,c){return`<path d="M${x-4} ${y} l2 -6 l2 6 l2 -5 l2 5" fill="none" stroke="${c}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>`;}

/* ================= gags ================= */
/* Each: beats [time, name, what happens] in the reference's clock, `dur` (the reference's length),
   `still` (the moment shown with reduced motion and on its log card), `lead(E)` / `tail(E)` (see
   the top of this file), `render(t, E)`. */
export const WAVE3 = {};
const off = (x, E) => x > -45 - E && x < 445 + E;

/* 1. Muskeg Boots */
WAVE3.muskeg = { name:'Muskeg Boots', dur:9.6, still:3.1,
 beats:[[0,'walks-in','Walks in, whistling.'],[2.0,'squelch','Squelches into the big muskeg puddle.'],[2.8,'stuck','Back boot gets stuck. Tug, tug.'],[3.2,'shluck','SHLUCK! His foot pops out in a fuzzy sock.'],[3.6,'looks-back','Past the puddle. Looks back at the boot, then at his sock.'],[4.3,'shrugs','Shrugs.'],[4.9,'limps-off','Limps off, one leg taller than the other.'],[5.0,'boot-sinks','Behind him, the boot slowly sinks.'],[8.7,'blup','Last bubble. Blup. Empty puddle.']],
 lead:E=>E/75, tail:E=>E/66.47,
 x(t){return t<0?-40+75*t:t>8.3?440+66.47*(t-8.3):kf(t,[[0,-40],[2.0,110,'lin'],[2.8,152,'lin'],[3.2,164,'lin'],[3.6,214,'out'],[4.9,214],[8.3,440,'lin']]);},
 focus(t){return{x:clamp(this.x(t),40,350),y:112};},
 render(t,E=0){
  let s=`<defs><clipPath id="clipMud"><rect x="${-50-E}" y="-50" width="${500+2*E}" height="202"/></clipPath><clipPath id="clipBoot"><rect x="96" y="0" width="110" height="151"/></clipPath></defs>`;
  // the stuck boot sinks slowly
  if(t>=3.2&&t<8.9){const d=kf(t,[[3.2,0],[5.0,1],[8.6,15,'in']]),tip=8*Math.sin(t*1.6)*seg(t,3.2,4)+kf(t,[[5.0,0],[8.6,-14]]);
   s+=`<g clip-path="url(#clipBoot)"><g transform="translate(146 ${r2(151+d)}) rotate(${r2(tip)})"><rect x="-4.5" y="-11" width="9" height="12" rx="2" fill="${C.boot}" ${sw(2)}/><path d="M-4.5 -8 h9" stroke="#6d4c35" stroke-width="1.6"/></g></g><ellipse cx="146" cy="151" rx="${r2(7-3*seg(t,7,8.6))}" ry="1.8" fill="#3e3a22"/>`;}
  if(t>5.6&&t<9.2){for(let k=0;k<3;k++){const st=[5.6,7.1,8.6][k],ph=(t-st)/.55;if(ph>0&&ph<1)s+=`<circle cx="${146+[-3,4,0][k]}" cy="${r2(148-ph*8)}" r="${r2(1.4+ph*2)}" fill="#6d6a45" ${sw(1.4)}/>`;}}
  if(t>8.6&&t<9.3)s+=sfx(164,GY-14,'blup',10,-8,'#fff');
  const x=this.x(t);
  if(off(x,E)){
   const inMud=x>112&&x<188;
   const walking=t<2.8||inr(t,3.2,3.6)||t>=4.9;
   let p={x,y:GY+(inMud?4:0),clip:'clipMud',mouth:'smile',sockB:t>=3.2};
   const lame=t>=4.9;
   if(walking){Object.assign(p,walk(x/(inMud?7:8.5),inMud?20:26));
    if(lame){const ph=x/8.5,sn=Math.sin(ph);p.bob=-1.2*Math.abs(Math.cos(ph))+3.2*Math.max(0,-sn);p.lean=2+2*Math.max(0,-sn);p.headRot=1.5*Math.max(0,-sn);}}
   if(t<2.0){p.eye='happy';p.mouth='o';}
   else if(t<2.8){p.mouth='flat';p.py=3;}
   else if(t<3.2){p.legF=-14;p.legB=kf(t,[[2.8,18],[3.2,34]]);p.lean=kf(t,[[2.8,4],[3.2,12]])+Math.sin(t*40)*2;p.armF=-30;p.armB=24;p.eye='wide';p.mouth='grit';}
   else if(t<3.6){p.eye='wide';p.mouth='O';}
   else if(t<4.3){if(t<3.95){p.headRot=-6;p.px=-3;p.mouth='flat';}else{p.py=4;p.headRot=10;p.mouth='frown';}}
   else if(t<4.9){const k=Math.sin(Math.PI*seg(t,4.3,4.8));p.armF=-35*k;p.armB=35*k;p.bob=-3*k;p.eye='half';p.mouth='flat';p.headRot=-4*k;}
   else{p.mouth='smile';p.eye=(t>6.4&&t<6.55)?'closed':'n';}
   s+=worker(p);}
  if(t<2.0){for(let k=0;k<2;k++){const ph=((((t*1.4+k*.5)%1)+1)%1);s+=note(x+16+ph*10,GY-62-ph*18,1-ph);}}
  if(t>2.0&&t<2.8){const ph=((t-2)*2.4)%1;s+=`<circle cx="${r2(x-6+ph*4)}" cy="${r2(147-ph*6)}" r="1.6" fill="${C.mud}" opacity="${r2(1-ph)}"/>`;}
  if(t>3.2&&t<3.8)s+=sfx(170,GY-74,'SHLUCK!',15,-8,'#f4c430',.6+.4*seg(t,3.2,3.32));
  return s;}};

/* 2. Cat Train */
const TRAIN_V=652/7, MOM_BACK_V=178/1.4, MOM_OFF_V=188/1.4;
WAVE3.catTrain = { name:'Cat Train', dur:12.4, still:7.0,
 beats:[[0,'train','Mother cat leads four kittens across, nose to tail.'],[4.05,'kitten-sits','The last kitten stops and sits.'],[4.6,'yawn','Big yawn.'],[5.2,'asleep','Curls up and falls asleep. Zs.'],[6.6,'mom-returns','Mom walks back in, looking for it.'],[8.0,'sigh','Stops over the kitten. Long sigh.'],[8.5,'scruff','Picks it up by the scruff.'],[9.3,'unimpressed','Looks at the player, unimpressed. Slow blink.'],[10.3,'hop-turn','Hop-turn.'],[10.6,'walks-off','Walks off with the kitten. Still asleep.']],
 lead:E=>E/TRAIN_V, tail:E=>E/MOM_OFF_V,
 // The train keeps the reference's speed and simply runs on (in the reference it stops at 612, out of sight).
 train(t){return -40+TRAIN_V*t;},
 // When the mother turns back: once she is out of sight on the right, and in time to walk back in
 // at the reference's speed. (On a very short strip the screen is so wide that she has to hurry.)
 turn(E){return Math.min(6.6-E/MOM_BACK_V,Math.max((480+E)/TRAIN_V,0));},
 gone(E){return (480+E)/TRAIN_V;},
 mom(t,E=0){
  if(t>=6.6)return t>12.0?440+MOM_OFF_V*(t-12.0):kf(t,[[6.6,430],[8.0,252,'lin'],[10.6,252],[12.0,440,'lin']]);
  const back=6.6-E/MOM_BACK_V, gone=this.gone(E);
  if(back>=gone)return t<back?this.train(t):430+(6.6-t)*MOM_BACK_V;
  // no time to do it at a walk: from where the train took her out of sight, straight back to her mark
  return t<gone?this.train(t):lerp(430+E+50,430,seg(t,gone,6.6));},
 focus(t){const tr=this.train(t);if(t<4.05)return{x:tr-55,y:128};if(t<6.6)return{x:232,y:128};return{x:this.mom(t),y:124};},
 render(t,E=0){
  let s='';
  const tr=this.train(t);
  const K=[{c:'#f3efe6',cd:'#cfc8ba'},{c:'#4f4857',cd:'#3b3542'},{c:'#f3efe6',cd:'#e09a4c'},{c:'#e39b4f',cd:'#b8702e'}];
  // kittens 1-3
  for(let i=0;i<3;i++){const kx=tr-30-25*i;if(kx>-30-E&&kx<430+E)s+=cat(Object.assign({x:kx,s:.55,ph:kx/6.5+i,walk:1,tail:1},K[i]));}
  // kitten 4 (the sleepy one)
  const k4x=Math.min(tr-105,232);const carried=t>=8.9;
  if(!carried&&k4x>-30-E){const moving=tr-105<232;const sit=es(t,4.15,4.5),sleep=es(t,5.2,5.8);
   s+=cat(Object.assign({x:k4x,s:.55,ph:k4x/6.5+3,walk:moving?1:0,sit:sleep>.5?0:sit,sleep,eye:(inr(t,4.6,5.2)||sleep>.3)?'closed':'n',mouth:inr(t,4.65,5.15)?'yawn':''},K[3]));}
  // mom
  const mx=this.mom(t,E);const back=Math.min(6.6-E/MOM_BACK_V,6.4),gone=this.gone(E);
  let face=t<Math.max(Math.min(back,6.4),Math.min(gone,6.59))?1:(t<10.45?-1:1);
  const mwalk=t<8.0||t>=10.6;
  if(mx>-40-E&&mx<440+E){let m={x:mx,s:.85,face,ph:mx/7,walk:mwalk?1:0,tail:1};
   m.y=GY+hop(t,10.3,10.6,6);
   if(inr(t,8.0,8.5)){m.eye='half';m.sq=.05*Math.sin(Math.PI*seg(t,8.0,8.5));}
   if(t>=8.0&&t<10.3){m.headRot=kf(t,[[8.0,0],[8.5,0],[8.85,30],[9.2,-4],[9.5,0]]);m.eye=(t>9.8&&t<9.95)?'closed':(t>=8.5?'half':m.eye||'n');}
   if(t>=10.3)m.eye='half';
   if(carried){const kitten=cat(Object.assign({x:-9,y:24,s:.647,dangle:1,eye:'closed'},K[3]));m.carry=`<g transform="translate(11 5) rotate(${r2(-(m.headRot||0)+Math.sin(t*4)*4)})">${kitten}</g>`;}
   s+=cat(m);}
  return s;},
 // Zs: drawn over the lane aspen, as in the reference.
 over(t,E=0){
  let s='';const tr=this.train(t),k4x=Math.min(tr-105,232),carried=t>=8.9,mx=this.mom(t,E),face=t<10.45?-1:1;
  if(t>5.8&&(t<12.2||mx<440+E)){const zx=carried?(mx+(face>0?20:-20)):k4x+10,zy=carried?GY-40:GY-26;for(let k=0;k<3;k++){const ph=((t*.7+k/3)%1);s+=zz(zx+ph*12,zy-ph*20,Math.sin(Math.PI*ph),.8+ph*.5);}}
  return s;}};

/* 3. Beaver */
const BEAVER_IN=293/2.2, BEAVER_OUT=143/1.4;
WAVE3.beaver = { name:'Beaver', dur:11.4, still:5.6,
 beats:[[0,'waddles-in','Waddles in with a pipe joint balanced on his head.'],[2.2,'bonk','BONK. The pipe hits the aspen.'],[2.5,'glares','Shakes it off, backs up, glares at the tree.'],[3.3,'bonk-again','Crouch, charge, BONK again. Dizzy.'],[4.2,'thinks','Thinks it over.'],[4.6,'idea','Idea!'],[4.8,'tilts-pipe','Tilts the pipe upright.'],[6.2,'squeezes-past','Squeezes past behind the tree, pipe straight up.'],[8.4,'lowers','Lowers it on the far side.'],[9.0,'proud','Chin up, proud. Two tail slaps.'],[9.6,'waddles-off','Waddles off with his pipe.']],
 lead:E=>E/BEAVER_IN, tail:E=>E/BEAVER_OUT,
 bx(t){return t<0?-80+BEAVER_IN*t:t>11.0?495+BEAVER_OUT*(t-11.0):kf(t,[[0,-80],[2.2,213,'lin'],[2.5,213],[3.0,192],[3.3,192],[3.45,188],[3.6,213,'in'],[3.8,200,'out'],[6.2,200],[8.4,352,'lin'],[9.6,352],[11.0,495,'lin']]);},
 focus(t){return{x:this.bx(t)+20,y:110};},
 render(t,E=0){
  let s='';
  const bx=this.bx(t);
  const walking=t<2.2||inr(t,6.2,8.4)||t>=9.6||inr(t,2.5,3.0);
  const wob=(t0)=>t>t0?4*Math.sin((t-t0)*40)*Math.exp(-(t-t0)*6):0;
  // ONE SIMPLE TWIST (Jay, Oct 6; no baton spin): tilt it upright, carry it upright past the aspen, tilt it back down.
  const up=kf(t,[[4.8,0],[5.7,1],[8.4,1],[9.0,0]]);
  const pa=-90*up+wob(2.2)+wob(3.6)*1.6;
  const lift=up;
  const bob=walking?-1.5*Math.abs(Math.cos(bx/5)):0;
  const pcy=lerp(GY-38,GY-72,lift)+bob, pcx=bx+8;
  s+=pipe(pcx,pcy,pa);
  let b={x:bx,ph:bx/5,walk:walking?1:0,brow:3,armA:lerp(-168,-178,lift)};
  b.y=GY+bob*.5;
  if(t<2.2){b.eye='n';}
  if(inr(t,2.2,2.6)){b.eye='wide';b.sq=.18*Math.exp(-(t-2.2)*8);b.brow=0;}
  if(inr(t,2.6,3.0)){b.headRot=Math.sin((t-2.6)*30)*8;b.eye='squint';}
  if(inr(t,3.0,3.3)){b.eye='squint';b.brow=5;b.py=-1.5;}
  if(inr(t,3.3,3.45)){b.sq=.14;b.brow=6;b.eye='squint';}
  if(inr(t,3.45,3.6)){b.sq=-.1;b.eye='wide';}
  if(inr(t,3.6,4.2)){b.sq=.2*Math.exp(-(t-3.6)*5);b.eye='dizzy';}
  if(inr(t,4.2,4.6)){b.eye='squint';b.brow=-2;b.headRot=-8;b.px=-1;}
  if(inr(t,4.6,4.8)){b.eye='wide';b.sq=-.08;}
  if(inr(t,4.8,6.2)){b.eye='wide';b.py=-2;}
  if(inr(t,6.2,8.4)){b.eye='n';b.brow=-1;b.headRot=-6;}
  if(inr(t,8.4,9.0)){b.eye='n';}
  if(inr(t,9.0,9.6)){b.eye='happy';b.headRot=-14;b.tail=kf(t,[[9.0,0],[9.12,-38],[9.22,8],[9.36,-38],[9.46,8],[9.6,0]]);}
  if(t>=9.6){b.eye='happy';b.headRot=-8;}
  s+=beaver(b);
  return s;},
 // Sound words, stars and the idea: over the lane aspen, as in the reference.
 over(t){
  let s='';const bx=this.bx(t);
  if(t>2.2&&t<2.75)s+=sfx(280,GY-58,'BONK!',15,-10,'#f4c430',.7+.3*seg(t,2.2,2.3));
  if(t>3.6&&t<4.2)s+=sfx(278,GY-60,'BONK!',19,8,'#f4c430',.7+.3*seg(t,3.6,3.7));
  if(t>3.65&&t<4.6){for(let k=0;k<3;k++){const a=t*7+k*2.1;const sx=bx+16+Math.cos(a)*11,sy=GY-44+Math.sin(a)*3.5;s+=`<path d="M${r2(sx)} ${r2(sy-3.4)} l1 2.4 2.6 .2 -2 1.6 .7 2.6 -2.3 -1.4 -2.3 1.4 .7 -2.6 -2 -1.6 2.6 -.2 z" fill="#f4c430" ${sw(1)}/>`;}}
  if(t>4.6&&t<4.9)s+=sfx(bx+30,GY-52,'!',18,0,'#fff');
  if(t>9.1&&t<9.55)s+=sfx(bx-30,GY-6,'slap',9,0,'#fff',.9);
  return s;}};

/* 4. Aurora Howl (in the sky band: the ridge's ground line is y 124, the lease's top berm y 144) */
const COY_IN=240/2.0, COY_OUT=250/2.0;
/** He slows to his stop and gets going again over this long (s): no dead stop, no standing start. */
const COY_EASE=0.5;
WAVE3.aurora = { name:'Aurora Howl', dur:11.6, still:4.4, H:140,
 beats:[[0,'lights','Northern lights ripple in over the tree line.'],[0.8,'trots-in','A coyote trots in along the ridge.'],[2.8,'amazed','Stops. Looks up, amazed.'],[3.3,'sits','Sits. Big breath in.'],[3.9,'howls','Howls at the lights.'],[5.0,'squeak','His voice cracks. Squeak.'],[5.4,'freezes','Freezes. Eyes dart left and right. Ears down.'],[6.4,'cough','Tiny cough.'],[6.8,'slinks-off','Slinks off low, tail tucked. One glance back.'],[10.2,'lights-fade','The lights fade out.']],
 // He needs E/COY_IN more seconds to trot in; the first 0.8 s (lights only) is there already.
 lead:E=>Math.max(0,E/COY_IN-0.8+COY_EASE/2), tail:E=>Math.max(0,9.0+COY_EASE/2+E/COY_OUT+0.3-11.6),
 cx(t){const run=(u)=>u<COY_EASE?u*u/(2*COY_EASE):u-COY_EASE/2;return t<2.8?190-COY_IN*run(2.8-t):t>7.0?190+COY_OUT*run(t-7.0):190;},
 /** How much he is trotting, 0 to 1: it fades with his speed, so his legs settle as he stops. */
 pace(t){return io(clamp(t<2.8?(2.8-t)/COY_EASE:t>7.0?(t-7.0)/COY_EASE:0));},
 /** From here on he is BEHIND the front tree line (0 to 1: the game fades him from over the trees to behind them). */
 behind(t){return es(t,6.75,7.05);},
 focus(t){return{x:clamp(this.cx(t)+10,60,330),y:88};},
 // The lights: bands right across the sky, however wide the screen (x0 to x1 in the reference's units).
 lights(t,x0=-10,x1=400){
  const aur=es(t,0,1.5)*(1-es(t,10.2,11.4));
  if(aur<=0)return'';
  const band=(y0,amp,th,c,op,sp,ph)=>{let top='',bot='';for(let x=x0;x<=x1+19;x+=20){const y=y0+amp*Math.sin(x*.018+t*sp+ph)+6*Math.sin(x*.05+t*sp*1.7);top+=(x===x0?'M':'L')+r2(x)+' '+r2(y)+' ';bot=`L${r2(x)} ${r2(y+th+8*Math.sin(x*.03+t+ph))} `+bot;}return`<path d="${top}${bot}z" fill="${c}" opacity="${r2(op*aur)}"/>`;};
  return band(26,10,26,'#8fe8b4',.32,.9,0)+band(40,12,18,'#5fd6a0',.45,1.2,1.7)+band(18,8,12,'#c79af0',.25,.7,3.1);},
 render(t,E=0){
  let s='';
  const x=this.cx(t);if(x<-45-E||x>440+E)return s;
  let o={x,ph:x/6,walk:this.pace(t)};
  o.sit=es(t,3.3,3.7)*(1-es(t,6.7,6.95));
  o.low=es(t,6.8,7.1);
  o.headRot=kf(t,[[2.8,0],[3.1,-25],[3.7,-25],[3.9,-58],[5.0,-58],[5.08,-44],[5.3,-56],[5.6,-8],[6.7,-4],[7.0,4]]);
  if(inr(t,2.8,3.9))o.eye='wide';
  if(inr(t,3.9,5.0)){o.eye='closed';o.mouth='howl';}
  if(inr(t,5.0,5.4)){o.eye='wide';o.mouth='squeak';}
  if(inr(t,5.4,6.8)){o.px=kf(t,[[5.6,0],[5.75,-2.4],[6.0,-2.4],[6.15,2.4],[6.4,2.4],[6.5,0]]);o.ears=1;o.blush=.8;}
  if(t>=6.8){o.eye='half';o.ears=1;o.blush=.5*(1-seg(t,7.5,8.5));if(inr(t,7.5,7.9))o.px=-2.2;}
  if(inr(t,3.3,3.7))o.sq=-.06*Math.sin(Math.PI*seg(t,3.3,3.7));
  s+=coyote(o);
  if(t>4.0&&t<5.0){for(let k=0;k<3;k++){const ph=((t-4.0)*1.2+k/3)%1;s+=note(x+18+ph*20,124-46-ph*30,Math.sin(Math.PI*ph),'#f3ebcf');}}
  if(t>5.02&&t<5.6){const k=seg(t,5.02,5.6);s+=`<g transform="translate(${r2(x+26)} ${r2(70-k*8)}) rotate(${r2(Math.sin(t*40)*14)})">${note(0,0,1-k*.4,'#f6b0b8')}</g>`;}
  if(t>6.4&&t<6.75){const k=seg(t,6.4,6.75);s+=`<circle cx="${r2(x+24+k*6)}" cy="${r2(100-k*4)}" r="${r2(2+k*3)}" fill="#cfd6e6" opacity="${r2(1-k)}"/>`;}
  return s;}};

/* ================= Bakken ================= */

/* 5. Tumbleweed */
const FAM_V=660/5.8;
WAVE3.tumbleweed = { name:'Tumbleweed', dur:11.2, still:7.4,
 beats:[[0,'bounces-in','One tumbleweed bounces in.'],[2.2,'stops','Stops in the middle. Rocks. A little hop.'],[3.2,'rolls-back','Rolls back off the way it came.'],[4.2,'empty','Beat. Empty prairie.'],[5.0,'family','It comes back with the whole family.'],[6.0,'falls-behind','The littlest one falls behind.'],[7.8,'leap','Big leap to catch up.'],[9.5,'rolls-off','Family rolls off. The little one is last out.']],
 // It bounces in slowing down (its speed at t = 0 is 2 x 230 / 2.2) and rolls back speeding up (490 at the edge).
 lead:E=>E/(460/2.2), tail:E=>E/FAM_V,
 one(t){return t<0?-30+(460/2.2)*t:t<2.2?kf(t,[[0,-30],[2.2,200,'out']]):t>4.2?-45-490*(t-4.2):kf(t,[[2.2,200],[3.2,200],[4.2,-45,'in']]);},
 fam(t){return -40+FAM_V*(t-5.0);},
 focus(t){if(t<4.3)return{x:clamp(this.one(t),40,350),y:120};const xf=this.fam(t);return{x:clamp(xf-90,40,350),y:120};},
 render(t,E=0){
  let s='';
  const draw=(x,r,bh,nb,spin,prog,sq=0)=>{const by=Math.abs(Math.sin(prog*Math.PI*nb))*bh;const contact=1-Math.min(1,by/4);const sqv=sq||.14*contact*(bh>0?1:0);const y=GY-r-by+r*sqv*.5;return`<ellipse cx="${r2(x)}" cy="${GY+1}" rx="${r2(r*.8)}" ry="2.4" fill="${OL}" opacity="${r2(.12*contact)}"/><g transform="translate(${r2(x)} ${r2(y)}) scale(${r2(1+sqv)} ${r2(1-sqv)}) rotate(${r2(spin)})">${tweed(r)}</g>`;};
  // the one on its own: until it is out of sight again
  if(t<4.2+E/490+.1){const x=this.one(t);let bh=0,nb=0,prog=0;
   if(t<2.2){prog=t/2.2;bh=14*(1-Math.max(0,prog)*.7);nb=4;}
   else if(t<3.2){if(t>2.7&&t<2.95){bh=6;nb=1;prog=seg(t,2.7,2.95);}}
   else{prog=(t-3.2);bh=10;nb=3;}
   let rot=(x/13)*57.3;if(inr(t,2.2,2.7))rot+=Math.sin((t-2.2)*14)*8*Math.exp(-(t-2.2)*3);
   if(x>-30-E)s+=draw(x,13,bh,nb,rot,prog);}
  // the family: from the screen's edge, at the reference's speed
  if(t>=5.0-E/FAM_V){const xf=this.fam(t);
   const lag=40*es(t,6.0,7.6)-40*es(t,7.8,8.6);
   const F=[[0,20,9],[-55,16,10],[-100,13,12],[-140,10,13],[-178-lag,7,9]];
   F.forEach(([off,r,bh],i)=>{const x=xf+off;if(x<-30-E||x>420+E)return;let b=bh,nb=Math.round((640)/(r*7));let prog=(x+40)/460;
    if(i===4&&t>7.8&&t<8.6){b=26;nb=1;prog=seg(t,7.8,8.6);}
    s+=draw(x,r,b,nb,(x/r)*57.3,prog);});}
  return s;}};

/* 6. Prairie Dog Wave */
const MX=[40,92,144,196,248,300];
WAVE3.pdogs = { name:'Prairie Dog Wave', dur:10.2, still:6.0,
 beats:[[0,'plain','Plain prairie. No holes.'],[0.6,'first-dog','Fresh dirt pushes up. One prairie dog pops out and looks around.'],[1.6,'spots-player','Spots the player.'],[1.8,'wave','Stadium wave! Left to right.'],[3.3,'missed-cue','The last one misses his cue.'],[4.2,'late','He pops up late, arms up, all alone.'],[5.0,'nobody','Looks around. Nobody.'],[5.5,'solo-wave','Sad, slow solo wave.'],[6.8,'stare','Everyone pops up and stares at him.'],[7.3,'awkward','Awkward grin.'],[7.8,'duck','All duck at once. The dirt settles flat.'],[8.4,'tiny-wave','He pops up for one tiny wave. Gone. Ground is plain again.']],
 lead:()=>0, tail:()=>0,
 up(i,t){if(i===0)return kf(t,[[0.6,0],[0.85,1,'out'],[2.6,1],[2.85,0,'in'],[6.8,0],[7.0,1,'out'],[7.8,1],[8.0,0,'in']]);
  if(i<5){const w=1.8+.3*i;return kf(t,[[w-.25,0],[w,1,'out'],[w+.6,1],[w+.85,0,'in'],[6.8,0],[7.0,1,'out'],[7.8,1],[8.0,0,'in']]);}
  return kf(t,[[4.2,0],[4.45,1,'out'],[7.8,1],[8.0,0,'in'],[8.4,0],[8.6,1,'out'],[8.85,1],[9.05,0,'in']]);},
 arms(i,t){if(i===0)return kf(t,[[1.8,0],[2.0,1],[2.3,1],[2.5,0]]);if(i<5){const w=1.8+.3*i;return kf(t,[[w,0],[w+.15,1],[w+.4,1],[w+.55,0]]);}
  return kf(t,[[4.5,0],[4.7,1],[5.0,1],[5.15,.25],[5.5,.25],[6.0,1],[6.3,1],[6.8,.1],[8.55,.1],[8.65,1],[8.85,0]]);},
 focus(t){if(t<1.8)return{x:60,y:126};if(t<4.0)return{x:clamp(60+(t-1.8)/.3*55,60,280),y:126};if(t<6.8||t>8.1)return{x:310,y:126};return{x:250,y:126};},
 render(t){
  let s=`<defs>${MX.map((m,i)=>`<clipPath id="pd${i}"><rect x="${m-30}" y="0" width="60" height="${GY-6}"/></clipPath>`).join('')}</defs>`;
  let any=false;
  MX.forEach((m,i)=>{
   // fresh dirt: the mound pushes up just before the dog, then settles back flat after he is gone
   const dug=Math.max(...[-0.18,-0.08,0,0.15,0.3,0.45,0.6].map(o=>this.up(i,t-o)));
   if(dug>0.01){any=true;const k=io(clamp(dug)),w=r2(17*(.55+.45*k)),hgt=r2(7*k);
    s+=`<path d="M${m-w} ${GY+1} Q${m-w*.45} ${GY+1-hgt*1.3} ${m} ${GY+1-hgt*1.15} Q${m+w*.45} ${GY+1-hgt*1.3} ${m+w} ${GY+1} z" fill="#b9935f" stroke="${OL}" stroke-width="${r2(2*k)}" stroke-linejoin="round" opacity="${r2(clamp(k*1.6))}"/><path d="M${r2(m-w*.5)} ${r2(GY-hgt*.6)} q${r2(w*.3)} ${r2(-hgt*.5)} ${r2(w*.6)} ${r2(-hgt*.35)}" fill="none" stroke="#d2b07a" stroke-width="${r2(1.8*k)}" stroke-linecap="round"/><ellipse cx="${m}" cy="${r2(GY-hgt+1)}" rx="${r2(8*k)}" ry="${r2(2.8*k)}" fill="#3b2a1c"/>`;}
   const u=this.up(i,t),du=u-this.up(i,t-.06);
   if(du>0.01&&u<0.85){for(let f=0;f<5;f++){const a=(-.5+f/4)*2.2,d=5+u*16;s+=`<circle cx="${r2(m+Math.sin(a)*d)}" cy="${r2(GY-7-Math.cos(a)*d*.9+u*u*10)}" r="${r2(1.6-u)}" fill="#a07d4e" ${sw(.8)}/>`;}}
   if(u<=0.01)return;
   let o={x:m,y:GY-6+(1-u)*44,arms:this.arms(i,t),mouth:'smile'};
   if(i===0&&inr(t,0.9,1.6)){o.px=t<1.25?-2:2;o.mouth='flat';}
   if(i===0&&inr(t,1.6,1.8)){o.py=.6;o.mouth='grin';}
   if(i<5&&o.arms>.3&&t<4)o.mouth='O';
   if(i<5&&inr(t,6.8,7.8)){o.eye='half';o.px=i===4?2:2;o.mouth='flat';}
   if(i===5){if(inr(t,4.45,5.0)){o.mouth='grin';}else if(inr(t,5.0,5.5)){o.px=-2;o.mouth='flat';}else if(inr(t,5.5,6.8)){o.mouth='frown';o.eye='half';o.sway=Math.sin(t*5)*6;}else if(inr(t,6.8,7.8)){o.px=-2;o.mouth=t>7.25?'grin':'flat';o.blush=t>7.25?.8:0;}else if(t>8.4){o.mouth='grin';}}
   s+=`<g clip-path="url(#pd${i})">${pdog(o)}</g>`;});
  // (Nothing dug: the prairie is plain, and nothing at all is drawn.)
  return any?s:'';}};

/* 7. Runaway Bale (the bale is permanent Bakken scenery: scene-stage.ts hides its own while this one plays) */
const BALE_X=352, RANCH_V=500/2.4, RANCH_OFF_V=327/2.1;
WAVE3.bale = { name:'Runaway Bale', dur:11.8, still:5.4, line:{from:1.25,to:2.4},
 beats:[[0,'jolt','Bump! The bale jolts.'],[0.5,'rolls-away','It rolls away, off the right side.'],[1.0,'chase','The landowner runs after it. "Hey!"'],[3.4,'empty','Beat. Empty field.'],[4.0,'pushes-back','The bale rolls back in from the left. He is pushing it.'],[6.6,'got-it','Got it. Leans on it, wipes his brow.'],[7.2,'thumbs-up','Steps back. Thumbs up.'],[7.6,'one-more-inch','The bale rolls one more inch.'],[8.2,'sigh','Long sigh. Shoulders drop.'],[9.0,'walks-off','Hop-turn and walks off.']],
 // He runs in from the left at t = 1.0: on a wide screen he sets off a little sooner (never before the bump).
 lead:()=>0, tail:E=>E/RANCH_OFF_V,
 // When the two of them are out of sight on the right, and when they come back in on the left.
 swap(E){return Math.min(3.9,Math.max(3.4+E/RANCH_V,2.0+E/157.3))+.02;},
 bx(t,E=0){
  if(t<0.5)return BALE_X+1.6*Math.sin(t*70)*(1-Math.max(0,t)/.5);
  if(t<this.swap(E))return t<2.0?kf(t,[[0.5,BALE_X],[2.0,470,'in']]):470+157.3*(t-2.0);
  if(t<7.6){const back=kf(t,[[4.0,-60],[6.6,344,'out']]);return t<4.0?Math.max(-60-E-40,-60-(4.0-t)*(808/2.6)):back;}
  return kf(t,[[7.6,344],[8.2,BALE_X]]);},
 rx(t,E=0){
  if(t<this.swap(E))return -40+RANCH_V*(t-1.0);
  if(t<6.6)return this.bx(t,E)-45;
  return t>11.4?-40-RANCH_OFF_V*(t-11.4):kf(t,[[6.6,299],[7.2,299],[7.6,287],[9.3,287],[11.4,-40,'lin']]);},
 focus(t){if(t<1.2)return{x:340,y:120};if(t<3.6)return{x:clamp(this.rx(t),40,350),y:115};if(t<6.6)return{x:clamp(this.bx(t)-25,40,350),y:115};if(t<9.3)return{x:320,y:115};return{x:clamp(this.rx(t),40,350),y:115};},
 // Where his line's bubble points: just over his head.
 mouth(t,E=0){return{x:this.rx(t,E)+14,y:GY-72};},
 render(t,E=0){
  let s='';
  const bx=this.bx(t,E);const hopB=t>=0&&t<0.5?-3*Math.sin(Math.PI*t/.5):0;
  const rot=((bx-BALE_X)/27)*57.3;
  if(bx>-40-E&&bx<430+E)s+=bale(bx,GY-26+hopB,rot);
  const x=this.rx(t,E);const sw0=this.swap(E);
  if(x>-45-E&&x<440+E&&(t>=1.0-E/RANCH_V)){
   const face=t<9.15?1:-1;
   let p={x,face,suit:[C.plaid,C.plaidD],plaid:true,legs:[C.jean,C.jeanD],hat:'cowboy',tache:true,glove:C.skin,brow:0};
   if(t<sw0){Object.assign(p,walk(x/9,42));p.lean=12;p.mouth='O';p.armF=(p.armF||0)*1.3-20;}
   else if(t<6.6){Object.assign(p,walk(x/7,30));p.lean=22;p.armF=-78;p.armB=-62;p.mouth='grit';p.brow=4;}
   else if(t<7.2){p.lean=4;p.armF=kf(t,[[6.6,-60],[6.8,-158],[7.1,-158],[7.2,-60]]);p.armB=-55;p.mouth='pant';p.eye='closed';}
   else if(t<7.6){p.armF=-100;p.mouth='grin';p.eye='happy';}
   else if(t<8.2){p.px=2;p.mouth='flat';p.armF=-30;}
   else if(t<9.3){p.bob=3*es(t,8.2,8.5);p.armF=6;p.armB=-6;p.eye='half';p.mouth='flat';p.headRot=8;}
   else{Object.assign(p,walk(x/8.5,24));p.eye='half';p.mouth='flat';}
   p.bob=(p.bob||0)+hop(t,9.0,9.3);
   s+=worker(p);
   if(t>6.65&&t<7.2){for(let k=0;k<2;k++){const ph=seg(t,6.65+k*.12,7.1+k*.12);s+=`<path d="M${r2(x-6-k*6)} ${r2(GY-64+ph*14)} q-2 3 0 4 q2 -1 0 -4 z" fill="#8fc6ef" ${sw(1.2)}/>`;}}
   if(t>8.25&&t<8.9){const k=seg(t,8.25,8.9);s+=`<ellipse cx="${r2(x+22+k*10)}" cy="${r2(GY-46-k*4)}" rx="${r2(3+k*4)}" ry="${r2(2+k*2.4)}" fill="#fff" opacity="${r2(.9*(1-k))}" ${sw(1.2)}/>`;}}
  return s;}};
export const BALE_AT = { x: BALE_X, y: GY-26, r: 27 };
/** The bale at rest: the scenery's own. */
export const baleAtRest = () => bale(BALE_X, GY-26, 0);

/* 8. Personal Cloud */
const WALK_IN=210/2.0, WALK_OFF=280/1.8, CLOUD_OFF=280/1.85;
WAVE3.cloud = { name:'Personal Cloud', dur:12.4, still:9.0,
 beats:[[0,'strolls-in','A worker strolls in, whistling. A tiny cloud tags along.'],[2.3,'rains','It parks over his head and rains on him.'],[3.4,'sidestep','He sidesteps. It follows.'],[4.4,'steps-back','He steps back. It follows again.'],[5.2,'deadpan','Deadpan look at the player.'],[6.0,'umbrella','Pulls out an umbrella. Pop! Rain stops.'],[6.4,'smug','Smug grin. The cloud is not happy.'],[8.0,'closes-it','He closes the umbrella. Looks up, pleased.'],[8.6,'downpour','Downpour. Flattened.'],[9.8,'opens-again','Sighs, opens the umbrella again.'],[10.2,'walks-off','Walks off. The cloud follows, still raining.']],
 lead:E=>E/WALK_IN, tail:E=>E/CLOUD_OFF+.1,
 wx(t){return t<0?-40+WALK_IN*t:t>12.0?440+WALK_OFF*(t-12.0):kf(t,[[0,-40],[2.0,170,'lin'],[3.4,170],[3.7,220],[4.4,220],[4.6,160],[10.2,160],[12.0,440,'lin']]);},
 // (The cloud drifts in slowing down: 2 x 260 / 2.3 at t = 0.)
 cx(t){return t<0?-90+(520/2.3)*t:t>12.1?440+CLOUD_OFF*(t-12.1):kf(t,[[0,-90],[2.3,170,'out'],[3.75,170],[4.1,220],[4.6,220],[4.78,160,'out'],[10.25,160],[12.1,440,'lin']]);},
 focus(t){return{x:clamp(this.wx(t),40,350),y:96};},
 render(t,E=0){
  let s='';
  const x=this.wx(t),cx=this.cx(t),cy=42+Math.sin(t*2.2)*1.5;
  const umb=kf(t,[[6.15,0],[6.4,1,'out'],[8.0,1],[8.35,0],[9.85,0],[10.15,1,'out']]);
  const umbUp=inr(t,6.0,8.45)||t>=9.8;
  const pour=inr(t,8.6,9.8);
  const raining=inr(t,2.3,3.5)||inr(t,4.1,4.4)||inr(t,4.75,6.4)||pour||t>=10.2;
  const walking=t<2.0||t>=10.2;
  let p={x};
  if(walking)Object.assign(p,walk(x/8.5,24));
  if(t<2.0){p.eye='happy';p.mouth='o';}
  else if(t<3.4){p.headRot=-14;p.py=-3;p.mouth='frown';p.eye='n';}
  else if(t<4.4){p.mouth='flat';p.headRot=-10;p.py=-3;p.bob=hop(t,3.4,3.7,5);}
  else if(t<5.2){p.mouth='flat';p.headRot=-10;p.py=-3;p.bob=hop(t,4.4,4.6,4);}
  else if(t<6.0){p.eye='half';p.px=2;p.mouth='flat';}
  else if(t<8.0){p.mouth=t>6.4?'grin':'O';p.eye=t>6.4?'happy':'wide';}
  else if(t<8.6){p.headRot=-14;p.py=-3;p.mouth='smile';}
  else if(t<9.8){p.sq=.12*es(t,8.6,8.8);p.eye='half';p.mouth='flat';}
  else{p.eye='half';p.mouth='flat';}
  if(umbUp){p.armB=t<6.15&&t>=6.0?kf(t,[[6.0,30],[6.15,-160]]):(t>=9.8&&t<9.85?-160:-172);p.handB=umbrella(umb);}
  else if(t>=8.35&&t<9.8){p.armB=6;p.handB=umbrella(0);}
  const seen=x>-45-E&&x<445+E, cloudSeen=cx>-45-E&&cx<445+E;
  if(seen)s+=worker(p);
  // rain
  const headTop=GY-66+(p.sq?6:0), umbTop=GY-92;
  if(raining&&cloudSeen){const stop=umbUp&&umb>.6?umbTop:headTop;s+=rain(cx,cy+12,stop,t,pour?10:6,pour?260:160);
   if(pour)s+=rain(cx+3,cy+12,stop,t+.13,9,240);
   // splashes on hat or umbrella
   const sy=stop;for(let k=0;k<3;k++){const ph=(t*3+k/3)%1;s+=`<circle cx="${r2(cx-10+k*10+ph*4*(k-1))}" cy="${r2(sy-ph*5)}" r="1.4" fill="#4f8fd8" opacity="${r2(1-ph)}"/>`;}}
  const mood=inr(t,6.4,8.6)?'mad':(pour||t>=9.8)?'grin':'smug';
  if(cloudSeen)s+=cloud(cx,cy,mood);
  if(t<2.0&&seen){for(let k=0;k<2;k++){const ph=((((t*1.4+k*.5)%1)+1)%1);s+=note(x+16+ph*10,GY-62-ph*18,1-ph);}}
  if(t>6.3&&t<6.6)s+=sfx(x+8,GY-102,'pop!',12,-8,'#fff');
  return s;}};

# THE PORT OF BALDONNEL'S SEVEN SIGHTINGS (job U6b): writes src/ui/bald-gags.ts from the reference page.
#   python3 tools/port-baldonnel.py      (from the repo's root)
# It copies the page's new puppets and its seven gags AS WRITTEN and applies, by exact text, each change the game
# needs (every one asserts that it found its text, so a new reference that differs there stops the script). The
# changes and their reasons are listed in the header it writes. To change a sighting, change it HERE and run it again.
import re,sys,os
R=os.path.expanduser('~/Desktop/RHR Art Inbox/baldonnel_sightings_reference.html')
L=open(R).read().split('\n')
body='\n'.join(L[288:769])   # lines 289..769: the new puppets and the seven gags
def rep(a,b,n=1):
    global body
    c=body.count(a)
    assert c==n, (a[:70], c)
    body=body.replace(a,b)
def slug(t,used):
    w=re.sub(r"[^a-z0-9 ]","",t.lower().replace('’','').replace('“','').replace('”','')).split()
    s='-'.join(w[:3]) or 'beat'
    k=s;i=2
    while k in used: k=f'{s}-{i}'; i+=1
    used.add(k); return k
HEAD={}
def head(m):
    gid=m.group('id'); used=set()
    beats=re.sub(r"\[([\d.]+),'((?:[^'\\]|\\.)*)'\]", lambda b: f"[{b.group(1)},'{slug(b.group(2),used)}','{b.group(2)}']", m.group('beats'))
    HEAD[gid]=dict(name=m.group('name'),notes=m.group('notes'),trigger=m.group('trigger'))
    return f"BALD.{gid} = { '{' } name:'{m.group('name')}', dur:{m.group('dur')}, still:{m.group('still')},\n beats:{beats},\n @@{gid}@@\n"
body,n=re.subn(r"GAGS\.push\(\{id:'(?P<id>\w+)',name:'(?P<name>[^']*)',region:'Baldonnel',trigger:'(?P<trigger>[^']*)',H:190,dur:(?P<dur>[\d.]+),still:(?P<still>[\d.]+),\n notes:(?P<notes>\[.*\]),\n beats:(?P<beats>\[.*\]),\n", head, body)
assert n==7, n
rep("  return s;}});","  return{s,o,B,F};}};",7)
rep(" focus(t){",   " _focus(t){",7)
rep(" render(t){\n"," _draw(t,E=0){\n",7)
# no scenery in a gag: the scene is permanent props
rep("  let s=bgBald({needle:ang});\n","  let s='',o='',B='',F='';\n")
rep("  let s=bgBald();\n","  let s='',o='',B='',F='';\n",6)
rep("  const ang=needleAt(t);\n","")
# sound words, whistled notes: on the layer over everything
body=body.replace("s+=sfx(","o+=sfx(").replace("s+=note(","o+=note(")
# lines are said in the game's own bubble
rep("  if(t>6.0&&t<6.8)s+=bubble(wx+6,GY-70,'Shoo!');\n","")
rep("  if(t>4.4&&t<5.2)s+=bubble(px+4,py-58,'Got one!','l');\n","")
rep("  if(t>5.1&&t<6.0)s+=bubble(x+10,GY-72,'Hey!');\n","")
assert 'bubble(' not in body

# ---------- 1. Overweight ----------
rep(" mx(t){if(t<2.0)return kf(t,[[0,-40],[2.0,128,'out']]);"," mx(t){if(t<0)return -40+OW_IN*t;if(t<2.0)return kf(t,[[0,-40],[2.0,128,'out']]);")
rep("if(t<11.35)return OW_OFF;return kf(t,[[11.35,OW_OFF],[13.0,-45,'in']]);},","if(t<11.35)return OW_OFF;return t>13.0?-45-OW_OUT*(t-13.0):kf(t,[[11.35,OW_OFF],[13.0,-45,'in']]);},")
rep(" bird(t){if(t<8.1)return null;"," bird(t,E=0){if(t<8.1)return null;")
rep("p.x=lerp(430,178,io(k));p.y=lerp(16,PAD.y,k*k)-30*Math.sin(Math.PI*k)*(1-k);","p.x=lerp(430+E,178,io(k));p.y=lerp(BIRD_IN_Y,PAD.y,k*k)-10*Math.sin(Math.PI*k)*(1-k);")
rep("p.x=lerp(178,440,k);p.y=lerp(PAD.y,-20,io(k));","p.x=lerp(178,440+E,k);p.y=lerp(PAD.y,BIRD_OUT_Y,io(k));")
rep("  const b=this.bird(t);if(b)s+=magpie(b);","  const b=this.bird(t,E);if(b)s+=magpie(b);")
rep("_focus(t){if(t>8.1&&t<9.0){const b=this.bird(t);","_focus(t){if(t>8.1&&t<9.0){const b=this.bird(t);")
rep("@@overweight@@","lead:E=>E/OW_IN, tail:E=>E/OW_OUT, needle:needleAt,")
# ---------- 2. Two Left Feet ----------
rep(" mx(t){if(t<5.5)return kf(t,[[4.4,430],[5.5,326,'out']]);if(t<11.15)return 326;return kf(t,[[11.15,326],[12.7,435,'in']]);},"," mx(t){if(t<4.4)return 430+CR_IN*(4.4-t);if(t<5.5)return kf(t,[[4.4,430],[5.5,326,'out']]);if(t<11.15)return 326;return t>12.7?435+CR_OUT*(t-12.7):kf(t,[[11.15,326],[12.7,435,'in']]);},")
rep(" cr(i,t){const home=i?CBX:CA;"," cr(i,t,E=0){const home=i?CBX:CA;")
rep("o.x=lerp(i?-70:-90,home,io(k));o.y=lerp(i?-46:-30,GY,io(k))-18*Math.sin(Math.PI*k);","o.x=lerp((i?-70:-90)-E,home,io(k));o.y=lerp(i?CRANE_IN_Y-4:CRANE_IN_Y,GY,io(k))-8*Math.sin(Math.PI*k);")
rep("if(t<t0)o.x=-200;return o;}","if(t<t0)o.x=-9999;return o;}")
rep("o.x=lerp(home,i?520:500,k*k);o.y=lerp(GY,i?-60:-50,io(k))-6*Math.sin(Math.PI*k);","o.x=lerp(home,(i?520:500)+E,k*k);o.y=lerp(GY,i?CRANE_OUT_Y-4:CRANE_OUT_Y,io(k))-6*Math.sin(Math.PI*k);")
rep("if(k>=1)o.x=-300;return o;},","if(k>=1)o.x=-9999;return o;},")
rep("  [0,1].forEach(i=>{const o=this.cr(i,t);if(o.x>-150&&o.x<480)s+=crane(o);});","  [0,1].forEach(i=>{const o=this.cr(i,t,E);if(o.x>-150-E&&o.x<480+E)s+=crane(o);});")
rep("s+=`<g transform=\"translate(${r2(lerp(x+70,hx,k)+8*Math.sin(k*9))} ${r2(lerp(30,hy,io(k)))})","s+=`<g transform=\"translate(${r2(lerp(x+70,hx,k)+8*Math.sin(k*9))} ${r2(lerp(FEATHER_Y,hy,io(k)))})")
rep("  if(t<1.2)o+=sfx(70,46,'garooo',","  if(t>.1&&t<1.2)o+=sfx(70,GAROO_Y,'garooo',")
rep("@@cranes@@","lead:E=>0, tail:E=>E/CR_OUT,")
# ---------- 3. Right of Way ----------
rep(" bx(t){if(t<1.7)return kf(t,[[0,-120],[1.7,BXH,'out']]);if(t<11.9)return BXH;return kf(t,[[11.9,BXH],[14.2,520,'in']]);},"," bx(t){if(t<0)return -120+BI_IN*t;if(t<1.7)return kf(t,[[0,-120],[1.7,BXH,'out']]);if(t<11.9)return BXH;return t>14.2?520+BI_OUT*(t-14.2):kf(t,[[11.9,BXH],[14.2,520,'in']]);},")
rep(" tx(t){if(t<9.0)return kf(t,[[2.2,-90],[3.6,RW_TX,'out']]);return kf(t,[[9.0,RW_TX],[10.6,-90,'in']]);},"," tx(t){if(t<2.2)return -90-TR_IN*(2.2-t);if(t<9.0)return kf(t,[[2.2,-90],[3.6,RW_TX,'out']]);return t>10.6?-90-TR_OUT*(t-10.6):kf(t,[[9.0,RW_TX],[10.6,-90,'in']]);},")
rep("let drv=null;if(inside&&tx>-80){","let drv=null;if(inside&&tx>-100-E){")
rep("  const bisonS=bo.x<500&&bo.x>-140?bison(bo):'';","  const bisonS=bo.x<500+E&&bo.x>-140-E?bison(bo):'';")
rep("  if(behind)s+=moeS;\n  if(tx>-90)s+=pickup(","  if(behind)B+=moeS;\n  if(tx>-95-E)s+=pickup(")
rep("  if(!behind)s+=moeS;\n  // sound words and steam","  if(!behind)F+=moeS;\n  // sound words and steam")
rep("s+=puff(tx+24+i*4,GY-70-ph*18","o+=puff(tx+24+i*4,GY-70-ph*18")
rep("@@bison@@","backY:GY-8, frontY:GY+12,\n lead:E=>E/BI_IN, tail:E=>E/BI_OUT,\n lines:[{key:'shoo',from:6.0,to:6.8,mouth(t){return{x:BALD.bison.wx(t)+8,y:GY-46};}}],")
# ---------- 4. Half Dressed ----------
rep(" hx(t){if(t<1.2)return kf(t,[[0,430],[1.2,HX_EDGE+6,'out']]);"," hx(t){if(t<0)return 430-HA_IN*t;if(t<1.2)return kf(t,[[0,430],[1.2,HX_EDGE+6,'out']]);")
rep("if(t<9.3)return HHIDE;return kf(t,[[9.3,HHIDE],[11.2,440,'in']]);},","if(t<9.3)return HHIDE;return t>11.2?440+HA_OUT*(t-11.2):kf(t,[[9.3,HHIDE],[11.2,440,'in']]);},")
rep(" wkx(t){return kf(t,[[5.6,-40],[9.9,440,'lin']]);},"," wkx(t){return -40+WK_V*(t-5.6);},")
rep("  if(t<1.2){const ph=(t*3.2)%1;h.lift=10*Math.sin(Math.PI*ph);h.crouch=.2;}","  if(t<1.2){const ph=((t*3.2)%1+1)%1;h.lift=10*Math.sin(Math.PI*ph);h.crouch=.2;}")
rep("  if(t>=5.6&&w<440){let q=","  if(w>-45-E&&w<445+E){let q=")
rep("@@hare@@","lead:E=>E/HA_IN, tail:E=>Math.max(E/HA_OUT,E/WK_V-1.4),")
# ---------- 5. Last Ice (all of it on the pond, behind the lane) ----------
rep(" px(t){if(t<9.8)return kf(t,[[0,440],[2.6,LI_X,'out']]);return kf(t,[[9.8,LI_X],[12.4,450,'in']]);},"," px(t){if(t<0)return 440-IC_IN*t;if(t<9.8)return kf(t,[[0,440],[2.6,LI_X,'out']]);return t>12.4?450+IC_OUT*(t-12.4):kf(t,[[9.8,LI_X],[12.4,450,'in']]);},")
rep('<clipPath id="pkclip"><rect x="0" y="0" width="390" height="${POND.surf+1}"/></clipPath>','<clipPath id="pkclip"><rect x="-900" y="-200" width="2400" height="${POND.surf+201}"/></clipPath>')
rep("@@ice@@","backY:POND.surf+3, onPond:true,\n lead:E=>E/IC_IN, tail:E=>E/IC_OUT,\n lines:[{key:'got',from:4.4,to:5.2,mouth(t){return{x:BALD.ice.px(t)-2,y:POND.surf-44};}}],")
# ---------- 6. Late Croak ----------
rep(" wx(t){if(t<5.5)return kf(t,[[4.4,430],[5.5,PUD2.x+10,'out']]);if(t<6.6)return PUD2.x+10;return kf(t,[[6.6,PUD2.x+10],[8.6,-45,'in']]);},"," wx(t){if(t<4.4)return 430+FR_IN*(4.4-t);if(t<5.5)return kf(t,[[4.4,430],[5.5,PUD2.x+10,'out']]);if(t<6.6)return PUD2.x+10;return t>8.6?-45-FR_OUT*(t-8.6):kf(t,[[6.6,PUD2.x+10],[8.6,-45,'in']]);},")
rep("  if(t>=4.4&&w>-50&&w<440){let q={x:w,face:-1,...BEARD,eye:'n',mouth:'smile'};","  if(w>-50-E&&w<440+E){let q={x:w,face:-1,...BEARD,eye:'n',mouth:'smile'};")
rep('  s+=`<clipPath id="pudclip"><rect x="0" y="0" width="390" height="${surf}"/></clipPath><g clip-path="url(#pudclip)">${fr}</g>`;','  if(fr)F+=`<clipPath id="pudclip"><rect x="-900" y="-200" width="2400" height="${surf+200}"/></clipPath><g clip-path="url(#pudclip)">${fr}</g>`;')
rep('  s+=`<path d="M${PUD2.x-38} ${surf} h76"','  if(fr)F+=`<path d="M${PUD2.x-38} ${surf} h76"')
rep("  FROGS.forEach((F,i)=>{s+=ripple(F.x,surf,seg(t,F.on,F.on+.6),7)+ripple(F.x,surf,seg(t,8.7+i*.2,9.4+i*.2),8);});","  FROGS.forEach((G,i)=>{F+=ripple(G.x,surf,seg(t,G.on,G.on+.6),7)+ripple(G.x,surf,seg(t,8.7+i*.2,9.4+i*.2),8);});")
rep("  s+=ripple(PUD2.x,surf,seg(t,0,.5),10);","  F+=ripple(PUD2.x,surf,seg(t,0,.5),10);")
# (inside the frogs' loops the reference names a frog `F`; here `F` is the front lane's drawing)
rep("  FROGS.forEach((F,i)=>{\n   let rise=t<F.on?0:es(t,F.on,F.on+.25);","  FROGS.forEach((G,i)=>{\n   let rise=t<G.on?0:es(t,G.on,G.on+.25);")
rep("   let o={x:F.x,y:surf+3+26*(1-rise),s:F.s,face:F.f,eye:'n'};","   let q={x:G.x,y:surf+3+26*(1-rise),s:G.s,face:G.f,eye:'n'};")
a=body.index("   if(t<4.9){let sac=0;CROAKS[i]"); b=body.index("   fr+=frog(o);});")
seg_=body[a:b].replace("o.","q.").replace("F.x","G.x").replace("F.f","G.f")
body=body[:a]+seg_+"   fr+=frog(q);});"+body[b+len("   fr+=frog(o);});"):]
rep("  if(t<4.9)FROGS.forEach((F,i)=>CROAKS[i].forEach(a=>{if(t>=a&&t<a+.8){const k=seg(t,a,a+.8);o+=note(F.x+4*F.f+6*k,surf-24-k*20,1-k);if(k<.3)o+=sfx(F.x+F.f*6,surf-34-i*7,i===2?'creek':'crick',8,-6,'#fff');}}));","  if(t<4.9)FROGS.forEach((G,i)=>CROAKS[i].forEach(a=>{if(t>=a&&t<a+.8){const k=seg(t,a,a+.8);o+=note(G.x+4*G.f+6*k,surf-24-k*20,1-k);if(k<.3)o+=sfx(G.x+G.f*6,surf-34-i*7,i===2?'creek':'crick',8,-6,'#fff');}}));")
rep("@@frogs@@","frontY:PUD2.y+5,\n lead:E=>0, tail:E=>Math.max(0,8.6+E/FR_OUT-10.6),")
# ---------- 7. Lunch to Go ----------
rep(" mx(t){if(t<1.8)return kf(t,[[0,-40],[1.8,LG_X,'out']]);if(t<5.6)return LG_X;return kf(t,[[5.6,LG_X],[7.6,445,'in']]);},"," mx(t){if(t<0)return -40+MQ_IN*t;if(t<1.8)return kf(t,[[0,-40],[1.8,LG_X,'out']]);if(t<5.6)return LG_X;return t>7.6?445+MQ_OUT*(t-7.6):kf(t,[[5.6,LG_X],[7.6,445,'in']]);},")
rep(" bug(t){const L=[KIT_SPOT[0],GY-19];"," bug(t,E=0){const L=[KIT_SPOT[0],GY-19];")
rep("return{x:lerp(420,L[0],io(k))+5*Math.sin(t*20),","return{x:lerp(420+E,L[0],io(k))+5*Math.sin(t*20),")
rep("const k=seg(t,5.1,7.5);return{x:lerp(L[0]+3,450,k),","const k=seg(t,5.1,7.5);return{x:lerp(L[0]+3,450+E,k),")
rep("  const b=this.bug(t);\n","  const b=this.bug(t,E);\n")
rep("  if(t>=5.6){for(let k=1;k<4;k++)s+=puff(x-12-k*9,GY-3-k*2,3+k,(1-k/4)*.6);}","  if(t>=5.6){s+='<g data-fx=\"dust\">';for(let k=1;k<4;k++)s+=puff(x-12-k*9,GY-3-k*2,3+k,(1-k/4)*.6);s+='</g>';}")
rep("  if(t>2.8&&t<3.5)o+=sfx(360,70,'BZZZ',","  if(t>2.8&&t<3.5)o+=sfx(360+E*.6,70,'BZZZ',")
rep("@@mosquito@@","lead:E=>E/MQ_IN, tail:E=>E/MQ_OUT,\n lines:[{key:'hey',from:5.1,to:6.0,mouth(t){return{x:BALD.mosquito.mx(t)+10,y:GY-60};}}],")
assert '@@' not in body and 'bgBald' not in body
header = r'''// @ts-nocheck
// BALDONNEL'S SEVEN SIGHTINGS (October upgrade, job U6b), ported from
// `~/Desktop/RHR Art Inbox/baldonnel_sightings_reference.html` (saved Oct 9 17:36) as the Clearwater ones were
// (wave3.ts). THIS FILE IS WRITTEN BY `python3 tools/port-baldonnel.py`: change a sighting there and run it again.
// The reference's new puppets (sandhill crane, bison, snowshoe hare in its spring coat, wood frog,
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
//   - SAME START, SAME END: the page writes "garooo" from its very first frame and draws the puddle's water line
//     through the whole of Late Croak; here the word comes a moment in and the line only while a frog is up.
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

'''
footer = r'''

// (The finale's crew photo, finale-art.ts, stands these same puppets in a row.)
export { crane, bison, hare, frog, magpie };

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
'''
open('src/ui/bald-gags.ts','w').write(header+body+footer)
# What the page says, for the tests (the build server has no Desktop): each gag's beats [time, text] and its log lines.
import json
page={}
for gid,h in HEAD.items():
    m=re.search(r"GAGS\.push\(\{id:'"+gid+r"'[^\n]*\n notes:[^\n]*\n beats:(\[.*\]),\n", '\n'.join(L))
    beats=[[float(b.group(1)), b.group(2)] for b in re.finditer(r"\[([\d.]+),'((?:[^'\\]|\\.)*)'\]", m.group(1))]
    card=re.search(r"Log card: “([^”]*)” Riddle: “([^”]*)” Plain hint: “([^”]*)”", h['notes'])
    page[gid]={'name':h['name'],'beats':beats,'card':card.group(1).replace('’',"'"),'riddle':card.group(2).replace('’',"'"),'hint':card.group(3).replace('’',"'")}
open('src/ui/bald-reference.json','w').write(json.dumps(page,ensure_ascii=False,indent=1)+'\n')

print('written', len(body))


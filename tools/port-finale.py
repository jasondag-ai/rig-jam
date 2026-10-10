# THE PORT OF THE FINALE'S ART (job U9): writes src/ui/finale-art.ts (and finale-reference.json) from the reference page.
#   python3 tools/port-finale.py      (from the repo's root)
# It copies AS WRITTEN: the crew photo's front-view puppets and `photoFront`, the crew and its timing, the tripod, the
# splat, the Polaroid, and Still Here (Moe in his robe at the biffy). Each change the game needs is made by exact text
# (and asserts that it found its text). What is NOT copied: the page's mock phone (sky, HUD, lease, buttons: the game
# has its own), its card (the win card's own frame: finale.ts), its cover (cover.ts) and its player.
import re,os,json
R=os.path.expanduser('~/Desktop/RHR Art Inbox/finale_reference.html')
T=open(R).read()
def between(a,b):
    i=T.index(a); j=T.index(b,i)
    return T[i:j]
front=between("/* ================= THE CREW PHOTO, FROM THE CAMERA (front view)","/* ================= THE FINALE (reference)")
txt=between("const FONT='Fredoka","/* ---------- the phone: sky, HUD")
biffy=between("const BIF={x:34,y:104,s:.468};","function stripWrap(")
crewc=between("/* ---------- the crew ---------- */","/* ---------- the Polaroid ---------- */")
pol=between("/* ---------- the Polaroid ---------- */","/* ---------- 1. The Perfect Game card ---------- */")
still=between("/* ---------- 4. Still Here: Moe in his robe, at the biffy ---------- */","function bgClose()")
trees=between("function aspen(x,b,h,","const tuft=")
# (the trees behind the crew IN THE PHOTO are the page's own simple ones: the photo is a drawing of its own)
body=trees+front+txt+biffy+crewc+pol+still
def rep(a,b,n=1):
    global body
    c=body.count(a); assert c==n,(a[:70],c); body=body.replace(a,b)
# The crew as lanes (the depth rule): back row, middle row, front row, and the magpie over them all.
rep(" const b=birdP2(t);\n return back+mid+front+(b?magpie(b):'');}"," const b=birdP2(t,o.E||0);\n return{back,mid,front,over:(b?magpie(b):'')};}")
# A wider screen: the magpie comes from beyond its edge and leaves beyond it.
rep("function birdP2(t){","function birdP2(t,E=0){")
rep("p.x=lerp(-40,land.x,io(k));","p.x=lerp(-40-E,land.x,io(k));")
rep("p.x=lerp(land.x,440,k);","p.x=lerp(land.x,440+E,k);")
# Lines are said in the game's own bubble (FINALE_LINES in lines.ts): not drawn here.
rep(" if(t>.45&&t<1.6)s+=bubble(MOE_CAM-30,ROWS.mid-74,'Squeeze in!','l');\n","")
rep(" if(t>7.5&&t<8.8)s+=bubble(MOE_SPOT+6,ROWS.mid-74,'Seriously?','r');\n","")
rep(" const [hx,hy]=at(SH.x+12,SH.y-50);\n if(t>3.75&&t<5.6)s+=bubble(hx,hy,\"You're still here?\",'r');\n if(t>5.8&&t<7.7)s+=bubble(hx,hy,\"Shift's over. Go home.\",'r');\n","")
rep(" const blink=(a,b,per)=>t>a&&t<b&&((t-a)%per)<per*.5;\n","")
assert 'bubble(' not in body
# what the page says, for the tests and the beats
def beats(name):
    m=re.search(r"const "+name+r"=\{dur:([\d.]+),beats:(\[.*?\]),\n", T); assert m, name
    bs=[[float(b.group(1)) if re.match(r'^[\d.]+$',b.group(1)) else b.group(1), b.group(2)] for b in re.finditer(r"\[([\w.]+),'((?:[^'\\]|\\.)*)'\]", m.group(2))]
    return float(m.group(1)), bs
consts=dict(re.findall(r"(T_[A-Z]+)=([\d.]+)", T))
page={}
for name,key in [('P1','card'),('P2','photo'),('P3','credits'),('P4','still')]:
    dur,bs=beats(name)
    page[key]={'dur':dur,'beats':[[float(consts[t]) if isinstance(t,str) else t, s] for t,s in bs]}
cred=re.search(r"const CREDITS=(\[.*?\]);\n", T).group(1)
page['credits']['rows']=[[a,b] for a,b in re.findall(r"\['((?:[^'\\]|\\.)*)','(\w+)'\]", cred)]
page['lines']={'squeeze':'Squeeze in!','seriously':'Seriously?','still':"You're still here?",'home':"Shift's over. Go home.",'company':'Huh. Not bad.'}
for v in page['lines'].values(): assert v.replace("'","’") in T or v in T, v
open('src/ui/finale-reference.json','w').write(json.dumps(page,ensure_ascii=False,indent=1)+'\n')
header = r'''// @ts-nocheck
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

'''
footer = r'''
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
'''
open('src/ui/finale-art.ts','w').write(header+body+footer)
print('written', len(body))

// The Montney bear scene, animated with GSAP on puppet rigs (rig.ts, rigs.ts).
// Beat by beat: he walks in (alternating legs), squats side-on beside the bush and strains (quiver,
// eyes squeezed shut). A rabbit hops up and sniffs. His eyes pop open, his head turns slowly to the
// rabbit, hold. His arm winds up, shoots out and grabs it (the rabbit squashes, eyes huge), swings
// it behind his rump for two wipes (ears flapping, fur puffing), sets it down. The rabbit freezes,
// frazzled, then shakes it off like a wet dog, and they bolt opposite ways.
// The stage's `data-beat` names the current beat (tests read it).
import { gsap } from 'gsap';
import { sound } from '../audio/engine.ts';
import { fitSpan } from './gags.ts';
import { Sprite } from './anim.ts';
import { Rig, show, type Joint } from './rig.ts';
import { BEAR_RIG, RABBIT_RIG } from './rigs.ts';

/** Bear art: feet centre, sitting height, rump (left edge sitting) and reach (right edge reaching), in art units. */
const BEAR_FEET = { x: 100, y: 191 }; // bottom of his paws, outline included
const BEAR_SIT_H = 191; // sitting, ear tips to paws (measured)
const BEAR_RUMP = 26;
const BEAR_REACH = 236;
/** His own right edge sitting (head and paw), without the rabbit's patch in front of him. */
const BEAR_BODY_R = 200;
/** Rabbit art: feet centre, the scruff of his back (where the paw holds him), height. */
const RABBIT_FEET = { x: 32, y: 54 };
const RABBIT_BODY = { x: 33, y: 27 };
const RABBIT_H = 56;
/** The willow bush sprite (public/sprites/world/bush_willow) is 485 x 427. */
const BUSH_RATIO = 485 / 427;

export interface BearLayout {
  /** Bear and rabbit scale (px per art unit). */
  k: number;
  kr: number;
  /** Bush box (board px; it stands on the ground line). */
  bushX: number;
  bushW: number;
  bushH: number;
  /** Where his feet are when he sits (board px). */
  sitX: number;
}

/**
 * How big the scene is next to the original bear (who filled the strip). A touch smaller, so even
 * his satisfied hop stays inside the strip: a background gag, never over the board or the buttons.
 */
export const BEAR_SCALE = 0.9;

/**
 * Sizes and places the scene along the bottom strip: bush, then the bear sitting with his rump
 * against it, then room for the rabbit, kept clear of a biffy below the board.
 */
export function bearLayout(o: {
  screenL: number;
  screenR: number;
  cell: number;
  stripH: number;
  biffy: { left: number; right: number } | null;
}): BearLayout {
  const old = Math.min(o.cell * 2, o.stripH) * 0.95; // the original bear filled the strip
  const hi = o.screenR - 6;
  // Biggest first; if the biffy leaves too little room, a smaller bear; then let only the rabbit's
  // patch cross in front of the biffy; last resort, ignore it.
  const tries: [number, number][] = [1, 0.85, 0.72].map((f) => [f, BEAR_REACH] as [number, number]);
  tries.push([0.85, BEAR_BODY_R], [0.72, BEAR_BODY_R], [0.6, BEAR_BODY_R], [0, 0]);
  for (const [f, reach] of tries) {
    const sitH = old * BEAR_SCALE * (f || 0.72);
    const k = sitH / BEAR_SIT_H;
    const bushH = Math.max(18, Math.min(sitH * 0.5, o.stripH - 4));
    const bushW = bushH * BUSH_RATIO;
    const span = bushW * 0.7 + (reach - BEAR_RUMP) * k;
    // Half the bush may hang off the left edge of the screen; it's only scenery.
    const lo = o.screenL - bushW * 0.5;
    const left = f ? fitSpan(lo, hi, span, o.biffy) : lo;
    if (left === null) continue;
    return { k, kr: (sitH * 0.35) / RABBIT_H, bushX: left, bushW, bushH, sitX: left + bushW * 0.7 + (BEAR_FEET.x - BEAR_RUMP) * k };
  }
  throw new Error('unreachable');
}

type Pose = Record<string, Partial<Pick<Joint, 'x' | 'y' | 'rot' | 'sx' | 'sy'>>>;

const BEAR_JOINTS = ['face', 'hips', 'body', 'head', 'jaw', 'ear', 'earF', 'eye', 'belly', 'tail', 'thigh', 'shin', 'thighF', 'shinF', 'armF', 'arm', 'fore', 'paw', 'sweat'];
const STAND: Pose = Object.fromEntries(BEAR_JOINTS.map((n) => [n, { x: 0, y: 0, rot: 0, ...(n === 'face' ? {} : { sx: 1, sy: 1 }) }]));
const SIT: Pose = {
  hips: { y: 21 },
  body: { rot: -62 },
  head: { rot: 50 },
  thigh: { rot: -80 },
  shin: { rot: 80 },
  thighF: { rot: -80 },
  shinF: { rot: 80 },
  arm: { rot: 30 },
  fore: { rot: -70 },
  armF: { rot: 50 },
  tail: { rot: 40 },
  belly: { y: 0 },
};
const STRAIN: Pose = { ...SIT, head: { rot: 36 }, arm: { rot: 18 }, fore: { rot: -100 }, jaw: { rot: -5 } };
const TURN: Pose = { head: { rot: 68 } };
const WINDUP: Pose = { body: { rot: -68 }, head: { rot: 64 }, arm: { rot: 80 }, fore: { rot: -115 }, paw: { rot: 0 } };
const REACH: Pose = { body: { rot: -30 }, head: { rot: 50 }, arm: { rot: 0 }, fore: { rot: -4 }, paw: { rot: 12 } };
const CLUTCH: Pose = { body: { rot: -60 }, head: { rot: 64 }, arm: { rot: 0 }, fore: { rot: -64 }, paw: { rot: 0 } };
/** The wipe: up into a half-squat, rump pushed back and tail lifted, head up with relief. */
const HALF_SQUAT: Pose = {
  hips: { y: 7 },
  body: { rot: -30 },
  head: { rot: 14 },
  thigh: { rot: -42 },
  shin: { rot: 42 },
  thighF: { rot: -50 },
  shinF: { rot: 50 },
  armF: { rot: 34 },
  tail: { rot: -18, x: -2, y: -2 },
};
/**
 * The curve of his rump just under the tail, in the body's own drawing units (the lower rear of the
 * body outline, nudged outward). `t` runs from low (0) to high (1): the wipe strokes follow it.
 */
export function rumpPoint(t: number): { x: number; y: number } {
  const u = 0.47 + 0.25 * t;
  const q = (a: number, c: number, b: number) => (1 - u) * (1 - u) * a + 2 * u * (1 - u) * c + u * u * b;
  return { x: q(66, 38, 36) - 3, y: q(138, 134, 104) + 1 };
}
/** Shoulder, and the paw's grip measured from it with the arm hanging straight (drawing units). */
const SHOULDER = { x: 128, y: 114 };
const GRIP = { x: 6, y: 62 };
/**
 * Shoulder angle and arm stretch that put the paw's grip on a point given in the body's units
 * (elbow straight). He's a cartoon: the arm stretches to reach his own rump.
 */
export function reachFor(p: { x: number; y: number }): { rot: number; sy: number } {
  const dx = p.x - SHOULDER.x;
  const dy = p.y - SHOULDER.y;
  const sy = Math.sqrt(Math.max(1, dx * dx + dy * dy - GRIP.x * GRIP.x)) / GRIP.y;
  let rot = ((Math.atan2(dy, dx) - Math.atan2(GRIP.y * sy, GRIP.x)) * 180) / Math.PI;
  while (rot < -180) rot += 360;
  return { rot, sy };
}
/** How the rabbit is held under the rump: his back flat against it, face out and upright enough to read. */
const RUMP_TILT = 34;
const SETDOWN: Pose = { body: { rot: -32 }, head: { rot: 52 }, arm: { rot: 0 }, fore: { rot: -4 }, paw: { rot: 0 } };

const inner = (svg: string) => svg.replace(/^[\s\S]*?<svg[^>]*>/, '').replace(/<\/svg>\s*$/, '');

/** Plays the whole scene once. Resolves when both have run off; rejects if `signal` aborts (new level). */
export async function playBear(host: HTMLElement, L: BearLayout, g: { ground: number; screenL: number; screenR: number }, signal: AbortSignal): Promise<void> {
  const sitH = BEAR_SIT_H * L.k;
  const W = g.screenR - g.screenL;
  const H = sitH * 1.4;
  const X = (boardX: number) => boardX - g.screenL;
  const stage = document.createElement('div');
  stage.className = 'gag wild bear-stage';
  Object.assign(stage.style, { width: `${W}px`, height: `${H}px`, transform: `translate(${g.screenL}px, ${g.ground - H}px)` });
  stage.innerHTML = `<svg viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" overflow="visible" aria-hidden="true">
    <ellipse class="shadow-b" rx="${70 * L.k}" ry="${7 * L.k}" fill="rgba(0,0,0,0.22)"/>
    <ellipse class="shadow-r" rx="${18 * L.kr}" ry="${3.5 * L.kr}" fill="rgba(0,0,0,0.22)"/>
    <g class="bear">${inner(BEAR_RIG)}</g>
    <g class="reach" style="display:none"><path class="reach-o" fill="none" stroke="#2a1a0c" stroke-linecap="round" stroke-linejoin="round"/><path class="reach-i" fill="none" stroke="#2e2622" stroke-linecap="round" stroke-linejoin="round"/></g>
    <g class="rabbit">${inner(RABBIT_RIG)}</g>
    <ellipse class="reach-paw" style="display:none" fill="#2e2622" stroke="#2a1a0c"/></svg>`;
  host.append(stage);
  const svg = stage.querySelector('svg')!;
  // The animated bear (Batch C) walks in, sits and walks off; the drawn rig does the beats with the
  // rabbit (strain to shake-off) until the wipe and rabbit art are redone. Same size sitting.
  const art = new Sprite('bear-art', (BEAR_SIT_H * L.k) / 226);
  stage.append(art.el);
  const useArt = (on: boolean) => {
    art.el.style.visibility = on ? 'visible' : 'hidden';
    svg.querySelector<SVGGElement>('.bear')!.style.visibility = on ? 'hidden' : 'visible';
  };
  const bearEl = svg.querySelector<SVGGElement>('.bear')!;
  const rabbitEl = svg.querySelector<SVGGElement>('.rabbit')!;
  const grip = bearEl.querySelector<SVGGElement>('.grip')!;
  const shadowB = svg.querySelector<SVGEllipseElement>('.shadow-b')!;
  const shadowR = svg.querySelector<SVGEllipseElement>('.shadow-r')!;
  const bear = new Rig(bearEl);
  const rabbit = new Rig(rabbitEl);
  const B = (n: string) => bear.get(n);
  const R = (n: string) => rabbit.get(n);
  // Where each one stands (stage px, feet), plus squash for the bear and facing for the rabbit.
  const bp = { x: -BEAR_REACH * L.k, y: H, sqx: 1, sqy: 1, jitter: 0 };
  const rp = { x: W + RABBIT_H * L.kr, y: H, dir: 1, held: false, tilt: 0, wiping: false };
  // The wipe: his reaching arm is redrawn over his thigh (the rig's own arm sits under it), with
  // the rabbit between the arm and the paw.
  const reach = svg.querySelector<SVGGElement>('.reach')!;
  const reachPaw = svg.querySelector<SVGEllipseElement>('.reach-paw')!;
  reach.querySelector('.reach-o')!.setAttribute('stroke-width', String(20 * L.k));
  reach.querySelector('.reach-i')!.setAttribute('stroke-width', String(14 * L.k));
  reachPaw.setAttribute('stroke-width', String(3 * L.k));
  /** A point in a part's own drawing units, on the stage. */
  const stagePt = (el: SVGGraphicsElement, x: number, y: number) => {
    const m = svg.getScreenCTM()!.inverse().multiply(el.getScreenCTM()!);
    return { x: m.a * x + m.c * y + m.e, y: m.b * x + m.d * y + m.f };
  };
  const place = () => {
    // Shadows stay on the ground and shrink as their owner leaves it.
    shadowB.setAttribute('cx', String(bp.x + bp.jitter - 10 * L.k));
    shadowB.setAttribute('cy', String(H - 2));
    shadowB.setAttribute('transform', `translate(${bp.x - 10 * L.k} ${H - 2}) scale(${Math.max(0.4, 1 - (H - bp.y) / (60 * L.k))}) translate(${-(bp.x - 10 * L.k)} ${-(H - 2)})`);
    shadowR.style.display = rp.held ? 'none' : '';
    shadowR.setAttribute('cx', String(rp.x));
    shadowR.setAttribute('cy', String(H - 1));
    shadowR.setAttribute('transform', `translate(${rp.x} ${H - 1}) scale(${Math.max(0.4, 1 - (H - rp.y) / (30 * L.kr))}) translate(${-rp.x} ${-(H - 1)})`);
    art.el.style.transform = `translate(${bp.x - (BEAR_FEET.x - 100) * L.k}px, ${bp.y}px)`;
    bearEl.setAttribute('transform', `translate(${bp.x + bp.jitter} ${bp.y}) scale(${L.k * bp.sqx} ${L.k * bp.sqy}) translate(${-BEAR_FEET.x} ${-BEAR_FEET.y})`);
    if (rp.wiping) {
      // On the rump (and on the way there and back): the rabbit rides the grip, in front of the thigh.
      const s = stagePt(B('arm').el, 128, 114);
      const e = stagePt(B('fore').el, 128, 146);
      const p = stagePt(B('paw').el, 131, 178);
      const d = `M${s.x} ${s.y} L${e.x} ${e.y} L${p.x} ${p.y}`;
      reach.querySelectorAll('path').forEach((path) => path.setAttribute('d', d));
      const gp = stagePt(grip, 0, 0);
      // Never through the ground: his feet and tail end reach this far below where he's held.
      const tilt = (rp.tilt * Math.PI) / 180;
      gp.y = Math.min(gp.y, H - (18 * Math.abs(Math.sin(tilt)) + 31 * Math.cos(tilt)) * L.kr - 1);
      rabbitEl.setAttribute('transform', `translate(${gp.x} ${gp.y}) rotate(${rp.tilt}) scale(${L.kr}) translate(${-RABBIT_BODY.x} ${-RABBIT_BODY.y})`);
      reachPaw.setAttribute('cx', String(gp.x));
      reachPaw.setAttribute('cy', String(gp.y));
      reachPaw.setAttribute('rx', String(9.5 * L.k));
      reachPaw.setAttribute('ry', String(7 * L.k));
      reachPaw.setAttribute('transform', `rotate(${rp.tilt - 90} ${gp.x} ${gp.y})`);
    } else if (rp.held) {
      // Riding in his paw: undo the arm's rotation so the rabbit stays readable, plus a tilt.
      const chain = B('body').rot + B('arm').rot + B('fore').rot + B('paw').rot;
      rabbitEl.setAttribute('transform', `rotate(${-chain + rp.tilt}) scale(${L.kr / L.k}) translate(${-RABBIT_BODY.x} ${-RABBIT_BODY.y})`);
    } else {
      rabbitEl.setAttribute('transform', `translate(${rp.x} ${rp.y}) scale(${rp.dir * L.kr} ${L.kr}) translate(${-RABBIT_FEET.x} ${-RABBIT_FEET.y})`);
    }
  };
  gsap.ticker.add(place);
  place();
  const beat = (name: string) => (stage.dataset.beat = name);
  const live = new Set<gsap.core.Animation>();
  const run = (t: gsap.core.Animation): Promise<void> =>
    new Promise((resolve, reject) => {
      if (signal.aborted) return (t.kill(), reject(new Error('aborted')));
      live.add(t);
      t.eventCallback('onComplete', () => (live.delete(t), resolve()));
      signal.addEventListener('abort', () => (t.kill(), reject(new Error('aborted'))), { once: true });
    });
  const hold = (s: number) => run(gsap.delayedCall(s, () => {}));
  /** Tweens a rig to a pose. */
  const pose = (rig: Rig, p: Pose, duration: number, ease: string) => {
    const tl = gsap.timeline();
    for (const [n, v] of Object.entries(p)) tl.to(rig.get(n), { ...v, duration, ease }, 0);
    return tl;
  };
  /** Where a point inside the bear's paw (or any part) is on the stage. */
  const onStage = (el: SVGGraphicsElement) => {
    const m = svg.getScreenCTM()!.inverse().multiply(el.getScreenCTM()!);
    return { x: m.e, y: m.f };
  };

  // Procedural walk cycle: diagonal legs swing together, the body bobs, belly and ears lag behind.
  const cycle = (p: number, amp: number) => {
    const a = Math.PI * 2 * p;
    const s = Math.sin(a);
    const c = Math.cos(a);
    B('thigh').rot = amp * s;
    B('shin').rot = -0.6 * amp * Math.max(0, c);
    B('thighF').rot = -amp * s;
    B('shinF').rot = -0.6 * amp * Math.max(0, -c);
    B('arm').rot = -amp * s;
    B('fore').rot = 0.7 * amp * Math.max(0, -c);
    B('armF').rot = amp * s;
    B('hips').y = -0.14 * amp * Math.abs(c);
    B('belly').y = 0.12 * amp * Math.sin(2 * a - 1.2);
    B('head').rot = 0.12 * amp * Math.sin(2 * a + 0.6);
    B('ear').rot = 0.35 * amp * Math.sin(2 * a - 0.9);
    B('earF').rot = 0.35 * amp * Math.sin(2 * a - 1.3);
    B('tail').rot = 0.5 * amp * s;
  };
  const walk = (toX: number, secs: number, amp: number, ease = 'none') => {
    const w = { p: 0 };
    const strides = Math.abs(toX - bp.x) / (62 * L.k * (amp > 26 ? 1.6 : 1));
    const tl = gsap.timeline();
    tl.to(bp, { x: toX, duration: secs, ease }, 0);
    tl.to(w, { p: strides, duration: secs, ease, onUpdate: () => cycle(w.p, amp) }, 0);
    return tl;
  };

  /** One rabbit hop: crouch (squash), launch (stretch, ears trail), arc, land (squash), settle. */
  const hop = (dist: number, secs: number, height: number) => {
    const tl = gsap.timeline();
    tl.to(R('root'), { sx: 1.2, sy: 0.78, duration: secs * 0.2, ease: 'power2.out' });
    tl.addLabel('air');
    tl.to(R('root'), { sx: 0.88, sy: 1.16, duration: secs * 0.25, ease: 'power2.out' }, 'air');
    tl.to(R('leg'), { rot: -45, duration: secs * 0.25, ease: 'power2.out' }, 'air');
    tl.to([R('ear'), R('earF')], { rot: 28, duration: secs * 0.3, ease: 'power1.out' }, 'air');
    tl.to(rp, { x: rp.x + dist * 1, duration: secs * 0.6, ease: 'none' }, 'air');
    tl.to(rp, { y: H - height, duration: secs * 0.3, ease: 'power2.out' }, 'air');
    tl.to(rp, { y: H, duration: secs * 0.3, ease: 'power2.in' }, `air+=${secs * 0.3}`);
    tl.to(R('root'), { sx: 1, sy: 1, duration: secs * 0.3, ease: 'sine.inOut' }, `air+=${secs * 0.25}`);
    tl.to(R('leg'), { rot: 0, duration: secs * 0.2, ease: 'power1.in' }, `air+=${secs * 0.4}`);
    tl.addLabel('land', `air+=${secs * 0.6}`);
    tl.to(R('root'), { sx: 1.24, sy: 0.78, duration: secs * 0.1, ease: 'power2.out' }, 'land');
    tl.to([R('ear'), R('earF')], { rot: -12, duration: secs * 0.12, ease: 'power2.out' }, 'land');
    tl.to(R('root'), { sx: 1, sy: 1, duration: secs * 0.22, ease: 'back.out(3)' }, `land+=${secs * 0.1}`);
    tl.to([R('ear'), R('earF')], { rot: 0, duration: secs * 0.3, ease: 'elastic.out(1, 0.4)' }, `land+=${secs * 0.1}`);
    return tl;
  };
  const hops = async (toX: number, each: number, secs: number, height: number) => {
    while (Math.abs(toX - rp.x) > 1) {
      const step = Math.sign(toX - rp.x) * Math.min(each, Math.abs(toX - rp.x));
      await run(hop(step, secs, height));
    }
  };

  try {
    // 1. Walk in from the left, alternating legs, and ease to a stop beside the bush.
    beat('walk');
    useArt(true);
    art.play('bear_walk', { fps: 11, loop: -1 });
    const sitX = X(L.sitX);
    await run(walk(sitX - 20 * L.k, Math.min(2.4, Math.max(1.5, (sitX + BEAR_REACH * L.k) / (140 * L.k))), 22));
    await run(walk(sitX, 0.45, 12, 'power2.out'));
    await run(pose(bear, { thigh: { rot: 0 }, shin: { rot: 0 }, thighF: { rot: 0 }, shinF: { rot: 0 }, arm: { rot: 0 }, fore: { rot: 0 }, armF: { rot: 0 }, hips: { y: 0 }, belly: { y: 0 }, head: { rot: 0 } }, 0.25, 'power2.out'));
    sound.bearHuff();

    // 2. Squat: a little rise (anticipation), drop onto his haunches, squash on landing, settle.
    beat('squat');
    art.play('bear_sit', { fps: 11 });
    await run(pose(bear, { hips: { y: -5 }, body: { rot: 6 }, head: { rot: -6 } }, 0.22, 'power2.out'));
    // Legs fold quickly; the hips drop last, so his feet never push into the ground.
    const LEGS = ['thigh', 'shin', 'thighF', 'shinF'];
    const sit = pose(bear, Object.fromEntries(Object.entries(SIT).filter(([n]) => n !== 'hips' && !LEGS.includes(n))), 0.42, 'power3.in');
    sit.add(pose(bear, Object.fromEntries(LEGS.map((n) => [n, SIT[n]])), 0.3, 'power2.out'), 0);
    sit.add(pose(bear, { hips: SIT.hips }, 0.42, 'power3.in'), 0);
    sit.to(bp, { sqy: 0.86, sqx: 1.1, duration: 0.09, ease: 'power2.out' }, 0.38);
    sit.to(B('belly'), { y: 6, duration: 0.09, ease: 'power2.out' }, 0.38);
    sit.to(bp, { sqy: 1, sqx: 1, duration: 0.4, ease: 'elastic.out(1, 0.45)' }, 0.47);
    sit.to(B('belly'), { y: 0, duration: 0.6, ease: 'elastic.out(1, 0.3)' }, 0.47);
    sit.to([B('ear'), B('earF')], { rot: 18, duration: 0.1, ease: 'power2.out' }, 0.38);
    sit.to([B('ear'), B('earF')], { rot: 0, duration: 0.6, ease: 'elastic.out(1, 0.35)' }, 0.48);
    await run(sit);
    await hold(0.25);

    // 3. Strain: eyes squeezed shut, jaw clenched, the whole body quivering, sweat dripping.
    beat('strain');
    useArt(false);
    show(bearEl, 'eye', 'shut');
    show(bearEl, 'brow', 'strain');
    B('sweat').el.style.display = '';
    await run(pose(bear, STRAIN, 0.35, 'power2.inOut'));
    const quiver = gsap.to(bp, { jitter: 1.4 * L.k, duration: 0.035, repeat: -1, yoyo: true, ease: 'none' });
    const sweat = gsap.fromTo(B('sweat'), { y: -2 }, { y: 7, duration: 0.6, repeat: -1, ease: 'power1.in' });
    const swell = gsap.to(B('belly'), { y: 3, sx: 1.04, duration: 0.5, repeat: -1, yoyo: true, ease: 'sine.inOut' });
    [quiver, sweat, swell].forEach((t) => live.add(t));
    sound.bearGrunt();
    await hold(0.9);
    sound.bearGrunt();

    // 4. The rabbit hops in from the right and stops beside him, right where his paw will reach.
    beat('rabbit');
    const saved = BEAR_JOINTS.map((n) => ({ ...B(n) }));
    Object.entries(REACH).forEach(([n, v]) => Object.assign(B(n), v));
    bear.render();
    place();
    const target = onStage(grip);
    BEAR_JOINTS.forEach((n, i) => Object.assign(B(n), { x: saved[i].x, y: saved[i].y, rot: saved[i].rot, sx: saved[i].sx, sy: saved[i].sy }));
    bear.render();
    const stopX = target.x - (RABBIT_BODY.x - RABBIT_FEET.x) * L.kr;
    await hops(stopX, 64 * L.kr, 0.3, 18 * L.kr);

    // 5. Sniff, sniff.
    beat('sniff');
    const sniff = gsap.timeline();
    sniff.to(R('head'), { rot: -10, duration: 0.15, ease: 'power2.out' });
    sniff.to(R('nose'), { sx: 1.45, sy: 1.45, duration: 0.07, repeat: 7, yoyo: true, ease: 'sine.inOut' }, 0.1);
    sniff.to(R('ear'), { rot: -14, duration: 0.12, repeat: 1, yoyo: true, ease: 'power2.out' }, 0.3);
    sniff.to(R('head'), { rot: -4, duration: 0.2, ease: 'sine.inOut' }, 0.7);
    await run(sniff);

    // 6. His eyes pop open. Slow head turn down to the rabbit. Hold.
    beat('notice');
    quiver.kill();
    sweat.kill();
    swell.kill();
    bp.jitter = 0;
    B('sweat').el.style.display = 'none';
    show(bearEl, 'brow', 'none');
    show(bearEl, 'eye', 'pop');
    sound.pop();
    await run(gsap.fromTo(B('eye'), { sx: 0.3, sy: 0.3 }, { sx: 1, sy: 1, duration: 0.3, ease: 'back.out(4)' }));
    await run(pose(bear, { jaw: { rot: 6 }, belly: { y: 0, sx: 1 } }, 0.15, 'power2.out'));
    await hold(0.25);
    await run(pose(bear, TURN, 0.75, 'sine.inOut'));
    show(bearEl, 'eye', 'open');
    await hold(0.5);

    // 7. Wind-up: the arm pulls back, body leans away (anticipation)... then shoots out and grabs.
    beat('windup');
    await run(pose(bear, WINDUP, 0.32, 'power2.out'));
    await hold(0.14);
    beat('grab');
    sound.swish();
    await run(pose(bear, REACH, 0.13, 'power3.in'));
    // Got him: into the paw, squashed flat, ears pinned, eyes huge.
    rp.held = true;
    grip.append(rabbitEl);
    place();
    show(rabbitEl, 'eye', 'huge');
    sound.rabbitSqueak();
    const squash = gsap.timeline();
    squash.to(R('root'), { sx: 1.32, sy: 0.7, duration: 0.08, ease: 'power3.out' }, 0);
    squash.to([R('ear'), R('earF')], { rot: 70, duration: 0.08, ease: 'power3.out' }, 0);
    squash.add(pose(bear, { arm: { rot: -46 }, fore: { rot: -22 } }, 0.08, 'power2.out'), 0); // follow-through
    await run(squash);
    await run(pose(bear, CLUTCH, 0.32, 'back.out(1.6)'));
    await hold(0.3);

    // 8. Up into a half-squat, rump pushed back, tail lifted. The paw reaches behind and holds the
    // rabbit flat against his rump, right under the tail, and gives two short up-and-down strokes
    // along its curve. The rabbit: deadpan, ears flopping. The bear: relieved.
    beat('wipe');
    show(rabbitEl, 'fur', 'frazzled');
    sound.swish();
    // From here until he lets go the arm is drawn over his thigh, the rabbit riding its grip.
    rp.tilt = 0;
    rp.wiping = true;
    svg.insertBefore(rabbitEl, reachPaw);
    reach.style.display = '';
    reachPaw.style.display = '';
    B('arm').el.style.visibility = 'hidden';
    place();
    const stroke = { t: 0.5 };
    const aim = () => Object.assign(B('arm'), reachFor(rumpPoint(stroke.t)));
    const mid = reachFor(rumpPoint(0.5));
    const behind = pose(bear, HALF_SQUAT, 0.36, 'power2.inOut');
    behind.to(B('arm'), { rot: mid.rot, sy: mid.sy, duration: 0.36, ease: 'power2.inOut' }, 0);
    behind.to([B('fore'), B('paw')], { rot: 0, duration: 0.36, ease: 'power2.inOut' }, 0);
    behind.to(rp, { tilt: RUMP_TILT, duration: 0.3, ease: 'power2.inOut' }, 0.06);
    behind.to(R('root'), { sx: 1, sy: 1, duration: 0.2, ease: 'power2.out' }, 0.1);
    behind.to([R('ear'), R('earF')], { rot: -60, duration: 0.25, ease: 'power2.out' }, 0.1);
    behind.call(() => {
      show(rabbitEl, 'eye', 'deadpan');
      show(rabbitEl, 'mouth', 'flat');
      show(bearEl, 'eye', 'happy');
      show(bearEl, 'brow', 'relief');
    }, [], 0.26);
    await run(behind);
    for (let i = 0; i < 2; i++) {
      stage.dataset.wipes = String(i + 1);
      sound.rabbitSqueak();
      const w = gsap.timeline();
      // Up the curve...
      w.to(stroke, { t: 1, duration: 0.15, ease: 'power2.inOut', onUpdate: aim }, 0);
      w.to(rp, { tilt: RUMP_TILT + 12, duration: 0.15, ease: 'power2.inOut' }, 0);
      w.to(R('ear'), { rot: -100, duration: 0.15, ease: 'power2.out' }, 0);
      w.to(R('earF'), { rot: -80, duration: 0.15, ease: 'power2.out' }, 0.03);
      w.to(B('tail'), { rot: -34, duration: 0.15, ease: 'sine.inOut' }, 0);
      w.to(B('hips'), { y: 5.5, duration: 0.15, ease: 'sine.inOut' }, 0);
      // ...and back down, ears flopping the other way.
      w.to(stroke, { t: 0, duration: 0.15, ease: 'power2.inOut', onUpdate: aim }, 0.15);
      w.to(rp, { tilt: RUMP_TILT - 8, duration: 0.15, ease: 'power2.inOut' }, 0.15);
      w.to(R('ear'), { rot: -25, duration: 0.15, ease: 'power2.out' }, 0.15);
      w.to(R('earF'), { rot: -5, duration: 0.15, ease: 'power2.out' }, 0.18);
      w.to(B('tail'), { rot: -10, duration: 0.15, ease: 'sine.inOut' }, 0.15);
      w.to(B('hips'), { y: 8, duration: 0.15, ease: 'sine.inOut' }, 0.15);
      await run(w);
    }
    await hold(0.18);

    // 9. Sits back, sets it down in front of him and lets go.
    beat('setdown');
    show(bearEl, 'eye', 'open');
    show(bearEl, 'brow', 'none');
    const sitBack = pose(bear, { hips: SIT.hips, thigh: SIT.thigh, shin: SIT.shin, thighF: SIT.thighF, shinF: SIT.shinF, armF: SIT.armF, tail: { ...SIT.tail, x: 0, y: 0 } }, 0.42, 'power2.inOut');
    sitBack.to(B('arm'), { sy: 1, duration: 0.42, ease: 'power2.inOut' }, 0);
    sitBack.to(rp, { tilt: 0, duration: 0.42, ease: 'power2.inOut' }, 0);
    sitBack.to([R('ear'), R('earF')], { rot: 0, duration: 0.3, ease: 'power2.out' }, 0);
    sitBack.to(R('root'), { sx: 1.3, sy: 0.72, duration: 0.2, ease: 'power2.out' }, 0); // squashed in his paw again
    sitBack.add(pose(bear, SETDOWN, 0.42, 'power2.inOut'), 0);
    await run(sitBack);
    const at = onStage(grip);
    // Let go: back to his own arm (it's out in front again), the rabbit on its own feet.
    rp.wiping = false;
    reach.style.display = 'none';
    reachPaw.style.display = 'none';
    B('arm').el.style.visibility = '';
    show(rabbitEl, 'eye', 'huge');
    show(rabbitEl, 'mouth', 'none');
    rp.held = false;
    svg.append(rabbitEl);
    rp.x = at.x - (RABBIT_BODY.x - RABBIT_FEET.x) * L.kr;
    rp.y = Math.min(H, at.y + (RABBIT_FEET.y - RABBIT_BODY.y) * L.kr);
    place();
    gsap.set(R('root'), { sx: 0.9, sy: 1.12 });
    gsap.set([R('ear'), R('earF')], { rot: 0, sy: 1.1 });
    const drop = gsap.timeline();
    drop.to(rp, { y: H, duration: 0.12, ease: 'power2.in' }, 0);
    drop.add(pose(bear, CLUTCH, 0.35, 'power2.out'), 0);
    drop.add(pose(bear, { head: { rot: 58 }, jaw: { rot: 0 } }, 0.3, 'power2.out'), 0);
    await run(drop);

    // 10. The rabbit freezes stiff, fur frazzled... then shakes it off like a wet dog.
    beat('freeze');
    await hold(0.65);
    beat('shake');
    sound.shakeOff();
    const shake = gsap.timeline();
    shake.to(R('root'), { rot: 14, duration: 0.05, repeat: 7, yoyo: true, ease: 'sine.inOut' }, 0);
    shake.to([R('ear'), R('earF')], { rot: -35, sy: 1, duration: 0.06, repeat: 7, yoyo: true, ease: 'sine.inOut' }, 0.02);
    shake.to(R('root'), { rot: 0, sx: 1, sy: 1, duration: 0.15, ease: 'back.out(2)' });
    shake.to([R('ear'), R('earF')], { rot: 0, duration: 0.3, ease: 'elastic.out(1, 0.4)' }, '<');
    shake.call(() => {
      show(rabbitEl, 'fur', 'smooth');
      show(rabbitEl, 'eye', 'normal');
    }, [], 0.38);
    await run(shake);
    await hold(0.12);

    // 11. Both bolt: the rabbit right (ears flat, speed lines), the bear left with a satisfied hop.
    beat('bolt');
    sound.bearHuff();
    rp.dir = -1;
    show(rabbitEl, 'lines', 'on');
    gsap.set([R('ear'), R('earF')], { rot: 72 });
    const rabbitRun = (async () => {
      await run(gsap.to(R('root'), { sx: 1.22, sy: 0.76, duration: 0.08, ease: 'power2.out' }));
      await hops(W + RABBIT_H * L.kr * 2, 70 * L.kr, 0.2, 9 * L.kr);
    })();
    const bearRun = (async () => {
      await run(pose(bear, STAND, 0.3, 'back.out(1.4)'));
      const turn = gsap.timeline();
      turn.to(B('face'), { sx: -1, duration: 0.2, ease: 'power2.inOut' }, 0);
      turn.to(bp, { sqy: 0.9, duration: 0.1, repeat: 1, yoyo: true, ease: 'sine.inOut' }, 0);
      await run(turn);
      // A satisfied little hop.
      const jump = gsap.timeline();
      jump.to(bp, { sqy: 0.85, sqx: 1.1, duration: 0.08, ease: 'power2.out' });
      jump.to(bp, { y: H - 16 * L.k, sqy: 1.08, sqx: 0.95, duration: 0.16, ease: 'power2.out' });
      jump.to(bp, { y: H, sqy: 1, sqx: 1, duration: 0.14, ease: 'power2.in' });
      jump.to(bp, { sqy: 0.88, sqx: 1.08, duration: 0.06, ease: 'power2.out' });
      jump.to(bp, { sqy: 1, sqx: 1, duration: 0.2, ease: 'back.out(3)' });
      await run(jump);
      useArt(true);
      art.el.classList.add('flip');
      art.play('bear_walk', { fps: 18, loop: -1 });
      await run(walk(-BEAR_REACH * L.k * 1.2, 1.1, 30, 'power1.in'));
    })();
    await Promise.all([rabbitRun, bearRun]);
    beat('done');
  } finally {
    live.forEach((t) => t.kill());
    gsap.ticker.remove(place);
    art.destroy();
    bear.destroy();
    rabbit.destroy();
    stage.remove();
  }
}

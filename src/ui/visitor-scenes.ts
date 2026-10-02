// Wildlife Log entries 8 to 10, animated with GSAP on puppet rigs (rig.ts, rigs.ts), in the same
// small background scale as the others and never over the board or the buttons:
//   gopher (Cardium): pops out of a hole by the bottom fence, stands, whistles, drops back down;
//   geese (any region): a V crosses the sky above the board, a straggler honking to catch up;
//   pumper (any region): the lease operator's pickup rolls up outside the fence, he checks a gauge,
//   writes on his clipboard, and drives off.
// Each stage's `data-beat` names the current beat (tests read it).
import { gsap } from 'gsap';
import { sound } from '../audio/engine.ts';
import { freeSpot } from './gags.ts';
import { Rig, sceneRunner, show } from './rig.ts';
import { GAUGE_RIG, GOOSE_RIG, GOPHER_HOLE, GOPHER_RIG, PUMPER_RIG, PUMPER_TRUCK } from './rigs.ts';

/** The strip between the board and the buttons, in board px, plus things already standing in it. */
export interface Strip {
  /** Ground line (feet stand here) and the strip's height. */
  base: number;
  h: number;
  screenL: number;
  screenR: number;
  cell: number;
  avoid: { left: number; right: number }[];
}

const div = (cls: string, html = '') => {
  const el = document.createElement('div');
  el.className = cls;
  el.innerHTML = html;
  return el;
};
const size = (el: HTMLElement, w: number, h: number) => Object.assign(el.style, { width: `${w}px`, height: `${h}px` });
/** Faces a figure left or right by mirroring its drawing (GSAP owns the element's own transform). */
const face = (el: HTMLElement, dir: 1 | -1) => (el.querySelector<SVGElement>(':scope > svg')!.style.transform = dir < 0 ? 'scaleX(-1)' : '');

// ---------- Gopher ----------

/** Gopher art: feet (and the hole's rim) at y = 60; ear tips at y = 8; root at x = 20. */
const GOPHER_FEET = 60;
const GOPHER_TOP = 8;

export async function playGopher(layer: HTMLElement, g: Strip, signal: AbortSignal): Promise<void> {
  const gh = Math.min(g.h * 0.8, g.cell * 1.15);
  const k = gh / (GOPHER_FEET - GOPHER_TOP);
  const holeW = 40 * k * 1.15;
  const holeH = 12 * k * 1.15;
  const noteRoom = 14 * k;
  const w = holeW + noteRoom * 2;
  const x = freeSpot(g.screenL + 8, g.screenR - 8, w, g.avoid, 0.15 + Math.random() * 0.7) ?? g.screenL + 8;
  const H = gh + noteRoom;
  const stage = div('gag wild gopher-stage');
  size(stage, w, H);
  stage.style.transform = `translate(${x}px, ${g.base - H}px)`;
  // He's seen through a window whose bottom edge is the middle of the hole.
  const win = div('gopher-window', GOPHER_RIG);
  const winH = H - holeH * 0.5;
  Object.assign(win.style, { position: 'absolute', left: '0', top: '0', width: `${w}px`, height: `${winH}px`, overflow: 'hidden' });
  const svg = win.querySelector('svg')!;
  Object.assign(svg.style, { position: 'absolute', width: `${52 * k}px`, height: `${72 * k}px`, left: `${w / 2 - 26 * k}px`, top: `${winH - (GOPHER_FEET + 10) * k}px` });
  const hole = div('gopher-hole', GOPHER_HOLE);
  Object.assign(hole.style, { position: 'absolute', left: `${w / 2 - holeW / 2}px`, top: `${H - holeH}px`, width: `${holeW}px`, height: `${holeH}px` });
  stage.append(hole, win);
  layer.append(stage);
  const rig = new Rig(win);
  const J = (n: string) => rig.get(n);
  const beat = (b: string) => (stage.dataset.beat = b);
  const { run, hold, stop } = sceneRunner(signal);
  const hidden = GOPHER_FEET - GOPHER_TOP + 6;
  J('root').y = hidden;
  rig.render();
  try {
    beat('hole');
    await run(gsap.fromTo(hole, { scale: 0 }, { scale: 1, duration: 0.25, ease: 'back.out(2.5)' }));
    // Peeks out (just his head), looks left, looks right.
    beat('peek');
    await run(gsap.to(J('root'), { y: hidden * 0.52, duration: 0.22, ease: 'back.out(2)' }));
    await hold(0.2);
    const look = gsap.timeline();
    look.to(J('head'), { rot: -14, duration: 0.14, ease: 'power2.out' });
    look.to(J('head'), { rot: 14, duration: 0.2, ease: 'power2.inOut' }, '+=0.12');
    look.to(J('head'), { rot: 0, duration: 0.14, ease: 'power2.out' }, '+=0.12');
    await run(look);
    // Pops right up, stretching tall like a picket pin, and settles.
    beat('up');
    const up = gsap.timeline();
    up.to(J('root'), { y: -3, sy: 1.12, sx: 0.92, duration: 0.16, ease: 'power2.out' }, 0);
    up.to(J('root'), { y: 0, sy: 1, sx: 1, duration: 0.3, ease: 'back.out(3)' }, 0.16);
    up.to(J('tail'), { rot: -25, duration: 0.12, yoyo: true, repeat: 1, ease: 'power2.out' }, 0.1);
    up.to(J('paws'), { y: -1.5, duration: 0.15, ease: 'power2.out' }, 0.2);
    await run(up);
    await hold(0.25);
    // Whistles, twice: head back, mouth pursed, a note floating up.
    beat('whistle');
    for (let i = 0; i < 2; i++) {
      show(win, 'mouth', 'whistle');
      show(win, 'note', 'on');
      sound.whistle();
      const w2 = gsap.timeline();
      w2.to(J('head'), { rot: -8, duration: 0.1, ease: 'power2.out' }, 0);
      w2.to(J('root'), { sy: 1.06, duration: 0.1, yoyo: true, repeat: 1, ease: 'sine.inOut' }, 0);
      w2.fromTo(J('note'), { y: 2, sx: 0.6, sy: 0.6 }, { y: -6, sx: 1, sy: 1, duration: 0.35, ease: 'power2.out' }, 0);
      w2.to(J('head'), { rot: 0, duration: 0.15, ease: 'power2.inOut' }, 0.25);
      await run(w2);
      show(win, 'mouth', 'shut');
      show(win, 'note', 'off');
      await hold(0.12);
    }
    await hold(0.2);
    // Drops back down the hole: a tiny lift, then gone; the hole closes after him.
    beat('down');
    const down = gsap.timeline();
    down.to(J('root'), { y: -2, sy: 1.05, duration: 0.08, ease: 'power2.out' });
    down.to(J('root'), { y: hidden, sy: 0.9, duration: 0.16, ease: 'power3.in' });
    down.to(hole, { scale: 0, duration: 0.25, ease: 'back.in(2)' }, '+=0.1');
    await run(down);
    beat('done');
  } finally {
    stop();
    rig.destroy();
    stage.remove();
  }
}

// ---------- Canada geese ----------

/**
 * A V of geese across the sky above the board (behind the HUD), with one straggler flapping hard
 * and honking to catch up. `top`/`bottom` bound the sky (board px; bottom is just above the fence).
 */
export async function playGeese(layer: HTMLElement, g: { top: number; bottom: number; screenL: number; screenR: number; cell: number }, signal: AbortSignal): Promise<void> {
  const band = g.bottom - g.top;
  const gw = Math.max(16, Math.min(g.cell * 0.5, 28));
  const gh = (gw * 40) / 64;
  const dy = Math.max(2, Math.min(gw * 0.28, (band - gh) / 7));
  const ltr = Math.random() < 0.5;
  // Formation, relative to the leader (x behind him, y above or below).
  const slots: [number, number][] = [[0, 0]];
  for (let i = 1; i <= 3; i++) slots.push([-i * gw * 0.72, -i * dy], [-i * gw * 0.72, i * dy]);
  const span = gw * 6;
  const stage = div('gag geese-stage');
  const H = 7 * dy + gh + 4;
  const W = span + gw * 2;
  size(stage, W, H);
  // The flock is drawn heading right; flying left, this inner layer is mirrored.
  const flock = div('flock');
  size(flock, W, H);
  Object.assign(flock.style, { position: 'absolute', left: '0', top: '0' });
  stage.append(flock);
  const cy = g.top + band * 0.5;
  const geese = slots.map(([sx, sy]) => {
    const el = div('goose', GOOSE_RIG);
    size(el, gw, gh);
    Object.assign(el.style, { position: 'absolute', left: '0', top: '0' });
    gsap.set(el, { x: span + sx, y: H / 2 - gh / 2 + sy });
    flock.append(el);
    return el;
  });
  const straggler = div('goose straggler', GOOSE_RIG);
  size(straggler, gw, gh);
  Object.assign(straggler.style, { position: 'absolute', left: '0', top: '0' });
  const lag = { x: -gw * 5.6 };
  gsap.set(straggler, { x: span + lag.x, y: H / 2 - gh / 2 + 3 * dy });
  flock.append(straggler);
  if (!ltr) flock.style.transform = 'scaleX(-1)';
  layer.append(stage);
  const rigs = [...geese, straggler].map((el) => new Rig(el));
  const { run, keep, stop } = sceneRunner(signal);
  // Wings flap, each goose a little out of step; the straggler flaps twice as fast.
  rigs.forEach((r, i) => {
    const fast = i === rigs.length - 1;
    const t = fast ? 0.15 : 0.3;
    keep(gsap.fromTo(r.get('wing'), { rot: 30 }, { rot: -40, duration: t, repeat: -1, yoyo: true, ease: 'sine.inOut', delay: (i % 3) * 0.09 }));
    keep(gsap.fromTo(r.get('wingF'), { rot: 24 }, { rot: -32, duration: t, repeat: -1, yoyo: true, ease: 'sine.inOut', delay: (i % 3) * 0.09 + 0.03 }));
  });
  const from = ltr ? g.screenL - W : g.screenR;
  const to = ltr ? g.screenR + gw * 2 : g.screenL - W - gw * 2;
  stage.dataset.beat = 'fly';
  let honks = 0;
  const honk = () => {
    stage.dataset.honks = String(++honks);
    sound.honk();
  };
  try {
    const fly = gsap.timeline();
    fly.fromTo(stage, { x: from, y: cy - H / 2 }, { x: to, duration: 5.5, ease: 'none' }, 0);
    fly.to(stage, { y: cy - H / 2 - 3, duration: 0.9, yoyo: true, repeat: 5, ease: 'sine.inOut' }, 0);
    // The straggler closes the gap, but he's still last when they leave.
    fly.to(lag, { x: -gw * 3.4, duration: 5.2, ease: 'power1.inOut', onUpdate: () => gsap.set(straggler, { x: span + lag.x }) }, 0);
    for (const at of [0.8, 2.3, 3.8]) fly.call(honk, [], at);
    fly.call(() => sound.honk(), [], 1.5); // the leader answers once
    await run(fly);
    stage.dataset.beat = 'done';
  } finally {
    stop();
    rigs.forEach((r) => r.destroy());
    stage.remove();
  }
}

// ---------- The pumper ----------

export async function playPumper(layer: HTMLElement, g: Strip, signal: AbortSignal): Promise<void> {
  const th = Math.min(g.h * 0.6, g.cell * 0.95);
  const tw = (th * 120) / 52;
  const mh = Math.min(g.h * 0.92, th * 1.25);
  const mw = (mh * 44) / 76;
  const gh = th * 0.85;
  const gw = (gh * 24) / 44;
  const gap = tw * 0.3;
  const span = tw + gap + gw;
  const ltr = Math.random() < 0.5;
  const left = freeSpot(g.screenL + 6, g.screenR - 6, span, g.avoid, 0.5) ?? g.screenL + 6;
  const truckX = ltr ? left : left + gw + gap;
  const gaugeX = ltr ? left + tw + gap : left;
  const stage = div('gag wild pumper-stage');
  const H = Math.max(mh, th) + 4;
  // Spans the strip (its parts are placed in board px from its left edge).
  size(stage, Math.max(1, g.screenR), H);
  stage.style.transform = `translate(0px, ${g.base - H}px)`;
  const truck = div('pumper-truck', PUMPER_TRUCK);
  const man = div('pumper-man', PUMPER_RIG);
  const gauge = div('pumper-gauge', GAUGE_RIG);
  // Back to front: the gauge by the fence, the truck, the man.
  for (const [el, w, h] of [
    [gauge, gw, gh],
    [truck, tw, th],
    [man, mw, mh],
  ] as const) {
    size(el, w, h);
    Object.assign(el.style, { position: 'absolute', left: '0', top: `${H - h}px` });
    stage.append(el);
  }
  // The truck and the man face the way they're going; flip both when that's left.
  face(truck, ltr ? 1 : -1);
  man.style.opacity = '0';
  gsap.set(gauge, { x: gaugeX, opacity: 0 });
  layer.append(stage);
  const truckRig = new Rig(truck);
  const manRig = new Rig(man);
  const gaugeRig = new Rig(gauge);
  const M = (n: string) => manRig.get(n);
  const beat = (b: string) => (stage.dataset.beat = b);
  const { run, hold, keep, stop } = sceneRunner(signal);
  const offL = g.screenL - tw * 1.2;
  const offR = g.screenR + tw * 0.2;
  // His door is just behind the cab; he checks the gauge from the side nearest the truck.
  const doorX = truckX + (ltr ? tw * 0.58 : tw * 0.42) - mw / 2;
  const standX = ltr ? gaugeX - mw * 0.75 : gaugeX + gw - mw * 0.25;
  const walk = (toX: number, dir: 1 | -1) => {
    face(man, dir);
    const dist = Math.abs(toX - Number(gsap.getProperty(man, 'x')));
    const secs = Math.max(0.5, dist / (mh * 1.4));
    const tl = gsap.timeline();
    tl.to(man, { x: toX, duration: secs, ease: 'none' }, 0);
    const steps = Math.max(2, Math.round(secs / 0.16));
    for (let i = 0; i < steps; i++) {
      const a = i % 2 ? 1 : -1;
      tl.to(M('legF'), { rot: 20 * a, duration: 0.16, ease: 'sine.inOut' }, i * 0.16);
      tl.to(M('legB'), { rot: -20 * a, duration: 0.16, ease: 'sine.inOut' }, i * 0.16);
      tl.to(M('root'), { y: -1.5, duration: 0.08, yoyo: true, repeat: 1, ease: 'sine.out' }, i * 0.16);
    }
    tl.to([M('legF'), M('legB')], { rot: 0, duration: 0.12, ease: 'power2.out' });
    return tl;
  };
  try {
    // Rolls up and parks, with a little nose dip as he brakes.
    beat('arrive');
    gsap.to(gauge, { opacity: 1, duration: 0.3 });
    sound.putter(1.6);
    const arrive = gsap.timeline();
    arrive.fromTo(truck, { x: ltr ? offL : offR }, { x: truckX, duration: 1.5, ease: 'power2.out' }, 0);
    arrive.to(truck, { rotation: ltr ? 2 : -2, transformOrigin: ltr ? '90% 90%' : '10% 90%', duration: 0.12, yoyo: true, repeat: 1, ease: 'sine.out' }, 1.38);
    await run(arrive);
    // Door opens; out he gets.
    beat('out');
    sound.carDoor();
    await run(gsap.to(truckRig.get('door'), { sx: -0.35, duration: 0.18, ease: 'power2.out' }));
    gsap.set(man, { x: doorX, y: 3 });
    await run(gsap.to(man, { opacity: 1, y: 0, duration: 0.2, ease: 'power2.out' }));
    // Over to the gauge.
    beat('walk');
    await run(walk(standX, ltr ? 1 : -1));
    // Leans in, reads the gauge (the needle settles).
    beat('check');
    const check = gsap.timeline();
    check.to(M('head'), { rot: 10, duration: 0.2, ease: 'power2.out' }, 0);
    check.fromTo(gaugeRig.get('needle'), { rot: -10 }, { rot: 38, duration: 0.8, ease: 'elastic.out(1, 0.3)' }, 0.1);
    check.to(M('head'), { rot: 0, duration: 0.2, ease: 'power2.inOut' }, 0.8);
    await run(check);
    // Writes it down on his clipboard, with a nod.
    beat('write');
    sound.scribble();
    const write = gsap.timeline();
    write.to(M('arm'), { rot: -12, duration: 0.15, ease: 'power2.out' }, 0);
    write.add(keep(gsap.to(M('hand'), { rot: 12, duration: 0.07, repeat: 9, yoyo: true, ease: 'sine.inOut' })), 0.1);
    write.to(M('head'), { rot: 8, duration: 0.12, yoyo: true, repeat: 3, ease: 'sine.inOut' }, 0.4);
    write.to(M('arm'), { rot: 0, duration: 0.2, ease: 'power2.inOut' }, 0.85);
    await run(write);
    await hold(0.15);
    // Back to the truck, in, door shut, and off he goes.
    beat('back');
    await run(walk(doorX, ltr ? -1 : 1));
    await run(gsap.to(man, { opacity: 0, y: 3, duration: 0.18, ease: 'power2.in' }));
    sound.carDoor();
    await run(gsap.to(truckRig.get('door'), { sx: 1, duration: 0.14, ease: 'power2.in' }));
    beat('leave');
    sound.putter(1.3);
    const leave = gsap.timeline();
    leave.to(truck, { x: ltr ? offR : offL, duration: 1.3, ease: 'power2.in' }, 0.1);
    leave.to(gauge, { opacity: 0, duration: 0.4 }, 0.9);
    await run(leave);
    beat('done');
  } finally {
    stop();
    [truckRig, manRig, gaugeRig].forEach((r) => r.destroy());
    stage.remove();
  }
}

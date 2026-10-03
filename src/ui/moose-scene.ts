// The Duvernay moose: a quick peekaboo over the top fence, animated with GSAP on a puppet rig
// (rig.ts, rigs.ts). Small, behind the HUD and the board: only his head and antlers pop up above
// the fence. He blinks, chews once, holds a short stare, and ducks back out. Under 3 seconds.
// The peek window's `data-beat` names the current beat (tests read it).
import { gsap } from 'gsap';
import { sound } from '../audio/engine.ts';
import { Sprite } from './anim.ts';
import { Rig, show } from './rig.ts';
import { MOOSE_RIG } from './rigs.ts';

/** Art: antler tips, the chin line (everything below stays hidden behind the fence), eyes, drawing box. */
const ANTLER_TOP = 14;
export const CHIN = 118;
export const MOOSE_H = CHIN - ANTLER_TOP;
export const MOOSE_EYES = CHIN - 60;
const VIEW = { x: -10, y: -6, w: 180, h: 150 };
/** Beat lengths in seconds: pop up, blink and chew, stare, duck out. */
export const PEEK = { up: 0.45, chew: 0.65, stare: 0.7, down: 0.45 };

/**
 * Plays the scene once, centred at `cx` (board px). `clipY` is where he disappears behind the fence
 * (board px, just inside the top fence); `h` is how tall he shows, antler tips to chin.
 */
export async function playMoose(host: HTMLElement, g: { cx: number; clipY: number; h: number }, signal: AbortSignal): Promise<void> {
  const k = g.h / MOOSE_H;
  const w = VIEW.w * k;
  const winH = (CHIN - VIEW.y) * k;
  const peek = document.createElement('div');
  peek.className = 'gag moose-peek';
  Object.assign(peek.style, { width: `${w}px`, height: `${winH}px`, transform: `translate(${g.cx - w / 2}px, ${g.clipY - winH}px)` });
  peek.innerHTML = MOOSE_RIG;
  const svg = peek.querySelector('svg')!;
  Object.assign(svg.style, { width: `${w}px`, height: `${VIEW.h * k}px` });
  // The new animated moose (Batch C), standing at the fence line (the window's bottom edge). The old
  // drawn moose stays underneath for the chew beat until moose_chew is redone.
  const moose = new Sprite('moose', (g.h * 1.1) / 221);
  moose.el.style.transform = `translate(${w / 2}px, ${winH}px)`;
  peek.append(moose.el);
  const drawn = (on: boolean) => {
    svg.style.visibility = on ? 'visible' : 'hidden';
    moose.el.style.visibility = on ? 'hidden' : 'visible';
  };
  drawn(false);
  host.append(peek);
  const rig = new Rig(peek);
  const J = (n: string) => rig.get(n);
  const beat = (name: string) => (peek.dataset.beat = name);
  const live = new Set<gsap.core.Animation>();
  const run = (t: gsap.core.Animation): Promise<void> =>
    new Promise((resolve, reject) => {
      if (signal.aborted) return (t.kill(), reject(new Error('aborted')));
      live.add(t);
      t.eventCallback('onComplete', () => (live.delete(t), resolve()));
      signal.addEventListener('abort', () => (t.kill(), reject(new Error('aborted'))), { once: true });
    });
  const hidden = CHIN - ANTLER_TOP + 8;

  try {
    // 1. Pops up over the fence (overshoot, antlers and ears lagging).
    beat('up');
    moose.play('moose_rise', { fps: 8 / PEEK.up });
    J('lean').y = hidden;
    rig.render();
    const up = gsap.timeline();
    up.to(J('lean'), { y: 0, duration: PEEK.up, ease: 'back.out(2.2)' }, 0);
    up.fromTo([J('antlerL'), J('antlerR')], { rot: (i: number) => (i ? 6 : -6) }, { rot: 0, duration: PEEK.up, ease: 'elastic.out(1, 0.5)' }, 0.1);
    up.fromTo([J('earL'), J('earR')], { rot: (i: number) => (i ? 20 : -20) }, { rot: 0, duration: PEEK.up, ease: 'back.out(3)' }, 0.15);
    await run(up);

    // 2. Blinks, chews once.
    beat('chew');
    drawn(true);
    const chew = gsap.timeline();
    chew.call(() => show(peek, 'eye', 'shut'), [], 0);
    chew.call(() => show(peek, 'eye', 'open'), [], 0.12);
    chew.to(J('jaw'), { x: 3, rot: 7, y: 3, duration: 0.2, ease: 'sine.inOut' }, 0.15);
    chew.to(J('grass'), { rot: 12, duration: 0.22, ease: 'sine.inOut' }, 0.18);
    chew.to(J('jaw'), { x: 0, rot: 0, y: 0, duration: 0.25, ease: 'sine.inOut' }, 0.38);
    chew.to(J('grass'), { rot: 0, duration: 0.25, ease: 'sine.inOut' }, 0.4);
    chew.to({}, { duration: PEEK.chew - chew.duration() > 0 ? PEEK.chew - chew.duration() : 0 });
    await run(chew);

    // 3. A short, wide-eyed stare right at you.
    beat('stare');
    drawn(false);
    moose.play('moose_stare', { fps: 6 / PEEK.stare });
    show(peek, 'eye', 'stare');
    sound.mooseGroan();
    const stare = gsap.timeline();
    stare.to(J('head'), { rot: 4, duration: 0.15, ease: 'back.out(3)' }, 0);
    stare.to({}, { duration: PEEK.stare - 0.15 });
    await run(stare);
    show(peek, 'eye', 'open');

    // 4. Ducks back out: a tiny lift (anticipation), then down behind the fence.
    beat('down');
    moose.play('moose_duck', { fps: 8 / PEEK.down });
    const down = gsap.timeline();
    down.to(J('lean'), { y: -3, duration: 0.1, ease: 'power2.out' }, 0);
    down.to(J('lean'), { y: hidden, duration: PEEK.down - 0.1, ease: 'power2.in' }, 0.1);
    down.to([J('antlerL'), J('antlerR')], { rot: (i: number) => (i ? -5 : 5), duration: 0.25, ease: 'power2.in' }, 0.12);
    await run(down);
    beat('done');
  } finally {
    live.forEach((t) => t.kill());
    moose.destroy();
    rig.destroy();
    peek.remove();
  }
}

// The Duvernay moose, animated with GSAP on a puppet rig (rig.ts, rigs.ts). He stands behind the
// top fence: only his head, antlers and shoulders show, clipped at the fence. He rises into view and
// leans in, chews slowly on a sprig of grass, stares right at you for 2 seconds while he groans,
// then pulls back out of sight. The peek window's `data-beat` names the current beat (tests read it).
import { gsap } from 'gsap';
import { sound } from '../audio/engine.ts';
import { Rig, show } from './rig.ts';
import { MOOSE_RIG } from './rigs.ts';

/** Art: shoulder line, height from antler tips to shoulders, eyes above the shoulders, drawing box. */
const SHOULDERS = 140;
export const MOOSE_H = 126;
export const MOOSE_EYES = 80;
const VIEW = { x: -10, y: -6, w: 180, h: 150 };
export const STARE_S = 2;

/**
 * Plays the scene once, centred at `cx` (board px). `clipY` is where he disappears behind the fence
 * (board px, just inside the top fence); `h` is how tall he stands from antler tips to shoulders.
 */
export async function playMoose(host: HTMLElement, g: { cx: number; clipY: number; h: number }, signal: AbortSignal): Promise<void> {
  const k = g.h / MOOSE_H;
  const w = VIEW.w * k;
  const winH = (SHOULDERS - VIEW.y) * k;
  const peek = document.createElement('div');
  peek.className = 'gag moose-peek';
  Object.assign(peek.style, { width: `${w}px`, height: `${winH}px`, transform: `translate(${g.cx - w / 2}px, ${g.clipY - winH}px)` });
  peek.innerHTML = MOOSE_RIG;
  const svg = peek.querySelector('svg')!;
  Object.assign(svg.style, { width: `${w}px`, height: `${VIEW.h * k}px` });
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
  /** One slow side-to-side chew, grass sprig wagging along. */
  const chew = (side: 1 | -1, s: number) => {
    const tl = gsap.timeline();
    tl.to(J('jaw'), { x: 3 * side, rot: 7 * side, y: 3, duration: s * 0.55, ease: 'sine.inOut' }, 0);
    tl.to(J('grass'), { rot: 12 * side, duration: s * 0.6, ease: 'sine.inOut' }, 0.05);
    tl.to(J('bell'), { rot: -5 * side, duration: s * 0.7, ease: 'sine.inOut' }, 0.1);
    tl.to(J('head'), { y: 1.2, duration: s * 0.5, ease: 'sine.inOut', yoyo: true, repeat: 1 }, 0);
    tl.to(J('jaw'), { y: 0.5, duration: s * 0.45, ease: 'sine.inOut' }, s * 0.55);
    return tl;
  };

  try {
    // 1. Rises into view over the fence, antlers and ears lagging, overshooting a touch.
    beat('rise');
    J('lean').y = SHOULDERS + 20;
    rig.render();
    const rise = gsap.timeline();
    rise.to(J('lean'), { y: -5, duration: 0.85, ease: 'power2.out' }, 0);
    rise.to(J('lean'), { y: 0, duration: 0.35, ease: 'sine.inOut' }, 0.85);
    rise.fromTo([J('antlerL'), J('antlerR')], { rot: 0 }, { rot: (i: number) => (i ? -5 : 5), duration: 0.5, ease: 'power2.out' }, 0.3);
    rise.to([J('antlerL'), J('antlerR')], { rot: 0, duration: 0.7, ease: 'elastic.out(1, 0.45)' }, 0.8);
    rise.to(J('earL'), { rot: -18, duration: 0.12, yoyo: true, repeat: 1, ease: 'power2.out' }, 0.9);
    rise.to(J('earR'), { rot: 18, duration: 0.12, yoyo: true, repeat: 1, ease: 'power2.out' }, 1.0);
    await run(rise);

    // 2. Leans in over the fence.
    beat('lean');
    const lean = gsap.timeline();
    lean.to(J('lean'), { sx: 1.04, sy: 1.04, y: 8, duration: 0.6, ease: 'sine.inOut' }, 0);
    lean.to(J('head'), { rot: -4, duration: 0.6, ease: 'sine.inOut' }, 0);
    lean.to(J('bell'), { rot: 8, duration: 0.3, ease: 'power2.out' }, 0.2);
    lean.to(J('bell'), { rot: 0, duration: 0.8, ease: 'elastic.out(1, 0.35)' }, 0.5);
    await run(lean);

    // 3. Chews. Slowly. Blinks once.
    beat('chew');
    for (const [i, side] of ([1, -1, 1, -1] as const).entries()) {
      if (i === 2) gsap.delayedCall(0.15, () => show(peek, 'eye', 'shut')), gsap.delayedCall(0.3, () => show(peek, 'eye', 'open'));
      await run(chew(side, 0.55));
    }
    await run(gsap.to(J('jaw'), { x: 0, rot: 0, y: 0, duration: 0.2, ease: 'power2.out' }));

    // 4. Stops chewing. Stares right at you for 2 seconds, and groans.
    beat('stare');
    show(peek, 'eye', 'stare');
    sound.mooseGroan();
    const stare = gsap.timeline();
    stare.to(J('lean'), { sx: 1.06, sy: 1.06, y: 11, duration: 0.25, ease: 'back.out(2)' }, 0);
    stare.to(J('head'), { rot: 0, duration: 0.25, ease: 'power2.out' }, 0);
    stare.to(J('jaw'), { y: 7, duration: 0.4, ease: 'power2.out' }, 0.3); // the groan opens his mouth
    stare.to(J('grass'), { rot: 25, y: 2, duration: 0.4, ease: 'power2.out' }, 0.3);
    stare.to(J('bell'), { rot: 6, duration: 0.5, yoyo: true, repeat: 1, ease: 'sine.inOut' }, 0.3);
    stare.to(J('jaw'), { y: 0, duration: 0.35, ease: 'power2.inOut' }, 1.5);
    stare.to(J('grass'), { rot: 0, y: 0, duration: 0.35, ease: 'power2.inOut' }, 1.5);
    stare.to({}, { duration: STARE_S - stare.duration() > 0 ? STARE_S - stare.duration() : 0 });
    await run(stare);
    show(peek, 'eye', 'open');

    // 5. A little lift (anticipation), then he sinks back out of sight, antlers trailing.
    beat('back');
    const back = gsap.timeline();
    back.to(J('lean'), { sx: 1, sy: 1, y: -6, duration: 0.2, ease: 'power2.out' }, 0);
    back.to(J('lean'), { y: SHOULDERS + 20, duration: 0.6, ease: 'power2.in' }, 0.22);
    back.to([J('antlerL'), J('antlerR')], { rot: (i: number) => (i ? 6 : -6), duration: 0.4, ease: 'power2.in' }, 0.25);
    await run(back);
    beat('done');
  } finally {
    live.forEach((t) => t.kill());
    rig.destroy();
    peek.remove();
  }
}

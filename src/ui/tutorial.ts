// The how-to, on demand: the "?" button in the game's top bar opens three cards, each a small
// moving picture with a ghost finger showing the drag:
//   1. drag a truck along its length   2. exit through the gate that matches its colour
//   3. fewer moves, more hard hats
// Swipe or Next to turn the card, Close (or the X) to leave. Also the ghost finger itself, which
// Level 1 shows on the board until the player's first drag. Reduced motion: still pictures.
import { hatsHtml } from './hats.ts';
import { onTap } from './tap.ts';

const O = '#2b1e16';
/** The ghost finger: a pointing hand in the board's toy look, its fingertip at the top middle of its box. */
export const FINGER = `<svg class="finger-art" viewBox="0 0 40 52" aria-hidden="true">
<path d="M15 4 Q20 0 25 4 L25 22 Q29 20 32 23 Q36 22 37 27 L37 38 Q37 50 25 50 L19 50 Q11 50 8 42 L3 31 Q1 26 6 25 Q10 25 12 29 L15 33 Z" fill="#fff7e6" stroke="${O}" stroke-width="3" stroke-linejoin="round"/>
<path d="M25 22 L25 30 M32 24 L32 31" stroke="${O}" stroke-width="2.4" stroke-linecap="round" fill="none"/>
<path d="M18 7 Q20 5.5 22 7" stroke="#e8d3a6" stroke-width="2.4" stroke-linecap="round" fill="none"/></svg>`;

export const TUTORIAL_CARDS = [
  { id: 'drag', title: 'Drag a truck', text: 'Trucks slide along their length. One drag is one move. Flick a truck to send it all the way.' },
  { id: 'gate', title: 'Match the gate', text: 'A truck drives out through the gate that matches its colour and symbol. Clear them all.' },
  { id: 'hats', title: 'Fewer moves, more hard hats', text: 'Finish in par for three hard hats. Within three moves of par earns two.' },
] as const;

const truck = (kind: string, color: string, cls: string) => `<img class="t-truck ${cls}" src="./sprites/trucks/${kind}-${color}@2x.webp" alt="" draggable="false" />`;
const gate = (color: string, cls: string, symbol: string) => `<span class="t-gate c-${color} ${cls}"><i>${symbol}</i></span>`;
const SCENES: Record<string, string> = {
  // A pickup slides back and forth along its length under the finger; a truck across its lane stays put.
  drag: `<div class="t-pad">${truck('vac', 'blue', 'cross')}<div class="t-move slide">${truck('pickup', 'red', '')}<span class="t-finger">${FINGER}</span></div></div>`,
  // It is dragged out through the gate of its own colour; the other gate is not for it.
  gate: `<div class="t-pad gated">${gate('red', 'mine', '◆')}${gate('blue', 'other', '●')}<div class="t-move exit">${truck('pickup', 'red', '')}<span class="t-finger">${FINGER}</span></div></div>`,
  hats: `<div class="t-score"><div class="t-row"><b>At par</b><span class="hats">${hatsHtml(3)}</span></div><div class="t-row"><b>Par + 1 to + 3</b><span class="hats">${hatsHtml(2)}</span></div><div class="t-row"><b>More</b><span class="hats">${hatsHtml(1)}</span></div></div>`,
};

/** How far a swipe must travel to turn the card (px). */
export const SWIPE = 40;
/** The card a swipe of `dx` px leads to from card `i` of `n` (left = next, right = back). */
export const swipeTo = (i: number, dx: number, n: number): number => (Math.abs(dx) < SWIPE ? i : Math.max(0, Math.min(n - 1, i + (dx < 0 ? 1 : -1))));

/** Opens the how-to over `host` (a screen). Returns a function that closes it. */
export function showTutorial(host: HTMLElement): () => void {
  host.querySelector('.overlay.tutorial')?.remove();
  const n = TUTORIAL_CARDS.length;
  const el = document.createElement('div');
  el.className = 'overlay tutorial';
  el.innerHTML = `
    <div class="card" role="dialog" aria-label="How to play">
      <button class="t-x" data-t="close" aria-label="Close">×</button>
      <h2>How to play</h2>
      <div class="t-window"><div class="t-track">
        ${TUTORIAL_CARDS.map((c) => `<section class="t-card" data-card="${c.id}"><div class="t-scene" aria-hidden="true">${SCENES[c.id]}</div><h3>${c.title}</h3><p>${c.text}</p></section>`).join('')}
      </div></div>
      <div class="t-dots" aria-hidden="true">${TUTORIAL_CARDS.map(() => '<i></i>').join('')}</div>
      <div class="btn-row">
        <button class="btn quiet" data-t="close">Close</button>
        <button class="btn primary" data-t="next">Next</button>
      </div>
    </div>`;
  let at = 0;
  const track = el.querySelector<HTMLElement>('.t-track')!;
  const show = (i: number) => {
    at = Math.max(0, Math.min(n - 1, i));
    el.dataset.at = String(at);
    track.style.transform = `translateX(${-at * 100}%)`;
    el.querySelectorAll('.t-dots i').forEach((d, k) => d.classList.toggle('on', k === at));
    el.querySelectorAll('.t-card').forEach((c, k) => c.classList.toggle('on', k === at));
    el.querySelector<HTMLElement>('[data-t="next"]')!.textContent = at === n - 1 ? 'Got it' : 'Next';
  };
  const onKey = (e: KeyboardEvent) => {
    if (!el.isConnected) document.removeEventListener('keydown', onKey);
    else if (e.key === 'Escape') close();
  };
  const close = () => {
    document.removeEventListener('keydown', onKey);
    el.remove();
  };
  // Escape closes it, and so does a tap on the dimmed backdrop round the card (never one on the card).
  document.addEventListener('keydown', onKey);
  onTap(el, '.overlay.tutorial', (b, e) => {
    if (e.target === b) close();
  });
  onTap(el, '[data-t]', (b) => {
    if (b.dataset.t === 'close' || at === n - 1) close();
    else show(at + 1);
  });
  // Swipe: a sideways drag across the card turns it.
  let from: { id: number; x: number } | null = null;
  const win = el.querySelector<HTMLElement>('.t-window')!;
  win.addEventListener('pointerdown', (e) => (from = { id: e.pointerId, x: e.clientX }));
  win.addEventListener('pointerup', (e) => {
    if (from && from.id === e.pointerId) show(swipeTo(at, e.clientX - from.x, n));
    from = null;
  });
  win.addEventListener('pointercancel', () => (from = null));
  show(0);
  host.append(el);
  return close;
}

/**
 * Level 1's ghost finger: on `board`, at the middle of `truck`, sliding `dx`, `dy` px along the
 * truck's lane and back, again and again, until `remove()` (the player's first drag). It takes no touches.
 */
export function ghostFinger(board: HTMLElement, truck: HTMLElement, dx: number, dy: number): HTMLElement {
  board.querySelector('.ghost-finger')?.remove();
  const el = document.createElement('div');
  el.className = 'ghost-finger';
  el.setAttribute('aria-hidden', 'true');
  el.innerHTML = FINGER;
  const b = board.getBoundingClientRect(), t = truck.getBoundingClientRect();
  el.style.left = `${t.left + t.width / 2 - b.left}px`;
  el.style.top = `${t.top + t.height / 2 - b.top}px`;
  el.style.setProperty('--dx', `${dx}px`);
  el.style.setProperty('--dy', `${dy}px`);
  board.append(el);
  return el;
}

// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { GHOST_MS, onTap } from './tap.ts';

const pointer = (el: Element, type: string, x: number, y: number, id = 1) =>
  el.dispatchEvent(new PointerEvent(type, { pointerId: id, clientX: x, clientY: y, bubbles: true }));
const click = (el: Element, x = 100, y = 100) => el.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, clientX: x, clientY: y }));

// The fake clock restarts at 0 for every test, but the module's swallow window doesn't, so each
// test starts further along the clock than any window an earlier test could have left open.
let clockStart = 0;

describe('onTap', () => {
  let root: HTMLElement;
  let btn: HTMLButtonElement;
  let other: HTMLButtonElement;
  let calls: string[];

  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['performance'] });
    document.body.innerHTML = '<div id="root"><button data-act="levels">All levels</button><button data-act="x" disabled>X</button></div><button id="other">Level 1</button>';
    root = document.getElementById('root')!;
    btn = root.querySelector('[data-act="levels"]')!;
    other = document.getElementById('other')! as HTMLButtonElement;
    calls = [];
    onTap(root, '[data-act]', (el) => calls.push(el.dataset.act!));
    clockStart += 1_000_000;
    vi.advanceTimersByTime(clockStart);
  });

  afterEach(() => vi.useRealTimers());

  it('acts on pointerup when the finger barely moved, and only once despite the click that follows', () => {
    pointer(btn, 'pointerdown', 100, 100);
    pointer(btn, 'pointerup', 104, 103);
    click(btn);
    expect(calls).toEqual(['levels']);
  });

  it('does not act on pointerup after a drag of 10px or more', () => {
    pointer(btn, 'pointerdown', 100, 100);
    pointer(btn, 'pointerup', 100, 112);
    expect(calls).toEqual([]);
  });

  it('still works from a plain click (keyboard, assistive tech)', () => {
    click(btn);
    expect(calls).toEqual(['levels']);
  });

  it('swallows the ghost click that would land on the next screen', () => {
    const otherClicks: string[] = [];
    other.addEventListener('click', () => otherClicks.push('level 1'));
    pointer(btn, 'pointerdown', 100, 100);
    pointer(btn, 'pointerup', 100, 100);
    click(other); // the browser's click arriving after the screen changed
    expect(otherClicks).toEqual([]);
    vi.advanceTimersByTime(GHOST_MS + 10);
    click(other); // a real, later tap is fine
    expect(otherClicks).toEqual(['level 1']);
  });

  it('never swallows a genuine new tap, even a quick one', () => {
    const otherClicks: string[] = [];
    other.addEventListener('click', () => otherClicks.push('done'));
    pointer(btn, 'pointerdown', 100, 100);
    pointer(btn, 'pointerup', 100, 100);
    // A new touch begins right away on the next screen's button: its click must go through.
    pointer(other, 'pointerdown', 100, 100);
    click(other);
    // And a click somewhere else entirely (not the echo of this tap) goes through too.
    pointer(btn, 'pointerdown', 100, 100);
    pointer(btn, 'pointerup', 100, 100);
    click(other, 300, 500);
    expect(otherClicks).toEqual(['done', 'done']);
  });

  it('ignores disabled buttons and a cancelled pointer', () => {
    pointer(root.querySelector('[data-act="x"]')!, 'pointerdown', 1, 1);
    pointer(root.querySelector('[data-act="x"]')!, 'pointerup', 1, 1);
    pointer(btn, 'pointerdown', 100, 100);
    btn.dispatchEvent(new PointerEvent('pointercancel', { pointerId: 1, bubbles: true }));
    pointer(btn, 'pointerup', 100, 100);
    expect(calls).toEqual([]);
  });
});

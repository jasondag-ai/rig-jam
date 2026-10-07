// HAPTICS (Jay, Oct 6): one light tick on every button tap and on each truck's exit. They FOLLOW
// THE SOUND EFFECTS SWITCH (no switch of their own): off by default, like the sound.
// - Android: the Vibration API, a few ms.
// - iPhone: Safari gives the web no vibration. The only way in is the iOS 18 switch input: a
//   checkbox with the `switch` attribute ticks the Taptic Engine when it is toggled through its
//   label. So a hidden one sits in the page and its label is clicked. NOBODY CAN FEEL THIS IN A
//   TEST: it has to be tried on a real iPhone, in Safari and as the home-screen app. If it is
//   not dependable there, delete `iosTick` and leave the iPhone without haptics.
// `?haptics=0` turns them off; `?hapticlog` records every tick in `window.__rhrHaptics` (tests).

/** The Android tick's length, ms. Light: just felt. */
export const TICK_MS = 8;

export type HapticWay = 'vibrate' | 'switch' | 'none';

/** Which way this browser can tick, if any. Pure: told what the browser has. */
export function hapticWay(has: { vibrate: boolean; switchInput: boolean }): HapticWay {
  return has.vibrate ? 'vibrate' : has.switchInput ? 'switch' : 'none';
}

let label: HTMLLabelElement | null = null;
/** The hidden switch and its label (made once; rendered, or iOS will not tick, but unseen and untouchable). */
function iosTick(): void {
  if (!label) {
    label = document.createElement('label');
    label.className = 'haptic-switch';
    label.setAttribute('aria-hidden', 'true');
    label.style.cssText = 'position:fixed;left:0;top:0;width:1px;height:1px;opacity:0;overflow:hidden;pointer-events:none;';
    const input = document.createElement('input');
    input.type = 'checkbox';
    input.setAttribute('switch', '');
    input.tabIndex = -1;
    label.append(input);
    document.body.append(label);
  }
  label.click();
}

const params = () => new URLSearchParams(location.search);

/** One light tick, if haptics are on (`on`: the Sound effects switch) and the phone has a way. */
export function haptic(on: boolean): void {
  if (!on || typeof navigator === 'undefined' || typeof document === 'undefined') return;
  const q = params();
  if (q.get('haptics') === '0') return;
  const way = hapticWay({
    vibrate: typeof navigator.vibrate === 'function',
    switchInput: /iP(hone|ad|od)/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1),
  });
  if (q.has('hapticlog')) ((window as unknown as { __rhrHaptics?: string[] }).__rhrHaptics ??= []).push(way);
  try {
    if (way === 'vibrate') navigator.vibrate(TICK_MS);
    else if (way === 'switch') iosTick();
  } catch {
    // (A browser may refuse it; nothing to do.)
  }
}

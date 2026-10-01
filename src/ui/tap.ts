// Reliable taps for buttons that change screens. iOS Safari can swallow the `click` of a first tap
// (e.g. right after a scroll), so these controls act on `pointerup` when the finger moved less than
// TAP_SLOP px, with `click` as the fallback (keyboard, assistive tech). Each tap acts once: the
// browser's own click that follows a handled pointerup is swallowed for GHOST_MS, so it can't
// "ghost-click" whatever sits under the finger on the next screen.

export const TAP_SLOP = 10;
export const GHOST_MS = 450;

let swallowUntil = 0;
let installed = false;

function installGuard(doc: Document): void {
  if (installed) return;
  installed = true;
  doc.addEventListener(
    'click',
    (e) => {
      if (performance.now() < swallowUntil) {
        e.preventDefault();
        e.stopPropagation();
      }
    },
    true,
  );
}

/**
 * Calls `handler` once per tap on any element under `root` matching `selector`.
 * Returns a function that removes the listeners.
 */
export function onTap(root: HTMLElement, selector: string, handler: (el: HTMLElement, e: Event) => void): () => void {
  installGuard(root.ownerDocument);
  let start: { id: number; x: number; y: number; el: HTMLElement } | null = null;
  const match = (target: EventTarget | null): HTMLElement | null => {
    const el = (target as Element | null)?.closest?.(selector) as HTMLElement | null;
    return el && root.contains(el) && !(el as HTMLButtonElement).disabled ? el : null;
  };

  const down = (e: PointerEvent) => {
    const el = match(e.target);
    start = el ? { id: e.pointerId, x: e.clientX, y: e.clientY, el } : null;
  };
  const up = (e: PointerEvent) => {
    const s = start;
    start = null;
    if (!s || e.pointerId !== s.id) return;
    if (Math.hypot(e.clientX - s.x, e.clientY - s.y) >= TAP_SLOP) return;
    swallowUntil = performance.now() + GHOST_MS;
    handler(s.el, e);
  };
  const cancel = () => (start = null);
  // Stops iOS from turning this touch into mouse events and a click on the next screen.
  const touchEnd = (e: TouchEvent) => {
    if (performance.now() < swallowUntil && e.cancelable) e.preventDefault();
  };
  const click = (e: MouseEvent) => {
    const el = match(e.target);
    if (el) handler(el, e); // only reached when no pointerup handled this tap (the guard swallows those)
  };

  root.addEventListener('pointerdown', down);
  root.addEventListener('pointerup', up);
  root.addEventListener('pointercancel', cancel);
  root.addEventListener('touchend', touchEnd, { passive: false });
  root.addEventListener('click', click);
  return () => {
    root.removeEventListener('pointerdown', down);
    root.removeEventListener('pointerup', up);
    root.removeEventListener('pointercancel', cancel);
    root.removeEventListener('touchend', touchEnd);
    root.removeEventListener('click', click);
  };
}

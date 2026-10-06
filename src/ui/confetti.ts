// The hard-hat confetti burst: small hard hats and orange and yellow scraps falling for about a
// second and a half in a layer that takes no touches, then gone. Used on a perfect solve (in the
// win overlay, under the card) and when the dig comes out at the far side (over the page).
// Never made under reduced motion: the caller checks, and style.css hides it too.
export const CONFETTI_MS = 1600;
export const CONFETTI_PIECES = 40;

/** Puts a burst at the top of `host` (prepended, so it lies under what `host` already holds), falling about `height` px. */
export function confettiBurst(host: HTMLElement, height: number, cls = ''): HTMLElement {
  const layer = document.createElement('div');
  layer.className = `confetti${cls ? ` ${cls}` : ''}`;
  layer.setAttribute('aria-hidden', 'true');
  layer.style.setProperty('--ui-hat', `url("${new URL('./sprites/ui/icon_hardhat_full.webp', location.href).href}")`);
  const colors = ['#ff8a00', '#ffb347', '#ffd21f', '#ff6a2b'];
  let html = '';
  for (let i = 0; i < CONFETTI_PIECES; i++) {
    const hat = i % 4 === 0;
    const size = hat ? 16 + Math.random() * 6 : 6 + Math.random() * 5;
    const style = [
      `--x:${(Math.random() * 100).toFixed(1)}%`,
      `--w:${size.toFixed(0)}px`,
      `--h:${(hat ? size : size * (0.5 + Math.random() * 0.7)).toFixed(0)}px`,
      `--bg:${colors[i % colors.length]}`,
      `--d:${(Math.random() * 0.45).toFixed(2)}s`,
      `--t:${(0.85 + Math.random() * 0.25).toFixed(2)}s`,
      `--dx:${((Math.random() - 0.5) * 90).toFixed(0)}px`,
      `--fall:${(height * (0.55 + Math.random() * 0.5)).toFixed(0)}px`,
      `--spin:${((Math.random() - 0.5) * 900).toFixed(0)}deg`,
    ].join(';');
    html += `<i class="${hat ? 'hat' : 'scrap'}" style="${style}"></i>`;
  }
  layer.innerHTML = html;
  host.prepend(layer);
  setTimeout(() => layer.remove(), CONFETTI_MS);
  return layer;
}

// Illustrated UI art (public/sprites/ui, Batch B from the art inbox): icons as <img>, and the
// buttons, win panel, safety sign, badge and level cards as CSS backgrounds (variables set once at
// startup, so CSS can use them without bundler paths). All text and numbers stay live on top.
const BASE = './sprites/ui/';

/** An icon or picture: 1x and 2x, decorative (the button around it carries the label). */
export const uiImg = (name: string, cls = '') =>
  `<img class="ui-art ${cls}" alt="" aria-hidden="true" draggable="false" decoding="async" src="${BASE}${name}.webp" srcset="${BASE}${name}.webp 1x, ${BASE}${name}@2x.webp 2x" />`;

const BACKGROUNDS = ['btn_undo', 'btn_neutral', 'btn_hint', 'btn_restart', 'frame_win', 'sign_days_without_incident', 'badge_zero_incident'];

/** Sets --ui-<name> on the page for every art piece used as a background. */
export function applyUiArt(root: HTMLElement = document.documentElement): void {
  for (const name of BACKGROUNDS) root.style.setProperty(`--ui-${name.replace(/_/g, '-')}`, `url("${new URL(`${BASE}${name}@2x.webp`, location.href).href}")`);
}

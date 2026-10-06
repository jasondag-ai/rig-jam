// The Wildlife Log's deep dig on the page (log-dig.ts is the pure part): the cards in groups of
// four with a window on the formation between the groups, the strata drawn behind everything
// once the page is laid out, the formation pills, the buried objects and what they say.
import { BURIED, FORMATIONS, GLINTS, GRASS, GROUP, buriedArt, buriedBox, layersFrom, pillLocked, strataSvg, tunnelSvg, type FormationId } from './log-dig.ts';
import { BURIED_LINES } from './lines.ts';
import { onTap } from './tap.ts';

const BUBBLE_MS = 2600;
const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/**
 * Builds the dig round the log's cards and its closing line, and returns the column to put on the
 * page plus `layout`, to call once it is there (and it lays itself out again when its size changes).
 * `open(regionId)` says whether a region is unlocked (its formation's pill is greyed until then).
 */
export function mountDig(cards: HTMLElement[], reward: HTMLElement, open: (regionId: string) => boolean): { el: HTMLElement; layout: () => void } {
  const col = document.createElement('div');
  col.className = 'dig-col';
  col.innerHTML = `<div class="dig-bg" aria-hidden="true"></div><div class="dig-top"></div>`;
  const pill = (id: FormationId) => {
    const f = FORMATIONS.find((x) => x.id === id)!;
    const locked = pillLocked(f, open);
    return `<span class="dig-pill${locked ? ' locked' : ''}" data-layer="${id}"${locked ? ' aria-label="' + f.name + ' (locked)"' : ''}>${f.name}</span>`;
  };
  col.querySelector('.dig-top')!.innerHTML = pill('grass');
  const windowFor = (id: FormationId, height: number) => {
    const w = document.createElement('div');
    w.className = 'dig-window';
    w.dataset.layer = id;
    w.style.height = `${height}px`;
    w.innerHTML = pill(id);
    for (const b of BURIED.filter((x) => x.in === id)) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = `buried buried-${b.id}`;
      btn.dataset.id = b.id;
      btn.setAttribute('aria-label', b.label);
      btn.innerHTML = buriedArt(b.id);
      w.append(btn);
    }
    if (id === 'topsoil') w.insertAdjacentHTML('afterbegin', '<span class="dig-tunnel-slot" aria-hidden="true"></span>');
    // The oil itself can be tapped: it has the last word.
    if (id === 'reef') w.insertAdjacentHTML('beforeend', '<button type="button" class="dig-oil" data-id="reservoir" aria-label="Oil reservoir"></button>');
    if (id === 'reef') w.insertAdjacentHTML('beforeend', GLINTS.map((g) => `<i class="oil-glint" style="left:${(g.x * 100).toFixed(1)}%;top:${(g.y * 100).toFixed(1)}%;width:${g.size}px;height:${g.size}px;animation-delay:${g.delay}s"></i>`).join(''));
    return w;
  };
  const groups = Math.ceil(cards.length / GROUP);
  for (let g = 0; g < groups; g++) {
    const ul = document.createElement('ul');
    ul.className = 'log-cards';
    ul.append(...cards.slice(g * GROUP, (g + 1) * GROUP));
    col.append(ul);
    if (g === groups - 1) col.append(reward);
    // (Whatever the number of cards, every formation gets its window: the deep ones after the last group.)
    for (const f of FORMATIONS) if (f.window && (f.after === g + 1 || (g === groups - 1 && f.after > groups))) col.append(windowFor(f.id, f.window));
  }

  const bg = col.querySelector<HTMLElement>('.dig-bg')!;
  let drawn = '';
  const layout = () => {
    const screen = col.closest<HTMLElement>('.screen');
    if (!screen || !col.isConnected) return;
    const colBox = col.getBoundingClientRect();
    const width = Math.round(screen.clientWidth);
    const left = Math.round(colBox.left - screen.getBoundingClientRect().left);
    // Where each formation ends: the bottom of its window.
    const ends = {} as Record<Exclude<FormationId, 'grass'>, number>;
    col.querySelectorAll<HTMLElement>('.dig-window').forEach((w) => { ends[w.dataset.layer as Exclude<FormationId, 'grass'>] = w.offsetTop + w.offsetHeight; });
    const key = `${width}|${left}|${Math.round(colBox.width)}|${Object.values(ends).join()}`;
    if (key === drawn) return;
    drawn = key;
    bg.style.left = `${-left}px`;
    bg.style.width = `${width}px`;
    bg.innerHTML = strataSvg(width, layersFrom(ends), left + Math.round(colBox.width / 2), GRASS - 6);
    col.querySelector('.dig-tunnel-slot')!.innerHTML = tunnelSvg(colBox.width);
    // Each buried object in its place in its window.
    col.querySelectorAll<HTMLElement>('.buried').forEach((btn) => {
      const b = BURIED.find((x) => x.id === btn.dataset.id)!;
      const box = buriedBox(b, colBox.width);
      Object.assign(btn.style, { left: `${box.left}px`, top: `${box.top}px`, width: `${box.hitW}px`, height: `${box.hitH}px` });
    });
  };
  if (typeof ResizeObserver !== 'undefined') new ResizeObserver(() => layout()).observe(col);

  // A tap: the thing wiggles and says its line (one bubble at a time). Not a log entry.
  let bubble: HTMLElement | null = null;
  let timer = 0;
  const say = (btn: HTMLElement, id: keyof typeof BURIED_LINES) => {
    bubble?.remove();
    window.clearTimeout(timer);
    col.querySelectorAll('.wiggle, .peek').forEach((x) => x.classList.remove('wiggle', 'peek'));
    void btn.offsetWidth; // so a second tap wiggles again
    btn.classList.add(id === 'egg' ? 'peek' : 'wiggle');
    bubble = document.createElement('div');
    bubble.className = 'dig-bubble';
    bubble.dataset.for = id;
    bubble.setAttribute('role', 'status');
    bubble.textContent = BURIED_LINES[id];
    col.append(bubble);
    // Above the thing, inside the column; its tail points down at it.
    const c = col.getBoundingClientRect(), r = btn.getBoundingClientRect();
    const w = bubble.offsetWidth, h = bubble.offsetHeight;
    const cx = r.left + r.width / 2 - c.left;
    const x = Math.max(0, Math.min(c.width - w, cx - w / 2));
    bubble.style.left = `${Math.round(x)}px`;
    bubble.style.top = `${Math.round(r.top - c.top - h - 10)}px`;
    bubble.style.setProperty('--tail', `${Math.round(Math.max(18, Math.min(w - 18, cx - x)))}px`);
    if (reducedMotion()) bubble.classList.add('still');
    const mine = bubble;
    timer = window.setTimeout(() => {
      mine.remove();
      btn.classList.remove('wiggle', 'peek');
      if (bubble === mine) bubble = null;
    }, BUBBLE_MS);
  };
  onTap(col, '.buried, .dig-oil', (el) => say(el, el.dataset.id as keyof typeof BURIED_LINES));
  return { el: col, layout };
}

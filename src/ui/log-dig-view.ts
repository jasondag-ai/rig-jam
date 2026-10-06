// The Wildlife Log's deep dig on the page (log-dig.ts is the pure part): the cards in groups of
// four with a window on the formation between the groups, the strata drawn behind everything
// once the page is laid out, the formation pills, the buried objects and what they say.
import { BURIED, FORMATIONS, GLINTS, GRASS, GROUP, buriedArt, buriedBox, layersFrom, pillLocked, strataSvg, tunnelSvg, type FormationId } from './log-dig.ts';
import { DEEP as DEEP_LAYERS, ODDITIES, clockText, deepSvg, depthKm, gaugeLine, kmText, marksFrom, oddityArt, oddityBox, type Mark } from './log-deep.ts';
import { BURIED_LINES } from './lines.ts';
import { onTap } from './tap.ts';

const BUBBLE_MS = 2600;
/** Formations whose `after` is more than this lie below every card. */
const DEEP = 4;
const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/**
 * Builds the dig round the log's cards and its closing line, and returns the column to put on the
 * page plus `layout`, to call once it is there (and it lays itself out again when its size changes).
 * `open(regionId)` says whether a region is unlocked (its formation's pill is greyed until then).
 * `onArrive(ms)` is called each time the page is scrolled from the grass right through to Kerguelen.
 */
export function mountDig(cards: HTMLElement[], reward: HTMLElement, open: (regionId: string) => boolean, onArrive: (ms: number) => void = () => {}): { el: HTMLElement; layout: () => void } {
  const col = document.createElement('div');
  col.className = 'dig-col';
  // (The gauge rides down the side of the screen: a sticky rail of no height, the pill hung from it.)
  col.innerHTML = `<div class="dig-gauge" aria-live="off"><span class="dig-gauge-pill"><b class="dig-depth">0 km</b><i class="dig-clock" hidden>0:00.0</i></span></div><div class="dig-bg" aria-hidden="true"></div><div class="dig-top"></div>`;
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
    // The first four windows open between the groups; the deep ones all lie below the LAST group.
    for (const f of FORMATIONS) if (f.window && (f.after <= DEEP ? f.after === g + 1 && g < groups - 1 : g === groups - 1)) col.append(windowFor(f.id, f.window));
  }

  // Past the reservoir: right through the Earth and out the other side (log-deep.ts), one block a layer.
  const deep = document.createElement('div');
  deep.className = 'dig-deep';
  for (const l of DEEP_LAYERS) {
    const sec = document.createElement('section');
    sec.className = 'deep-layer';
    sec.dataset.layer = l.id;
    sec.style.height = `${l.height}px`;
    sec.innerHTML = `<span class="deep-art-slot" aria-hidden="true"></span><span class="dig-pill" data-layer="${l.id}">${l.name}</span>` + (l.id === 'innerCore' ? '<span class="dig-pill centre">Centre of the Earth</span>' : '');
    // The mantle and the outer core glow: a few soft lights that brighten and fade (opacity only).
    if (/mantle|outerCore/i.test(l.id)) sec.insertAdjacentHTML('beforeend', GLINTS.map((g, i) => `<i class="oil-glint deep-glow" style="left:${(g.x * 100).toFixed(1)}%;top:${(((i * 0.137 + g.y * 0.5) % 1) * 92 + 4).toFixed(1)}%;width:${g.size * 4}px;height:${g.size * 4}px;animation-delay:${g.delay}s"></i>`).join(''));
    for (const o of ODDITIES.filter((x) => x.in === l.id)) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = `buried oddity buried-${o.id}`;
      btn.dataset.id = o.id;
      btn.setAttribute('aria-label', o.label);
      btn.innerHTML = oddityArt(o.id);
      sec.append(btn);
    }
    deep.append(sec);
  }
  col.append(deep);

  const bg = col.querySelector<HTMLElement>('.dig-bg')!;
  let drawn = '';
  let marks: Mark[] = [];
  const layout = () => {
    const screen = col.closest<HTMLElement>('.screen');
    if (!screen || !col.isConnected) return;
    const colBox = col.getBoundingClientRect();
    const width = Math.round(screen.clientWidth);
    const left = Math.round(colBox.left - screen.getBoundingClientRect().left);
    // Where each formation ends: the bottom of its window.
    const ends = {} as Record<Exclude<FormationId, 'grass'>, number>;
    col.querySelectorAll<HTMLElement>('.dig-window').forEach((w) => { ends[w.dataset.layer as Exclude<FormationId, 'grass'>] = w.offsetTop + w.offsetHeight; });
    // The gauge's marks: where each layer ends, down the column.
    marks = marksFrom({ grass: GRASS, ...ends }, deep.offsetTop);
    update();
    const key = `${width}|${left}|${Math.round(colBox.width)}|${Object.values(ends).join()}`;
    if (key === drawn) return;
    drawn = key;
    // The deep layers run the full width of the screen, one small drawing each.
    deep.style.marginLeft = `${-left}px`;
    deep.style.width = `${width}px`;
    deep.style.setProperty('--dig-left', `${left}px`);
    deep.querySelectorAll<HTMLElement>('.deep-layer').forEach((sec) => {
      const id = sec.dataset.layer as (typeof DEEP_LAYERS)[number]['id'];
      sec.querySelector('.deep-art-slot')!.innerHTML = deepSvg(id, width);
      sec.querySelectorAll<HTMLElement>('.oddity').forEach((btn) => {
        const o = ODDITIES.find((x) => x.id === btn.dataset.id)!;
        const box = oddityBox(o, colBox.width, sec.offsetHeight);
        Object.assign(btn.style, { left: `${left + box.left}px`, top: `${box.top}px`, width: `${box.hitW}px`, height: `${box.hitH}px` });
      });
    });
    bg.style.left = `${-left}px`;
    bg.style.width = `${width}px`;
    bg.innerHTML = strataSvg(width, layersFrom(ends), left + Math.round(colBox.width / 2), GRASS - 6);
    col.querySelector('.dig-tunnel-slot')!.innerHTML = tunnelSvg(colBox.width);
    // Each buried object in its place in its window.
    col.querySelectorAll<HTMLElement>('.buried:not(.oddity)').forEach((btn) => {
      const b = BURIED.find((x) => x.id === btn.dataset.id)!;
      const box = buriedBox(b, colBox.width);
      Object.assign(btn.style, { left: `${box.left}px`, top: `${box.top}px`, width: `${box.hitW}px`, height: `${box.hitH}px` });
    });
  };
  // THE DEPTH GAUGE AND THE STOPWATCH. The gauge reads the real depth (km) at a line that moves
  // down the screen as the page scrolls (log-deep.ts `gaugeLine`): 0 at the grass, 6,371 at the
  // centre, 12,742 at Kerguelen. The stopwatch starts the first time the page is scrolled down
  // past the grass and stops on reaching the end; back at the very top it is ready to go again.
  const depthEl = col.querySelector<HTMLElement>('.dig-depth')!, clockEl = col.querySelector<HTMLElement>('.dig-clock')!;
  let frame = 0, started = 0, done = false, ticker = 0, shown = '';
  const scroller = () => col.closest<HTMLElement>('.screen');
  function update(): void {
    frame = 0;
    const sc = scroller();
    if (!sc || !marks.length) return;
    const max = sc.scrollHeight - sc.clientHeight, top = sc.scrollTop;
    const colTop = col.getBoundingClientRect().top - sc.getBoundingClientRect().top + top;
    const km = depthKm(gaugeLine(top, max, sc.clientHeight) - colTop, marks);
    const text = kmText(km);
    if (text !== shown) depthEl.textContent = shown = text;
    col.dataset.km = km.toFixed(3);
    const now = performance.now();
    if (!started && !done && top > 0 && km > 0) {
      started = now;
      clockEl.hidden = false;
      clockEl.classList.remove('final');
      clockEl.textContent = clockText(0);
      ticker = window.setInterval(() => { if (started && !done) clockEl.textContent = clockText(performance.now() - started); }, 100);
    }
    if (started && !done && max > 0 && top >= max - 1) {
      done = true;
      window.clearInterval(ticker);
      const ms = now - started;
      clockEl.textContent = clockText(ms);
      clockEl.classList.add('final');
      onArrive(ms);
    }
    if (top <= 0 && (done || started)) {
      // Back on the grass: the next dig starts from nothing.
      window.clearInterval(ticker);
      started = 0;
      done = false;
      clockEl.hidden = true;
    }
  }
  const onScroll = () => { frame ||= requestAnimationFrame(update); };
  let listening: HTMLElement | null = null;
  const listen = () => {
    const sc = scroller();
    if (sc && sc !== listening) (listening = sc).addEventListener('scroll', onScroll, { passive: true });
  };
  if (typeof ResizeObserver !== 'undefined') new ResizeObserver(() => { listen(); layout(); }).observe(col);

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
  return { el: col, layout: () => { listen(); layout(); } };
}

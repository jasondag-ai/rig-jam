// The Wildlife Log's deep dig on the page (log-dig.ts is the pure part): the cards in groups of
// four with a window on the formation between the groups, the strata drawn behind everything
// once the page is laid out, the formation pills, the buried objects and what they say.
import { BETWEEN, BURIED, FORMATIONS, GLINTS, GRASS, GROUP, buriedArt, buriedBox, layersFrom, pillLocked, strataSvg, tunnelSvg, type FormationId } from './log-dig.ts';
import { DEEP as DEEP_LAYERS, DIG, ODDITIES, clockText, depthKm, gaugeLine, kerguelenSvg, kmText, layerBackground, layerEdge, marksFrom, oddityArt, oddityBox, seabedSvg, tileSvg, tilesNear, type DeepId, type Mark } from './log-deep.ts';
import { BURIED_LINES } from './lines.ts';
import { onTap } from './tap.ts';
import { confettiBurst } from './confetti.ts';

const BUBBLE_MS = 2600;
const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/**
 * Builds the dig round the log's cards and its closing line, and returns the column to put on the
 * page plus `layout`, to call once it is there (and it lays itself out again when its size changes).
 * `open(regionId)` says whether a region is unlocked (its formation's pill is greyed until then).
 * `onArrive(ms, swipes)` is called each time the page is scrolled from the grass right through to
 * Kerguelen; what it returns (a title, lines, and whether to throw confetti) is shown on the arrival card there.
 */
export function mountDig(cards: HTMLElement[], reward: HTMLElement, open: (regionId: string) => boolean, onArrive: (ms: number, swipes: number) => { title: string; lines: string[]; confetti?: boolean } | null = () => null): { el: HTMLElement; layout: () => void } {
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
    // The first six windows open between the groups; the deep ones all lie below the LAST group.
    for (const f of FORMATIONS) if (f.window && Math.min(f.after <= BETWEEN ? f.after : groups, groups) === g + 1) col.append(windowFor(f.id, f.window));
  }

  // Past the reservoir: right through the Earth and out the other side (log-deep.ts). One block a
  // layer, in the layer's own slowly changing colour; the dirt in it is drawn a tile at a time,
  // and only the tiles near the screen are on the page (`showTiles`).
  const deep = document.createElement('div');
  deep.className = 'dig-deep';
  for (const l of DEEP_LAYERS) {
    const sec = document.createElement('section');
    sec.className = 'deep-layer';
    sec.dataset.layer = l.id;
    sec.style.height = `${l.height}px`;
    sec.style.background = layerBackground(l.id);
    sec.innerHTML =
      (l.id === 'kerguelen' ? '<span class="deep-surface-slot" aria-hidden="true"></span><div class="dig-arrival" role="status" hidden></div>' : '<div class="deep-tiles" aria-hidden="true"></div><span class="deep-edge-slot" aria-hidden="true"></span>') +
      (l.id === 'seafloor' ? '<span class="deep-seabed-slot" aria-hidden="true"></span>' : '') +
      `<span class="dig-pill" data-layer="${l.id}">${l.name}</span>` +
      (l.id === 'innerCore' ? '<i class="deep-centre" aria-hidden="true"></i><span class="dig-pill centre">Centre of the Earth</span>' : '');
    for (const o of ODDITIES.filter((x) => x.layer === l.id)) {
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
  // Where each deep layer lies down the column (px), and how wide the dirt is drawn: set by `layout`.
  let lanes: { sec: HTMLElement; tiles: HTMLElement | null; id: DeepId; top: number; height: number }[] = [];
  let dirtW = 0;
  /**
   * Draws the dirt near the screen and takes away the rest: for each layer, the tiles within a
   * screen of the stretch showing (`from`..`to`, px down the column).
   */
  const showTiles = (from: number, to: number): void => {
    for (const lane of lanes) {
      if (!lane.tiles) continue;
      const want = to < lane.top - DIG.screenPx || from > lane.top + lane.height + DIG.screenPx ? [] : tilesNear(lane.id, from - lane.top, to - lane.top);
      const have = new Map([...lane.tiles.children].map((el) => [Number((el as HTMLElement).dataset.k), el as HTMLElement]));
      for (const [k, el] of have) if (!want.includes(k)) el.remove();
      for (const k of want) {
        if (have.has(k)) continue;
        const el = document.createElement('div');
        el.className = 'deep-tile';
        el.dataset.k = String(k);
        el.style.top = `${k * DIG.tile}px`;
        // (The mantle and the outer core glow: one soft light a tile, brightening and fading.)
        const glow = /mantle|outerCore/i.test(lane.id) ? `<i class="oil-glint deep-glow" style="left:${(k * 37) % 80 + 6}%;top:${(k * 53) % 70 + 10}%;width:${48 + ((k * 17) % 30)}px;height:${48 + ((k * 17) % 30)}px;animation-delay:${-((k * 0.7) % 4).toFixed(1)}s"></i>` : '';
        el.innerHTML = tileSvg(lane.id as Exclude<DeepId, 'kerguelen'>, k, dirtW) + glow;
        lane.tiles.append(el);
      }
    }
  };
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
    // The deep layers run the full width of the screen.
    deep.style.marginLeft = `${-left}px`;
    deep.style.width = `${width}px`;
    deep.style.setProperty('--dig-left', `${left}px`);
    dirtW = width;
    lanes = [...deep.querySelectorAll<HTMLElement>('.deep-layer')].map((sec) => ({ sec, tiles: sec.querySelector<HTMLElement>('.deep-tiles'), id: sec.dataset.layer as DeepId, top: deep.offsetTop + sec.offsetTop, height: sec.offsetHeight }));
    for (const lane of lanes) {
      lane.tiles?.replaceChildren();
      const edge = lane.sec.querySelector('.deep-edge-slot');
      if (edge) edge.innerHTML = layerEdge(lane.id, width);
      const seabed = lane.sec.querySelector('.deep-seabed-slot');
      if (seabed) seabed.innerHTML = seabedSvg(width);
      const surface = lane.sec.querySelector('.deep-surface-slot');
      if (surface) surface.innerHTML = kerguelenSvg(width);
      lane.sec.querySelectorAll<HTMLElement>('.oddity').forEach((btn) => {
        const o = ODDITIES.find((x) => x.id === btn.dataset.id)!;
        const box = oddityBox(o, colBox.width);
        Object.assign(btn.style, { left: `${left + box.left}px`, top: `${box.top}px`, width: `${box.hitW}px`, height: `${box.hitH}px` });
      });
    }
    update();
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
  // Swipes: every finger put down on the page (or burst of the mouse wheel) while the dig is timed.
  let gestures = 0, lastGesture = -1e9, lastWheel = -1e9, fromGesture = 0;
  const arrival = col.querySelector<HTMLElement>('.dig-arrival');
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
    showTiles(top - colTop, top - colTop + sc.clientHeight);
    const now = performance.now();
    if (!started && !done && top > 0 && km > 0) {
      started = now;
      // (The swipe that set it off counts.)
      fromGesture = gestures - (now - lastGesture < 1500 ? 1 : 0);
      if (arrival) arrival.hidden = true;
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
      const card = onArrive(ms, Math.max(1, gestures - fromGesture));
      if (arrival && card) {
        arrival.innerHTML = `<b></b>${card.lines.map(() => '<span></span>').join('')}`;
        arrival.querySelector('b')!.textContent = card.title;
        arrival.querySelectorAll('span').forEach((el, i) => (el.textContent = card.lines[i]));
        arrival.hidden = false;
        // The hard-hat confetti, over the page (not with reduced motion).
        if (card.confetti && !reducedMotion()) confettiBurst(document.body, window.innerHeight, 'over-page');
      }
    }
    if (top <= 0 && (done || started)) {
      // Back on the grass: the next dig starts from nothing.
      window.clearInterval(ticker);
      started = 0;
      done = false;
      clockEl.hidden = true;
      if (arrival) arrival.hidden = true;
    }
  }
  const onScroll = () => { frame ||= requestAnimationFrame(update); };
  // A find gives a tiny wiggle as it slides into view, to catch the eye mid-swipe (style.css
  // `.glance`; nothing with reduced motion). Once each time it comes on screen.
  if (typeof IntersectionObserver !== 'undefined') {
    const eye = new IntersectionObserver((entries) => {
      for (const e of entries) {
        const el = e.target as HTMLElement;
        if (!e.isIntersecting) el.classList.remove('glance');
        else if (!el.classList.contains('wiggle') && !reducedMotion()) el.classList.add('glance');
      }
    }, { threshold: 0.7 });
    deep.querySelectorAll('.oddity').forEach((el) => eye.observe(el));
  }
  let listening: HTMLElement | null = null;
  const listen = () => {
    const sc = scroller();
    if (!sc || sc === listening) return;
    (listening = sc).addEventListener('scroll', onScroll, { passive: true });
    sc.addEventListener('touchstart', () => { gestures++; lastGesture = performance.now(); }, { passive: true });
    sc.addEventListener('wheel', () => { const now = performance.now(); if (now - lastWheel > 220) { gestures++; lastGesture = now; } lastWheel = now; }, { passive: true });
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

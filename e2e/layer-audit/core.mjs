// THE LAYER AUDIT'S EYES (job U17): put into the page, they answer one question about a thing the player should be
// watching: IS ANY OF IT HIDDEN? Either something else is painted over it, or a parent cuts it off.
//   covered(el): points are laid over the element's box; at each, the browser says what is stacked there
//     (`elementsFromPoint`, with pointer events switched on for everything meanwhile, so layers that take no touches
//     are seen too). A point counts where the element itself paints; it is COVERED there if something that really
//     paints (an SVG shape, a canvas or picture that is not see-through at that very pixel, a box with a background)
//     lies above it and is not part of the same thing.
//   clipped(el): every ancestor that cuts its children (overflow, an SVG's own frame, a clip-path, a mask) and the
//     screen's edges: how much of the element's box lies outside.
export function installAudit() {
  const w = window;
  if (w.__la) return;
  let styled = false;
  const hitStyle = () => { if (styled) return; styled = true; const style = document.createElement('style'); style.textContent = '.la-hit, .la-hit * { pointer-events: auto !important; }'; document.head.append(style); };
  const alphaCache = new WeakMap();
  /** How solid a picture or canvas is at a point of the screen (0 to 1). */
  const alphaAt = (el, x, y) => {
    try {
      const r = el.getBoundingClientRect();
      if (r.width < 1 || r.height < 1) return 0;
      let c = el;
      if (el.tagName === 'IMG') {
        c = alphaCache.get(el);
        if (!c) { if (!el.complete || !el.naturalWidth) return 1; c = document.createElement('canvas'); c.width = Math.min(256, el.naturalWidth); c.height = Math.max(1, Math.round(c.width * el.naturalHeight / el.naturalWidth)); c.getContext('2d').drawImage(el, 0, 0, c.width, c.height); alphaCache.set(el, c); }
      }
      const fx = (x - r.left) / r.width, fy = (y - r.top) / r.height;
      if (fx < 0 || fx > 1 || fy < 0 || fy > 1) return 0;
      const px = Math.min(c.width - 1, Math.max(0, Math.floor(fx * c.width))), py = Math.min(c.height - 1, Math.max(0, Math.floor(fy * c.height)));
      return c.getContext('2d', { willReadFrequently: true }).getImageData(px, py, 1, 1).data[3] / 255;
    } catch { return 1; }
  };
  const SHAPES = new Set(['path', 'rect', 'circle', 'ellipse', 'polygon', 'polyline', 'line', 'text', 'tspan', 'use', 'image']);
  /** The opacity an element is really shown at (its own and every ancestor's). */
  const shown = (el) => { let o = 1; for (let e = el; e && e.nodeType === 1; e = e.parentElement) { const cs = getComputedStyle(e); if (cs.display === 'none' || cs.visibility === 'hidden') return 0; o *= Number(cs.opacity); if (o < 0.05) return 0; } return o; };
  /** Does this element really paint at this point (enough to hide what is under it)? */
  const paints = (el, x, y) => {
    const tag = el.tagName.toLowerCase();
    if (shown(el) < 0.45) return false;
    if (SHAPES.has(tag)) { const cs = getComputedStyle(el); const fill = cs.fill !== 'none' && Number(cs.fillOpacity) >= 0.45; return fill || (cs.stroke !== 'none' && parseFloat(cs.strokeWidth) >= 3); }
    if (tag === 'canvas' || tag === 'img') return alphaAt(el, x, y) > 0.45;
    if (tag === 'svg' || tag === 'g') return false;
    const cs = getComputedStyle(el);
    const bg = cs.backgroundColor.match(/rgba?\(([^)]+)\)/);
    const a = bg ? (bg[1].split(',').length > 3 ? Number(bg[1].split(',')[3]) : 1) : 0;
    if (a >= 0.45) return true;
    // (A box with a picture for its background or frame: a button, the win card. Whole-screen washes are not things.)
    const r = el.getBoundingClientRect();
    const small = r.width * r.height < innerWidth * innerHeight * 0.5;
    return small && ((cs.backgroundImage !== 'none' && !/gradient/.test(cs.backgroundImage)) || (cs.borderImageSource !== 'none' && cs.borderImageSlice.includes('fill')));
  };
  /** A short name for what an element is part of. */
  const NAMES = [['.bubble', 'a speech bubble'], ['.dig-bubble', 'a dig bubble'], ['.toast', 'the toast'], ['.update-bar', 'the update bar'], ['.win .card', 'the win card'], ['.finale-card', 'the Perfect Game card'], ['.finale-polaroid', 'the Polaroid'], ['.finale-credits', 'the credits'], ['.finale-dim', "the credits' dark"], ['.finale-close', 'the close-up'], ['.confetti', 'the confetti'], ['.hud', 'the HUD'], ['.controls', 'the buttons'], ['.note', 'the tip line'], ['.truck', 'a truck'], ['.gate', 'a gate'], ['.obstacle', 'lease equipment'], ['canvas.berm', 'the berm'], ['.lease-ground', "the lease's ground"], ['.board', 'the lease'], ['.scene-front', 'the lane aspen'], ['.biffy-layer', 'the biffy'], ['.sign-layer', 'the lease sign'], ['.bush-layer', 'the gag bush'], ['.cow-layer', 'the cow'], ['.riser-layer', 'the riser'], ['.mann-layer', "Mannville's trees"], ['.clear-mats', 'the rig mats'], ['.clear-layer', "Clearwater's trees"], ['.bald-layer', "Baldonnel's trees"], ['.bald-sign', 'the bison sign'], ['.bald-snowbank', 'the snowbank'], ['.bald-scale', 'the truck scale'], ['.bakken-layer', 'the round bale'], ['.depth-tree', 'a front tree'], ['.scenery', 'the scenery'], ['.log-card', 'a log card'], ['.dig-gauge', 'the depth gauge'], ['.dig-arrival', 'the arrival card'], ['.log-head', "the log's header"], ['.brand', 'the home header'], ['.settings', 'Settings'], ['.overlay', 'an overlay']];
  const nameOf = (el) => { const gag = el.closest('[data-gag]'); if (gag) return `the ${gag.dataset.gag} sighting`; for (const [sel, n] of NAMES) if (el.closest(sel)) return n; const c = el.closest('[class]'); return c ? `.${String(c.getAttribute('class')).trim().split(/\s+/)[0]}` : el.tagName.toLowerCase(); };
  const box = (el) => { const r = el.getBoundingClientRect(); return { l: r.left, t: r.top, r: r.right, b: r.bottom, w: r.width, h: r.height }; };

  /** What covers `el` (its own family, `kin`, never counts): { share, by: { name: share } } over the points it paints. */
  const covered = (el, kin = el, n = 5) => {
    const r = box(el);
    const out = { share: 0, by: {}, points: 0, box: r };
    if (r.w < 3 || r.h < 3) return out;
    hitStyle();
    document.documentElement.classList.add('la-hit');
    let mine = 0, hid = 0;
    const by = {};
    for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
      const x = r.l + ((i + 0.5) / n) * r.w, y = r.t + ((j + 0.5) / n) * r.h;
      if (x < 0 || y < 0 || x >= innerWidth || y >= innerHeight) continue;
      const stack = document.elementsFromPoint(x, y);
      const at = stack.findIndex((e) => el.contains(e) && (e === el ? paints(e, x, y) || !['svg', 'g', 'div', 'span'].includes(e.tagName.toLowerCase()) : paints(e, x, y)));
      if (at < 0) continue;
      mine++;
      const isKin = typeof kin === 'function' ? kin : (e) => kin.contains(e);
      const over = stack.slice(0, at).find((e) => !isKin(e) && !e.contains(el) && paints(e, x, y));
      if (over) { hid++; const nm = nameOf(over); by[nm] = (by[nm] ?? 0) + 1; }
    }
    document.documentElement.classList.remove('la-hit');
    out.points = mine;
    out.share = mine ? hid / mine : 0;
    for (const k in by) out.by[k] = by[k] / mine;
    return out;
  };
  /** What cuts `el` off: { share, by } of its box outside a clipping ancestor or the screen. */
  const clipped = (el) => {
    const r = box(el), area = r.w * r.h;
    const out = { share: 0, by: '', box: r };
    if (area < 9) return out;
    const outside = (c) => { const iw = Math.max(0, Math.min(r.r, c.r) - Math.max(r.l, c.l)), ih = Math.max(0, Math.min(r.b, c.b) - Math.max(r.t, c.t)); return 1 - (iw * ih) / area; };
    const edge = outside({ l: 0, t: 0, r: innerWidth, b: innerHeight });
    if (edge > out.share) { out.share = edge; out.by = "the screen's edge"; }
    for (let p = el.parentElement; p && p !== document.documentElement; p = p.parentElement) {
      const cs = getComputedStyle(p), tag = p.tagName.toLowerCase();
      const cuts = /hidden|clip|auto|scroll/.test(cs.overflowX + cs.overflowY) ? (tag === 'svg' ? cs.overflow !== 'visible' : true) : false;
      const viaAttr = p.hasAttribute('clip-path') || p.hasAttribute('mask') || (cs.clipPath && cs.clipPath !== 'none') || (cs.maskImage && cs.maskImage !== 'none') || (cs.webkitMaskImage && cs.webkitMaskImage !== 'none');
      if (!cuts && !viaAttr) continue;
      const c = box(p);
      // (A scroller cuts what is scrolled out of it: that is what scrolling is. Only what it cuts while the thing is in view counts, and the caller decides.)
      const sh = viaAttr && !cuts ? 0 : outside(c);
      if (viaAttr) { if (out.share < 0.01) { out.share = Math.max(out.share, 0.001); out.by = out.by || `a clip of its own (${nameOf(p)})`; out.ownClip = true; } }
      if (sh > out.share + 0.001) { out.share = sh; out.by = `${nameOf(p)} (${tag === 'svg' ? "its picture's frame" : 'overflow'})`; }
    }
    return out;
  };
  w.__la = { covered, clipped, nameOf, box, shown };
}

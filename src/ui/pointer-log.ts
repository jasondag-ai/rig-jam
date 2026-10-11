// `?pointerlog=1` (job U14): a small box in the screen's corner with the last 15 pointer events and what the board
// makes of them (which truck is being dragged, how far), for Jay to screenshot when a mouse or trackpad misbehaves.
// Hidden unless asked for; it takes no touches and changes nothing.
export const POINTER_LOG_ROWS = 15;
export const pointerLogOn = (search: string = typeof location === 'undefined' ? '' : location.search): boolean => new URLSearchParams(search).get('pointerlog') === '1';

/** What is kept of one event. */
export interface PointerRow { type: string; kind: string; id: number; buttons: number; x: number; y: number; on: string; n: number }

/** One event as a line of the box: "move mouse#1 b1 (640,360) truck B x12". */
export const rowText = (r: PointerRow): string => [r.type, r.kind ? `${r.kind}#${r.id}` : '', `b${r.buttons}`, `(${Math.round(r.x)},${Math.round(r.y)})`, r.on, r.n > 1 ? `x${r.n}` : ''].filter(Boolean).join(' ');

/** The rows after one more event: a run of moves of the same pointer over the same thing is one row with a count; only the last `max` are kept. */
export function addRow(rows: readonly PointerRow[], row: PointerRow, max = POINTER_LOG_ROWS): PointerRow[] {
  const last = rows.at(-1);
  if (last && row.type === 'move' && last.type === 'move' && last.kind === row.kind && last.id === row.id && last.buttons === row.buttons && last.on === row.on) return [...rows.slice(0, -1), { ...row, n: last.n + 1 }];
  return [...rows, row].slice(-max);
}

/** What an event landed on, in a word or two. */
export function onWhat(target: EventTarget | null): string {
  const el = target instanceof Element ? target : null;
  if (!el) return 'window';
  const truck = el.closest<HTMLElement>('.truck');
  if (truck) return `truck ${truck.dataset.id ?? '?'}`;
  for (const [sel, name] of [['.gate', 'gate'], ['.obstacle', 'equipment'], ['.board', 'board'], ['.hud', 'HUD'], ['.controls', 'buttons'], ['.win', 'win card']] as const) if (el.closest(sel)) return name;
  return el.tagName.toLowerCase();
}

export interface PointerLog { state(text: string): void }
let installed: PointerLog | null = null;
/** Puts the box on the page (once) and starts listening. */
export function installPointerLog(): PointerLog {
  if (installed) return installed;
  const box = document.createElement('pre');
  box.className = 'pointer-log';
  box.setAttribute('aria-hidden', 'true');
  let rows: PointerRow[] = [], state = 'no drag';
  const draw = () => { box.textContent = `${state}\n${rows.map(rowText).join('\n')}`; };
  const note = (type: string) => (e: Event) => {
    const p = e as PointerEvent;
    rows = addRow(rows, { type, kind: p.pointerType ?? '', id: p.pointerId ?? 0, buttons: p.buttons ?? 0, x: p.clientX ?? 0, y: p.clientY ?? 0, on: onWhat(e.target), n: 1 });
    draw();
  };
  for (const [name, type] of [['pointerdown', 'down'], ['pointermove', 'move'], ['pointerup', 'up'], ['pointercancel', 'cancel'], ['gotpointercapture', 'got-capture'], ['lostpointercapture', 'lost-capture'], ['dragstart', 'dragstart'], ['selectstart', 'selectstart'], ['contextmenu', 'contextmenu'], ['blur', 'blur']] as const) window.addEventListener(name, note(type), true);
  document.addEventListener('visibilitychange', () => { rows = addRow(rows, { type: document.hidden ? 'hidden' : 'shown', kind: '', id: 0, buttons: 0, x: 0, y: 0, on: 'page', n: 1 }); draw(); });
  document.body.append(box);
  draw();
  return (installed = { state(text: string) { if (text !== state) { state = text; draw(); } } });
}

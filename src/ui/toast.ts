// Small notices at the very top of the screen (above the HUD, never over the board). One at a time:
// a second toast waits for the first to finish.
let queue = Promise.resolve();

/** Shows `text` for `ms`; `big` is the celebration style (a second line under the title). */
export function toast(text: string, opts: { sub?: string; ms?: number; big?: boolean } = {}): Promise<void> {
  queue = queue.then(
    () =>
      new Promise<void>((resolve) => {
        const el = document.createElement('div');
        el.className = `toast${opts.big ? ' big' : ''}`;
        el.setAttribute('role', 'status');
        el.innerHTML = `<span class="t-main"></span>${opts.sub ? '<span class="t-sub"></span>' : ''}`;
        el.querySelector('.t-main')!.textContent = text;
        if (opts.sub) el.querySelector('.t-sub')!.textContent = opts.sub;
        const ms = opts.ms ?? 2000;
        el.style.setProperty('--toast-ms', `${ms}ms`);
        document.body.append(el);
        setTimeout(() => {
          el.remove();
          resolve();
        }, ms);
      }),
  );
  return queue;
}

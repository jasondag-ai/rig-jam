// Hard hat rating icons (replaces stars).
const HAT = `<svg class="hat" viewBox="0 0 24 24" aria-hidden="true"><path d="M4.5 16.5a7.5 7 0 0 1 15 0z"/><rect x="2" y="16" width="20" height="3" rx="1.5"/><rect x="11" y="8.2" width="2" height="8" rx="1" class="ridge"/></svg>`;

/** `earned` lit hats followed by dim ones, out of 3. */
export function hatsHtml(earned: number): string {
  return Array.from({ length: 3 }, (_, i) => `<span class="${i < earned ? 'on' : 'off'}">${HAT}</span>`).join('');
}

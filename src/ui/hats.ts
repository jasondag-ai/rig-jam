// Hard hat rating icons (replaces stars): illustrated full and empty hats (art inbox, Batch B).
import { uiImg } from './ui-art.ts';

/** `earned` full hats followed by empty ones, out of 3. */
export function hatsHtml(earned: number): string {
  return Array.from({ length: 3 }, (_, i) => `<span class="${i < earned ? 'on' : 'off'}">${uiImg(i < earned ? 'icon_hardhat_full' : 'icon_hardhat_empty', 'hat')}</span>`).join('');
}

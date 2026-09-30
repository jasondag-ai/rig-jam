import type { Color } from '../engine/index.ts';

/** A shape per color so trucks and gates can be matched without relying on color alone. */
export const SYMBOL: Record<Color, string> = {
  red: '◆',
  blue: '●',
  yellow: '▲',
  green: '■',
  orange: '★',
  purple: '✚',
};

// Things drivers say when you bump them into something. Edit freely: one line per string.
// Each bump picks from the pool for what was hit plus the "any" pool, never the same line twice in a row.
//   any      – any bump (tanks and wellheads only use this pool)
//   truck    – bumped another truck
//   wall     – the fence or a wrong-color gate
//   pumpjack – a pumpjack obstacle

export type BumpHit = 'truck' | 'wall' | 'pumpjack' | 'tank' | 'wellhead';

export const BUMP_LINES = {
  any: [
    'Stop work authority!',
    'Spotter! SPOTTER!',
    'Did you fill out a JSA for that?',
    'Easy! I just washed it.',
    'My grandma backs up better than that.',
    'Give me your keys, greenhorn.',
    'You got your H2S ticket or what?',
    "Get out. I'll park it.",
    'Everything here is parked but you.',
    'You made the safety board.',
    'You owe me a coffee, Sonny.',
    "That's going in the incident report.",
    'There goes my safety bonus.',
  ],
  truck: [
    "I'm loaded. You yield.",
    "That's my tailgate, not a gate.",
    'Your circle check missed me.',
    "Back off. Tailgate's down.",
  ],
  wall: ["That's a wall, not a gate."],
  pumpjack: ["Pumpjack's undefeated.", "Pumpjack doesn't have a license."],
};

// The stamp that flashes on the board when a truck bumps something.
export const BUMP_STAMP = 'NEAR MISS';

/** Lines that fit a bump: the "any" pool plus the pool for what was hit (if it has one). */
export function linesFor(hit: BumpHit): string[] {
  const own = hit === 'truck' || hit === 'wall' || hit === 'pumpjack' ? BUMP_LINES[hit] : [];
  return [...BUMP_LINES.any, ...own];
}

/** A random fitting line, never the same as `last` (when there is any other choice). */
export function pickLine(hit: BumpHit, last: string | null, random: () => number = Math.random): string {
  const pool = linesFor(hit);
  const choices = pool.length > 1 ? pool.filter((l) => l !== last) : pool;
  return choices[Math.floor(random() * choices.length)];
}

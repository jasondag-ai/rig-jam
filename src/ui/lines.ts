// Things drivers say when you bump them into something. Edit freely: one line per string.
// Each bump picks from the pool for what was hit plus the "any" pool, never the same line twice in a row.
//   any      – any bump (tanks and wellheads only use this pool)
//   truck    – bumped another truck
//   wall     – the fence or a wrong-color gate
//   pumpjack – a pumpjack obstacle
//   convoy   – a convoy truck driving at its gate out of order. Uses only this pool, so the
//              line always explains the rule.

export type BumpHit = 'truck' | 'wall' | 'pumpjack' | 'tank' | 'wellhead' | 'convoy';

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
  convoy: ['Wait your turn, Sonny.', "Convoy order! I'm number one."],
};


/** Lines that fit a bump: the "any" pool plus the pool for what was hit (convoy: its own pool only). */
export function linesFor(hit: BumpHit): string[] {
  if (hit === 'convoy') return [...BUMP_LINES.convoy];
  const own = hit === 'truck' || hit === 'wall' || hit === 'pumpjack' ? BUMP_LINES[hit] : [];
  return [...BUMP_LINES.any, ...own];
}

/** A random fitting line, never the same as `last` (when there is any other choice). */
export function pickLine(hit: BumpHit, last: string | null, random: () => number = Math.random): string {
  const pool = linesFor(hit);
  const choices = pool.length > 1 ? pool.filter((l) => l !== last) : pool;
  return choices[Math.floor(random() * choices.length)];
}

// Company Man on the win screen: one line by result, never the same line twice in a row.
//   par   – cleared at par
//   close – one to three moves over par
//   over  – worse than that
export const COMPANY_LINES = {
  par: ["Textbook. I'll tell head office.", 'Not a scratch on the lease. Beautiful.', 'Frame that one for the lunch trailer.'],
  close: ['Good enough for government work.', "She'll do. Write it up.", 'Not pretty, but the trucks are out.'],
  over: [
    "We'll talk about this at the safety meeting.",
    "I'm putting this in my report.",
    'Tailgate meeting. Tomorrow. Six sharp.',
  ],
};

// Gag lines.
export const MAGPIE_LINE = 'Seriously?';
export const LANDOWNER_LINE = "Who's paying for these ruts?";

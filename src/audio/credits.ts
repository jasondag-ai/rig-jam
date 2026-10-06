// The Credits screen's rows (Settings): every sound and music file in the game and where it came
// from, out of the packs' own CREDITS.md files (tools/audio-pack.py writes credits.json).
import credits from './credits.json' with { type: 'json' };

export interface Credit {
  use: string;
  kind: string;
  file: string;
  title: string;
  author: string;
  licence: string;
  url: string;
}
export const CREDITS = credits as Credit[];
/** The music, one row a loop: title, author, licence. */
export const musicCredits = (): Credit[] => CREDITS.filter((c) => c.kind === 'music');
/** The sound effects, gathered by who made them and under what licence, the biggest group first. */
export function sfxCredits(): { author: string; licence: string; count: number }[] {
  const groups = new Map<string, { author: string; licence: string; count: number }>();
  for (const c of CREDITS.filter((x) => x.kind === 'sfx')) {
    const author = c.author.replace(/ \(pitch-shifted[^)]*\)/, '');
    const key = `${author}|${c.licence}`;
    groups.set(key, { author, licence: c.licence, count: (groups.get(key)?.count ?? 0) + 1 });
  }
  return [...groups.values()].sort((a, b) => b.count - a.count || a.author.localeCompare(b.author));
}

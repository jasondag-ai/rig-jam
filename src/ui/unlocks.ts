// Progression: levels open in order within a region; a region opens after clearing
// REGION_UNLOCK levels of the one before it. Cardium is always open. Demo mode opens everything
// without touching saved scores. The Daily Pad is never locked. Pure functions.

export const REGION_UNLOCK = 5;

export interface RegionLike {
  id: string;
  name: string;
  levels: { id: string }[];
}

type Best = Record<string, number>;

const cleared = (best: Best, region: RegionLike) => region.levels.filter((l) => best[l.id] !== undefined).length;

/** A region opens by real progress (ignores demo mode). The first region is always open. */
export function regionEarned(regions: RegionLike[], index: number, best: Best): boolean {
  return index === 0 || cleared(best, regions[index - 1]) >= REGION_UNLOCK;
}

export function regionOpen(regions: RegionLike[], index: number, best: Best, demo: boolean): boolean {
  return demo || regionEarned(regions, index, best);
}

/** Level `level` of region `region` is open when the region is open and the level before it is cleared. */
export function levelOpen(regions: RegionLike[], region: number, level: number, best: Best, demo: boolean): boolean {
  if (demo) return true;
  if (!regionEarned(regions, region, best)) return false;
  return level === 0 || best[regions[region].levels[level - 1].id] !== undefined;
}

/** "Clear 5 in Cardium to unlock" style text for a locked region. */
export function regionLockText(regions: RegionLike[], index: number, best: Best): string {
  const prev = regions[index - 1];
  const left = REGION_UNLOCK - cleared(best, prev);
  return `Clear ${left} more in ${prev.name} to unlock`;
}

/**
 * After the LAST level of region `index` is cleared, where the win card points: the next region
 * if it is open ("Next field: Montney"), else how many more levels here would open it; null after
 * the last region of all.
 */
export function nextField(regions: RegionLike[], index: number, best: Best, demo: boolean): { open: true; index: number; name: string; label: string } | { open: false; text: string } | null {
  const next = regions[index + 1];
  if (!next) return null;
  if (regionOpen(regions, index + 1, best, demo)) return { open: true, index: index + 1, name: next.name, label: `Next field: ${next.name}` };
  const left = Math.max(1, REGION_UNLOCK - cleared(best, regions[index]));
  return { open: false, text: `Clear ${left} more in ${regions[index].name} to open ${next.name}` };
}

/** Text for a locked level. */
export function levelLockText(regions: RegionLike[], region: number, level: number, best: Best): string {
  if (!regionEarned(regions, region, best)) return regionLockText(regions, region, best);
  return `Clear level ${level} to unlock`;
}

/** Regions earned by real progress that haven't had their "NEW LEASE OPEN" banner yet. */
export function newlyOpened(regions: RegionLike[], best: Best, announced: readonly string[]): RegionLike[] {
  return regions.filter((r, i) => i > 0 && regionEarned(regions, i, best) && !announced.includes(r.id));
}

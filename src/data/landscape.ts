import type { AppData, LevelPoint } from './model';
import { startT } from '../time/years';

/**
 * The documented level in force at time t: the latest dated point at or before t
 * (or the earliest, before the first point). Levels are not interpolated.
 */
export function levelAt(points: LevelPoint[], t: number): LevelPoint | null {
  if (!points.length) return null;
  const sorted = [...points].sort((a, b) => startT(a.date) - startT(b.date));
  let pick = sorted[0]!;
  for (const p of sorted) if (startT(p.date) <= t + 1e-9) pick = p;
  return pick;
}

export function levelValue(p: LevelPoint): number | null {
  const { low, high, best } = p.level_m;
  if (best !== undefined) return best;
  if (low !== null && high !== null) return (low + high) / 2;
  return low ?? high;
}

/** The modelled polygon level closest to a documented level. */
export function nearestLevel(available: number[], level: number): number | null {
  if (!available.length) return null;
  return available.reduce((a, c) => (Math.abs(c - level) < Math.abs(a - level) ? c : a));
}

export function seaLevelAt(data: AppData, t: number) {
  return levelAt(data.landscape?.sea_level ?? [], t);
}
export function deadSeaLevelAt(data: AppData, t: number) {
  return levelAt(data.landscape?.dead_sea_levels ?? [], t);
}

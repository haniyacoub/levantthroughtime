import type { AppData, PopulationPoint } from './model';
import { startT, tOf } from '../time/years';

/** Areas belonging to a chart series: "core" gathers the comparable whole-country areas. */
export function seriesAreas(data: AppData, series: string): string[] {
  const inSeries = data.areas.filter((a) => a.series === series).map((a) => a.id);
  return inSeries.length ? inSeries : [series];
}

/** Time of a population figure: the middle of its date window. */
export function pointT(p: PopulationPoint): number {
  const a = startT(p.date);
  if (p.date.latest !== undefined) return (a + startT({ year: p.date.latest })) / 2;
  return a;
}

export interface NearGroup {
  /** Series or area id. */
  key: string;
  before: PopulationPoint[];
  after: PopulationPoint[];
}

/**
 * The published figures nearest to time t, before and after, for one series.
 * Figures for the same year are returned together (they are alternative estimates).
 * Nothing is interpolated.
 */
export function nearestFigures(data: AppData, areas: string[], t: number, key: string): NearGroup {
  const pts = data.population.filter((p) => areas.includes(p.area) && p.total).sort((a, b) => pointT(a) - pointT(b));
  const before = pts.filter((p) => pointT(p) <= t + 1e-9);
  const after = pts.filter((p) => pointT(p) > t + 1e-9);
  const lastYear = before.length ? before[before.length - 1]!.date.year : undefined;
  const nextYear = after.length ? after[0]!.date.year : undefined;
  return {
    key,
    before: lastYear === undefined ? [] : before.filter((p) => p.date.year === lastYear),
    after: nextYear === undefined ? [] : after.filter((p) => p.date.year === nextYear),
  };
}

/** Which series to show in the year panel at time t. */
export function panelSeries(data: AppData, t: number): { key: string; areas: string[] }[] {
  if (t < tOf(1948, 5)) return [{ key: 'core', areas: seriesAreas(data, 'core') }];
  const has = (id: string) => data.population.some((p) => p.area === id);
  const pick = (...ids: string[]) => ids.find(has);
  return [pick('israel-cbs'), pick('west-bank-pcbs', 'west-bank'), pick('gaza-pcbs', 'gaza-strip')]
    .filter((x): x is string => !!x)
    .map((id) => ({ key: id, areas: [id] }));
}

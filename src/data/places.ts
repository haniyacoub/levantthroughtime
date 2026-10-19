import type { Place, PlaceName } from './model';
import { endT, startT } from '../time/years';
import { loc } from '../i18n/localize';
import type { Lang } from '../time/format';

/** Places that are lived in or visited today (as opposed to excavated sites and prehistoric caves). */
const LIVING = ['city', 'town', 'village', 'port', 'holy-site', 'region'];
const isLiving = (p: Place) => p.kind.some((k) => LIVING.includes(k));

const dated = (n: PlaceName) => Boolean(n.start || n.end);

/** When places and names are shown on the timeline. */
export interface PlaceTimes {
  /** End of prehistory: undated excavated sites are prehistoric sites and show only before this. */
  prehistoricEndT: number;
  /** Undated names and undated inhabited places count as current usage from this time on. */
  undatedFromT: number;
}

/**
 * Is the name in use at time t? Dated names follow their dates; a dated name without an end
 * stays in use. Undated names are current usage, in use from `undatedFromT`.
 */
export function nameActiveAt(n: PlaceName, t: number, times: PlaceTimes): boolean {
  if (!dated(n)) return t >= times.undatedFromT - 1e-9;
  return (n.start ? startT(n.start) <= t + 1e-9 : true) && (n.end ? t < endT(n.end) - 1e-9 : true);
}

export type PlaceState = 'active' | 'former' | null;

/**
 * How a place is shown at time t, or null when it is not shown:
 *  - inhabited places from their founding date or earliest dated name (or, with neither, from
 *    `undatedFromT`) until today;
 *  - excavated sites while one of their dated names was in use; with no dated name, only in prehistory;
 *  - "former" (a hollow marker) after a destruction or depopulation the sources say ended the settlement.
 */
export function placeStateAt(p: Place, t: number, times: PlaceTimes): PlaceState {
  const names = p.names ?? [];
  const d = names.filter(dated);
  if (isLiving(p)) {
    const starts = d.filter((n) => n.start).map((n) => startT(n.start!));
    const from = p.founded ? startT(p.founded) : starts.length ? Math.min(...starts) : times.undatedFromT;
    if (t < from - 1e-9) return null;
  } else if (d.length) {
    if (!d.some((n) => nameActiveAt(n, t, times))) return null;
  } else if (t >= times.prehistoricEndT) return null;

  const ended = (p.destroyed ?? []).filter((x) => x.ended_settlement).map((x) => startT(x.date));
  if (ended.length && t >= Math.min(...ended) - 1e-9) return 'former';
  return 'active';
}

/** How a name is shown to a reader of the given language. */
export function nameDisplay(n: PlaceName, lang: Lang): string {
  const d = n.display?.[lang];
  if (d) return d;
  if (lang !== 'en' && n.lang === lang) return n.text;
  return n.display?.en ?? n.translit ?? n.text;
}

const startOf = (n: PlaceName) => (n.start ? startT(n.start) : -Infinity);
const key = (n: PlaceName) => (n.display?.en ?? n.translit ?? n.text).toLowerCase();

/**
 * The label for a place at time t in "names then" mode:
 *  1. a name in use at t in the reader's language, preferring a rendering of the main name;
 *  2. otherwise the main name in use at t that was attested most recently;
 *  3. otherwise today's name.
 * In "today" mode, always today's name.
 */
export function placeLabelAt(p: Place, t: number, lang: Lang, mode: 'then' | 'today', times: PlaceTimes): string {
  if (mode === 'today') return loc(p.name, lang);
  const active = (p.names ?? []).filter((n) => nameActiveAt(n, t, times));
  if (!active.length) return loc(p.name, lang);
  const byRecent = (a: PlaceName, b: PlaceName) => Number(Boolean(b.primary)) - Number(Boolean(a.primary)) || startOf(b) - startOf(a);
  const main = [...active].sort(byRecent)[0]!;
  const own = active.filter((n) => n.lang === lang);
  if (own.length) {
    const rendering = own.find((n) => key(n) === key(main));
    return nameDisplay(rendering ?? [...own].sort(byRecent)[0]!, lang);
  }
  return nameDisplay(main, lang);
}

export function namesByTime(p: Place): PlaceName[] {
  return [...(p.names ?? [])].sort((a, b) => (a.start ? startT(a.start) : Infinity) - (b.start ? startT(b.start) : Infinity));
}

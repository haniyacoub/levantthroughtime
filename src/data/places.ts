import type { Place, PlaceName } from './model';
import { endT, startT } from '../time/years';
import { loc } from '../i18n/localize';
import type { Lang } from '../time/format';

const nameActive = (n: PlaceName, t: number) =>
  (n.start ? startT(n.start) <= t + 1e-9 : true) && (n.end ? t < endT(n.end) - 1e-9 : true);

/**
 * Is the place shown at time t? Named places show while any of their names is in use;
 * otherwise founding/destruction dates decide; archaeological sites without either show only
 * in prehistory, everything else always.
 */
export function placeVisibleAt(p: Place, t: number, prehistoricEndT: number): boolean {
  const dated = (p.names ?? []).filter((n) => n.start || n.end);
  if (dated.length) {
    const from = Math.min(...dated.map((n) => (n.start ? startT(n.start) : -Infinity)));
    const to = Math.max(...dated.map((n) => (n.end ? endT(n.end) : Infinity)));
    return t >= from - 1e-9 && t < to;
  }
  if (p.founded) {
    const last = p.destroyed?.length ? Math.max(...p.destroyed.map((d) => endT(d.date))) : Infinity;
    return t >= startT(p.founded) - 1e-9 && t < last;
  }
  if (p.kind.includes('archaeological-site') && !p.kind.includes('city')) return t < prehistoricEndT;
  return true;
}

/** How a name is shown to a reader of the given language. */
export function nameDisplay(n: PlaceName, lang: Lang): string {
  const d = n.display?.[lang];
  if (d) return d;
  if (lang !== 'en' && n.lang === lang) return n.text;
  return n.display?.en ?? n.translit ?? n.text;
}

/** The label for a place at time t: the name in use then, or today's name. */
export function placeLabelAt(p: Place, t: number, lang: Lang, mode: 'then' | 'today'): string {
  if (mode === 'today') return loc(p.name, lang);
  const active = (p.names ?? []).filter((n) => nameActive(n, t));
  const pick = active.find((n) => n.primary) ?? active[0];
  return pick ? nameDisplay(pick, lang) : loc(p.name, lang);
}

export function namesByTime(p: Place): PlaceName[] {
  return [...(p.names ?? [])].sort((a, b) => (a.start ? startT(a.start) : -Infinity) - (b.start ? startT(b.start) : -Infinity));
}

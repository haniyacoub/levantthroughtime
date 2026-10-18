import type { EraScale } from '../time/eraScale';
import { fromT, tOf } from '../time/years';
import type { Lang } from '../time/format';

/**
 * Shareable URL state. Readable on purpose:
 *   ?y=-586            586 BCE
 *   ?y=1948-05         May 1948
 *   &lang=ar
 */
export interface UrlState {
  t?: number;
  lang?: Lang;
}

export function readUrl(search: string): UrlState {
  const p = new URLSearchParams(search);
  const out: UrlState = {};
  const y = p.get('y');
  if (y) {
    const m = /^(-?\d{1,5})(?:-(\d{1,2}))?$/.exec(y);
    if (m && Number(m[1]) !== 0) {
      const month = m[2] ? Number(m[2]) : undefined;
      out.t = tOf(Number(m[1]), month && month >= 1 && month <= 12 ? month : undefined);
    }
  }
  const lang = p.get('lang');
  if (lang === 'en' || lang === 'ar' || lang === 'he') out.lang = lang;
  return out;
}

export function yParam(t: number, scale: EraScale): string {
  const { year, month } = fromT(t);
  return scale.stepAt(t).unit === 'month' ? `${year}-${String(month).padStart(2, '0')}` : String(year);
}

export function writeUrl(state: { t: number; lang: Lang }, scale: EraScale): void {
  const p = new URLSearchParams(window.location.search);
  p.set('y', yParam(state.t, scale));
  if (state.lang === 'en') p.delete('lang');
  else p.set('lang', state.lang);
  const next = `${window.location.pathname}?${p.toString().replace(/%2C/g, ',')}${window.location.hash}`;
  if (next !== `${window.location.pathname}${window.location.search}${window.location.hash}`) {
    window.history.replaceState(null, '', next);
  }
}

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
  /** Compare mode: second date and layout. */
  t2?: number;
  cmpMode?: 'split' | 'swipe';
  layers?: string[];
  story?: string;
  step?: number;
  place?: string;
}

function parseY(y: string | null): number | undefined {
  if (!y) return undefined;
  const m = /^(-?\d{1,5})(?:-(\d{1,2}))?$/.exec(y);
  if (!m || Number(m[1]) === 0) return undefined;
  const month = m[2] ? Number(m[2]) : undefined;
  return tOf(Number(m[1]), month && month >= 1 && month <= 12 ? month : undefined);
}

export function readUrl(search: string): UrlState {
  const p = new URLSearchParams(search);
  const out: UrlState = {};
  const t = parseY(p.get('y'));
  if (t !== undefined) out.t = t;
  const lang = p.get('lang');
  if (lang === 'en' || lang === 'ar' || lang === 'he') out.lang = lang;
  const t2 = parseY(p.get('cmp'));
  if (t2 !== undefined) out.t2 = t2;
  const mode = p.get('cmpmode');
  if (mode === 'split' || mode === 'swipe') out.cmpMode = mode;
  const layers = p.get('layers');
  if (layers !== null) out.layers = layers ? layers.split(',').filter((x) => /^[a-z-]+$/.test(x)) : [];
  const story = p.get('story');
  if (story && /^[a-z0-9-]+$/.test(story)) out.story = story;
  const step = Number(p.get('step'));
  if (Number.isInteger(step) && step >= 1) out.step = step;
  const place = p.get('place');
  if (place && /^[a-z0-9-]+$/.test(place)) out.place = place;
  return out;
}

export function yParam(t: number, scale: EraScale): string {
  const { year, month } = fromT(t);
  return scale.displayUnit(t) === 'month' ? `${year}-${String(month).padStart(2, '0')}` : String(year);
}

export interface WriteState {
  t: number;
  lang: Lang;
  compare?: { on: boolean; t2: number; mode: 'split' | 'swipe' };
  layers?: string[];
  defaultLayers?: string[];
  story?: { id: string; step: number } | null;
  place?: string | null;
}

export function writeUrl(state: WriteState, scale: EraScale): void {
  const p = new URLSearchParams(window.location.search);
  p.set('y', yParam(state.t, scale));
  if (state.lang === 'en') p.delete('lang');
  else p.set('lang', state.lang);
  if (state.compare?.on) {
    p.set('cmp', yParam(state.compare.t2, scale));
    p.set('cmpmode', state.compare.mode);
  } else {
    p.delete('cmp');
    p.delete('cmpmode');
  }
  if (state.layers && state.defaultLayers && [...state.layers].sort().join(',') !== [...state.defaultLayers].sort().join(',')) p.set('layers', state.layers.join(','));
  else p.delete('layers');
  if (state.story) {
    p.set('story', state.story.id);
    p.set('step', String(state.story.step));
  } else {
    p.delete('story');
    p.delete('step');
  }
  if (state.place) p.set('place', state.place);
  else p.delete('place');
  const next = `${window.location.pathname}?${p.toString().replace(/%2C/g, ',')}${window.location.hash}`;
  if (next !== `${window.location.pathname}${window.location.search}${window.location.hash}`) {
    window.history.replaceState(null, '', next);
  }
}

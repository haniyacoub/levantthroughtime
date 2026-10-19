import type { Range, SourceEntry } from '../data/model';
import { intlLocale, type Lang } from '../time/format';

export function formatNumber(n: number, lang: Lang, maxFractionDigits = 0): string {
  return new Intl.NumberFormat(intlLocale(lang), { maximumFractionDigits: maxFractionDigits }).format(n);
}

/** Short form for chart axes: 10k, 1.5M. */
export function formatCompact(n: number, lang: Lang): string {
  return new Intl.NumberFormat(intlLocale(lang), { notation: 'compact', maximumFractionDigits: 1 }).format(n);
}

/**
 * A range as readers should see it, never inventing a midpoint:
 *   exact          → "757,182"
 *   range          → "60,000–80,000"
 *   range + best   → "≈70,000 (60,000–80,000)"
 *   open-ended     → "≥ 4,000,000" / "≤ 1,000,000"
 */
export function formatRange(r: Range | null | undefined, lang: Lang, unit = ''): string {
  if (!r) return '';
  const f = (n: number) => formatNumber(n, lang, unit === '%' ? 1 : 0) + unit;
  const { low, high, best } = r;
  if (low !== null && high !== null) {
    if (low === high) return f(low);
    const span = `${f(low)}–${f(high)}`;
    return best != null ? `≈${f(best)} (${span})` : span;
  }
  if (low !== null) return `≥ ${f(low)}`;
  if (high !== null) return best != null && best === high ? `≤ ${f(high)}` : `≤ ${f(high)}`;
  return '';
}

/** A value to plot for a range: its best estimate, else the midpoint (callers must mark midpoints as such). */
export function plotValue(r: Range): { value: number; isMidpoint: boolean } | null {
  if (r.best != null) return { value: r.best, isMidpoint: false };
  if (r.low !== null && r.high !== null) return { value: r.low === r.high ? r.low : (r.low + r.high) / 2, isMidpoint: r.low !== r.high };
  const v = r.low ?? r.high;
  return v === null ? null : { value: v, isMidpoint: true };
}

/** Citation in a compact author–date style. */
export function formatCitation(s: SourceEntry): string {
  const parts: string[] = [];
  const who = s.authors?.length ? s.authors.join('; ') : s.editors?.length ? `${s.editors.join('; ')} (ed.)` : '';
  if (who) parts.push(who);
  if (s.year !== undefined) parts.push(`(${s.year})`);
  parts.push(s.container && s.type !== 'book' ? `“${s.title}”.` : `${s.title}.`);
  if (s.container) {
    let c = s.container;
    if (s.volume !== undefined) c += ` ${s.volume}`;
    if (s.issue !== undefined) c += `(${s.issue})`;
    if (s.pages) c += `: ${s.pages}`;
    parts.push(`${c}.`);
  } else if (s.pages) parts.push(`${s.pages}.`);
  if (s.edition) parts.push(`${s.edition} ed.`);
  const pub = [s.place, s.publisher].filter(Boolean).join(': ');
  if (pub) parts.push(`${pub}.`);
  return parts.join(' ');
}

export function sourceLink(s: SourceEntry): string | undefined {
  if (s.doi) return `https://doi.org/${s.doi.replace(/^https?:\/\/(dx\.)?doi\.org\//, '')}`;
  return s.url;
}

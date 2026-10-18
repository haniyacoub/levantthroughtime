import { fromT, type HistDate } from './years';

export type Lang = 'en' | 'ar' | 'he';

// Era markers per language. The Arabic "ق.م / م" literally means before/after
// the birth of Christ (BC/AD); it is the standard form but flagged for review (PLAN §9).
const ERA: Record<Lang, { bce: string; ce: string; circa: string }> = {
  en: { bce: 'BCE', ce: 'CE', circa: 'c.' },
  ar: { bce: 'ق.م', ce: 'م', circa: 'نحو' },
  he: { bce: 'לפנה״ס', ce: 'לספירה', circa: 'בערך' },
};

/** Locale tag used for Intl; Latin digits in every language (see data/README.md). */
export function intlLocale(lang: Lang): string {
  return lang === 'en' ? 'en-GB' : `${lang}-u-nu-latn`;
}

function groupDigits(n: number, lang: Lang): string {
  // Only group very large years ("10,000 BCE"); "3000 BCE" reads better ungrouped.
  return n >= 10000 ? n.toLocaleString(intlLocale(lang)) : String(n);
}

/**
 * Format a historical year. BCE is always marked; CE is marked below 1000 CE
 * (or when `forceEra` is set), where a bare number would be ambiguous.
 */
export function formatYear(year: number, lang: Lang, opts: { circa?: boolean; forceEra?: boolean } = {}): string {
  const e = ERA[lang];
  const abs = Math.abs(year);
  let s = groupDigits(abs, lang);
  if (year < 0) s = `${s} ${e.bce}`;
  else if (year < 1000 || opts.forceEra) s = `${s} ${e.ce}`;
  return opts.circa ? `${e.circa} ${s}` : s;
}

/** Month + year for CE dates, e.g. "May 1948" / "أيار 1948" / "מאי 1948". */
export function formatMonthYear(year: number, month: number, lang: Lang): string {
  if (year < 1) return formatYear(year, lang);
  const d = new Date(Date.UTC(2000, month - 1, 15));
  d.setUTCFullYear(year);
  return new Intl.DateTimeFormat(intlLocale(lang), { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(d);
}

/** Format continuous time t at the given resolution. */
export function formatT(t: number, lang: Lang, unit: 'year' | 'month'): string {
  const { year, month } = fromT(t);
  return unit === 'month' ? formatMonthYear(year, month, lang) : formatYear(year, lang);
}

/** Format a data date object, honouring circa, precision and windows. */
export function formatDate(d: HistDate, lang: Lang): string {
  const circa = !!d.circa;
  if (d.latest !== undefined && d.latest !== d.year) {
    // "722–720 BCE": show the era once when both ends share it.
    const sameEra = Math.sign(d.year) === Math.sign(d.latest);
    const a = sameEra ? String(Math.abs(d.year)) : formatYear(d.year, lang);
    return `${circa ? ERA[lang].circa + ' ' : ''}${a}–${formatYear(d.latest, lang)}`;
  }
  if (d.month && d.precision !== 'year' && d.precision !== 'decade' && d.precision !== 'century' && d.precision !== 'millennium') {
    const s = formatMonthYear(d.year, d.month, lang);
    return circa ? `${ERA[lang].circa} ${s}` : s;
  }
  return formatYear(d.year, lang, { circa });
}

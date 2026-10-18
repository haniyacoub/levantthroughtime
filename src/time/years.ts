/**
 * Year arithmetic for historical dates.
 *
 * Data files use *historical* year numbering: signed integers with no year 0
 * (-1 = 1 BCE, 1 = 1 CE). All arithmetic converts to *astronomical* numbering
 * (1 BCE = 0, 2 BCE = -1), where ordinary subtraction gives correct durations.
 *
 * The app's continuous time value `t` is an astronomical year with a fraction
 * for months: t = astro(year) + (month - 1) / 12. So t = 1948.333 is 1 May 1948.
 */

export type Precision = 'day' | 'month' | 'season' | 'year' | 'decade' | 'century' | 'millennium';

export interface HistDate {
  year: number;
  month?: number;
  day?: number;
  circa?: boolean;
  precision: Precision;
  /** End of a scholarly window, e.g. "722–720 BCE" is {year: -722, latest: -720}. */
  latest?: number;
}

export function assertHistoricalYear(year: number): void {
  if (!Number.isInteger(year)) throw new RangeError(`Year must be an integer, got ${year}`);
  if (year === 0) throw new RangeError('There is no year 0: 1 BCE (-1) is followed by 1 CE (1)');
}

/** Historical → astronomical: -1 (1 BCE) → 0, -2 → -1, 1 → 1. */
export function toAstronomical(year: number): number {
  assertHistoricalYear(year);
  return year < 0 ? year + 1 : year;
}

/** Astronomical → historical: 0 → -1 (1 BCE), -1 → -2, 1 → 1. */
export function fromAstronomical(astro: number): number {
  if (!Number.isInteger(astro)) throw new RangeError(`Astronomical year must be an integer, got ${astro}`);
  return astro <= 0 ? astro - 1 : astro;
}

/** Whole years from `a` to `b` (historical years). 4 BCE → 6 CE is 9. */
export function yearsBetween(a: number, b: number): number {
  return toAstronomical(b) - toAstronomical(a);
}

/** Add n years to a historical year, skipping the non-existent year 0. */
export function addYears(year: number, n: number): number {
  return fromAstronomical(toAstronomical(year) + n);
}

/** Continuous time at the *start* of a date's period. */
export function startT(d: Pick<HistDate, 'year' | 'month'>): number {
  const base = toAstronomical(d.year);
  return d.month ? base + (d.month - 1) / 12 : base;
}

/**
 * Continuous time at the *end* of a date's period (exclusive bound).
 * An entity that "ends in 63 BCE" existed during 63 BCE, so its end is the start of 62 BCE.
 */
export function endT(d: Pick<HistDate, 'year' | 'month' | 'latest'>): number {
  if (d.latest !== undefined && d.month === undefined) return toAstronomical(d.latest) + 1;
  const base = toAstronomical(d.year);
  return d.month ? base + d.month / 12 : base + 1;
}

/** Time t → historical year and month (1–12). */
export function fromT(t: number): { year: number; month: number } {
  const astro = Math.floor(t + 1e-9);
  const month = Math.min(12, Math.floor((t - astro) * 12 + 1e-6) + 1);
  return { year: fromAstronomical(astro), month };
}

/** t for the start of a historical year and optional month. */
export function tOf(year: number, month?: number): number {
  return startT({ year, month });
}

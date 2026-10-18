import { describe, expect, it } from 'vitest';
import { addYears, endT, fromAstronomical, fromT, startT, tOf, toAstronomical, yearsBetween } from '../../src/time/years';
import { formatDate, formatMonthYear, formatYear } from '../../src/time/format';
import { EraScale, type SegmentInput } from '../../src/time/eraScale';

describe('historical years (no year 0)', () => {
  it('converts between historical and astronomical numbering', () => {
    expect(toAstronomical(-1)).toBe(0);
    expect(toAstronomical(-2)).toBe(-1);
    expect(toAstronomical(1)).toBe(1);
    expect(fromAstronomical(0)).toBe(-1);
    expect(fromAstronomical(-1)).toBe(-2);
    expect(fromAstronomical(1)).toBe(1);
  });

  it('rejects year 0 and non-integers', () => {
    expect(() => toAstronomical(0)).toThrow(/no year 0/);
    expect(() => toAstronomical(1.5)).toThrow();
  });

  it('computes durations across the BCE/CE boundary', () => {
    expect(yearsBetween(-4, 6)).toBe(9);
    expect(yearsBetween(-1, 1)).toBe(1);
    expect(yearsBetween(-63, 70)).toBe(132);
    expect(yearsBetween(-3000, -2000)).toBe(1000);
  });

  it('adds years skipping year 0', () => {
    expect(addYears(-1, 1)).toBe(1);
    expect(addYears(1, -1)).toBe(-1);
    expect(addYears(-5, 10)).toBe(6);
  });

  it('maps dates to continuous time and back', () => {
    expect(startT({ year: 1948, month: 5 })).toBeCloseTo(1948 + 4 / 12);
    expect(fromT(startT({ year: 1948, month: 5 }))).toEqual({ year: 1948, month: 5 });
    expect(fromT(tOf(-586))).toEqual({ year: -586, month: 1 });
    expect(fromT(tOf(-1))).toEqual({ year: -1, month: 1 });
  });

  it('treats end dates as inclusive of the end period', () => {
    // A polity ending in 63 BCE existed during 63 BCE.
    expect(endT({ year: -63 })).toBe(toAstronomical(-62));
    expect(endT({ year: 1948, month: 5 })).toBeCloseTo(1948 + 5 / 12);
    expect(endT({ year: -722, latest: -720 })).toBe(toAstronomical(-719));
  });
});

describe('formatting', () => {
  it('formats years per language', () => {
    expect(formatYear(-3000, 'en')).toBe('3000 BCE');
    expect(formatYear(-10000, 'en')).toBe('10,000 BCE');
    expect(formatYear(70, 'en')).toBe('70 CE');
    expect(formatYear(1948, 'en')).toBe('1948');
    expect(formatYear(-586, 'en', { circa: true })).toBe('c. 586 BCE');
    expect(formatYear(-586, 'ar')).toBe('586 ق.م');
    expect(formatYear(-586, 'he')).toBe('586 לפנה״ס');
  });

  it('formats month dates', () => {
    expect(formatMonthYear(1948, 5, 'en')).toBe('May 1948');
    expect(formatMonthYear(1948, 5, 'he')).toMatch(/1948/);
  });

  it('formats scholarly windows', () => {
    expect(formatDate({ year: -722, latest: -720, precision: 'year' }, 'en')).toBe('722–720 BCE');
    expect(formatDate({ year: -4, latest: 6, precision: 'year' }, 'en')).toBe('4 BCE–6 CE');
  });
});

const SEGMENTS: SegmentInput[] = [
  { id: 'a', start: { year: -10000 }, weight: 4, step: { unit: 'year', size: 100 } },
  {
    id: 'b',
    start: { year: -63 },
    weight: 8,
    step: { unit: 'year', size: 5 },
    fine_steps: [{ start: { year: 66 }, end: { year: 74 }, unit: 'year', size: 1 }],
  },
  { id: 'c', start: { year: 1947, month: 11 }, weight: 4, step: { unit: 'month', size: 1 } },
  { id: 'd', start: { year: 1949, month: 7 }, weight: 4, step: { unit: 'year', size: 1 } },
];
const scale = new EraScale(SEGMENTS, tOf(1967, 6));

describe('non-linear era scale', () => {
  it('gives each segment its weight share of the slider', () => {
    const pos = scale.segmentPositions();
    expect(pos[0]!.p0).toBe(0);
    expect(pos[1]!.p0).toBeCloseTo(4 / 20);
    expect(pos[2]!.p0).toBeCloseTo(12 / 20);
    expect(pos[3]!.p1).toBeCloseTo(1);
  });

  it('is exactly invertible', () => {
    for (const t of [tOf(-10000), tOf(-5000), tOf(-63), tOf(1), tOf(70), tOf(1948, 5), tOf(1960), tOf(1967, 6)]) {
      expect(scale.posToT(scale.tToPos(t))).toBeCloseTo(t, 9);
    }
    for (let p = 0; p <= 1; p += 0.05) {
      expect(scale.tToPos(scale.posToT(p))).toBeCloseTo(p, 9);
    }
  });

  it('steps on round historical years and stops at segment boundaries', () => {
    expect(fromT(scale.step(tOf(-10000), 1)).year).toBe(-9900);
    // Last 100-year stop before the next segment is 100 BCE, then the boundary at 63 BCE.
    expect(fromT(scale.step(tOf(-100), 1)).year).toBe(-63);
    expect(fromT(scale.step(tOf(-63), 1)).year).toBe(-60);
    // On a 5-year grid the stop after 5 BCE is 5 CE (multiples of 5; there is no year 0).
    expect(fromT(scale.step(tOf(-5), 1)).year).toBe(5);
    expect(fromT(scale.step(tOf(5), -1)).year).toBe(-5);
  });

  it('uses fine steps inside their window', () => {
    expect(fromT(scale.step(tOf(66), 1)).year).toBe(67);
    expect(fromT(scale.step(tOf(73), 1)).year).toBe(74);
    expect(fromT(scale.step(tOf(74), 1)).year).toBe(75);
  });

  it('steps by month in month segments', () => {
    expect(fromT(scale.step(tOf(1947, 11), 1))).toEqual({ year: 1947, month: 12 });
    expect(fromT(scale.step(tOf(1947, 12), 1))).toEqual({ year: 1948, month: 1 });
    expect(fromT(scale.step(tOf(1948, 1), -1))).toEqual({ year: 1947, month: 12 });
  });

  it('snaps and jumps between segments', () => {
    expect(fromT(scale.snap(tOf(-9960))).year).toBe(-10000);
    expect(fromT(scale.snap(tOf(-9940))).year).toBe(-9900);
    expect(scale.jumpSegment(tOf(-500), 1)).toBe(tOf(-63));
    expect(scale.jumpSegment(tOf(-63), -1)).toBe(tOf(-10000));
    expect(scale.jumpSegment(tOf(1960), 1)).toBe(scale.tMax);
  });
});

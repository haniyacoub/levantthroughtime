import { describe, expect, it } from 'vitest';
import { readUrl, yParam } from '../../src/state/url';
import { EraScale } from '../../src/time/eraScale';
import { tOf } from '../../src/time/years';

const scale = new EraScale(
  [
    { id: 'a', start: { year: -10000 }, weight: 1, step: { unit: 'year', size: 100 } },
    { id: 'b', start: { year: 1947, month: 11 }, weight: 1, step: { unit: 'month', size: 1 } },
  ],
  tOf(1949, 8),
);

describe('shareable URL state', () => {
  it('reads years, months and language', () => {
    expect(readUrl('?y=-586')).toEqual({ t: tOf(-586) });
    expect(readUrl('?y=1948-05&lang=ar')).toEqual({ t: tOf(1948, 5), lang: 'ar' });
  });
  it('ignores invalid values', () => {
    expect(readUrl('?y=0')).toEqual({});
    expect(readUrl('?y=abc&lang=fr')).toEqual({});
    expect(readUrl('?y=1948-13').t).toBe(tOf(1948));
  });
  it('writes month precision only where the timeline steps by month', () => {
    expect(yParam(tOf(-586), scale)).toBe('-586');
    expect(yParam(tOf(1948, 5), scale)).toBe('1948-05');
  });
});

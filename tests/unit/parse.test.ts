import { describe, expect, it } from 'vitest';
import { parseUserDate } from '../../src/time/parse';
import { tOf } from '../../src/time/years';

describe('go-to-year parser', () => {
  it('reads BCE in several forms', () => {
    expect(parseUserDate('586 BCE')).toBe(tOf(-586));
    expect(parseUserDate('586 bc')).toBe(tOf(-586));
    expect(parseUserDate('-586')).toBe(tOf(-586));
    expect(parseUserDate('10,000 BCE')).toBe(tOf(-10000));
    expect(parseUserDate('586 ق.م')).toBe(tOf(-586));
    expect(parseUserDate('586 לפנה״ס')).toBe(tOf(-586));
  });
  it('reads CE years and months', () => {
    expect(parseUserDate('70')).toBe(tOf(70));
    expect(parseUserDate('70 CE')).toBe(tOf(70));
    expect(parseUserDate('1948-05')).toBe(tOf(1948, 5));
    expect(parseUserDate('1948/5')).toBe(tOf(1948, 5));
  });
  it('rejects nonsense and year 0', () => {
    expect(parseUserDate('0')).toBeNull();
    expect(parseUserDate('hello')).toBeNull();
    expect(parseUserDate('1948-13')).toBeNull();
    expect(parseUserDate('')).toBeNull();
  });
});

import { describe, expect, it } from 'vitest';
import type { AppData, Place, PopulationPoint } from '../../src/data/model';
import { nearestFigures, panelSeries, pointT, seriesAreas } from '../../src/data/population';
import { nameDisplay, placeLabelAt, placeVisibleAt } from '../../src/data/places';
import { formatRange, plotValue } from '../../src/panels/format';
import { tOf } from '../../src/time/years';

const pt = (id: string, area: string, year: number, low: number | null, high: number | null, best?: number): PopulationPoint => ({
  id,
  area,
  date: { year, precision: 'year' },
  total: { low, high, ...(best !== undefined ? { best } : {}) },
  basis: 'census',
  confidence: 'documented',
  sources: [{ ref: 's' }],
});

const data = {
  areas: [
    { id: 'western-palestine', name: { en: 'W' }, definition: { en: '' }, series: 'core' },
    { id: 'mandate-palestine', name: { en: 'M' }, definition: { en: '' }, series: 'core' },
    { id: 'israel-cbs', name: { en: 'I' }, definition: { en: '' } },
  ],
  population: [
    pt('a', 'western-palestine', 1800, 250000, 300000),
    pt('b', 'western-palestine', 1800, 275000, 275000, 275000),
    pt('c', 'mandate-palestine', 1922, 757182, 757182, 757182),
    pt('d', 'israel-cbs', 1950, 1370100, 1370100, 1370100),
  ],
} as unknown as AppData;

describe('population figures for the year panel', () => {
  it('groups comparable areas into the core series', () => {
    expect(seriesAreas(data, 'core').sort()).toEqual(['mandate-palestine', 'western-palestine']);
    expect(seriesAreas(data, 'israel-cbs')).toEqual(['israel-cbs']);
  });

  it('returns the nearest published figures before and after, never an interpolated one', () => {
    const near = nearestFigures(data, seriesAreas(data, 'core'), tOf(1900), 'core');
    expect(near.before.map((p) => p.id).sort()).toEqual(['a', 'b']); // both 1800 estimates
    expect(near.after.map((p) => p.id)).toEqual(['c']);
  });

  it('switches to separate areas after 1948', () => {
    expect(panelSeries(data, tOf(1900)).map((s) => s.key)).toEqual(['core']);
    expect(panelSeries(data, tOf(1960)).map((s) => s.key)).toEqual(['israel-cbs']);
  });

  it('dates a window by its middle', () => {
    const p = { ...pt('w', 'x', 1553, 1, 1), date: { year: 1553, latest: 1557, precision: 'year' as const } };
    expect(pointT(p)).toBeCloseTo((tOf(1553) + tOf(1557)) / 2);
  });
});

describe('range formatting', () => {
  it('never invents a single number', () => {
    expect(formatRange({ low: 60000, high: 80000 }, 'en')).toBe('60,000–80,000');
    expect(formatRange({ low: 757182, high: 757182, best: 757182 }, 'en')).toBe('757,182');
    expect(formatRange({ low: 60000, high: 80000, best: 70000 }, 'en')).toBe('≈70,000 (60,000–80,000)');
    expect(formatRange({ low: 4000000, high: null }, 'en')).toBe('≥ 4,000,000');
    expect(formatRange({ low: null, high: 30000 }, 'en')).toBe('≤ 30,000');
  });

  it('flags plotted midpoints', () => {
    expect(plotValue({ low: 60000, high: 80000 })).toEqual({ value: 70000, isMidpoint: true });
    expect(plotValue({ low: 60000, high: 80000, best: 65000 })).toEqual({ value: 65000, isMidpoint: false });
  });
});

const jerusalem: Place = {
  id: 'jerusalem',
  name: { en: 'Jerusalem', ar: 'القدس', he: 'ירושלים', translation_status: { ar: 'machine-draft', he: 'machine-draft' } },
  kind: ['city'],
  coords: [35.23, 31.78],
  confidence: 'documented',
  sources: [],
  names: [
    { text: 'Ú-ru-sa-lim', translit: 'Urusalim', lang: 'akk', start: { year: -1400, precision: 'century' }, end: { year: -1300, precision: 'century' }, primary: true, confidence: 'documented', sources: [] },
    { text: 'Aelia Capitolina', lang: 'la', start: { year: 135, precision: 'year' }, end: { year: 638, precision: 'year' }, primary: true, confidence: 'documented', sources: [] },
    { text: 'القدس', translit: 'al-Quds', lang: 'ar', start: { year: 900, precision: 'century' }, primary: true, confidence: 'documented', sources: [] },
  ],
};

describe('place names through time', () => {
  it('labels a place with the name in use at the time', () => {
    expect(placeLabelAt(jerusalem, tOf(-1350), 'en', 'then')).toBe('Urusalim');
    expect(placeLabelAt(jerusalem, tOf(300), 'en', 'then')).toBe('Aelia Capitolina');
    expect(placeLabelAt(jerusalem, tOf(1200), 'ar', 'then')).toBe('القدس');
    expect(placeLabelAt(jerusalem, tOf(1200), 'en', 'then')).toBe('al-Quds');
  });

  it("uses today's name in 'today' mode or when no name is recorded for the date", () => {
    expect(placeLabelAt(jerusalem, tOf(300), 'he', 'today')).toBe('ירושלים');
    expect(placeLabelAt(jerusalem, tOf(-2000), 'en', 'then')).toBe('Jerusalem');
  });

  it('shows a place only while it existed', () => {
    expect(placeVisibleAt(jerusalem, tOf(-2000), tOf(-3000))).toBe(false);
    expect(placeVisibleAt(jerusalem, tOf(1948), tOf(-3000))).toBe(true);
    const telAviv: Place = { ...jerusalem, id: 'tel-aviv', names: [], founded: { year: 1909, precision: 'year' } };
    expect(placeVisibleAt(telAviv, tOf(1900), tOf(-3000))).toBe(false);
    expect(placeVisibleAt(telAviv, tOf(1950), tOf(-3000))).toBe(true);
  });

  it('displays a name in the reader language when the name is in that language', () => {
    expect(nameDisplay(jerusalem.names![2]!, 'ar')).toBe('القدس');
    expect(nameDisplay(jerusalem.names![1]!, 'ar')).toBe('Aelia Capitolina');
  });
});

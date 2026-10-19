import { describe, expect, it } from 'vitest';
import type { AppData, Place, PopulationPoint } from '../../src/data/model';
import { nearestFigures, panelSeries, pointT, seriesAreas } from '../../src/data/population';
import { nameDisplay, placeLabelAt, placeStateAt, type PlaceTimes } from '../../src/data/places';
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

const times: PlaceTimes = { prehistoricEndT: tOf(-3000), undatedFromT: tOf(1800) };
const withCurrent: Place = {
  ...jerusalem,
  names: [
    ...jerusalem.names!,
    { text: 'ירושלים', translit: 'Yerushalayim', lang: 'he', confidence: 'documented', sources: [] },
    { text: 'Jerusalem', lang: 'en', confidence: 'documented', sources: [] },
  ],
};

describe('place names through time', () => {
  it('labels a place with the name in use at the time', () => {
    expect(placeLabelAt(jerusalem, tOf(-1350), 'en', 'then', times)).toBe('Urusalim');
    expect(placeLabelAt(jerusalem, tOf(300), 'en', 'then', times)).toBe('Aelia Capitolina');
    expect(placeLabelAt(jerusalem, tOf(1200), 'ar', 'then', times)).toBe('القدس');
    expect(placeLabelAt(jerusalem, tOf(1200), 'en', 'then', times)).toBe('al-Quds');
  });

  it("uses today's name in 'today' mode or when no name is recorded for the date", () => {
    expect(placeLabelAt(jerusalem, tOf(300), 'he', 'today', times)).toBe('ירושלים');
    expect(placeLabelAt(jerusalem, tOf(-2000), 'en', 'then', times)).toBe('Jerusalem');
  });

  it("treats undated names as current usage, shown in the reader's language from 1800", () => {
    expect(placeLabelAt(withCurrent, tOf(1200), 'he', 'then', times)).toBe('al-Quds');
    expect(placeLabelAt(withCurrent, tOf(1950), 'he', 'then', times)).toBe('ירושלים');
    expect(placeLabelAt(withCurrent, tOf(1950), 'en', 'then', times)).toBe('Jerusalem');
    expect(placeLabelAt(withCurrent, tOf(1950), 'ar', 'then', times)).toBe('القدس');
  });

  it('shows a place only while it existed', () => {
    expect(placeStateAt(jerusalem, tOf(-2000), times)).toBe(null);
    expect(placeStateAt(jerusalem, tOf(1948), times)).toBe('active');
    const telAviv: Place = { ...jerusalem, id: 'tel-aviv', names: [], founded: { year: 1909, precision: 'year' } };
    expect(placeStateAt(telAviv, tOf(1900), times)).toBe(null);
    expect(placeStateAt(telAviv, tOf(1950), times)).toBe('active');
    const town: Place = { ...jerusalem, id: 'town', names: [] };
    expect(placeStateAt(town, tOf(-8000), times)).toBe(null);
    expect(placeStateAt(town, tOf(1900), times)).toBe('active');
    const cave: Place = { ...jerusalem, id: 'cave', kind: ['archaeological-site'], names: [] };
    expect(placeStateAt(cave, tOf(-8000), times)).toBe('active');
    expect(placeStateAt(cave, tOf(1900), times)).toBe(null);
  });

  it('marks a place as former only when the sources say it was not lived in again', () => {
    const village: Place = {
      ...jerusalem,
      id: 'village',
      kind: ['village'],
      names: [],
      destroyed: [
        { date: { year: 1187, precision: 'year' }, sources: [] },
        { date: { year: 1948, month: 4, precision: 'month' }, ended_settlement: true, sources: [] },
      ],
    };
    expect(placeStateAt(village, tOf(1900), times)).toBe('active');
    expect(placeStateAt(village, tOf(1950), times)).toBe('former');
  });

  it('displays a name in the reader language when the name is in that language', () => {
    expect(nameDisplay(jerusalem.names![2]!, 'ar')).toBe('القدس');
    expect(nameDisplay(jerusalem.names![1]!, 'ar')).toBe('Aelia Capitolina');
  });
});

describe('dated happenings (battles, wars)', () => {
  it('shows a battle without an end date only during the step that contains it', async () => {
    const { happeningAt } = await import('../../src/data/model');
    const battle = { start: { year: 1948, month: 4, day: 21, precision: 'day' as const } };
    expect(happeningAt(battle, tOf(1948, 4), 1 / 12)).toBe(true);
    expect(happeningAt(battle, tOf(1948, 5), 1 / 12)).toBe(false);
    expect(happeningAt(battle, tOf(1917, 11), 1 / 12)).toBe(false);
    const ancient = { start: { year: -853, precision: 'year' as const } };
    expect(happeningAt(ancient, tOf(-860), 10)).toBe(true);
    expect(happeningAt(ancient, tOf(-800), 10)).toBe(false);
    const war = { start: { year: 1947, month: 11, precision: 'month' as const }, end: { year: 1949, month: 7, precision: 'month' as const } };
    expect(happeningAt(war, tOf(1948, 6), 1 / 12)).toBe(true);
    expect(happeningAt(war, tOf(1950), 1)).toBe(false);
  });
});

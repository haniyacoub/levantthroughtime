import { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { validateData } from '../../scripts/lib/validate';

const FIXTURE = join(__dirname, '..', 'fixtures', 'valid');
const dirs: string[] = [];

/** Copy the valid fixture, apply one change to one file, return the directory. */
function withChange(file: string, change: (json: any) => void): string {
  const dir = mkdtempSync(join(tmpdir(), 'levant-data-'));
  dirs.push(dir);
  cpSync(FIXTURE, dir, { recursive: true });
  const path = join(dir, file);
  const json = JSON.parse(readFileSync(path, 'utf8'));
  change(json);
  writeFileSync(path, JSON.stringify(json));
  return dir;
}

function errorsFor(dir: string): string[] {
  return validateData(dir).errors.map((e) => `${e.file} › ${e.where}: ${e.message}`);
}

afterEach(() => {
  for (const d of dirs.splice(0)) rmSync(d, { recursive: true, force: true });
});

describe('validator', () => {
  it('accepts the valid fixture', () => {
    const { errors } = validateData(FIXTURE);
    expect(errors).toEqual([]);
  });

  it('rejects year 0', () => {
    const dir = withChange('polities.json', (j) => (j.polities[0].start.year = 0));
    expect(errorsFor(dir).join('\n')).toMatch(/no year 0/);
  });

  it('rejects a record (other than unknown) with no source', () => {
    const dir = withChange('polities.json', (j) => (j.polities[0].sources = []));
    expect(errorsFor(dir).join('\n')).toMatch(/no source is given/);
  });

  it('allows "unknown" with no source', () => {
    const dir = withChange('polities.json', (j) => {
      j.polities[0].sources = [];
      j.polities[0].confidence = 'unknown';
    });
    expect(errorsFor(dir)).toEqual([]);
  });

  it('requires two sources for contested records', () => {
    const dir = withChange('polities.json', (j) => (j.polities[1].confidence = 'contested'));
    expect(errorsFor(dir).join('\n')).toMatch(/at least two sourced positions/);
  });

  it('rejects low > high', () => {
    const dir = withChange('population.json', (j) => (j.population[1].total = { low: 900, high: 500 }));
    expect(errorsFor(dir).join('\n')).toMatch(/low \(900\) is greater than high \(500\)/);
  });

  it('rejects best outside the range', () => {
    const dir = withChange('population.json', (j) => (j.population[1].total = { low: 500, high: 900, best: 1000 }));
    expect(errorsFor(dir).join('\n')).toMatch(/outside the range/);
  });

  it('rejects shares that cannot reach 100%', () => {
    const dir = withChange('population.json', (j) => (j.population[1].composition[0].groups[0].share_pct = { low: 10, high: 20 }));
    expect(errorsFor(dir).join('\n')).toMatch(/add up to only 80\.0%/);
  });

  it('skips the sum check for partial compositions', () => {
    const dir = withChange('population.json', (j) => {
      j.population[1].composition[0].groups[0].share_pct = { low: 10, high: 20 };
      j.population[1].composition[0].partial = true;
    });
    expect(errorsFor(dir)).toEqual([]);
  });

  it('rejects counts that do not add up to the total', () => {
    const dir = withChange('population.json', (j) => (j.population[0].composition[0].groups[0].count = { low: 500, high: 500, best: 500 }));
    expect(errorsFor(dir).join('\n')).toMatch(/fall short of the total|add up to 720/);
  });

  it('rejects dates after the as-of date', () => {
    const dir = withChange('population.json', (j) => (j.population[0].date = { year: 2030, precision: 'year' }));
    expect(errorsFor(dir).join('\n')).toMatch(/after the timeline's as-of date/);
  });

  it('rejects records entirely before the timeline', () => {
    const dir = withChange('polities.json', (j) => {
      j.polities[0].start = { year: -12000, precision: 'millennium' };
      j.polities[0].end = { year: -11000, precision: 'millennium' };
    });
    expect(errorsFor(dir).join('\n')).toMatch(/entirely before the start of the timeline/);
  });

  it('allows a start before the timeline when the record reaches into it', () => {
    const dir = withChange('polities.json', (j) => (j.polities[0].start = { year: -12500, circa: true, precision: 'century' }));
    expect(errorsFor(dir)).toEqual([]);
  });

  it('rejects an end before the start', () => {
    const dir = withChange('polities.json', (j) => (j.polities[0].end = { year: -200, precision: 'year' }));
    expect(errorsFor(dir).join('\n')).toMatch(/before it starts/);
  });

  it('requires English text', () => {
    const dir = withChange('polities.json', (j) => (j.polities[0].name = { ar: 'إمبراطورية', translation_status: { ar: 'machine-draft' } }));
    expect(errorsFor(dir).join('\n')).toMatch(/name\.en/);
  });

  it('requires a translation status for Arabic or Hebrew text', () => {
    const dir = withChange('polities.json', (j) => (j.polities[0].name = { en: 'Empire', he: 'אימפריה' }));
    expect(errorsFor(dir).join('\n')).toMatch(/needs a translation_status/);
  });

  it('rejects citations of unknown sources', () => {
    const dir = withChange('polities.json', (j) => j.polities[0].sources.push({ ref: 'no-such-source' }));
    expect(errorsFor(dir).join('\n')).toMatch(/not in sources\.json/);
  });

  it('rejects unknown overlords and units', () => {
    const d1 = withChange('polities.json', (j) => (j.polities[1].relations[0].overlord = 'nobody'));
    expect(errorsFor(d1).join('\n')).toMatch(/Overlord "nobody"/);
    const d2 = withChange('territories/client.geojson', (j) => (j.features[0].properties.units = ['atlantis']));
    expect(errorsFor(d2).join('\n')).toMatch(/Unknown geographic unit "atlantis"/);
  });

  it('catches swapped latitude and longitude', () => {
    const dir = withChange('territories/empire.geojson', (j) => {
      j.features[0].geometry.coordinates[0] = j.features[0].geometry.coordinates[0].map(([x, y]: number[]) => [y, x]);
    });
    expect(errorsFor(dir).join('\n')).toMatch(/longitude and latitude swapped/);
  });

  it('rejects duplicate ids', () => {
    const dir = withChange('sources.json', (j) => j.sources.push({ ...j.sources[0] }));
    expect(errorsFor(dir).join('\n')).toMatch(/Duplicate source id "source-a"/);
  });

  it('rejects unknown fields (typos)', () => {
    const dir = withChange('polities.json', (j) => (j.polities[0].confidance = 'documented'));
    expect(errorsFor(dir).join('\n')).toMatch(/confidance/);
  });
});

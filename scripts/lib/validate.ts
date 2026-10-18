/**
 * Loads every file in /data and checks it. Used by `npm run validate-data`,
 * by `npm run build-data` (which refuses to build invalid data) and by tests.
 *
 * Errors block the build. Warnings are listed for human review (REVIEW.md).
 */
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import type { z } from 'zod';
import {
  AreasFile, Config, CultureZoneFile, CulturesFile, ErasFile, GroupsFile, Palette, PolitiesFile,
  PopulationFile, SourcesFile, UnitsFile, TerritoryFile,
  type HistDate, type Range, type SourceRef,
} from '../../src/schema/index';
import { endT, startT, toAstronomical } from '../../src/time/years';

export interface Issue {
  level: 'error' | 'warning';
  file: string;
  where: string;
  message: string;
}

type Inferred<S extends z.ZodType> = z.infer<S>;

export interface DataBundle {
  dir: string;
  config?: Inferred<typeof Config>;
  eras?: Inferred<typeof ErasFile>;
  sources?: Inferred<typeof SourcesFile>;
  polities?: Inferred<typeof PolitiesFile>;
  cultures?: Inferred<typeof CulturesFile>;
  territories: { file: string; data: Inferred<typeof TerritoryFile> }[];
  cultureZones: { file: string; data: Inferred<typeof CultureZoneFile> }[];
  units?: Inferred<typeof UnitsFile>;
  modernUnitIds: Set<string>;
  areas?: Inferred<typeof AreasFile>;
  groups?: Inferred<typeof GroupsFile>;
  population?: Inferred<typeof PopulationFile>;
  palette?: Inferred<typeof Palette>;
}

export interface Result {
  bundle: DataBundle;
  errors: Issue[];
  warnings: Issue[];
}

const COLLECTION_KEYS = ['segments', 'sources', 'polities', 'cultures', 'features', 'landmarks', 'units', 'areas', 'groups', 'population'];

/** Turn a Zod path like ["polities", 3, "end", "year"] into "polities[3] (id: x) › end.year". */
function describePath(path: PropertyKey[], raw: unknown): { where: string; field: string } {
  if (path.length >= 2 && typeof path[0] === 'string' && COLLECTION_KEYS.includes(path[0]) && typeof path[1] === 'number') {
    const coll = path[0];
    const idx = path[1];
    const item = (raw as Record<string, unknown[]>)?.[coll]?.[idx] as Record<string, unknown> | undefined;
    const id = (item?.id as string | undefined) ?? ((item?.properties as Record<string, unknown> | undefined)?.id as string | undefined);
    return { where: `${coll}[${idx}]${id ? ` (id "${id}")` : ''}`, field: path.slice(2).map(String).join('.') };
  }
  return { where: '(file)', field: path.map(String).join('.') };
}

function parseFile<S extends z.ZodType>(dir: string, relPath: string, schema: S, issues: Issue[], required = true): z.infer<S> | undefined {
  const full = join(dir, relPath);
  if (!existsSync(full)) {
    if (required) issues.push({ level: 'error', file: relPath, where: '(file)', message: 'File is missing' });
    return undefined;
  }
  let raw: unknown;
  try {
    raw = JSON.parse(readFileSync(full, 'utf8'));
  } catch (e) {
    issues.push({ level: 'error', file: relPath, where: '(file)', message: `Not valid JSON: ${(e as Error).message}` });
    return undefined;
  }
  const res = schema.safeParse(raw);
  if (!res.success) {
    for (const iss of res.error.issues) {
      const { where, field } = describePath(iss.path, raw);
      issues.push({ level: 'error', file: relPath, where, message: field ? `${field}: ${iss.message}` : iss.message });
    }
    return undefined;
  }
  return res.data;
}

/** "name 2.geojson": the copy iCloud Drive or Dropbox makes when a file changes during sync. */
const SYNC_COPY = / \d+\.[a-z]+$/;

function listFiles(dir: string, sub: string, ext: string, issues?: Issue[]): string[] {
  const d = join(dir, sub);
  if (!existsSync(d)) return [];
  return readdirSync(d)
    .filter((f) => f.endsWith(ext))
    .filter((f) => {
      if (!SYNC_COPY.test(f)) return true;
      issues?.push({
        level: 'error',
        file: join(sub, f),
        where: '(file)',
        message: 'This looks like a duplicate made by a sync service (iCloud Drive, Dropbox) — the name ends in a number after a space. Compare it with the file without the number, keep the right one and delete the other.',
      });
      return false;
    })
    .sort()
    .map((f) => join(sub, f));
}

export function loadData(dir: string, issues: Issue[]): DataBundle {
  const b: DataBundle = { dir, territories: [], cultureZones: [], modernUnitIds: new Set() };
  b.config = parseFile(dir, 'config.json', Config, issues);
  b.eras = parseFile(dir, 'eras.json', ErasFile, issues);
  b.sources = parseFile(dir, 'sources.json', SourcesFile, issues);
  b.polities = parseFile(dir, 'polities.json', PolitiesFile, issues);
  b.cultures = parseFile(dir, 'cultures.json', CulturesFile, issues, false);
  b.units = parseFile(dir, 'geo/units.json', UnitsFile, issues);
  b.areas = parseFile(dir, 'areas.json', AreasFile, issues, false);
  b.groups = parseFile(dir, 'groups.json', GroupsFile, issues, false);
  b.population = parseFile(dir, 'population.json', PopulationFile, issues, false);
  b.palette = parseFile(dir, 'palette.json', Palette, issues);
  for (const f of listFiles(dir, 'territories', '.geojson', issues)) {
    const data = parseFile(dir, f, TerritoryFile, issues);
    if (data) b.territories.push({ file: f, data });
  }
  for (const f of listFiles(dir, 'culture-zones', '.geojson', issues)) {
    const data = parseFile(dir, f, CultureZoneFile, issues);
    if (data) b.cultureZones.push({ file: f, data });
  }
  const modern = join(dir, 'geo', 'modern-units.geojson');
  if (existsSync(modern)) {
    const fc = JSON.parse(readFileSync(modern, 'utf8')) as { features: { properties: { id: string } }[] };
    for (const f of fc.features) b.modernUnitIds.add(f.properties.id);
  }
  return b;
}

// ------------------------------------------------------------------ helpers

const fmtYear = (y: number) => (y < 0 ? `${-y} BCE` : `${y} CE`);

function checkIdsUnique(items: { id: string }[] | undefined, file: string, what: string, out: Issue[]) {
  if (!items) return;
  const seen = new Set<string>();
  for (const it of items) {
    if (seen.has(it.id)) out.push({ level: 'error', file, where: `id "${it.id}"`, message: `Duplicate ${what} id "${it.id}"` });
    seen.add(it.id);
  }
}

/** Sum of ranges; an open bound counts as 0 for lows and as unbounded for highs. */
function sumRange(rs: Range[]): { low: number; high: number } {
  let low = 0;
  let high = 0;
  for (const r of rs) {
    low += r.low ?? 0;
    high += r.high ?? Infinity;
  }
  return { low, high };
}

// ------------------------------------------------------------------ main

export function validateData(dir: string): Result {
  const issues: Issue[] = [];
  const b = loadData(dir, issues);
  const err = (file: string, where: string, message: string) => issues.push({ level: 'error', file, where, message });
  const warn = (file: string, where: string, message: string) => issues.push({ level: 'warning', file, where, message });

  const sourceIds = new Map((b.sources?.sources ?? []).map((s) => [s.id, s]));
  const polityIds = new Map((b.polities?.polities ?? []).map((p) => [p.id, p]));
  const cultureIds = new Map((b.cultures?.cultures ?? []).map((c) => [c.id, c]));
  const unitIds = new Set([...(b.units?.units ?? []).map((u) => u.id), ...b.modernUnitIds]);
  const areaIds = new Set((b.areas?.areas ?? []).map((a) => a.id));
  // Groups are identified by axis + id: "jews" as a religion and "jews" as a population group are different groups.
  const groupIds = new Set((b.groups?.groups ?? []).map((g) => `${g.axis}:${g.id}`));

  const tStart = b.config ? startT(b.config.timeline.start) : -Infinity;
  const tAsOf = b.config ? endT(b.config.timeline.as_of) : Infinity;

  // --- uniqueness
  checkIdsUnique(b.sources?.sources, 'sources.json', 'source', issues);
  checkIdsUnique(b.polities?.polities, 'polities.json', 'polity', issues);
  checkIdsUnique(b.cultures?.cultures, 'cultures.json', 'culture', issues);
  checkIdsUnique(b.eras?.segments, 'eras.json', 'segment', issues);
  checkIdsUnique(b.units?.landmarks, 'geo/units.json', 'landmark', issues);
  checkIdsUnique(b.units?.units, 'geo/units.json', 'unit', issues);
  checkIdsUnique(b.areas?.areas, 'areas.json', 'area', issues);
  checkIdsUnique((b.groups?.groups ?? []).map((g) => ({ id: `${g.axis}:${g.id}` })), 'groups.json', 'group (axis:id)', issues);
  checkIdsUnique(b.population?.population, 'population.json', 'population record', issues);
  checkIdsUnique(
    [...b.territories.flatMap((t) => t.data.features.map((f) => ({ id: f.properties.id }))), ...b.cultureZones.flatMap((t) => t.data.features.map((f) => ({ id: f.properties.id })))],
    'territories/ and culture-zones/',
    'territory or culture-zone',
    issues,
  );

  // --- sources referenced by a record
  const checkRefs = (file: string, where: string, refs: SourceRef[] | undefined) => {
    for (const r of refs ?? []) {
      if (!sourceIds.has(r.ref)) err(file, where, `Cites source "${r.ref}", which is not in sources.json`);
      if (r.via && !sourceIds.has(r.via)) err(file, where, `"via" names source "${r.via}", which is not in sources.json`);
      const s = sourceIds.get(r.ref);
      if (s?.verification.level === 'cited-via' && !r.via) {
        warn(file, where, `Source "${r.ref}" is marked "cited-via" but this citation does not say which work it was seen in ("via")`);
      }
    }
  };

  /** Confidence rules: anything other than "unknown" needs a source; "contested" needs two positions. */
  const checkConfidence = (file: string, where: string, confidence: string, refs: SourceRef[]) => {
    if (confidence !== 'unknown' && refs.length === 0) err(file, where, `Confidence is "${confidence}" but no source is given (only "unknown" may have no source)`);
    if (confidence === 'contested' && new Set(refs.map((r) => r.ref)).size < 2) {
      err(file, where, 'Marked "contested" but cites fewer than two different sources; a contested item needs at least two sourced positions');
    }
    if (refs.length > 0 && refs.every((r) => sourceIds.get(r.ref)?.verification.level === 'catalogue-only')) {
      warn(file, where, 'Every source for this record was only checked at catalogue level (content not seen)');
    }
    if (confidence === 'documented' && new Set(refs.map((r) => r.ref)).size === 1) {
      warn(file, where, '"documented" claim rests on a single source');
    }
  };

  /** Date rules: end after start, nothing after the as-of date, nothing wholly before the timeline. */
  const checkDates = (file: string, where: string, start: HistDate, end?: HistDate) => {
    const s = startT(start);
    const e = end ? endT(end) : undefined;
    if (e !== undefined && e < s) err(file, where, `Ends (${fmtYear(end!.year)}) before it starts (${fmtYear(start.year)})`);
    if (s > tAsOf) err(file, where, `Starts (${fmtYear(start.year)}) after the timeline's as-of date`);
    if (end && startT(end) > tAsOf) err(file, where, `Ends (${fmtYear(end.year)}) after the timeline's as-of date; omit "end" for things that still exist`);
    if (e !== undefined && e <= tStart) err(file, where, `Lies entirely before the start of the timeline`);
  };

  // --- config & eras
  if (b.config && b.eras) {
    const segs = b.eras.segments;
    const first = segs[0];
    if (first && startT(first.start) !== tStart) err('eras.json', 'segments[0]', 'The first segment must start at the timeline start in config.json');
    for (let i = 1; i < segs.length; i++) {
      if (startT(segs[i]!.start) <= startT(segs[i - 1]!.start)) err('eras.json', `segments[${i}] (id "${segs[i]!.id}")`, 'Segments must be in time order with no overlap');
    }
    if (segs.length && startT(segs[segs.length - 1]!.start) >= tAsOf) err('eras.json', 'segments', 'The last segment starts after the as-of date');
  }

  // --- sources
  for (const s of b.sources?.sources ?? []) {
    if (!s.url && !s.doi && !s.isbn && s.type !== 'document') {
      warn('sources.json', `id "${s.id}"`, 'No URL, DOI or ISBN, so readers cannot easily find this work');
    }
  }

  // --- polities
  for (const p of b.polities?.polities ?? []) {
    const where = `id "${p.id}"`;
    checkRefs('polities.json', where, p.sources);
    checkConfidence('polities.json', where, p.confidence, p.sources);
    checkDates('polities.json', where, p.start, p.end);
    for (const [i, r] of (p.relations ?? []).entries()) {
      const rw = `${where} › relations[${i}]`;
      if (!polityIds.has(r.overlord)) err('polities.json', rw, `Overlord "${r.overlord}" is not a polity in polities.json`);
      if (r.overlord === p.id) err('polities.json', rw, 'A polity cannot be its own overlord');
      checkRefs('polities.json', rw, r.sources);
      checkConfidence('polities.json', rw, r.confidence, r.sources);
      checkDates('polities.json', rw, r.start, r.end);
    }
  }

  // --- cultures
  for (const c of b.cultures?.cultures ?? []) {
    const where = `id "${c.id}"`;
    checkRefs('cultures.json', where, c.sources);
    checkConfidence('cultures.json', where, c.confidence, c.sources);
    checkDates('cultures.json', where, c.start, c.end);
  }

  // --- territories & culture zones
  const [bx0, by0] = b.config?.map.bounds[0] ?? [25, 25];
  const [bx1, by1] = b.config?.map.bounds[1] ?? [45, 40];
  const checkExtents = (list: { file: string; data: { features: { properties: Record<string, unknown>; geometry: unknown }[] } }[], ownerKey: 'polity' | 'culture') => {
    const slices = new Map<string, { s: number; e: number; id: string }[]>();
    for (const { file, data } of list) {
      for (const f of data.features) {
        const p = f.properties as {
          id: string; start: HistDate; end?: HistDate; units?: string[]; partial_units?: string[]; contested_units?: string[];
          confidence: string; sources: SourceRef[];
        } & Record<string, string>;
        const where = `id "${p.id}"`;
        const owner = String(p[ownerKey]);
        const ownerRec = ownerKey === 'polity' ? polityIds.get(owner) : cultureIds.get(owner);
        if (!ownerRec) err(file, where, `${ownerKey} "${owner}" is not in ${ownerKey === 'polity' ? 'polities' : 'cultures'}.json`);
        for (const u of [...(p.units ?? []), ...(p.partial_units ?? []), ...(p.contested_units ?? [])]) {
          if (!unitIds.has(u)) err(file, where, `Unknown geographic unit "${u}" (see data/geo/units.json and data/geo/modern-units.geojson)`);
        }
        checkRefs(file, where, p.sources);
        checkConfidence(file, where, p.confidence, p.sources);
        checkDates(file, where, p.start, p.end);
        if (ownerRec) {
          const os = startT(ownerRec.start);
          const oe = ownerRec.end ? endT(ownerRec.end) : Infinity;
          const s = startT(p.start);
          const e = p.end ? endT(p.end) : Infinity;
          if (s < os - 1e-6 || e > oe + 1e-6) warn(file, where, `Time range falls outside the ${ownerKey}'s own dates`);
        }
        // Swapped latitude/longitude: the shape's average point is outside the map
        // area, but would be inside it with the two swapped.
        const geom = f.geometry as { coordinates: unknown } | null;
        if (geom) {
          const flat = JSON.stringify(geom.coordinates).match(/-?\d+(\.\d+)?/g)?.map(Number) ?? [];
          let sx = 0;
          let sy = 0;
          let n = 0;
          for (let i = 0; i + 1 < flat.length; i += 2) {
            sx += flat[i]!;
            sy += flat[i + 1]!;
            n++;
          }
          const [mx, my] = [sx / n, sy / n];
          const inside = (x: number, y: number) => x >= bx0 && x <= bx1 && y >= by0 && y <= by1;
          if (n && !inside(mx, my) && inside(my, mx)) {
            err(file, where, `The shape's centre [${mx.toFixed(2)}, ${my.toFixed(2)}] is outside the map area — are longitude and latitude swapped? GeoJSON uses [longitude, latitude].`);
          }
        }
        const list2 = slices.get(owner) ?? [];
        list2.push({ s: startT(p.start), e: p.end ? endT(p.end) : Infinity, id: p.id });
        slices.set(owner, list2);
      }
    }
    for (const [owner, ss] of slices) {
      ss.sort((a, c) => a.s - c.s);
      for (let i = 1; i < ss.length; i++) {
        if (ss[i]!.s < ss[i - 1]!.e - 1e-6) warn(`${ownerKey === 'polity' ? 'territories' : 'culture-zones'}/`, `${ownerKey} "${owner}"`, `Extents "${ss[i - 1]!.id}" and "${ss[i]!.id}" overlap in time`);
      }
    }
  };
  checkExtents(b.territories, 'polity');
  checkExtents(b.cultureZones, 'culture');

  // --- units
  if (b.units) {
    const lm = new Set(b.units.landmarks.map((l) => l.id));
    for (const u of b.units.units) for (const r of u.ring) if (!lm.has(r)) err('geo/units.json', `unit "${u.id}"`, `Unknown landmark "${r}"`);
  }

  // --- areas & groups
  for (const a of b.areas?.areas ?? []) {
    checkRefs('areas.json', `id "${a.id}"`, a.sources);
    for (const u of a.units ?? []) if (!unitIds.has(u)) err('areas.json', `id "${a.id}"`, `Unknown geographic unit "${u}"`);
  }
  for (const g of b.groups?.groups ?? []) {
    if (g.parent && !groupIds.has(`${g.axis}:${g.parent}`)) err('groups.json', `id "${g.id}"`, `Parent group "${g.parent}" does not exist on the "${g.axis}" axis`);
  }

  // --- population
  const tol = b.config?.composition_tolerance_pct ?? 2;
  const popIds = new Set((b.population?.population ?? []).map((p) => p.id));
  for (const p of b.population?.population ?? []) {
    const where = `id "${p.id}"`;
    if (!areaIds.has(p.area)) err('population.json', where, `Area "${p.area}" is not defined in areas.json`);
    checkRefs('population.json', where, p.sources);
    checkConfidence('population.json', where, p.confidence, p.sources);
    checkDates('population.json', where, p.date);
    const groupCountsOnly = p.total === null && (p.composition ?? []).some((c) => c.groups.some((g) => g.count));
    if (p.total === null && p.confidence !== 'unknown' && !groupCountsOnly) {
      err('population.json', where, 'Total is null (unknown) but confidence is not "unknown"; if the source gives only a group figure, put it in "composition"');
    }
    if (groupCountsOnly && (p.composition ?? []).some((c) => !c.partial)) {
      err('population.json', where, 'The total is unknown, so any composition can only be "partial": true');
    }
    if (p.basis === 'derived' && !p.derivation) err('population.json', where, 'A derived figure must explain its derivation (inputs and formula)');
    for (const input of p.derivation?.inputs ?? []) if (!popIds.has(input)) err('population.json', where, `Derivation input "${input}" is not a population record`);
    for (const [ci, comp] of (p.composition ?? []).entries()) {
      const cw = `${where} › composition[${ci}] (${comp.axis})`;
      checkRefs('population.json', cw, comp.sources);
      for (const g of comp.groups) if (!groupIds.has(`${comp.axis}:${g.group}`)) err('population.json', cw, `Group "${g.group}" is not defined for the "${comp.axis}" axis in groups.json`);
      if (comp.partial) continue;
      const shares = comp.groups.filter((g) => g.share_pct).map((g) => g.share_pct!);
      const counts = comp.groups.filter((g) => g.count).map((g) => g.count!);
      if (shares.length && counts.length) {
        err('population.json', cw, 'Mixes counts and percentages in one composition; use one or the other');
        continue;
      }
      if (shares.length) {
        const s = sumRange(shares);
        if (s.low > 100 + tol) err('population.json', cw, `Lowest shares already add up to ${s.low.toFixed(1)}%, more than 100%`);
        if (s.high < 100 - tol) err('population.json', cw, `Highest shares add up to only ${s.high.toFixed(1)}%; groups are missing (mark "partial": true if the source covers only some groups)`);
        if (shares.every((r) => r.best != null)) {
          const sb = shares.reduce((a, r) => a + r.best!, 0);
          if (Math.abs(sb - 100) > tol) err('population.json', cw, `Best-estimate shares add up to ${sb.toFixed(1)}%, not 100% (±${tol})`);
        }
      }
      if (counts.length && p.total) {
        const s = sumRange(counts);
        const t = { low: p.total.low ?? 0, high: p.total.high ?? Infinity, best: p.total.best ?? undefined };
        if (s.low > t.high * (1 + tol / 100)) err('population.json', cw, `Group counts (at least ${s.low.toLocaleString('en')}) exceed the total (at most ${t.high.toLocaleString('en')})`);
        if (s.high < t.low * (1 - tol / 100)) err('population.json', cw, `Group counts (at most ${s.high.toLocaleString('en')}) fall short of the total (at least ${t.low.toLocaleString('en')}); mark "partial": true if the source covers only some groups`);
        if (counts.every((r) => r.best != null) && t.best !== undefined) {
          const sb = counts.reduce((a, r) => a + r.best!, 0);
          if (Math.abs(sb - t.best) / t.best > tol / 100) err('population.json', cw, `Group counts add up to ${sb.toLocaleString('en')}, but the total is ${t.best.toLocaleString('en')}`);
        }
      }
    }
  }

  // --- palette
  for (const key of Object.keys(b.palette?.pinned ?? {})) {
    if (!polityIds.has(key) && !cultureIds.has(key) && ![...groupIds].some((g) => g.endsWith(`:${key}`))) warn('palette.json', `pinned "${key}"`, 'Pinned colour for an id that is not a polity, culture or group');
  }

  return {
    bundle: b,
    errors: issues.filter((i) => i.level === 'error'),
    warnings: issues.filter((i) => i.level === 'warning'),
  };
}

export function formatIssue(i: Issue, root?: string): string {
  const file = root ? relative(root, join(root, 'data', i.file)) : i.file;
  return `${file} › ${i.where}: ${i.message}`;
}

// Re-exported for scripts that need astronomical math on raw years.
export { toAstronomical };

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
  AreasFile, Config, ConflictsFile, CultureZoneFile, CulturesFile, ErasFile, EventsFile, GroupsFile, LandscapeFile,
  LanguagesFile, MigrationsFile, ModernLayersFile, Palette, PeoplesFile, PerspectivesFile, PlacesFile, PolitiesFile, PopulationFile, RulersFile,
  SourcesFile, Story, UnitsFile, TerritoryFile,
  type HistDate, type Localized, type Range, type SourceRef,
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
  places?: Inferred<typeof PlacesFile>;
  events?: Inferred<typeof EventsFile>;
  rulers?: Inferred<typeof RulersFile>;
  conflicts?: Inferred<typeof ConflictsFile>;
  migrations?: Inferred<typeof MigrationsFile>;
  languages?: Inferred<typeof LanguagesFile>;
  landscape?: Inferred<typeof LandscapeFile>;
  perspectives?: Inferred<typeof PerspectivesFile>;
  peoples?: Inferred<typeof PeoplesFile>;
  modern?: Inferred<typeof ModernLayersFile>;
  stories: { file: string; data: Inferred<typeof Story> }[];
}

export interface Result {
  bundle: DataBundle;
  errors: Issue[];
  warnings: Issue[];
}

const COLLECTION_KEYS = ['segments', 'sources', 'polities', 'cultures', 'features', 'landmarks', 'units', 'areas', 'groups', 'population', 'places', 'events', 'rulers', 'conflicts', 'migrations', 'diaspora', 'languages', 'sea_level', 'dead_sea_levels', 'trade_routes', 'perspectives', 'steps', 'peoples', 'links'];

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
  const b: DataBundle = { dir, territories: [], cultureZones: [], modernUnitIds: new Set(), stories: [] };
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
  b.places = parseFile(dir, 'places.json', PlacesFile, issues, false);
  b.events = parseFile(dir, 'events.json', EventsFile, issues, false);
  b.rulers = parseFile(dir, 'rulers.json', RulersFile, issues, false);
  b.conflicts = parseFile(dir, 'conflicts.json', ConflictsFile, issues, false);
  b.migrations = parseFile(dir, 'migrations.json', MigrationsFile, issues, false);
  b.languages = parseFile(dir, 'languages.json', LanguagesFile, issues, false);
  b.landscape = parseFile(dir, 'landscape.json', LandscapeFile, issues, false);
  b.perspectives = parseFile(dir, 'perspectives.json', PerspectivesFile, issues, false);
  b.peoples = parseFile(dir, 'peoples.json', PeoplesFile, issues, false);
  b.modern = parseFile(dir, 'modern/layers.json', ModernLayersFile, issues, false);
  for (const f of listFiles(dir, 'stories', '.json', issues)) {
    const data = parseFile(dir, f, Story, issues);
    if (data) b.stories.push({ file: f, data });
  }
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
  // An official count (a census, a statistical table, a UN agency's register) is documented by its publisher alone.
  const officialCount = (refs: SourceRef[]) =>
    refs.length > 0 && refs.every((r) => ['government', 'un'].includes(sourceIds.get(r.ref)?.kind ?? ''));
  const checkConfidence = (file: string, where: string, confidence: string, refs: SourceRef[], opts: { singleOk?: boolean } = {}) => {
    if (confidence !== 'unknown' && refs.length === 0) err(file, where, `Confidence is "${confidence}" but no source is given (only "unknown" may have no source)`);
    if (confidence === 'contested' && new Set(refs.map((r) => r.ref)).size < 2) {
      err(file, where, 'Marked "contested" but cites fewer than two different sources; a contested item needs at least two sourced positions');
    }
    if (refs.length > 0 && refs.every((r) => sourceIds.get(r.ref)?.verification.level === 'catalogue-only')) {
      warn(file, where, 'Every source for this record was only checked at catalogue level (content not seen)');
    }
    if (!opts.singleOk && confidence === 'documented' && new Set(refs.map((r) => r.ref)).size === 1) {
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
        // A slice may hand over to the next within the same month or year (its end and the next start share that period);
        // only a next slice that starts before the period in which this one ends counts as an overlap.
        list2.push({ s: startT(p.start), e: p.end ? startT(p.end) : Infinity, id: p.id });
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
    checkConfidence('population.json', where, p.confidence, p.sources, { singleOk: officialCount(p.sources) });
    checkDates('population.json', where, p.date);
    const groupCountsOnly = p.total === null && (p.composition ?? []).some((c) => c.groups.some((g) => g.count));
    // A source may give only shares (e.g. "Muslims 70-80%") without a total: that is still an estimate.
    const sharesOnly = p.total === null && (p.composition ?? []).some((c) => c.groups.some((g) => g.share_pct));
    if (p.total === null && p.confidence !== 'unknown' && !groupCountsOnly && !sharesOnly) {
      err('population.json', where, 'Total is null (unknown) but confidence is not "unknown"; if the source gives only group figures or shares, put them in "composition"');
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

  // --- places, events, rulers, conflicts, migrations, languages, landscape
  const placeIds = new Set((b.places?.places ?? []).map((p) => p.id));
  const conflictIds = new Set((b.conflicts?.conflicts ?? []).map((c) => c.id));
  checkIdsUnique(b.places?.places, 'places.json', 'place', issues);
  checkIdsUnique(b.events?.events, 'events.json', 'event', issues);
  checkIdsUnique(b.rulers?.rulers, 'rulers.json', 'ruler', issues);
  checkIdsUnique(b.conflicts?.conflicts, 'conflicts.json', 'conflict', issues);
  checkIdsUnique(b.migrations?.migrations, 'migrations.json', 'migration', issues);
  checkIdsUnique(b.languages?.languages, 'languages.json', 'language', issues);
  checkIdsUnique(b.perspectives?.perspectives, 'perspectives.json', 'perspective', issues);

  for (const p of b.places?.places ?? []) {
    const where = `id "${p.id}"`;
    checkRefs('places.json', where, p.sources);
    checkConfidence('places.json', where, p.confidence, p.sources);
    for (const [i, n] of (p.names ?? []).entries()) {
      const nw = `${where} › names[${i}] ("${n.text}")`;
      checkRefs('places.json', nw, n.sources);
      // A name attested in one gazetteer or text is normal; a second source is not expected.
      checkConfidence('places.json', nw, n.confidence, n.sources, { singleOk: true });
      if (n.start) checkDates('places.json', nw, n.start, n.end);
    }
    for (const d of p.destroyed ?? []) checkRefs('places.json', `${where} › destroyed`, d.sources);
    for (const [tr, e] of Object.entries(p.holy_site?.traditions ?? {})) if (e) checkRefs('places.json', `${where} › holy_site.${tr}`, e.sources);
  }
  for (const e of b.events?.events ?? []) {
    const where = `id "${e.id}"`;
    checkRefs('events.json', where, e.sources);
    checkConfidence('events.json', where, e.confidence, e.sources);
    checkDates('events.json', where, e.date, e.end);
    if (e.place && !placeIds.has(e.place)) err('events.json', where, `Place "${e.place}" is not in places.json`);
  }
  for (const r of b.rulers?.rulers ?? []) {
    const where = `id "${r.id}"`;
    if (!polityIds.has(r.polity)) err('rulers.json', where, `Polity "${r.polity}" is not in polities.json`);
    checkRefs('rulers.json', where, r.sources);
    checkConfidence('rulers.json', where, r.confidence, r.sources);
    checkDates('rulers.json', where, r.start, r.end);
  }
  for (const c of b.conflicts?.conflicts ?? []) {
    const where = `id "${c.id}"`;
    checkRefs('conflicts.json', where, c.sources);
    checkConfidence('conflicts.json', where, c.confidence, c.sources);
    checkDates('conflicts.json', where, c.start, c.end);
    if (c.parent && !conflictIds.has(c.parent)) err('conflicts.json', where, `Parent conflict "${c.parent}" does not exist`);
    if (c.location?.place && !placeIds.has(c.location.place)) err('conflicts.json', where, `Place "${c.location.place}" is not in places.json`);
    for (const u of c.location?.units ?? []) if (!unitIds.has(u)) err('conflicts.json', where, `Unknown geographic unit "${u}"`);
    for (const side of c.belligerents ?? []) for (const party of side.parties) {
      if ('polity' in party && !polityIds.has(party.polity)) err('conflicts.json', where, `Belligerent polity "${party.polity}" is not in polities.json`);
    }
    for (const a of c.alt_names ?? []) checkRefs('conflicts.json', `${where} › alt_names`, a.sources);
  }
  for (const m of b.migrations?.migrations ?? []) {
    const where = `id "${m.id}"`;
    checkRefs('migrations.json', where, m.sources);
    checkConfidence('migrations.json', where, m.confidence, m.sources);
    checkDates('migrations.json', where, m.start, m.end);
    for (const ep of [m.origin, m.destination]) if ('place' in ep && !placeIds.has(ep.place)) err('migrations.json', where, `Place "${ep.place}" is not in places.json`);
  }
  for (const d of b.migrations?.diaspora ?? []) {
    checkRefs('migrations.json', `diaspora "${d.id}"`, d.sources);
    checkConfidence('migrations.json', `diaspora "${d.id}"`, d.confidence, d.sources, { singleOk: officialCount(d.sources) });
  }
  for (const l of b.languages?.languages ?? []) {
    checkRefs('languages.json', `id "${l.id}"`, l.sources);
    for (const [i, per] of l.periods.entries()) {
      const pw = `id "${l.id}" › periods[${i}]`;
      checkRefs('languages.json', pw, per.sources);
      checkConfidence('languages.json', pw, per.confidence, per.sources);
      checkDates('languages.json', pw, per.start, per.end);
    }
  }
  if (b.landscape) {
    for (const lp of [...b.landscape.sea_level, ...b.landscape.dead_sea_levels]) {
      checkRefs('landscape.json', `id "${lp.id}"`, lp.sources);
      // A dated reading from an official measurement series (a dataset) is a measurement: one source suffices.
      const measured = lp.date.precision === 'day' && lp.sources.length > 0 && lp.sources.every((r) => sourceIds.get(r.ref)?.type === 'dataset');
      checkConfidence('landscape.json', `id "${lp.id}"`, lp.confidence, lp.sources, { singleOk: measured });
    }
    for (const r of b.landscape.trade_routes) {
      checkRefs('landscape.json', `route "${r.id}"`, r.sources);
      checkConfidence('landscape.json', `route "${r.id}"`, r.confidence, r.sources);
      checkDates('landscape.json', `route "${r.id}"`, r.start, r.end);
    }
  }

  // --- modern layers: files exist and are valid GeoJSON in the map area
  for (const l of b.modern?.layers ?? []) {
    const where = `layer "${l.id}"`;
    checkRefs('modern/layers.json', where, l.sources);
    checkConfidence('modern/layers.json', where, l.confidence, l.sources);
    checkDates('modern/layers.json', where, l.start, l.end);
    const f = join(dir, 'modern', l.file);
    if (!existsSync(f)) err('modern/layers.json', where, `File modern/${l.file} is missing`);
    else {
      try {
        const fc = JSON.parse(readFileSync(f, 'utf8')) as { type?: string; features?: unknown[] };
        if (fc.type !== 'FeatureCollection' || !Array.isArray(fc.features)) err(`modern/${l.file}`, '(file)', 'Not a GeoJSON FeatureCollection');
      } catch (e) {
        err(`modern/${l.file}`, '(file)', `Not valid JSON: ${(e as Error).message}`);
      }
    }
  }

  // --- narrative text: every sentence ends with citation markers [n]; translations keep the same markers
  const checkCitedText = (file: string, where: string, text: Localized, nSources: number) => {
    const markers = (s: string) => (s.match(/\[(\d+)\]/g) ?? []).map((m) => Number(m.slice(1, -1))).sort((a, c) => a - c).join(',');
    const sentences = text.en.split(/(?<=[.!?…])\s+(?=[A-Z0-9"“‘'(])/).map((x) => x.trim()).filter(Boolean);
    for (const sentence of sentences) {
      if (!/\[\d+\][.!?"”’)]*$/.test(sentence)) err(file, where, `This sentence has no citation marker [n] at its end: "${sentence.slice(0, 90)}"`);
    }
    for (const m of text.en.match(/\[(\d+)\]/g) ?? []) {
      const n = Number(m.slice(1, -1));
      if (n < 1 || n > nSources) err(file, where, `Citation marker ${m} points past the ${nSources} source(s) listed`);
    }
    for (const lang of ['ar', 'he'] as const) {
      const tx = text[lang];
      if (tx && markers(tx) !== markers(text.en)) err(file, where, `The ${lang} text does not carry the same citation markers as the English`);
    }
  };
  const aboutIds = new Set<string>([
    ...(b.conflicts?.conflicts ?? []).map((x) => x.id),
    ...(b.events?.events ?? []).map((x) => x.id),
    ...(b.migrations?.migrations ?? []).map((x) => x.id),
    ...(b.polities?.polities ?? []).map((x) => x.id),
    ...(b.places?.places ?? []).map((x) => x.id),
  ]);
  for (const p of b.perspectives?.perspectives ?? []) {
    for (const id of p.about ?? []) {
      if (!aboutIds.has(id)) err('perspectives.json', `id "${p.id}" › about`, `Unknown record "${id}" (must be a conflict, event, migration, polity or place id)`);
    }
    for (const [i, a] of p.accounts.entries()) {
      const aw = `id "${p.id}" › accounts[${i}] (${a.perspective})`;
      checkRefs('perspectives.json', aw, a.sources);
      checkCitedText('perspectives.json', aw, a.summary, a.sources.length);
    }
    const kinds = new Set(p.accounts.map((a) => a.perspective.split('-')[0]));
    for (const need of ['israeli', 'palestinian']) {
      if (!kinds.has(need) && !p.accounts.some((a) => a.perspective.includes(need))) warn('perspectives.json', `id "${p.id}"`, `No ${need} account`);
    }
  }
  // Language descent: every parent language exists, and a language does not descend from itself.
  {
    const langIds = new Set((b.languages?.languages ?? []).map((x) => x.id));
    for (const l of b.languages?.languages ?? []) {
      if (!l.lineage) continue;
      for (const parent of l.lineage.descends_from) {
        if (!langIds.has(parent)) err('languages.json', `id "${l.id}" › lineage`, `Unknown parent language "${parent}"`);
        if (parent === l.id) err('languages.json', `id "${l.id}" › lineage`, 'A language cannot descend from itself');
      }
      checkRefs('languages.json', `id "${l.id}" › lineage`, l.lineage.sources);
    }
  }
  // Peoples through time: every link joins known peoples, every "related" id exists, and the usual sourcing rules apply.
  {
    const peopleIds = new Set((b.peoples?.peoples ?? []).map((x) => x.id));
    checkIdsUnique(b.peoples?.peoples, 'peoples.json', 'people', issues);
    checkIdsUnique(b.peoples?.links, 'peoples.json', 'link', issues);
    const known: Record<string, Set<string>> = {
      polities: new Set((b.polities?.polities ?? []).map((x) => x.id)),
      cultures: new Set((b.cultures?.cultures ?? []).map((x) => x.id)),
      languages: new Set((b.languages?.languages ?? []).map((x) => x.id)),
      migrations: new Set((b.migrations?.migrations ?? []).map((x) => x.id)),
      groups: new Set((b.groups?.groups ?? []).map((x) => x.id)),
    };
    for (const p of b.peoples?.peoples ?? []) {
      const where = `people "${p.id}"`;
      checkRefs('peoples.json', where, p.sources);
      checkConfidence('peoples.json', where, p.confidence, p.sources);
      checkDates('peoples.json', where, p.attested.start, p.attested.end ?? undefined);
      for (const u of p.units ?? []) if (!unitIds.has(u)) err('peoples.json', where, `Unknown geographic unit "${u}"`);
      for (const [i, r] of (p.religions ?? []).entries()) {
        const w = `${where} › religions[${i}]`;
        if (r.group && !groupIds.has(`religion:${r.group}`)) err('peoples.json', w, `Unknown religion group "${r.group}"`);
        checkRefs('peoples.json', w, r.sources);
      }
      for (const [i, l] of (p.languages ?? []).entries()) {
        const w = `${where} › languages[${i}]`;
        if (!known.languages!.has(l.language)) err('peoples.json', w, `Unknown language "${l.language}"`);
        checkRefs('peoples.json', w, l.sources);
      }
      for (const [kind, ids] of Object.entries(p.related ?? {})) {
        for (const id of ids ?? []) if (!known[kind]?.has(id)) err('peoples.json', where, `Unknown ${({ polities: 'polity', cultures: 'culture', languages: 'language', migrations: 'migration', groups: 'group' } as Record<string, string>)[kind] ?? kind} "${id}" in related.${kind}`);
      }
    }
    for (const l of b.peoples?.links ?? []) {
      const where = `link "${l.id}"`;
      if (!peopleIds.has(l.from)) err('peoples.json', where, `Unknown people "${l.from}" in "from"`);
      if (l.to && !peopleIds.has(l.to)) err('peoples.json', where, `Unknown people "${l.to}" in "to"`);
      if (l.to && l.to === l.from) err('peoples.json', where, 'A link cannot point to the same people');
      checkRefs('peoples.json', where, l.sources);
      checkConfidence('peoples.json', where, l.confidence, l.sources);
      checkDates('peoples.json', where, l.start, l.end ?? undefined);
    }
  }
  for (const { file, data } of b.stories) {
    for (const [i, st] of data.steps.entries()) {
      const sw = `steps[${i}]`;
      checkRefs(file, sw, st.sources);
      checkCitedText(file, sw, st.card, st.sources.length);
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

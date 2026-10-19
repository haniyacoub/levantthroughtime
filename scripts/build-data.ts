/**
 * npm run build-data
 *
 * Validates /data (and stops if there are errors), then writes the optimised
 * files the website loads into public/data/ (generated; not committed):
 *   app-data.json      config, eras, polities (with colours), cultures, sources, population…
 *   territories.geojson territory and culture-zone shapes, built from units, simplified
 *   labels.geojson     one label point per shape
 *   basemap/*.geojson  physical layers (copied from data/geo/basemap)
 *   font-faces.json    font files for map labels (copied from @fontsource)
 */
import * as turf from '@turf/turf';
import type { Feature, FeatureCollection, MultiPolygon, Polygon, Point } from 'geojson';
import { copyFileSync, existsSync, mkdirSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { DATA, PUBLIC, ROOT, readJson, writeJson } from './lib/io';
import { buildUnits, unionOf, type Area, type UnitsData } from './lib/geo';
import { formatIssue, validateData } from './lib/validate';
import { generateSchemas } from './gen-json-schema';
import { endT, startT } from '../src/time/years';

const OUT = join(PUBLIC, 'data');

function fail(msg: string): never {
  console.error(msg);
  process.exit(1);
}

const { bundle: b, errors, warnings } = validateData(DATA);
if (errors.length) {
  for (const e of errors) console.error(`  ✗ data/${formatIssue(e)}`);
  fail(`\n✗ build-data stopped: ${errors.length} data error(s). Run "npm run validate-data" for details.`);
}

// Overwrite files in place rather than deleting the folder: on synced folders (iCloud
// Drive, Dropbox) delete-and-recreate produces "file 2.json" conflict copies.
mkdirSync(OUT, { recursive: true });

// ------------------------------------------------------------ geometry

const unitsData = readJson<UnitsData>(join(DATA, 'geo', 'units.json'));
const { units, problems } = buildUnits(unitsData);
if (problems.length) fail(problems.map((p) => `  ✗ data/geo/units.json: ${p}`).join('\n'));
const modern = readJson<FeatureCollection<Polygon | MultiPolygon>>(join(DATA, 'geo', 'modern-units.geojson'));
for (const f of modern.features) units.set(String(f.properties?.id), f as Area);

const unitCache = new Map<string, Area | null>();
function shapeOf(ids: string[]): Area | null {
  const key = [...ids].sort().join('+');
  if (!unitCache.has(key)) unitCache.set(key, unionOf(ids.map((id) => units.get(id)!).filter(Boolean)));
  return unitCache.get(key)!;
}

function simplify(a: Area): Area {
  const s = turf.simplify(a, { tolerance: 0.002, highQuality: false, mutate: false });
  return turf.truncate(s, { precision: 4, mutate: true });
}

/** Label point: a point inside the largest polygon part. */
function labelPoint(a: Area): [number, number] {
  let part: Feature<Polygon> = turf.polygon(a.geometry.type === 'Polygon' ? a.geometry.coordinates : a.geometry.coordinates[0]!);
  if (a.geometry.type === 'MultiPolygon') {
    let best = -1;
    for (const coords of a.geometry.coordinates) {
      const p = turf.polygon(coords);
      const ar = turf.area(p);
      if (ar > best) {
        best = ar;
        part = p;
      }
    }
  }
  const c = turf.centerOfMass(part);
  const pt = turf.booleanPointInPolygon(c, part) ? c : turf.pointOnFeature(part);
  return pt.geometry.coordinates.map((v) => Math.round(v * 1e4) / 1e4) as [number, number];
}

type OutProps = {
  id: string;
  kind: 'territory' | 'culture-zone';
  owner: string;
  t0: number;
  t1: number | null;
  certainty: string;
  confidence: string;
  partial: boolean;
  /** An area claimed but not governed: drawn as an outline only. */
  claim?: boolean;
  /** Area in km², used to prioritise labels. */
  area?: number;
};
const shapes: Feature<Polygon | MultiPolygon, OutProps>[] = [];
const labels: Feature<Point, OutProps>[] = [];

function addExtent(kind: OutProps['kind'], owner: string, p: { id: string; start: { year: number; month?: number }; end?: { year: number; month?: number }; units?: string[]; partial_units?: string[]; contested_units?: string[]; extent_type?: string; boundary_certainty: string; confidence: string }, geometry: Polygon | MultiPolygon | null) {
  const base = {
    kind,
    owner,
    t0: startT(p.start),
    t1: p.end ? endT(p.end) : null,
    certainty: p.boundary_certainty,
    confidence: p.confidence,
    ...(p.extent_type === 'claim' ? { claim: true } : {}),
  };
  if (p.contested_units?.length) {
    const c = shapeOf(p.contested_units);
    if (c) shapes.push({ type: 'Feature', properties: { id: `${p.id}--contested`, ...base, certainty: 'contested', partial: false }, geometry: simplify(c).geometry });
  }
  const main: Area | null = geometry ? turf.feature(geometry) : p.units?.length ? shapeOf(p.units) : null;
  if (main) {
    const s = simplify(main);
    const props: OutProps = { id: p.id, ...base, partial: false };
    shapes.push({ type: 'Feature', properties: props, geometry: s.geometry });
    labels.push({ type: 'Feature', properties: { ...props, area: Math.round(turf.area(s) / 1e6) }, geometry: { type: 'Point', coordinates: labelPoint(s) } });
  }
  if (p.partial_units?.length) {
    const part = shapeOf(p.partial_units);
    if (part) {
      const s = simplify(part);
      const props: OutProps = { id: `${p.id}--partial`, ...base, partial: true };
      shapes.push({ type: 'Feature', properties: props, geometry: s.geometry });
      // A slice held only in part still needs a label.
      if (!main) labels.push({ type: 'Feature', properties: { ...props, area: Math.round(turf.area(s) / 1e6) }, geometry: { type: 'Point', coordinates: labelPoint(s) } });
    }
  }
}

for (const { data } of b.territories) for (const f of data.features) addExtent('territory', f.properties.polity, f.properties, f.geometry);
for (const { data } of b.cultureZones) for (const f of data.features) addExtent('culture-zone', f.properties.culture, f.properties, f.geometry);

writeJson(join(OUT, 'territories.geojson'), { type: 'FeatureCollection', features: shapes }, true);
writeJson(join(OUT, 'labels.geojson'), { type: 'FeatureCollection', features: labels }, true);

// ------------------------------------------------------------ colours

/**
 * Greedy colouring: owners (polities or cultures) shown at the same time in
 * overlapping areas, or linked as overlord/subject, get different colours.
 */
function assignColours(): Record<string, string> {
  const palette = b.palette!;
  const colour: Record<string, string> = {};
  const info = new Map<string, { t0: number; t1: number; bbox: number[] }>();
  for (const s of shapes) {
    const bb = turf.bbox(s);
    const cur = info.get(s.properties.owner);
    const t1 = s.properties.t1 ?? Infinity;
    if (!cur) info.set(s.properties.owner, { t0: s.properties.t0, t1, bbox: bb });
    else {
      cur.t0 = Math.min(cur.t0, s.properties.t0);
      cur.t1 = Math.max(cur.t1, t1);
      cur.bbox = [Math.min(cur.bbox[0]!, bb[0]!), Math.min(cur.bbox[1]!, bb[1]!), Math.max(cur.bbox[2]!, bb[2]!), Math.max(cur.bbox[3]!, bb[3]!)];
    }
  }
  const linked = new Set<string>();
  for (const p of b.polities?.polities ?? []) for (const r of p.relations ?? []) linked.add(`${p.id}|${r.overlord}`).add(`${r.overlord}|${p.id}`);
  const owners = [...info.keys()].sort((a, c) => info.get(a)!.t0 - info.get(c)!.t0 || a.localeCompare(c));
  const conflicts = (a: string, c: string) => {
    if (linked.has(`${a}|${c}`)) return true;
    const A = info.get(a)!;
    const C = info.get(c)!;
    const timeOverlap = A.t0 < C.t1 && C.t0 < A.t1;
    const pad = 0.3;
    const spaceOverlap = !(A.bbox[2]! + pad < C.bbox[0]! || C.bbox[2]! + pad < A.bbox[0]! || A.bbox[3]! + pad < C.bbox[1]! || C.bbox[3]! + pad < A.bbox[1]!);
    return timeOverlap && spaceOverlap;
  };
  for (const [id, pin] of Object.entries(palette.pinned)) colour[id] = pin.color;
  for (const o of owners) {
    if (colour[o]) continue;
    const used = owners.filter((x) => x !== o && colour[x] && conflicts(o, x)).map((x) => colour[x]!);
    const free = palette.cycle.find((c) => !used.includes(c));
    colour[o] = free ?? palette.cycle.reduce((best, c) => (used.filter((u) => u === c).length < used.filter((u) => u === best).length ? c : best), palette.cycle[0]!);
  }
  // Polities or cultures with no shape still get a colour for bands and legends.
  for (const p of [...(b.polities?.polities ?? []), ...(b.cultures?.cultures ?? [])]) {
    if (!colour[p.id]) colour[p.id] = palette.cycle[Math.abs(hash(p.id)) % palette.cycle.length]!;
  }
  return colour;
}

/**
 * Colours for population groups: a fixed, colour-blind-safe mapping (Paul Tol's "bright"
 * scheme) chosen to avoid flag colours. Pinned in palette.json under "group:<axis>:<id>" if needed.
 */
function groupColour(axis: string, id: string, i: number): string {
  const pinned = b.palette?.pinned[`${axis}-${id}`]?.color;
  if (pinned) return pinned;
  // Avoided on purpose: yellow for Jews (the yellow badge), green for Muslims, flag blue/white for Jews.
  const fixed: Record<string, string> = {
    muslims: '#4477AA', christians: '#EE6677', jews: '#AA3377', druze: '#66CCEE', samaritans: '#CCBB44',
    bahais: '#228833', others: '#BBBBBB', 'no-religion': '#999999', 'not-classified-by-religion': '#AAAAAA',
    'others-and-unknown': '#BBBBBB', arabs: '#EE7733', 'jews-and-others': '#AA3377', foreigners: '#66CCEE',
    'arabs-and-others': '#EE7733', israelites: '#AA3377', franks: '#CCBB44',
  };
  return fixed[id] ?? ['#4477AA', '#EE6677', '#228833', '#CCBB44', '#66CCEE', '#AA3377', '#BBBBBB'][i % 7]!;
}

function hash(s: string): number {
  let h = 0;
  for (const ch of s) h = (h * 31 + ch.charCodeAt(0)) | 0;
  return h;
}

const colours = assignColours();

// ------------------------------------------------------------ ruler bands

/**
 * Units that make up the "core" land (between the Mediterranean and the Jordan).
 * A polity gets a ruler band for the periods when it held any of them.
 */
const CORE_UNITS = new Set([
  'upper-galilee', 'lower-galilee', 'acre-plain', 'carmel-sharon', 'jezreel', 'samaria', 'judea', 'shephelah',
  'philistia', 'judean-desert', 'jordan-valley', 'negev-north', 'negev-south',
  'israel-1949', 'west-bank', 'east-jerusalem', 'gaza-strip', 'mount-scopus', 'nml-latrun', 'nml-jerusalem',
]);
const bandMap = new Map<string, [number, number][]>();
for (const { data } of b.territories) {
  for (const f of data.features) {
    const p = f.properties;
    if (p.extent_type === 'claim') continue;
    const all = [...(p.units ?? []), ...(p.partial_units ?? []), ...(p.contested_units ?? [])];
    if (!all.some((u) => CORE_UNITS.has(u))) continue;
    const list = bandMap.get(p.polity) ?? [];
    list.push([startT(p.start), p.end ? endT(p.end) : Infinity]);
    bandMap.set(p.polity, list);
  }
}
const bands = [...bandMap.entries()].map(([owner, ivs]) => {
  ivs.sort((a, c) => a[0] - c[0]);
  const merged: [number, number][] = [];
  for (const iv of ivs) {
    const last = merged[merged.length - 1];
    if (last && iv[0] <= last[1] + 1e-6) last[1] = Math.max(last[1], iv[1]);
    else merged.push([...iv]);
  }
  return { owner, intervals: merged.map(([a, c]) => [a, Number.isFinite(c) ? c : null]) };
});

// ------------------------------------------------------------ which records cite each source

const sourceUsage: Record<string, number> = {};
const countRefs = (o: unknown): void => {
  if (Array.isArray(o)) o.forEach(countRefs);
  else if (o && typeof o === 'object') {
    const rec = o as Record<string, unknown>;
    if (typeof rec.ref === 'string' && Object.keys(rec).every((k) => ['ref', 'locator', 'quote', 'via', 'note'].includes(k))) {
      sourceUsage[rec.ref] = (sourceUsage[rec.ref] ?? 0) + 1;
    }
    for (const v of Object.values(rec)) countRefs(v);
  }
};
countRefs([b.polities, b.cultures, b.territories.map((t) => t.data), b.cultureZones.map((t) => t.data), b.population, b.areas,
  b.places, b.events, b.rulers, b.conflicts, b.migrations, b.languages, b.landscape, b.perspectives, b.stories.map((s) => s.data)]);

// ------------------------------------------------------------ app data

const appData: Record<string, any> & { conflicts: any[]; migrations: any[] } = {
  generated: new Date().toISOString(),
  config: b.config,
  eras: b.eras?.segments,
  sources: b.sources?.sources,
  polities: (b.polities?.polities ?? []).map((p) => ({ ...p, color: colours[p.id] })),
  cultures: (b.cultures?.cultures ?? []).map((c) => ({ ...c, color: colours[c.id] })),
  extents: [
    ...b.territories.flatMap(({ data }) => data.features.map((f) => ({ ...f.properties, owner: f.properties.polity, kind: 'territory' }))),
    ...b.cultureZones.flatMap(({ data }) => data.features.map((f) => ({ ...f.properties, owner: f.properties.culture, kind: 'culture-zone' }))),
  ],
  areas: b.areas?.areas ?? [],
  groups: b.groups?.groups ?? [],
  population: b.population?.population ?? [],
  units: [
    ...unitsData.units.map((u) => ({ id: u.id, name: u.name, description: u.description })),
    ...modern.features.map((f) => ({ id: String(f.properties?.id), name: { en: String(f.properties?.name_en) } })),
  ],
  bands,
  sourceUsage,
  places: b.places?.places ?? [],
  events: b.events?.events ?? [],
  rulers: b.rulers?.rulers ?? [],
  conflicts: b.conflicts?.conflicts ?? [],
  migrations: b.migrations?.migrations ?? [],
  diaspora: b.migrations?.diaspora ?? [],
  languages: b.languages?.languages ?? [],
  landscape: b.landscape ?? null,
  perspectives: b.perspectives?.perspectives ?? [],
  stories: b.stories.map((s) => s.data),
  groupColors: Object.fromEntries((b.groups?.groups ?? []).map((g, i) => [`${g.axis}:${g.id}`, groupColour(g.axis, g.id, i)])),
};

// ------------------------------------------------------------ map positions for conflicts and migrations

const placeCoords = new Map((b.places?.places ?? []).map((p) => [p.id, p.coords as [number, number]]));
/** A conflict's marker position: its place, its own coordinates, or the centre of its units. */
function conflictCoords(c: { location?: { place?: string; coords?: [number, number]; units?: string[] } }): [number, number] | null {
  const loc = c.location;
  if (!loc) return null;
  if (loc.coords) return loc.coords;
  if (loc.place && placeCoords.has(loc.place)) return placeCoords.get(loc.place)!;
  if (loc.units?.length) {
    const shape = shapeOf(loc.units);
    if (shape) return labelPoint(shape);
  }
  return null;
}
appData.conflicts = appData.conflicts.map((c) => ({ ...c, _coords: conflictCoords(c) }));
const endpoint = (e: { place: string } | { label: unknown; coords: [number, number] }) => ('place' in e ? placeCoords.get(e.place) ?? null : e.coords);
appData.migrations = appData.migrations.map((m) => {
  const from = endpoint(m.origin);
  const to = endpoint(m.destination);
  // Several origins or destinations: one leg each (the sources don't split the number between them).
  const legs: [[number, number], [number, number]][] = [];
  for (const d of m.destinations ?? []) { const p = endpoint(d); if (from && p) legs.push([from, p]); }
  for (const o of m.origins ?? []) { const p = endpoint(o); if (p && to) legs.push([p, to]); }
  return { ...m, _from: from, _to: to, ...(legs.length ? { _legs: legs } : {}) };
});

// Each perspective's time span, from the records it is about (for showing it in the year panel).
{
  const spans = new Map<string, [number, number]>();
  const add = (id: string, s0: { year: number; month?: number }, e0?: { year: number; month?: number }) =>
    spans.set(id, [startT(s0), e0 ? endT(e0) : startT(s0) + 1]);
  for (const c of b.conflicts?.conflicts ?? []) add(c.id, c.start, c.end);
  for (const e of b.events?.events ?? []) add(e.id, e.date, e.end);
  for (const m of b.migrations?.migrations ?? []) add(m.id, m.start, m.end);
  for (const p of b.polities?.polities ?? []) add(p.id, p.start, p.end);
  appData.perspectives = appData.perspectives.map((p: { about?: string[] }) => {
    const ss = (p.about ?? []).map((id) => spans.get(id)).filter((x): x is [number, number] => !!x);
    return ss.length ? { ...p, _t0: Math.min(...ss.map((x) => x[0])), _t1: Math.max(...ss.map((x) => x[1])) } : p;
  });
}

// ------------------------------------------------------------ modern layers

/** Copies each modern layer with per-feature times (t0/t1) for date filtering on the map. */
mkdirSync(join(OUT, 'modern'), { recursive: true });
appData.modernLayers = (b.modern?.layers ?? []).map((l) => {
  const fc = readJson<FeatureCollection>(join(DATA, 'modern', l.file));
  const lt0 = startT(l.start);
  const lt1 = l.end ? endT(l.end) : null;
  for (const f of fc.features) {
    const p = (f.properties ??= {}) as Record<string, unknown>;
    const s0 = p.start as { year: number; month?: number } | undefined;
    const e0 = p.end as { year: number; month?: number } | undefined;
    p.t0 = s0 ? startT(s0) : lt0;
    p.t1 = e0 ? endT(e0) : lt1 ?? 1e9;
  }
  writeJson(join(OUT, 'modern', l.file), turf.truncate(fc, { precision: 5 }), true);
  return { ...l, t0: lt0, t1: lt1 };
});

writeJson(join(OUT, 'app-data.json'), appData, true);

// ------------------------------------------------------------ basemap copy

mkdirSync(join(OUT, 'basemap'), { recursive: true });
for (const f of readdirSync(join(DATA, 'geo', 'basemap'))) copyFileSync(join(DATA, 'geo', 'basemap', f), join(OUT, 'basemap', f));
mkdirSync(join(OUT, 'landscape'), { recursive: true });
if (existsSync(join(DATA, 'geo', 'landscape'))) {
  for (const f of readdirSync(join(DATA, 'geo', 'landscape'))) copyFileSync(join(DATA, 'geo', 'landscape', f), join(OUT, 'landscape', f));
}

// ------------------------------------------------------------ fonts for map labels

/** Parse @fontsource CSS into MapLibre `font-faces` entries and copy the woff2 files. */
function buildFontFaces() {
  // Each package contributes only its own script; order matters (first match wins).
  const families: { name: string; pkg: string; subsets: string[] }[] = [
    { name: 'Noto Sans Regular', pkg: 'noto-sans', subsets: ['latin', 'latin-ext', 'greek', 'greek-ext'] },
    { name: 'Noto Sans Regular', pkg: 'noto-sans-arabic', subsets: ['arabic'] },
    { name: 'Noto Sans Regular', pkg: 'noto-sans-hebrew', subsets: ['hebrew'] },
  ];
  const faces: Record<string, { url: string; 'unicode-range': string[] }[]> = {};
  const fontsOut = join(PUBLIC, 'fonts');
  mkdirSync(fontsOut, { recursive: true });
  for (const fam of families) {
    const dir = join(ROOT, 'node_modules', '@fontsource', fam.pkg);
    const css = readFileSync(join(dir, '400.css'), 'utf8');
    for (const block of css.split('@font-face').slice(1)) {
      const file = /url\(\.\/files\/([^)]+\.woff2)\)/.exec(block)?.[1];
      const range = /unicode-range:\s*([^;]+);/.exec(block)?.[1];
      if (!file || !range) continue;
      const subset = file.slice(fam.pkg.length + 1).replace(/-400-normal\.woff2$/, '');
      if (!fam.subsets.includes(subset)) continue;
      copyFileSync(join(dir, 'files', file), join(fontsOut, file));
      (faces[fam.name] ??= []).push({ url: `fonts/${file}`, 'unicode-range': range.split(',').map((r) => r.trim()) });
    }
  }
  writeJson(join(OUT, 'font-faces.json'), faces);
}
buildFontFaces();

generateSchemas();

if (!existsSync(join(PUBLIC, 'tiles', 'terrain'))) {
  console.warn('⚠ Elevation tiles are missing (public/tiles/terrain). Run "npm run build-basemap" once; the map works without hillshade until then.');
}
console.log(`✓ build-data: ${shapes.length} shapes, ${labels.length} labels, ${appData.polities.length} polities, ${appData.population.length} population records → public/data/` + (warnings.length ? ` (${warnings.length} warnings; npm run validate-data -- --warnings)` : ''));

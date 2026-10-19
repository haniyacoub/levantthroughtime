/**
 * Builds the physical basemap. Run once after cloning (and whenever the
 * map extent changes):   npm run build-basemap
 *
 * 1. Downloads Natural Earth v5.1.2 vectors (public domain), clips them to the
 *    map extent and writes small GeoJSON files to data/geo/basemap/ (committed).
 * 2. Extracts modern reference units (1949 lines, West Bank, Gaza, Golan, …)
 *    from Natural Earth into data/geo/modern-units.geojson (committed). Only the
 *    shapes are used; Natural Earth's own sovereignty attributes are dropped.
 * 3. Downloads elevation tiles (AWS Terrain Tiles, terrarium encoding; built
 *    from SRTM, GMTED2010 and ETOPO1 for this region, US-government public
 *    domain) into public/tiles/terrain/ (not committed; CI caches them).
 *
 * Flags: --no-tiles, --tiles-only
 */
import * as turf from '@turf/turf';
import type { Feature, FeatureCollection, MultiPolygon, Polygon, Geometry } from 'geojson';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { DATA, PUBLIC, download, readJson, rel, sha256, writeJson } from './lib/io';

const NE_TAG = 'v5.1.2';
const NE_BASE = `https://raw.githubusercontent.com/nvkelso/natural-earth-vector/${NE_TAG}/geojson`;
const RAW = join(DATA, 'raw', 'downloads', `natural-earth-${NE_TAG}`);
const OUT = join(DATA, 'geo', 'basemap');

/** Clip extent for regional layers: a margin around the map bounds. */
const CLIP: [number, number, number, number] = [30.5, 26.5, 40.5, 37.5];

const TILE_URL = 'https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png';
/** Must match TERRAIN_BOUNDS / TERRAIN_MAXZOOM in src/map/style.ts. */
const TILE_RANGES: { zooms: [number, number]; bbox: [number, number, number, number] }[] = [
  { zooms: [0, 10], bbox: [31.5, 27.8, 39.0, 34.8] },
];

const args = new Set(process.argv.slice(2));
const manifestPath = join(DATA, 'raw', 'manifest.json');

type Manifest = { note: string; entries: Record<string, { url: string; retrieved: string; sha256?: string; license: string; note?: string }> };

function loadManifest(): Manifest {
  return existsSync(manifestPath)
    ? readJson<Manifest>(manifestPath)
    : { note: 'Provenance of every raw input. Files themselves live in data/raw/downloads/ (not committed).', entries: {} };
}

async function ne(name: string, manifest: Manifest): Promise<FeatureCollection> {
  const url = `${NE_BASE}/${name}.geojson`;
  const buf = await download(url, join(RAW, `${name}.geojson`));
  manifest.entries[`natural-earth/${name}`] = {
    url,
    retrieved: manifest.entries[`natural-earth/${name}`]?.retrieved ?? new Date().toISOString().slice(0, 10),
    sha256: sha256(buf),
    license: 'Public domain (Natural Earth terms of use)',
  };
  return JSON.parse(buf.toString('utf8')) as FeatureCollection;
}

function bboxOf(g: Geometry): [number, number, number, number] {
  return turf.bbox(g) as [number, number, number, number];
}

function intersectsClip(g: Geometry): boolean {
  const [x0, y0, x1, y1] = bboxOf(g);
  return !(x1 < CLIP[0] || x0 > CLIP[2] || y1 < CLIP[1] || y0 > CLIP[3]);
}

/** Drop rings that rounding or clipping has collapsed below a valid polygon. */
function cleanArea(g: Polygon | MultiPolygon): Polygon | MultiPolygon | null {
  const fixRings = (rings: number[][][]) => rings.filter((r) => r.length >= 4 && new Set(r.map((p) => p.join(','))).size >= 3);
  if (g.type === 'Polygon') {
    const rings = fixRings(g.coordinates);
    return rings.length ? { type: 'Polygon', coordinates: rings } : null;
  }
  const polys = g.coordinates.map(fixRings).filter((p) => p.length > 0);
  return polys.length ? { type: 'MultiPolygon', coordinates: polys } : null;
}

function clipCollection(fc: FeatureCollection, keep: string[] = []): FeatureCollection {
  const out: Feature[] = [];
  const box = turf.bboxPolygon(CLIP);
  for (const f of fc.features) {
    if (!f.geometry || !intersectsClip(f.geometry)) continue;
    let geometry: Geometry | null = null;
    if (f.geometry.type === 'Polygon' || f.geometry.type === 'MultiPolygon') {
      // Proper polygon clipping (bboxClip can leave degenerate rings on polygons).
      const clipped = turf.intersect(turf.featureCollection([f as Feature<Polygon | MultiPolygon>, box]));
      geometry = clipped ? cleanArea(clipped.geometry) : null;
    } else {
      const clipped = turf.bboxClip(f as Feature<never>, CLIP);
      geometry = clipped.geometry && (clipped.geometry.coordinates as unknown[]).length ? clipped.geometry : null;
    }
    if (!geometry) continue;
    const props: Record<string, unknown> = {};
    for (const k of keep) if (f.properties && k in f.properties) props[k] = f.properties[k];
    out.push({ type: 'Feature', properties: props, geometry });
  }
  return { type: 'FeatureCollection', features: out };
}

function round(fc: FeatureCollection, digits = 4): FeatureCollection {
  const t = turf.truncate(fc, { precision: digits, coordinates: 2, mutate: false });
  for (const f of t.features) {
    if (f.geometry && (f.geometry.type === 'Polygon' || f.geometry.type === 'MultiPolygon')) {
      f.geometry = cleanArea(f.geometry) ?? f.geometry;
    }
  }
  return t;
}

async function buildVectors(manifest: Manifest) {
  mkdirSync(OUT, { recursive: true });
  const land = await ne('ne_10m_land', manifest);
  writeJson(join(OUT, 'land.geojson'), round(clipCollection(land)), true);

  const coast = await ne('ne_10m_coastline', manifest);
  writeJson(join(OUT, 'coastline.geojson'), round(clipCollection(coast)), true);

  const rivers = await ne('ne_10m_rivers_lake_centerlines', manifest);
  writeJson(join(OUT, 'rivers.geojson'), round(clipCollection(rivers, ['name', 'featurecla', 'scalerank'])), true);

  const lakes = await ne('ne_10m_lakes', manifest);
  writeJson(join(OUT, 'lakes.geojson'), round(clipCollection(lakes, ['name', 'featurecla'])), true);

  const world = await ne('ne_110m_land', manifest);
  writeJson(join(OUT, 'world-land-110m.geojson'), round(world, 3), true);
  console.log(`✓ basemap vectors → ${rel(OUT)}`);
}

/** Modern reference units, shapes only. Names are ours; Natural Earth's attributes are dropped. */
/** Arabic and Hebrew names of the modern units (machine drafts, marked as such where shown). */
const UNIT_NAMES: Record<string, [string, string]> = {
  'israel-1949': ["إسرائيل ضمن خطوط هدنة 1949", "ישראל בתוך קווי שביתת הנשק של 1949"],
  'west-bank': ["الضفة الغربية (من دون القدس الشرقية)", "הגדה המערבית (ללא מזרח ירושלים)"],
  'east-jerusalem': ["القدس الشرقية", "מזרח ירושלים"],
  'gaza-strip': ["قطاع غزة", "רצועת עזה"],
  'golan-heights': ["مرتفعات الجولان", "רמת הגולן"],
  'shebaa-farms': ["مزارع شبعا", "חוות שבעא (הר דב)"],
  'nml-latrun': ["المنطقة الحرام في اللطرون (1949–1967)", "שטח ההפקר בלטרון (1949–1967)"],
  'nml-jerusalem': ["المنطقة الحرام في القدس (1949–1967)", "שטח ההפקר בירושלים (1949–1967)"],
  'mount-scopus': ["جيب جبل المشارف (1949–1967)", "מובלעת הר הצופים (1949–1967)"],
  'undof-zone': ["منطقة الفصل التابعة للأمم المتحدة في الجولان (أندوف)، منذ 1974", "אזור ההפרדה של האו\"ם ברמת הגולן (UNDOF), מאז 1974"],
  'sinai-egypt': ["شبه جزيرة سيناء", "חצי האי סיני"],
  'transjordan': ["شرق الأردن / الأردن", "עבר הירדן / ירדן"],
  'lebanon': ["لبنان", "לבנון"],
  'syria': ["سوريا (الجزء الجنوبي، ضمن الخريطة)", "סוריה (החלק הדרומי שבתחום המפה)"],
};

async function buildModernUnits(manifest: Manifest) {
  const disputed = await ne('ne_10m_admin_0_disputed_areas', manifest);
  const countries = await ne('ne_10m_admin_0_countries', manifest);
  const byName = (fc: FeatureCollection, key: string, value: string) => {
    const f = fc.features.find((x) => x.properties?.[key] === value);
    if (!f) throw new Error(`Natural Earth feature not found: ${key}=${value}`);
    return f as Feature<Polygon | MultiPolygon>;
  };

  const units: { id: string; en: string; ne: string; feature: Feature<Polygon | MultiPolygon> }[] = [
    { id: 'israel-1949', en: 'Israel within the 1949 armistice lines', ne: 'Israel', feature: byName(disputed, 'BRK_NAME', 'Israel') },
    { id: 'west-bank', en: 'West Bank (excluding East Jerusalem)', ne: 'West Bank', feature: byName(disputed, 'BRK_NAME', 'West Bank') },
    { id: 'east-jerusalem', en: 'East Jerusalem', ne: 'East Jerusalem', feature: byName(disputed, 'BRK_NAME', 'East Jerusalem') },
    { id: 'gaza-strip', en: 'Gaza Strip', ne: 'Gaza', feature: byName(disputed, 'BRK_NAME', 'Gaza') },
    { id: 'golan-heights', en: 'Golan Heights', ne: 'Golan Heights', feature: byName(disputed, 'BRK_NAME', 'Golan Heights') },
    { id: 'shebaa-farms', en: 'Shebaa Farms', ne: 'Shebaa Farms', feature: byName(disputed, 'BRK_NAME', 'Shebaa Farms') },
    { id: 'nml-latrun', en: 'No-man’s land at Latrun (1949–67)', ne: "No Man's Land (Fort Latrun)", feature: byName(disputed, 'BRK_NAME', "No Man's Land (Fort Latrun)") },
    { id: 'nml-jerusalem', en: 'No-man’s land in Jerusalem (1949–67)', ne: "No Man's Land (Jerusalem)", feature: byName(disputed, 'BRK_NAME', "No Man's Land (Jerusalem)") },
    { id: 'mount-scopus', en: 'Mount Scopus enclave (1949–67)', ne: 'Mount Scopus', feature: byName(disputed, 'BRK_NAME', 'Mount Scopus') },
  ];

  units.push({ id: 'undof-zone', en: 'UN area of separation on the Golan (UNDOF), from 1974', ne: 'UNDOF Zone', feature: byName(disputed, 'BRK_NAME', 'UNDOF Zone') });
  const golan = units.find((u) => u.id === 'golan-heights')!.feature;
  const shebaa = units.find((u) => u.id === 'shebaa-farms')!.feature;
  const undof = byName(disputed, 'BRK_NAME', 'UNDOF Zone');

  // Sinai: Egypt east of the Suez Canal (a schematic line along the canal).
  const egypt = byName(countries, 'ADMIN', 'Egypt');
  const eastOfCanal = turf.polygon([[[32.33, 31.6], [32.33, 31.2], [32.3, 30.6], [32.56, 29.97], [32.4, 29.5], [32.6, 27.0], [35.5, 27.0], [35.5, 31.6], [32.33, 31.6]]]);
  const sinai = turf.intersect(turf.featureCollection([egypt, eastOfCanal]));
  if (sinai) units.push({ id: 'sinai-egypt', en: 'Sinai peninsula', ne: 'Egypt (clipped east of the Suez Canal)', feature: sinai });

  const jordan = byName(countries, 'ADMIN', 'Jordan');
  units.push({ id: 'transjordan', en: 'Transjordan / Jordan', ne: 'Jordan', feature: jordan });
  const lebanon = turf.difference(turf.featureCollection([byName(countries, 'ADMIN', 'Lebanon'), shebaa]));
  if (lebanon) units.push({ id: 'lebanon', en: 'Lebanon', ne: 'Lebanon (minus Shebaa Farms)', feature: lebanon });
  const syriaRaw = turf.intersect(turf.featureCollection([byName(countries, 'ADMIN', 'Syria'), turf.bboxPolygon(CLIP)]));
  const syria = syriaRaw ? turf.difference(turf.featureCollection([syriaRaw, golan, undof, shebaa])) : null;
  if (syria) units.push({ id: 'syria', en: 'Syria (southern part, map area)', ne: 'Syria (clipped; minus Golan Heights, UNDOF zone)', feature: syria });

  const fc: FeatureCollection = {
    type: 'FeatureCollection',
    features: units.map((u) => ({
      type: 'Feature',
      properties: { id: u.id, name_en: u.en, name_ar: UNIT_NAMES[u.id]?.[0], name_he: UNIT_NAMES[u.id]?.[1], derived_from: `Natural Earth ${NE_TAG}: ${u.ne}` },
      geometry: turf.truncate(u.feature, { precision: 5 }).geometry,
    })),
  };
  writeJson(join(DATA, 'geo', 'modern-units.geojson'), fc);
  console.log(`✓ ${units.length} modern units → data/geo/modern-units.geojson`);
}

function lon2x(lon: number, z: number) {
  return Math.floor(((lon + 180) / 360) * 2 ** z);
}
function lat2y(lat: number, z: number) {
  const r = (lat * Math.PI) / 180;
  return Math.floor(((1 - Math.log(Math.tan(r) + 1 / Math.cos(r)) / Math.PI) / 2) * 2 ** z);
}

async function buildTiles(manifest: Manifest) {
  const jobs: { z: number; x: number; y: number }[] = [];
  for (const r of TILE_RANGES) {
    for (let z = r.zooms[0]; z <= r.zooms[1]; z++) {
      const [x0, x1] = [lon2x(r.bbox[0], z), lon2x(r.bbox[2], z)];
      const [y0, y1] = [lat2y(r.bbox[3], z), lat2y(r.bbox[1], z)];
      for (let x = x0; x <= x1; x++) for (let y = y0; y <= y1; y++) jobs.push({ z, x, y });
    }
  }
  const dir = join(PUBLIC, 'tiles', 'terrain');
  let done = 0;
  let fetched = 0;
  const worker = async () => {
    for (;;) {
      const j = jobs.pop();
      if (!j) return;
      const dest = join(dir, String(j.z), String(j.x), `${j.y}.png`);
      if (!existsSync(dest)) {
        const url = TILE_URL.replace('{z}', String(j.z)).replace('{x}', String(j.x)).replace('{y}', String(j.y));
        for (let attempt = 1; ; attempt++) {
          try {
            const res = await fetch(url);
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            mkdirSync(join(dir, String(j.z), String(j.x)), { recursive: true });
            writeFileSync(dest, Buffer.from(await res.arrayBuffer()));
            fetched++;
            break;
          } catch (e) {
            if (attempt >= 3) throw new Error(`Tile ${j.z}/${j.x}/${j.y} failed: ${String(e)}`);
          }
        }
      }
      done++;
    }
  };
  const total = jobs.length;
  await Promise.all(Array.from({ length: 8 }, worker));
  manifest.entries['terrain-tiles'] = {
    url: TILE_URL,
    retrieved: new Date().toISOString().slice(0, 10),
    license: 'Built from SRTM, GMTED2010 and ETOPO1 for this region (US-government public domain). Credit: USGS, NOAA.',
    note: `zooms/bboxes: ${JSON.stringify(TILE_RANGES)}; ${total} tiles`,
  };
  console.log(`✓ terrain tiles: ${done} total, ${fetched} downloaded → ${rel(dir)}`);
}

async function main() {
  const manifest = loadManifest();
  if (!args.has('--tiles-only')) {
    await buildVectors(manifest);
    await buildModernUnits(manifest);
  }
  if (!args.has('--no-tiles')) await buildTiles(manifest);
  writeJson(manifestPath, manifest);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

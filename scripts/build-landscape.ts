/**
 * npm run build-landscape
 *
 * Models past shorelines and Dead Sea extents from the elevation tiles
 * (SRTM on land, ETOPO1 offshore; US-government public domain):
 *   - Mediterranean: land that would be exposed if the sea stood L metres
 *     below today's level, for L = -60 … -1 m. The map shows the polygon for
 *     the sea level documented for each period (data/landscape.json).
 *   - Dead Sea: area below level L inside the Dead Sea basin, for levels
 *     between -440 and -160 m. Below about -411 m the elevation model shows
 *     the lake surface measured in 2000, not the lake bed, so lower levels
 *     cannot be modelled from it; those dates use today's Natural Earth outline.
 *
 * Outputs (committed): data/geo/landscape/shorelines.geojson, dead-sea-extents.geojson
 * This is a model: offshore depths come from ETOPO1 (about 1.8 km grid), so
 * past coastlines are schematic.
 */
import * as turf from '@turf/turf';
import { contours } from 'd3-contour';
import type { Feature, FeatureCollection, MultiPolygon, Polygon } from 'geojson';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { PNG } from 'pngjs';
import { DATA, PUBLIC, readJson, writeJson } from './lib/io';
import { land } from './lib/geo';

const Z = 10;
const TILE = 256;

function lon2x(lon: number) {
  return ((lon + 180) / 360) * 2 ** Z;
}
function lat2y(lat: number) {
  const r = (lat * Math.PI) / 180;
  return ((1 - Math.log(Math.tan(r) + 1 / Math.cos(r)) / Math.PI) / 2) * 2 ** Z;
}
function x2lon(x: number) {
  return (x / 2 ** Z) * 360 - 180;
}
function y2lat(y: number) {
  const n = Math.PI * (1 - (2 * y) / 2 ** Z);
  return (Math.atan(Math.sinh(n)) * 180) / Math.PI;
}

/** Elevation grid (metres) for a lon/lat box, from terrarium tiles. */
function grid(box: [number, number, number, number]) {
  const [x0, x1] = [Math.floor(lon2x(box[0])), Math.floor(lon2x(box[2]))];
  const [y0, y1] = [Math.floor(lat2y(box[3])), Math.floor(lat2y(box[1]))];
  const w = (x1 - x0 + 1) * TILE;
  const h = (y1 - y0 + 1) * TILE;
  const values = new Float64Array(w * h);
  for (let tx = x0; tx <= x1; tx++) {
    for (let ty = y0; ty <= y1; ty++) {
      const f = join(PUBLIC, 'tiles', 'terrain', String(Z), String(tx), `${ty}.png`);
      if (!existsSync(f)) throw new Error(`Missing elevation tile ${f}; run "npm run build-basemap" first`);
      const png = PNG.sync.read(readFileSync(f));
      for (let py = 0; py < TILE; py++) {
        for (let px = 0; px < TILE; px++) {
          const i = (py * TILE + px) * 4;
          const elev = png.data[i]! * 256 + png.data[i + 1]! + png.data[i + 2]! / 256 - 32768;
          const gx = (tx - x0) * TILE + px;
          const gy = (ty - y0) * TILE + py;
          values[gy * w + gx] = elev;
        }
      }
    }
  }
  const toLonLat = ([gx, gy]: number[]): [number, number] => [
    Math.round(x2lon(x0 + gx! / TILE) * 1e4) / 1e4,
    Math.round(y2lat(y0 + gy! / TILE) * 1e4) / 1e4,
  ];
  return { values, w, h, toLonLat };
}

/** Convert a d3 contour to lon/lat, dropping rings that rounding collapses below a valid polygon. */
function toGeo(mp: { coordinates: number[][][][] }, toLonLat: (p: number[]) => [number, number]): Feature<MultiPolygon> | null {
  const fixRing = (ring: number[][]) => {
    const pts = ring.map(toLonLat).filter((p, i, a) => i === 0 || p[0] !== a[i - 1]![0] || p[1] !== a[i - 1]![1]);
    if (pts.length && (pts[0]![0] !== pts[pts.length - 1]![0] || pts[0]![1] !== pts[pts.length - 1]![1])) pts.push(pts[0]!);
    return pts;
  };
  const coords = mp.coordinates
    .map((poly) => poly.map(fixRing).filter((r) => r.length >= 4))
    .filter((poly) => poly.length > 0 && poly[0]!.length >= 4);
  if (!coords.length) return null;
  return turf.multiPolygon(coords);
}

function largestPart(f: Feature<MultiPolygon | Polygon>): Feature<Polygon> {
  const polys = f.geometry.type === 'Polygon' ? [f.geometry.coordinates] : f.geometry.coordinates;
  let best = polys[0]!;
  let bestA = -1;
  for (const p of polys) {
    const a = turf.area(turf.polygon(p));
    if (a > bestA) {
      bestA = a;
      best = p;
    }
  }
  return turf.polygon(best);
}

/** Simplify, falling back to the original if simplification collapses a small ring. */
function safeSimplify<T extends Feature<Polygon | MultiPolygon>>(f: T, tolerance: number): T {
  try {
    return turf.simplify(f, { tolerance, highQuality: false }) as T;
  } catch {
    return f;
  }
}

// ---------------------------------------------------------------- Mediterranean shorelines

const COAST_BOX: [number, number, number, number] = [32.2, 30.85, 35.12, 34.35];
const SEA_LEVELS = [-60, -50, -45, -40, -35, -30, -25, -20, -15, -10, -8, -6, -4, -2, -1];

function shorelines(): FeatureCollection {
  const g = grid(COAST_BOX);
  const landNow = land();
  const box = turf.bboxPolygon(COAST_BOX);
  const out: Feature[] = [];
  for (const level of SEA_LEVELS) {
    const [c] = contours().size([g.w, g.h]).thresholds([level])(Array.from(g.values));
    if (!c) continue;
    const geo = toGeo(c as unknown as { coordinates: number[][][][] }, g.toLonLat);
    if (!geo) continue;
    // Land at this sea level, minus today's land = the strip that was dry then and is sea now.
    const inBox = turf.intersect(turf.featureCollection<Polygon | MultiPolygon>([geo, box]));
    if (!inBox) continue;
    const exposed = turf.difference(turf.featureCollection<Polygon | MultiPolygon>([inBox as Feature<Polygon | MultiPolygon>, landNow]));
    if (!exposed) continue;
    const simple = safeSimplify(exposed, 0.004);
    // Drop slivers (rounding noise along today's coast).
    const parts = (simple.geometry.type === 'Polygon' ? [simple.geometry.coordinates] : simple.geometry.coordinates).filter(
      (p) => turf.area(turf.polygon(p)) > 2e6,
    );
    if (!parts.length) continue;
    out.push({ type: 'Feature', properties: { level_m: level }, geometry: { type: 'MultiPolygon', coordinates: parts } });
  }
  return { type: 'FeatureCollection', features: out };
}

// ---------------------------------------------------------------- Dead Sea extents

const DS_BOX: [number, number, number, number] = [35.3, 30.95, 35.72, 31.95];
/** The 2000 SRTM survey measured the lake surface at about this level; the model cannot go lower. */
const SRTM_SURFACE = -412;
const DS_LEVELS = [-160, -180, -200, -250, -300, -340, -360, -370, -380, -390, -395, -400, -405, -410];

function deadSea(): FeatureCollection {
  const g = grid(DS_BOX);
  // Area below level L = contour of (-elevation) at threshold -L.
  const neg = Array.from(g.values, (v) => -v);
  const out: Feature[] = [];
  for (const level of DS_LEVELS) {
    const [c] = contours().size([g.w, g.h]).thresholds([-level])(neg);
    if (!c) continue;
    const geo = toGeo(c as unknown as { coordinates: number[][][][] }, g.toLonLat);
    if (!geo) continue;
    // The lake's outer edge only: islands and noise inside are dropped.
    const outer = turf.polygon([largestPart(geo).geometry.coordinates[0]!]);
    const lake = safeSimplify(outer, 0.002);
    out.push({ type: 'Feature', properties: { level_m: level, method: 'elevation-model' }, geometry: lake.geometry });
  }
  // Below the 2000 surface: today's outline from Natural Earth (undated, recent).
  const lakes = readJson<FeatureCollection<Polygon | MultiPolygon>>(join(DATA, 'geo', 'basemap', 'lakes.geojson'));
  const ne = lakes.features.filter((f) => f.properties?.name === 'Dead Sea');
  const merged = ne.length > 1 ? turf.union(turf.featureCollection(ne)) : ne[0];
  if (merged) out.push({ type: 'Feature', properties: { level_m: SRTM_SURFACE - 1, method: 'natural-earth-modern-outline' }, geometry: merged.geometry });
  return { type: 'FeatureCollection', features: out };
}

const s = shorelines();
writeJson(join(DATA, 'geo', 'landscape', 'shorelines.geojson'), turf.truncate(s, { precision: 4 }), true);
const d = deadSea();
writeJson(join(DATA, 'geo', 'landscape', 'dead-sea-extents.geojson'), turf.truncate(d, { precision: 4 }), true);
console.log(`✓ ${s.features.length} shoreline levels, ${d.features.length} Dead Sea extents → data/geo/landscape/`);

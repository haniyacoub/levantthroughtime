import * as turf from '@turf/turf';
import type { Feature, FeatureCollection, MultiPolygon, Polygon } from 'geojson';
import { join } from 'node:path';
import { DATA, readJson } from './io';

export type Area = Feature<Polygon | MultiPolygon>;

export interface UnitsData {
  landmarks: { id: string; lon: number; lat: number; label?: string; note?: string }[];
  units: { id: string; name: { en: string }; description: string; ring: string[] }[];
}

let landCache: Area | null = null;
let lakesCache: Area[] | null = null;

/** Natural Earth land for the map area, merged into one shape. */
export function land(): Area {
  if (!landCache) {
    const fc = readJson<FeatureCollection<Polygon | MultiPolygon>>(join(DATA, 'geo', 'basemap', 'land.geojson'));
    const merged = fc.features.length > 1 ? turf.union(turf.featureCollection(fc.features)) : fc.features[0];
    if (!merged) throw new Error('No land polygons in data/geo/basemap/land.geojson');
    landCache = merged as Area;
  }
  return landCache;
}

/** Lakes cut out of units (modern Natural Earth outlines; see PLAN §7.1). */
export function lakes(): Area[] {
  if (!lakesCache) {
    const fc = readJson<FeatureCollection<Polygon | MultiPolygon>>(join(DATA, 'geo', 'basemap', 'lakes.geojson'));
    lakesCache = fc.features.filter((f) => ['Sea of Galilee', 'Dead Sea'].includes(String(f.properties?.name))) as Area[];
  }
  return lakesCache;
}

export interface BuiltUnits {
  units: Map<string, Area>;
  problems: string[];
}

/** Build unit polygons from landmark rings, clipped to land with lakes removed. */
export function buildUnits(data: UnitsData): BuiltUnits {
  const lm = new Map(data.landmarks.map((l) => [l.id, l]));
  const problems: string[] = [];
  const units = new Map<string, Area>();
  const landArea = land();
  const lakeAreas = lakes();

  for (const u of data.units) {
    const coords: [number, number][] = [];
    for (const id of u.ring) {
      const p = lm.get(id);
      if (!p) {
        problems.push(`unit "${u.id}": unknown landmark "${id}"`);
        continue;
      }
      coords.push([p.lon, p.lat]);
    }
    if (coords.length < 3) continue;
    coords.push(coords[0]!);
    let poly: Area = turf.polygon([coords], { id: u.id });
    if (turf.kinks(poly).features.length > 0) problems.push(`unit "${u.id}": its ring crosses itself — check the landmark order`);
    // Rings may be wound either way; turf handles both.
    const clipped = turf.intersect(turf.featureCollection([poly, landArea]));
    if (!clipped) {
      problems.push(`unit "${u.id}": no land inside its ring`);
      continue;
    }
    poly = clipped as Area;
    for (const lake of lakeAreas) {
      const d = turf.difference(turf.featureCollection([poly, lake]));
      if (d) poly = d as Area;
    }
    poly.properties = { id: u.id };
    units.set(u.id, poly);
  }

  // Overlap check: pairs of units should only touch along shared edges.
  const list = [...units.entries()];
  for (let i = 0; i < list.length; i++) {
    for (let j = i + 1; j < list.length; j++) {
      const [a, pa] = list[i]!;
      const [b, pb] = list[j]!;
      if (!turf.booleanIntersects(turf.bboxPolygon(turf.bbox(pa)), turf.bboxPolygon(turf.bbox(pb)))) continue;
      const inter = turf.intersect(turf.featureCollection([pa, pb]));
      if (inter) {
        const km2 = turf.area(inter) / 1e6;
        if (km2 > 1) problems.push(`units "${a}" and "${b}" overlap by ${km2.toFixed(1)} km²`);
      }
    }
  }
  return { units, problems };
}

/** Union a list of unit shapes into one territory shape. */
export function unionOf(shapes: Area[]): Area | null {
  if (shapes.length === 0) return null;
  if (shapes.length === 1) return turf.clone(shapes[0]!);
  return turf.union(turf.featureCollection(shapes)) as Area | null;
}

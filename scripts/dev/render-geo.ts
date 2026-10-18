/**
 * Developer tool: renders built units (or territory shapes) to a PNG for a quick visual check.
 *   npx tsx scripts/dev/render-geo.ts <out.png> [geojson-file]
 */
import * as turf from '@turf/turf';
import type { Feature, FeatureCollection, Polygon, MultiPolygon } from 'geojson';
import { chromium } from '@playwright/test';
import { join } from 'node:path';
import { DATA, readJson } from '../lib/io';
import { buildUnits, type UnitsData } from '../lib/geo';

const out = process.argv[2] ?? 'units.png';
const extra = process.argv[3];
const [X0, Y0, X1, Y1] = [32.2, 28.9, 38.3, 34.4];
const W = 1100;
const k = Math.cos((31.5 * Math.PI) / 180);
const H = Math.round((W * (Y1 - Y0)) / ((X1 - X0) * k));
const px = (lon: number) => ((lon - X0) / (X1 - X0)) * W;
const py = (lat: number) => ((Y1 - lat) / (Y1 - Y0)) * H;
const pathOf = (g: Polygon | MultiPolygon) => {
  const polys = g.type === 'Polygon' ? [g.coordinates] : g.coordinates;
  return polys.map((rings) => rings.map((r) => 'M' + r.map(([x, y]) => `${px(x!).toFixed(1)},${py(y!).toFixed(1)}`).join('L') + 'Z').join('')).join('');
};
const colors = ['#CC6677', '#332288', '#DDCC77', '#117733', '#88CCEE', '#882255', '#44AA99', '#999933', '#AA4499', '#77AADD', '#EE8866', '#EEDD88', '#FFAABB', '#99DDFF', '#44BB99', '#BBCC33'];

const unitsData = readJson<UnitsData>(join(DATA, 'geo', 'units.json'));
const { units, problems } = buildUnits(unitsData);
problems.forEach((p) => console.log('problem:', p));
let feats: Feature<Polygon | MultiPolygon>[] = [...units.values()];
if (extra) feats = readJson<FeatureCollection<Polygon | MultiPolygon>>(extra).features.filter((f) => f.geometry);
const land = readJson<FeatureCollection<Polygon | MultiPolygon>>(join(DATA, 'geo', 'basemap', 'land.geojson'));
let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" style="background:#dfe9ee">`;
for (const f of land.features) svg += `<path d="${pathOf(f.geometry)}" fill="#f4f1ea" stroke="#999" stroke-width="0.5"/>`;
feats.forEach((f, i) => {
  svg += `<path d="${pathOf(f.geometry)}" fill="${colors[i % colors.length]}" fill-opacity="0.55" stroke="#222" stroke-width="0.8"/>`;
});
feats.forEach((f) => {
  const c = turf.pointOnFeature(f).geometry.coordinates;
  const label = String(f.properties?.id ?? f.properties?.polity ?? '');
  svg += `<text x="${px(c[0]!)}" y="${py(c[1]!)}" font-size="11" font-family="sans-serif" text-anchor="middle" fill="#000">${label}</text>`;
});
svg += '</svg>';
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: W, height: H } });
await page.setContent(`<html><body style="margin:0">${svg}</body></html>`);
await page.screenshot({ path: out });
await browser.close();
console.log(`wrote ${out} (${feats.length} shapes)`);

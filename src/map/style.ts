import type { StyleSpecification, LayerSpecification, FilterSpecification } from 'maplibre-gl';
import type { FeatureCollection } from 'geojson';
import { baseUrl } from '../data/model';

/** Must match TILE_RANGES in scripts/build-basemap.ts. */
export const TERRAIN_BOUNDS: [number, number, number, number] = [31.5, 27.8, 39.0, 34.8];
export const TERRAIN_MAXZOOM = 10;

export const COLORS = {
  sea: '#d6e3ea',
  land: '#f3efe6',
  river: '#7fa3b8',
  coast: '#8ea3ae',
  label: '#1f2328',
  halo: '#fbfaf7',
};

const empty = (): FeatureCollection => ({ type: 'FeatureCollection', features: [] });

/** Territory layers come in two copies (a/b) so one state can fade into the next. */
export const TERRITORY_SLOTS = ['a', 'b'] as const;
export type Slot = (typeof TERRITORY_SLOTS)[number];

/** Each territory layer and the opacity it has when fully shown. */
export function territoryLayerOpacities(slot: Slot): { id: string; prop: 'fill-opacity' | 'line-opacity'; value: number }[] {
  return [
    { id: `terr-${slot}-fill-overlord`, prop: 'fill-opacity', value: 0.27 },
    { id: `terr-${slot}-fill`, prop: 'fill-opacity', value: 0.42 },
    { id: `terr-${slot}-fill-schematic`, prop: 'fill-opacity', value: 0.3 },
    { id: `terr-${slot}-fill-partial`, prop: 'fill-opacity', value: 0.14 },
    { id: `terr-${slot}-hatch`, prop: 'fill-opacity', value: 0.55 },
    { id: `terr-${slot}-halo`, prop: 'line-opacity', value: 0.75 },
    { id: `terr-${slot}-line-solid`, prop: 'line-opacity', value: 0.9 },
    { id: `terr-${slot}-line-dashed`, prop: 'line-opacity', value: 0.9 },
    { id: `terr-${slot}-line-schematic-glow`, prop: 'line-opacity', value: 0.35 },
    { id: `terr-${slot}-line-schematic`, prop: 'line-opacity', value: 0.85 },
    { id: `terr-${slot}-claim`, prop: 'line-opacity', value: 0.95 },
  ];
}

function territoryLayers(slot: Slot): LayerSpecification[] {
  const src = `terr-${slot}`;
  // Claims (areas claimed but not governed) are drawn as an outline only.
  const notPartial: FilterSpecification = ['all', ['!=', ['get', 'partial'], true], ['!=', ['get', 'claim'], true]];
  // Overlords (top-level powers with subject units drawn on top of them) are drawn paler.
  const isOverlord: FilterSpecification = ['==', ['get', 'overlord'], true];
  const cert = (c: string[]): FilterSpecification => ['all', notPartial, ['!', isOverlord], ['in', ['get', 'certainty'], ['literal', c]]];
  const lineCert = (c: string[]): FilterSpecification => ['all', notPartial, ['in', ['get', 'certainty'], ['literal', c]]];
  const op = Object.fromEntries(territoryLayerOpacities(slot).map((l) => [l.id, 0]));
  return [
    { id: `terr-${slot}-fill-overlord`, type: 'fill', source: src, filter: ['all', notPartial, isOverlord], paint: { 'fill-color': ['get', 'color'], 'fill-opacity': op[`terr-${slot}-fill-overlord`] } },
    { id: `terr-${slot}-fill`, type: 'fill', source: src, filter: cert(['surveyed', 'approximate', 'contested']), layout: { 'fill-sort-key': ['get', 'depth'] }, paint: { 'fill-color': ['get', 'color'], 'fill-opacity': op[`terr-${slot}-fill`] } },
    { id: `terr-${slot}-fill-schematic`, type: 'fill', source: src, filter: cert(['schematic']), layout: { 'fill-sort-key': ['get', 'depth'] }, paint: { 'fill-color': ['get', 'color'], 'fill-opacity': op[`terr-${slot}-fill-schematic`] } },
    { id: `terr-${slot}-fill-partial`, type: 'fill', source: src, filter: ['==', ['get', 'partial'], true], paint: { 'fill-color': ['get', 'color'], 'fill-opacity': op[`terr-${slot}-fill-partial`] } },
    { id: `terr-${slot}-hatch`, type: 'fill', source: src, filter: ['all', ['!=', ['get', 'claim'], true], ['any', ['==', ['get', 'certainty'], 'contested'], ['==', ['get', 'confidence'], 'contested']]], paint: { 'fill-pattern': 'hatch', 'fill-opacity': op[`terr-${slot}-hatch`] } },
    { id: `terr-${slot}-halo`, type: 'line', source: src, filter: ['all', notPartial, ['has', 'overlord_color']], paint: { 'line-color': ['get', 'overlord_color'], 'line-width': 5, 'line-blur': 1.5, 'line-opacity': op[`terr-${slot}-halo`] } },
    { id: `terr-${slot}-line-solid`, type: 'line', source: src, filter: lineCert(['surveyed']), paint: { 'line-color': ['get', 'color'], 'line-width': 1.4, 'line-opacity': op[`terr-${slot}-line-solid`] } },
    { id: `terr-${slot}-line-dashed`, type: 'line', source: src, filter: lineCert(['approximate', 'contested']), paint: { 'line-color': ['get', 'color'], 'line-width': 1.4, 'line-dasharray': [4, 2], 'line-opacity': op[`terr-${slot}-line-dashed`] } },
    { id: `terr-${slot}-line-schematic-glow`, type: 'line', source: src, filter: lineCert(['schematic']), paint: { 'line-color': ['get', 'color'], 'line-width': 7, 'line-blur': 6, 'line-opacity': op[`terr-${slot}-line-schematic-glow`] } },
    { id: `terr-${slot}-line-schematic`, type: 'line', source: src, filter: lineCert(['schematic']), layout: { 'line-cap': 'round' }, paint: { 'line-color': ['get', 'color'], 'line-width': 1.2, 'line-dasharray': [0.1, 2.2], 'line-opacity': op[`terr-${slot}-line-schematic`] } },
    { id: `terr-${slot}-claim`, type: 'line', source: src, filter: ['==', ['get', 'claim'], true], paint: { 'line-color': ['get', 'color'], 'line-width': 2.5, 'line-dasharray': [3, 1.5], 'line-opacity': op[`terr-${slot}-claim`] } },
  ];
}

export function buildStyle(fontFaces: Record<string, { url: string; 'unicode-range': string[] }[]>): StyleSpecification {
  const base = baseUrl();
  const origin = window.location.origin;
  const data = (f: string) => `${origin}${base}data/basemap/${f}`;
  const faces = Object.fromEntries(
    Object.entries(fontFaces).map(([name, list]) => [name, list.map((f) => ({ ...f, url: `${origin}${base}${f.url}` }))]),
  );
  return {
    version: 8,
    'font-faces': faces,
    sources: {
      land: { type: 'geojson', data: data('land.geojson') },
      lakes: { type: 'geojson', data: data('lakes.geojson') },
      rivers: { type: 'geojson', data: data('rivers.geojson') },
      coast: { type: 'geojson', data: data('coastline.geojson') },
      dem: {
        type: 'raster-dem',
        tiles: [`${origin}${base}tiles/terrain/{z}/{x}/{y}.png`],
        encoding: 'terrarium',
        tileSize: 256,
        maxzoom: TERRAIN_MAXZOOM,
        bounds: TERRAIN_BOUNDS,
        attribution: '',
      },
      'terr-a': { type: 'geojson', data: empty() },
      'terr-b': { type: 'geojson', data: empty() },
      labels: { type: 'geojson', data: empty() },
    },
    layers: [
      { id: 'sea', type: 'background', paint: { 'background-color': COLORS.sea } },
      { id: 'land', type: 'fill', source: 'land', paint: { 'fill-color': COLORS.land } },
      {
        id: 'hillshade',
        type: 'hillshade',
        source: 'dem',
        paint: {
          'hillshade-shadow-color': '#5b5246',
          'hillshade-highlight-color': '#ffffff',
          'hillshade-accent-color': '#776c5c',
          'hillshade-exaggeration': 0.32,
        },
      },
      { id: 'lakes', type: 'fill', source: 'lakes', filter: ['in', ['get', 'name'], ['literal', ['Sea of Galilee', 'Dead Sea']]], paint: { 'fill-color': COLORS.sea } },
      ...territoryLayers('a'),
      ...territoryLayers('b'),
      { id: 'rivers', type: 'line', source: 'rivers', paint: { 'line-color': COLORS.river, 'line-width': ['interpolate', ['linear'], ['zoom'], 5, 0.6, 10, 1.6] } },
      { id: 'coast', type: 'line', source: 'coast', paint: { 'line-color': COLORS.coast, 'line-width': 0.8 } },
      {
        id: 'labels',
        type: 'symbol',
        source: 'labels',
        layout: {
          'text-field': ['get', 'name'],
          'text-font': ['Noto Sans Regular'],
          'text-size': ['interpolate', ['linear'], ['zoom'], 5, ['case', ['==', ['get', 'overlord'], true], 9.5, 11], 9, ['case', ['==', ['get', 'overlord'], true], 12, 15]],
          'text-max-width': 9,
          'symbol-sort-key': ['get', 'sort'],
          'text-padding': 3,
          'text-variable-anchor': ['center', 'top', 'bottom', 'left', 'right'],
          'text-radial-offset': 0.4,
        },
        paint: { 'text-color': ['case', ['==', ['get', 'overlord'], true], '#5d6670', COLORS.label], 'text-halo-color': COLORS.halo, 'text-halo-width': 1.6 },
      },
    ],
  };
}

/** Diagonal hatching used for contested extents. */
export function hatchImage(): { width: number; height: number; data: Uint8ClampedArray } {
  const size = 12;
  const data = new Uint8ClampedArray(size * size * 4);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const on = (x + y) % 6 === 0 || (x + y + 1) % 6 === 0 ? 1 : 0;
      const i = (y * size + x) * 4;
      data[i] = 40;
      data[i + 1] = 40;
      data[i + 2] = 40;
      data[i + 3] = on ? 150 : 0;
    }
  }
  return { width: size, height: size, data };
}

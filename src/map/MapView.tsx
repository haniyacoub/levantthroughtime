import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AttributionControl, Map as MLMap, NavigationControl, type GeoJSONSource, type MapStyleImageMissingEvent } from './maplibre';
import 'maplibre-gl/dist/maplibre-gl.css';
import type { Feature, FeatureCollection, Geometry } from 'geojson';
import { baseUrl, depthAt, relationsAt, type AppData, type Polity } from '../data/model';
import { loc } from '../i18n/localize';
import { placeLabelAt, placeVisibleAt } from '../data/places';
import { useStore } from '../state/store';
import { startT } from '../time/years';
import type { Lang } from '../time/format';
import { buildStyle, hatchImage, territoryLayerOpacities, TERRAIN_BOUNDS, type Slot } from './style';
import { deadSeaLevelAt, levelValue, nearestLevel, seaLevelAt } from '../data/landscape';
import { activeAt, type ModernLayer } from '../data/model';
import type { FlowOverlay } from './flows';
import { LayerControl } from './LayerControl';
import { lazy, Suspense } from 'react';

const DiasporaInset = lazy(() => import('../inset/DiasporaInset').then((m) => ({ default: m.DiasporaInset })));
import type { LayerKey } from '../state/store';

/** Map layers controlled by each layer switch. */
const LAYER_GROUPS: Record<LayerKey, string[]> = {
  territories: territoryLayerOpacities('a').map((l) => l.id).concat(territoryLayerOpacities('b').map((l) => l.id), ['labels']),
  places: ['places-circle', 'places-label'],
  holy: [],
  conflicts: ['conflicts-pulse', 'conflicts-dot'],
  migrations: [],
  landscape: ['shoreline', 'shoreline-edge'],
  routes: ['routes', 'routes-label'],
  modern: [],
};

interface ShapeProps {
  id: string;
  kind: 'territory' | 'culture-zone';
  owner: string;
  t0: number;
  t1: number | null;
  certainty: string;
  confidence: string;
  partial: boolean;
}

type Shapes = FeatureCollection<Geometry, ShapeProps>;

const FADE_MS = 450;

/** Fetches the generated geometry once. */
type LevelShapes = FeatureCollection<Geometry, { level_m: number; method?: string }>;

async function loadShapes(): Promise<{
  shapes: Shapes;
  labels: Shapes;
  fontFaces: Record<string, { url: string; 'unicode-range': string[] }[]>;
  shorelines: LevelShapes;
  deadSea: LevelShapes;
}> {
  const get = async (f: string) => {
    const r = await fetch(`${baseUrl()}data/${f}`);
    if (!r.ok) throw new Error(`${f}: HTTP ${r.status}`);
    return r.json();
  };
  const [shapes, labels, fontFaces, shorelines, deadSea] = await Promise.all([
    get('territories.geojson'),
    get('labels.geojson'),
    get('font-faces.json'),
    get('landscape/shorelines.geojson'),
    get('landscape/dead-sea-extents.geojson'),
  ]);
  return { shapes, labels, fontFaces, shorelines, deadSea };
}

/** The shapes and labels visible at time t, with display properties attached. */
export function visibleAt(data: AppData, shapes: Shapes, labels: Shapes, t: number, lang: Lang) {
  // Cultures and polities are both drawn whenever active: e.g. the Early Bronze urban
  // culture (a culture record) continues after the first polities appear.
  const polities = new Map<string, Polity>(data.polities.map((p) => [p.id, p]));
  const cultures = new Map(data.cultures.map((c) => [c.id, c]));
  const active = (p: ShapeProps) => p.t0 <= t + 1e-9 && (p.t1 === null || t < p.t1 - 1e-9);

  const decorate = (f: Feature<Geometry, ShapeProps>) => {
    const owner = f.properties.owner;
    const pol = polities.get(owner);
    const cul = cultures.get(owner);
    const depth = pol ? depthAt(owner, polities, t) : 0;
    const rel = pol ? relationsAt(pol, t)[0] : undefined;
    const overlord = rel ? polities.get(rel.overlord) : undefined;
    const props: Record<string, unknown> = {
      ...f.properties,
      color: pol?.color ?? cul?.color ?? '#888888',
      name: loc(pol?.name ?? cul?.name, lang),
      depth,
      sort: -depth,
    };
    if (overlord) props.overlord_color = overlord.color;
    return { ...f, properties: props };
  };

  // Consecutive slices of one polity share their boundary year (end dates are inclusive);
  // show only the newest slice of each owner at any moment.
  const newest = new Map<string, number>();
  for (const f of shapes.features) {
    const p = f.properties;
    if (active(p)) newest.set(p.owner, Math.max(newest.get(p.owner) ?? -Infinity, p.t0));
  }
  const current = (p: ShapeProps) => active(p) && p.t0 === newest.get(p.owner);
  const vis = shapes.features.filter((f) => current(f.properties)).map(decorate);
  // A polity is drawn as an "overlord" (paler) when some subject of it is on the map now.
  const overlords = new Set<string>();
  for (const f of vis) {
    const pol = polities.get(f.properties.owner as string);
    const rel = pol ? relationsAt(pol, t)[0] : undefined;
    if (rel) overlords.add(rel.overlord);
  }
  for (const f of vis) if (overlords.has(f.properties.owner as string)) f.properties.overlord = true;
  vis.sort((a, b) => (a.properties.depth as number) - (b.properties.depth as number));
  const lab = labels.features.filter((f) => current(f.properties)).map((f) => {
    const d = decorate(f);
    // Label priority: subject units first, then larger areas (lower sort key = placed first).
    d.properties.sort = -(d.properties.depth as number) * 1e7 - ((f.properties as ShapeProps & { area?: number }).area ?? 0);
    // Overlords' labels are drawn smaller and grey, and placed last.
    if (overlords.has(f.properties.owner)) {
      d.properties.overlord = true;
      d.properties.sort = 1e9;
    }
    return d;
  });
  return { shapes: vis, labels: lab };
}

export function MapView({ data, t, lang, controls = true, onMap }: { data: AppData; t: number; lang: Lang; controls?: boolean; onMap?: (m: MLMap) => void }) {
  const { t: tr } = useTranslation();
  const { namesMode, setNamesMode, placeId, layers, modernOff } = useStore();
  const container = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MLMap | null>(null);
  const geo = useRef<{ shapes: Shapes; labels: Shapes; shorelines: LevelShapes; deadSea: LevelShapes } | null>(null);
  const flows = useRef<FlowOverlay | null>(null);
  const pulseRaf = useRef(0);
  const attribution = useRef<AttributionControl | null>(null);
  const slot = useRef<Slot>('a');
  const lastKey = useRef('');
  const fadeRaf = useRef(0);
  const [ready, setReady] = useState(false);
  const [flowsReady, setFlowsReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    loadShapes()
      .then(({ shapes, labels, fontFaces, shorelines, deadSea }) => {
        if (cancelled || !container.current) return;
        geo.current = { shapes, labels, shorelines, deadSea };
        const cfg = data.config.map;
        const map = new MLMap({
          container: container.current,
          style: buildStyle(fontFaces),
          center: cfg.initial.center,
          zoom: cfg.initial.zoom,
          minZoom: 5,
          maxZoom: 12,
          maxBounds: [
            [TERRAIN_BOUNDS[0], TERRAIN_BOUNDS[1]],
            [TERRAIN_BOUNDS[2], TERRAIN_BOUNDS[3]],
          ],
          attributionControl: false,
          dragRotate: false,
          pitchWithRotate: false,
        });
        map.touchZoomRotate.disableRotation();
        map.addControl(new NavigationControl({ showCompass: false }), 'top-left');
        attribution.current = new AttributionControl({ compact: true, customAttribution: tr('attribution') });
        map.addControl(attribution.current);
        map.on('styleimagemissing', (e: MapStyleImageMissingEvent) => {
          if (e.id === 'hatch' && !map.hasImage('hatch')) map.addImage('hatch', hatchImage());
        });
        map.on('load', () => {
          if (!map.hasImage('hatch')) map.addImage('hatch', hatchImage());
          map.on('click', 'places-circle', (e) => {
            const id = e.features?.[0]?.properties?.id;
            if (typeof id === 'string') useStore.getState().setPlace(id);
          });
          map.on('mouseenter', 'places-circle', () => (map.getCanvas().style.cursor = 'pointer'));
          map.on('mouseleave', 'places-circle', () => (map.getCanvas().style.cursor = ''));
          addModernLayers(map, data);
          // deck.gl (migration flows) is loaded only after the map is up.
          void import('./flows').then(({ FlowOverlay: FO }) => {
            if (cancelled) return;
            const fo = new FO();
            fo.attach(map);
            flows.current = fo;
            setFlowsReady(true);
          });
          mapRef.current = map;
          onMap?.(map);
          setReady(true);
        });
      })
      .catch((e: Error) => setError(e.message));
    return () => {
      cancelled = true;
      cancelAnimationFrame(fadeRaf.current);
      cancelAnimationFrame(pulseRaf.current);
      flows.current?.destroy();
      mapRef.current?.remove();
      mapRef.current = null;
    };
    // The map is created once; data and translations are read at creation.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Update territories whenever the date or language changes, crossfading between states.
  useEffect(() => {
    const map = mapRef.current;
    if (!ready || !map || !geo.current) return;
    const { shapes, labels } = visibleAt(data, geo.current.shapes, geo.current.labels, t, lang);
    const key = shapes.map((f) => `${f.properties.id}:${f.properties.color}:${f.properties.overlord_color ?? ''}:${f.properties.depth}:${f.properties.overlord ?? ''}`).join('|');
    (map.getSource('labels') as GeoJSONSource).setData({ type: 'FeatureCollection', features: labels });
    if (key === lastKey.current) return;
    lastKey.current = key;

    const from = slot.current;
    const to: Slot = from === 'a' ? 'b' : 'a';
    (map.getSource(`terr-${to}`) as GeoJSONSource).setData({ type: 'FeatureCollection', features: shapes });
    slot.current = to;

    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    const setOpacity = (s: Slot, f: number) => {
      for (const l of territoryLayerOpacities(s)) map.setPaintProperty(l.id, l.prop, l.value * f);
    };
    cancelAnimationFrame(fadeRaf.current);
    if (reduce) {
      setOpacity(to, 1);
      setOpacity(from, 0);
      return;
    }
    const startAt = performance.now();
    const tick = (now: number) => {
      // rAF timestamps can be slightly earlier than startAt; clamp to [0, 1].
      const k = Math.min(1, Math.max(0, (now - startAt) / FADE_MS));
      setOpacity(to, k);
      setOpacity(from, 1 - k);
      if (k < 1) fadeRaf.current = requestAnimationFrame(tick);
    };
    fadeRaf.current = requestAnimationFrame(tick);
  }, [ready, data, t, lang]);

  // Places: shown while they existed, labelled with the name in use at the time (or today's name).
  useEffect(() => {
    const map = mapRef.current;
    if (!ready || !map) return;
    const prehistoricEnd = startT({ year: data.config.prehistoric_until });
    const features = data.places
      .filter((p) => !p.kind.includes('outside-region') && placeVisibleAt(p, t, prehistoricEnd))
      .map((p) => ({
        type: 'Feature' as const,
        geometry: { type: 'Point' as const, coordinates: p.coords },
        properties: {
          id: p.id,
          label: placeLabelAt(p, t, lang, namesMode),
          cls: p.holy_site ? 'holy' : p.kind.includes('city') || p.kind.includes('town') ? 'city' : p.kind.includes('archaeological-site') ? 'site' : 'city',
          rank: p.kind.includes('city') ? 0 : 1,
          selected: p.id === placeId,
        },
      }));
    (map.getSource('places') as GeoJSONSource | undefined)?.setData({ type: 'FeatureCollection', features });
  }, [ready, data, t, lang, namesMode, placeId]);

  // Credits follow the reader's language.
  useEffect(() => {
    const map = mapRef.current;
    if (!ready || !map || !attribution.current) return;
    map.removeControl(attribution.current);
    attribution.current = new AttributionControl({ compact: true, customAttribution: tr('attribution') });
    map.addControl(attribution.current);
  }, [ready, lang, tr]);

  // Landscape: the coastline and Dead Sea for the documented levels in force at time t (modelled).
  useEffect(() => {
    const map = mapRef.current;
    if (!ready || !map || !geo.current) return;
    const set = (id: string, features: Feature[]) => (map.getSource(id) as GeoJSONSource | undefined)?.setData({ type: 'FeatureCollection', features });
    const sea = seaLevelAt(data, t);
    const seaLevel = sea ? levelValue(sea) : null;
    const shoreLevels = geo.current.shorelines.features.map((f) => f.properties.level_m);
    const sl = seaLevel !== null && seaLevel < -0.5 ? nearestLevel(shoreLevels, seaLevel) : null;
    set('shoreline', sl === null ? [] : geo.current.shorelines.features.filter((f) => f.properties.level_m === sl));
    const ds = deadSeaLevelAt(data, t);
    const dsLevel = ds ? levelValue(ds) : null;
    const dsFeatures = geo.current.deadSea.features;
    const modern = dsFeatures.filter((f) => f.properties.method === 'natural-earth-modern-outline');
    const modelled = dsFeatures.filter((f) => f.properties.method !== 'natural-earth-modern-outline');
    let lake = modern;
    if (dsLevel !== null && dsLevel > -412) {
      const lv = nearestLevel(modelled.map((f) => f.properties.level_m), dsLevel);
      lake = modelled.filter((f) => f.properties.level_m === lv);
    }
    set('deadsea', lake);
    // Trade routes in use at time t.
    set(
      'routes',
      (data.landscape?.trade_routes ?? [])
        .filter((r) => activeAt(r, t))
        .map((r) => ({ type: 'Feature', properties: { id: r.id, label: loc(r.name, lang) }, geometry: { type: 'LineString', coordinates: r.waypoints.map((w) => w.coords) } })),
    );
  }, [ready, data, t, lang]);

  // Conflicts under way at time t, with a pulsing marker.
  useEffect(() => {
    const map = mapRef.current;
    if (!ready || !map) return;
    const features = data.conflicts
      .filter((c) => activeAt(c, t) && c._coords)
      .map((c) => ({ type: 'Feature' as const, properties: { id: c.id, label: loc(c.name, lang) }, geometry: { type: 'Point' as const, coordinates: c._coords! } }));
    (map.getSource('conflicts') as GeoJSONSource | undefined)?.setData({ type: 'FeatureCollection', features });
    cancelAnimationFrame(pulseRaf.current);
    if (!features.length || window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
    const tick = (now: number) => {
      const k = (now % 1600) / 1600;
      map.setPaintProperty('conflicts-pulse', 'circle-radius', 6 + k * 16);
      map.setPaintProperty('conflicts-pulse', 'circle-opacity', 0.35 * (1 - k));
      pulseRaf.current = requestAnimationFrame(tick);
    };
    pulseRaf.current = requestAnimationFrame(tick);
  }, [ready, data, t, lang]);

  // Migration flows under way at time t.
  useEffect(() => {
    if (!ready || !flowsReady || !flows.current) return;
    const fo = flows.current;
    void import('./flows').then(({ flowsAt }) => fo.setData(flowsAt(data.migrations, t), layers.includes('migrations')));
  }, [ready, flowsReady, data, t, layers]);

  // Modern layers: each feature shows from its start (e.g. founding year) to its end.
  useEffect(() => {
    const map = mapRef.current;
    if (!ready || !map) return;
    const on = layers.includes('modern');
    for (const l of data.modernLayers ?? []) {
      const timeFilter = ['all', ['<=', ['get', 't0'], t + 1e-9], ['>', ['get', 't1'], t + 1e-9]];
      for (const id of modernLayerIds(l)) {
        if (!map.getLayer(id.id)) continue;
        map.setFilter(id.id, (id.cls ? ['all', timeFilter, ['==', ['get', 'class'], id.cls]] : timeFilter) as never);
        map.setLayoutProperty(id.id, 'visibility', on && !modernOff.includes(l.id) ? 'visible' : 'none');
      }
    }
  }, [ready, data, t, layers, modernOff]);

  // Layer switches.
  useEffect(() => {
    const map = mapRef.current;
    if (!ready || !map) return;
    for (const [key, ids] of Object.entries(LAYER_GROUPS) as [LayerKey, string[]][]) {
      for (const id of ids) if (map.getLayer(id)) map.setLayoutProperty(id, 'visibility', layers.includes(key) ? 'visible' : 'none');
    }
    // Holy sites can be shown even when other places are hidden.
    const showPlaces = layers.includes('places');
    const showHoly = layers.includes('holy');
    const filter = showPlaces && showHoly ? null : showHoly ? ['==', ['get', 'cls'], 'holy'] : showPlaces ? ['!=', ['get', 'cls'], 'holy'] : ['==', 1, 0];
    for (const id of ['places-circle', 'places-label']) {
      if (map.getLayer(id)) {
        map.setLayoutProperty(id, 'visibility', showPlaces || showHoly ? 'visible' : 'none');
        map.setFilter(id, filter as never);
      }
    }
  }, [ready, layers]);

  return (
    <section className="map-wrap" aria-label={tr('mapLabel')}>
      {controls && <LayerControl modern={data.modernLayers} />}
      {controls && (
        <Suspense fallback={null}>
          <DiasporaInset data={data} />
        </Suspense>
      )}
      {controls && data.places.length > 0 && (
        <div className="map-toggle" role="group" aria-label={tr('place.namesMode')}>
          <span>{tr('place.namesMode')}:</span>
          <button type="button" aria-pressed={namesMode === 'then'} onClick={() => setNamesMode('then')}>
            {tr('place.namesThen')}
          </button>
          <button type="button" aria-pressed={namesMode === 'today'} onClick={() => setNamesMode('today')}>
            {tr('place.namesToday')}
          </button>
        </div>
      )}
      <div ref={container} className="map" data-testid="map" data-ready={ready ? 'true' : 'false'} />
      {!ready && !error && <div className="map-status">{tr('loading')}</div>}
      {error && (
        <div className="map-status error" role="alert">
          {tr('loadError')} ({error})
        </div>
      )}
    </section>
  );
}

/** The map layers drawn for one modern layer (one per style class for lines). */
function modernLayerIds(l: ModernLayer): { id: string; cls?: string }[] {
  if (l.kind === 'line' && l.class_styles) return Object.keys(l.class_styles).map((cls) => ({ id: `modern-${l.id}-${cls}`, cls }));
  if (l.kind === 'fill') return [{ id: `modern-${l.id}-fill` }, { id: `modern-${l.id}-line` }];
  if (l.kind === 'point') return [{ id: `modern-${l.id}-pt` }, { id: `modern-${l.id}-label` }];
  return [{ id: `modern-${l.id}-line` }];
}

/** Adds sources and layers for every modern layer, below the place labels. */
function addModernLayers(map: MLMap, data: AppData): void {
  const before = map.getLayer('places-circle') ? 'places-circle' : undefined;
  const origin = window.location.origin;
  for (const l of data.modernLayers ?? []) {
    const src = `modern-${l.id}`;
    map.addSource(src, { type: 'geojson', data: `${origin}${baseUrl()}data/modern/${l.file}` });
    if (l.kind === 'fill') {
      map.addLayer({ id: `modern-${l.id}-fill`, type: 'fill', source: src, paint: { 'fill-color': l.color, 'fill-opacity': 0.16 } }, before);
      map.addLayer({ id: `modern-${l.id}-line`, type: 'line', source: src, paint: { 'line-color': l.color, 'line-width': 1.8, 'line-dasharray': [3, 1.5] } }, before);
    } else if (l.kind === 'line') {
      const styles = l.class_styles ?? { '': { label: l.name } };
      for (const [cls, st] of Object.entries(styles)) {
        map.addLayer(
          {
            id: l.class_styles ? `modern-${l.id}-${cls}` : `modern-${l.id}-line`,
            type: 'line',
            source: src,
            layout: { 'line-cap': 'round' },
            paint: { 'line-color': st.color ?? l.color, 'line-width': 2.4, ...(st.dash ? { 'line-dasharray': st.dash } : {}) },
          },
          before,
        );
      }
    } else {
      map.addLayer({ id: `modern-${l.id}-pt`, type: 'circle', source: src, paint: { 'circle-radius': ['interpolate', ['linear'], ['zoom'], 6, 2, 11, 4.5], 'circle-color': l.color, 'circle-stroke-color': '#fff', 'circle-stroke-width': 0.8 } }, before);
      map.addLayer(
        {
          id: `modern-${l.id}-label`,
          type: 'symbol',
          source: src,
          minzoom: 9.5,
          layout: { 'text-field': ['coalesce', ['get', 'name'], ''], 'text-font': ['Noto Sans Regular'], 'text-size': 10, 'text-offset': [0, 0.9], 'text-optional': true },
          paint: { 'text-color': '#444', 'text-halo-color': '#fff', 'text-halo-width': 1.2 },
        },
        before,
      );
    }
  }
}

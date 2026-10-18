import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AttributionControl, Map as MLMap, NavigationControl, type GeoJSONSource, type MapStyleImageMissingEvent } from './maplibre';
import 'maplibre-gl/dist/maplibre-gl.css';
import type { Feature, FeatureCollection, Geometry } from 'geojson';
import { baseUrl, depthAt, relationsAt, type AppData, type Polity } from '../data/model';
import { loc } from '../i18n/localize';
import type { Lang } from '../time/format';
import { buildStyle, hatchImage, territoryLayerOpacities, TERRAIN_BOUNDS, type Slot } from './style';

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
async function loadShapes(): Promise<{ shapes: Shapes; labels: Shapes; fontFaces: Record<string, { url: string; 'unicode-range': string[] }[]> }> {
  const get = async (f: string) => {
    const r = await fetch(`${baseUrl()}data/${f}`);
    if (!r.ok) throw new Error(`${f}: HTTP ${r.status}`);
    return r.json();
  };
  const [shapes, labels, fontFaces] = await Promise.all([get('territories.geojson'), get('labels.geojson'), get('font-faces.json')]);
  return { shapes, labels, fontFaces };
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

export function MapView({ data, t, lang }: { data: AppData; t: number; lang: Lang }) {
  const { t: tr } = useTranslation();
  const container = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MLMap | null>(null);
  const geo = useRef<{ shapes: Shapes; labels: Shapes } | null>(null);
  const slot = useRef<Slot>('a');
  const lastKey = useRef('');
  const fadeRaf = useRef(0);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    loadShapes()
      .then(({ shapes, labels, fontFaces }) => {
        if (cancelled || !container.current) return;
        geo.current = { shapes, labels };
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
        map.addControl(new AttributionControl({ compact: true, customAttribution: tr('attribution') }));
        map.on('styleimagemissing', (e: MapStyleImageMissingEvent) => {
          if (e.id === 'hatch' && !map.hasImage('hatch')) map.addImage('hatch', hatchImage());
        });
        map.on('load', () => {
          if (!map.hasImage('hatch')) map.addImage('hatch', hatchImage());
          mapRef.current = map;
          setReady(true);
        });
      })
      .catch((e: Error) => setError(e.message));
    return () => {
      cancelled = true;
      cancelAnimationFrame(fadeRaf.current);
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

  return (
    <section className="map-wrap" aria-label={tr('mapLabel')}>
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

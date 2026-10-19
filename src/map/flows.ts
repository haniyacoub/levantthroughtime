import { MapboxOverlay } from '@deck.gl/mapbox';
import { TripsLayer } from '@deck.gl/geo-layers';
import { PathLayer } from '@deck.gl/layers';
import type { IControl, Map as MLMap } from 'maplibre-gl';
import type { Migration, Range } from '../data/model';
import { endT, startT } from '../time/years';

type RGB = [number, number, number];

export interface FlowDatum {
  id: string;
  path: [number, number][];
  timestamps: number[];
  width: number;
  halo: number;
  color: RGB;
}

/** Colour by direction only, never by group: into, out of, or within the region. */
const DIRECTION_COLOR: Record<Migration['direction'], RGB> = {
  in: [0, 121, 107],
  out: [191, 91, 23],
  within: [106, 61, 154],
};

const SAMPLES = 48;

/** Width in pixels on a square-root scale of the number of people (unknown numbers get a thin line). */
function widthFor(n: number | null): number {
  if (n === null) return 2;
  return Math.max(2, Math.min(18, 1.5 + Math.sqrt(n) / 40));
}

function value(r: Range | null | undefined, which: 'mid' | 'high'): number | null {
  if (!r) return null;
  if (which === 'high') return r.high ?? r.best ?? r.low;
  if (r.best != null) return r.best;
  if (r.low !== null && r.high !== null) return (r.low + r.high) / 2;
  return r.low ?? r.high;
}

/** A curved path between two points (quadratic Bézier in lon/lat), bowing to one side. */
function curve(a: [number, number], b: [number, number]): [number, number][] {
  const mx = (a[0] + b[0]) / 2;
  const my = (a[1] + b[1]) / 2;
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const k = 0.22;
  const c: [number, number] = [mx - dy * k, my + dx * k];
  const out: [number, number][] = [];
  for (let i = 0; i <= SAMPLES; i++) {
    const s = i / SAMPLES;
    out.push([(1 - s) ** 2 * a[0] + 2 * (1 - s) * s * c[0] + s ** 2 * b[0], (1 - s) ** 2 * a[1] + 2 * (1 - s) * s * c[1] + s ** 2 * b[1]]);
  }
  return out;
}

type MigrationWithCoords = Migration & { _from?: [number, number] | null; _to?: [number, number] | null };

/** Migrations under way at time t, as drawable flows. */
export function flowsAt(migrations: MigrationWithCoords[], t: number): FlowDatum[] {
  return migrations
    .filter((m) => {
      const a = startT(m.start);
      const b = m.end ? endT(m.end) : a + 1;
      return t >= a - 1e-9 && t < b && m._from && m._to;
    })
    .map((m) => ({
      id: m.id,
      path: curve(m._from!, m._to!),
      timestamps: Array.from({ length: SAMPLES + 1 }, (_, i) => i / SAMPLES),
      width: widthFor(value(m.numbers, 'mid')),
      halo: widthFor(value(m.numbers, 'high')) + 4,
      color: DIRECTION_COLOR[m.direction],
    }));
}

/** deck.gl overlay that animates migration flows along their paths. */
export class FlowOverlay {
  private overlay = new MapboxOverlay({ interleaved: false, layers: [] });
  private data: FlowDatum[] = [];
  private raf = 0;
  private visible = true;
  private reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;

  attach(map: MLMap): void {
    map.addControl(this.overlay as unknown as IControl);
    this.loop();
  }

  setData(data: FlowDatum[], visible: boolean): void {
    this.data = data;
    this.visible = visible;
    if (this.reduceMotion) this.render(1);
  }

  private loop = () => {
    if (!this.reduceMotion) this.render(((performance.now() / 3000) % 1.5) - 0.1);
    this.raf = requestAnimationFrame(this.loop);
  };

  private render(time: number): void {
    const data = this.visible ? this.data : [];
    this.overlay.setProps({
      layers: [
        new PathLayer<FlowDatum>({
          id: 'flow-halo',
          data,
          getPath: (d) => d.path,
          getWidth: (d) => d.halo,
          widthUnits: 'pixels',
          getColor: (d) => [...d.color, 45],
          capRounded: true,
          jointRounded: true,
        }),
        this.reduceMotion
          ? new PathLayer<FlowDatum>({
              id: 'flow-static',
              data,
              getPath: (d) => d.path,
              getWidth: (d) => d.width,
              widthUnits: 'pixels',
              getColor: (d) => [...d.color, 200],
              capRounded: true,
            })
          : new TripsLayer<FlowDatum>({
              id: 'flow-trips',
              data,
              getPath: (d) => d.path,
              getTimestamps: (d) => d.timestamps,
              getWidth: (d) => d.width,
              widthUnits: 'pixels',
              getColor: (d) => [...d.color, 220],
              trailLength: 0.45,
              currentTime: time,
              capRounded: true,
              jointRounded: true,
            }),
      ],
    });
  }

  destroy(): void {
    cancelAnimationFrame(this.raf);
  }
}

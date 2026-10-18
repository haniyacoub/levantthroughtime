import type { HistDate } from '../time/years';
import { endT, startT } from '../time/years';
import type { LocalizedText } from '../i18n/localize';

export type Confidence = 'documented' | 'estimated' | 'contested' | 'unknown';

export interface SourceRef { ref: string; locator?: string; quote?: string; via?: string; note?: string }

export interface Relation {
  type: 'vassal' | 'client' | 'province' | 'tributary' | 'occupied' | 'mandate' | 'part-of' | 'autonomous-under';
  overlord: string;
  start: HistDate;
  end?: HistDate;
  confidence: Confidence;
  sources: SourceRef[];
  notes?: LocalizedText;
}

export interface Polity {
  id: string;
  name: LocalizedText;
  kind: string;
  start: HistDate;
  end?: HistDate;
  confidence: Confidence;
  basis?: string;
  sources: SourceRef[];
  notes?: LocalizedText;
  relations?: Relation[];
  color: string;
}

export interface Culture {
  id: string;
  name: LocalizedText;
  start: HistDate;
  end?: HistDate;
  confidence: Confidence;
  sources: SourceRef[];
  notes?: LocalizedText;
  color: string;
}

export interface Extent {
  id: string;
  owner: string;
  kind: 'territory' | 'culture-zone';
  start: HistDate;
  end?: HistDate;
  units?: string[];
  partial_units?: string[];
  contested_units?: string[];
  extent_type?: 'control' | 'claim';
  boundary_certainty: 'surveyed' | 'approximate' | 'schematic' | 'contested';
  description?: LocalizedText;
  confidence: Confidence;
  sources: SourceRef[];
  notes?: LocalizedText;
}

export interface Segment {
  id: string;
  label: LocalizedText;
  start: { year: number; month?: number };
  weight: number;
  step: { unit: 'year' | 'month'; size: number };
  fine_steps?: { start: { year: number; month?: number }; end: { year: number; month?: number }; unit: 'year' | 'month'; size: number }[];
}

export interface AppData {
  config: {
    title: LocalizedText;
    subtitle: LocalizedText;
    timeline: { start: { year: number; month?: number }; as_of: HistDate };
    prehistoric_until: number;
    map: { bounds: [[number, number], [number, number]]; initial: { center: [number, number]; zoom: number } };
  };
  eras: Segment[];
  sources: { id: string; title: string; authors?: string[]; year?: string | number; url?: string; doi?: string; verification: { level: string } }[];
  polities: Polity[];
  cultures: Culture[];
  extents: Extent[];
  population: unknown[];
  /** Names of geographic units (schematic and modern), for panels. */
  units: { id: string; name: LocalizedText }[];
}

export function baseUrl(): string {
  return import.meta.env.BASE_URL ?? '/';
}

export async function loadAppData(): Promise<AppData> {
  const res = await fetch(`${baseUrl()}data/app-data.json`);
  if (!res.ok) throw new Error(`app-data.json: HTTP ${res.status}`);
  return (await res.json()) as AppData;
}

export const activeAt = (r: { start: HistDate; end?: HistDate }, t: number): boolean =>
  startT(r.start) <= t + 1e-9 && (r.end === undefined || t < endT(r.end) - 1e-9);

/** Relations of a polity that hold at time t. */
export function relationsAt(p: Polity, t: number): Relation[] {
  return (p.relations ?? []).filter((r) => activeAt(r, t));
}

/** Depth of the overlord chain at t (0 = sovereign). Used to draw subordinates on top. */
export function depthAt(id: string, byId: Map<string, Polity>, t: number, seen = new Set<string>()): number {
  const p = byId.get(id);
  if (!p || seen.has(id)) return 0;
  seen.add(id);
  const r = relationsAt(p, t)[0];
  return r ? 1 + depthAt(r.overlord, byId, t, seen) : 0;
}

export type MapMode = 'prehistoric' | 'political';

export function mapModeAt(data: AppData, t: number): MapMode {
  return t < startT({ year: data.config.prehistoric_until }) ? 'prehistoric' : 'political';
}

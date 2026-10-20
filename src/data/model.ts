import type { HistDate } from '../time/years';
import { endT, startT } from '../time/years';
import { EraScale } from '../time/eraScale';
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

export interface Range {
  low: number | null;
  high: number | null;
  best?: number | null;
}

export interface SourceEntry {
  id: string;
  type: string;
  authors?: string[];
  editors?: string[];
  title: string;
  container?: string;
  publisher?: string;
  place?: string;
  year?: string | number;
  volume?: string | number;
  issue?: string | number;
  pages?: string;
  edition?: string;
  isbn?: string;
  doi?: string;
  url?: string;
  accessed?: string;
  license?: string;
  verification: { level: 'full-text' | 'excerpt' | 'catalogue-only' | 'cited-via'; checked_on: string; note?: string };
  kind: string;
  institution_country?: string;
  notes?: string;
}

export interface Area {
  id: string;
  name: LocalizedText;
  definition: LocalizedText;
  series?: string;
}

export interface Group {
  id: string;
  axis: 'religion' | 'ethnicity' | 'population-group';
  name: LocalizedText;
}

export interface CompositionGroup {
  group: string;
  count?: Range;
  share_pct?: Range;
  notes?: string;
}

export interface PopulationPoint {
  id: string;
  area: string;
  date: HistDate;
  date_note?: string;
  total: Range | null;
  composition?: { axis: Group['axis']; label?: string; partial?: boolean; groups: CompositionGroup[] }[];
  basis: string;
  method?: string;
  confidence: Confidence;
  sources: SourceRef[];
  notes?: LocalizedText;
}

export interface PlaceName {
  text: string;
  translit?: string;
  display?: LocalizedText;
  lang: string;
  script?: string;
  start?: HistDate;
  end?: HistDate;
  used_by?: string;
  primary?: boolean;
  confidence: Confidence;
  sources: SourceRef[];
  notes?: string;
}

export interface Place {
  id: string;
  name: LocalizedText;
  kind: string[];
  coords: [number, number];
  coords_precision?: string;
  founded?: HistDate | null;
  founded_note?: string;
  founded_sources?: SourceRef[];
  destroyed?: { date: HistDate; what?: string; by?: string; note?: string; ended_settlement?: boolean; confidence?: Confidence; sources: SourceRef[] }[];
  names?: PlaceName[];
  holy_site?: { traditions: Partial<Record<string, { significance: LocalizedText; denominations?: string[]; sources: SourceRef[] }>> };
  custody?: { summary: LocalizedText; confidence: Confidence; sources: SourceRef[] };
  unesco?: { property: number; name: string; state_party_label?: string; inscribed: number; criteria?: string; in_danger_since?: number; note?: string };
  description?: LocalizedText;
  confidence: Confidence;
  sources: SourceRef[];
  notes?: LocalizedText;
}

export interface EventRecord {
  id: string;
  name: LocalizedText;
  kind: string;
  date: HistDate;
  end?: HistDate;
  place?: string;
  coords?: [number, number];
  description?: LocalizedText;
  importance?: 1 | 2 | 3;
  related_conflict?: string;
  basis?: 'textual-tradition' | 'archaeological' | 'documentary';
  confidence: Confidence;
  sources: SourceRef[];
  notes?: LocalizedText;
}

export interface Ruler {
  id: string;
  name: LocalizedText;
  polity: string;
  office?: LocalizedText;
  start: HistDate;
  end?: HistDate;
  basis?: 'textual-tradition' | 'archaeological' | 'documentary';
  confidence: Confidence;
  sources: SourceRef[];
  notes?: LocalizedText;
}

export interface AltName {
  text: LocalizedText;
  used_by: string;
  sources: SourceRef[];
}

export interface Conflict {
  id: string;
  name: LocalizedText;
  alt_names?: AltName[];
  kind: string;
  parent?: string;
  start: HistDate;
  end?: HistDate;
  location?: { place?: string; coords?: [number, number]; units?: string[]; description?: LocalizedText };
  belligerents?: { side: string; parties: ({ polity: string } | { group: LocalizedText })[] }[];
  outcome?: LocalizedText;
  confidence: Confidence;
  sources: SourceRef[];
  notes?: LocalizedText;
  /** Marker position, computed when the data is built. */
  _coords?: [number, number] | null;
}

export type Endpoint = { place: string } | { label: LocalizedText; coords: [number, number]; coords_source?: string };

export interface Migration {
  id: string;
  name: LocalizedText;
  group: LocalizedText;
  types: string[];
  alt_names?: LocalizedText[];
  origin: Endpoint;
  destination: Endpoint;
  origins?: Endpoint[];
  destinations?: Endpoint[];
  start: HistDate;
  end?: HistDate;
  numbers?: Range | null;
  direction: 'in' | 'out' | 'within';
  basis?: 'textual-tradition' | 'archaeological' | 'documentary';
  confidence: Confidence;
  sources: SourceRef[];
  notes?: LocalizedText;
  contested_note?: LocalizedText;
  /** Endpoint positions, computed when the data is built. */
  _from?: [number, number] | null;
  _to?: [number, number] | null;
  /** Every drawn leg [from, to] when there are several origins or destinations. */
  _legs?: [[number, number], [number, number]][];
}

export interface Diaspora {
  id: string;
  group: string;
  definition: LocalizedText;
  date: HistDate;
  /** coords is null for regional totals with no single place. */
  location: { label: LocalizedText; coords: [number, number] | null; coords_source?: string };
  number: Range;
  confidence: Confidence;
  sources: SourceRef[];
  notes?: LocalizedText;
}

export interface LanguageRecord {
  id: string;
  name: LocalizedText;
  family?: string;
  scripts?: string[];
  periods: { start: HistDate; end?: HistDate; role: string; speakers?: LocalizedText; confidence: Confidence; sources: SourceRef[] }[];
  notes?: LocalizedText;
  lineage?: { descends_from: string[]; note?: LocalizedText; sources: SourceRef[] };
}

export interface LevelPoint {
  id: string;
  date: HistDate;
  level_m: { low: number | null; high: number | null; best?: number };
  location?: string;
  confidence: Confidence;
  sources: SourceRef[];
  notes?: string;
}

export interface TradeRoute {
  id: string;
  name: LocalizedText;
  start: HistDate;
  end?: HistDate;
  waypoints: { label: string; coords: [number, number] }[];
  branches?: { label: string; waypoints: { label: string; coords: [number, number] }[] }[];
  certainty: string;
  description?: LocalizedText;
  confidence: Confidence;
  sources: SourceRef[];
}

export interface Perspective {
  id: string;
  title: LocalizedText;
  about?: string[];
  accounts: { perspective: string; label: LocalizedText; summary: LocalizedText; sources: SourceRef[] }[];
  notes?: LocalizedText;
  /** Time span from the records it is about, computed when the data is built. */
  _t0?: number;
  _t1?: number;
}

export type EvidenceType = 'documentary' | 'archaeological' | 'textual-tradition' | 'linguistic' | 'genetic';

/** A people or community attested in or near the map area (data/peoples.json). */
export interface People {
  id: string;
  name: LocalizedText;
  also_known_as?: string[];
  kind: 'people' | 'religious-community' | 'tribal-confederation' | 'community';
  attested: { start: HistDate; end?: HistDate | null };
  homeland?: LocalizedText;
  units?: string[];
  related?: { polities?: string[]; cultures?: string[]; languages?: string[]; migrations?: string[]; groups?: string[] };
  summary: LocalizedText;
  basis: EvidenceType[];
  confidence: Confidence;
  sources: SourceRef[];
  notes?: LocalizedText;
  religions?: { label: LocalizedText; group?: string; start?: HistDate; end?: HistDate | null; confidence: Confidence; sources: SourceRef[] }[];
  languages?: { language: string; start?: HistDate; end?: HistDate | null; note?: LocalizedText; confidence: Confidence; sources: SourceRef[] }[];
}

export type PeopleLinkType = 'continued-as' | 'merged-into' | 'assimilated-into' | 'contributed-to' | 'migrated-to' | 'split-into' | 'converted-to';

/** What a people became or where it went, as a sourced statement. */
export interface PeopleLink {
  id: string;
  from: string;
  to?: string | null;
  destination?: { label: LocalizedText; coords?: [number, number] };
  type: PeopleLinkType;
  start: HistDate;
  end?: HistDate | null;
  evidence: EvidenceType[];
  summary: LocalizedText;
  confidence: Confidence;
  sources: SourceRef[];
  notes?: LocalizedText;
}

export interface Story {
  id: string;
  title: LocalizedText;
  summary: LocalizedText;
  steps: {
    date: { year: number; month?: number };
    view?: { center: [number, number]; zoom: number };
    layers?: string[];
    highlight?: string[];
    title: LocalizedText;
    card: LocalizedText;
    sources: SourceRef[];
    duration_s?: number;
  }[];
}

export interface ModernLayer {
  id: string;
  name: LocalizedText;
  file: string;
  kind: 'fill' | 'line' | 'point';
  color: string;
  class_styles?: Record<string, { dash?: number[]; color?: string; label: LocalizedText }>;
  start: HistDate;
  end?: HistDate;
  as_of: HistDate;
  publisher: string;
  license: string;
  attribution: string;
  method: LocalizedText;
  confidence: Confidence;
  sources: SourceRef[];
  notes?: LocalizedText;
  t0: number;
  t1: number | null;
}

export interface AppData {
  /** The reading language this file was built for. */
  lang: 'en' | 'ar' | 'he';
  config: {
    title: LocalizedText;
    subtitle: LocalizedText;
    timeline: { start: { year: number; month?: number }; as_of: HistDate };
    prehistoric_until: number;
    undated_names_from: number;
    corrections_url?: string;
    map: { bounds: [[number, number], [number, number]]; initial: { center: [number, number]; zoom: number } };
  };
  eras: Segment[];
  sources: SourceEntry[];
  polities: Polity[];
  cultures: Culture[];
  extents: Extent[];
  population: PopulationPoint[];
  areas: Area[];
  groups: Group[];
  groupColors: Record<string, string>;
  /** Names of geographic units (schematic and modern), for panels. */
  units: { id: string; name: LocalizedText }[];
  /** Ruler bands: periods when each polity held part of the core land. */
  bands: { owner: string; intervals: [number, number | null][] }[];
  /** How many references cite each source. */
  sourceUsage: Record<string, number>;
  places: Place[];
  events: EventRecord[];
  rulers: Ruler[];
  conflicts: Conflict[];
  migrations: Migration[];
  diaspora: Diaspora[];
  languages: LanguageRecord[];
  landscape: { sea_level: LevelPoint[]; dead_sea_levels: LevelPoint[]; trade_routes: TradeRoute[] } | null;
  perspectives: Perspective[];
  peoples: People[];
  peopleLinks: PeopleLink[];
  stories: Story[];
  modernLayers?: ModernLayer[];
}

export function baseUrl(): string {
  return import.meta.env.BASE_URL ?? '/';
}

/** Loads the data for one reading language (English plus that language's texts). */
export async function loadAppData(lang: 'en' | 'ar' | 'he' = 'en'): Promise<AppData> {
  const res = await fetch(`${baseUrl()}data/app-data.${lang}.json`);
  if (!res.ok) throw new Error(`app-data.${lang}.json: HTTP ${res.status}`);
  return (await res.json()) as AppData;
}

export const activeAt = (r: { start: HistDate; end?: HistDate }, t: number): boolean =>
  startT(r.start) <= t + 1e-9 && (r.end === undefined || t < endT(r.end) - 1e-9);

const scales = new WeakMap<AppData, EraScale>();
/** The timeline scale for this data (cached). */
export function scaleFor(data: AppData): EraScale {
  let s = scales.get(data);
  if (!s) {
    const asOf = data.config.timeline.as_of;
    s = new EraScale(data.eras, startT({ year: asOf.year, month: asOf.month }));
    scales.set(data, s);
  }
  return s;
}

/** Length, in years, of the timeline step that starts at t. */
export function stepYearsAt(data: AppData, t: number): number {
  const st = scaleFor(data).stepAt(t);
  return st.unit === 'month' ? st.size / 12 : st.size;
}

/**
 * Is a dated happening (a battle, war or event) under way during the timeline step that starts
 * at t? Without an end date it lasts only its start date (that day, month or year), so a one-day
 * battle still shows while stepping month by month, and does not stay on the map afterwards.
 */
export const happeningAt = (r: { start: HistDate; end?: HistDate }, t: number, stepYears: number): boolean =>
  startT(r.start) < t + stepYears - 1e-9 && endT(r.end ?? r.start) > t + 1e-9;

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

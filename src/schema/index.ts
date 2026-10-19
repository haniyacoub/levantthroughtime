/**
 * Data schemas. This file is the formal definition of every file in /data.
 * It is used by the app, by `npm run validate-data`, and to generate the JSON
 * Schema files in /schema that give editors autocomplete.
 *
 * Plain-language documentation: data/README.md.
 */
import { z } from 'zod';
import { toAstronomical } from '../time/years';

// ---------------------------------------------------------------- basics

export const Id = z
  .string()
  .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, 'Ids are lowercase words joined by hyphens, e.g. "hasmonean-kingdom"');

export const TranslationStatus = z.enum(['original', 'machine-draft', 'reviewed']);

/** User-facing text in each language. English is the original and is required. */
export const Localized = z
  .strictObject({
    en: z.string().min(1, 'English text is required (English is the original language)'),
    ar: z.string().min(1).optional(),
    he: z.string().min(1).optional(),
    translation_status: z
      .strictObject({ ar: TranslationStatus.optional(), he: TranslationStatus.optional() })
      .optional(),
  })
  .superRefine((v, ctx) => {
    for (const lang of ['ar', 'he'] as const) {
      if (v[lang] && !v.translation_status?.[lang]) {
        ctx.addIssue({
          code: 'custom',
          path: ['translation_status', lang],
          message: `Text in "${lang}" needs a translation_status ("machine-draft", "reviewed" or "original")`,
        });
      }
    }
  });
export type Localized = z.infer<typeof Localized>;

export const Year = z
  .number()
  .int('Years must be whole numbers')
  .refine((y) => y !== 0, 'There is no year 0: use -1 for 1 BCE and 1 for 1 CE');

export const Precision = z.enum(['day', 'month', 'season', 'year', 'decade', 'century', 'millennium']);

export const HistDate = z
  .strictObject({
    year: Year,
    month: z.number().int().min(1).max(12).optional(),
    day: z.number().int().min(1).max(31).optional(),
    circa: z.boolean().optional(),
    precision: Precision,
    latest: Year.optional(),
    calendar_note: z.string().optional(),
  })
  .superRefine((d, ctx) => {
    if (d.day !== undefined && d.month === undefined) {
      ctx.addIssue({ code: 'custom', path: ['day'], message: 'A day needs a month' });
    }
    if (d.latest !== undefined && d.latest !== 0 && d.year !== 0 && toAstronomical(d.latest) < toAstronomical(d.year)) {
      ctx.addIssue({ code: 'custom', path: ['latest'], message: '"latest" must not be earlier than "year"' });
    }
  });
export type HistDate = z.infer<typeof HistDate>;

/** A simple year/month point, used for slider segment boundaries. */
export const YearMonth = z.strictObject({ year: Year, month: z.number().int().min(1).max(12).optional() });

export const Confidence = z.enum(['documented', 'estimated', 'contested', 'unknown']);
export type Confidence = z.infer<typeof Confidence>;

export const SourceRef = z.strictObject({
  ref: Id,
  locator: z.string().optional(),
  quote: z.string().optional(),
  /** The secondary work a figure was taken from, when it was not seen in the original. */
  via: Id.optional(),
  note: z.string().optional(),
});
export type SourceRef = z.infer<typeof SourceRef>;

/**
 * A range. An open-ended figure ("at least 4 million", "at most 30,000") leaves
 * one bound null; the site shows it as "≥" or "≤".
 */
export const Range = z
  .strictObject({
    low: z.number().nonnegative().nullable(),
    high: z.number().nonnegative().nullable(),
    best: z.number().nonnegative().nullable().optional(),
  })
  .superRefine((r, ctx) => {
    if (r.low === null && r.high === null) {
      ctx.addIssue({ code: 'custom', path: ['low'], message: 'A range needs at least one bound; use null for the whole value if it is unknown' });
    }
    if (r.low !== null && r.high !== null && r.low > r.high) ctx.addIssue({ code: 'custom', path: ['low'], message: `low (${r.low}) is greater than high (${r.high})` });
    if (r.best != null && ((r.low !== null && r.best < r.low) || (r.high !== null && r.best > r.high))) {
      ctx.addIssue({ code: 'custom', path: ['best'], message: `best (${r.best}) is outside the range ${r.low ?? '…'}–${r.high ?? '…'}` });
    }
  });
export type Range = z.infer<typeof Range>;

const recordBase = {
  id: Id,
  name: Localized,
  start: HistDate,
  end: HistDate.optional(),
  confidence: Confidence,
  sources: z.array(SourceRef),
  notes: Localized.optional(),
};

const SchemaRef = z.string().optional();

// ---------------------------------------------------------------- sources

export const Verification = z.strictObject({
  level: z.enum(['full-text', 'excerpt', 'catalogue-only', 'cited-via']),
  checked_on: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Use YYYY-MM-DD'),
  note: z.string().optional(),
});

const StrOrNum = z.union([z.string(), z.number()]);

export const Source = z.strictObject({
  id: Id,
  type: z.enum(['book', 'article', 'chapter', 'web', 'dataset', 'document', 'map', 'census', 'report', 'thesis']),
  authors: z.array(z.string()).optional(),
  editors: z.array(z.string()).optional(),
  title: z.string().min(1),
  container: z.string().optional(),
  publisher: z.string().optional(),
  place: z.string().optional(),
  year: StrOrNum.optional(),
  volume: StrOrNum.optional(),
  issue: StrOrNum.optional(),
  pages: z.string().optional(),
  edition: z.string().optional(),
  isbn: z.string().optional(),
  doi: z.string().optional(),
  url: z.url().optional(),
  accessed: z.string().optional(),
  license: z.string().optional(),
  verification: Verification,
  kind: z.enum(['academic', 'government', 'un', 'ngo', 'press', 'reference', 'religious-institution']),
  institution_country: z.string().regex(/^[A-Z]{2}$/, 'Two-letter country code, e.g. "IL", "PS", "GB"').optional(),
  notes: z.string().optional(),
});
export type Source = z.infer<typeof Source>;
export const SourcesFile = z.strictObject({ $schema: SchemaRef, sources: z.array(Source) });

// ---------------------------------------------------------------- config & eras

export const StepSpec = z.strictObject({ unit: z.enum(['year', 'month']), size: z.number().int().positive() });

export const Era = z.strictObject({
  id: Id,
  label: Localized,
  start: YearMonth,
  weight: z.number().positive(),
  step: StepSpec,
  fine_steps: z
    .array(z.strictObject({ start: YearMonth, end: YearMonth, unit: z.enum(['year', 'month']), size: z.number().int().positive() }))
    .optional(),
  note: z.string().optional(),
});
export type Era = z.infer<typeof Era>;
export const ErasFile = z.strictObject({ $schema: SchemaRef, segments: z.array(Era).min(1) });

export const Config = z.strictObject({
  $schema: SchemaRef,
  title: Localized,
  subtitle: Localized,
  timeline: z.strictObject({ start: YearMonth, as_of: HistDate }),
  /** Before this year the map shows archaeological cultures; from it, political territories. */
  prehistoric_until: Year,
  /**
   * Place names and places with no sourced date are treated as current usage and shown from this
   * year (the period of the modern surveys). Earlier dates use only dated names.
   */
  undated_names_from: Year,
  composition_tolerance_pct: z.number().positive(),
  /** Where "Suggest a correction" links lead, e.g. "https://github.com/<user>/<repo>/issues/new". Optional. */
  corrections_url: z.url().optional(),
  map: z.strictObject({
    bounds: z.tuple([z.tuple([z.number(), z.number()]), z.tuple([z.number(), z.number()])]),
    initial: z.strictObject({ center: z.tuple([z.number(), z.number()]), zoom: z.number() }),
  }),
});
export type Config = z.infer<typeof Config>;

// ---------------------------------------------------------------- polities & cultures

export const RelationType = z.enum(['vassal', 'client', 'province', 'tributary', 'occupied', 'mandate', 'part-of', 'autonomous-under']);

export const Relation = z.strictObject({
  type: RelationType,
  overlord: Id,
  start: HistDate,
  end: HistDate.optional(),
  confidence: Confidence,
  sources: z.array(SourceRef),
  notes: Localized.optional(),
});
export type Relation = z.infer<typeof Relation>;

export const Basis = z.enum(['textual-tradition', 'archaeological', 'documentary']);

export const PolityKind = z.enum([
  'empire', 'kingdom', 'city-state', 'province', 'caliphate', 'sultanate', 'crusader-state', 'lordship',
  'mandate', 'state', 'military-administration', 'authority', 'tribal-confederation', 'other',
]);

export const Polity = z.strictObject({
  ...recordBase,
  kind: PolityKind,
  basis: Basis.optional(),
  wikidata: z.string().regex(/^Q\d+$/).optional(),
  relations: z.array(Relation).optional(),
});
export type Polity = z.infer<typeof Polity>;
export const PolitiesFile = z.strictObject({ $schema: SchemaRef, polities: z.array(Polity) });

export const Culture = z.strictObject({
  ...recordBase,
  basis: Basis.optional(),
  wikidata: z.string().regex(/^Q\d+$/).optional(),
});
export type Culture = z.infer<typeof Culture>;
export const CulturesFile = z.strictObject({ $schema: SchemaRef, cultures: z.array(Culture) });

// ---------------------------------------------------------------- territories (GeoJSON)

const Position = z.tuple([z.number(), z.number()]);
const Ring = z.array(Position).min(4);
export const PolygonGeom = z.strictObject({ type: z.literal('Polygon'), coordinates: z.array(Ring) });
export const MultiPolygonGeom = z.strictObject({ type: z.literal('MultiPolygon'), coordinates: z.array(z.array(Ring)) });
export const AreaGeometry = z.union([PolygonGeom, MultiPolygonGeom]);

export const BoundaryCertainty = z.enum(['surveyed', 'approximate', 'schematic', 'contested']);
export const GeometryMethod = z.enum(['units', 'imported', 'traced-from-map', 'from-text-description', 'buffer-around-sites']);

const extentFields = {
  id: Id,
  start: HistDate,
  end: HistDate.optional(),
  units: z.array(Id).optional(),
  partial_units: z.array(Id).optional(),
  /** Units held whose status is disputed (e.g. an annexation most states do not recognise); drawn hatched. */
  contested_units: z.array(Id).optional(),
  /** "control" (default): the area the polity governed. "claim": an area claimed but not governed; drawn as an outline only. */
  extent_type: z.enum(['control', 'claim']).optional(),
  boundary_certainty: BoundaryCertainty,
  geometry_method: GeometryMethod,
  description: Localized.optional(),
  confidence: Confidence,
  sources: z.array(SourceRef),
  notes: Localized.optional(),
};

function checkExtent(p: { units?: string[]; partial_units?: string[]; contested_units?: string[]; geometry_method: string }, ctx: z.RefinementCtx) {
  if (p.geometry_method === 'units' && !p.units?.length && !p.partial_units?.length && !p.contested_units?.length) {
    ctx.addIssue({ code: 'custom', path: ['units'], message: 'geometry_method "units" needs at least one unit in "units" or "partial_units"' });
  }
}

function checkFeatureGeometry(f: { properties: { geometry_method: string }; geometry: unknown }, ctx: z.RefinementCtx) {
  if (f.properties.geometry_method !== 'units' && f.geometry === null) {
    ctx.addIssue({ code: 'custom', path: ['geometry'], message: `geometry_method "${f.properties.geometry_method}" needs a geometry` });
  }
}

export const TerritoryProps = z.strictObject({ ...extentFields, polity: Id }).superRefine(checkExtent);
export type TerritoryProps = z.infer<typeof TerritoryProps>;
export const CultureZoneProps = z.strictObject({ ...extentFields, culture: Id }).superRefine(checkExtent);
export type CultureZoneProps = z.infer<typeof CultureZoneProps>;

export const TerritoryFile = z.strictObject({
  $schema: SchemaRef,
  type: z.literal('FeatureCollection'),
  features: z.array(
    z.strictObject({ type: z.literal('Feature'), properties: TerritoryProps, geometry: AreaGeometry.nullable() }).superRefine(checkFeatureGeometry),
  ),
});
export const CultureZoneFile = z.strictObject({
  $schema: SchemaRef,
  type: z.literal('FeatureCollection'),
  features: z.array(
    z.strictObject({ type: z.literal('Feature'), properties: CultureZoneProps, geometry: AreaGeometry.nullable() }).superRefine(checkFeatureGeometry),
  ),
});

// ---------------------------------------------------------------- geographic units

export const Landmark = z.strictObject({
  id: Id,
  lon: z.number().min(25).max(45),
  lat: z.number().min(25).max(40),
  label: z.string().optional(),
  wikidata: z.string().regex(/^Q\d+$/).optional(),
  note: z.string().optional(),
});
export const Unit = z.strictObject({
  id: Id,
  name: Localized,
  description: z.string().min(1),
  /** Polygon ring as landmark ids, in order. The ring is clipped to land when built. */
  ring: z.array(Id).min(3),
  notes: z.string().optional(),
});
export const UnitsFile = z.strictObject({
  $schema: SchemaRef,
  note: z.string().optional(),
  landmarks: z.array(Landmark),
  units: z.array(Unit),
});

// ---------------------------------------------------------------- statistics areas, groups, population

export const Area = z.strictObject({
  id: Id,
  name: Localized,
  definition: Localized,
  /** Areas sharing a series cover roughly the same land and are drawn as one line, with the change of definition marked. */
  series: Id.optional(),
  units: z.array(Id).optional(),
  sources: z.array(SourceRef),
});
export const AreasFile = z.strictObject({ $schema: SchemaRef, areas: z.array(Area) });

export const Axis = z.enum(['religion', 'ethnicity', 'population-group']);
export const Group = z.strictObject({ id: Id, axis: Axis, name: Localized, parent: Id.optional(), notes: z.string().optional() });
export const GroupsFile = z.strictObject({ $schema: SchemaRef, groups: z.array(Group) });

export const CompositionGroup = z
  .strictObject({
    group: Id,
    count: Range.optional(),
    share_pct: Range.optional(),
    confidence: Confidence.optional(),
    notes: z.string().optional(),
  })
  .superRefine((g, ctx) => {
    if (!g.count === !g.share_pct) {
      ctx.addIssue({ code: 'custom', path: ['count'], message: 'Give exactly one of "count" or "share_pct"' });
    }
  });

export const Composition = z.strictObject({
  axis: Axis,
  groups: z.array(CompositionGroup).min(1),
  /** The source's own name for this classification, e.g. "population group (CBS)". */
  label: z.string().optional(),
  /** True when the source reports only some groups (e.g. only the Jewish population); skips the sum-to-100% check. */
  partial: z.boolean().optional(),
  sources: z.array(SourceRef).optional(),
});

export const PopulationPoint = z.strictObject({
  id: Id,
  area: Id,
  date: HistDate,
  date_note: z.string().optional(),
  total: Range.nullable(),
  composition: z.array(Composition).optional(),
  basis: z.enum([
    'census', 'official-estimate', 'registration', 'estimate-archaeological', 'estimate-tax-register',
    'estimate-textual', 'estimate-other', 'derived',
  ]),
  method: z.string().optional(),
  derivation: z.strictObject({ inputs: z.array(Id).min(1), formula: z.string().min(1) }).optional(),
  confidence: Confidence,
  sources: z.array(SourceRef),
  notes: Localized.optional(),
});
export type PopulationPoint = z.infer<typeof PopulationPoint>;
export const PopulationFile = z.strictObject({ $schema: SchemaRef, population: z.array(PopulationPoint) });

// ---------------------------------------------------------------- palette

export const Palette = z.strictObject({
  $schema: SchemaRef,
  note: z.string().optional(),
  /** Colours tried in order when a polity has no pinned colour. */
  cycle: z.array(z.string().regex(/^#[0-9a-fA-F]{6}$/)).min(4),
  pinned: z.record(Id, z.strictObject({ color: z.string().regex(/^#[0-9a-fA-F]{6}$/), rationale: z.string().min(1) })),
});

// ---------------------------------------------------------------- places & holy sites

export const LangCode = z.string().regex(/^[a-z]{2,3}(-[A-Za-z0-9]+)*$/, 'ISO 639 language code, e.g. "he", "ar", "grc", "akk"');
export const ScriptCode = z.string().regex(/^[A-Z][a-z]{3}$/, 'ISO 15924 script code, e.g. "Hebr", "Arab", "Grek", "Latn"');

export const PlaceName = z.strictObject({
  text: z.string().min(1),
  translit: z.string().optional(),
  display: Localized.optional(),
  lang: LangCode,
  script: ScriptCode.optional(),
  start: HistDate.optional(),
  end: HistDate.optional(),
  used_by: z.string().optional(),
  primary: z.boolean().optional(),
  confidence: Confidence,
  sources: z.array(SourceRef),
  notes: z.string().optional(),
});
export type PlaceName = z.infer<typeof PlaceName>;

export const Tradition = z.enum(['jewish', 'christian', 'muslim', 'samaritan', 'druze', 'bahai']);
export const TraditionEntry = z.strictObject({
  significance: Localized,
  /** Churches or communities that hold or use the site (Christian sites mostly). */
  denominations: z.array(z.string()).optional(),
  sources: z.array(SourceRef).min(1),
  notes: z.string().optional(),
});

export const PlaceKind = z.enum(['city', 'town', 'village', 'port', 'fortress', 'archaeological-site', 'holy-site', 'region', 'outside-region']);

export const Place = z.strictObject({
  id: Id,
  name: Localized,
  wikidata: z.string().regex(/^Q\d+$/).optional(),
  pleiades: z.string().regex(/^\d+$/).optional(),
  kind: z.array(PlaceKind).min(1),
  coords: z.tuple([z.number().min(-180).max(180), z.number().min(-90).max(90)]),
  coords_source: z.string().optional(),
  coords_precision: z.enum(['exact', 'approximate', 'uncertain']).optional(),
  founded: HistDate.nullable().optional(),
  founded_note: z.string().optional(),
  founded_sources: z.array(SourceRef).optional(),
  /** Other Wikidata items for the same place (e.g. the compound and the mosque). */
  wikidata_related: z.array(z.string().regex(/^Q\d+$/)).optional(),
  destroyed: z
    .array(
      z.strictObject({
        date: HistDate,
        /** What happened, e.g. "captured", "depopulated", "residents expelled" (default: destroyed). */
        what: z.string().optional(),
        by: z.string().optional(),
        note: z.string().optional(),
        /** True when the sources say the place was not lived in again afterwards (shown as a former place). */
        ended_settlement: z.boolean().optional(),
        confidence: Confidence.optional(),
        sources: z.array(SourceRef),
      }),
    )
    .optional(),
  names: z.array(PlaceName).optional(),
  holy_site: z.strictObject({ traditions: z.partialRecord(Tradition, TraditionEntry) }).optional(),
  /** Who administers the site today and under which arrangements (status quo, treaties). */
  custody: z.strictObject({ summary: Localized, confidence: Confidence, sources: z.array(SourceRef).min(1) }).optional(),
  /** UNESCO World Heritage listing, in UNESCO's own wording. */
  unesco: z
    .strictObject({
      property: z.number().int(),
      name: z.string(),
      state_party_label: z.string().optional(),
      inscribed: z.number().int(),
      criteria: z.string().optional(),
      in_danger_since: z.number().int().optional(),
      note: z.string().optional(),
    })
    .optional(),
  description: Localized.optional(),
  confidence: Confidence,
  sources: z.array(SourceRef),
  notes: Localized.optional(),
});
export type Place = z.infer<typeof Place>;
export const PlacesFile = z.strictObject({ $schema: SchemaRef, places: z.array(Place) });

// ---------------------------------------------------------------- events & rulers

export const Event = z.strictObject({
  id: Id,
  name: Localized,
  kind: z.enum([
    'political', 'treaty', 'declaration', 'foundation', 'construction', 'religious', 'natural-disaster',
    'epidemic', 'administrative', 'cultural', 'economic', 'demographic', 'legal', 'other',
  ]),
  date: HistDate,
  end: HistDate.optional(),
  place: Id.optional(),
  coords: z.tuple([z.number(), z.number()]).optional(),
  coords_source: z.string().optional(),
  wikidata: z.string().regex(/^Q\d+$/).optional(),
  description: Localized.optional(),
  importance: z.union([z.literal(1), z.literal(2), z.literal(3)]).optional(),
  /** The war or siege this event belongs to, by name (conflicts are linked by id where possible). */
  related_conflict: z.string().optional(),
  /** "textual-tradition": known only from texts such as the Bible, not from independent evidence. */
  basis: z.enum(['textual-tradition', 'archaeological', 'documentary']).optional(),
  confidence: Confidence,
  sources: z.array(SourceRef),
  notes: Localized.optional(),
});
export const EventsFile = z.strictObject({ $schema: SchemaRef, events: z.array(Event) });

export const Ruler = z.strictObject({
  id: Id,
  name: Localized,
  polity: Id,
  office: Localized.optional(),
  start: HistDate,
  end: HistDate.optional(),
  /** "textual-tradition": known only from texts such as the Bible, not from independent evidence. */
  basis: z.enum(['textual-tradition', 'archaeological', 'documentary']).optional(),
  confidence: Confidence,
  sources: z.array(SourceRef),
  notes: Localized.optional(),
});
export const RulersFile = z.strictObject({ $schema: SchemaRef, rulers: z.array(Ruler) });

// ---------------------------------------------------------------- conflicts

export const AltName = z.strictObject({
  text: Localized,
  /** The name in its own language and script, e.g. מלחמת העצמאות or النكبة. */
  original: z.strictObject({ text: z.string().min(1), lang: LangCode, script: ScriptCode.optional(), translit: z.string().optional() }).optional(),
  used_by: z.string().min(1),
  note: z.string().optional(),
  sources: z.array(SourceRef),
});
export const Party = z.union([z.strictObject({ polity: Id }), z.strictObject({ group: Localized })]);
export const Location = z.strictObject({
  place: Id.optional(),
  coords: z.tuple([z.number(), z.number()]).optional(),
  units: z.array(Id).optional(),
  coords_source: z.string().optional(),
  description: Localized.optional(),
});

export const Conflict = z.strictObject({
  id: Id,
  name: Localized,
  alt_names: z.array(AltName).optional(),
  kind: z.enum(['war', 'battle', 'siege', 'revolt', 'uprising', 'campaign', 'raid', 'civil-war', 'occupation', 'massacre', 'attack', 'operation']),
  wikidata: z.string().regex(/^Q\d+$/).optional(),
  /** 1 = major (always shown), 2 = shown when zoomed in a little, 3 = local. */
  importance: z.union([z.literal(1), z.literal(2), z.literal(3)]).optional(),
  /** "textual-tradition": known only from texts such as the Bible, not from independent evidence. */
  basis: z.enum(['textual-tradition', 'archaeological', 'documentary']).optional(),
  parent: Id.optional(),
  start: HistDate,
  end: HistDate.optional(),
  location: Location.optional(),
  belligerents: z.array(z.strictObject({ side: z.string().min(1), parties: z.array(Party) })).optional(),
  outcome: Localized.optional(),
  /** Left empty for now at the project owner's request. */
  casualties: z.null().optional(),
  confidence: Confidence,
  sources: z.array(SourceRef),
  notes: Localized.optional(),
});
export const ConflictsFile = z.strictObject({ $schema: SchemaRef, conflicts: z.array(Conflict) });

// ---------------------------------------------------------------- migrations & diaspora

export const Endpoint = z.union([
  z.strictObject({ place: Id }),
  z.strictObject({ label: Localized, coords: z.tuple([z.number(), z.number()]), coords_source: z.string().optional() }),
]);

export const Migration = z.strictObject({
  id: Id,
  name: Localized,
  group: Localized,
  types: z
    .array(
      z.enum([
        'conquest-settlement', 'deportation', 'exile', 'return', 'immigration', 'emigration', 'refugee-flight', 'expulsion',
        'labour-migration', 'tribal-migration', 'pilgrimage-settlement', 'resettlement', 'internal-displacement', 'colonization', 'settlement', 'other',
      ]),
    )
    .min(1),
  /** Other names for the movement, e.g. "Nakba". */
  alt_names: z.array(Localized).optional(),
  origin: Endpoint,
  destination: Endpoint,
  /** When people left from or went to several places: all of them (the sources do not split the number between them). */
  origins: z.array(Endpoint).optional(),
  destinations: z.array(Endpoint).optional(),
  start: HistDate,
  end: HistDate.optional(),
  numbers: Range.nullable().optional(),
  direction: z.enum(['in', 'out', 'within']),
  /** "textual-tradition": known only from texts such as the Bible, not from independent evidence. */
  basis: z.enum(['textual-tradition', 'archaeological', 'documentary']).optional(),
  confidence: Confidence,
  sources: z.array(SourceRef),
  notes: Localized.optional(),
  contested_note: Localized.optional(),
});
export const Diaspora = z.strictObject({
  id: Id,
  group: z.string().min(1),
  definition: Localized,
  date: HistDate,
  /** coords is null for regional totals that have no single place (e.g. "Arab countries"). */
  location: z.strictObject({ label: Localized, coords: z.tuple([z.number(), z.number()]).nullable(), coords_source: z.string().optional() }),
  number: Range,
  confidence: Confidence,
  sources: z.array(SourceRef),
  notes: Localized.optional(),
});
export const MigrationsFile = z.strictObject({ $schema: SchemaRef, migrations: z.array(Migration), diaspora: z.array(Diaspora).optional() });

// ---------------------------------------------------------------- languages & landscape

export const LanguageRecord = z.strictObject({
  id: Id,
  name: Localized,
  family: z.string().optional(),
  scripts: z.array(ScriptCode).optional(),
  periods: z
    .array(
      z.strictObject({
        start: HistDate,
        end: HistDate.optional(),
        role: z.enum(['vernacular', 'administrative', 'liturgical', 'literary', 'lingua-franca']),
        speakers: Localized.optional(),
        confidence: Confidence,
        sources: z.array(SourceRef),
      }),
    )
    .min(1),
  sources: z.array(SourceRef).optional(),
  notes: Localized.optional(),
});
export const LanguagesFile = z.strictObject({ $schema: SchemaRef, languages: z.array(LanguageRecord) });

export const LevelPoint = z.strictObject({
  id: Id,
  date: HistDate,
  level_m: z.strictObject({ low: z.number().nullable(), high: z.number().nullable(), best: z.number().optional() }),
  location: z.string().optional(),
  confidence: Confidence,
  sources: z.array(SourceRef),
  notes: z.string().optional(),
});
export const Waypoint = z.strictObject({ label: z.string(), coords: z.tuple([z.number(), z.number()]), coords_source: z.string().optional(), place: Id.optional() });
export const TradeRoute = z.strictObject({
  id: Id,
  name: Localized,
  alt_names: z.array(AltName).optional(),
  start: HistDate,
  end: HistDate.optional(),
  waypoints: z.array(Waypoint).min(2),
  /** Side branches; each is drawn from the nearest point of the main route to its own waypoints. */
  branches: z.array(z.strictObject({ label: z.string(), waypoints: z.array(Waypoint).min(1) })).optional(),
  certainty: z.enum(['approximate', 'schematic']),
  description: Localized.optional(),
  confidence: Confidence,
  sources: z.array(SourceRef),
  notes: Localized.optional(),
});
export const LandscapeFile = z.strictObject({
  $schema: SchemaRef,
  sea_level: z.array(LevelPoint),
  dead_sea_levels: z.array(LevelPoint),
  trade_routes: z.array(TradeRoute),
});

// ---------------------------------------------------------------- perspectives & stories

export const Perspective = z.strictObject({
  id: Id,
  title: Localized,
  about: z.array(Id).optional(),
  accounts: z
    .array(
      z.strictObject({
        perspective: z.string().min(1),
        label: Localized,
        summary: Localized,
        sources: z.array(SourceRef).min(1),
      }),
    )
    .min(3, 'A perspectives entry needs at least three accounts (e.g. Israeli, Palestinian, academic)'),
  notes: Localized.optional(),
});
export const PerspectivesFile = z.strictObject({ $schema: SchemaRef, perspectives: z.array(Perspective) });

export const StoryStep = z.strictObject({
  date: YearMonth,
  view: z.strictObject({ center: z.tuple([z.number(), z.number()]), zoom: z.number() }).optional(),
  layers: z.array(z.string()).optional(),
  highlight: z.array(Id).optional(),
  title: Localized,
  card: Localized,
  sources: z.array(SourceRef).min(1),
  duration_s: z.number().positive().optional(),
});
export const Story = z.strictObject({ $schema: SchemaRef, id: Id, title: Localized, summary: Localized, steps: z.array(StoryStep).min(1) });

// ---------------------------------------------------------------- modern layers

export const ModernLayer = z.strictObject({
  id: Id,
  name: Localized,
  /** GeoJSON file in data/modern/. Features may carry "start"/"end" dates (e.g. a settlement's founding year) and a "class" used for styling. */
  file: z.string().regex(/^[a-z0-9-]+\.geojson$/),
  kind: z.enum(['fill', 'line', 'point']),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  /** Line styles per feature "class", e.g. barrier status. */
  class_styles: z.record(z.string(), z.strictObject({ dash: z.array(z.number()).optional(), color: z.string().optional(), label: Localized })).optional(),
  start: HistDate,
  end: HistDate.optional(),
  as_of: HistDate,
  publisher: z.string(),
  license: z.string(),
  attribution: z.string(),
  method: Localized,
  confidence: Confidence,
  sources: z.array(SourceRef).min(1),
  notes: Localized.optional(),
});
export const ModernLayersFile = z.strictObject({ $schema: SchemaRef, layers: z.array(ModernLayer) });

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
  composition_tolerance_pct: z.number().positive(),
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

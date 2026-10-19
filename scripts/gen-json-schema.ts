/**
 * npm run gen-schema
 *
 * Writes JSON Schema files to /schema from the Zod schemas in src/schema.
 * Each data file points at its schema with "$schema", so editors such as
 * VS Code give autocomplete and inline errors while you edit.
 * (The validator also checks rules JSON Schema can't express, e.g. "no year 0".)
 */
import { z } from 'zod';
import { join } from 'node:path';
import { ROOT, writeJson } from './lib/io';
import {
  AreasFile, Config, CultureZoneFile, CulturesFile, ErasFile, GroupsFile, Palette, PolitiesFile,
  PopulationFile, SourcesFile, TerritoryFile, UnitsFile, PlacesFile, EventsFile, RulersFile, ConflictsFile,
  MigrationsFile, LanguagesFile, LandscapeFile, PerspectivesFile, Story, ModernLayersFile,
} from '../src/schema/index';

const files: Record<string, z.ZodType> = {
  config: Config,
  eras: ErasFile,
  sources: SourcesFile,
  polities: PolitiesFile,
  cultures: CulturesFile,
  territory: TerritoryFile,
  'culture-zone': CultureZoneFile,
  units: UnitsFile,
  areas: AreasFile,
  groups: GroupsFile,
  population: PopulationFile,
  palette: Palette,
  places: PlacesFile,
  events: EventsFile,
  rulers: RulersFile,
  conflicts: ConflictsFile,
  migrations: MigrationsFile,
  languages: LanguagesFile,
  landscape: LandscapeFile,
  perspectives: PerspectivesFile,
  story: Story,
  'modern-layers': ModernLayersFile,
};

export function generateSchemas(): number {
  for (const [name, schema] of Object.entries(files)) {
    const json = z.toJSONSchema(schema, { io: 'input', unrepresentable: 'any' });
    writeJson(join(ROOT, 'schema', `${name}.schema.json`), json);
  }
  return Object.keys(files).length;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  console.log(`✓ ${generateSchemas()} JSON Schema files → schema/`);
}

/**
 * npm run validate-data           check everything in /data
 * npm run validate-data -- --warnings   also list warnings (things to review, not errors)
 *
 * Exits with code 1 if there is any error.
 */
import { DATA } from './lib/io';
import { formatIssue, validateData } from './lib/validate';

const showWarnings = process.argv.includes('--warnings');
const dir = process.argv.find((a, i) => i > 1 && !a.startsWith('--')) ?? DATA;
const { errors, warnings, bundle } = validateData(dir);

const count = (n: number, word: string, plural = `${word}s`) => `${n} ${n === 1 ? word : plural}`;
console.log(
  `Checked: ${count(bundle.sources?.sources.length ?? 0, 'source')}, ${count(bundle.polities?.polities.length ?? 0, 'polity', 'polities')}, ` +
    `${count(bundle.cultures?.cultures.length ?? 0, 'culture')}, ` +
    `${count(bundle.territories.reduce((a, t) => a + t.data.features.length, 0), 'territory slice')}, ` +
    `${count(bundle.population?.population.length ?? 0, 'population record')}`,
);

if (showWarnings && warnings.length) {
  console.log(`\n${count(warnings.length, 'warning')} (for review, not blocking):`);
  for (const w of warnings) console.log(`  ⚠ data/${formatIssue(w)}`);
}
if (errors.length) {
  console.log(`\n✗ ${count(errors.length, 'error')}:`);
  for (const e of errors) console.log(`  ✗ data/${formatIssue(e)}`);
  console.log(`\nFix the errors above, then run "npm run validate-data" again. data/README.md explains every field.`);
  process.exit(1);
}
console.log(`\n✓ No errors.${warnings.length ? ` ${count(warnings.length, 'warning')} (run with -- --warnings to list them).` : ''}`);

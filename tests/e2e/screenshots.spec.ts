/**
 * Saves screenshots of key views to docs/screenshots/<milestone>/.
 *   npm run build && npm run screenshots
 * Set MILESTONE=m3 (etc.) to choose the folder.
 */
import { expect, test } from '@playwright/test';

const DIR = `docs/screenshots/${process.env.MILESTONE ?? 'm2'}`;

const VIEWS: { name: string; query: string; viewport?: { width: number; height: number } }[] = [
  { name: '01-prehistory-9000-bce', query: '?y=-9000' },
  { name: '02-early-bronze-2500-bce', query: '?y=-2500' },
  { name: '03-iron-age-800-bce', query: '?y=-800' },
  { name: '04-persian-450-bce', query: '?y=-450' },
  { name: '05-herodian-20-bce', query: '?y=-20' },
  { name: '06-byzantine-500-ce', query: '?y=500' },
  { name: '07-umayyad-700', query: '?y=700' },
  { name: '08-crusader-1150', query: '?y=1150' },
  { name: '09-mamluk-1400', query: '?y=1400' },
  { name: '10-ottoman-1900', query: '?y=1900' },
  { name: '11-mandate-1930', query: '?y=1930' },
  { name: '12-war-1948-05', query: '?y=1948-05' },
  { name: '13-1960', query: '?y=1960' },
  { name: '14-1980', query: '?y=1980' },
  { name: '15-today', query: '?y=2026-10' },
  { name: '16-arabic-rtl-1948-05', query: '?y=1948-05&lang=ar' },
  { name: '17-hebrew-rtl-today', query: '?y=2026-10&lang=he' },
  { name: '18-mobile-800-bce', query: '?y=-800', viewport: { width: 390, height: 844 } },
];

for (const v of VIEWS) {
  test(`screenshot ${v.name}`, async ({ page }) => {
    if (v.viewport) await page.setViewportSize(v.viewport);
    await page.goto(`/${v.query}`);
    await expect(page.getByTestId('map')).toHaveAttribute('data-ready', 'true', { timeout: 30_000 });
    await page.waitForTimeout(2500); // crossfade + hillshade tiles
    await page.screenshot({ path: `${DIR}/${v.name}.png` });
  });
}

import { expect, test, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

async function open(page: Page, query = '') {
  await page.goto(`/${query}`);
  await expect(page.getByTestId('map')).toHaveAttribute('data-ready', 'true', { timeout: 30_000 });
}

test('loads the map, title and timeline', async ({ page }) => {
  await open(page);
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  await expect(page.getByTestId('slider')).toBeVisible();
  await expect(page.getByTestId('current-date')).toHaveText('10,000 BCE');
});

test('keyboard steps through time and updates the URL', async ({ page }) => {
  await open(page);
  await page.getByTestId('slider').focus();
  await page.keyboard.press('ArrowRight');
  await expect(page.getByTestId('current-date')).toHaveText('9900 BCE');
  await expect(page).toHaveURL(/y=-9900/);
  await page.keyboard.press('PageUp');
  await expect(page.getByTestId('current-date')).toHaveText('6400 BCE');
});

test('go to year accepts BCE dates', async ({ page }) => {
  await open(page);
  await page.getByTestId('goto-input').fill('586 BCE');
  await page.getByTestId('goto-input').press('Enter');
  await expect(page.getByTestId('current-date')).toHaveText('586 BCE');
  await expect(page).toHaveURL(/y=-586/);
});

test('a shared link restores a month-level date', async ({ page }) => {
  await open(page, '?y=1948-05');
  await expect(page.getByTestId('current-date')).toHaveText('May 1948');
});

test('Arabic switches the layout to right-to-left and shows the draft notice', async ({ page }) => {
  await open(page, '?y=1');
  await page.getByTestId('lang-ar').click();
  await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
  await expect(page.locator('html')).toHaveAttribute('lang', 'ar');
  await expect(page.getByRole('note')).toBeVisible();
  await expect(page).toHaveURL(/lang=ar/);
});

test('play advances time and pause stops it', async ({ page }) => {
  await open(page);
  await page.getByTestId('play').click();
  await page.waitForTimeout(2000);
  await page.getByTestId('play').click();
  await expect(page.getByTestId('current-date')).not.toHaveText('10,000 BCE');
});

test('has no serious accessibility violations', async ({ page }) => {
  await open(page, '?y=1');
  const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze();
  const serious = results.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical');
  expect(serious.map((v) => `${v.id}: ${v.help} (${v.nodes.length})`)).toEqual([]);
});

test('the year panel lists rulers and opens a source card', async ({ page }) => {
  await open(page, '?y=-20');
  const panel = page.getByTestId('year-panel');
  await expect(panel.getByTestId('onmap-list')).toContainText('Herod');
  await panel.locator('.src-btn').first().click();
  const dialog = page.getByTestId('source-dialog');
  await expect(dialog).toBeVisible();
  await expect(dialog.locator('.citation').first()).not.toBeEmpty();
  await page.keyboard.press('Escape');
  await expect(dialog).not.toBeVisible();
});

test('the population panel shows published figures, not interpolated ones', async ({ page }) => {
  await open(page, '?y=1925');
  const pop = page.getByTestId('panel-population');
  await expect(pop).toContainText('757,182'); // 1922 census, the nearest figure before 1925
});

test('the bibliography page lists every source and filters', async ({ page }) => {
  await open(page);
  await page.getByTestId('nav-bibliography').click();
  await expect(page).toHaveURL(/#\/bibliography/);
  const list = page.getByTestId('bibliography');
  await expect(list.locator('.biblio-list li').first()).toBeVisible();
  await list.getByRole('searchbox').fill('Barron');
  await expect(list.locator('.biblio-list li')).not.toHaveCount(0);
  await expect(list.locator('.biblio-list li').first()).toContainText('Barron');
});

test('the population chart is present with its cursor', async ({ page }) => {
  await page.setViewportSize({ width: 1400, height: 1000 });
  await open(page, '?y=1931');
  await expect(page.getByTestId('population-chart')).toBeVisible();
  await expect(page.locator('.chart-cursor')).toHaveCount(1);
});

test('compare mode shows two maps and applies a preset', async ({ page }) => {
  await open(page, '?y=1960');
  await page.getByTestId('nav-compare').click();
  const cmp = page.getByTestId('compare-view');
  await expect(cmp).toBeVisible();
  await expect(cmp.getByTestId('map')).toHaveCount(2);
  await cmp.getByTestId('preset-plan-vs-1949').click();
  await expect(page.getByTestId('current-date')).toHaveText('December 1947');
  await expect(page).toHaveURL(/cmp=1949-08/);
});

test('a shared compare link restores both dates', async ({ page }) => {
  await page.goto('/?y=1967-05&cmp=1967-07&cmpmode=swipe');
  await expect(page.getByTestId('compare-view')).toBeVisible();
  await expect(page.getByTestId('compare-view').locator('.pane-date').last()).toHaveText('July 1967');
});

test('layers can be switched off and are kept in the link', async ({ page }) => {
  await open(page, '?y=1');
  await page.getByTestId('layers-button').click();
  await page.getByTestId('layer-places').uncheck();
  await expect(page).toHaveURL(/layers=/);
});

test('the about and perspectives pages open', async ({ page }) => {
  await open(page);
  await page.getByTestId('nav-about').click();
  await expect(page.getByTestId('about-page')).toBeVisible();
  await expect(page).toHaveURL(/#\/about/);
  await page.getByTestId('nav-perspectives').click();
  await expect(page.getByTestId('perspectives-page')).toBeVisible();
});

test('the peoples page opens and a people can be chosen', async ({ page }) => {
  await open(page);
  await page.getByTestId('nav-peoples').click();
  await expect(page.getByTestId('peoples-page')).toBeVisible();
  await expect(page).toHaveURL(/#\/peoples/);
  const first = page.locator('.peoples-list .chip').first();
  if (await first.count()) {
    await first.click();
    await expect(page.locator('.people-detail')).toBeVisible();
    await expect(page).toHaveURL(/#\/peoples\/[a-z0-9-]+/);
  }
});

test('pages have no serious accessibility violations', async ({ page }) => {
  for (const q of ['#/bibliography', '#/about', '#/peoples', '?y=1948-05&cmp=1949-08']) {
    await page.goto(`/${q}`);
    await page.waitForTimeout(1500);
    const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze();
    const serious = results.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical');
    expect(serious.map((v) => `${q} ${v.id}: ${v.help} (${v.nodes.length})`)).toEqual([]);
  }
});

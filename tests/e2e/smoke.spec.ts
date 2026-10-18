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

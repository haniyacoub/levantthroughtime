// Developer tool: screenshot the population chart in "By group" mode for a series.
import { chromium } from '@playwright/test';
const [,, url, out, series] = process.argv;
const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const p = await b.newPage({ viewport: { width: 1400, height: 1000 } });
await p.goto(url);
await p.waitForSelector('[data-testid=population-chart]', { timeout: 30000 });
if (series) await p.selectOption('[data-testid=chart-series]', series);
await p.getByRole('button', { name: 'By group' }).click();
await p.waitForTimeout(800);
await (await p.$('[data-testid=population-chart]')).screenshot({ path: out });
await b.close();

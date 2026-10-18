// Developer tool: screenshot a URL of the running dev server.
//   node scripts/dev/shot.mjs <url> <out.png> [width] [height]
import { chromium } from '@playwright/test';
const [,, url, out, w='1400', h='900'] = process.argv;
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: +w, height: +h } });
const logs = [];
page.on('console', m => { if (['error','warning'].includes(m.type())) logs.push(m.type()+': '+m.text()); });
page.on('pageerror', e => logs.push('pageerror: '+e.message));
await page.goto(url);
try {
  await page.waitForSelector('[data-testid=map][data-ready=true]', { timeout: 20000, state: 'attached' });
} catch (e) { logs.push('NOT READY'); }
await page.waitForTimeout(2500);
await page.screenshot({ path: out });
console.log(logs.slice(0,20).join('\n'));
await browser.close();

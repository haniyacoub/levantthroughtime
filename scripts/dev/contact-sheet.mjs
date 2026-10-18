// Developer tool: combine screenshots into one contact-sheet image.
//   node scripts/dev/contact-sheet.mjs <out.png> <cols> <img1> <img2> ...
import { chromium } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { basename } from 'node:path';
const [,, out, cols, ...files] = process.argv;
const W = 1800, c = +cols, w = Math.floor(W / c);
const imgs = files.map((f) => `<figure><img src="data:image/png;base64,${readFileSync(f).toString('base64')}"><figcaption>${basename(f)}</figcaption></figure>`).join('');
const html = `<html><body style="margin:0;display:grid;grid-template-columns:repeat(${c},${w}px);font:12px sans-serif;background:#fff">${imgs}</body><style>figure{margin:2px}img{width:100%;display:block;border:1px solid #ccc}</style></html>`;
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: W, height: 800 } });
await p.setContent(html);
await p.screenshot({ path: out, fullPage: true });
await b.close();

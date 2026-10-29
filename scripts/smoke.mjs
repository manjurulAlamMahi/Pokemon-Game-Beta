// Quick visual smoke test: title -> select -> world, with screenshots.
// Usage: node scripts/smoke.mjs [boy|girl]
import { chromium } from 'playwright-core';
import { mkdirSync } from 'node:fs';

const gender = process.argv[2] ?? 'boy';
const OUT = 'scripts/shots';
mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch({ channel: 'chrome', headless: true });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));

await page.goto('http://localhost:5173/');
await page.waitForTimeout(800);
await page.screenshot({ path: `${OUT}/01-title.png` });
await page.getByText('START GAME').click();
await page.waitForTimeout(600);
await page.screenshot({ path: `${OUT}/02-select.png` });
await page.getByText(gender.toUpperCase(), { exact: true }).click();
await page.waitForFunction(() => window.__wildbound?.ready());
await page.waitForTimeout(900);
await page.screenshot({ path: `${OUT}/03-world-${gender}.png` });
console.log('state', JSON.stringify(await page.evaluate(() => window.__wildbound.state())));
console.log('errors', errors);
await browser.close();

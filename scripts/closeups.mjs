// Screenshots of key spots at normal game zoom. Usage: node scripts/closeups.mjs [boy|girl]
import { chromium } from 'playwright-core';

const gender = process.argv[2] ?? 'boy';
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
await page.goto('http://localhost:5173/');
await page.click('text=START GAME');
await page.click(`text=${gender.toUpperCase()}`);
await page.waitForFunction(() => window.__wildbound?.ready());
await page.waitForTimeout(1200);
await page.screenshot({ path: `scripts/shots/c-${gender}-start.png` });
const spots = [
  ['town', 6, 17, 'down', 'home-street'],
  ['town', 25, 27, 'right', 'dragon'],
];
for (const [map, x, y, facing, name] of spots) {
  await page.evaluate(([m, x, y, f]) => window.__wildbound.warp(m, x, y, f), [map, x, y, facing]);
  await page.waitForTimeout(2900);
  await page.screenshot({ path: `scripts/shots/c-${gender}-${name}.png` });
}
console.log('state', JSON.stringify((await page.evaluate(() => window.__wildbound.state())).player), 'errors', errors);
await browser.close();
